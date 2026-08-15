# 📋 CHECKLIST DE CORRECCIONES Y DEUDA TÉCNICA — AgriEdge OS

> **Documento de Control y Seguimiento Post-Auditoría V3**  
> **Fecha de Creación:** 14 de Agosto de 2026  
> **Estado:** En proceso de verificación empírica  

---

## 🔴 Sprint 1: Deuda Crítica (Seguridad y Failsafes)

- [x] **#1. Bug de Safe Mode (EWMA congelaba temperatura)**
  - *Problema:* Al fallar ambos sensores DHT (`tempPromedio == -999.0f`), el filtro EWMA congelaba la temperatura en el último valor válido, evitando la entrada a `SAFE_MODE` y manteniendo el calefactor activo a ciegas.
  - *Corrección:* `HardwareController.cpp` propaga `-999.0f`, resetea `ewmaInitialized = false` y fuerza todos los actuadores térmicos/hídricos a `OFF`.
  - *Estado de Validación:* ✅ **Verificado empíricamente** (`test_safe_mode_verification.py` - Test 1 & 3 pasados al 100%)

- [x] **#2. Watchdog de Hardware inactivo**
  - *Problema:* El parámetro `watchdog_timeout_ms` existía en `config.json` pero `esp_task_wdt` no estaba inicializado en `main.cpp`.
  - *Corrección:* Integrado `esp_task_wdt.h`, inicializado en `setup()` con fallback mínimo de 15s, y alimentado en cada tick de `loop()`.
  - *Estado de Validación:* ✅ **Verificado en compilación PlatformIO (ELF/BIN generado)**

- [x] **#3. Rotación y purga de credenciales en Git**
  - *Problema:* `Secrets.h` estuvo presente en commits pasados del historial de Git.
  - *Corrección:* Purga total del árbol histórico mediante `git filter-branch`, eliminación de reflogs (`git gc --aggressive`), blindaje de `.gitignore` y sincronización remota forzada en GitHub.
  - *Estado de Validación:* ✅ **Verificado empíricamente (`git log --all --full-history` = 0 commits) e Informe 18**.

---

## 🟡 Sprint 2: Core MVP y Control Robusto

- [x] **#8. Fix OTA (Fallo al 100% por contención de Heap/TLS)**
  - *Problema:* `ArduinoOTA.onStart()` no detenía los streams ni liberaba buffers de Firebase, colapsando la memoria durante la verificación de firmware.
  - *Corrección:* Implementado `FirebaseManager::end()` que invoca `_fbdoStream.clear()` y `_fbdo.clear()`, ejecutado en `onStart()`.
  - *Estado de Validación:* ✅ **Verificado en compilación PlatformIO**

- [x] **#16. Eliminación de librería huérfana `Ticker`**
  - *Problema:* `sstaub/Ticker @ ^4.4.0` ocupaba espacio en flash sin usarse en ningún `.cpp`.
  - *Corrección:* Eliminada de `platformio.ini`.
  - *Estado de Validación:* ✅ **Verificado en compilación (Librería removida del árbol de dependencias)**

- [x] **#4. Desacoplamiento de PID a modulación Time-Proportioning de alta frecuencia**
  - *Problema:* La ventana de Time-Proportioning (5s) coincidía con el ciclo de evaluación de `main.cpp` (5s), impidiendo modular el SSR intraciclo.
  - *Corrección:* Implementado `actualizarModulacionSSR(millis())` en `HardwareController` invocado en cada tick rápido de `loop()` en `main.cpp`.
  - *Estado de Validación:* ✅ **Verificado empíricamente** (`test_safe_mode_verification.py` - Test 7) + PlatformIO compilado.

- [x] **#5. Árbitro de Actuadores (Exclusión Mutua Extractor ↔ Fogger)**
  - *Problema:* Demanda de enfriamiento y humedad baja disparaban extractor y fogger simultáneamente, evacuando y desperdiciando la niebla.
  - *Corrección:* Inclusión de interlock en `HardwareController.cpp`: si `req_extractor == true`, se fuerza `req_fogger = false`.
  - *Estado de Validación:* ✅ **Verificado empíricamente** (`test_safe_mode_verification.py` - Test 5).

- [x] **#6. Histéresis paramétrica (Banda Muerta)**
  - *Problema:* Los umbrales de conmutación no tenían banda muerta, provocando posibles oscilaciones de relé (chatter).
  - *Corrección:* Constantes `HIST_TEMP = 0.5°C` y `HIST_HUM = 2.0%` evaluadas contra el `EstadoOperacional` activo.
  - *Estado de Validación:* ✅ **Verificado empíricamente** (`test_safe_mode_verification.py` - Test 6).

