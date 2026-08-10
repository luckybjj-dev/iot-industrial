---
name: arquitectura-firebase-rtdb
description: Regla de arquitectura obligatoria. Define que el proyecto utiliza Firebase RTDB de forma exclusiva para comandos y telemetría, y prohíbe el uso de MQTT.
trigger: always_on
---

# Regla de Arquitectura: Pivote a Firebase RTDB

**CRÍTICO - SIEMPRE DEBES RECORDAR ESTO AL TRABAJAR EN ESTE PROYECTO:**

1. **Se abandonó MQTT:** Este proyecto pivotó y **YA NO UTILIZA MQTT** para la comunicación en tiempo real con el hardware (ESP32).
2. **Cerebro Central / Frontend / Hardware:** Todo el flujo de telemetría y comandos de control (setpoints, actuadores, modos) ocurre de forma nativa y directa a través de **Firebase Realtime Database (RTDB)**.
3. **Paths de Firebase clave:**
   - La telemetría del ESP32 se escribe/lee en: `telemetry` (o similar, dependiendo del device).
   - Los comandos (setpoints, configuraciones, overrides) se escriben/escuchan en: `devices/{deviceId}/commands`.
4. **Legado:** Cualquier archivo (como `subscriber.ts` u otros) que contenga referencias a HiveMQ o `client.publish` de MQTT es código **LEGACY** (heredado) que está obsoleto en cuanto al control bidireccional de actuadores. No intentes usar MQTT para enviar comandos al hardware.

**Acción:** Siempre asume que las interacciones con el ESP32 se hacen suscribiendo o escribiendo a los nodos de Firebase RTDB.
