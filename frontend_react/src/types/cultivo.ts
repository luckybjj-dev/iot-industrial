export interface TelemetriaFungi {
    temp_aire: number | null;
    humedad_aire: number | null;
    vpd: number | null;
    sensor_analogico: number | null;
    co2_ppm: number | null;
    
    fogger_on: boolean;
    extractor_on: boolean;
    heater_on: boolean;
    light_on: boolean;

    heater_locked?: boolean;
    fogger_locked?: boolean;
    extractor_locked?: boolean;
    
    dht_ok: boolean;
    analogico_ok: boolean;
    
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
    humedad_aire?: number;
    vpd?: number;
    sensor_analogico?: number;
    co2_ppm?: number;
    fogger_on?: boolean;
    extractor_on?: boolean;
    heater_on?: boolean;
}

export type EstadoOperacional = 'NORMAL' | 'CALENTANDO' | 'ENFRIANDO' | 'HUMIDIFICANDO' | 'SAFE_MODE' | 'EMERGENCIA' | 'MANUAL';

export interface DeviceCropProfile {
    temp_ideal_min: number;
    temp_ideal_max: number;
    temp_crit_min: number;
    temp_crit_max: number;
    
    hum_ideal_min: number;
    hum_ideal_max: number;
    hum_crit_min: number;
    
    co2_ideal_min: number;
    co2_ideal_max: number;
    co2_crit_max: number;
    
    light_hours_on: number;
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
