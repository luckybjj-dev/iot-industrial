# Sprint 9: Migración a Firebase (Eliminación de MQTT)

Este plan detalla la migración arquitectónica del cerebro de red del ESP32. Abandonaremos el esquema de Broker MQTT tradicional (PubSubClient) para integrarnos directamente con la infraestructura de **Firebase Realtime Database (RTDB)** utilizando el SDK oficial (librería de Mobizt).

Esto preparará el terreno para que el futuro Dashboard en React se comunique directamente con la base de datos de Google sin intermediarios ni backends complejos (Node.js).

## User Review Required

> [!CAUTION]  
> **Gestión de Credenciales:** Necesitaremos apuntar a tu proyecto real de Firebase. En el código implementaremos un archivo `Secrets.h` (que no se subirá a repositorios públicos) donde alojaremos tu `FIREBASE_API_KEY`, `FIREBASE_DATABASE_URL`, y credenciales de autenticación (correo/contraseña o auth anónima). ¿Ya tienes creado el proyecto en la consola de Firebase (console.firebase.google.com) y la Realtime Database iniciada en "Modo de Prueba"?

> [!WARNING]  
> **OTA (Over The Air):** En tu archivo `platformio.ini` veo que usamos subida de código vía OTA (`upload_protocol = espota`). Si este reemplazo de código incluye fallos que crashean el ESP32, perderemos acceso inalámbrico y tendrás que conectarlo por cable USB para revivirlo. ¿Tienes el dispositivo conectado por USB actualmente o estamos operando estrictamente por aire (OTA)?

## Proposed Changes

### Dependencias y Archivos
- Actualizar el `platformio.ini`:
  - **[DELETE]** `knolleary/PubSubClient` (Librería MQTT)
  - **[NEW]** `mobizt/FirebaseClient` (SDK Moderno de Firebase, asíncrono y optimizado para ESP32).

---

### Módulos del Sistema (C++)

#### [DELETE] [MqttManager.h](file:///c:/Users/lagos/OneDrive/Desktop/ESP32Proyecto%20-%20Industrial/Node-monitor-iot-backend/proyecto_iot-code-workspace/edge_esp32/src/MqttManager.h)
#### [DELETE] [MqttManager.cpp](file:///c:/Users/lagos/OneDrive/Desktop/ESP32Proyecto%20-%20Industrial/Node-monitor-iot-backend/proyecto_iot-code-workspace/edge_esp32/src/MqttManager.cpp)
Eliminación absoluta del gestor MQTT.

#### [NEW] `src/Secrets.h`
Archivo para alojar credenciales de WiFi (de fallback) y Firebase. (Será agregado a `.gitignore`).

#### [NEW] `src/FirebaseManager.h` y `src/FirebaseManager.cpp`
Nueva clase encargada de:
1. Autenticar el dispositivo con Firebase Auth.
2. Inyectar (Push) la telemetría periódicamente en el nodo `/telemetry/{deviceId}` de la Realtime Database.
3. Suscribirse mediante un Stream Asíncrono al nodo `/config/{deviceId}` para descargar la receta de cultivo (JSON) automáticamente si hay cambios desde el Frontend.
4. Suscribirse al nodo `/commands/{deviceId}` para los overrides manuales de los actuadores.

#### [MODIFY] [main.cpp](file:///c:/Users/lagos/OneDrive/Desktop/ESP32Proyecto%20-%20Industrial/Node-monitor-iot-backend/proyecto_iot-code-workspace/edge_esp32/src/main.cpp)
- Reemplazar las instancias y callbacks de `MqttManager` por `FirebaseManager`.
- Ajustar el loop no-bloqueante para mantener viva la conexión a Firebase y procesar los streams.

#### [MODIFY] [DisplayManager.cpp](file:///c:/Users/lagos/OneDrive/Desktop/ESP32Proyecto%20-%20Industrial/Node-monitor-iot-backend/proyecto_iot-code-workspace/edge_esp32/src/DisplayManager.cpp)
- Cambiar la referencia visual que dibuja "CEREBRO: OK" (atado a MQTT) para que informe "FIREBASE: OK" reflejando el nuevo SDK.

## Verification Plan

### Manual Verification
1. Compilar y flashear el código en el ESP32.
2. Observar el puerto Serie del ESP32 para confirmar: `[Firebase] Conectado y Autenticado`.
3. Entrar a la Consola de Firebase en tu navegador web y verificar en tiempo real que los datos (temperatura, relés, humedad) están poblando la base de datos RTDB.
4. Cambiar un valor de configuración (ej. `temp_target_c`) directo en la consola web de Firebase y ver cómo el ESP32 recibe y aplica el cambio en el acto.
