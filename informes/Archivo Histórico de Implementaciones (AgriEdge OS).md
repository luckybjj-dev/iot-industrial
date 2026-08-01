# Archivo Histórico de Implementaciones (AgriEdge OS)

Este documento centraliza todas las arquitecturas y planes de implementación del proyecto, preservando el historial para no perder trazabilidad.

---

## 📅 [FASE 1] Consolidación del Cerebro Agnóstico (Hardware Fungi)
*Completado en Sprint 7*
**Objetivos Logrados:**
- Refactorización a Programación Orientada a Objetos (`FileManager`, `HardwareController`, `MqttManager`).
- Configuración de Pines físicos para el WeMos D1 R32 (`PIN_RELE_B` = 25 Humidificador, `PIN_RELE_C` = 26 Ventilador).
- Implementación de Gatillo Térmico de Emergencia (Failsafe) y temporizador cíclico de ventilación (FAE).

---

## 📅 [FASE 2] El Master Roadmap V2.0 (Pivote Lean Startup)
*Definido al inicio del Sprint 8*
1.  **Portal Cautivo (Plug & Play):** El ESP32 arranca como AP para que el usuario introduzca credenciales Wi-Fi (Cero fricción).
2.  **Motor Agnóstico:** Uso intensivo de `config.json` en LittleFS para evitar *hardcodear* perfiles (como "FUNGI") en C++.
3.  **Dashboard Innegociable (Firebase):** Descartar MQTT + InfluxDB + Node.js en favor de una conexión directa del ESP32 a Firebase, para alimentar un Dashboard en React.

---

## 📅 [FASE 3] Plan de Refactorización Actual: Motor Agnóstico y NTP
*Sprint 8 (En progreso)*

### 1. Reestructurar el `config.json` y `FileManager`
Adoptaremos el esquema anidado validado para el MVP 0, permitiendo reglas avanzadas.
*   **[MODIFY] `FileManager.h`**: Actualizar `ConfiguracionCultivo` para usar sub-estructuras (`climate`, `ventilation`, `failsafes`).
*   **[MODIFY] `FileManager.cpp`**: Generar y parsear (vía `ArduinoJson`) el esquema anidado.

### 2. Implementar Cliente NTP (`NetworkManager`)
*   **[MODIFY] `NetworkManager.h` & `NetworkManager.cpp`**: 
    *   Incluir `<time.h>`.
    *   Ejecutar `configTime()` al conectarse al Wi-Fi.
    *   Crear método para obtener la hora actual.

### 3. Refactorizar el "God Object" (`HardwareController`)
*   **[MODIFY] `HardwareController.h`**: 
    *   **Nomenclatura Semántica (HAL):** `PIN_HEATER`, `PIN_FOGGER`, `PIN_EXTRACTOR`, `PIN_LIGHT`.
    *   Variables de estado para la banda muerta (Dead Band).
*   **[MODIFY] `HardwareController.cpp`**:
    *   **Motor Agnóstico:** Eliminar todos los `if (_config.perfil == "FUNGI")`. Usar estrictamente los umbrales lógicos del JSON.
    *   **Actuador Lumínico:** Leer el tiempo actual desde NTP y encender `PIN_LIGHT` según el fotoperiodo.
    *   **Histéresis:** Implementar lógica para evitar el *Short-cycling* de los relés.

## Open Questions (Pendientes)
1. Para la **zona horaria (Timezone)** de NTP, ¿utilizamos UTC-4 / UTC-3 (Chile) por defecto, o UTC plano?
2. ¿Me das luz verde para comenzar con la Fase 3 modificando `FileManager`?
