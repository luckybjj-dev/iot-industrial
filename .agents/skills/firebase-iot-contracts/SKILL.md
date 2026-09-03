---
name: firebase-iot-contracts
description: Contratos de datos, rutas y tipos de comunicación bidireccional entre el Firmware ESP32 y el SCADA React mediante Firebase Realtime Database (RTDB). Usar al modificar o consultar telemetría, comandos, modos o sincronización en tiempo real.
---

# 📡 Contratos de Datos y Arquitectura Firebase RTDB — AgriEdge OS

Este skill documenta la estructura inmutable, rutas y tipos de datos del intercambio bidireccional entre el microcontrolador ESP32 y la aplicación SCADA React.

---

## 1. Principio Fundamental de Arquitectura
1. **Pivote Definitivo a Firebase RTDB:** Se prohíbe el uso de MQTT (`client.publish`, HiveMQ, brokers externos).
2. **Canal Bidireccional:**
   - **Uplink (ESP32 $\rightarrow$ RTDB):** El firmware publica telemetría viva filtrada por EWMA y estados reales de actuadores.
   - **Downlink (SCADA $\rightarrow$ ESP32):** El SCADA escribe comandos en la RTDB. El ESP32 los consume mediante un Server-Sent Events (SSE) Stream persistente (`FirebaseESP32`).

---

## 2. Árbol de Rutas y Nodos Clave

### A. Telemetría en Tiempo Real
* **Ruta:** `/telemetry/{deviceId}`
* **Frecuencia:** ~5 a 10 segundos (o por cambio de estado de actuador).
* **Campos Principales (JSON):**
  ```json
  {
    "temp_aire": 22.4,
    "temp_dht1": 22.3,
    "temp_dht2": 22.5,
    "temp_promedio": 22.4,
    "humedad_aire": 88.5,
    "hum_dht1": 88.0,
    "hum_dht2": 89.0,
    "humedad_promedio": 88.5,
    "vpd": 0.82,
    "sensor_analogico": 21.8,
    "temp_raiz": 21.8,
    "humedad_suelo": 65.0,
    "co2_ppm": 850,
    "fogger_on": false,
    "extractor_on": false,
    "heater_on": false,
    "cooler_on": false,
    "light_on": true,
    "bomba_riego_on": false,
    "dht_ok": true,
    "dht2_ok": true,
    "analogico_ok": true,
    "estado_operacional": "NORMAL",
    "timestamp": 1725330000
  }
  ```

### B. Comandos y Overrides
* **Ruta:** `/devices/{deviceId}/commands`
* **Escuchado por:** Stream SSE persistente en el ESP32 ([FirebaseManager.cpp](file:///C:/Users/lagos/PROYECTOS/ESP32Proyecto%20-%20Industrial/monitor-iot-backend/proyecto-iot-code-workspace/edge_esp32/src/FirebaseManager.cpp)).
* **Estructura:**
  ```json
  {
    "modo": "AUTO",          // "AUTO" | "MANUAL"
    "override_fogger": false,
    "override_extractor": false,
    "override_heater": false,
    "override_cooler": false,
    "override_light": true,
    "override_riego": false,
    "timestamp": 1725330010
  }
  ```

### C. Configuración y Perfil Activo
* **Ruta:** `/devices/{deviceId}/config`
* **Estructura:**
  ```json
  {
    "crop_profile": "Shiitake_Fructificacion",
    "activePhaseName": "Fructificación",
    "crop": {
      "temp_ideal_min": 18.0,
      "temp_ideal_max": 24.0,
      "temp_crit_min": 12.0,
      "temp_crit_max": 28.0,
      "temp_sustrato_ideal": 20.0,
      "temp_sustrato_crit_max": 26.0,
      "hum_ideal_min": 85.0,
      "hum_ideal_max": 92.0,
      "hum_crit_min": 70.0,
      "co2_ideal_min": 600,
      "co2_ideal_max": 1000,
      "co2_crit_max": 1500,
      "light_hours_on": 12,
      "kingdom": "FUNGI"
    }
  }
  ```

---

## 3. Reglas de Validación y Consistencia
1. **Tipado TypeScript:** Todo cambio en las interfaces debe actualizarse en [cultivo.ts](file:///C:/Users/lagos/PROYECTOS/ESP32Proyecto%20-%20Industrial/monitor-iot-backend/proyecto-iot-code-workspace/frontend_react/src/types/cultivo.ts) y consumirse en [firebaseService.ts](file:///C:/Users/lagos/PROYECTOS/ESP32Proyecto%20-%20Industrial/monitor-iot-backend/proyecto-iot-code-workspace/frontend_react/src/services/firebaseService.ts).
2. **Serialización C++:** En el ESP32, usar `StaticJsonDocument` o `JsonDocument` con tamaño estrictamente calculado para evitar desbordamiento del Heap.
3. **Null-Safety:** El frontend React debe usar encadenamiento opcional (`telemetria?.temp_promedio ?? 0`) para tolerar payloads parciales o desconexiones momentáneas.
