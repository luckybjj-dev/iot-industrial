// ====================================================================
// BACKEND NODE.JS - CEREBRO CENTRAL (PMV CÁMARA FUNGI)
// ====================================================================
import { InfluxDB, Point } from '@influxdata/influxdb-client';
import * as dotenv from 'dotenv';
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { ref, onValue } from 'firebase/database';
import { initSteeringEngine, db } from './steeringEngine';

// --------------------------------------------------------------------
// 1. CONFIGURACIÓN DE ENTORNO Y CREDENCIALES
// --------------------------------------------------------------------
dotenv.config();

const INFLUX_URL = process.env.INFLUX_URL || '';
const INFLUX_TOKEN = process.env.INFLUX_TOKEN || '';
const INFLUX_ORG = process.env.INFLUX_ORG || '';
const INFLUX_BUCKET = process.env.INFLUX_BUCKET || '';

const API_KEY_SECRETA = process.env.API_KEY || 'fungi_secreto_123';

// --------------------------------------------------------------------
// 2. INICIALIZACIÓN DE LA BÓVEDA (INFLUXDB)
// --------------------------------------------------------------------
let writeApi: any = null;
if (INFLUX_URL && INFLUX_TOKEN) {
    const influxDB = new InfluxDB({ url: INFLUX_URL, token: INFLUX_TOKEN });
    writeApi = influxDB.getWriteApi(INFLUX_ORG, INFLUX_BUCKET, 'ns');
    console.log(`[INFLUXDB] Bóveda detectada en: ${INFLUX_URL}`);
} else {
    console.log(`[INFLUXDB] Advertencia: Credenciales InfluxDB no configuradas. Guardado de historial deshabilitado.`);
}

// --------------------------------------------------------------------
// 3. INICIALIZACIÓN DE SERVIDOR EXPRESS
// --------------------------------------------------------------------
console.log('\n[SISTEMA] Iniciando Cerebro Central IoT Fungi...');

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;
app.use(cors());
app.use(express.json());

// Iniciar Motor de Algoritmos Dinámicos
initSteeringEngine();

// Middleware de Autenticación para proteger las rutas críticas
const apiKeyMiddleware = (req: Request, res: Response, next: NextFunction) => {
    const key = req.headers['x-api-key'] || req.query.api_key;
    if (key === API_KEY_SECRETA) {
        next();
    } else {
        res.status(401).json({ error: 'No autorizado. API Key inválida.' });
    }
};

// --------------------------------------------------------------------
// 4. FIREBASE RTDB -> INFLUXDB (PUENTE DE TELEMETRÍA)
// --------------------------------------------------------------------
if (writeApi) {
    const telemetryRef = ref(db, 'telemetry');
    console.log('📡 [FIREBASE] Suscrito a la ruta de telemetría para historial InfluxDB...');
    
    // Almacenamos el timestamp de la última vez que inyectamos a InfluxDB por dispositivo para evitar spam
    const lastInfluxWrite = new Map<string, number>();

    onValue(telemetryRef, (snapshot) => {
        if (!snapshot.exists()) return;
        const data = snapshot.val();
        const now = Date.now();

        Object.keys(data).forEach(deviceId => {
            const deviceNode = data[deviceId];
            if (!deviceNode.data) return; // No hay telemetría
            
            const lastWrite = lastInfluxWrite.get(deviceId) || 0;
            // Escribir a InfluxDB máximo una vez por minuto por dispositivo para no saturar
            if (now - lastWrite > 60000) {
                try {
                    const datos = deviceNode.data;
                    const puntoMetrica = new Point('fructificacion_01')
                        .tag('dispositivo', deviceId)
                        .booleanField('estado_humidificador', datos.humidificador_on === true)
                        .booleanField('estado_ventilador', datos.ventilador_on === true)
                        .booleanField('estado_manta', datos.manta_on === true)
                        .booleanField('estado_luz', datos.light_on === true)
                        .booleanField('estado_cooler', datos.cooler_on === true);

                    if (datos.temp_ambiente !== null && datos.temp_ambiente !== undefined) puntoMetrica.floatField('temperatura_ambiente', datos.temp_ambiente);
                    if (datos.humedad !== null && datos.humedad !== undefined) puntoMetrica.floatField('humedad_relativa', datos.humedad);
                    if (datos.temp_sustrato !== null && datos.temp_sustrato !== undefined) puntoMetrica.floatField('temperatura_sustrato', datos.temp_sustrato);
                    if (datos.co2_ppm !== null && datos.co2_ppm !== undefined) puntoMetrica.intField('co2_ppm', datos.co2_ppm);

                    writeApi.writePoint(puntoMetrica);
                    lastInfluxWrite.set(deviceId, now);
                } catch (err) {
                    console.error(`❌ [INFLUXDB] Error inyectando datos del nodo ${deviceId}:`, err);
                }
            }
        });
    });
}

// --------------------------------------------------------------------
// 5. RUTAS DE LA API REST (CONTROL DEL MOTOR)
// --------------------------------------------------------------------

app.get('/api/health', (req: Request, res: Response) => {
    res.json({
        estado: 'OK',
        mensaje: 'Cerebro Central Fungi operativo (Firebase RTDB).',
    });
});

// --------------------------------------------------------------------
// 6. ARRANQUE DEL SERVIDOR Y APAGADO SEGURO
// --------------------------------------------------------------------

const server = app.listen(PORT, () => {
    console.log(`🚀 [API REST] Motor Express encendido. Escuchando peticiones web en http://localhost:${PORT}`);
});

process.on('SIGINT', async () => {      
    console.log('\n[SISTEMA] Apagando Cerebro Central...');
    if (writeApi) {
        console.log('Forzando Flush Final en InfluxDB...');
        await writeApi.close();
    }
    server.close();
    process.exit(0);
});