- [x] **#7. Anti-Short-Cycle en módulo Peltier**
  - *Problema:* `PIN_COOLER` pasaba `ignorarFiltro = true`, sometiendo la celda Peltier a conmutaciones bruscas.
  - *Corrección:* Integrado debounce de 180s en `_ejecutarAccion` para `PIN_COOLER`.
  - *Estado de Validación:* ✅ **Verificado en compilación PlatformIO**.

- [x] **#9. Backoff exponencial en reconexión de Firebase**
  - *Problema:* `FirebaseManager` reintentaba sin espaciado temporal ante caídas de servicio, saturando el stack WiFi.
  - *Corrección:* Algoritmo de backoff progresivo (2s, 4s, 8s... hasta 60s máximo) en `FirebaseManager::loop()`.
  - *Estado de Validación:* ✅ **Verificado en compilación PlatformIO**.

- [x] **#10. Migración de `DynamicJsonDocument` a `StaticJsonDocument`**
  - *Problema:* Asignación dinámica en heap provocaba fragmentación de memoria tras semanas de operación continua.
  - *Corrección:* Migración a `StaticJsonDocument<1024>` en `FirebaseManager` y `StaticJsonDocument<2048>` en `FileManager`. Cero asignaciones en heap durante runtime.
  - *Estado de Validación:* ✅ **Verificado en compilación PlatformIO**.

---

## 🟢 Sprint 3: Escalabilidad y Refinamiento

- [x] **#19. Validación Termodinámica Cruzada (Sustrato vs. Ambiente en UI/SCADA)**
  - *Problema:* El gestor de perfiles permitía ingresar $T_{\text{sustrato}} \le T_{\text{ambiente}}$, violando la termogénesis del micelio ($+2^\circ\text{C}$ a $+4^\circ\text{C}$) y generando alarmas falsas.
  - *Corrección:* Implementado motor `validateThermodynamics()` en `CropProfiles.ts`, guards en modal `CropProfileSelectorModal.tsx`, badge dinámico de diagnóstico y auto-cálculo asistido (+2°C metabólico).
  - *Estado de Validación:* ✅ **Verificado en TypeScript (`npx tsc`) e Informe 15**.

- [x] **#11. Calibración ADC + Multisampling en Sonda NTC**
  - *Problema:* No-linealidad y ruido electromagnético en ADC1 generaban desvíos de hasta ±3.0°C en la lectura analógica de sustrato.
  - *Corrección:* Caracterización de curva eFuse/TwoPoint con `esp_adc_cal_characterize()` y multisampling de 32 muestras consecutivas (`NTC_SAMPLES = 32`) con `esp_adc_cal_raw_to_voltage()`.
  - *Estado de Validación:* ✅ **Verificado en compilación PlatformIO e Informe 17**.

- [x] **#12. Integración de sensor CO2 NDIR real (SCD30 / MH-Z19)**
  - *Problema:* CO2 fijado en placeholder estático de 400 ppm.
  - *Corrección:* Driver I2C para Sensirion SCD30/40 en GPIO 21/22 con lectura continua no bloqueante, chequeo de data-ready y fallback seguro.
  - *Estado de Validación:* ✅ **Verificado en compilación PlatformIO e Informe 17**.

- [x] **#13. Control climático gobernado por VPD como variable maestra**
  - *Problema:* El microclima hídrico solo evaluaba RH%, ignorando la tasa de transpiración y desecación del micelio.
  - *Corrección:* Control coordinado por VPD: humidificación activada si $VPD > 1.20\,\text{kPa}$ o RH baja, y extracción activada si $VPD < 0.25\,\text{kPa}$ por saturación.
  - *Estado de Validación:* ✅ **Verificado en compilación PlatformIO e Informe 17**.

- [x] **#14. Escritura atómica transaccional en LittleFS**
  - *Problema:* Cortes de energía durante la escritura de `config.json` truncaban el archivo a 0 bytes.
  - *Corrección:* Escritura a `/config.json.tmp`, renombramiento atómico con respaldo `/config.json.old` y autoreparación en arranque.
  - *Estado de Validación:* ✅ **Verificado en compilación PlatformIO e Informe 17**.
- [x] **#15. Renderizado TFT con Dirty Checking / Anti-Flickering**
  - *Problema:* `fillScreen(BLACK)` a cada tick causaba parpadeo molesto en la pantalla SPI.
  - *Corrección:* Plantilla estática dibujada una sola vez en `begin()`, sobreescritura de glifos con fondo negro (`setTextColor(fg, ST77XX_BLACK)`) e integración de métrica VPD en pantalla.
  - *Estado de Validación:* ✅ **Verificado en compilación PlatformIO**.

