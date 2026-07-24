"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
// ====================================================================
// BACKEND NODE.JS - CEREBRO CENTRAL (PMV CÁMARA FUNGI)
// ====================================================================
const mqtt = __importStar(require("mqtt")); // Importa la librería MQTT para Node.js (Actúa como radar TCP/IP)
const influxdb_client_1 = require("@influxdata/influxdb-client"); // Importa el inyector y el formato de datos para nuestra TSDB
const dotenv = __importStar(require("dotenv")); // Importa la caja fuerte para leer nuestras contraseñas ocultas
// --------------------------------------------------------------------
// 1. CONFIGURACIÓN DE ENTORNO Y CREDENCIALES
// --------------------------------------------------------------------
dotenv.config(); // Carga en memoria las variables del archivo .env para no exponerlas en código plano
// Extraemos las credenciales desde el archivo secreto .env (Con valores por defecto como plan B)
const MQTT_BROKER_URL = process.env.MQTT_BROKER_URL || 'mqtt://broker.hivemq.com'; // URL del broker MQTT (ej. HiveMQ, Mosquitto, etc.)
const MQTT_TOPIC_TELEMETRIA = process.env.MQTT_TOPIC || 'proyecto_iot/edge/telemetria'; // Canal de telemetría donde el ESP32 publica sus datos de sensores y actuadores
const MQTT_TOPIC_ESTADOS = process.env.MQTT_TOPIC_ESTADOS || 'proyecto_iot/edge/estado'; // Canal de estados donde el ESP32 publica su estado de salud
// Extraemos las credenciales de InfluxDB desde el archivo secreto .env (Con valores por defecto como plan B)
const INFLUX_URL = process.env.INFLUX_URL || ''; // URL de la bóveda InfluxDB (ej. https://us-east-1-1.aws.cloud2.influxdata.com) 
const INFLUX_TOKEN = process.env.INFLUX_TOKEN || ''; // Token de acceso a la bóveda InfluxDB (ej. 1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef)
const INFLUX_ORG = process.env.INFLUX_ORG || ''; //  Nombre de la organización en InfluxDB (ej. mi_empresa)
const INFLUX_BUCKET = process.env.INFLUX_BUCKET || ''; // Nombre del bucket (base de datos) en InfluxDB (ej. proyecto_iot)
// Memoria de estado volátil: Guarda el último estado conocido del ESP32 para mostrarlo en consola
let estadoActualEdge = "DESCONOCIDO (Esperando actualización...)";
// --------------------------------------------------------------------
// 3. INICIALIZACIÓN DE LA BÓVEDA (INFLUXDB)
// --------------------------------------------------------------------
const influxDB = new influxdb_client_1.InfluxDB({ url: INFLUX_URL, token: INFLUX_TOKEN }); // Abre la conexión con la base de datos
const writeApi = influxDB.getWriteApi(INFLUX_ORG, INFLUX_BUCKET, 'ns'); // Prepara la tubería de escritura con precisión de nanosegundos
// --------------------------------------------------------------------
// 4. SISTEMA DE ALARMA DE DESCONEXIÓN (HEARTBEAT & LWT)
// --------------------------------------------------------------------
let temporizadorLatidos; // Variable global que guardará la cuenta regresiva
const TIEMPO_MAXIMO_LATENCIA = 60000; // 60 segundos sin telemetría dispara la alarma crítica
// Función de supervivencia: Se llama cada vez que llega un mensaje sano. Si el ESP32 se calla, el temporizador estalla.
function reiniciarLatidos() {
    clearTimeout(temporizadorLatidos); // Frena la bomba actual
    temporizadorLatidos = setTimeout(() => {
        // Actualizamos la memoria de estado directamente a alerta roja por latencia vencida
        estadoActualEdge = "🔴 OFFLINE (Latidos Perdidos)";
        // Imprimimos el cambio de estado de manera inmediata en la terminal para total transparencia visual
        console.log(`\n======================================================`);
        console.log(`🚨 [ALERTA CRÍTICA NUBE] Pérdida de comunicación con el Nodo Edge.`);
        console.log(`📡 ESTADO ACTUALIZADO: ${estadoActualEdge}`);
        console.log(`⏱️ Han pasado más de 60 segundos sin recibir datos de la Cámara Fungi.`);
        console.log(`⚠️ Posibles causas: Corte eléctrico, Failsafe fallido o ESP32 dañado.`);
        console.log(`======================================================\n`);
    }, TIEMPO_MAXIMO_LATENCIA);
}
// --------------------------------------------------------------------
// 5. INICIALIZACIÓN DEL CLIENTE MQTT Y ENLACE DE RED
// --------------------------------------------------------------------
console.log('\n[SISTEMA] Iniciando Cerebro Central IoT Fungi...');
console.log(`[INFLUXDB] Bóveda detectada en: ${INFLUX_URL}`);
const client = mqtt.connect(MQTT_BROKER_URL); // Dispara la solicitud de conexión asíncrona hacia HiveMQ
// Callback que se dispara automáticamente cuando se logra el enlace de red
client.on('connect', () => {
    console.log('✅ [MQTT] Conexión exitosa al Broker en la Nube.');
    // El servidor Node se "suscribe" (sintoniza) a nuestros dos canales vitales
    client.subscribe(MQTT_TOPIC_TELEMETRIA); // Sintoniza el canal de sensores
    client.subscribe(MQTT_TOPIC_ESTADOS); // Sintoniza el canal de estados y LWT
    console.log(`📡 [MQTT] Radares activos. Escuchando telemetría y estados...`);
    reiniciarLatidos(); // Arranca el reloj de control de latidos por primera vez
});
// --------------------------------------------------------------------
// 6. MANEJO DE EVENTO: RECEPCIÓN DE PAQUETES (EL CORAZÓN DEL BACKEND)
// --------------------------------------------------------------------
client.on('message', (topic, message) => {
    // --- BLINDAJE INDUSTRIAL DE RED (NORMALIZACIÓN DE CADENAS) ---
    const payloadCrudo = message.toString(); // Convierte los Bytes crudos a Texto Legible (String)
    const payloadLimpio = payloadCrudo.trim(); // 1. Borra espacios, enter (\n) o retornos de carro (\r) invisibles
    const payloadUpper = payloadLimpio.toUpperCase(); // 2. Convierte todo a MAYÚSCULAS para evitar errores de case-sensitivity
    // ENRUTADOR DE ESTADOS: Alarmas, Failsafe, Modo Supervivencia o Last Will
    if (topic === MQTT_TOPIC_ESTADOS) {
        // Evaluamos sobre la cadena normalizada. Detecta "OFFLINE", "RESCATE", "PERDIDA", etc.
        const esAlerta = payloadUpper.includes("OFFLINE") || payloadUpper.includes("RESCATE") || payloadUpper.includes("PERDIDA");
        if (esAlerta) {
            estadoActualEdge = `🔴 ${payloadLimpio}`; // Forzamos formato rojo para fallos
            console.log(`\n======================================================`);
            console.log(`🚨 [ALERTA ESTADO EDGE] -> El equipo reporta anomalía: ${payloadLimpio}`);
            console.log(`📡 ESTADO ACTUALIZADO: ${estadoActualEdge}`);
            console.log(`======================================================\n`);
        }
        else {
            estadoActualEdge = `🟢 ${payloadLimpio}`; // Si es un mensaje sano (ej. ONLINE), va en verde
            console.log(`\n======================================================`);
            console.log(`🔄 [NUEVO EVENTO EDGE] -> El equipo reporta: ${payloadLimpio}`);
            console.log(`📡 ESTADO ACTUALIZADO: ${estadoActualEdge}`);
            console.log(`======================================================\n`);
        }
    }
    // ENRUTADOR DE TELEMETRÍA: Sensores y Actuadores en tiempo real
    else if (topic === MQTT_TOPIC_TELEMETRIA) {
        try { // Bloque Try-Catch: Previene que el servidor colapse si llega basura por mal internet
            reiniciarLatidos(); // ¡El ESP32 sigue vivo! Reiniciamos la cuenta regresiva del Watchdog
            // --- AUTO-SANACIÓN DE ESTADO ---
            // Si la memoria quedó en OFFLINE por una falsa alarma pero llegan datos reales, nos recuperamos a ONLINE.
            if (estadoActualEdge.includes("OFFLINE")) {
                estadoActualEdge = "🟢 ONLINE (Auto-Recuperado por Telemetría)";
            }
            // Desempaqueta el JSON limpio y lo fuerza a cumplir con el contrato TelemetriaFungi
            const datos = JSON.parse(payloadLimpio);
            // IMPRESIÓN DEL ESTADO EN MEMORIA EN CADA LECTURA
            console.log(`\n[NUBE] 📦 Nuevo paquete recibido | 📡 ESTADO DE RED: ${estadoActualEdge}`);
            // RENDERIZADO VISUAL (Ergonomía de Depuración para el Desarrollador)
            console.log(`  🌡️  Temp Ambiente: ${datos.temp_ambiente.toFixed(1)} °C`);
            console.log(`  💧  Humedad:       ${datos.humedad.toFixed(1)} %`);
            console.log(`  🍄  Temp Sustrato: ${datos.temp_sustrato.toFixed(1)} °C`);
            const estadoHum = datos.humidificador_on ? 'ON' : 'OFF';
            const estadoVen = datos.ventilador_on ? 'ON' : 'OFF';
            console.log(`  ⚙️  Actuadores:    Humidificador [${estadoHum}] | Ventilador FAE [${estadoVen}]`);
            // --- INYECCIÓN EN INFLUXDB ---
            // Creamos un punto de telemetría con la estructura que InfluxDB espera. Cada campo es un dato que queremos guardar.
            // 1. Preparamos el paquedte de datos con la clase Point. 2. Lo enviamos a la bóveda con writeApi.writePoint(). 3. Forzamos a Influx a vaciar su buffer con writeApi.flush().   
            const puntoMetrica = new influxdb_client_1.Point('fructificacion_01') // Nombre de la medición (measurement) en InfluxDB
                .floatField('temperatura_ambiente', datos.temp_ambiente) // Este dato viene del ESP32 y es un número decimal    
                .floatField('humedad_relativa', datos.humedad) // Este dato viene del ESP32 y es un número decimal la humedad relativa
                .floatField('temperatura_sustrato', datos.temp_sustrato) // Temperatura del micelio (dato crítico) en grados Celsius
                .booleanField('estado_humidificador', datos.humidificador_on) // estado del actuador: true = encendido, false = apagado
                .booleanField('estado_ventilador', datos.ventilador_on); // Estado del FAE: true = encendido, false = apagado. Ventilador de aire forzado para control de CO2 y humedad
            // 2. Metemos la carta en el buzón interno de Node.js
            writeApi.writePoint(puntoMetrica); // Enviamos el paquete a la bóveda de InfluxDB (buffer interno)
            // 3. ¡EL LÁTIGO! Le ordenamos a Node.js que envíe la carta AHORA MISMO por internet y que InfluxDB la guarde en disco de manera inmediata. Si falla, lo atrapamos con un catch.
            writeApi.flush() // Forzamos a InfluxDB a vaciar su buffer y guardar los datos en disco de manera inmediata
                .then(() => {
                console.log(`  💾  [INFLUXDB] Datos guardados exitosamente en la bóveda.`); // Mensaje de confirmación
            })
                .catch(error => {
                console.error(`\n❌ [INFLUXDB ERROR] InfluxDB rechazó el paquete: ${error.message}\n`);
            });
        }
        catch (error) { // Atrapa la excepción si el paquete llegó corrupto o no es un JSON válido
            console.error('\n❌ [ERROR] Paquete corrupto o no es JSON válido:', payloadCrudo);
        }
    }
});
// --------------------------------------------------------------------
// 7. MANEJO DE EVENTOS: ERRORES Y APAGADO SEGURO
// --------------------------------------------------------------------
client.on('error', (error) => {
    console.error('❌ [MQTT ERROR] Fallo crítico de conexión al broker:', error);
});
// Cierre elegante: Captura cuando oprimimos Ctrl+C para detener el servidor Node
process.on('SIGINT', async () => {
    console.log('\n[SISTEMA] Apagando Cerebro Central... Guardando últimos datos en InfluxDB...');
    await writeApi.close(); // Fuerza a Influx a vaciar su buffer y guardar lo que falte
    client.end(); // Desconecta el cliente MQTT
    process.exit(0); // Mata el proceso limpiamente
});
//# sourceMappingURL=subscriber.js.map