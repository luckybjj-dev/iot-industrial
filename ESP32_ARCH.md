# Documentación Core: Arquitectura Firmware ESP32 (Agnostic Engine)

Este documento ha sido generado tras la auditoría y consolidación del código C++ comentado por los subagentes. Detalla la estructura interna, patrones de diseño y flujo de datos del ESP32 en el contexto del "Agnostic Engine".

## 1. Filosofía del Diseño

El código del ESP32 sigue un patrón **Stateless PLC (Controlador Lógico Programable Sin Estado)**.
- **Agnóstico:** El ESP32 no sabe qué está cultivando (ni hongos, ni lechugas). No tiene clases como `Fungi` o `Planta`.
- **Matemático:** Solo recibe arreglos de `ReglaTermodinamica` desde Firebase. Cada regla especifica un target (ej. `TEMP_DAY`), un rango (`min`, `max`), y qué relé debe encender si se sale del rango.
- **Determinista:** La seguridad física está garantizada por failsafes a nivel de hardware, independientemente de lo que envíe la nube.

## 2. Patrones Arquitectónicos Clave

### 2.1 Multithreading Híbrido (FreeRTOS)
El ESP32 usa sus dos núcleos para evitar cuellos de botella:
- **Core 1 (App Core):** Maneja la conexión WiFi, OTA (Over-the-Air updates) y el Portal Cautivo. Tareas pesadas de red que bloquean.
- **Core 0 (Pro Core):** Maneja la lectura de sensores (DHT22), cálculo de VPD, evaluación de reglas termodinámicas, actualización de la pantalla TFT y el Stream bidireccional con Firebase RTDB. Todo corre sobre un `loop` no bloqueante usando `millis()`.

### 2.2 Patrón Observer y Polling (Streaming RTDB)
En `FirebaseManager.cpp`, se abre un canal persistente (Server-Sent Events) contra Firebase. Cuando el Frontend React modifica una regla, Firebase hace "push" de esa novedad al ESP32 casi en milisegundos, invocando un callback local que sobrescribe la configuración física en caliente.

## 3. Módulos Core

### `NetworkManager.cpp`
*   **Gestión de Red:** Conexión auto-gestionada. 
*   **Resiliencia:** Si falla la red local, despliega un Punto de Acceso (AP) llamado `Fungi_Rescate` que sirve un sitio web (Portal Cautivo Asíncrono) para inyectar nuevas credenciales WiFi.

### `FirebaseManager.cpp`
*   **Autenticación JWT:** Usa tokens seguros para conectarse a Google Cloud.
*   **Telemetría Out:** Sube el Payload JSON (Sensores, Estado de Relés, Timestamp) cada X segundos.
*   **Comandos In:** Mantiene el Socket abierto para escuchar cambios en `/rules` y aplicarlos al momento.

### `HardwareController.cpp`
*   **Failsafes Físicos:** El cerebro del control de estado. Evalúa cada lectura de sensor contra los umbrales de las reglas inyectadas.
*   **VPD Calculator:** Incluye la lógica para calcular el *Vapor Pressure Deficit* (Déficit de Presión de Vapor) basado en algoritmos agronómicos.
*   **Protección Anti-Ciclo:** Evita que los relés hagan un encendido/apagado constante (flickering) mediante histéresis.

### `FileManager.cpp`
*   **LittleFS:** Gestiona el sistema de archivos no volátil en la flash del ESP32.
*   **JSON Serialization:** Usa ArduinoJson para guardar credenciales WiFi y guardar un respaldo local offline de las últimas reglas termodinámicas recibidas, garantizando que el equipo funcione sin internet.

### `DisplayManager.cpp`
*   **Anti-Flicker TFT:** Renderiza la UI en pantalla SPI. Usa buffers y áreas de repintado calculadas para evitar parpadeos molestos en actualizaciones rápidas de sensores.

## 4. Flujo de Ciclo Físico (Tick)
1. Lee Sensores -> 2. Procesa Reglas Dinámicas -> 3. Aplica Seguros Termodinámicos -> 4. Conmuta Relés -> 5. Sube Telemetría a Firebase -> 6. Repite.
