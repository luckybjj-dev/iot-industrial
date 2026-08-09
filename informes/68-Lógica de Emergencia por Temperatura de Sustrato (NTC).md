# Lógica de Emergencia por Temperatura de Sustrato (NTC)

La temperatura del sustrato (tierra o bloque de micelio) es una métrica con una alta inercia térmica que resulta crítica para la supervivencia de la biomasa. Este plan detalla la implementación de reglas de emergencia ("Overrides") en el Motor Termodinámico, dándole al sustrato el poder de anular (vetar) las acciones regulares del control de aire.

## User Review Required

> [!WARNING]
> **Modificación del Rule Engine:**
> Al introducir estas reglas, el sensor analógico (NTC) tendrá **máxima prioridad** sobre el ambiente.
> - Si el sustrato se calienta peligrosamente (>28°C), el sistema encenderá el extractor y **bloqueará el calefactor** aunque el aire esté frío.
> - Si el sustrato se enfría peligrosamente (<15°C), el sistema encenderá el calefactor y **bloqueará el extractor** aunque el aire esté caliente.
> ¿Estás de acuerdo con esta jerarquía estricta?

## Open Questions

> [!NOTE]
> **Umbrales por Defecto:**
> - En C++ definiré los umbrales por defecto en `sustrato_temp_min = 15.0f` y `sustrato_temp_max = 28.0f`.
> ¿Te parecen correctos estos valores base para iniciar? 

## Proposed Changes

### 1. Actualización de Modelos de Datos (Configuración)

#### [MODIFY] [FileManager.h](file:///C:/Users/lagos/OneDrive/Desktop/ESP32Proyecto%20-%20Industrial/Node-monitor-iot-backend/proyecto_iot-code-workspace/edge_esp32/src/FileManager.h)
- En el `struct CropProfile`, agregar:
  - `float sustrato_temp_min = 15.0f;`
  - `float sustrato_temp_max = 28.0f;`

#### [MODIFY] [FileManager.cpp](file:///C:/Users/lagos/OneDrive/Desktop/ESP32Proyecto%20-%20Industrial/Node-monitor-iot-backend/proyecto_iot-code-workspace/edge_esp32/src/FileManager.cpp)
- Actualizar `guardarConfiguracion` (Serialización JSON) para incluir los campos del sustrato.
- Actualizar `leerConfiguracion` (Deserialización JSON) para leer los campos del sustrato.

#### [MODIFY] [cultivo.ts](file:///C:/Users/lagos/OneDrive/Desktop/ESP32Proyecto%20-%20Industrial/Node-monitor-iot-backend/proyecto_iot-code-workspace/frontend_react/src/types/cultivo.ts)
- En `DeviceCropProfile`, agregar `sustrato_temp_min` y `sustrato_temp_max`.
- En `EstadoOperacional`, agregar `'EMERGENCIA_SUSTRATO_CALIENTE'` y `'EMERGENCIA_SUSTRATO_FRIO'`.

---

### 2. Modificación del Motor Termodinámico (Rule Engine)

#### [MODIFY] [HardwareController.h](file:///C:/Users/lagos/OneDrive/Desktop/ESP32Proyecto%20-%20Industrial/Node-monitor-iot-backend/proyecto_iot-code-workspace/edge_esp32/src/HardwareController.h)
- Añadir `EMERGENCIA_SUSTRATO_CALIENTE` y `EMERGENCIA_SUSTRATO_FRIO` al `enum class EstadoOperacional`.

#### [MODIFY] [HardwareController.cpp](file:///C:/Users/lagos/OneDrive/Desktop/ESP32Proyecto%20-%20Industrial/Node-monitor-iot-backend/proyecto_iot-code-workspace/edge_esp32/src/HardwareController.cpp)
- En `procesarLogicaDeControl`, insertar la **Lógica de Emergencia del Sustrato** al principio de las comprobaciones térmicas (antes del control de aire):
  - **Chequeo Calor:** `if (_sensores.valorAnalogico > _config.crop.sustrato_temp_max)`
    - Estado = `EMERGENCIA_SUSTRATO_CALIENTE`.
    - `nuevoExtractor = true;` (Evacuar).
    - `nuevoHeater = false;` (Bloquear calor).
  - **Chequeo Frío:** `if (_sensores.valorAnalogico < _config.crop.sustrato_temp_min)`
    - Estado = `EMERGENCIA_SUSTRATO_FRIO`.
    - `nuevoHeater = true;` (Forzar calentamiento por conducción).
    - `nuevoExtractor = false;` (Bloquear extracción).

#### [MODIFY] [FirebaseManager.cpp](file:///C:/Users/lagos/OneDrive/Desktop/ESP32Proyecto%20-%20Industrial/Node-monitor-iot-backend/proyecto_iot-code-workspace/edge_esp32/src/FirebaseManager.cpp)
- Mapear los nuevos estados operacionales a string en la función de telemetría para que lleguen correctos al dashboard.

---

### 3. Actualización de la Interfaz Web (React)

#### [MODIFY] [App.tsx](file:///C:/Users/lagos/OneDrive/Desktop/ESP32Proyecto%20-%20Industrial/Node-monitor-iot-backend/proyecto_iot-code-workspace/frontend_react/src/App.tsx)
- En la MetricCard de "Temp. Sustrato", modificar el prop `status` para que sea `'DANGER'` si se sobrepasan los límites definidos en `crop.sustrato_temp_min` o `max`, haciendo que parpadee en rojo cuando haya termogénesis crítica.

## Verification Plan

### Manual Verification
- Visualizaremos que los nuevos parámetros se guarden correctamente en la base de datos RTDB de Firebase.
- Inyectaremos una temperatura virtual de sustrato > 28°C para confirmar que el relé del calefactor se apaga y el extractor se enciende.
- Validaremos que el UI muestre las tarjetas de advertencia de "Emergencia de Sustrato".
