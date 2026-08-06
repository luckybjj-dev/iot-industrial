# Auditoría Técnica y Estratégica Completa — AgriEdge OS
**Fecha:** 6 de agosto de 2026  
**Rol del Auditor:** Arquitecto de Software Senior — Sistemas Embebidos IoT / DevOps / Lean Startup  
**Fuentes auditadas:** 12 archivos C++ (`edge_esp32/src/`), `platformio.ini`, `.gitignore`, `cultivo.ts`, `App.tsx`, `firebaseService.ts`, `README.md`, y 61 documentos de sprint (`informes/`)  

---

## 1. 📊 ESTADO EJECUTIVO DEL PROYECTO

### Semáforo de Salud General: 🟡 En Riesgo

**Justificación con evidencia directa del código:**

| Indicador | Estado | Evidencia |
|---|---|---|
| Arquitectura OOP | ✅ Sólida | `main.cpp` 195 líneas. 5 módulos con dependencias unidireccionales. |
| Telemetría unidireccional | ✅ Funcional | `publicarTelemetria()` y `publicarHistorial()` operativos en [FirebaseManager.cpp:66-162](file:///C:/Users/lagos/OneDrive/Desktop/ESP32Proyecto%20-%20Industrial/Node-monitor-iot-backend/proyecto_iot-code-workspace/edge_esp32/src/FirebaseManager.cpp#L66-L162) |
| Motor PLC de 3 Capas | ✅ Implementado | [HardwareController.cpp:125-211](file:///C:/Users/lagos/OneDrive/Desktop/ESP32Proyecto%20-%20Industrial/Node-monitor-iot-backend/proyecto_iot-code-workspace/edge_esp32/src/HardwareController.cpp#L125-L211) — Árbitro funcional con jerarquía de supervivencia |
| Control bidireccional (Relés vía Firebase) | 🔴 Nunca validado | El usuario reportó que el modo MANUAL se revierte y los relés no responden. Sesión 5/8 cerrada sin resolución. |
| Seguridad de credenciales | 🔴 Comprometida | `Secrets.h` **NO está en `.gitignore`** (hallazgo verificado en esta auditoría) |
| Commits regulares | 🔴 Ausente | Última sesión cerrada sin commit. Sin red de seguridad. |

### Sprint Actual Estimado

**Sprint 12-13** (según los 61 informes archivados). **Completitud del MVP: ~65%.**

Los módulos funcionales son: telemetría (ESP32→Firebase→React), Portal Cautivo WiFi, OTA por cable/aire, TFT Display local, motor PLC determinista con CropProfile. Los módulos **no validados en hardware real**: control bidireccional confiable (MANUAL + relés desde React), fotoperiodo NTP end-to-end, CropProfile inyectado desde React al ESP32 end-to-end.

### Logros Verificados Directamente en el Código

1. **Arquitectura Modular OOP** — [main.cpp](file:///C:/Users/lagos/OneDrive/Desktop/ESP32Proyecto%20-%20Industrial/Node-monitor-iot-backend/proyecto_iot-code-workspace/edge_esp32/src/main.cpp) orquesta 5 módulos sin variables globales.
2. **Motor PLC de 3 Capas** — Árbitro de conflictos jerarquizado: Emergencia térmica > Gases/CO2 > Frío > Humedad > Fotoperiodo.
3. **Portal Cautivo Asíncrono** — [NetworkManager.cpp:27-137](file:///C:/Users/lagos/OneDrive/Desktop/ESP32Proyecto%20-%20Industrial/Node-monitor-iot-backend/proyecto_iot-code-workspace/edge_esp32/src/NetworkManager.cpp#L27-L137) con HTML embebido, DNS Sinker, y Fallback AP a los 60s.
4. **CropProfile en LittleFS con migración automática** — [FileManager.cpp:44-48](file:///C:/Users/lagos/OneDrive/Desktop/ESP32Proyecto%20-%20Industrial/Node-monitor-iot-backend/proyecto_iot-code-workspace/edge_esp32/src/FileManager.cpp#L44-L48) detecta formato antiguo (`reglas`) y fuerza "Día Cero".
5. **Filtro Anti-Short-Cycle** — `MIN_RELAY_TIME_MS = 180000` hardcoded en [HardwareController.h:128](file:///C:/Users/lagos/OneDrive/Desktop/ESP32Proyecto%20-%20Industrial/Node-monitor-iot-backend/proyecto_iot-code-workspace/edge_esp32/src/HardwareController.h#L128).
6. **Panel de diagnóstico local HTTP** — API REST `/api/status` y `/api/control` en [NetworkManager.cpp:354-407](file:///C:/Users/lagos/OneDrive/Desktop/ESP32Proyecto%20-%20Industrial/Node-monitor-iot-backend/proyecto_iot-code-workspace/edge_esp32/src/NetworkManager.cpp#L354-L407).

### Resumen en 5 Líneas

El proyecto tiene la mejor base arquitectónica de firmware de su historia. La migración del Motor de Reglas al CropProfile PLC está completada en código C++ y parcialmente en React/TypeScript. El problema crónico y bloqueante es el control bidireccional: el ESP32 no ejecuta comandos de relé enviados desde Firebase de forma confiable. El hallazgo de seguridad más grave de esta auditoría es que `Secrets.h` (con API Key, URL, email y password de Firebase) **no está en el `.gitignore`** y probablemente fue commiteado al repositorio público. No hay commits regulares al cerrar sesión, exponiendo todo el trabajo a pérdida total.

---

## 2. 🏗️ AUDITORÍA DE ARQUITECTURA

### Diagrama de Componentes

```mermaid
graph TD
    subgraph "ESP32 — Edge Node"
        MAIN["main.cpp<br/>Orquestador 195L"]
        HC["HardwareController<br/>Sensores + PLC 3 Capas"]
        FM["FileManager<br/>LittleFS config.json"]
        FB["FirebaseManager<br/>RTDB Telemetry + Stream"]
        DM["DisplayManager<br/>TFT ST7735 HMI"]
        NM["NetworkManager<br/>WiFi + Portal + OTA + NTP + API REST"]
    end

    subgraph "Firebase RTDB"
        TEL[("/telemetry/{id}/data")]
        HIS[("/history/{id}")]
        CMD[("/devices/{id}/commands")]
        CFG[("/devices/{id}/config")]
    end

    subgraph "React + Vite Frontend"
        APP["App.tsx"]
        SVC["firebaseService.ts"]
        CROP["CropProfileEditorModal"]
        DASH["TelemetryDashboard"]
    end

    MAIN --> HC
    MAIN --> FM
    MAIN --> FB
    MAIN --> DM
    MAIN --> NM

    HC -.->|"lee config"| FM
    FB -->|"lee sensores/actuadores"| HC
    FB -->|"guarda config"| FM
    DM -->|"const& lectura"| HC
    DM -->|"const& lectura"| NM
    DM -->|"const& lectura"| FB
    NM -->|"API local /api/control"| HC

    FB -->|"setJSON"| TEL
    FB -->|"pushJSON"| HIS
    FB <-->|"beginStream"| CMD

    APP <--> SVC
    SVC <-->|"onValue / update"| TEL
    SVC -->|"update"| CMD
    SVC -->|"update"| CFG
    APP --> CROP
    APP --> DASH
```

### Evaluación de la Modularidad (SRP — Principio de Responsabilidad Única)

| Módulo | Responsabilidades Actuales | SRP | Veredicto |
|---|---|---|---|
| [main.cpp](file:///C:/Users/lagos/OneDrive/Desktop/ESP32Proyecto%20-%20Industrial/Node-monitor-iot-backend/proyecto_iot-code-workspace/edge_esp32/src/main.cpp) | Instanciación + timers + loop | ✅ | Impecable. Minimalista. |
| [HardwareController](file:///C:/Users/lagos/OneDrive/Desktop/ESP32Proyecto%20-%20Industrial/Node-monitor-iot-backend/proyecto_iot-code-workspace/edge_esp32/src/HardwareController.cpp) | Lectura sensores + cálculo VPD + máquina de estados PLC + filtro de relés + setters manuales | ⚠️ | 3 responsabilidades en una clase. Aceptable en embedded pero debería dividirse en `SensorReader`, `ControlEngine`, y `RelayDriver` para testability. |
| [FileManager](file:///C:/Users/lagos/OneDrive/Desktop/ESP32Proyecto%20-%20Industrial/Node-monitor-iot-backend/proyecto_iot-code-workspace/edge_esp32/src/FileManager.cpp) | LittleFS + JSON serialización | ✅ | Una sola responsabilidad. Limpio. |
| [FirebaseManager](file:///C:/Users/lagos/OneDrive/Desktop/ESP32Proyecto%20-%20Industrial/Node-monitor-iot-backend/proyecto_iot-code-workspace/edge_esp32/src/FirebaseManager.cpp) | Auth + telemetría + historial + stream + parsing de comandos + lógica de negocio | ⚠️ | `_procesarPayloadStream` (líneas 204-264) mezcla parsing de protocolo con ejecución de comandos de hardware. Debería delegar a un `CommandProcessor`. |
| [NetworkManager](file:///C:/Users/lagos/OneDrive/Desktop/ESP32Proyecto%20-%20Industrial/Node-monitor-iot-backend/proyecto_iot-code-workspace/edge_esp32/src/NetworkManager.cpp) | WiFi STA + AP Fallback + Portal Cautivo + DNS Sinker + HTML embebido + API REST local + OTA + NTP + mDNS + FreeRTOS task | ❌ | **"God Object" emergente.** 438 líneas con 7+ responsabilidades. El HTML incrustado ocupa PROGMEM innecesariamente si crece. La API REST local (`/api/status`, `/api/control`) debería estar en un módulo separado (`LocalWebServer`). |
| [DisplayManager](file:///C:/Users/lagos/OneDrive/Desktop/ESP32Proyecto%20-%20Industrial/Node-monitor-iot-backend/proyecto_iot-code-workspace/edge_esp32/src/DisplayManager.cpp) | Render TFT puro | ✅ | Solo lectura via `const&`. Perfecto. |

### Evaluación del Motor Agnóstico (CropProfile)

**¿Desacopla realmente las reglas del firmware?** SÍ. Verificado en código:

- [FileManager.h:31-46](file:///C:/Users/lagos/OneDrive/Desktop/ESP32Proyecto%20-%20Industrial/Node-monitor-iot-backend/proyecto_iot-code-workspace/edge_esp32/src/FileManager.h#L31-L46) define `struct CropProfile` con setpoints puros (sin lógica).
- [HardwareController.cpp:148-197](file:///C:/Users/lagos/OneDrive/Desktop/ESP32Proyecto%20-%20Industrial/Node-monitor-iot-backend/proyecto_iot-code-workspace/edge_esp32/src/HardwareController.cpp#L148-L197) consume `_config.crop.*` directamente.
- El código C++ **no contiene** las palabras "fungi", "tomate", ni "oyster" en la lógica de control. Solo en los defaults de `_crearConfiguracionPorDefecto()`.

**¿Funciona para múltiples perfiles?** El mecanismo existe. El enum `crop_profile` en config permite "Fungi_Fruiting_v1" u otro nombre. Pero no hay selector de perfiles dinámico en el firmware — solo el default hardcoded y lo que envía Firebase.

### Evaluación del Modo AUTO/MANUAL

**Implementado en firmware (código presente, no validado empíricamente):**

- [HardwareController.cpp:28-36](file:///C:/Users/lagos/OneDrive/Desktop/ESP32Proyecto%20-%20Industrial/Node-monitor-iot-backend/proyecto_iot-code-workspace/edge_esp32/src/HardwareController.cpp#L28-L36) — `setModoOperacion()` guarda timestamp y muestra log serial.
- [HardwareController.cpp:130-143](file:///C:/Users/lagos/OneDrive/Desktop/ESP32Proyecto%20-%20Industrial/Node-monitor-iot-backend/proyecto_iot-code-workspace/edge_esp32/src/HardwareController.cpp#L130-L143) — Timer de caducidad con protección de underflow (`if timeout < 60000 → 300000`).
- [HardwareController.cpp:39-68](file:///C:/Users/lagos/OneDrive/Desktop/ESP32Proyecto%20-%20Industrial/Node-monitor-iot-backend/proyecto_iot-code-workspace/edge_esp32/src/HardwareController.cpp#L39-L68) — Setters manuales rechazan comandos si está en AUTO.

**¿Qué falta?** El problema no está en la lógica de `HardwareController`, sino en la **cadena de entrega del comando**: React → Firebase → `streamCallback` → `_procesarPayloadStream` → `setModoOperacion` / `setLight`. El streaming nunca ha sido validado end-to-end con monitor serial conectado durante la recepción del payload.

### Evaluación del Failsafe / Edge Computing

**¿Puede operar autónomamente sin WiFi?** SÍ, con una salvedad.

| Capacidad | Estado | Evidencia |
|---|---|---|
| Control PLC sin WiFi | ✅ | `hw.procesarLogicaDeControl()` se ejecuta en `loop()` sin importar `net.estaConectado()` |
| Configuración persistente | ✅ | LittleFS persiste `config.json` en flash sin red |
| Portal de rescate | ✅ | `Fungi_Rescate_XX` AP se levanta tras 60s offline |
| Fotoperiodo sin NTP | ⚠️ | `net.getHoraInt()` devuelve `-1` → la luz se apaga permanentemente |
| Panel local sin red | ✅ | `/api/status` funciona en modo AP |

---

## 3. 💾 AUDITORÍA DE MEMORIA Y RENDIMIENTO

### Flash — Respuesta Definitiva Sobre OTA

**Hallazgo clave de `platformio.ini`:**
```ini
board_build.partitions = min_spiffs.csv
```

La tabla `min_spiffs.csv` del framework ESP32 distribuye así los 4MB de flash:

| Partición | Tamaño |
|---|---|
| `app0` (firmware actual) | **1.9MB** |
| `app1` (firmware OTA) | **1.9MB** |
| `spiffs` (LittleFS) | **128KB** |

**Veredicto:** Con ~92% de uso reportado, el firmware ocupa aproximadamente **1.75MB de 1.9MB**. Esto deja **~150KB de margen** para OTA. Es apretado pero técnicamente viable hoy. Si el firmware crece ~8%, **OTA dejará de funcionar**.

> [!WARNING]
> La tabla `min_spiffs.csv` es la correcta para este proyecto (maximiza espacio de firmware). No cambiar. El riesgo se mitiga optimizando librerías, no cambiando particiones.

### RAM — Análisis de Riesgo

| Consumidor | RAM Estimada | Tipo |
|---|---|---|
| Firebase SDK (SSL/mbedTLS) | ~40KB | Heap dinámico |
| AsyncWebServer + sockets | ~8KB | Heap dinámico |
| FreeRTOS task `tareaRed` | 8KB | Stack estático (asignado en `xTaskCreatePinnedToCore`) |
| `DynamicJsonDocument(2048)` × 2 | ~4KB pico | Heap dinámico |
| `DynamicJsonDocument(1024)` × 1 | ~1KB pico | Heap dinámico |
| TFT framebuffer (Adafruit) | ~2KB | Heap estático |
| Strings en RAM (`String` objects) | Variable | Heap dinámico — **riesgo de fragmentación** |

**ESP32 tiene ~320KB RAM total, ~180KB disponible para la app.** Uso estimado: ~63KB reservados + ~30-40KB dinámicos pico = **~100KB**. Hay margen, pero la fragmentación por uso intensivo de `String` de Arduino (presente en todas las clases) es el riesgo real a mediano plazo.

### Problema OTA — Diagnóstico Causa Raíz

El OTA llega al 100% pero falla al confirmar. Análisis del código en [main.cpp:149-156](file:///C:/Users/lagos/OneDrive/Desktop/ESP32Proyecto%20-%20Industrial/Node-monitor-iot-backend/proyecto_iot-code-workspace/edge_esp32/src/main.cpp#L149-L156):

```cpp
ArduinoOTA.setHostname(deviceId.c_str());
ArduinoOTA.begin();
// ... más adelante en el loop:
ArduinoOTA.handle();
```

**No hay callbacks configurados.** Sin `ArduinoOTA.onStart()`, `onEnd()`, `onProgress()`, ni `onError()`. Esto significa:

1. **Durante el flash**, Firebase sigue ejecutando `firebase.loop()` y `Firebase.setJSON()` con handshakes SSL pesados. Esto compite por CPU y heap con el escritor de flash OTA.
2. **El WDT del ESP32** puede dispararse si un `setJSON` tarda >15s durante el flash.
3. **No hay cierre limpio** de los streams de Firebase antes del flash — el SDK puede quedar en estado inconsistente.

**Causa raíz probable:** Firebase compite por heap/CPU durante el OTA. La solución es trivial: agregar `ArduinoOTA.onStart([]() { Firebase.end(); })`.

### Recomendaciones Concretas de Optimización

1. **Callbacks OTA:** Agregar `onStart` para desconectar Firebase, `onError` para logging.
2. **`StaticJsonDocument`:** Reemplazar `DynamicJsonDocument` por `StaticJsonDocument` en `_procesarPayloadStream` (el tamaño es conocido a compile-time).
3. **Reducir `String` dinámicos:** `_procesarPayloadStream` usa `val.replace()` y `val.trim()` que generan copias en heap. Usar `char[]` fijos donde sea posible.
4. **`F()` macro:** Ya está bien aplicada en la mayoría de `Serial.println`. ✅

---

## 4. 🧪 AUDITORÍA DE SENSORES Y ACTUADORES

### DHT22

**¿Lectura robusta?** SÍ. Verificado en [HardwareController.cpp:70-82](file:///C:/Users/lagos/OneDrive/Desktop/ESP32Proyecto%20-%20Industrial/Node-monitor-iot-backend/proyecto_iot-code-workspace/edge_esp32/src/HardwareController.cpp#L70-L82):

```cpp
float t = _dht.readTemperature();
float h = _dht.readHumidity();
if (isnan(t) || isnan(h)) {
    _sensores.dhtOk = false;
```

✅ Manejo correcto de `isnan()`. El flag `dhtOk` se propaga a telemetría (`json.set("dht_ok", s.dhtOk)` en FirebaseManager) y al TFT (texto "Error" en rojo).

**Riesgo menor:** No hay promediado (rolling average). Una lectura espuria del DHT22 (error conocido de la librería) se propaga directamente al PLC. Para un MVP es aceptable; para producto comercial, agregar media móvil de 3 lecturas.

### NTC / Termistor

**¿Fórmula correcta?** Verificado en [HardwareController.cpp:84-92](file:///C:/Users/lagos/OneDrive/Desktop/ESP32Proyecto%20-%20Industrial/Node-monitor-iot-backend/proyecto_iot-code-workspace/edge_esp32/src/HardwareController.cpp#L84-L92):

```cpp
float resistencia = NTC_R_SERIE / (4095.0f / (float)valorADC - 1.0f);
float tempK = 1.0f / (1.0f/(NTC_T_NOMINAL+273.15f) + (1.0f/NTC_BETA)*log(resistencia/NTC_R_NOMINAL));
_sensores.valorAnalogico = tempK - 273.15f;
```

Esto es la **ecuación Beta simplificada** (forma correcta de Steinhart-Hart de un parámetro). Matemáticamente válida.

**Parámetros del termistor** ([HardwareController.h:27-30](file:///C:/Users/lagos/OneDrive/Desktop/ESP32Proyecto%20-%20Industrial/Node-monitor-iot-backend/proyecto_iot-code-workspace/edge_esp32/src/HardwareController.h#L27-L30)):
- `NTC_BETA = 3950` — Valor estándar para NTC 10K B3950. ✅
- `NTC_R_NOMINAL = 10000` — Correcto para NTC 10K. ✅
- `NTC_T_NOMINAL = 25.0` — Temperatura de referencia estándar. ✅
- `NTC_R_SERIE = 10000` — Resistencia pull-up. ✅

**Problemas detectados:**

1. **Sin calibración ADC.** El ADC del ESP32 tiene no-linealidad de ±6% documentada por Espressif. Sin `esp_adc_cal_characterize()`, el error puede ser de 1-2°C en el rango 18-28°C. Para un termostato que decide encender un calefactor, esto es significativo.

2. **Sin filtro de rango lógico.** Si `valorADC` es 50 (ruido), la fórmula calcula ~200°C. El guard `valorADC > 0 && valorADC < 4095` protege los extremos de saturación, pero no protege contra ruido.

3. **Unidad `U` en TFT.** [DisplayManager.cpp:107](file:///C:/Users/lagos/OneDrive/Desktop/ESP32Proyecto%20-%20Industrial/Node-monitor-iot-backend/proyecto_iot-code-workspace/edge_esp32/src/DisplayManager.cpp#L107): `_tft.println(F(" U"))` debería ser `" °C"`.

### Relés — ¿Histéresis Implementada?

> [!IMPORTANT]
> **NO.** Hay **anti-short-cycle** (tiempo mínimo entre cambios), pero **no hay histéresis termodinámica** (banda muerta entre umbrales ON y OFF).

**Evidencia en código:**

El Anti-Short-Cycle en [HardwareController.cpp:104-122](file:///C:/Users/lagos/OneDrive/Desktop/ESP32Proyecto%20-%20Industrial/Node-monitor-iot-backend/proyecto_iot-code-workspace/edge_esp32/src/HardwareController.cpp#L104-L122):
```cpp
if (now - ultimoCambio < MIN_RELAY_TIME_MS && ultimoCambio != 0) {
    return; // Rechaza el cambio si no han pasado 3 minutos
}
```
Esto protege al relé **físicamente** (no lo fríe). ✅

Pero la evaluación del PLC en [HardwareController.cpp:176-182](file:///C:/Users/lagos/OneDrive/Desktop/ESP32Proyecto%20-%20Industrial/Node-monitor-iot-backend/proyecto_iot-code-workspace/edge_esp32/src/HardwareController.cpp#L176-L182):
```cpp
else if (tempActual <= _config.crop.temp_ideal_min) {
    req_heater = true;  // ON si temp ≤ 18
}
else if (tempActual >= _config.crop.temp_ideal_max) {
    req_extractor = true; // ON si temp ≥ 24
}
```

Si la temperatura oscila entre 17.9°C y 18.1°C, `req_heater` alterna cada 5s (cada ciclo de sensor). El anti-short-cycle bloquea la ejecución física durante 3 minutos, pero el **estado lógico** oscila, generando carga computacional innecesaria y telemetría ruidosa.

**Histéresis correcta sería:**
```cpp
if (tempActual <= _config.crop.temp_ideal_min - 0.5f) req_heater = true;
else if (tempActual >= _config.crop.temp_ideal_min + 0.5f) req_heater = false;
else req_heater = _actuadores.heater_ON; // Mantener estado actual
```

### Etiquetas TFT

✅ **En español.** Confirmado en [DisplayManager.cpp:125-146](file:///C:/Users/lagos/OneDrive/Desktop/ESP32Proyecto%20-%20Industrial/Node-monitor-iot-backend/proyecto_iot-code-workspace/edge_esp32/src/DisplayManager.cpp#L125-L146):
`CAL`, `NBL`, `EXT`, `LUZ`, `T.Amb`, `Humed`, `NTC`. Correcto.

---

## 5. ☁️ AUDITORÍA DE CONECTIVIDAD Y NUBE

### Portal Cautivo (WiFi Plug & Play)

✅ **Implementado y funcional.** Evidencia completa:

- [NetworkManager.cpp:237-263](file:///C:/Users/lagos/OneDrive/Desktop/ESP32Proyecto%20-%20Industrial/Node-monitor-iot-backend/proyecto_iot-code-workspace/edge_esp32/src/NetworkManager.cpp#L237-L263) — Modo AP con SSID único `Fungi_Setup_XX` derivado de MAC.
- [NetworkManager.cpp:250](file:///C:/Users/lagos/OneDrive/Desktop/ESP32Proyecto%20-%20Industrial/Node-monitor-iot-backend/proyecto_iot-code-workspace/edge_esp32/src/NetworkManager.cpp#L250) — DNS Sinker en puerto 53 que redirige todo a `192.168.4.1`.
- [NetworkManager.cpp:321-323](file:///C:/Users/lagos/OneDrive/Desktop/ESP32Proyecto%20-%20Industrial/Node-monitor-iot-backend/proyecto_iot-code-workspace/edge_esp32/src/NetworkManager.cpp#L321-L323) — Endpoint `/generate_204` para captura Android.
- [NetworkManager.cpp:325-346](file:///C:/Users/lagos/OneDrive/Desktop/ESP32Proyecto%20-%20Industrial/Node-monitor-iot-backend/proyecto_iot-code-workspace/edge_esp32/src/NetworkManager.cpp#L325-L346) — Formulario POST que guarda credenciales en NVS y reinicia.

Un cliente final puede configurar WiFi sin tocar código ni conocimientos técnicos. ✅

### Firebase — Seguridad de Credenciales

> [!CAUTION]
> **HALLAZGO CRÍTICO DE SEGURIDAD — `Secrets.h` NO está en `.gitignore`**
> 
> El archivo [.gitignore](file:///C:/Users/lagos/OneDrive/Desktop/ESP32Proyecto%20-%20Industrial/Node-monitor-iot-backend/proyecto_iot-code-workspace/.gitignore) contiene:
> ```
> .env
> *.env
> ```
> Pero **NO contiene `Secrets.h`**, `*.h`, ni ninguna referencia al directorio `edge_esp32/src/`.
> 
> El archivo [Secrets.h](file:///C:/Users/lagos/OneDrive/Desktop/ESP32Proyecto%20-%20Industrial/Node-monitor-iot-backend/proyecto_iot-code-workspace/edge_esp32/src/Secrets.h) contiene en texto plano:
> - `FIREBASE_API_KEY = "AIzaSyAfOAkbS4RvT1_pRH-l3u6FX-eSM7TADAI"`
> - `FIREBASE_DATABASE_URL = "https://invernadero-industrial-default-rtdb.firebaseio.com/"`
> - `FIREBASE_USER_EMAIL = "admin@invernadero.cl"`
> - `FIREBASE_USER_PASSWORD = "MiPassword123"`
> 
> Si este archivo fue commiteado alguna vez al repositorio `luckybjj-dev/iot-industrial`, las credenciales están expuestas **permanentemente** en el historial de Git, incluso si se eliminan en un commit posterior. La única remediación es rotar las credenciales.

### OTA — Password

**NO configurado.** [main.cpp:150-153](file:///C:/Users/lagos/OneDrive/Desktop/ESP32Proyecto%20-%20Industrial/Node-monitor-iot-backend/proyecto_iot-code-workspace/edge_esp32/src/main.cpp#L150-L153):
```cpp
ArduinoOTA.setHostname(deviceId.c_str());
ArduinoOTA.begin();
```
Sin `setPassword()`. Cualquier persona en la misma red WiFi puede flashear firmware arbitrario al dispositivo.

### Reconexión WiFi

✅ **Manejada correctamente.** Triple capa:

1. `WiFi.setAutoReconnect(true)` — Driver nativo del ESP32.
2. Leaky Bucket en el bucle de FreeRTOS — [NetworkManager.cpp:301-308](file:///C:/Users/lagos/OneDrive/Desktop/ESP32Proyecto%20-%20Industrial/Node-monitor-iot-backend/proyecto_iot-code-workspace/edge_esp32/src/NetworkManager.cpp#L301-L308).
3. Fallback AP tras 12 intentos (60s) — [NetworkManager.cpp:285-300](file:///C:/Users/lagos/OneDrive/Desktop/ESP32Proyecto%20-%20Industrial/Node-monitor-iot-backend/proyecto_iot-code-workspace/edge_esp32/src/NetworkManager.cpp#L285-L300).

**Riesgo residual:** WiFi SSID/Password hardcodeados en [main.cpp:41-42](file:///C:/Users/lagos/OneDrive/Desktop/ESP32Proyecto%20-%20Industrial/Node-monitor-iot-backend/proyecto_iot-code-workspace/edge_esp32/src/main.cpp#L41-L42) (`"Presidio"` / `"manchita2"`). Estas credenciales se usan como respaldo si la NVS está vacía, pero deberían eliminarse antes de distribución comercial. El informe del Sprint 8 lo identificó explícitamente como "Presidio/manchita2 erradicar" — sigue ahí.

---

## 6. 🔴 DEUDA TÉCNICA Y RIESGOS CRÍTICOS

| # | Problema Identificado | Archivo/Función | Severidad | Impacto si no se corrige |
|---|---|---|---|---|
| 1 | **`Secrets.h` no está en `.gitignore`.** Credenciales Firebase en texto plano probablemente commiteadas al repo público. | [Secrets.h](file:///C:/Users/lagos/OneDrive/Desktop/ESP32Proyecto%20-%20Industrial/Node-monitor-iot-backend/proyecto_iot-code-workspace/edge_esp32/src/Secrets.h) + [.gitignore](file:///C:/Users/lagos/OneDrive/Desktop/ESP32Proyecto%20-%20Industrial/Node-monitor-iot-backend/proyecto_iot-code-workspace/.gitignore) | 🔴 Alta | Compromiso total de Firebase RTDB. Cualquiera puede leer/escribir/borrar datos de todos los dispositivos. |
| 2 | **Sin password OTA.** `ArduinoOTA.begin()` sin `setPassword()`. | [main.cpp:150](file:///C:/Users/lagos/OneDrive/Desktop/ESP32Proyecto%20-%20Industrial/Node-monitor-iot-backend/proyecto_iot-code-workspace/edge_esp32/src/main.cpp#L150) | 🔴 Alta | Cualquiera en la red local puede inyectar firmware malicioso. |
| 3 | **Control bidireccional nunca validado.** El streaming de Firebase→ESP32 nunca fue probado con monitor serial durante la recepción. | [FirebaseManager.cpp:180-261](file:///C:/Users/lagos/OneDrive/Desktop/ESP32Proyecto%20-%20Industrial/Node-monitor-iot-backend/proyecto_iot-code-workspace/edge_esp32/src/FirebaseManager.cpp#L180-L261) | 🔴 Alta | La feature core del producto no funciona. |
| 4 | **Sin callbacks OTA.** No hay `onStart()` para desconectar Firebase durante el flash. | [main.cpp:149-156](file:///C:/Users/lagos/OneDrive/Desktop/ESP32Proyecto%20-%20Industrial/Node-monitor-iot-backend/proyecto_iot-code-workspace/edge_esp32/src/main.cpp#L149-L156) | 🟡 Media | OTA falla al 100% por competencia de CPU/heap con Firebase SSL. |
| 5 | **Sin histéresis termodinámica real.** Solo anti-short-cycle (tiempo), no banda muerta (temperatura). | [HardwareController.cpp:176-182](file:///C:/Users/lagos/OneDrive/Desktop/ESP32Proyecto%20-%20Industrial/Node-monitor-iot-backend/proyecto_iot-code-workspace/edge_esp32/src/HardwareController.cpp#L176-L182) | 🟡 Media | Estado lógico `req_heater` oscila cada 5s en umbral exacto. Telemetría ruidosa, desgaste lógico. |
| 6 | **NTC sin calibración ADC.** Error de hasta 2°C sin `esp_adc_cal_characterize()`. | [HardwareController.cpp:84-89](file:///C:/Users/lagos/OneDrive/Desktop/ESP32Proyecto%20-%20Industrial/Node-monitor-iot-backend/proyecto_iot-code-workspace/edge_esp32/src/HardwareController.cpp#L84-L89) | 🟡 Media | Temperatura de sustrato incorrecta. Calefactor puede encender/apagar con 2°C de error. |
| 7 | **NTC sin filtro de rango lógico.** Ruido ADC puede calcular 200°C sin ser rechazado. | [HardwareController.cpp:85](file:///C:/Users/lagos/OneDrive/Desktop/ESP32Proyecto%20-%20Industrial/Node-monitor-iot-backend/proyecto_iot-code-workspace/edge_esp32/src/HardwareController.cpp#L85) | 🟡 Media | Falsa alarma de EMERGENCIA por lectura de ruido. |
| 8 | **WiFi SSID hardcoded.** `"Presidio"` / `"manchita2"` en main.cpp. | [main.cpp:41-42](file:///C:/Users/lagos/OneDrive/Desktop/ESP32Proyecto%20-%20Industrial/Node-monitor-iot-backend/proyecto_iot-code-workspace/edge_esp32/src/main.cpp#L41-L42) | 🟡 Media | Cada cliente requiere recompilación. Viola la filosofía "Plug & Play". |
| 9 | **Fotoperiodo falla sin NTP.** La luz se apaga permanentemente si pierde red. | [HardwareController.cpp:194](file:///C:/Users/lagos/OneDrive/Desktop/ESP32Proyecto%20-%20Industrial/Node-monitor-iot-backend/proyecto_iot-code-workspace/edge_esp32/src/HardwareController.cpp#L194) | 🟡 Media | Cultivos con fotoperiodo crítico pierden iluminación ante caída de red. |
| 10 | **Sin commits regulares.** Sesiones completas sin backup. | Proceso | 🔴 Alta | Pérdida total de código ante falla de disco o error humano. |
| 11 | **NTC muestra unidad `U` en vez de `°C`.** | [DisplayManager.cpp:107](file:///C:/Users/lagos/OneDrive/Desktop/ESP32Proyecto%20-%20Industrial/Node-monitor-iot-backend/proyecto_iot-code-workspace/edge_esp32/src/DisplayManager.cpp#L107) | 🟢 Baja | Confusión visual menor. |
| 12 | **`NetworkManager` viola SRP.** 438 líneas, 7+ responsabilidades, HTML embebido. | [NetworkManager.cpp](file:///C:/Users/lagos/OneDrive/Desktop/ESP32Proyecto%20-%20Industrial/Node-monitor-iot-backend/proyecto_iot-code-workspace/edge_esp32/src/NetworkManager.cpp) | 🟢 Baja | Dificulta mantenimiento a largo plazo. |
| 13 | **`DynamicJsonDocument` en heap.** Riesgo de fragmentación bajo reconexión. | [FileManager.cpp:31](file:///C:/Users/lagos/OneDrive/Desktop/ESP32Proyecto%20-%20Industrial/Node-monitor-iot-backend/proyecto_iot-code-workspace/edge_esp32/src/FileManager.cpp#L31), [FirebaseManager.cpp:207](file:///C:/Users/lagos/OneDrive/Desktop/ESP32Proyecto%20-%20Industrial/Node-monitor-iot-backend/proyecto_iot-code-workspace/edge_esp32/src/FirebaseManager.cpp#L207) | 🟢 Baja | Crash potencial tras semanas de operación. |

---

## 7. 🧠 AUDITORÍA LEAN STARTUP

### ¿Cuál es la Hipótesis de Valor Actual?

> *"Un cultivador de hongos gourmet (o agricultor de CEA) pagará por un dispositivo IoT plug-and-play que controle automáticamente temperatura, humedad y CO2, con supervisión remota desde el celular, sin requerir conocimientos técnicos."*

### ¿Qué Hipótesis hemos Validado con Hardware Real?

| Hipótesis | Validada? | Evidencia |
|---|---|---|
| El ESP32 puede leer sensores (DHT22, NTC) de forma robusta | ✅ Sí | Sprint 7. Hardware operativo con `dhtOk` flag. |
| El ESP32 puede enviar telemetría en tiempo real a Firebase | ✅ Sí | Sprint 12. `publicarTelemetria()` y `publicarHistorial()` operativos. |
| Un dashboard React puede mostrar datos en tiempo real | ✅ Sí | Sprint 10. `TelemetryDashboard.tsx` funcional. |
| Un portal cautivo permite onboarding sin código | ✅ Sí | Sprint 8. `Fungi_Setup_XX` operativo en campo. |
| El ESP32 puede sobrevivir una caída de WiFi sin perder control | ✅ Sí | Sprint 12. Leaky bucket + fallback AP validado. |
| **Un usuario puede encender un relé desde su celular** | ❌ **NO** | **Nunca validado confiablemente. El bug del streamCallback persiste desde Sprint 11+.** |
| Un perfil agronómico inyectado desde React ajusta los umbrales del ESP32 | ❌ No | Nunca validado end-to-end en hardware. |

### ¿Qué "Waste" (Desperdicio) Identifico?

| Waste | Evidencia | Costo de oportunidad |
|---|---|---|
| **61 documentos de sprint** para un MVP cuya feature core no funciona | El volumen de documentación supera 4:1 la cantidad de features validadas | Horas que podrían haberse dedicado a debug serial del streamCallback |
| **Enciclopedia agronómica, taxonomía Fungi/Plantae, generador de etapas fenológicas** en el frontend React | Desarrollados antes de que un solo relé se encienda remotamente | Feature avanzada construida sobre cimientos no validados |
| **Comentarios educativos extremadamente detallados** | `NetworkManager.cpp` tiene más líneas de comentarios que de código ejecutable | Útil para aprendizaje pero no para un MVP |
| **Motor Agnóstico Multi-cultivo** | Arquitectura preparada para Fungi + Invernadero + Cannabis + Avícola — con 0 clientes reales usando ninguno | Complejidad prematura que no ha sido validada con ni un solo usuario pagante |
| **Credenciales WiFi hardcodeadas** coexistiendo con portal cautivo | `"Presidio/manchita2"` sigue en main.cpp a pesar de que el portal cautivo existe desde Sprint 8 | 8+ sprints con código dead-code que debería haberse eliminado |

### Veredicto: ¿Perseverar o Pivotar?

**PERSEVERAR**, con una corrección de rumbo **inmediata y no negociable**.

La hipótesis de valor es correcta. El mercado de CEA (Controlled Environment Agriculture) es real y creciente. La arquitectura del producto está bien diseñada. Pero el proyecto ha caído en la trampa clásica del ingeniero: construir la solución perfecta antes de validar que funciona. El ciclo Build-Measure-Learn está roto porque nunca se ha completado un "Measure" real de la feature más importante.

**La evidencia es inapelable:** 12+ sprints, 61 informes, un motor agnóstico multi-cultivo, una enciclopedia agronómica... y no se puede encender un foco desde el celular.

---

## 8. 🚀 HOJA DE RUTA PRIORIZADA (Próximos 3 Sprints)

### 🔴 Sprint Inmediato — Deuda Crítica (BLOQUEA todo lo demás)

**Duración estimada: 1-2 horas**

1. **Commit de salvaguarda + Secrets.h al .gitignore.**
   ```bash
   echo "edge_esp32/src/Secrets.h" >> .gitignore
   git add -A && git commit -m "fix: add Secrets.h to gitignore, Sprint 12 backup"
   git push
   ```
   Luego: rotar la password de Firebase desde la consola de Firebase Authentication.

2. **Debug serial del streamCallback.** Conectar monitor serial (115200), presionar botón LUZ en React, leer la salida de `Serial.printf("[Firebase] Stream recibido - Path: %s, Data: %s\n"...)` en línea 205 de `FirebaseManager.cpp`. Esa línea es el diagnóstico definitivo.

3. **Password OTA.** Agregar `ArduinoOTA.setPassword("agriedge2026");` antes de `ArduinoOTA.begin()` en main.cpp.

### 🟡 Sprint Siguiente — Funcionalidad Core del MVP

**Duración estimada: 1 semana**

1. **Histéresis termodinámica real** — Banda muerta de ±0.5°C en `procesarLogicaDeControl`. Elimina oscilación lógica en umbrales.
2. **Callbacks OTA** — `onStart`: desconectar Firebase. `onEnd`: log de éxito. `onError`: log con código de error.
3. **Eliminar WiFi hardcodeado** — Borrar líneas 41-42 de main.cpp. Dejar que el portal cautivo sea el único mecanismo de onboarding.
4. **NTC: filtro de rango** — Descartar lecturas calculadas fuera de [-10°C, 80°C] y marcar `analogicoOk = false`.
5. **Test end-to-end validado** — Documentar con evidencia (screenshot de serial + screenshot de React) que: `setLight(true)` desde React → Firebase → streamCallback → `_hw.setLight(true)` → relé cambia → telemetría confirma `light_on: true`.

### 🟢 Sprint Futuro — Escalabilidad y Comercialización

**Duración estimada: 2-3 semanas**

1. **CropProfile inyección end-to-end** — Validar que cambiar los setpoints desde `CropProfileEditorModal` en React actualiza Firebase, que el ESP32 recibe el stream, lo parsea, lo guarda en LittleFS, y ajusta los umbrales del PLC en vivo.
2. **Calibración ADC NTC** — `esp_adc_cal_characterize()` para eliminar el error de 2°C del sensor de sustrato.
3. **Fotoperiodo offline** — Cachear última hora NTP válida. Si `getHoraInt() == -1`, usar hora cacheada hasta 24h.
4. **Refactorizar NetworkManager** — Extraer `LocalWebServer` y `CaptivePortal` como clases independientes.
5. **App mobile (Flutter)** — Wrapper del dashboard React para distribución en Play Store como diferenciador comercial frente a soluciones genéricas de CEA.

---

## 9. ✅ VEREDICTO Y PRÓXIMA ACCIÓN INMEDIATA

### Veredicto

Este proyecto tiene una arquitectura de firmware de nivel profesional. La refactorización OOP, la migración a Firebase serverless, el motor PLC determinista con árbitro de conflictos, el portal cautivo, y la persistencia en LittleFS son decisiones de ingeniería correctas ejecutadas con competencia. El código es limpio, los comentarios son extraordinariamente educativos, y la separación de responsabilidades es clara.

Sin embargo, el proyecto sufre de un desbalance severo entre **ingeniería de plataforma** y **validación empírica**. La feature que hace de este producto un producto —el control remoto de relés desde un celular— lleva 5+ sprints sin funcionar de forma confiable en hardware real. Mientras tanto, se han construido enciclopedias agronómicas, generadores de etapas fenológicas, y un motor agnóstico multi-cultivo. Hay 61 documentos de sprint y 0 screenshots de un relé encendiéndose desde React con evidencia serial.

El hallazgo de seguridad más grave es que `Secrets.h` con credenciales Firebase en texto plano no está en el `.gitignore` y probablemente fue commiteado al repositorio. Esto requiere remediación inmediata.

El proyecto está a **una sesión de debug bien ejecutada** de tener un MVP real.

### La UNA Sola Tarea más Importante — Próximas 2 Horas

**Agregar `Secrets.h` al `.gitignore`, hacer commit, y luego abrir el monitor serial del ESP32 mientras presionas el botón de LUZ en React.** La línea 205 de `FirebaseManager.cpp` imprime exactamente qué recibe el ESP32 del stream de Firebase. Ese output de serial —que nunca ha sido capturado durante una sesión de debug— es la pieza de información que falta para resolver el problema del control bidireccional de una vez por todas.

```bash
# PASO 1: Proteger credenciales y hacer backup (2 minutos)
echo "edge_esp32/src/Secrets.h" >> .gitignore
git add -A
git commit -m "fix(security): add Secrets.h to gitignore + Sprint 12 backup"
git push origin main

# PASO 2: Abrir PlatformIO Monitor Serial (115200 baud)
# PASO 3: En React, hacer click en botón MODO → MANUAL
# PASO 4: En React, hacer click en botón LUZ
# PASO 5: Copiar las líneas que empiezan con "[Firebase] Stream recibido"
# PASO 6: Compartir ese output — ahí está la respuesta.
```

---

*Auditoría completada el 2026-08-06 a las 00:43 hrs.*
*Basada en lectura directa de 16 archivos de código fuente + `platformio.ini` + `.gitignore` + `README.md` + 61 documentos de sprint.*
*Repositorio: `luckybjj-dev/iot-industrial`*
