# Arquitectura de Control Industrial (Separación de Capas)

## 🔴 VISIÓN DEL PROYECTO (DIRECTRIZ INQUEBRANTABLE)
**"Lograr crear un algoritmo perfecto para cada tipo de cultivo."**
El sistema debe abstraer la complejidad. El cliente (Operador) solo elige sus parámetros agronómicos. El sistema de control (Ingeniería) se encarga de la termodinámica, y la configuración del hardware (Instalador) define los comportamientos físicos de emergencia.

---

## Nueva Arquitectura de Separación de Responsabilidades

Basado en la investigación de producto comercial, dividiremos la arquitectura de datos del ESP32 y del sistema en **tres capas completamente aisladas**.

### Nivel 1: Capa Agronómica (Operador / Cultivador)
- **Dónde vive:** Frontend (Gestor de Perfiles) -> Firebase (`/config`) -> ESP32 (`CropProfile`).
- **Qué contiene:** Única y exclusivamente lo que el hongo necesita.
  - `Ideal Min`, `Ideal Max`
  - `Alarm High`, `Alarm Low`
  - `Critical High`, `Critical Low` (Límites de supervivencia)
- **UI:** Es lo único que el usuario final verá y podrá editar.

### Nivel 2: Capa de Hardware / Failsafe (Instalador)
- **Dónde vive:** ESP32 (`SystemConfig`). Para el MVP estará harcodeado en C++, pero diseñado estructuralmente para que en el futuro se pueda inyectar desde un "Modo Instalador" protegido por contraseña en la app.
- **Qué contiene:** Lo que depende de la física de la sala y la potencia de los equipos (no del cultivo).
  - Tiempos de pulso de SAFE MODE (ej. `Humidifier_Pulse_ON = 15s`, `Humidifier_Pulse_OFF = 1800s`).
  - Esto soluciona el problema de los diferentes tamaños de humidificadores o extractores.

### Nivel 3: Capa del Motor de Control (Ingeniería)
- **Dónde vive:** Profundo en el código C++ del ESP32 (`HardwareController`).
- **Qué contiene:** El algoritmo perfecto de termodinámica y protección eléctrica.
  - `Histeresis` (ej. 0.5°C)
  - `RelayMinON` (ej. 120s)
  - `RelayMinOFF` (ej. 120s)
  - Máquina de Estados y Árbitro de Conflictos.
- **UI:** Totalmente invisible. El cultivador jamás debe pensar en esto.

---

## Plan de Ejecución (Siguientes Pasos)

### Fase 1: C++ Backend (ESP32)
Desmantelar el motor de reglas y crear la triple estructura.

#### [MODIFY] `edge_esp32/include/Config.h`
- Borrar `ReglaTermodinamica`.
- Crear `struct CropProfile` (Setpoints agronómicos).
- Crear `struct SystemConfig` (Parámetros del instalador: Safe Mode Pulses).
- Crear `const struct ControlEngineConfig` (Parámetros de ingeniería: Histéresis y Relés).

#### [MODIFY] `edge_esp32/src/NetworkManager.cpp`
- Actualizar el parser JSON para extraer únicamente el `CropProfile` desde Firebase.

#### [MODIFY] `edge_esp32/src/HardwareController.h` / `.cpp`
- **Eliminar** el evaluador de reglas.
- **Implementar Máquina de Estados:** `NORMAL`, `COOLING`, `SAFE_MODE`, etc.
- **Implementar Árbitro:** Resuelve conflictos (ej. bloquea calefactor si el extractor está enfriando).
- **Implementar Timers:** Usa `ControlEngineConfig` para proteger relés y `SystemConfig` para pulsar en `SAFE_MODE`.

### Fase 2: Frontend (React & TypeScript)
#### [MODIFY] `frontend_react/src/types/cultivo.ts`
- Adaptar las interfaces para que el JSON de salida solo contenga los límites ideales y críticos agronómicos.

#### [MODIFY] `frontend_react/src/data/CropProfiles.ts`
- Eliminar la vieja función de "reglas". Generar el nuevo payload `CropProfile` limpio.

## Verification Plan
1. Inyectar el nuevo payload desde la web.
2. Comprobar que el ESP32 recibe solo parámetros agronómicos.
3. Desconectar un sensor físico (DHT22) y verificar mediante el Monitor Serial que el ESP32 levanta la bandera `TEMP_FAULT` y entra en la estrategia pulsada `SAFE_MODE` dictada por la Capa 2 (Instalador).
