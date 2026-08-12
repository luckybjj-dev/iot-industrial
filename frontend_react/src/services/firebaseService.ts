import { ref, onValue, update, set, remove, query, limitToLast, get } from 'firebase/database';
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
        
        // Extraer modo de operación, priorizando la data de telemetría (para ignorar campos fantasma legacy)
        const modo = (deviceNode.data && deviceNode.data.modo_operacion) || deviceNode.modo_operacion || 'AUTO';
        
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
 * Enviar configuración dinámica (Rule Engine y Failsafes)
 */
export const sendConfigRules = async (deviceId: string, config: any) => {
  try {
    if (config === null) {
      // Detener plan: Borrar estado del plan pero retener el perfil base de crop para los failsafes
      await remove(ref(database, `devices/${deviceId}/plan_state`));
      const configRef = ref(database, `devices/${deviceId}/commands`);
      await update(configRef, {
          activePhaseName: null,
          activeProfileName: null
      });
      return;
    }

    const configRef = ref(database, `devices/${deviceId}/commands`);
    
    // Preparar el payload de actualización para commands
    const updates: Record<string, any> = {};
    
    if (config.crop !== undefined) {
      updates['crop'] = config.crop;
    } else if (config.currentPhaseConfig !== undefined) {
      updates['crop'] = config.currentPhaseConfig;
    }

    if (config.activeProfileName !== undefined) {
      updates['activeProfileName'] = config.activeProfileName;
    }
    if (config.activePhaseName !== undefined) {
      updates['activePhaseName'] = config.activePhaseName;
    }

    if (Object.keys(updates).length > 0) {
      await update(configRef, updates);
    }
    
    // Si viene la configuración completa del plan de steering (con currentPhaseConfig)
    if (config.currentPhaseConfig) {
      const planRef = ref(database, `devices/${deviceId}/plan_state`);
      const planState = {
          activeProfileName: config.activeProfileName,
          activePhaseName: config.activePhaseName,
          phaseStartTime: config.phaseStartTime,
          duration_days: config.duration_days,
          transition_hours: config.transition_hours,
          currentPhaseConfig: config.currentPhaseConfig,
          nextPhaseConfig: config.nextPhaseConfig || null,
          isPaused: config.isPaused || false,
          transitioningTo: config.transitioningTo || null
      };
      await set(planRef, planState);
    }
  } catch (error) {
    console.error('Error enviando configuración a Firebase:', error);
    throw error;
  }
};

/**
 * Enviar comando de actuador a ruta hija directa.
 *
 * IMPORTANTE: Primero borramos el valor (remove) y luego lo escribimos (set).
 * Esto garantiza que Firebase SIEMPRE detecte un cambio de valor y dispare
 * el stream callback en el ESP32, incluso si el valor nuevo es igual al
 * valor retenido anteriormente (ej: commands/light_on = true persistido,
 * pero la lógica AUTO apagó la luz físicamente sin actualizar commands/).
 */
export const sendCommand = async (deviceId: string, actuator: string, state: any) => {
  const commandRef = ref(database, `devices/${deviceId}/commands/${actuator}`);
  try {
    await remove(commandRef);   // Fuerza cambio: null -> state (siempre dispara stream)
    await set(commandRef, state);
  } catch (error) {
    console.error('Error enviando comando a Firebase:', error);
    throw error;
  }
};

/**
 * Enviar comando de modo de operación (AUTO / MANUAL)
 * Escribe directamente en /commands/modo_operacion para que el
 * ESP32 lo procese por la rama primitiva del streamCallback.
 */
export const sendModeCommand = async (deviceId: string, mode: 'AUTO' | 'MANUAL') => {
  const modeRef = ref(database, `devices/${deviceId}/commands/modo_operacion`);
  try {
    await set(modeRef, mode);
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

/**
 * Actualiza un campo específico de la configuración general
 */
export const updateConfigField = async (deviceId: string, field: string, value: any) => {
  const configRef = ref(database, `devices/${deviceId}/commands`);
  try {
    await update(configRef, { [field]: value });
  } catch (error) {
    console.error('Error actualizando config en Firebase:', error);
    throw error;
  }
};

/**
 * Escuchar el estado del Plan (Steering Engine)
 */
export const subscribeToPlanState = (
  deviceId: string,
  callback: (planState: any) => void
) => {
  const planRef = ref(database, `devices/${deviceId}/plan_state`);
  const unsubscribe = onValue(planRef, (snapshot: any) => {
    if (snapshot.exists()) {
      callback(snapshot.val());
    } else {
      callback(null);
    }
  });
  return unsubscribe;
};
