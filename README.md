# Motor Agnóstico IoT y Gestor SCADA 🍄🌿

Sistema industrial automatizado (CEA - Controlled Environment Agriculture) que separa completamente la toma de decisiones termodinámicas de la ejecución en hardware. 

Consta de dos bloques principales:
1. **Frontend en React (Crop Engine / SCADA):** Gestiona la lógica agronómica, alberga una librería universal de perfiles (Fungi y Plantae) y traduce objetivos biológicos en reglas termodinámicas matemáticas.
2. **Edge Node (ESP32):** Un actuador "agnóstico" y robusto que ejecuta las reglas descargadas desde Firebase, sin importar si está cultivando Champiñones, Tomates o Cannabis.

## 🚀 Estado del Proyecto (Sprint Actual)
- **SCADA React Finalizado:** Se implementó el Gestor de Perfiles 2.0 con enciclopedia agronómica, separación taxonómica (Fungi vs Plantae), modo de edición empírica (Tuning) y persistencia local (Custom Profiles).
- **Validación HIL (Hardware-in-the-Loop):** El firmware del ESP32 está siendo sometido a validación empírica física para confirmar la activación de relés frente a inyecciones asíncronas de reglas desde la nube.

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
