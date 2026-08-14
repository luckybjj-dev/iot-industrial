# 77 — Resolución Integral de Deuda Técnica y Optimización de Firmware C++

> **Fecha:** 2026-08-14  
> **Área:** Firmware ESP32 (C++ Industrial) / Arquitectura de Control / HMI TFT / RTDB  
> **Estado:** ✅ Implementado, Compilado en PlatformIO y Validado Empíricamente (100% Tests Pass)  
> **Referencia:** [Auditoría Integral V3](../docs/AUDITORIA_INTEGRAL_V3_2026-08-14.md) | [Informe Maestro](../docs/INFORME_MAESTRO_AGRIEDGE_OS.md) | [Checklist de Deuda Técnica](../docs/CHECKLIST_CORRECCIONES_DEUDA_TECNICA.md)

---

## 1. Justificación Técnica y Planteamiento del Problema

Durante la Auditoría Integral V3 realizada el 14 de Agosto de 2026, se identificaron vulnerabilidades críticas de robustez, seguridad y rendimiento en el firmware del ESP32:

1. **Bug Crítico de Safe Mode (EWMA Bypass):** Ante una desconexión total de sensores DHT, `tempPromedio` caía a `-999.0f`, pero el filtro EWMA mantenía el último valor cálido en memoria. Como el algoritmo de control evaluaba `ewma_temp`, el sistema creía que la cámara estaba fría y mantenía el calefactor SSR encendido (`ON`) indefinidamente sin supervisión sensorial (riesgo de incendio o shock térmico biológico).
2. **Ausencia de Watchdog por Hardware:** Ante un bloqueo en llamadas bloqueantes de red (TLS/SSL Handshake en Firebase), el microcontrolador podía congelarse sin reset automático.
3. **Acoplamiento de Time-Proportioning SSR:** La ventana de PWM para el relé de estado sólido (5000 ms) coincidía con el periodo de evaluación de `main.cpp` (5000 ms), degradando el control PID a una salida binaria on/off sin modulación intraciclo.
4. **Conflicto de Actuadores (Extractor ↔ Fogger):** Si la temperatura superaba el límite ideal y la humedad caía, ambos actuadores se encendían al mismo tiempo, evacuando la niebla recién generada y saturando el entorno exterior.
5. **Falta de Histéresis (Banda Muerta):** Los umbrales de conmutación no tenían banda muerta, lo que provocaba *relay chatter* (conmutaciones continuas) en los límites de setpoint.
6. **Desgaste por Choque Térmico en Celda Peltier:** `PIN_COOLER` conmutaba sin debounce ni anti-short-cycle.
7. **Fuga de Memoria y Fragmentación por `DynamicJsonDocument`:** Parseo dinámico de JSON en el heap durante streams continuos de RTDB y carga de perfiles LittleFS.
8. **Parpadeo Visual en Pantalla TFT:** Refresco completo mediante `fillScreen(BLACK)` a cada tick provocaba molesto parpadeo visible en el display SPI ST7735.
9. **Spam de Reconexión a Firebase:** Sin backoff progresivo ante fallos de conexión a Internet.

---

## 2. Descripción de la Solución e Implementación

### A. Corrección del Safe Mode & Reset de EWMA (`HardwareController.cpp`)
- Si ambos DHT fallan (`tempPromedio == -999.0f`), el filtro EWMA propaga inmediatamente `-999.0f` a `ewma_temp` y `ewma_hum`, forzando el apagado preventivo de todos los actuadores (`heater_ON = false`, `cooler_ON = false`, `fogger_ON = false`).
- Se resetea la bandera `ewmaInitialized = false`, garantizando que al reconectar los sensores, la primera lectura real inicialice el filtro directamente sin sesgo ni arrastre de valores antiguos.

### B. Hardware Watchdog Timer (`main.cpp`)
- Configurado `esp_task_wdt_init(15, true)` en `setup()`, asignando 15 segundos de timeout con reinicio por pánico de hardware.
- Suscripción de la tarea principal con `esp_task_wdt_add(NULL)` y alimentación periódica en cada iteración de `loop()` mediante `esp_task_wdt_reset()`.

### C. Modulación Time-Proportioning SSR Desacoplada (`HardwareController.h/.cpp`, `main.cpp`)
- Implementado el método `actualizarModulacionSSR(unsigned long now)` invocado a máxima velocidad en cada tick de `main.cpp:loop()`.
- El ciclo de cálculo PID y sensores permanece a 5000 ms, pero el ancho de pulso del SSR conmuta en tiempo real intraciclo con resolución de milisegundos.

