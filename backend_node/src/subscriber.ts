// ====================================================================
// BACKEND NODE.JS - CEREBRO CENTRAL (PMV CÁMARA FUNGI)
// ====================================================================
import * as mqtt from 'mqtt'; // Importa la librería MQTT para Node.js
import { InfluxDB, Point } from '@influxdata/influxdb-client';
import * as dotenv from 'dotenv';
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';

// --------------------------------------------------------------------
// 1. CONFIGURACIÓN DE ENTORNO Y CREDENCIALES
// --------------------------------------------------------------------
dotenv.config();

const MQTT_BROKER_URL = process.env.MQTT_BROKER_URL || 'mqtt://broker.hivemq.com';
const MQTT_TOPIC_WILDCARD = process.env.MQTT_TOPIC_WILDCARD || 'proyecto_iot/edge/#'; 

const INFLUX_URL = process.env.INFLUX_URL || '';
const INFLUX_TOKEN = process.env.INFLUX_TOKEN || '';
const INFLUX_ORG = process.env.INFLUX_ORG || '';
const INFLUX_BUCKET = process.env.INFLUX_BUCKET || '';

// 🚀 NUEVO: API Key para asegurar los endpoints de comandos
const API_KEY_SECRETA = process.env.API_KEY || 'fungi_secreto_123';

// --------------------------------------------------------------------
// 2. BLINDAJE DE DATOS Y MEMORIA DE ESTADO (MULTICÁMARA)
// --------------------------------------------------------------------
interface TelemetriaFungi {
    temp_ambiente: number | null;
    humedad: number | null;
    temp_sustrato: number | null;
    humidificador_on: boolean;
    ventilador_on: boolean;
    manta_on: boolean;
    dht_ok: boolean;
    ntc_ok: boolean;
}

// 🚀 NUEVO: Mapas para soportar N cantidad de Cámaras Fungi simultáneamente
const estadosEdge = new Map<string, string>();
const telemetriaRecibida = new Map<string, TelemetriaFungi>();
const temporizadoresLatidos = new Map<string, NodeJS.Timeout>();

// --------------------------------------------------------------------
// 3. INICIALIZACIÓN DE LA BÓVEDA (INFLUXDB)
// --------------------------------------------------------------------
const influxDB = new InfluxDB({ url: INFLUX_URL, token: INFLUX_TOKEN });
const writeApi = influxDB.getWriteApi(INFLUX_ORG, INFLUX_BUCKET, 'ns');
// 🚀 NUEVO: Optimizamos InfluxDB configurando el flush automático interno
// No usaremos flush manual por cada mensaje para evitar cuellos de botella de red

// --------------------------------------------------------------------
// 4. SISTEMA DE ALARMA DE DESCONEXIÓN (MULTICÁMARA)
// --------------------------------------------------------------------
const TIEMPO_MAXIMO_LATENCIA = 60000;

function reiniciarLatidos(deviceId: string) {
    const timerActual = temporizadoresLatidos.get(deviceId);
    if (timerActual) clearTimeout(timerActual);

    const nuevoTimer = setTimeout(() => {
        estadosEdge.set(deviceId, "🔴 OFFLINE (Latidos Perdidos)");
        console.log(`\n======================================================`);
        console.log(`🚨 [ALERTA CRÍTICA] Pérdida de comunicación con el Nodo: ${deviceId}`);
        console.log(`📡 ESTADO ACTUALIZADO: OFFLINE`);
        console.log(`======================================================\n`);
    }, TIEMPO_MAXIMO_LATENCIA);
    
    temporizadoresLatidos.set(deviceId, nuevoTimer);
}

// --------------------------------------------------------------------
// 5. INICIALIZACIÓN DE SERVIDOR EXPRESS Y CLIENTE MQTT
// --------------------------------------------------------------------
console.log('\n[SISTEMA] Iniciando Cerebro Central IoT Fungi...');
console.log(`[INFLUXDB] Bóveda detectada en: ${INFLUX_URL}`);

