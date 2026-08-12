/**
 * @fileoverview steeringEngine.ts
 * @description Motor de Control y Máquina de Estados (Steering Engine) para el Cerebro Central.
 * Este módulo es responsable de calcular y transicionar dinámicamente los "setpoints" 
 * (temperatura, humedad, CO2, luz) enviados al ESP32 a través de Firebase RTDB.
 * 
 * Decisiones Algorítmicas Clave:
 * 1. **Interpolación Lineal (Lerp):** Evita el shock térmico o estrés hídrico en el cultivo
 *    (ej. hongos) al suavizar los cambios de setpoints a lo largo de varias horas (ej. 24h).
 *    En lugar de saltar abruptamente de un estado a otro, ajusta los valores de forma progresiva.
 * 2. **Desacoplamiento vía Cron-jobs:** El motor se evalúa periódicamente (cada 5 min). Esto 
 *    libera al servidor de bucles bloqueantes y permite que el ESP32 siga operando de manera 
 *    autónoma si el servidor pierde conexión temporalmente.
 * 3. **Fallback y Seguridad:** Si no hay plan activo o el plan está en pausa, la interpolación 
 *    se ignora. Esto delega la responsabilidad al hardware (ESP32) para que mantenga 
 *    su último estado seguro conocido (a menudo el perfil de seguridad o 'vegetative' programado).
 */

import * as cron from 'node-cron';
import { initializeApp } from 'firebase/app';
import { getDatabase, ref, onValue, set } from 'firebase/database';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config();

const firebaseConfig = {
    apiKey: process.env.FIREBASE_API_KEY || 'dummy_api_key',
    databaseURL: process.env.FIREBASE_DATABASE_URL || 'https://dummy-default-rtdb.firebaseio.com',
};

const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);

// ---------------------------------------------------------
// ESTRUCTURAS DE DATOS 
// ---------------------------------------------------------

/**
 * @interface CropConfig
 * @description Define los setpoints y rangos críticos para el control ambiental de un perfil específico.
 * Estos valores representan el objetivo al que el hardware intentará llegar mediante sus actuadores.
 */
export interface CropConfig {
    kingdom: string;
    temp_ideal_min: number;
    temp_ideal_max: number;
    temp_crit_min: number;
    temp_crit_max: number;
    temp_sustrato_ideal: number;
    temp_sustrato_crit_max: number;
    hum_ideal_min: number;
    hum_ideal_max: number;
    hum_crit_min: number;
    co2_ideal_min: number;
    co2_ideal_max: number;
    co2_crit_max: number;
    light_hours_on: number;
}

/**
 * @interface PlanState
 * @description Representa el estado actual de la planificación agronómica de un dispositivo.
 * Controla en qué fase se encuentra, su duración, y maneja los datos para progresar hacia la siguiente fase.
 */
export interface PlanState {
    activeProfileName: string;
    activePhaseName: string;
    phaseStartTime: number; // ms
    duration_days: number;
    transition_hours: number;
    currentPhaseConfig: CropConfig;
    nextPhaseConfig: CropConfig | null;
    isPaused?: boolean;
    transitioningTo?: string;
}

// ---------------------------------------------------------
// UTILIDAD DE INTERPOLACIÓN (TRANSCIONES LINEALES)
// ---------------------------------------------------------

/**
 * Interpola linealmente entre la configuración actual y la siguiente basándose
 * en el porcentaje de progreso de la transición.
 * 
 * @param {CropConfig} current - La configuración (setpoints) de la fase actual.
 * @param {CropConfig} next - La configuración (setpoints) de la fase objetivo a transicionar.
 * @param {number} progressPercent - Porcentaje de avance de la transición (0 a 1). 
 *        0 significa que estamos completamente en `current`, 1 que llegamos a `next`.
 * @returns {CropConfig} Una nueva configuración con valores intermedios.
 * 
 * @example
 * // Si current.temp = 20 y next.temp = 24, al 50% (0.5), el resultado será 22.
 * // Esta decisión algorítmica suaviza las transiciones prolongadas (ej. 24h),
 * // reduciendo el estrés fisiológico en el cultivo de forma matemáticamente predecible.
 */
function interpolateConfig(current: CropConfig, next: CropConfig, progressPercent: number): CropConfig {
    const p = Math.max(0, Math.min(1, progressPercent)); // Clampear entre 0 y 1
    
    const lerp = (start: number, end: number) => start + (end - start) * p;

    return {
        kingdom: current.kingdom,
        temp_ideal_min: lerp(current.temp_ideal_min, next.temp_ideal_min),
        temp_ideal_max: lerp(current.temp_ideal_max, next.temp_ideal_max),
        temp_crit_min: lerp(current.temp_crit_min, next.temp_crit_min),
        temp_crit_max: lerp(current.temp_crit_max, next.temp_crit_max),
        temp_sustrato_ideal: lerp(current.temp_sustrato_ideal, next.temp_sustrato_ideal),
        temp_sustrato_crit_max: lerp(current.temp_sustrato_crit_max, next.temp_sustrato_crit_max),
        hum_ideal_min: lerp(current.hum_ideal_min, next.hum_ideal_min),
        hum_ideal_max: lerp(current.hum_ideal_max, next.hum_ideal_max),
        hum_crit_min: lerp(current.hum_crit_min, next.hum_crit_min),
        co2_ideal_min: lerp(current.co2_ideal_min, next.co2_ideal_min),
        co2_ideal_max: lerp(current.co2_ideal_max, next.co2_ideal_max),
        co2_crit_max: lerp(current.co2_crit_max, next.co2_crit_max),
        // La luz es discreta, redondeamos
        light_hours_on: Math.round(lerp(current.light_hours_on, next.light_hours_on))
    };
}

