# Cámara Fungi Inteligente 🍄

Sistema de control y monitorización de invernaderos automatizado, enfocado en el cultivo de hongos. El sistema utiliza hardware Edge (ESP32) para tomar decisiones termodinámicas en tiempo real, junto con una conexión constante a la nube (Firebase) para telemetría y control remoto.

## 🚀 Estado del Proyecto (Sprint 12)

El dispositivo Edge funciona de manera **100% asíncrona, robusta y resiliente**. 
- Se solucionaron problemas críticos de "race conditions" entre núcleos (Core 0 vs Core 1).
- El sistema detecta caídas del router local y levanta un Portal Cautivo de emergencia (`Fungi_Rescate`) mediante un algoritmo "Leaky Bucket".
- Mantiene una conexión viva de ida y vuelta (Streaming) con la nube mediante protocolos criptográficos sin bloquear la lectura de sensores o el renderizado de la pantalla TFT.

## 🏗️ Arquitectura de Software (OOP en C++)

El firmware está modularizado para garantizar bajo acoplamiento y alta cohesión:

*   **`main.cpp`**: Orquestador minimalista. Llama a las instancias en un loop no bloqueante basado en `millis()`.
*   **`HardwareController`**: Abstracción física. Maneja sensores (DHT22, Fotoresistores) y actuadores (Calefactor, Niebla, Extractor, Luz). Incluye seguros termodinámicos (*failsafes*) que bloquean comandos manuales peligrosos si los sensores fallan o los parámetros exceden los límites de seguridad.
*   **`NetworkManager`**: Gestiona el WiFi en el Core 1. Implementa AutoReconnect, desactiva el Modem Sleep y levanta un Portal Cautivo Asíncrono (ESPAsyncWebServer y DNSServer) para la configuración inicial.
*   **`FirebaseManager`**: Gestiona la autenticación, publica telemetría y el historial. Mantiene abierto un Stream (`Firebase.beginStream`) para recibir comandos bidireccionales en tiempo real desde la nube.
*   **`DisplayManager`**: Renderiza la interfaz de usuario de diagnóstico en una pantalla TFT SPI, mostrando el estado de la red, IP, y parámetros físicos en tiempo real y sin parpadeos.
*   **`FileManager`**: Gestiona el almacenamiento no volátil usando LittleFS y ArduinoJson para guardar credenciales de red y configuraciones físicas.

## 💻 Stack Tecnológico y Librerías

El desarrollo del firmware se realiza en **PlatformIO** para el entorno `esp32dev`.

*   **Microcontrolador**: ESP32 (Procesador Dual-Core Xtensa de 32 bits a 240MHz).
*   **Framework**: Arduino Core para ESP32.
*   **Base de Datos Cloud**: Firebase Realtime Database (RTDB).
*   **Protocolo de Actualización**: ArduinoOTA (Over The Air) y mDNS (`fungi.local`).

### Dependencias Principales (`platformio.ini`)
*   `sstaub/Ticker` @ ^4.4.0
*   `mobizt/Firebase ESP32 Client` @ ^4.4.14
*   `bblanchon/ArduinoJson` @ ^6.21.3
*   `adafruit/Adafruit Unified Sensor` @ ^1.1.14
*   `adafruit/DHT sensor library` @ ^1.4.6
*   `adafruit/Adafruit GFX Library` @ ^1.11.9
*   `adafruit/Adafruit ST7735 and ST7789 Library` @ ^1.10.4
*   `mathieucarbou/ESPAsyncWebServer` @ ^3.3.22

## ✨ Características Principales
*   **Seguros Termodinámicos (Failsafes):** El firmware jamás permite que un comando remoto dañe el ecosistema físico (por ejemplo, encender el calefactor si la temperatura ya es crítica o el sensor se desconectó).
*   **Portal Cautivo de Resiliencia:** Si la conexión WiFi titular cae por 1 minuto, el ESP32 despliega su propia red para reconfiguración.
*   **Control Bidireccional RTDB:** Uso eficiente de WebSockets/SSE nativos para ejecutar actuadores instantáneamente al hacer clic en el Dashboard Web.
