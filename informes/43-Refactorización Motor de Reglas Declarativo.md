# Refactorización: Motor de Reglas Declarativo

Este plan detalla la arquitectura para desacoplar la lógica de control del `HardwareController` y moverla hacia un **Motor de Reglas Declarativo** (Rule Engine) impulsado por el archivo `config.json`.

## Goal Description
Actualmente, el `HardwareController` tiene reglas físicas programadas en C++ (hardcodeadas), por ejemplo: evaluar `temp_target_c` y encender `heater_ON`. Esto rompe el principio de que "el firmware no conoce qué está cultivando". 
El objetivo es transformar el ESP32 en un PLC puro: leerá una matriz de **Reglas** desde `config.json` y simplemente las evaluará en tiempo de ejecución, sin saber si está controlando un hongo, una planta de tomate o un motor.

## User Review Required

> [!IMPORTANT]
> **Cambio de Paradigma Estructural:**
> Modificaremos el `config.json` de un formato de "perfil climático" a un formato de "lista de reglas termodinámicas". Esto requerirá modificar la estructura `ConfiguracionCultivo` en `FileManager.h`.

## Open Questions

> [!NOTE]
> 1. **Nivel de Abstracción en JSON**: ¿Prefieres que el JSON defina las reglas de forma explícita así:
>    ```json
>    "rules": [
>       {"sensor": "temp_aire", "operator": "<", "threshold": 20.0, "actuator": "heater_on", "action": true},
>       {"sensor": "temp_aire", "operator": ">", "threshold": 21.0, "actuator": "heater_on", "action": false}
>    ]
>    ```
>    ¿O mantenemos la estructura actual (`temp_target_c`, `temp_hysteresis`) y abstraemos la lógica solo dentro del C++ en una clase `RuleEngine` que generalice las histéresis?
> 2. **Lógica Compleja (NTP / FAE)**: El Fotoperiodo (luz por horas) y el Extractor por ciclos (FAE) dependen del tiempo (`millis()` y NTP), no solo de operadores lógicos (>, <). ¿Te parece bien dejar estas lógicas de tiempo como un motor de "Temporizadores" separado de las "Reglas Lógicas", o quieres meter todo en un super-motor de reglas basado en JSON?

---

## Proposed Changes

### 1. Sistema de Archivos (`config.json`)
#### [MODIFY] `data/config.json` (o equivalente)
- Se introducirá un array de reglas si optamos por el JSON 100% declarativo.

### 2. Capa de Datos
#### [MODIFY] [FileManager.h](file:///C:/Users/lagos/OneDrive/Desktop/ESP32Proyecto - Industrial/Node-monitor-iot-backend/proyecto_iot-code-workspace/edge_esp32/src/FileManager.h)
- Se actualizará el struct para soportar la deserialización de las reglas.

### 3. Capa Lógica
#### [NEW] `src/RuleEngine.h` & `src/RuleEngine.cpp`
- Nueva clase responsable de evaluar las reglas (ej. `evaluarReglas(sensores, actuadores, reglas)`).
- Implementará un motor de evaluación simple (parsing de `<, >, ==`).

### 4. Capa de Control Físico
#### [MODIFY] [HardwareController.cpp](file:///C:/Users/lagos/OneDrive/Desktop/ESP32Proyecto - Industrial/Node-monitor-iot-backend/proyecto_iot-code-workspace/edge_esp32/src/HardwareController.cpp)
- Se limpiará por completo el método `procesarLogicaDeControl()`.
- En su lugar, delegará la decisión al `RuleEngine` y luego aplicará los estados resultantes (`digitalWrite`) a los pines físicos.

---

## Verification Plan
1. **Compilación**: Verificaremos que el nuevo firmware compile en PlatformIO tras desvincular el `HardwareController`.
2. **Serial Print**: Añadiremos logs en el `RuleEngine` para ver cómo toma decisiones ("Regla #1 activada -> Calefactor ON").
3. **Prueba de regresión**: Validaremos que el control de temperatura siga siendo estable (histéresis) pero ahora bajo el nuevo modelo agnóstico.