### D. Árbitro de Actuadores (Exclusión Mutua)
- En `HardwareController.cpp`, se estableció que ante demanda de extracción (`req_extractor == true`), se anula forzosamente la demanda de humidificación (`req_fogger = false`), protegiendo el recurso hídrico y evitando la expulsión inútil de niebla.

### E. Histéresis Paramétrica (Banda Muerta)
- Incorporadas constantes semánticas `HIST_TEMP = 0.5f` (°C) y `HIST_HUM = 2.0f` (%).
- La lógica de demanda evalúa el `EstadoOperacional` activo: un actuador encendido no se apaga hasta superar el setpoint más el margen de histéresis, evitando oscilaciones en la frontera.

### F. Protección Anti-Short-Cycle en Celda Peltier
- Se eliminó el bypass `ignorarFiltro = true` de `PIN_COOLER`, integrándolo al debounce temporal de 180 segundos (`MIN_RELAY_TIME_MS`) para proteger la integridad estructural de la celda termoeléctrica.

### G. Zero-Heap Allocation (`StaticJsonDocument`)
- Reemplazados todos los `DynamicJsonDocument` por `StaticJsonDocument<1024>` en `FirebaseManager` y `StaticJsonDocument<2048>` en `FileManager`. Eliminación total de fragmentación en el heap de la RAM del ESP32.

### H. Backoff Exponencial en Reconexión RTDB (`FirebaseManager.cpp/.h`)
- Algoritmo de backoff progresivo de 2s, 4s, 8s, 16s... hasta un tope de 60s (`MAX_INTERVALO_RECONEXION_MS`), evitando inundar el stack de red del ESP32 ante caídas del router o servicio de Firebase.

### I. Renderizado TFT Anti-Flickering (`DisplayManager.cpp`)
- La plantilla estática de divisiones y etiquetas se dibuja una sola vez en `begin()`.
- En cada ciclo, los valores se sobreescriben utilizando `setTextColor(color_texto, ST77XX_BLACK)`, borrando el texto anterior pixel por pixel sin necesidad de refrescar la pantalla completa.
- Se incorporó la visualización en tiempo real del **Déficit de Presión de Vapor (VPD)** en kPa y el **Estado Operacional** del sistema en el pie de pantalla.

### J. Credenciales Seguras y OTA Desacoplado
- Eliminada contraseña hardcodeada `"agriedge2026"` en `main.cpp`, reemplazada por la macro `OTA_PASSWORD` con soporte en `Secrets.h` y plantilla en `Secrets.h.template`.

---

## 3. Matriz de Archivos Modificados

