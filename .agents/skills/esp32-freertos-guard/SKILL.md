---
name: esp32-freertos-guard
description: Reglas de arquitectura, gestión de memoria FreeRTOS, asignación de pines GPIO y protección de actuadores para el firmware C++ del ESP32 en AgriEdge OS. Usar al modificar código en edge_esp32/ o depurar estabilidad de hardware.
---

# ⚡ Guía de Arquitectura de Firmware ESP32 — FreeRTOS y Hardware Industrial

Este skill establece las directrices críticas de diseño y estabilidad para el microcontrolador ESP32 ejecutando AgriEdge OS en [edge_esp32/](file:///C:/Users/lagos/PROYECTOS/ESP32Proyecto%20-%20Industrial/monitor-iot-backend/proyecto-iot-code-workspace/edge_esp32/).

---

## 1. Asignación Inmutable de Pines Físicos (GPIO)

| Dispositivo / Función | Pin GPIO | Canal / Modo | Tipo | Notas Críticas |
| :--- | :--- | :--- | :--- | :--- |
| **DHT22 Principal** | `GPIO 27` | Digital In | Sensor | Temperatura y Humedad Ambiente 1 |
| **DHT22 Redundante** | `GPIO 26` | Digital In | Sensor | Sensor Secundario (Evita paradas por falla) |
| **NTC / Humedad Suelo**| `GPIO 35` | ADC1_CH6 | Sensor Analógico | Calibración Steinhart-Hart / Attenuation 11dB |
| **Calefactor (Heater)**| `GPIO 4` | Digital Out | Actuador / Relé | Salida protegida con Anti-Short Cycle |
| **Enfriador (Cooler)** | `GPIO 17` | Digital Out | Actuador / Relé | Celda Peltier / Compresor |
| **Humidificador (Fogger)**| `GPIO 25` | Digital Out | Actuador / Relé | Humidificación ultrasónica |
| **Extractor (FAE/Gases)**| `GPIO 32` | Digital Out | Actuador / Relé | Renovación de aire y barrido de CO2 |
| **Luz (Light)** | `GPIO 16` | Digital Out | Actuador / Relé | Fotoperiodo vegetal / micológico |
| **Bomba Riego (Irrig)**| `GPIO 33` | Digital Out | Actuador / Relé | Reino Plantae |

---

## 2. Gestión de Memoria y Prevención de Bootloops
1. **Cero Fragmentación del Heap:**
   - Queda terminantemente prohibido instanciar `String` o concatenar con el operador `+` en bucles continuos de `loop()` o tareas de FreeRTOS.
   - Usar buffers `char[]` estáticos o `snprintf` para formateo de strings.
2. **Serialización Segura de JSON (ArduinoJson):**
   - Asegurar tamaño fijo para `JsonDocument` o `StaticJsonDocument`.
   - Evitar "Dangling Pointers": al parsear payloads de Firebase, nunca almacenar punteros crudos `const char*` que apunten a buffers volátiles o destruidos al salir del scope.
3. **Alimentación del Watchdog Timer (WDT):**
   - Toda tarea en bucle infinito debe incluir `vTaskDelay(pdMS_TO_TICKS(n))` para ceder el procesador (Task Yielding) y evitar disparos del WDT.

---

## 3. Algoritmos de Control y Protección Física
1. **Filtrado Matemático EWMA:**
   - Las lecturas de temperatura y humedad deben filtrarse antes del control PID/On-Off para mitigar el ruido electromagnético de relés y motores:
     $$y[k] = \alpha \cdot x[k] + (1 - \alpha) \cdot y[k-1]$$
2. **Protección Anti-Short Cycle (Anti-Ciclado Rápido):**
   - Los actuadores térmicos (Calefactor y Enfriador) deben respetar un tiempo mínimo entre conmutaciones (histéresis temporal $\ge 180$ segundos) para no degradar relés ni compresores.
3. **Failsafe por Pérdida de Sensores:**
   - Si `!dht_ok && !dht2_ok`, el sistema entra en modo `SAFE_MODE` apagando inmediatamente calefactores y enfriadores para evitar desastres térmicos.
