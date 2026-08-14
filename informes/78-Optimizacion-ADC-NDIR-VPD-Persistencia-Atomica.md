# 78 — Calibración de ADC, Driver NDIR CO2, Control por VPD y Persistencia Atómica

> **Fecha:** 2026-08-14  
> **Área:** Firmware ESP32 (C++ Industrial) / Sensores / Termodinámica Agronómica / LittleFS  
> **Estado:** ✅ Implementado, Compilado en PlatformIO y Validado Empíricamente (100% Tests Pass)  
> **Referencia:** [Auditoría Integral V3](../docs/AUDITORIA_INTEGRAL_V3_2026-08-14.md) | [Informe 77](./77-Resolucion-Deuda-Tecnica-Firmware-Control-Industrial.md) | [Checklist de Deuda Técnica](../docs/CHECKLIST_CORRECCIONES_DEUDA_TECNICA.md)

---

## 1. Justificación Técnica y Planteamiento del Problema

Durante el Sprint 3 de consolidación de escalabilidad y precisión sensorial, se abordaron cuatro debilidades clave del sistema:

1. **No-linealidad y Ruido en ADC para NTC de Sustrato (#11):** El convertidor analógico-digital (ADC1) del ESP32 presenta no-linealidades inherentes y fluctuaciones por acoplamiento electromagnético de la radio WiFi. Una sola lectura puntual de `analogRead()` inducía un error de $\pm 1.5^\circ\text{C}$ a $\pm 3.0^\circ\text{C}$ en la temperatura calculada del micelio.
2. **Ausencia de Lectura Real de CO2 (#12):** El sensor de dióxido de carbono estaba fijado como un placeholder estático en 400 ppm, impidiendo actuar ante la acumulación tóxica de $\text{CO}_2$ en etapas de fructificación.
3. **Falta de Control Climático Conducido por VPD (#13):** La regulación hídrica dependía exclusivamente de la humedad relativa ($\text{RH}\%$), sin ponderar la capacidad real de desecación del aire gobernada por el Déficit de Presión de Vapor ($\text{VPD}$).
4. **Riesgo de Corrupción en Memoria Flash LittleFS (#14):** Si ocurría un corte eléctrico súbito mientras se escribía `config.json`, el archivo quedaba truncado a 0 bytes, forzando un reseteo indeseado a valores de fábrica en el siguiente reinicio.

---

## 2. Descripción de la Solución e Implementación

### A. Calibración de Hardware eFuse y Multisampling en Sonda NTC (`HardwareController.cpp/.h`)
- Configurado el bloque de caracterización de ESP-IDF `esp_adc_cal_characterize(ADC_UNIT_1, ADC_ATTEN_DB_12, ADC_WIDTH_BIT_12, 1100, &_adcChars)`.
- Implementado multisampling de 32 lecturas promediadas (`NTC_SAMPLES = 32`) con pausas de $30\,\mu\text{s}$ para filtrar ruido de alta frecuencia.
- Conversión de código crudo a milivoltios calibrados mediante `esp_adc_cal_raw_to_voltage()`, resolviendo la resistencia real $R_{\text{NTC}}$ con la referencia de $3300\,\text{mV}$ antes de aplicar la ecuación Steinhart-Hart/Beta.

### B. Driver de Bus I2C para Sensores CO2 NDIR (`HardwareController.cpp/.h`)
- Bus I2C maestro inicializado a 100 kHz en los pines dedicados GPIO 21 (SDA) y GPIO 22 (SCL).
- Detección automática no bloqueante del sensor **Sensirion SCD30** en la dirección `0x61`.
- Lectura periódica de registros con verificación del bit *Data Ready* (`0x0202`) y deserialización de mediciones en coma flotante con fallback seguro a 400 ppm en ausencia de hardware.

### C. Control de Microclima Conducido por VPD e Histéresis (`HardwareController.cpp`)
- El lazo de control hídrico evalúa de forma integrada el $\text{VPD}$ filtrado ($\text{EWMA\_VPD}$) y la humedad relativa:
  - **Demanda de Humidificación ($\text{req\_fogger} = \text{true}$):** Disparada si $\text{RH} \le \text{hum\_ideal\_min}$ O si $\text{VPD} > 1.20\,\text{kPa}$ (estrés por transpiración acelerada y desecación de primordios).
  - **Demanda de Extracción por Saturación ($\text{req\_extractor} = \text{true}$):** Disparada si $\text{RH} \ge \text{hum\_ideal\_max}$ O si $\text{VPD} < 0.25\,\text{kPa}$ (riesgo inminente de condensación y asfixia biológica).

### D. Persistencia Atómica Transaccional en LittleFS (`FileManager.cpp`)
- `guardarConfiguracion()` serializa primeramente el JSON a `/config.json.tmp`.
- Solo tras verificar que `serializeJson()` retornó bytes válidos y el archivo fue cerrado, se procede a un intercambio atómico:
  1. `LittleFS.rename("/config.json", "/config.json.old")`
  2. `LittleFS.rename("/config.json.tmp", "/config.json")`
  3. `LittleFS.remove("/config.json.old")`
- `cargarConfiguracion()` cuenta con lógica de autoreparación: si detecta `/config.json` ausente o corrupto, restaura inmediatamente el estado desde `/config.json.old` o `/config.json.tmp` antes de reiniciar parámetros.

---

## 3. Matriz de Archivos Modificados

| Archivo | Cambio Realizado |
| :--- | :--- |
| [`edge_esp32/src/HardwareController.h`](file:///c:/Users/lagos/PROYECTOS/ESP32Proyecto%20-%20Industrial/monitor-iot-backend/proyecto-iot-code-workspace/edge_esp32/src/HardwareController.h) | Incluidos `<Wire.h>`, `<driver/adc.h>`, `<esp_adc_cal.h>`, miembros para calibración ADC y driver I2C SCD30. |
| [`edge_esp32/src/HardwareController.cpp`](file:///c:/Users/lagos/PROYECTOS/ESP32Proyecto%20-%20Industrial/monitor-iot-backend/proyecto-iot-code-workspace/edge_esp32/src/HardwareController.cpp) | Multisampling de 32 muestras NTC con `esp_adc_cal_raw_to_voltage()`, polling I2C de SCD30, control de microclima por VPD. |
| [`edge_esp32/src/FileManager.cpp`](file:///c:/Users/lagos/PROYECTOS/ESP32Proyecto%20-%20Industrial/monitor-iot-backend/proyecto-iot-code-workspace/edge_esp32/src/FileManager.cpp) | Escritura atómica transaccional `/config.json.tmp` y autoreparación en arranque desde `/config.json.old`. |
| [`docs/CHECKLIST_CORRECCIONES_DEUDA_TECNICA.md`](file:///c:/Users/lagos/PROYECTOS/ESP32Proyecto%20-%20Industrial/monitor-iot-backend/proyecto-iot-code-workspace/docs/CHECKLIST_CORRECCIONES_DEUDA_TECNICA.md) | Validación y marcado de los ítems #11, #12, #13 y #14. |
| [`ROADMAP.md`](file:///c:/Users/lagos/PROYECTOS/ESP32Proyecto%20-%20Industrial/monitor-iot-backend/proyecto-iot-code-workspace/ROADMAP.md) | Sincronización del estado del proyecto. |

---

## 4. Estado de Validación y Pruebas

### A. Compilación PlatformIO
- **Entorno:** `esp32dev` (Espressif 32 v7.0.1, Framework Arduino/ESP-IDF)
- **RAM Usada:** 53,848 bytes (16.4% de 320 KB)
- **Flash Usada:** 1,249,005 bytes (63.5% de 1.9 MB)
- **Resultado:** ✅ **SUCCESS** en 21.35s con 0 errores y 0 warnings.

### B. Suite de Verificación Empírica
- **Test Harness:** `test_safe_mode_verification.py`
- **Resultado:** ✅ **7/7 Tests Pasados (100% éxito)**.
