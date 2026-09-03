import { ref, onValue, update, set, remove, query, limitToLast, orderByKey, get } from 'firebase/database';
import { database } from '../config/firebase';
import type { EstadoCamara, TelemetriaFungi, HistorialData, ConfiguracionCultivo } from '../types/cultivo';

// URL base del Firebase RTDB. Centralizada aquí para evitar repetición y facilitar migraciones.
const FIREBASE_RTDB_BASE_URL = 'https://invernadero-industrial-default-rtdb.firebaseio.com';

/**
 * Suscribirse a TODOS los dispositivos en tiempo real
 */
export const subscribeToAllDevices = (
  callback: (devices: EstadoCamara[]) => void,
  onError?: (error: Error) => void
) => {
  const telemetryRef = ref(database, 'telemetry');
  
  const parseDevices = (data: any): EstadoCamara[] => {
    if (!data || typeof data !== 'object') return [];
    return Object.keys(data).map(deviceId => {
      const deviceNode = data[deviceId];
      if (!deviceNode) return null;
      
      const modo = (deviceNode.data && deviceNode.data.modo_operacion) || deviceNode.modo_operacion || 'AUTO';
      
      return {
        deviceId,
        estado: deviceNode.status || 'ONLINE',
        telemetria: deviceNode.data as TelemetriaFungi,
        modo_operacion: modo,
        ultima_actualizacion: new Date().toLocaleTimeString()
      };
    }).filter(Boolean) as EstadoCamara[];
  };

  const fetchDirect = () => {
    fetch(`${FIREBASE_RTDB_BASE_URL}/telemetry.json`)
      .then(res => res.json())
      .then(data => {
        if (data) {
          const devs = parseDevices(data);
          if (devs.length > 0) callback(devs);
        }
      })
      .catch(err => console.warn('[Firebase] Polling REST telemetria:', err));
  };

  // 1. Carga inicial ultra rápida vía REST (< 50ms)
  fetchDirect();

  // 2. Carga inicial vía SDK get()
  get(telemetryRef)
    .then(snapshot => {
      if (snapshot.exists()) {
        const devs = parseDevices(snapshot.val());
        if (devs.length > 0) callback(devs);
      }
    })
    .catch(err => console.warn('[Firebase] get() inicial:', err));

  // 3. Suscripción en tiempo real continua por WebSocket
  const unsubscribeSdk = onValue(telemetryRef, (snapshot) => {
    if (snapshot.exists()) {
      const data = snapshot.val();
      const devs = parseDevices(data);
      callback(devs);
    } else {
      callback([]);
    }
  }, (error) => {
    console.error("[Firebase] Error de lectura:", error);
    if (onError) onError(error);
  });

  // 4. Heartbeat continuo de respaldo (cada 2.5s) para garantizar que las variables nunca se queden estáticas
  const heartbeatTimer = setInterval(fetchDirect, 2500);

  return () => {
    unsubscribeSdk();
    clearInterval(heartbeatTimer);
  };
};

/**
 * Escuchar la configuración actual de un dispositivo
 */
export const subscribeToDeviceConfig = (
  deviceId: string,
  callback: (config: ConfiguracionCultivo | null) => void
) => {
  const configRef = ref(database, `devices/${deviceId}/commands`); // En el MVP, la config viaja como comando retenido
  
  const parseConfigData = (data: any): ConfiguracionCultivo | null => {
    if (!data || typeof data !== 'object') return null;
    return {
      ...(data.config || {}),
      ...(data.commands || data),
      crop: (data.commands && data.commands.crop) || data.crop || (data.plan_state && data.plan_state.currentPhaseConfig),
      activeProfileName: (data.commands && data.commands.activeProfileName) || data.activeProfileName || (data.plan_state && data.plan_state.activeProfileName),
      activePhaseName: (data.commands && data.commands.activePhaseName) || data.activePhaseName || (data.plan_state && data.plan_state.activePhaseName)
    };
  };

  const fetchConfigDirect = () => {
    fetch(`${FIREBASE_RTDB_BASE_URL}/devices/${deviceId}.json`)
      .then(res => res.json())
      .then(data => {
        if (data) {
          const parsed = parseConfigData(data);
          if (parsed) callback(parsed);
        }
      })
      .catch(err => console.warn('[Firebase] Polling REST device config:', err));
  };

  // 1. Carga inicial ultra rápida vía REST (< 50ms)
  fetchConfigDirect();

  // 2. Carga inicial vía SDK get()
  get(configRef)
    .then(snapshot => {
      if (snapshot.exists()) {
        callback(snapshot.val() as ConfiguracionCultivo);
      }
    })
    .catch(err => console.warn('[Firebase] get() device config:', err));

  // 3. Suscripción en tiempo real continua por WebSocket
  const unsubscribeSdk = onValue(configRef, (snapshot) => {
    if (snapshot.exists()) {
      callback(snapshot.val() as ConfiguracionCultivo);
    } else {
      callback(null);
    }
  });

  // 4. Heartbeat de sincronización continua (cada 3s)
  const configTimer = setInterval(fetchConfigDirect, 3000);

  return () => {
    unsubscribeSdk();
    clearInterval(configTimer);
  };
};

