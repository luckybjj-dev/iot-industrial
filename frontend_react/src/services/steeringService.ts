import type { SteeringProfile } from '../types/steering';
import API_URL from '../config/apiConfig';

const API_KEY = import.meta.env.VITE_API_KEY || 'fungi_secreto_123'; // Valor de desarrollo

export const startSteeringPlan = async (profile: SteeringProfile): Promise<boolean> => {
    try {
        const response = await fetch(`${API_URL}/api/cultivo/steering/start`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': API_KEY,
            },
            body: JSON.stringify(profile),
        });
        
        if (!response.ok) {
            console.error('Error starting steering plan:', await response.text());
            return false;
        }
        return true;
    } catch (error) {
        console.error('Network error starting steering plan:', error);
        return false;
    }
};

export const stopSteeringPlan = async (deviceId: string): Promise<boolean> => {
    try {
        const response = await fetch(`${API_URL}/api/cultivo/steering/stop`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': API_KEY,
            },
            body: JSON.stringify({ deviceId }),
        });
        
        if (!response.ok) {
            console.error('Error stopping steering plan:', await response.text());
            return false;
        }
        return true;
    } catch (error) {
        console.error('Network error stopping steering plan:', error);
        return false;
    }
};

// Mock data (Recetas)
export const RECIPE_OYSTER_MUSHROOM: SteeringProfile = {
    deviceId: '', // Se asignará dinámicamente
    startDateISO: '', // Se asignará dinámicamente
    phases: [
        {
            name: '1. Colonización (Incubación)',
            exitCondition: { type: 'TIME', durationDays: 14 },
            config: {
                kingdom: 'Fungi',
                temp_ideal_min: 24,
                temp_ideal_max: 25,
                temp_crit_min: 18,
                temp_crit_max: 28,
                temp_sustrato_ideal: 24,
                temp_sustrato_crit_max: 28,
                hum_ideal_min: 85,
                hum_ideal_max: 90,
                hum_crit_min: 70,
                co2_ideal_min: 1000,
                co2_ideal_max: 1500,
                co2_crit_max: 2000,
                light_hours_on: 0
            },
            transitionToNext: {
                durationHours: 48,
                strategy: 'LINEAR'
            }
        },
        {
            name: '2. Pinning (Formación de Primordios)',
            exitCondition: { type: 'TIME', durationDays: 7 },
            config: {
                kingdom: 'Fungi',
                temp_ideal_min: 16,
                temp_ideal_max: 18,
                temp_crit_min: 12,
                temp_crit_max: 22,
                temp_sustrato_ideal: 17,
                temp_sustrato_crit_max: 20,
                hum_ideal_min: 90,
                hum_ideal_max: 95,
                hum_crit_min: 80,
                co2_ideal_min: 500,
                co2_ideal_max: 800,
                co2_crit_max: 1000,
                light_hours_on: 12
            },
            transitionToNext: {
                durationHours: 24,
                strategy: 'LINEAR'
            }
        },
        {
            name: '3. Fructificación',
            exitCondition: { type: 'TIME', durationDays: 10 },
            config: {
                kingdom: 'Fungi',
                temp_ideal_min: 18,
                temp_ideal_max: 20,
                temp_crit_min: 14,
                temp_crit_max: 24,
                temp_sustrato_ideal: 19,
                temp_sustrato_crit_max: 22,
                hum_ideal_min: 85,
                hum_ideal_max: 92,
                hum_crit_min: 75,
                co2_ideal_min: 600,
                co2_ideal_max: 800,
                co2_crit_max: 1200,
                light_hours_on: 12
            }
        }
    ]
};
