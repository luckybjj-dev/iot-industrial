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

export interface PlanState {
    activeProfileName: string;
    activePhaseName: string;
    phaseStartTime: number; // ms
    duration_days: number;
    transition_hours: number;
    currentPhaseConfig: CropConfig;
    nextPhaseConfig: CropConfig | null;
}

// ---------------------------------------------------------
// UTILIDAD DE INTERPOLACIÓN (TRANSCIONES LINEALES)
// ---------------------------------------------------------
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
