# Motor Agnóstico IoT y Gestor SCADA 🍄🌿 v1.0.0 (MVP)

Sistema industrial automatizado (CEA - Controlled Environment Agriculture) que separa completamente la toma de decisiones termodinámicas de la ejecución en hardware. 

Consta de dos bloques principales:
1. **Frontend en React (Crop Engine / SCADA):** Gestiona la lógica agronómica, alberga una librería universal de perfiles (Fungi y Plantae) y traduce objetivos biológicos en reglas termodinámicas matemáticas.
2. **Edge Node (ESP32):** Un actuador "agnóstico" y robusto que ejecuta las reglas descargadas desde Firebase, sin importar si está cultivando Champiñones, Tomates o Cannabis.

## 🚀 Estado del Proyecto: MVP en Producción (v1.0.0)
El sistema ha alcanzado el hito de Producto Mínimo Viable. Puedes leer el reporte de este logro en el documento [INFORME_HITO_1.md](INFORME_HITO_1.md) y nuestra proyección a futuro en el [ROADMAP.md](ROADMAP.md).

- **SCADA Web Robusto:** Se integraron gráficos estadísticos (Recharts) soportando historiales de hasta 30 días y se construyó bajo la ontología del estándar ISA-95 (Granja > Nave > Zona > Nodo).
- **Control Hardware Avanzado:** La placa ESP32 (Wemos D1 R32) controla con seguridad industrial ciclos de Calefacción, Extracción, Niebla y Luz. Además, se integró hardware de Enfriamiento (Peltier) y redundancia ambiental promediada entre sensores DHT22 y NTC2.
- **Fail-safes Industriales:** El firmware reacciona proactivamente ante desconexiones de WiFi, errores silenciosos de desbordamiento de memoria JSON, o saturación de sensores en el campo.

## 🏗️ Arquitectura de Firmware (C++)

El ESP32 funciona como un autómata (PLC) resiliente. Revisa el documento [ESP32_ARCH.md](ESP32_ARCH.md) para un detalle profundo del código comentado.

*   **`main.cpp`**: Orquestador minimalista. Loop no bloqueante.
*   **`HardwareController`**: Abstracción física (Sensores y Relés). Inyecta fallbacks automáticos si los sensores colapsan.
*   **`NetworkManager`**: Gestión WiFi en Core 1, Portal Cautivo Asíncrono de emergencia.
*   **`FirebaseManager`**: Cliente RTDB. Descarga las reglas generadas por React y emite la telemetría en tiempo real.
*   **`DisplayManager`**: UI de diagnóstico local en pantalla TFT SPI (evitando parpadeos).
*   **`FileManager`**: Persistencia de red y configuraciones en memoria flash vía LittleFS.

## 💻 Stack Tecnológico
- **Cloud & Middleware:** Firebase Realtime Database
- **SCADA & Agronomía:** React + TypeScript + Vite + TailwindCSS
- **Hardware Edge:** ESP32 (PlatformIO, C++, FreeRTOS)

## ✨ Características Principales
* **Desacoplamiento Total:** El ESP32 no contiene código "agrícola" (ni la palabra "tomate" o "seta"). Todo el cerebro recae en React.
* **Enciclopedia y Crop Steering:** La plataforma cuenta con conocimiento agronómico profundo para inducir fenologías (ej: VPD management, browning, fae).
* **Seguros Termodinámicos (Failsafes):** Bloqueo a nivel C++ de comandos anómalos o desconexión de sensores.
* **Resiliencia Offline:** Si Firebase o el WiFi caen, el ESP32 continúa operando el microclima con la última configuración segura inyectada.
