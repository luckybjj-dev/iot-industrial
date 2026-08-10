export interface TransitionStrategy {
    durationHours: number;
    strategy: 'STEP' | 'LINEAR';
}

export interface PhaseCondition {
    type: 'TIME' | 'TELEMETRY' | 'MANUAL';
    durationDays?: number;
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
    exitCondition: PhaseCondition;
    config: CropConfig;
    transitionToNext?: TransitionStrategy;
}

export interface SteeringProfile {
    deviceId: string;
    startDateISO: string;
    phases: CropPhase[];
}
