# Documentación Core: Arquitectura Firmware ESP32 (Agnostic Engine)

> **Última actualización:** 14 de Agosto de 2026 (Post-Auditoría V3)  
> **Esquema de particiones:** `min_spiffs.csv` | Flash utilizado: 91.6% (~1.8 MiB / 1.96 MiB)

## 1. Filosofía del Diseño

El ESP32 opera como un **PLC Determinista Agnóstico (Stateless PLC)**:

- **Agnóstico:** No contiene clases como `Fungi` o `Planta`. No sabe qué cultiva.
- **Declarativo:** Recibe un `CropProfile` JSON desde Firebase con setpoints numéricos (`temp_ideal_min/max`, `hum_ideal_min/max`, `co2_ideal_min/max`, `light_hours_on`, `temp_sustrato_ideal`).
- **Determinista:** El Árbitro de Conflictos resuelve colisiones entre actuadores con prioridades fijas. Los failsafes físicos en C++ prevalecen sobre cualquier comando cloud.
- **Resiliente:** Si Firebase o WiFi caen, el sistema continúa operando con la última configuración almacenada en LittleFS (`config.json`).

## 2. Concurrencia Dual-Core (FreeRTOS)

```
┌─────────────────────────────────────────────────────────┐
│ Core 1 (APP_CPU) — Arduino loop() [No bloqueante]       │
│                                                         │
│  main.cpp (Orquestador, 87 líneas)                     │
│    ├── HardwareController  → Sensores + PID + Árbitro  │
│    ├── FirebaseManager     → Auth + Streams SSE + Push │
│    ├── FileManager         → LittleFS config.json      │
│    └── DisplayManager      → TFT ST7735 160×128 SPI   │
│                                                         │
│  Ciclo cada 5000 ms (INTERVALO_CICLO)                  │
│  Zero delay() — toda temporización por millis()         │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ Core 1 — FreeRTOS Task (tareaRed)                       │
│                                                         │
│  NetworkManager                                         │
│    ├── WiFi STA (conexión a router)                    │
│    ├── SoftAP Rescue (Fungi_Rescate_XXXX)              │
│    ├── Portal Cautivo Asíncrono (ESPAsyncWebServer)    │
│    ├── DNSServer (wildcard redirect)                   │
│    ├── mDNS (fungi.local)                              │
│    └── ArduinoOTA                                      │
│                                                         │
│  Nota: El stack WiFi de Espressif usa Core 0            │
│  internamente. La tarea de red fue movida a Core 1      │
│  en Sprint 12 para resolver race conditions.            │
└─────────────────────────────────────────────────────────┘
```

## 3. Módulos del Sistema

### `main.cpp` — Orquestador
- Loop no bloqueante de 87 líneas.
- Ejecuta secuencialmente: `leerSensores()` → `procesarLogicaDeControl()` → `render()` → `publicarTelemetria()`.
- La telemetría se publica **siempre que haya conexión**; si no, el control continúa offline.
- Inicializa OTA con password protegido.

### `HardwareController` — Cerebro del Control
- **Sensores:** Lee DHT22 ×2 (redundancia dual) + NTC 10K (sustrato via ecuación Beta, β=3950) + Sensirion SCD30 I2C (CO2 NDIR).
- **Fusión Sensorial:** Si ambos DHTs válidos → promedio. Si uno falla → superviviente. Si ambos fallan → `tempPromedio = -999.0f`.
- **Filtro EWMA:** Media Móvil Exponencial (α=0.1) sobre temperatura, humedad, sustrato, VPD y CO2. Descarta 90% del ruido transitorio.
- **VPD y Microclima Dinámico:** Calculado con ecuación de Tetens. Los umbrales de activación de niebla se derivan dinámicamente de la receta activa (`calcularVPD(temp_ideal_max, hum_ideal_min)`).
- **PID Time-Proportioning:** Modulación PWM por software para calefactor SSR desacoplada en tick rápido (`actualizarModulacionSSR(millis())`) con ventana de 5000 ms e histéresis estricta para la máquina de estados.
- **Árbitro de Conflictos:**
  1. *P1 (Supervivencia):* `Temp > temp_crit_max` ó `Sustrato >= maxSustratoCrit` (32°C) → Extractor/Cooler ON, Calefactor/Fogger OFF.
  2. *P2 (Modo Standby):* Sin receta activa → `STANDBY / MONITOREO` (relés en reposo total, sensores activos).
  3. *P3 (Frío/Calor):* `Temp < temp_ideal_min` → Calefactor ON con modulación SSR.
  4. *P4 (Normal/Hídrico):* Fogger y Extractor gobernados por humedad y VPD dinámico con interlock de exclusión mutua (Extractor bloquea Fogger).
