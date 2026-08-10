import * as cron from 'node-cron';
import { initializeApp } from 'firebase/app';
import { getDatabase, ref, set } from 'firebase/database';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

dotenv.config();

const firebaseConfig = {
    apiKey: process.env.FIREBASE_API_KEY || 'dummy_api_key',
    databaseURL: process.env.FIREBASE_DATABASE_URL || 'https://dummy-default-rtdb.firebaseio.com',
};

const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);

// ---------------------------------------------------------
// ESTRUCTURAS DE DATOS (ARQUITECTURA NIVEL 1, 2 y 3)
// ---------------------------------------------------------

export interface TransitionStrategy {
    durationHours: number;
    strategy: 'STEP' | 'LINEAR';
}

export interface PhaseCondition {
    type: 'TIME' | 'TELEMETRY' | 'MANUAL';
    durationDays?: number; // Usado si type === 'TIME'
    
    // Para el futuro (Condiciones Biológicas/Ambientales)
    metric?: string; 
    operator?: '>' | '<' | '>=' | '<=';
    value?: number;
}

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

export interface CropPhase {
    name: string;
    exitCondition: PhaseCondition; // Qué debe pasar para salir de esta fase
    config: CropConfig;            // Setpoints (Nivel 2)
    transitionToNext?: TransitionStrategy; // Estrategia de transición a la sig. fase (Nivel 3)
}

export interface SteeringProfile {
    deviceId: string;
    startDateISO: string;
    phases: CropPhase[];
}

const STORAGE_PATH = path.join(__dirname, 'active_steering.json');
let activeProfiles: SteeringProfile[] = [];

// ---------------------------------------------------------
// PERSISTENCIA BÁSICA
// ---------------------------------------------------------
function loadProfiles() {
    if (fs.existsSync(STORAGE_PATH)) {
        try {
            const data = fs.readFileSync(STORAGE_PATH, 'utf-8');
            activeProfiles = JSON.parse(data);
            console.log(`[Steering Engine] Cargados ${activeProfiles.length} perfiles dinámicos.`);
        } catch (e) {
            console.error('[Steering Engine] Error leyendo active_steering.json', e);
        }
    }
}

function saveProfiles() {
    fs.writeFileSync(STORAGE_PATH, JSON.stringify(activeProfiles, null, 2));
}

// ---------------------------------------------------------
// CONTROL DE PERFILES
// ---------------------------------------------------------
export function startSteering(profile: SteeringProfile) {
    activeProfiles = activeProfiles.filter(p => p.deviceId !== profile.deviceId);
    activeProfiles.push(profile);
    saveProfiles();
    console.log(`[Steering Engine] Perfil dinámico INICIADO para el nodo: ${profile.deviceId}`);
    evaluateSteering();
}

export function stopSteering(deviceId: string) {
    activeProfiles = activeProfiles.filter(p => p.deviceId !== deviceId);
    saveProfiles();
    console.log(`[Steering Engine] Perfil dinámico DETENIDO para el nodo: ${deviceId}`);
}

// ---------------------------------------------------------
// UTILIDAD DE INTERPOLACIÓN (TRANSCIONES LINEALES)
// ---------------------------------------------------------
function interpolateConfig(current: CropConfig, next: CropConfig, progressPercent: number): CropConfig {
    const p = Math.max(0, Math.min(1, progressPercent)); // Clampear entre 0 y 1
    
    // Función auxiliar para interpolar números
    const lerp = (start: number, end: number) => start + (end - start) * p;

    return {
        kingdom: current.kingdom, // Mantenemos el string
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
        // La luz es discreta, podríamos redondear
        light_hours_on: Math.round(lerp(current.light_hours_on, next.light_hours_on))
    };
}

// ---------------------------------------------------------
// MOTOR DE EVALUACIÓN MÁQUINA DE ESTADOS
// ---------------------------------------------------------
export async function evaluateSteering() {
    if (activeProfiles.length === 0) return;

    const now = new Date();

    for (const profile of activeProfiles) {
        const startDate = new Date(profile.startDateISO);
        const diffMs = now.getTime() - startDate.getTime();
        const diffHours = diffMs / (1000 * 60 * 60);

        let hoursAccumulator = 0;
        let activePhaseIndex = -1;

        // Determinar en qué fase temporal nos encontramos (MVP: Solo TIME exitConditions)
        for (let i = 0; i < profile.phases.length; i++) {
            const phase = profile.phases[i]!;
            
            // MVP: Por ahora asumimos que todas las fases tienen condición TIME
            // En el futuro aquí se evaluaría la telemetría (ver respuesta en chat)
            const phaseDurationHours = (phase.exitCondition.durationDays || 0) * 24;
            hoursAccumulator += phaseDurationHours;

            if (diffHours < hoursAccumulator) {
                activePhaseIndex = i;
                break;
            }
        }

        if (activePhaseIndex === -1) {
            console.log(`[Steering Engine] El plan para ${profile.deviceId} ha finalizado.`);
            stopSteering(profile.deviceId);
            continue;
        }

        const currentPhase = profile.phases[activePhaseIndex]!;
        let targetConfig = currentPhase.config;

        // ¿Tenemos transición hacia la siguiente fase?
        if (currentPhase.transitionToNext && currentPhase.transitionToNext.strategy === 'LINEAR') {
            const nextPhase = profile.phases[activePhaseIndex + 1];
            if (nextPhase) {
                // Cuántas horas quedan en la fase actual
                const hoursLeftInPhase = hoursAccumulator - diffHours;
                const transitionDur = currentPhase.transitionToNext.durationHours;

                // Si entramos en la ventana de transición (el final de la fase)
                if (hoursLeftInPhase <= transitionDur) {
                    const hoursIntoTransition = transitionDur - hoursLeftInPhase;
                    const progressPercent = hoursIntoTransition / transitionDur;
                    
                    targetConfig = interpolateConfig(currentPhase.config, nextPhase.config, progressPercent);
                    console.log(`[Steering Engine] ${profile.deviceId} en transición LINEAL (${(progressPercent*100).toFixed(1)}%) -> ${nextPhase.name}`);
                }
            }
        }

        // Enviar a Firebase RTDB
        try {
            const deviceRef = ref(db, `devices/${profile.deviceId}/commands/crop`);
            await set(deviceRef, targetConfig);
        } catch (error) {
            console.error(`[Steering Engine] Falló la inyección RTDB para ${profile.deviceId}:`, error);
        }
    }
}

// ---------------------------------------------------------
// INICIALIZACIÓN
// ---------------------------------------------------------
export function initSteeringEngine() {
    loadProfiles();
    cron.schedule('0 * * * *', () => {
        evaluateSteering();
    });
    console.log('[Steering Engine] Motor activado (Soporte Transiciones V2).');
}
