import { ref, onValue, update, query, limitToLast, get, set } from 'firebase/database';
import { database } from '../config/firebase';
import type { EstadoCamara, TelemetriaFungi, HistorialData, ConfiguracionCultivo } from '../types/cultivo';

/**
 * Suscribirse a TODOS los dispositivos en tiempo real
 */
export const subscribeToAllDevices = (
  callback: (devices: EstadoCamara[]) => void
) => {
  const telemetryRef = ref(database, 'telemetry');
  
  const unsubscribe = onValue(telemetryRef, (snapshot) => {
    if (snapshot.exists()) {
      const data = snapshot.val();
      
      const devicesArray: EstadoCamara[] = Object.keys(data).map(deviceId => {
        const deviceNode = data[deviceId];
        
        // Extraer modo de operación, por defecto AUTO
        const modo = deviceNode.modo_operacion || (deviceNode.data && deviceNode.data.modo_operacion) || 'AUTO';
        
        return {
          deviceId,
          estado: deviceNode.status || 'OFFLINE',
          telemetria: deviceNode.data as TelemetriaFungi,
          modo_operacion: modo,
          ultima_actualizacion: new Date().toLocaleTimeString()
        };
      });
      
      callback(devicesArray);
    } else {
      console.log("[Firebase] Base de datos vacía en la ruta /telemetry");
      callback([]);
    }
  }, (error) => {
    console.error("[Firebase] Error de lectura:", error);
    // Podríamos disparar el callback con un error si tuviéramos manejo de errores
  });

  return unsubscribe;
};

/**
 * Enviar configuración dinámica (Rule Engine y Failsafes)
 */
export const sendConfigRules = async (deviceId: string, config: Partial<ConfiguracionCultivo>) => {
  try {
    if (config.reglas) {
      const rulesRef = ref(database, `devices/${deviceId}/commands/reglas`);
      await set(rulesRef, config.reglas);
    }
  } catch (error) {
    console.error('Error enviando configuración a Firebase:', error);
    throw error;
  }
};

/**
 * Escuchar la configuración actual de un dispositivo
 */
export const subscribeToDeviceConfig = (
  deviceId: string,
  callback: (config: ConfiguracionCultivo | null) => void
) => {
  const configRef = ref(database, `devices/${deviceId}/commands`); // En el MVP, la config viaja como comando retenido
  
  const unsubscribe = onValue(configRef, (snapshot) => {
    if (snapshot.exists()) {
      callback(snapshot.val() as ConfiguracionCultivo);
    } else {
      callback(null);
    }
  });

  return unsubscribe;
};

/**
 * Enviar comando de actuador (Overrides manuales)
 */
export const sendCommand = async (deviceId: string, actuator: string, state: boolean) => {
  const commandRef = ref(database, `devices/${deviceId}/commands`);
  try {
    await update(commandRef, {
      [actuator]: state,
      timestamp: Date.now()
    });
  } catch (error) {
    console.error('Error enviando comando a Firebase:', error);
    throw error;
  }
};

/**
 * Enviar comando de modo de operación (AUTO / MANUAL)
 */
export const sendModeCommand = async (deviceId: string, mode: 'AUTO' | 'MANUAL') => {
  const commandRef = ref(database, `devices/${deviceId}/commands`);
  try {
    await update(commandRef, {
      modo_operacion: mode,
      timestamp: Date.now()
    });
  } catch (error) {
    console.error('Error enviando comando de modo a Firebase:', error);
    throw error;
  }
};

/**
 * Obtener datos históricos de un dispositivo
 */
export const fetchDeviceHistory = async (deviceId: string, limit: number = 100): Promise<HistorialData[]> => {
  const historyRef = ref(database, `history/${deviceId}`);
  // Firebase guardó los datos usando push, que se ordenan cronológicamente por su llave.
  // Evitamos orderByChild('timestamp') para no requerir reglas de indexación (.indexOn) en la base de datos.
  const historyQuery = query(historyRef, limitToLast(limit));

  try {
    const snapshot = await get(historyQuery);
    if (snapshot.exists()) {
      const data = snapshot.val();
      // data es un objeto con keys generadas por push(). Convertimos a array.
      const historyArray: HistorialData[] = Object.values(data);
      // Asegurarnos de que el array esté ordenado de más antiguo a más reciente
      return historyArray.sort((a, b) => a.timestamp - b.timestamp);
    }
    return [];
  } catch (error) {
    console.error('Error obteniendo historial de Firebase:', error);
    throw error;
  }
};