- **Anti-Short-Cycle:** 180s mínimo entre conmutaciones de Fogger, Extractor y Celda Peltier. Luz exenta (0s).
- **Modos:** `enum class ModoOperacion { AUTO, MANUAL }`. Manual caduca a los 5 min con auto-reversión a AUTO.

### `NetworkManager` — Conectividad
- **WiFi STA:** Conexión al router con credenciales en NVS (`Preferences`).
- **Rescue AP:** Si WiFi falla >60s (12 reintentos × 5s), levanta `Fungi_Rescate_XXXX` automáticamente.
- **Portal Cautivo:** Página HTML en `PROGMEM` con tabs de Control Local y Configuración WiFi. Intercepta probes DNS de Android/iOS/Windows.
- **mDNS:** Accesible como `fungi.local`.

### `FirebaseManager` — Comunicación Cloud
- **Auth:** Email/Password vía REST (JWT tokens).
- **Telemetría Out:** Cada 5s a `/telemetry/{deviceId}/data` (JSON con sensores, actuadores, estado, modo).
- **Historial:** Cada 5 min push a `/history/{deviceId}` (retención 30 días con Timestamp UNIX nativo vía NTP).
- **Comandos In:** Stream SSE persistente en `/devices/{deviceId}/commands`. Parsea tanto JSON estructurado como primitivos booleanos directos.

### `FileManager` — Persistencia Offline
- **LittleFS:** Sistema de archivos no volátil en flash (partición 192 KB).
- **`config.json`:** Almacena `CropProfile` completo para operación 100% offline.
- **Cascada de Fallback:** Archivo corrupto/inexistente → regenera perfil Fungi seguro por defecto.
- **ArduinoJson:** Estructuras en stack (`StaticJsonDocument`) con operador coalescente `|` para campos faltantes (cero fragmentación en heap).

### `DisplayManager` — HMI Local
- **Hardware:** TFT ST7735 (160×128 px, Landscape) vía SPI (CS:5, DC:14, RST:13).
- **Renderizado:** Cada 5s muestra temperatura, humedad, VPD, estado operacional y conexión WiFi/Firebase.
- **Anti-Flicker:** `fillScreen(BLACK)` por ciclo (⚠️ deuda técnica pendiente: dirty checking con sprites).

## 4. Flujo de Ciclo (Tick) — Cada 5000 ms

```
1. Leer Sensores (DHT22×2, NTC)
   ↓
2. Fusión Sensorial (promedio o fallback; -999.0f fuerza SAFE_MODE inmediato)
   ↓
3. Filtro EWMA (suavizado α=0.1 con bypass en Safe Mode)
   ↓
4. Calcular VPD (Tetens)
   ↓
5. Evaluar Árbitro de Conflictos (P1→P4 con Interlock Extractor/Fogger)
   ↓
6. Aplicar PID al Calefactor (Time-Proportioning de alta frecuencia)
   ↓
7. Verificar Anti-Short-Cycle (180s mínimo en Fogger, Extractor y Peltier)
   ↓
8. Conmutar Relés Físicos
   ↓
9. Renderizar TFT (si corresponde)
   ↓
10. Publicar Telemetría a Firebase (si conectado)
   ↓
11. Repetir
```

## 5. CropProfile (Modelo de Datos)

