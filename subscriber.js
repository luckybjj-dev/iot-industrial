/*
Este código es el "puente" que toma los mensajes MQTT 
y los inyecta en la nube:
*/
require('dotenv').config();
const mqtt = require('mqtt');
const { InfluxDB, Point } = require('@influxdata/influxdb-client');

// 1. Configuración de InfluxDB
const token = process.env.INFLUX_TOKEN;
const url = process.env.INFLUX_URL;
const org = process.env.INFLUX_ORG;
const bucket = process.env.INFLUX_BUCKET;
const writeApi = new InfluxDB({ url, token }).getWriteApi(org, bucket, 'ns');

// 2. Conexión MQTT
const client = mqtt.connect('mqtt://broker.hivemq.com');

client.on('connect', () => {
  console.log('✅ Conectado al Broker MQTT (Backend Node.js)');
  client.subscribe('planta/correa_1/telemetria');
});

// 3. Escucha de mensajes y Lógica de Control
client.on('message', (topic, message) => {
  try {
    // Parseamos el JSON que viene del ESP32
    const datos = JSON.parse(message.toString());
    console.log(`\n📥 Datos recibidos del ESP32:`, datos);

    // --- A. GUARDAR EN INFLUXDB ---
    // Agregamos los nuevos campos que el ESP32 está enviando ahora
    const punto = new Point('telemetria_correa')
      .floatField('temperatura', datos.temperatura)
      .floatField('humedad', datos.humedad)
      .booleanField('choque_detectado', datos.choque_detectado)
      .booleanField('estado_rele', datos.estado_rele)
      .booleanField('control_remoto', datos.control_remoto);

    writeApi.writePoint(punto);
    writeApi.flush();

    // --- B. LÓGICA DE CONTROL (CEREBRO REMOTO) ---
    // Solo actuamos si el ESP32 nos dice que estamos en control remoto
    if (datos.control_remoto === true) {
        const UMBRAL_HUMEDAD = 60.0;

        if (datos.humedad <= UMBRAL_HUMEDAD) {
            console.log('⚠️ Backend: Humedad baja. Ordenando ENCENDER relé...');
            // Enviamos el comando de vuelta al ESP32
            client.publish('invernadero/zona_1/control', JSON.stringify({ humidificador: true }));
        } 
        else if (datos.humedad >= (UMBRAL_HUMEDAD + 5.0)) {
            console.log('✅ Backend: Humedad óptima. Ordenando APAGAR relé...');
            client.publish('invernadero/zona_1/control', JSON.stringify({ humidificador: false }));
        }
    } else {
        console.log('⚠️ El ESP32 está en modo Supervivencia Local (Sin internet o Failsafe). Node.js solo observa.');
    }

  } catch (error) {
    console.error('❌ Error procesando el mensaje:', error);
  }
});

/*
Detalles para incluir en el proyecto backend.
Alarma de desconexión.
*/
