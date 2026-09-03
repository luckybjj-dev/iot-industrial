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

- [x] **#22. Resolución de Stack Overflow en Stream Firebase, Estabilidad del Sistema y Renderizado TFT en ESP32**
  - *Problema:* (1) Reinicio cíclico a los ~3 segundos provocado por Stack Overflow y colisión de sockets TLS al encadenar múltiples `StaticJsonDocument` y llamadas flash en los callbacks de stream. (2) Pantalla TFT mostraba únicamente las líneas divisorias sin parámetros al reiniciarse antes del primer ciclo de renderizado de 5 segundos.
  - *Corrección:* (1) Eliminado `getJSON` síncrono en `configurarStreams`, delegado flujo al stream SSE nativo y optimizado el uso de memoria a Heap (`DynamicJsonDocument(1024)`) con `getConfiguracionActual()` en RAM. (2) Añadida lectura de sensores y llamada inmediata a `display.render()` en `setup()` de `main.cpp`.
  - *Estado de Validación:* ✅ **Verificado en Hardware Físico** — Firmware compilado y flasheado con éxito vía PlatformIO; pantalla TFT y telemetría funcionando de forma continua y estable. ([Informe 22](../informes/22-Resolucion-Stack-Overflow-Estabilidad-TFT-ESP32.md))

- [x] **#23. Implementación del Modo Standby / Monitoreo Determinista**
  - *Problema:* Al no haber perfil biológico seleccionado o detener un cultivo, el sistema operaba con setpoints residuales antiguos ejecutando acciones correctivas no deseadas.
  - *Corrección:* Creado el estado operacional `STANDBY / MONITOREO` con `standbyCrop` (setpoints en 0), apagado total de relés, y renderizado visual en semáforo SCADA con insignia Cyan *"Sensores en línea. Actuadores en reposo"*.
  - *Estado de Validación:* ✅ **Verificado en Hardware y SCADA** — Flasheado en COM9 y verificado en RTDB. ([Informe 24](../informes/24-Implementacion-Modo-Standby-Monitoreo-Edge-SCADA.md))

- [x] **#24. Optimización de Setpoints, Termogénesis de Sustrato (+3°C), Control Dinámico de VPD y Diagnóstico SCADA**
  - *Problema:* (1) Falso positivo de `CALENTANDO` por residuo de integral PID (`_pidOutput > 0`). (2) Umbrales de VPD fijos ($1.00 / 1.20\text{ kPa}$) en conflicto con recetas dinámicas. (3) Temperatura ideal de sustrato sin compensar el calor metabólico endógeno. (4) Desbordamiento visual de targets en tarjetas métricas.
  - *Corrección:* (1) Desacoplado `demandaCalor` a histéresis térmica pura en `HardwareController.cpp`. (2) Derivación en tiempo real de $VPD_{\text{máx}}$ según receta activa (`calcularVPD`). (3) Auto-cálculo de $T_{\text{sustrato}}^{\text{ideal}} = \text{promedio} + 3^\circ\text{C}$ en `CropProfiles.ts`. (4) Formateo compacto en `MetricCard.tsx` y semáforo inteligente multivariable en `SemaforoEstabilidad.tsx`.
  - *Estado de Validación:* ✅ **Verificado en Hardware Físico y SCADA** — Flasheado exitoso en COM9, `npm run build` con 0 errores y telemetría en vivo sincronizada en Firebase RTDB. ([Informe 25](../informes/25-Optimizacion-Setpoints-Sustrato-Termodinamico-VPD-Dinamico-SCADA.md))

- [x] **#25. Optimización de Reactividad SCADA, Heartbeat REST, Semáforo en Reposo y Contención de Timeline**
  - *Problema:* (1) Variables estáticas en el Dashboard por desconexión silenciosa del WebSocket de Firebase. (2) Cronómetro manual no iniciaba al pasar a `MANUAL`. (3) Botón STOP retenía el cultivo previo en UI. (4) Semáforo indicaba "Clima Estable" sin cultivo activo. (5) Inyección de recetas requería recarga (`F5`). (6) Desbordamiento de la barra de fases biológicas y tooltips.
  - *Corrección:* (1) Incorporado Heartbeat REST continuo en `firebaseService.ts`. (2) Inicialización inmediata de `manualStartTimes`. (3) Reseteo optimista de `planState` y `configs`. (4) Priorización de `MODO MONITOREO` en `SemaforoEstabilidad.tsx`. (5) Sincronización optimista en `handleSaveRules`. (6) Rediseño con `px-6 md:px-8`, tooltips inteligentes y `overflow-visible` en `CropStatePanel.tsx`. (7) Protocolo formal de No Regresión registrado.
  - *Estado de Validación:* ✅ **Verificado Empíricamente por el Usuario** — `npm run build` con 0 errores y validación en vivo aprobada. ([Informe 26](../informes/26-Optimizacion-Reactividad-Heartbeat-REST-Semaforo-Timeline-SCADA.md))

