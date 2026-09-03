export interface TelemetriaFungi {
    temp_aire?: number | null;
    temp_dht1?: number | null;
    temp_dht2?: number | null;
    temp_promedio?: number | null;
    humedad_aire?: number | null;
    hum_dht1?: number | null;
    hum_dht2?: number | null;
    humedad_promedio?: number | null;
    vpd: number | null;
    sensor_analogico: number | null;
    co2_ppm: number | null;
    humedad_suelo?: number | null;
    temp_raiz?: number | null;
    
    fogger_on: boolean;
    extractor_on: boolean;
    heater_on: boolean;
    cooler_on?: boolean;
    light_on: boolean;
    bomba_riego_on?: boolean;

    heater_locked?: boolean;
    fogger_locked?: boolean;
    extractor_locked?: boolean;
    bomba_riego_locked?: boolean;
    
    dht_ok: boolean;
    dht2_ok?: boolean;
    analogico_ok: boolean;
    suelo_ok?: boolean;
    
    estado_operacional?: EstadoOperacional;
}

export interface EstadoCamara {
    deviceId: string;
    estado: string; // Ej: "ONLINE - Motor Agnostico", "OFFLINE"
    telemetria?: TelemetriaFungi;
    modo_operacion?: 'AUTO' | 'MANUAL';
    ultima_actualizacion?: string;
}

export interface HistorialData {
    timestamp: number;
    temp_aire?: number;
    temp_ambiente?: number;
    temp_promedio?: number;
    humedad_aire?: number;
    vpd?: number;
    sensor_analogico?: number;
    co2_ppm?: number;
    fogger_on?: boolean;
    extractor_on?: boolean;
    heater_on?: boolean;
    cooler_on?: boolean;
}

export type EstadoOperacional = 'MONITOREO' | 'STANDBY' | 'NORMAL' | 'CALENTANDO' | 'ENFRIANDO' | 'HUMIDIFICANDO' | 'SAFE_MODE' | 'EMERGENCIA' | 'MANUAL';

export interface UserProfile {
    uid: string;
    email: string | null;
    displayName?: string | null;
    role: 'admin' | 'operator' | 'viewer';
    assignedDevices: string[];
    createdAt: number;
}

export interface PhaseTargets {
  temperature: { 
    day: { min: number; max: number }; 
    night: { min: number; max: number }; 
    substrate?: { min: number; max: number };
  };
  humidity: { min: number; max: number };
  vpd?: { min: number; max: number };
  co2?: { min: number; max: number };
  fae?: { ach: { min: number; max: number } };
  lighting?: { photoperiod: string };
  ppfd?: { min: number; max: number };
  dli?: { min: number; max: number };
  ec?: { min: number; max: number };
  ph?: { min: number; max: number };
  soilMoisture?: { min: number; max: number };
}

export interface DeviceCropProfile {
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
    kingdom?: 'FUNGI' | 'PLANTAE';
    hum_suelo_ideal_min?: number;
    hum_suelo_ideal_max?: number;
    hum_suelo_crit_min?: number;
}

export interface FailsafesConfig {
    watchdog_timeout_ms: number;
    max_internal_temp_limit_c: number;
}

export interface ConfiguracionCultivo {
    greenhouse_id?: string;
    crop_profile?: string;
    activeProfileName?: string;
    activePhaseName?: string;
    max_manual_time_ms?: number;
    failsafes?: FailsafesConfig;
    crop?: DeviceCropProfile;
}
