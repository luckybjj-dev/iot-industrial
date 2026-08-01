# Roadmap y Futuras Implementaciones

Este documento actúa como la memoria a largo plazo del proyecto "ESP32 Cámara Fungi / Industrial". Aquí registraremos las ideas, mejoras y características planificadas para fases posteriores (Backlog), siguiendo la filosofía Lean Startup.

## Backlog / Futuras Implementaciones

### Configuración Dinámica de Hardware (Portal Web)
* **Descripción:** Permitir al usuario final seleccionar la configuración de su hardware a través de un portal web integrado (Web Server) en lugar de flashear nuevo código.
* **Caso de uso principal (Sensor CO2 vs. Temporizador):** 
  En la interfaz web inicial, el usuario responderá a la pregunta: *"¿Posee sensor de CO2 o implementará ventilación por tiempo?"*
  - Si selecciona **Tiempo:** El ESP32 controlará el relé del Extractor (`EXT`) basado en intervalos programados.
  - Si selecciona **Sensor CO2:** El ESP32 habilitará la lectura del pin asignado al sensor de CO2, actualizará la pantalla TFT para mostrar los niveles (ppm) y usará un umbral dinámico para accionar el extractor.
* **Requisitos técnicos:** 
  - Guardar el estado de esta configuración en memoria no volátil (EEPROM / SPIFFS / LittleFS).
  - Dejar un pin analógico/UART físicamente libre en la placa base actual para futuras conexiones (Plug & Play).
  - Diseñar la pantalla TFT para que sea adaptativa (ocultar la métrica de CO2 si está en modo temporal, mostrarla si está en modo sensor).
* **Fase Estimada:** Sprint 10 o posterior (Una vez el MVP básico sea 100% estable).
