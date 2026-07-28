import type { EstadoCamara } from '../types/cultivo';

const API_BASE_URL = 'http://localhost:3000/api';
// Usamos el API Key de la Fase 1
const API_KEY = 'FUNGI_ADMIN_SECRET_2026';

export const fetchEstadoCultivo = async (): Promise<EstadoCamara[]> => {
    try {
        const response = await fetch(`${API_BASE_URL}/cultivo/estado`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': API_KEY,
            },
        });
        
        if (!response.ok) {
            throw new Error(`Error HTTP: ${response.status}`);
        }
        
        const data = await response.json();
        const dispositivos = data.dispositivos || [];
        
        return dispositivos.map((d: any) => ({
            deviceId: d.id,
            estado: d.conexion,
            telemetria: d.datos_actuales,
            ultima_actualizacion: new Date().toLocaleTimeString()
        }));
    } catch (error) {
        console.error('Error obteniendo estado del cultivo:', error);
        throw error;
    }
};
