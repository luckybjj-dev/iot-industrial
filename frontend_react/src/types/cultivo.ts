export interface TelemetriaFungi {
    temp_ambiente: number | null;
    humedad: number | null;
    temp_sustrato: number | null;
    humidificador_on: boolean;
    ventilador_on: boolean;
    manta_on: boolean;
    dht_ok: boolean;
    ntc_ok: boolean;
}

export interface EstadoCamara {
    deviceId: string;
    estado: string; // Ej: "🟢 ONLINE", "🔴 OFFLINE"
    telemetria?: TelemetriaFungi;
    ultima_actualizacion?: string;
}