/**
 * Sanitiza recursivamente cualquier objeto para Firebase RTDB,
 * eliminando claves con valor `undefined` que provocan errores fatales en el SDK.
 */
export const sanitizeForFirebase = <T>(data: T): T => {
  if (data === null || data === undefined) return data;
  return JSON.parse(JSON.stringify(data, (_, v) => (v === undefined ? null : v)));
};

/**
 * Enviar configuración dinámica (Rule Engine y Failsafes)
 */
export const sendConfigRules = async (deviceId: string, config: any) => {
  try {
    if (config === null) {
      const standbyCrop = {
        kingdom: "NONE",
        temp_ideal_min: 0,
        temp_ideal_max: 0,
        temp_crit_min: 0,
        temp_crit_max: 35,
        temp_sustrato_ideal: 0,
        temp_sustrato_crit_max: 35,
        hum_ideal_min: 0,
        hum_ideal_max: 100,
        hum_crit_min: 0,
        co2_ideal_min: 0,
        co2_ideal_max: 2000,
        co2_crit_max: 3000,
        light_hours_on: 0
      };

      fetch(`${FIREBASE_RTDB_BASE_URL}/devices/${deviceId}/plan_state.json`, { method: 'DELETE' }).catch(() => {});
      fetch(`${FIREBASE_RTDB_BASE_URL}/devices/${deviceId}/commands.json`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ activePhaseName: null, activeProfileName: "STANDBY", crop: standbyCrop })
      }).catch(() => {});
      
      const configRef = ref(database, `devices/${deviceId}/commands`);
      await Promise.race([
        Promise.all([
          remove(ref(database, `devices/${deviceId}/plan_state`)),
          update(configRef, { activePhaseName: null, activeProfileName: "STANDBY", crop: standbyCrop })
        ]),
        new Promise(r => setTimeout(r, 2000))
      ]);
      return;
    }

    const configRef = ref(database, `devices/${deviceId}/commands`);
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

    const promises: Promise<any>[] = [];

    // 1. Enviar de inmediato por REST para garantizar entrega instantánea (< 150ms)
    if (Object.keys(updates).length > 0) {
      const sanitizedUpdates = sanitizeForFirebase(updates);
      fetch(`${FIREBASE_RTDB_BASE_URL}/devices/${deviceId}/commands.json`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sanitizedUpdates)
      }).catch(err => console.warn('[Firebase] REST commands fallback:', err));

      promises.push(update(configRef, sanitizedUpdates).catch(err => console.warn('[Firebase] SDK update:', err)));
    }
    
    // Si viene la configuración completa del plan de steering (con currentPhaseConfig)
    if (config.currentPhaseConfig) {
      const planRef = ref(database, `devices/${deviceId}/plan_state`);
      const planState = sanitizeForFirebase({
          activeProfileName: config.activeProfileName || 'Desconocido',
          activePhaseName: config.activePhaseName || 'Desconocida',
          phaseStartTime: config.phaseStartTime || Date.now(),
          duration_days: config.duration_days || 14,
          transition_hours: config.transition_hours || 0,
          currentPhaseConfig: config.currentPhaseConfig,
          nextPhaseConfig: config.nextPhaseConfig || null,
          isPaused: config.isPaused || false,
          transitioningTo: config.transitioningTo || null
      });

      fetch(`${FIREBASE_RTDB_BASE_URL}/devices/${deviceId}/plan_state.json`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(planState)
      }).catch(err => console.warn('[Firebase] REST plan_state fallback:', err));

      promises.push(set(planRef, planState).catch(err => console.warn('[Firebase] SDK set plan_state:', err)));
    }

    // Timeout de 2.5 segundos máximo para evitar cualquier congelamiento en la UI
    await Promise.race([
      Promise.all(promises),
      new Promise(resolve => setTimeout(resolve, 2000))
    ]);

  } catch (error) {
    console.error('Error enviando configuración a Firebase:', error);
    throw error;
  }
};

/**
 * Enviar comando de actuador individual de forma quirúrgica a su subruta hija
 */
