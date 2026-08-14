# AgriEdge OS — Motor Agnóstico IoT y SCADA Agronómico 🍄🌿

> **Versión:** 1.0.0 (MVP Post-Auditoría) | **Última Auditoría:** 14/08/2026 | **Puntuación:** 7.0/10

Sistema industrial automatizado (CEA — *Controlled Environment Agriculture*) que separa completamente la toma de decisiones agronómicas de la ejecución termodinámica en hardware.

## 🏗️ Arquitectura

El sistema opera como un **PLC agnóstico de 3 capas**:

1. **Capa Agronómica (React SCADA):** Gestiona perfiles biológicos (20 especies: 10 Fungi + 10 Plantae), traduce objetivos biológicos en setpoints matemáticos y los inyecta vía Firebase RTDB.
2. **Capa de Control (ESP32 C++):** Árbitro de Conflictos determinista, filtro EWMA (α=0.1), Anti-Short-Cycle (180s), y PID Time-Proportioning para el calefactor.
3. **Capa de Protección (Failsafes):** Interlocks físicos en C++ que prevalecen sobre cualquier comando cloud. Emergencia por sustrato (NTC) con poder de veto absoluto.

**El ESP32 no contiene código agrícola.** No tiene las palabras "tomate", "hongo" ni "cannabis". Todo el conocimiento biológico reside en React.

## 💻 Stack Tecnológico

| Capa | Tecnología |
| :--- | :--- |
| **Cloud** | Firebase RTDB (Free Tier, $0) + Firebase Auth |
| **Frontend** | React 19 + TypeScript + Vite + Recharts |
| **Edge** | ESP32 Wemos D1 R32 (PlatformIO, C++, FreeRTOS) |
| **Almacenamiento Local** | LittleFS (`config.json`) |
| **Comunicación** | Firebase SSE Streams (bidireccional) |

> ⚠️ **Este proyecto NO utiliza MQTT.** La comunicación ESP32 ↔ Cloud es directa vía Firebase RTDB.

## 🔌 Hardware (GPIO Mapping)

| Componente | GPIO | Tipo |
| :--- | :---: | :--- |
| DHT22 #1 (Ambiente) | 27 | Digital In |
| DHT22 #2 (Ambiente) | 26 | Digital In |
| NTC 10K (Sustrato) | 34 | ADC In |
| Calefactor SSR | 4 | Digital Out (HIGH) |
| Enfriador Peltier | 17 | Digital Out (HIGH) |
| Humidificador Fogger | 25 | Digital Out (HIGH) |
| Extractor de Aire | 32 | Digital Out (HIGH) |
| Iluminación | 16 | Digital Out (**LOW**) |
| Pantalla TFT SPI | 5/14/13 | CS/DC/RST |

## 📁 Estructura del Proyecto

```
proyecto-iot-code-workspace/
├── edge_esp32/              # Firmware C++ (PlatformIO)
│   └── src/
│       ├── main.cpp                # Orquestador (87 líneas)
│       ├── HardwareController.*    # Sensores + Actuadores + PID + Árbitro
│       ├── NetworkManager.*        # WiFi + Portal Cautivo + mDNS
│       ├── FirebaseManager.*       # RTDB Auth + Streams + Telemetría
│       ├── DisplayManager.*        # TFT ST7735 SPI
│       └── FileManager.*          # LittleFS config.json + CropProfile
├── frontend_react/          # Dashboard SCADA (React + Vite)
├── docs/                    # Documentación técnica vigente
│   ├── INFORME_MAESTRO_AGRIEDGE_OS.md
│   └── AUDITORIA_INTEGRAL_V3_2026-08-14.md
├── informes/                # Informes vigentes + archivo histórico
│   └── _archivo_historico/  # 61 documentos archivados (museo)
├── ESP32_ARCH.md            # Arquitectura detallada del firmware
├── ROADMAP.md               # Hoja de ruta (Fases 1-5)
└── CONTEXTO_ORQUESTADOR.md  # Estado actual para agentes IA
```

## ✨ Características Principales

- **Desacoplamiento Total:** Cambiar de Fungi a Plantae no requiere recompilar C++
- **20 Perfiles Biológicos:** Enciclopedia agronómica con 4 fases fenológicas por especie
- **Crop Steering Dinámico:** Interpolación lineal de setpoints entre fases
- **Plug & Play:** Portal Cautivo para configuración WiFi sin conocimientos técnicos
- **Resiliencia Offline:** Si Firebase o WiFi caen, el ESP32 continúa operando con la última configuración segura
- **SCADA ISA-95:** Jerarquía Granja → Nave → Zona → Nodo con gráficos de 30 días

## 📖 Documentación

| Documento | Descripción |
| :--- | :--- |
| [INFORME_MAESTRO](docs/INFORME_MAESTRO_AGRIEDGE_OS.md) | Documento consolidado: historia, arquitectura, stack, ADRs, agronomía |
| [AUDITORÍA V3](docs/AUDITORIA_INTEGRAL_V3_2026-08-14.md) | Auditoría técnica integral con scorecard y deuda técnica |
| [ESP32_ARCH.md](ESP32_ARCH.md) | Arquitectura detallada del firmware C++ |
| [ROADMAP.md](ROADMAP.md) | Hoja de ruta Q4 2026 — 2028+ |