- [x] **#26. Despacho Quirúrgico por Subruta Hija de Actuadores y Versión Estable Certificada (`v1.0.0-stable`)**
  - *Problema:* (1) Envío compuesto de comandos a la raíz `/commands` vía `PATCH` causaba sobreescritura de relés y encendido múltiple simultáneo. (2) Caída transitoria del bus SPI/TFT por bloqueo síncrono TLS. (3) Conflicto de bloqueo en re-encendido de actuadores.
  - *Corrección:* (1) Despacho individual por subruta directa (`/commands/${actuator}.json`) en `firebaseService.ts`. (2) Inicialización limpia de actuadores en `false` al entrar a `MANUAL`. (3) Bypass determinista del filtro Anti-Short-Cycle en llamadas manuales directas (`ignorarFiltro = true`). (4) Actualización de `ALGORITMO_CONTROL_MICROCLIMA.md` a Revisión 3.3.0.
  - *Estado de Validación:* ✅ **Verificado Empíricamente en Hardware y SCADA** — Flasheado en COM9, `npm run build` con 0 errores y conmutación individual validada por el usuario. ([Informe 27](../informes/27-Informe-Oficial-Cierre-Sprint-Version-Estable-Microclima.md))

- [x] **#27. Armonía Visual, Diagnóstico Multivariable SCADA y Ticker Dinámico TFT ST7735**
  - *Problema:* (1) Calefactor SSR en modulación por pulsos mostraba `OFF` en gris en el botón mientras el semáforo decía `CALENTANDO (Calefactor ON)`. (2) Acciones simultáneas (frío + exceso de humedad) activaban el Extractor sin explicación en el semáforo. (3) Pantalla local TFT mostraba `CAL:OF` y `EXT:ON` sin contexto de diagnóstico.
  - *Corrección:* (1) Creada la `MATRIZ_CONFLICTOS_ACTUADORES_MICROCLIMA.md` formalizando los 6 escenarios de operación simultánea. (2) Semáforo inteligente que concatena causas multivariables (`CALENTANDO / DESHUMIDIFICANDO`). (3) Botón de Calefactor con insignia `PID ON` en ámbar y micro-etiquetas contextuales en actuadores. (4) Pantalla TFT con estados `PID`, `INH`, `OF` y Ticker dinámico rotativo cada 3 segundos en el firmware ESP32.
  - *Estado de Validación:* ✅ **Verificado Empíricamente por el Usuario en Hardware y Web** — Flasheado en COM9, `npm run build` con 0 errores y validación en vivo aprobada por el operador. ([Informe 28](../informes/28-Informe-Oficial-Armonia-Visual-Diagnostico-Multivariable-Ticker-TFT.md))

- [x] **#28. Hero Banner de Acceso Rápido, Auto-Selección y Resalto de Perfil Activo en Gestor SCADA**
  - *Problema:* Al abrir el Gestor de Perfiles, el operador debía buscar manualmente el cultivo activo entre decenas de especies, ya que abría por defecto en otra especie sin resaltar la receta en producción.
  - *Corrección:* (1) Detección y auto-selección inmediata ($O(1)$) del perfil y fase en ejecución (`activeProfileName`/`activePhaseName`). (2) Implementado Hero Banner superior con gradiente verde esmeralda y botón directo `Modificar Receta Activa`. (3) Resalto con marco brillante (`ring-2 ring-emerald-400`) y badge `🟢 ACTIVO` en la tarjeta del cultivo en curso.
  - *Estado de Validación:* ✅ **Verificado Empíricamente por el Usuario en SCADA** — `npm run build` con 0 errores y validación en vivo aprobada por el operador. ([Informe 29](../informes/29-Informe-Oficial-Hero-Banner-Auto-Seleccion-Perfil-Activo-SCADA.md))

- [x] **#29. Auditoría Integral, Persistencia de Setpoints de Suelo en LittleFS y Optimización Científica del Reino Plantae**
  - *Problema:* (1) En `FileManager.cpp`, `guardarConfiguracionJson` omitía parsear los campos `hum_suelo_ideal_min/max/crit_min`, perdiendo los setpoints de suelo ante reinicios del ESP32. (2) 10 perfiles Plantae en `CropProfiles.ts` carecían de metas de zona radicular y contenido volumétrico de agua (% VWC). (3) Log de runtime en `HardwareController.cpp` mantenía referencia obsoleta a MQTT. (4) `firebaseService.ts` repetía 12 veces la URL RTDB hardcodeada.
  - *Corrección:* (1) Implementado parseo atómico de suelo en LittleFS y removida línea duplicada en `FileManager.cpp`. (2) Investigación científica e integración exhaustiva de parámetros radiculares (14-24°C), % VWC, DLI, PPFD, EC y pH para las 10 especies Plantae. (3) Log corregido a `"Modo MANUAL activado por Dashboard / Firebase RTDB"`. (4) Centralizada `FIREBASE_RTDB_BASE_URL` en `firebaseService.ts`.
  - *Estado de Validación:* ✅ **Verificado en Compilación Dual (Tier 1)** — `pio run` (0 errores, RAM: 16.5%, Flash: 63.7%), `npm run build` (0 errores en 1.08s) y 100% de coherencia termodinámica en 21 perfiles. ([Informe 30](../informes/30-Informe-Oficial-Auditoria-Integral-Optimizacion-Plantae-Frutilla-Monterey.md))