export const sendCommand = async (deviceId: string, actuator: string, state: boolean) => {
  // 1. Asegurar modo MANUAL en su subruta
  fetch(`${FIREBASE_RTDB_BASE_URL}/devices/${deviceId}/commands/modo_operacion.json`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify('MANUAL')
  }).catch(() => {});

  // 2. Enviar exclusivamente el estado del actuador individual a su subruta
  fetch(`${FIREBASE_RTDB_BASE_URL}/devices/${deviceId}/commands/${actuator}.json`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(state)
  }).catch(err => console.warn('[Firebase] REST actuator command fallback:', err));

  const modeRef = ref(database, `devices/${deviceId}/commands/modo_operacion`);
  const actuatorRef = ref(database, `devices/${deviceId}/commands/${actuator}`);
  try {
    await Promise.race([
      Promise.all([
        set(modeRef, 'MANUAL'),
        set(actuatorRef, state)
      ]),
      new Promise(resolve => setTimeout(resolve, 2000))
    ]);
  } catch (error) {
    console.error('Error enviando comando a Firebase:', error);
  }
};

/**
 * Enviar comando de modo de operación (AUTO / MANUAL) con inicialización limpia
 */
export const sendModeCommand = async (deviceId: string, mode: 'AUTO' | 'MANUAL') => {
  // REST directo inmediato a la subruta de modo
  fetch(`${FIREBASE_RTDB_BASE_URL}/devices/${deviceId}/commands/modo_operacion.json`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(mode)
  }).catch(err => console.warn('[Firebase] REST mode fallback:', err));

  // Si pasamos a MANUAL, inicializar todos los actuadores en false en la base de datos
  if (mode === 'MANUAL') {
    const cleanState = {
      heater_on: false,
      cooler_on: false,
      fogger_on: false,
      extractor_on: false,
      light_on: false,
      bomba_riego_on: false
    };
    fetch(`${FIREBASE_RTDB_BASE_URL}/devices/${deviceId}/commands.json`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(cleanState)
    }).catch(() => {});
  }

  const modeRef = ref(database, `devices/${deviceId}/commands/modo_operacion`);
  try {
    await Promise.race([
      set(modeRef, mode),
      new Promise(resolve => setTimeout(resolve, 2000))
    ]);
  } catch (error) {
    console.error('Error enviando comando de modo a Firebase:', error);
  }
};

/**
 * Obtener datos históricos de un dispositivo
 */
export const fetchDeviceHistory = async (deviceId: string, limit: number = 300): Promise<HistorialData[]> => {
  const historyRef = ref(database, `history/${deviceId}`);
  const historyQuery = query(historyRef, orderByKey(), limitToLast(limit));

  try {
    // Timeout para que no se quede colgado si firebase está intentando reconectar infinitamente
    const snapshot = await Promise.race([
      get(historyQuery),
      new Promise((_, reject) => setTimeout(() => reject(new Error('timeout_sdk')), 3000))
    ]) as any;
    if (snapshot.exists()) {
      const data = snapshot.val();
      const historyArray: HistorialData[] = Object.values(data);
      return historyArray.sort((a, b) => a.timestamp - b.timestamp);
    }
  } catch (sdkError) {
    console.warn('[Firebase] SDK get() error, intentando fallback REST:', sdkError);
  }

  // Fallback REST directo de alta resiliencia
  try {
    const res = await fetch(`${FIREBASE_RTDB_BASE_URL}/history/${deviceId}.json?orderBy="$key"&limitToLast=${limit}`);
    if (res.ok) {
      const data = await res.json();
      if (data && typeof data === 'object') {
        const historyArray: HistorialData[] = Object.values(data);
        return historyArray.sort((a, b) => a.timestamp - b.timestamp);
      }
    }
  } catch (restError) {
    console.error('[Firebase] Fallback REST falló:', restError);
  }

  return [];
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

  const fetchPlanDirect = () => {
    fetch(`${FIREBASE_RTDB_BASE_URL}/devices/${deviceId}/plan_state.json`)
      .then(res => res.json())
      .then(data => {
        callback(data || null);
      })
      .catch(err => console.warn('[Firebase] Polling REST plan_state:', err));

  };

  // 1. Carga inicial ultra rápida vía REST (< 50ms)
  fetchPlanDirect();

  // 2. Carga inicial vía SDK get()
  get(planRef)
    .then(snapshot => {
      if (snapshot.exists()) {
        callback(snapshot.val());
      }
    })
    .catch(err => console.warn('[Firebase] get() plan_state:', err));

  // 3. Suscripción en tiempo real continua por WebSocket
  const unsubscribeSdk = onValue(planRef, (snapshot: any) => {
    if (snapshot.exists()) {
      callback(snapshot.val());
    } else {
      callback(null);
    }
  });

  // 4. Heartbeat de sincronización continua (cada 3s)
  const planTimer = setInterval(fetchPlanDirect, 3000);

  return () => {
    unsubscribeSdk();
    clearInterval(planTimer);
  };
};