const app = express();
const PORT = 3000;
app.use(cors());
app.use(express.json());

// Middleware de Autenticación para proteger las rutas críticas
const apiKeyMiddleware = (req: Request, res: Response, next: NextFunction) => {
    // Busca la API key en los headers o como parámetro en la URL
    const key = req.headers['x-api-key'] || req.query.api_key;
    if (key === API_KEY_SECRETA) {
        next();
    } else {
        res.status(401).json({ error: 'No autorizado. API Key inválida.' });
    }
};

const client = mqtt.connect(MQTT_BROKER_URL);

client.on('connect', () => {
    console.log('✅ [MQTT] Conexión exitosa al Broker en la Nube.');
    // 🚀 NUEVO: Nos suscribimos con un comodín (#) para escuchar a TODAS las cámaras dinámicamente
    client.subscribe(MQTT_TOPIC_WILDCARD);
    console.log(`📡 [MQTT] Radares activos escuchando en ${MQTT_TOPIC_WILDCARD}...`);
});

// --------------------------------------------------------------------
// 6. MANEJO DE EVENTO: RECEPCIÓN DE PAQUETES
// --------------------------------------------------------------------
client.on('message', (topic, message) => {
    // Extracción dinámica de DeviceID del Topic 
    // Formato esperado: proyecto_iot/edge/[DEVICE_ID]/telemetria
    const partesTopic = topic.split('/');
    let deviceId = "Camara_Legacy"; // Fallback por si la cámara tiene el firmware viejo
    let tipoMensaje = "";

    if (partesTopic.length >= 4) {
        deviceId = partesTopic[2];
        tipoMensaje = partesTopic[3];
    } else if (partesTopic.length === 3) {
        tipoMensaje = partesTopic[2]; // Compatibilidad con Fase 1 (firmware antiguo)
    } else {
        return; // Ignorar tópicos desconocidos
    }

    const payloadCrudo = message.toString();
    const payloadLimpio = payloadCrudo.trim();
    const payloadUpper = payloadLimpio.toUpperCase();

    // ENRUTADOR DE ESTADOS
    if (tipoMensaje === "estado") {
        const esAlerta = payloadUpper.includes("OFFLINE") || payloadUpper.includes("RESCATE") || payloadUpper.includes("PERDIDA");
        const estadoFinal = esAlerta ? `🔴 ${payloadLimpio}` : `🟢 ${payloadLimpio}`;
        
        estadosEdge.set(deviceId, estadoFinal);
        console.log(`\n🔄 [ESTADO EDGE - ${deviceId}] -> ${estadoFinal}`);
    } 
    // ENRUTADOR DE TELEMETRÍA
    else if (tipoMensaje === "telemetria") {
        try {
            reiniciarLatidos(deviceId); // Reinicia el watchdog solo para ESTA cámara
            
            const estadoActual = estadosEdge.get(deviceId) || "";
            if (estadoActual.includes("OFFLINE")) {
                estadosEdge.set(deviceId, "🟢 ONLINE (Auto-Recuperado por Telemetría)");
                console.log(`\n======================================================`);
                console.log(`✅ [RECUPERACIÓN] El nodo ${deviceId} ha vuelto a enviar datos.`);
                console.log(`📡 ESTADO ACTUALIZADO: 🟢 ONLINE (Auto-Recuperado)`);
                console.log(`======================================================\n`);
            }

            const datos: TelemetriaFungi = JSON.parse(payloadLimpio);
            telemetriaRecibida.set(deviceId, datos);
            
            const tempAmb = datos.temp_ambiente !== null ? `${datos.temp_ambiente.toFixed(1)}°C` : 'N/A';
            const tempSus = datos.temp_sustrato !== null ? `${datos.temp_sustrato.toFixed(1)}°C` : 'N/A';
            const hum = datos.humedad !== null ? `${datos.humedad.toFixed(1)}%` : 'N/A';
            
            console.log(`📦 [TELEMETRÍA - ${deviceId}] Temp: ${tempAmb} | Sus: ${tempSus} | Hum: ${hum}`);

            // INYECCIÓN EN INFLUXDB
            const puntoMetrica = new Point('fructificacion_01')
                .tag('dispositivo', deviceId) // Agregamos la etiqueta multicámara a la BD
                .booleanField('estado_humidificador', datos.humidificador_on)
                .booleanField('estado_ventilador', datos.ventilador_on)
                .booleanField('estado_manta', datos.manta_on);

            if (datos.temp_ambiente !== null && datos.humedad !== null) {
                puntoMetrica.floatField('temperatura_ambiente', datos.temp_ambiente);
                puntoMetrica.floatField('humedad_relativa', datos.humedad);
            }
            if (datos.temp_sustrato !== null) {
                puntoMetrica.floatField('temperatura_sustrato', datos.temp_sustrato);
            }

            writeApi.writePoint(puntoMetrica); 
            // 🚀 ELIMINADO: writeApi.flush(). Dejamos que Influx agrupe los datos (Batching) para mayor rendimiento.

        } catch (error) {
            console.error(`❌ [ERROR ${deviceId}] JSON inválido:`, payloadCrudo);
        }
    }
});