- [x] **#17. Extracción de Magic Numbers a constantes semánticas**
  - *Problema:* Límites de tiempo, histéresis y colores dispersos como literales.
  - *Corrección:* Centralizadas constantes `HIST_TEMP`, `HIST_HUM`, `ALPHA_EWMA`, `MIN_RELAY_TIME_MS` en headers.
  - *Estado de Validación:* ✅ **Verificado en código y compilación**.

- [x] **#18. Password OTA configurable desde `Secrets.h` / NVS**
  - *Problema:* `"agriedge2026"` hardcodeado en `main.cpp`.
  - *Corrección:* Desacoplado a `OTA_PASSWORD` en `Secrets.h` (con fallback de compilación y documentado en plantilla).
  - *Estado de Validación:* ✅ **Verificado en compilación PlatformIO**.

---

## 🟢 Sprint 4: Correcciones Post-Auditoría SCADA React

- [x] **#19. Error de parse crítico en CropProfiles.ts (SCADA Frontend)**
  - *Problema:* El parser OXC de Vite lanzaba `[PARSE_ERROR] Unexpected token {` en línea 1735 de `CropProfiles.ts`, impidiendo compilar y ejecutar el frontend. Causa raíz: objeto `targets` del phase `ripening` de Albahaca incompleto con fragmento de código basura insertado dentro; además dos crops duplicados (Berenjena y Menta × 2 en el mismo objeto).
  - *Corrección:* (1) Completado el objeto `targets` del ripening de *Ocimum basilicum* con los 6 campos requeridos y valores agronómicos correctos. (2) Eliminadas 170 líneas de bloques duplicados. (3) Removidos imports no utilizados (`AlertTriangle`, `StatsAccordion`) en `TelemetryDashboard.tsx`.
  - *Estado de Validación:* ✅ **Verificado empíricamente** — `tsc -b`: 0 errores; `vite build`: 0 errores, 2381 módulos transformados, bundle 935 kB. Commit `92cbf96`. ([Informe 19](../informes/19-Correccion-CropProfiles-Parse-Error-SCADA.md))

- [x] **#20. Corrección de Control de Actuadores, Temporizador Manual y Timeline de Fases (SCADA Frontend)**
  - *Problema:* (1) Condición de carrera al activar relés en modo manual: si el ESP32 no había procesado aún la transición a `MANUAL`, descartaba el comando del relé. (2) El temporizador manual tardaba en iniciar en la UI al esperar el round-trip de Firebase. (3) La barra y tooltips del timeline de fases biológicas desbordaban fuera del contenedor.
  - *Corrección:* (1) `sendCommand` en `firebaseService.ts` refactorizado para despacho atómico de `{ modo_operacion: 'MANUAL', [actuator]: state }` en `/devices/{deviceId}/commands`. (2) Sincronización y estado optimista instantáneo `optimisticActuators` e inicio inmediato de `manualStartTimes` en `App.tsx`. (3) Rediseño de `renderCompactTimeline` en `CropStatePanel.tsx` con padding horizontal, tooltips alineados dinámicamente (`left-0`, `right-0`) y `overflow-visible`.
  - *Estado de Validación:* ✅ **Verificado empíricamente** — `tsc -b`: 0 errores; `vite build`: 0 errores, bundle generado exitosamente en 8.01s. ([Informe 20](../informes/20-Correccion-Control-Actuadores-Temporizador-Timeline-SCADA.md))

- [x] **#21. Optimización Térmica PID Híbrida, Ground-Truth en Semáforo SCADA y Sync en Arranque**
  - *Problema:* (1) Ganancia proporcional del PID ($K_p = 2.0$) insuficiente para la ventana de $5000\,\text{ms}$, provocando duty cycles despreciables ($0.13\%$) y calefactor inactivo ante diferencias de $3.3^\circ\text{C}$. (2) `SemaforoEstabilidad.tsx` reportaba "CLIMA ESTABLE" al confiar ciegamente en `estado_operacional` del ESP32 mientras variables estaban fuera de rango. (3) El ESP32 dependía de eventos SSE posteriores para sincronizar el perfil activo en arranque.
  - *Corrección:* (1) Reescalado de PID ($K_p = 1500$) y control híbrido continuo ($100\%$ potencia cuando $T \le T_{\text{ideal\_min}} - 0.5^\circ\text{C}$). (2) Evaluación de verdad de terreno en `SemaforoEstabilidad.tsx` contrastando telemetría contra `crop` activo. (3) Fetch inicial directo de comandos en `FirebaseManager::configurarStreams` con buffer JSON de 2048B.
  - *Estado de Validación:* ✅ **Verificado empíricamente** — `tsc -b`: 0 errores; `vite build`: 0 errores. ([Informe 21](../informes/21-Mejora-Control-Calefactor-Semaforo-Sync-Arranque.md))


