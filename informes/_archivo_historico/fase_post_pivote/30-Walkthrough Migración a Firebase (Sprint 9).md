# Walkthrough: Migración a Firebase (Sprint 9)

## 🎯 Objetivo Logrado
Hemos reemplazado por completo la infraestructura de red antigua (MQTT) con la SDK nativa de Firebase para ESP32. Esto permite que el "Motor Agnóstico" se comunique directamente con la nube de Google, allanando el camino para nuestro futuro Frontend en React.

## 🛠️ Cambios Realizados

### 1. Limpieza de Dependencias (MQTT -> Firebase)
- Se eliminó la librería `knolleary/PubSubClient` del archivo `platformio.ini`.
- Se agregó la librería oficial `mobizt/Firebase ESP32 Client`.
- Se eliminaron físicamente los archivos `MqttManager.h` y `MqttManager.cpp`.

### 2. Nuevo Gestor: `FirebaseManager`
Se creó una nueva capa arquitectónica encargada de:
- **Autenticación Segura:** Conecta mediante email/contraseña directamente a tu proyecto de Firebase.
- **Telemetría JSON Nativa:** La función `publicarTelemetria()` ahora inyecta la lectura de todos los sensores y actuadores directamente en la rama `/telemetry/{deviceId}/data`.
- **Estructura Asíncrona:** Integrado de manera no bloqueante en el bucle principal (`main.cpp`) para mantener la respuesta en tiempo real del invernadero.

### 3. Sistema de Secretos
Para evitar subir contraseñas a repositorios, creamos el archivo `src/Secrets.h` que contiene las macros de configuración.

### 4. Actualización Visual (TFT)
La pantalla ya no busca el servidor MQTT, ahora indica el estado de la conexión a la base de datos de Firebase:
- `FIREBASE: OK` (Verde)
- `FIREBASE: CAIDO` (Rojo)

## 🧪 Próximos Pasos (Validación Manual)
Antes de continuar con la programación de las *Recetas de Cultivo (Config)* o el *Dashboard en React*, necesitamos validar que el ESP32 inyecta datos exitosamente a tu cuenta real.

> [!CAUTION]
> **Paso Requerido por el Usuario:**
> 1. Abre [src/Secrets.h](file:///c:/Users/lagos/OneDrive/Desktop/ESP32Proyecto%20-%20Industrial/Node-monitor-iot-backend/proyecto_iot-code-workspace/edge_esp32/src/Secrets.h) en tu editor.
> 2. Reemplaza los textos `"API_KEY_AQUI"`, `"URL_BASE_DE_DATOS_AQUI"`, `"correo@ejemplo.com"` y `"tu_password"` con los datos reales de tu proyecto de Firebase.
> 3. Sube el código a la placa (`pio run --target upload`).
> 4. Entra a tu consola de Firebase web (Realtime Database) y confirma si logras ver la carpeta `/telemetry`.
