# Auditoría de Arquitectura: Cámara Fungi Inteligente (IoT) 2.0

> [!IMPORTANT]
> **Documento de Continuidad del Proyecto — Actualizado al 31 de julio de 2026**
> Este documento consolida el estado real del proyecto tras los Sprints 1–7. Es la fuente de verdad para retomar el desarrollo desde este punto en cualquier sesión futura.

---

## 🗂️ Índice Rápido

1. [Visión General del Proyecto](#visión-general)
2. [Topología del Monorepo](#topología-del-monorepo)
3. [Hitos Completados por Sprint](#hitos-completados)
4. [Estado Actual — Capa Edge (C++)](#capa-edge)
5. [Estado Actual — Capa Backend (Node.js/TS)](#capa-backend)
6. [Estado Actual — Capa Frontend (React)](#capa-frontend)
7. [Hallazgos de Auditoría Técnica](#hallazgos)
8. [Backlog Confirmado — Sprint 8 (IA)](#sprint-8)

---

## 1. Visión General del Proyecto <a name="visión-general"></a>

**Nombre:** Cámara Fungi Inteligente  
**Tipo:** Ecosistema IoT Full-Stack de Grado Industrial  
**Metodología:** Lean Startup (Pivot estratégico desde monitoreo minero a cultivo de micelio)  
**Repositorio:** `https://github.com/luckybjj-dev/iot-industrial.git` (rama `main`, último commit `f52b569`)  
**Objetivo del PMV:** Optimizar la etapa de fructificación del micelio mediante control termodinámico automatizado, observabilidad en la nube y preparación para integración de IA.

**Hardware físico validado:**
- Microcontrolador: ESP32 (Wemos D1 R32)
- Fuente industrial: S-15-5 (5V DC, 3A, 15W)
- Sensores: DHT22 (clima ambiental) + Sonda NTC 10K (temperatura de sustrato)
- Actuadores: 8 relés → Humidificador ultrasónico, Ventilador FAE, Manta Calefactora
- Display: Pantalla TFT ST7735 (1.77", SPI, 160×128 px)

---

## 2. Topología del Monorepo <a name="topología-del-monorepo"></a>

```
proyecto_iot-code-workspace/
├── edge_esp32/          ← C++ / PlatformIO (Firmware del microcontrolador)
│   ├── platformio.ini
│   └── src/
│       ├── main.cpp                ← Orquestador puro (87 líneas post Sprint 7)
│       ├── HardwareController.h/cpp  ← Capa 0: Sensores + Actuadores + Failsafe
│       ├── NetworkManager.h/cpp      ← Capa 1: WiFi STA/AP + OTA + Reconexión
│       ├── MqttManager.h/cpp         ← Capa 2: Broker LWT + Callbacks + Heartbeat
│       └── DisplayManager.h/cpp      ← Capa 3: HMI TFT (solo lectura, const&)
├── backend_node/        ← TypeScript / Node.js (Cerebro Central)
│   ├── package.json
│   ├── tsconfig.json
│   ├── .env            ← Credenciales InfluxDB, MQTT, API_KEY (no en Git)
│   └── src/
│       └── subscriber.ts  ← Motor MQTT + Express + InfluxDB + API REST
└── frontend_react/      ← Vite + React + TypeScript + Tailwind CSS
    ├── package.json
    └── src/
        ├── main.tsx
        ├── App.tsx
        ├── types/
        │   └── cultivo.ts   ← Contratos de tipos TypeScript
        └── App.css / index.css
```

---

## 3. Hitos Completados por Sprint <a name="hitos-completados"></a>

| Sprint | Entregable | Estado |
|--------|-----------|--------|
| 1–5 | PMV funcional: Telemetría ESP32 → HiveMQ → Node.js → InfluxDB → React | ✅ Completado |
| 6 | **Null-Safety Full-Stack** + **Reverse Heartbeat** + **Fail-Safe UI** | ✅ Completado |
| 7 | **Refactor OOP Edge** (Monolito 486L → 5 módulos, `main.cpp` = 87L) | ✅ Completado + Pusheado a GitHub |

### Sprint 6 — Detalles de entregables
- **Null-Safety end-to-end:** El ESP32 emite `null` cuando DHT22 o NTC fallan. El Backend acepta `number | null` en TypeScript. El Frontend muestra alertas visuales de sensores caídos.
- **Reverse Heartbeat:** Backend publica `{status: "alive"}` cada 10s en `proyecto_iot/servidor/latido`. El ESP32 monitorea ese tópico y activa `servidorCaido=true` si no recibe latido en 35s.
- **Fail-Safe UI en TFT:** La pantalla muestra 3 estados independientes: `[NUBE: ONLINE]` (verde), `[MODO AUTONOMO/OFFLINE]` (ámbar) cuando el broker MQTT cae, y `[SERVIDOR CAÍDO]` (rojo) cuando el backend Node.js se cae pero el broker MQTT sigue activo.
- **Badge Manta Calefactora:** Integrado en el panel de actuadores del frontend.

### Sprint 7 — Detalles de entregables (Refactor OOP)
- **God Object eliminado:** `main.cpp` pasó de 486 líneas (monolito acoplado) a **87 líneas** (orquestador puro).
- **Jerarquía de módulos con inyección de dependencias por referencia:**

```
HardwareController  ←  NetworkManager  ←  MqttManager  ←  DisplayManager
(Capa 0)               (Capa 1)             (Capa 2)          (Capa 3, const&)
```

- **`mutable PubSubClient`:** Solución justificada para `const-correctness` con librería de terceros (`PubSubClient`) que no declara métodos como `const`.
- **`F()` macro preservada** en todos los strings estáticos → protección SRAM.
- **Setters semánticos** explícitos: `setManta()`, `setHumidificador()`, `setVentilador()` para proteger el encapsulamiento.
- **Compilación y flash en hardware físico:** `[SUCCESS] Took 90.65 seconds`.
- **Git commit:** `f52b569` pusheado a `origin/main` con 12 archivos (937 inserciones, 394 eliminaciones).

---

## 4. Estado Actual — Capa Edge (C++) <a name="capa-edge"></a>

Arquitectura modular OOP activa en hardware. Loop principal 100% no bloqueante.

### platformio.ini — Dependencias confirmadas
```ini
lib_deps =
    sstaub/Ticker @ ^4.4.0
    knolleary/PubSubClient @ ^2.8
    bblanchon/ArduinoJson @ ^6.21.3
    adafruit/Adafruit Unified Sensor @ ^1.1.14
    adafruit/DHT sensor library @ ^1.4.6
    adafruit/Adafruit GFX Library @ ^1.11.9
    adafruit/Adafruit ST7735 and ST7789 Library @ ^1.10.4
upload_protocol = espota
upload_port = 192.168.1.102
```

### Módulos activos

| Módulo | Responsabilidad | Garantías |
|--------|----------------|-----------|
| `HardwareController` | Sensores + Relés + Failsafe Térmico | Safe-state obligatorio si sensor falla |
| `NetworkManager` | WiFi STA/AP Failsafe + OTA | AP de rescate "ESP32_RESCATE_MOTOR1" |
| `MqttManager` | MQTT LWT + Callbacks + Heartbeat Watchdog | `mutable PubSubClient` / ID dinámico por MAC |
| `DisplayManager` | HMI TFT (const& read-only) | Cero lógica de negocio / cero delay() |

### Puntos fuertes confirmados
- ✅ **Ecuación Steinhart-Hart** en hardware (FPU del ESP32, sin penalización de rendimiento).
- ✅ **Client ID dinámico** generado desde MAC Address → Multicámara sin colisión en broker HiveMQ.
- ✅ **Loop no bloqueante** con `millis()` para todos los ciclos (sensores: 5s, reconexión: 10s, watchdog: evaluación constante).
- ✅ **LWT (Last Will and Testament)** configurado → broker publica "OFFLINE" automáticamente si el ESP32 se desconecta sin limpiar.

### Oportunidad de mejora pendiente (futura)
- ⚠️ **Oversampling ADC para el NTC:** La lectura del ADC es directa. En entornos con relés/EMI se recomienda promediar 10–20 lecturas consecutivas con `delayMicroseconds()` para reducir el ruido eléctrico. *No aplicado aún, documentado para Sprint 8 o posterior.*

---

## 5. Estado Actual — Capa Backend (Node.js/TS) <a name="capa-backend"></a>

Motor central en `subscriber.ts`. Arquitectura Multicámara activa.

### package.json — Dependencias confirmadas
```json
{
  "dependencies": {
    "@influxdata/influxdb-client": "^1.35.0",
    "cors": "^2.8.6",
    "dotenv": "^17.4.2",
    "express": "^5.2.1",
    "mqtt": "^5.15.2"
  },
  "devDependencies": {
    "typescript": "^7.0.2",
    "tsx": "^4.23.1",
    "ts-node": "^10.9.2"
  }
}
```

### Funcionalidades activas en `subscriber.ts`

| Feature | Implementación | Estado |
|---------|---------------|--------|
| **Suscripción Multicámara** | Wildcard `proyecto_iot/edge/#` | ✅ Activo |
| **Estado por dispositivo** | `Map<string, string> estadosEdge` | ✅ Activo |
| **Telemetría por dispositivo** | `Map<string, TelemetriaFungi> telemetriaRecibida` | ✅ Activo |
| **Watchdog de Latidos** | `Map<string, NodeJS.Timeout> temporizadoresLatidos` (60s timeout) | ✅ Activo |
| **InfluxDB Batching** | `writeApi.writePoint()` sin `flush()` manual | ✅ Activo |
| **Reverse Heartbeat** | `setInterval` 10s → tópico `proyecto_iot/servidor/latido` | ✅ Activo |
| **API Key Middleware** | Header `x-api-key` o query `api_key` | ✅ Activo |
| **CORS** | `cors()` middleware en Express | ✅ Activo |
| **Graceful Shutdown** | `SIGINT` → `writeApi.close()` → `client.end()` → `server.close()` | ✅ Activo |

### Endpoints de la API REST

| Método | Ruta | Protección | Descripción |
|--------|------|------------|-------------|
| `GET` | `/api/health` | Pública | Estado del servidor y nº de dispositivos |
| `GET` | `/api/cultivo/estado` | Pública | Array de todas las cámaras con telemetría actual |
| `POST` | `/api/cultivo/modo` | `x-api-key` requerido | Envía comando MQTT a una cámara específica |

### Oportunidad de mejora pendiente (futura)
- ⚠️ **Limpieza de memoria en Watchdog:** Cuando un `setTimeout` de latido dispara y declara OFFLINE a un dispositivo, el objeto temporizador queda en memoria. Añadir `temporizadoresLatidos.delete(deviceId)` dentro del callback para liberar la referencia. *Pequeña optimización, documentada para próxima sesión.*

---

## 6. Estado Actual — Capa Frontend (React) <a name="capa-frontend"></a>

Stack: **Vite + React 19 + TypeScript + Tailwind CSS 4**

### package.json — Dependencias confirmadas
```json
{
  "dependencies": {
    "lucide-react": "^1.27.0",
    "react": "^19.2.7",
    "react-dom": "^19.2.7"
  },
  "devDependencies": {
    "tailwindcss": "^4.3.3",
    "vite": "^8.1.1",
    "typescript": "~6.0.2"
  }
}
```

### Archivos existentes en `frontend_react/src/`
- `App.tsx` — Componente principal (modificado en Sprint 6)
- `App.css` / `index.css` — Estilos base
- `main.tsx` — Entry point
- `types/cultivo.ts` — Contratos TypeScript (modificado en Sprint 6)

> [!NOTE]
> El frontend fue modificado en Sprint 6 para incluir Fail-Safe UI y badge de Manta. Los componentes `MetricCards.tsx`, `ControlPanel.tsx` y `apiService.ts` mencionados en la propuesta original aún podrían no existir como archivos separados; la lógica puede estar consolidada en `App.tsx`. Verificar antes del Sprint 8.

---

## 7. Hallazgos de Auditoría Técnica <a name="hallazgos"></a>

### ✅ Fortalezas del Sistema (Validadas)

1. **Arquitectura no-bloqueante en Edge:** Loop 100% libre de `delay()`. Garantía de supervivencia del Watchdog de red y del ciclo de control de actuadores sin importar el estado de la red.
2. **Multicámara escalable en Backend:** `Map`s con clave `deviceId` (basado en MAC del ESP32) → soporta N cámaras simultáneas sin colisiones.
3. **Null-Safety end-to-end:** El flujo de datos `null` está manejado en C++, TypeScript y React. No hay riesgos de crash en el frontend por datos faltantes de sensores.
4. **Deuda técnica saldada en Edge:** Sprint 7 saldó la deuda OOP. El módulo `DisplayManager` opera en modo `const&` estricto → el HMI no puede alterar el estado del sistema.
5. **Apagado seguro del servidor:** El backend no pierde datos en InfluxDB ni conexiones MQTT ante un `Ctrl+C` o señal de sistema.

### ⚠️ Mejoras Pendientes (Baja Prioridad)

| # | Área | Descripción | Complejidad |
|---|------|-------------|-------------|
| 1 | Edge / ADC | Oversampling del NTC (10–20 lecturas promediadas) para reducir ruido EMI de relés | Baja |
| 2 | Backend / Memoria | `temporizadoresLatidos.delete(deviceId)` en callback OFFLINE para GC | Trivial |
| 3 | Frontend | Verificar existencia de `MetricCards.tsx`, `apiService.ts` y `ControlPanel.tsx` como archivos separados | Baja |

---

## 8. Backlog Confirmado — Sprint 8 (Inteligencia Artificial) <a name="sprint-8"></a>

El sistema base está diseñado con "tuberías de JSON" preparadas para IA. Los tres vectores de integración son:

### 8.1 Self-Tuning / Analítica Predictiva
- El Backend Node.js enviará ventanas de datos históricos desde InfluxDB a la API de **Google AI Studio (Gemini)**.
- Gemini analizará patrones de temperatura/humedad y recalibrará dinámicamente los umbrales de alarma del sistema.
- Implementación propuesta: nueva clase `CultivoStateMachine` inyectada en `HardwareController` por referencia → cero impacto en módulos existentes.

### 8.2 Mantenimiento Prescriptivo (RAG)
- Integración de manuales técnicos en PDF.
- Ante un error crítico (caída de voltaje, fallo de sensor), Gemini consultará el manual cruzado con logs MQTT y emitirá pasos de reparación en el frontend.

### 8.3 Visión Artificial Industrial (ESP32-CAM)
- Adición de un módulo ESP32-CAM al ecosistema.
- El ESP32-CAM captura imágenes, las codifica en Base64 y las envía al endpoint de Node.js.
- Node.js reenvía la imagen a la **API Multimodal de Google AI Studio** con un prompt específico para detectar contaminación por *Trichoderma* (manchas verdes) en el sustrato.

---

## 9. Guía de Arranque Rápido

Para retomar el desarrollo en cualquier sesión:

### Terminal 1 — Backend
```bash
cd "C:\Users\lagos\OneDrive\Desktop\ESP32Proyecto - Industrial\Node-monitor-iot-backend\proyecto_iot-code-workspace\backend_node"
npx tsx src/subscriber.ts
# Verificar: "✅ [MQTT] Conexión exitosa" y "🚀 [API REST] Motor Express encendido en http://localhost:3000"
```

### Terminal 2 — Frontend
```bash
cd "C:\Users\lagos\OneDrive\Desktop\ESP32Proyecto - Industrial\Node-monitor-iot-backend\proyecto_iot-code-workspace\frontend_react"
npm run dev
# Verificar: Dashboard accesible en http://localhost:5173
```

### ESP32 — Flash OTA
```
PlatformIO → Upload (OTA via upload_port = 192.168.1.102)
Verificar en Monitor Serie: "[SISTEMA] Arrancando Nodo: ESP32_XXXXXXXXXXXX"
```

---

*Documento generado por Antigravity como memoria técnica oficial del proyecto. Última actualización: 31 julio 2026.*