// --------------------------------------------------------------------
// 7. RUTAS DE LA API REST (PUENTE HACIA REACT)
// --------------------------------------------------------------------

app.get('/api/health', (req: Request, res: Response) => {
    res.json({
        estado: 'OK',
        mensaje: 'Cerebro Central Fungi operativo (Arquitectura Multicámara).',
        dispositivos_conectados: estadosEdge.size
    });
});

app.get('/api/cultivo/estado', (req: Request, res: Response) => {
    // 🚀 NUEVO: Mapeamos el diccionario a un Array para que React pueda hacer render de cada cámara
    const dispositivos = Array.from(telemetriaRecibida.entries()).map(([id, datos]) => ({
        id,
        conexion: estadosEdge.get(id) || "DESCONOCIDO",
        datos_actuales: datos
    }));

    res.json({ dispositivos });
});

// Ruta protegida por API KEY (Middleware en acción)
app.post('/api/cultivo/modo', apiKeyMiddleware, (req: Request, res: Response) => {
    const { nuevoModo, deviceId } = req.body;
    
    if (!nuevoModo || !deviceId) {
        return res.status(400).json({ error: 'Faltan parámetros obligatorios (nuevoModo, deviceId)' });
    }

    const payloadComando = JSON.stringify({ comando: 'set_modo', valor: nuevoModo });
    const topicoEspecifico = `proyecto_iot/edge/${deviceId}/comandos`; // Mandamos la orden solo a la cámara seleccionada
    
    client.publish(topicoEspecifico, payloadComando, (err) => {
        if (err) {
            console.error(`❌ [API] Error MQTT a ${deviceId}`, err);
            return res.status(500).json({ error: 'Falla al enviar comando MQTT al hardware' });
        }
        console.log(`🚀 [API] Comando enviado a ${deviceId}: MODO = ${nuevoModo}`);
        res.json({ mensaje: `Orden explícita '${nuevoModo}' enviada a ${deviceId} exitosamente.` });
    });
});

// --------------------------------------------------------------------
// 8. ARRANQUE DEL SERVIDOR Y APAGADO SEGURO
// --------------------------------------------------------------------

setInterval(() => {
    if (client.connected) {
        client.publish('proyecto_iot/servidor/latido', JSON.stringify({ status: 'alive' }));
    }
}, 10000);

const server = app.listen(PORT, () => {
    console.log(`🚀 [API REST] Motor Express encendido. Escuchando peticiones web en http://localhost:${PORT}`);
});

client.on('error', (error) => {
    console.error('❌ [MQTT ERROR] Fallo crítico de conexión al broker:', error);
});

process.on('SIGINT', async () => {      
    console.log('\n[SISTEMA] Apagando Cerebro Central... Forzando Flush Final en InfluxDB...');
    await writeApi.close(); // Aquí sí usamos close/flush para no perder datos cacheados al apagar
    client.end();
    server.close();
    process.exit(0);
});