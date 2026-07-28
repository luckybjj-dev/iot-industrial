export interface TelemetriaFungi {
    temp_ambiente: number;
    humedad: number;
    temp_sustrato: number;
    humidificador_on: boolean;
    ventilador_on: boolean;
}

export interface EstadoCamara {
    deviceId: string;
    estado: string; // Ej: "🟢 ONLINE", "🔴 OFFLINE"
    telemetria?: TelemetriaFungi;
    ultima_actualizacion?: string;
}