```cpp
struct CropProfile {
    String kingdom;          // "FUNGI" o "PLANTAE"
    float temp_ideal_min;    // Setpoint inferior temperatura (°C)
    float temp_ideal_max;    // Setpoint superior temperatura (°C)
    float temp_crit_max;     // Umbral de emergencia térmica (°C)
    float hum_ideal_min;     // Setpoint inferior humedad (%)
    float hum_ideal_max;     // Setpoint superior humedad (%)
    float co2_ideal_min;     // Setpoint inferior CO2 (ppm)
    float co2_ideal_max;     // Setpoint superior CO2 (ppm)
    float co2_crit_max;      // Umbral de emergencia CO2 (ppm)
    float light_hours_on;    // Fotoperiodo (horas de luz)
    float temp_sustrato_ideal; // Objetivo sustrato NTC (°C)
    unsigned long watchdog_timeout_ms; // Timeout watchdog (ms)
};
```

## 6. Estados Operacionales

```cpp
enum class EstadoOperacional {
    NORMAL,          // Todos los parámetros en rango ideal
    CALENTANDO,      // Calefactor activo (temp < ideal_min)
    ENFRIANDO,       // Extractor/Peltier activo (temp > ideal_max)
    HUMIDIFICANDO,   // Fogger activo (hum < ideal_min)
    SAFE_MODE,       // Fallo total de sensores — actuadores térmicos/hídricos OFF
    EMERGENCIA       // Temperatura crítica o emergencia sustrato
};
```

## 7. Matriz de Deuda Técnica y Estado Post-Auditoría V3

| Problema | Severidad | Estado | Resolución / Acción |
| :--- | :---: | :---: | :--- |
| Safe Mode inalcanzable (EWMA congelaba temp) | 🔴 | ✅ Resuelto | `HardwareController.cpp`: `-999.0f` resetea EWMA y apaga actuadores. |
| Watchdog de hardware inactivo | 🔴 | ✅ Resuelto | `main.cpp`: `esp_task_wdt` inicializado y alimentado en loop. |
| PID degradaba a On/Off binario | 🟡 | ✅ Resuelto | Modulación Time-Proportioning evaluada en tick rápido de loop. |
| Conflicto Extractor ↔ Fogger simultáneo | 🟡 | ✅ Resuelto | Interlock de exclusión mutua en Árbitro de Conflictos. |
| Celda Peltier sin protección anti-cycling | 🟡 | ✅ Resuelto | Anti-Short-Cycle de 180s aplicado en `_ejecutarAccion`. |
| Fragmentación de memoria por `DynamicJson` | 🟡 | ✅ Resuelto | Migrado a `StaticJsonDocument` en Stack/BSS. |
| Fallo en actualización OTA por Heap/TLS | 🟡 | ✅ Resuelto | `FirebaseManager::end()` ejecutado en `ArduinoOTA.onStart()`. |
| Validación termodinámica en perfiles | 🟡 | ✅ Resuelto | Motor `validateThermodynamics()` y guards en SCADA React (Informe 76). |
| Calibración ADC + Multisampling (NTC) | 🟡 | ⏳ Pendiente | Integración `esp_adc_cal` (Sprint 3 / Q4 2026). |
| Integración sensor CO2 NDIR real | 🟡 | ⏳ Pendiente | SCD30/MH-Z19 por I2C/UART (Sprint 3 / Q4 2026). |
| Renderizado TFT Anti-Flicker + Arranque Inmediato | 🟢 | ✅ Resuelto | `main.cpp` / `DisplayManager.cpp`: Renderizado en `setup()` y refresco por texto sin parpadeo (Informe 22). |
| Purgar `Secrets.h` del historial Git | 🔴 | ⏳ Pendiente | Rotación de claves y reescritura de commits pasados. |

> 📄 Registro detallado de seguimiento: [`docs/CHECKLIST_CORRECCIONES_DEUDA_TECNICA.md`](docs/CHECKLIST_CORRECCIONES_DEUDA_TECNICA.md) | [Auditoría Integral V3](docs/AUDITORIA_INTEGRAL_V3_2026-08-14.md)
