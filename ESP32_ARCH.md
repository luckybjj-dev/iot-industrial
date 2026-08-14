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
- **Sensores:** Lee DHT22 ×2 (redundancia dual) + NTC 10K (sustrato via ecuación Beta, β=3950).
- **Fusión Sensorial:** Si ambos DHTs válidos → promedio. Si uno falla → superviviente. Si ambos fallan → `tempPromedio = -999.0f`.
- **Filtro EWMA:** Media Móvil Exponencial (α=0.1) sobre temperatura, humedad, sustrato, VPD y CO2. Descarta 90% del ruido transitorio.
- **VPD:** Calculado con ecuación de Tetens: `SVP = 0.61078 × e^(17.27×T / (237.3+T))`.
- **PID Time-Proportioning:** Controlador PID (Kp=2.0, Ki=5.0, Kd=1.0) con ventana PWM de 5000 ms para el calefactor SSR.
- **Árbitro de Conflictos:**
  1. *P1 (Supervivencia):* `Temp > temp_crit_max` → Extractor ON, Calefactor/Fogger OFF.
  2. *P2 (Emergencia Sustrato):* `Sustrato > 28°C` → Extractor ON, Calefactor OFF.
  3. *P3 (Frío):* `Temp < temp_ideal_min` → Calefactor ON.
  4. *P4 (Normal):* Fogger, Extractor, Cooler en rangos `ideal_min/max`.
- **Anti-Short-Cycle:** 180s mínimo entre conmutaciones de Fogger y Extractor. Luz exenta (0s). Peltier exento (⚠️ deuda técnica).
- **Modos:** `enum class ModoOperacion { AUTO, MANUAL }`. Manual caduca a los 5 min con auto-reversión a AUTO.

### `NetworkManager` — Conectividad
- **WiFi STA:** Conexión al router con credenciales en NVS (`Preferences`).
- **Rescue AP:** Si WiFi falla >60s (12 reintentos × 5s), levanta `Fungi_Rescate_XXXX` automáticamente.
- **Portal Cautivo:** Página HTML en `PROGMEM` con tabs de Control Local y Configuración WiFi. Intercepta probes DNS de Android/iOS/Windows.
- **mDNS:** Accesible como `fungi.local`.

### `FirebaseManager` — Comunicación Cloud
- **Auth:** Email/Password vía REST (JWT tokens).
- **Telemetría Out:** Cada 5s a `/telemetry/{deviceId}/data` (JSON con sensores, actuadores, estado, modo).
- **Historial:** Cada 5 min push a `/history/{deviceId}` (retención 30 días).
- **Comandos In:** Stream SSE persistente en `/devices/{deviceId}/commands`. Parsea tanto JSON estructurado como primitivos booleanos directos.

### `FileManager` — Persistencia Offline
- **LittleFS:** Sistema de archivos no volátil en flash (partición 192 KB).
- **`config.json`:** Almacena `CropProfile` completo para operación 100% offline.
- **Cascada de Fallback:** Archivo corrupto/inexistente → regenera perfil Fungi seguro por defecto.
- **ArduinoJson:** Buffers de 4096 bytes (`DynamicJsonDocument`) con operador coalescente `|` para campos faltantes.

### `DisplayManager` — HMI Local
- **Hardware:** TFT ST7735 (160×128 px, Landscape) vía SPI (CS:5, DC:14, RST:13).
- **Renderizado:** Cada 5s muestra temperatura, humedad, VPD, estado operacional y conexión WiFi/Firebase.
- **Anti-Flicker:** `fillScreen(BLACK)` por ciclo (⚠️ deuda técnica: falta dirty checking con sprites).

## 4. Flujo de Ciclo (Tick) — Cada 5000 ms

```
1. Leer Sensores (DHT22×2, NTC)
   ↓
2. Fusión Sensorial (promedio o fallback)
   ↓
3. Filtro EWMA (suavizado α=0.1)
   ↓
4. Calcular VPD (Tetens)
   ↓
5. Evaluar Árbitro de Conflictos (P1→P4)
   ↓
6. Aplicar PID al Calefactor (Time-Proportioning)
   ↓
7. Verificar Anti-Short-Cycle (180s mínimo)
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
    SAFE_MODE,       // Fallo total de sensores — actuadores OFF
    EMERGENCIA       // Temperatura crítica o emergencia sustrato
};
```

## 7. Deuda Técnica Conocida

| Problema | Severidad | Referencia |
| :--- | :---: | :--- |
| Safe Mode inalcanzable (EWMA congela temp) | 🔴 | `HardwareController.cpp:167,247` |
| PID degrada a On/Off (ventana = intervalo) | 🟡 | `HardwareController.cpp:264` + `main.cpp:70` |
| Conflicto Extractor ↔ Fogger sin exclusión | 🟡 | `HardwareController.cpp:291-311` |
| Peltier sin anti-short-cycle | 🟡 | `HardwareController.cpp:333` |
| ADC sin calibración (±1.5-3°C NTC) | 🟡 | `HardwareController.cpp:114-119` |
| `DynamicJsonDocument` fragmenta heap | 🟡 | `FirebaseManager.cpp:285` |

> 📄 Ver auditoría completa: [`docs/AUDITORIA_INTEGRAL_V3_2026-08-14.md`](docs/AUDITORIA_INTEGRAL_V3_2026-08-14.md)
