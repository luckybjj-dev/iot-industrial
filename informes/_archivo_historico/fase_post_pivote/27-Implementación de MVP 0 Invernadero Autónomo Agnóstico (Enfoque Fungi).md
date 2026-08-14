# Implementación de MVP 0: Invernadero Autónomo Agnóstico (Enfoque Fungi)

Este plan detalla los pasos para construir la **base arquitectónica del MVP 0** (Volúmenes III y IV de la especificación técnica). El objetivo del MVP 0 no es encender relés todavía, sino **validar que el ESP32 puede leer un archivo de configuración universal (`config.json`) desde su memoria interna y ejecutar un bucle de lectura de sensores de forma no bloqueante**.

## User Review Required

> [!IMPORTANT]  
> Por favor revisa la estructura del `config.json` propuesto más abajo. He ajustado los parámetros de clima (Temp, Humedad, CO2) específicamente para las necesidades típicas de la fase de fructificación del **cultivo Fungi** (Alta humedad, control estricto de CO2). ¿Estás de acuerdo con estos rangos?

> [!WARNING]  
> Para la gestión de dependencias y la carga del archivo JSON a la memoria del ESP32 (`LittleFS`), es altamente recomendado usar **PlatformIO** (extensión de VSCode) en lugar del IDE clásico de Arduino. Asumiré el uso de PlatformIO para inicializar el proyecto.

## Open Questions

> [!NOTE]  
> 1. **Placa ESP32:** En tu carpeta vi referencias a "Wemos-D1-R32". ¿Es esa la placa exacta que usaremos para compilar, o usarás un ESP32-S3 DevKit? 
> 2. **Sensores Iniciales:** Para este MVP 0, ¿quieres que deje la lógica preparada para los sensores industriales mencionados (ej. SHT45 y SCD41), o implementamos datos simulados (mock) primero para validar el parseo del JSON?

---

## Proposed Changes

El proyecto se creará en una nueva subcarpeta dentro de tu directorio de trabajo actual.

### Entorno de Desarrollo (PlatformIO)

Se inicializará el proyecto en `C:\Users\lagos\OneDrive\Desktop\ESP32Proyecto - Industrial\AgriTech_ESP32_MVP`.

#### [NEW] `platformio.ini`
Configuración del entorno, definiendo el uso de `LittleFS` y la librería `ArduinoJson` (necesaria para el motor de reglas).

### Sistema de Archivos (LittleFS)

#### [NEW] `data/config.json`
El archivo que dictará el comportamiento del invernadero. Diseñado para **Fungi**:
```json
{
  "greenhouse_id": "FUNGI_CHAMBER_01",
  "crop_profile": "Fungi_Fruiting_v1",
  "climate": {
    "temp_target_c": 21.0,
    "temp_hysteresis": 1.0,
    "humidity_target_pct": 90.0,
    "humidity_hysteresis": 3.0,
    "co2_max_ppm": 800
  },
  "ventilation": {
    "fae_interval_min": 10,
    "fae_duration_sec": 60
  },
  "failsafes": {
    "watchdog_timeout_ms": 10000,
    "max_internal_temp_limit_c": 30.0
  }
}
```

### Arquitectura de Software (C++)

Se implementará una arquitectura limpia y modular en C++.

#### [NEW] `include/ConfigManager.h` & `src/ConfigManager.cpp`
Módulo encargado de inicializar `LittleFS`, leer el archivo `config.json`, deserializarlo usando `ArduinoJson` y exponer variables estructuradas (ej. `ConfigManager.getTargetTemp()`) al resto del sistema.

#### [NEW] `include/SensorManager.h` & `src/SensorManager.cpp`
Módulo encargado de gestionar las lecturas de los sensores. En este MVP 0 usará una máquina de estados basada en `millis()` para asegurar que las lecturas no bloqueen el microcontrolador.

#### [NEW] `src/main.cpp`
El núcleo del programa. Orquestará la inicialización de módulos y mantendrá el bucle principal (`loop()`) limpio y rápido, validando el principio Edge-First.

---

## Verification Plan

### Automated Tests / Compilación
- Se ejecutará `pio run` para verificar que el código compila sin errores para la placa objetivo.
- Se verificará que la librería `ArduinoJson` y `LittleFS` se integren correctamente.

### Manual Verification
- Te indicaré cómo ejecutar el comando "Build Filesystem Image" y "Upload Filesystem Image" en PlatformIO para cargar el `config.json` en el ESP32.
- Deberás abrir el Monitor Serial para observar cómo el ESP32 arranca, lee el archivo JSON, imprime la configuración de Fungi por pantalla, y comienza el bucle no bloqueante de los sensores.