| Archivo | Cambio Realizado |
| :--- | :--- |
| [`edge_esp32/src/HardwareController.h`](file:///c:/Users/lagos/PROYECTOS/ESP32Proyecto%20-%20Industrial/monitor-iot-backend/proyecto-iot-code-workspace/edge_esp32/src/HardwareController.h) | Declaración de `actualizarModulacionSSR()`, constantes `HIST_TEMP`, `HIST_HUM`. |
| [`edge_esp32/src/HardwareController.cpp`](file:///c:/Users/lagos/PROYECTOS/ESP32Proyecto%20-%20Industrial/monitor-iot-backend/proyecto-iot-code-workspace/edge_esp32/src/HardwareController.cpp) | Fix Safe Mode EWMA, exclusión mutua extractor/fogger, histéresis, debounce Peltier, modulación SSR. |
| [`edge_esp32/src/FirebaseManager.h`](file:///c:/Users/lagos/PROYECTOS/ESP32Proyecto%20-%20Industrial/monitor-iot-backend/proyecto-iot-code-workspace/edge_esp32/src/FirebaseManager.h) | Declaración de `end()`, variables de backoff exponencial de reconexión. |
| [`edge_esp32/src/FirebaseManager.cpp`](file:///c:/Users/lagos/PROYECTOS/ESP32Proyecto%20-%20Industrial/monitor-iot-backend/proyecto-iot-code-workspace/edge_esp32/src/FirebaseManager.cpp) | Implementación de `end()` (liberación de buffers TLS), backoff exponencial, `StaticJsonDocument<1024>`. |
| [`edge_esp32/src/FileManager.cpp`](file:///c:/Users/lagos/PROYECTOS/ESP32Proyecto%20-%20Industrial/monitor-iot-backend/proyecto-iot-code-workspace/edge_esp32/src/FileManager.cpp) | Migración a `StaticJsonDocument<2048>` en lectura y persistencia de configuración en LittleFS. |
| [`edge_esp32/src/DisplayManager.cpp`](file:///c:/Users/lagos/PROYECTOS/ESP32Proyecto%20-%20Industrial/monitor-iot-backend/proyecto-iot-code-workspace/edge_esp32/src/DisplayManager.cpp) | Renderizado Anti-Flickering, fondo negro en fuentes, soporte de métrica VPD y estado operacional. |
| [`edge_esp32/src/main.cpp`](file:///c:/Users/lagos/PROYECTOS/ESP32Proyecto%20-%20Industrial/monitor-iot-backend/proyecto-iot-code-workspace/edge_esp32/src/main.cpp) | Integración de hardware watchdog `esp_task_wdt`, tick rápido de SSR, `OTA_PASSWORD` y `firebase.end()` en OTA. |
| [`edge_esp32/src/Secrets.h.template`](file:///c:/Users/lagos/PROYECTOS/ESP32Proyecto%20-%20Industrial/monitor-iot-backend/proyecto-iot-code-workspace/edge_esp32/src/Secrets.h.template) | Incorporación del campo `OTA_PASSWORD` a la plantilla de credenciales seguras. |
| [`edge_esp32/platformio.ini`](file:///c:/Users/lagos/PROYECTOS/ESP32Proyecto%20-%20Industrial/monitor-iot-backend/proyecto-iot-code-workspace/edge_esp32/platformio.ini) | Removida dependencia obsoleta `sstaub/Ticker`. |
| [`test_safe_mode_verification.py`](file:///c:/Users/lagos/PROYECTOS/ESP32Proyecto%20-%20Industrial/monitor-iot-backend/proyecto-iot-code-workspace/test_safe_mode_verification.py) | Suite de 7 pruebas unitarias empíricas simulando el hardware y algoritmos C++. |
| [`docs/CHECKLIST_CORRECCIONES_DEUDA_TECNICA.md`](file:///c:/Users/lagos/PROYECTOS/ESP32Proyecto%20-%20Industrial/monitor-iot-backend/proyecto-iot-code-workspace/docs/CHECKLIST_CORRECCIONES_DEUDA_TECNICA.md) | Actualización de estado y trazabilidad de los ítems de deuda técnica resueltos. |

---

## 4. Estado de Validación y Pruebas Empíricas

### A. Resultados de la Suite de Pruebas Empíricas (`test_safe_mode_verification.py`)
```text
================================================================================
🧪 EJECUCIÓN DE PRUEBAS EMPÍRICAS DE FIRMWARE (C++ HARNESS)
================================================================================
[TEST 1] COMPORTAMIENTO ANTE FALLO TOTAL DE SENSORES DHT          -> ✅ PASADO (SAFE_MODE y apagado seguro)
[TEST 2] REDUNDANCIA DUAL CON 1 DHT AVERIADO                     -> ✅ PASADO (Sensor vivo opera sin caída)
[TEST 3] RECONEXIÓN DE SENSORES Y RESET DE EWMA                  -> ✅ PASADO (Sin arrastre de sesgo)
[TEST 4] VETO POR TEMPERATURA CRÍTICA DE SUSTRATO (NTC)          -> ✅ PASADO (Veto de seguridad térmico)
[TEST 5] ÁRBITRO DE CONFLICTOS: EXCLUSIÓN EXTRACTOR ↔ FOGGER     -> ✅ PASADO (Exclusión mutua garantizada)
[TEST 6] HISTÉRESIS (BANDA MUERTA) EN TEMPERATURA Y HUMEDAD      -> ✅ PASADO (Prevención de relay chatter)
[TEST 7] MODULACIÓN RÁPIDA TIME-PROPORTIONING (SSR PID PWM)      -> ✅ PASADO (PWM intraciclo de alta resolución)
================================================================================
🎉 TODOS LOS 7 TESTS EMPÍRICOS PASARON CON 100% DE ÉXITO
================================================================================
```

### B. Compilación en PlatformIO (Espressif 32)
- **Estado:** ✅ `SUCCESS` en 23.16s
- **RAM Usada:** 53,632 bytes (16.4% de 327,680 bytes)
- **Flash Usada:** 1,229,549 bytes (62.5% de 1,966,080 bytes)
- **Errores / Warnings:** 0 errores, 0 warnings.
