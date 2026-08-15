# Informe Técnico N° 22: Resolución de Stack Overflow en Stream Firebase, Estabilidad del Sistema y Renderizado Inmediato TFT en ESP32

**Fecha:** 15 de Agosto de 2026  
**Autor:** Antigravity AI  
**Componentes Afectados:** Firmware ESP32 (`FirebaseManager.cpp`, `FileManager.h`, `main.cpp`, `DisplayManager.cpp`)  
**Estado:** ✅ IMPLEMENTADO, FLASHEADO Y VERIFICADO EN HARDWARE FÍSICO  

---

## 1. Diagnóstico y Causa Raíz

1. **Reinicio Cíclico a los ~3 Segundos (Stack Overflow):**
   - Al conectar WiFi y llamar `Firebase.getJSON()` síncrono justo antes de `beginStream()`, se generaba una colisión de sockets TLS y se encadenaban múltiples documentos JSON de $2048\text{ bytes}$ en el stack de FreeRTOS (`loopTask` tiene un límite por defecto de $8\text{ KB}$).
   - La cadena de llamadas `_procesarPayloadStream` $\rightarrow$ `guardarConfiguracionJson` $\rightarrow$ `guardarConfiguracion` $\rightarrow$ `cargarConfiguracion` consumía la totalidad de la memoria de pila, provocando un *Panic / Stack Canary Reset* a los 3 segundos.
2. **Pantalla TFT Incompleta (Solo Líneas Divisoras):**
   - `DisplayManager::begin()` dibujaba la plantilla estética en `setup()`.
   - Como `DisplayManager::render()` estaba programado dentro del ciclo periódico de $5\text{ segundos}$, el microcontrolador se reiniciaba a los 3 segundos antes de poder dibujar los números de telemetría en pantalla.

---

## 2. Soluciones de Ingeniería Implementadas

### A. Desacoplamiento y Protección de Memoria en Stream (`FirebaseManager.cpp` y `FileManager.h`)
- Se eliminó la petición síncrona `getJSON` en `configurarStreams()`, permitiendo que el stream Server-Sent Events (`beginStream()`) gestione la entrega del estado inicial de manera asíncrona y nativa.
- Se migró a `DynamicJsonDocument(1024)` en Heap para evitar el consumo de memoria de pila.
- Se agregó el método `getConfiguracionActual()` en [`FileManager.h`](file:///c:/Users/lagos/PROYECTOS/ESP32Proyecto%20-%20Industrial/monitor-iot-backend/proyecto-iot-code-workspace/edge_esp32/src/FileManager.h) para inyectar la configuración directamente desde RAM sin ejecutar re-lecturas ni re-parseos de LittleFS en flash durante los callbacks.

### B. Renderizado Inmediato en Arranque (`main.cpp`)
- En `setup()` de [`main.cpp`](file:///c:/Users/lagos/PROYECTOS/ESP32Proyecto%20-%20Industrial/monitor-iot-backend/proyecto-iot-code-workspace/edge_esp32/src/main.cpp), se añadió una lectura inicial de sensores y la ejecución inmediata de `display.render()`.
- La pantalla TFT ST7735 ahora muestra todas las métricas en tiempo real (Temperatura, Humedad, VPD, Sustrato, Actuadores y Conectividad) desde el segundo cero sin retardos.

---

## 3. Verificación en Hardware Físico
- **Compilación PlatformIO (`platformio run`):** RAM: 16.4%, Flash: 63.5%, 0 errores.
- **Flasheo Exitoso:** Subido y verificado en la placa física ESP32 (`esptool.py` / `COM9` / OTA).
- **Validación Operacional:** La pantalla TFT se mantiene encendida de forma estable y continua, renderizando las variables ambientales y actualizándose dinámicamente.