// ---------------------------------------------------------
// ESTADO EN MEMORIA
// ---------------------------------------------------------
// Este engine ahora se suscribe a toda la rama `devices`
let devicesData: Record<string, any> = {};

/**
 * Inicia la suscripción reactiva a Firebase RTDB para mantener un caché local 
 * del estado de todos los dispositivos, permitiendo al motor evaluar en base a datos frescos.
 */
function startListeningToFirebase() {
    const devicesRef = ref(db, 'devices');
    onValue(devicesRef, (snapshot) => {
        if (snapshot.exists()) {
            devicesData = snapshot.val();
        } else {
            devicesData = {};
        }
    }, (error) => {
        console.error('[Steering Engine] Error escuchando Firebase RTDB:', error);
    });
}

// ---------------------------------------------------------
// MOTOR DE EVALUACIÓN MÁQUINA DE ESTADOS
// ---------------------------------------------------------

/**
 * @function evaluateSteering
 * @description Evalúa el estado de todos los dispositivos registrados en Firebase para determinar 
 * si necesitan actualizaciones en sus parámetros de control ambiental.
 * 
 * Lógica Algorítmica:
 * 1. Recorre todos los dispositivos y lee su `plan_state`.
 * 2. Si el plan está en pausa o inactivo, aborta la actualización para ese dispositivo.
 *    Esto sirve como "fallback" pasivo: el ESP32 mantendrá sus operaciones basado en los
 *    últimos valores inyectados (o los hardcodeados como modo 'vegetative'/seguridad en la placa).
 * 3. Si el dispositivo entró en la "ventana de transición", calcula el porcentaje de 
 *    tiempo transcurrido y genera setpoints dinámicos usando interpolación.
 * 4. Inyecta los nuevos setpoints en la ruta `commands/crop` vía Firebase RTDB para
 *    que el ESP32 los absorba casi en tiempo real.
 */
export async function evaluateSteering() {
    const deviceIds = Object.keys(devicesData);
    if (deviceIds.length === 0) return;

    const now = Date.now();

    for (const deviceId of deviceIds) {
        const device = devicesData[deviceId];
        const planState: PlanState | undefined = device.plan_state;
        
        // Si no hay plan activo, ignorar
        if (!planState || !planState.phaseStartTime || !planState.duration_days) {
            continue;
        }

        // Si el plan está en pausa, no actualizamos el tiempo de inicio ni forzamos la configuración.
        // El ESP32 seguirá operando con los últimos valores que se le enviaron.
        if (planState.isPaused) {
            continue;
        }

        const durationMs = planState.duration_days * 24 * 60 * 60 * 1000;
        const transitionMs = (planState.transition_hours || 0) * 60 * 60 * 1000;
        
        const phaseEndTime = planState.phaseStartTime + durationMs;
        const transitionStartTime = phaseEndTime - transitionMs;

        let targetConfig = planState.currentPhaseConfig;

        // Si ya pasó el tiempo total (debería avanzar manualmente o en el futuro autmatizado)
        // Por ahora lo dejamos mantenido en la interpolación máxima o en currentPhase si no hay next
        if (now >= transitionStartTime && planState.nextPhaseConfig && transitionMs > 0) {
            const timeInTransition = now - transitionStartTime;
            const progressPercent = Math.min(1, timeInTransition / transitionMs);
            
            targetConfig = interpolateConfig(planState.currentPhaseConfig, planState.nextPhaseConfig, progressPercent);
            console.log(`[Steering Engine] ${deviceId} en transición (${(progressPercent*100).toFixed(1)}%)`);
        }

        // Inyectar a commands/crop
        try {
            if (targetConfig) {
                const deviceRef = ref(db, `devices/${deviceId}/commands/crop`);
                await set(deviceRef, targetConfig);
            } else {
                console.warn(`[Steering Engine] targetConfig es undefined para ${deviceId}. No se actualizará.`);
            }
        } catch (error) {
            console.error(`[Steering Engine] Falló la inyección RTDB para ${deviceId}:`, error);
        }
    }
}

// ---------------------------------------------------------
// INICIALIZACIÓN
// ---------------------------------------------------------

/**
 * @function initSteeringEngine
 * @description Inicializa el motor de steering, conectándolo a Firebase y programando
 * las evaluaciones periódicas usando node-cron.
 * 
 * Decisión Algorítmica:
 * Se utiliza un cron-job (cada 5 minutos) en lugar de un bucle contínuo o eventos anidados. 
 * Esto alinea la frecuencia de cómputo del servidor con la inercia térmica/biológica real de 
 * un cultivo, evitando cálculos innecesarios y picos de consumo de CPU/Red, además de
 * brindar alta resiliencia frente a caídas temporales (cron retomará por sí solo).
 */
export function initSteeringEngine() {
    startListeningToFirebase();
    // Evaluar cada 5 minutos
    cron.schedule('*/5 * * * *', () => {
        evaluateSteering();
    });
    console.log('[Steering Engine] Motor activado (Soporte Transiciones V3 RTDB). Evaluando cada 5 min.');
    
    // Trigger initial evaluation after a short delay to allow firebase data to load
    setTimeout(() => evaluateSteering(), 5000);
}
