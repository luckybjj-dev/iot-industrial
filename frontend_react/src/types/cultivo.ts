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
    
    dht_ok: boolean;
    analogico_ok: boolean;
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

export type VariableFisica = 'TEMP' | 'HUMEDAD' | 'CO2' | 'VPD' | 'HORA_DEL_DIA';
export type OperadorLogico = 'MAYOR_QUE' | 'MENOR_QUE' | 'IGUAL';
export type ActuadorFisico = 'CALEFACTOR' | 'NIEBLA' | 'EXTRACTOR' | 'LUZ';
export type EstadoDeseado = 'ENCENDIDO' | 'APAGADO';

export interface ReglaTermodinamica {
    var: VariableFisica;
    op: OperadorLogico;
    val: number;
    act: ActuadorFisico;
    estado: EstadoDeseado;
}

export interface FailsafesConfig {
    watchdog_timeout_ms: number;
    max_internal_temp_limit_c: number;
}

export interface ConfiguracionCultivo {
    greenhouse_id?: string;
    crop_profile?: string;
    max_manual_time_ms?: number;
    failsafes?: FailsafesConfig;
    reglas?: ReglaTermodinamica[];
}
