# 🚀 Plan de Implementación: Control Bidireccional Firebase -> ESP32

## 📌 Objetivo
Convertir los botones inactivos del Dashboard web en un centro de comando real. El ESP32 pasará de ser un dispositivo de solo lectura (Telemetry Push) a un dispositivo reactivo (Stream Listener) que obedece a las órdenes de Firebase.

## 🛠️ Cambios Propuestos

---
### 1. Capa de Red: `FirebaseManager`

Actualmente, el ESP32 solo sube datos usando un objeto `FirebaseData (_fbdo)`. Para escuchar la base de datos en tiempo real (Streaming) sin bloquear las subidas, la librería Mobizt requiere un *segundo* objeto de datos dedicado exclusivamente a mantener abierta la tubería de escucha.

#### [MODIFY] `FirebaseManager.h`
- Añadir un nuevo objeto: `FirebaseData _fbdoStream;`
- Confirmar la firma de los métodos estáticos `streamCallback` y `streamTimeoutCallback` que ya estaban declarados.

#### [MODIFY] `FirebaseManager.cpp`
- **`configurarStreams()`:** Iniciar la suscripción a la ruta `/devices/ESP32_MAC/commands`.
  ```cpp
  Firebase.RTDB.beginStream(&_fbdoStream, streamPath);
  Firebase.RTDB.setStreamCallback(&_fbdoStream, streamCallback, streamTimeoutCallback);
  ```
- **`streamCallback()`:** Función que se dispara en milisegundos cuando presionas un botón en React. Leerá qué actuador cambiaste (Luz, Niebla, Extractor, Calefactor).
- **`_procesarPayloadStream()`:** Parsear el JSON recibido e interactuar con el `HardwareController`.

---
### 2. Capa de Hardware: `HardwareController`

#### [MODIFY] Interacción (Vía Inyección)
Cuando `FirebaseManager` reciba una orden, llamará a los métodos públicos del hardware:
1. `_hw.setModoManual(true)`: Esto suspenderá temporalmente la IA climática (el termostato y la histéresis) para evitar que el ESP32 apague inmediatamente lo que el usuario acaba de encender a mano.
2. Determinar la acción:
   - Si llega `light_on: true` -> `_hw.setLight(true)`
   - Si llega `fogger_on: false` -> `_hw.setFogger(false)`
   - (Idem para el resto).

## ⚠️ User Review Required
> [!WARNING]
> **Bloqueo Manual (Override):** Cuando mandes un comando desde el Dashboard, el ESP32 entrará en **Modo Manual**, suspendiendo el control ambiental automático.  
> *Pregunta Abierta:* ¿Cómo te gustaría salir del Modo Manual y devolverle el control automático al ESP32? 
> - A) Botón "Volver a Automático" en el Dashboard Web.
> - B) Un temporizador (Ej: A las 2 horas de haber tocado algo manualmente, se reinicia solo a Auto).
> *(Para este MVP, sugiero que dejes tu preferencia, pero implementaremos A por defecto).*

## ✅ Plan de Verificación
1. **Compilación:** `platformio run` (verificando memoria flash con el nuevo particionado).
2. **Prueba HIL (Hardware-in-the-Loop):** Le daremos *Upload*, encenderás el Dashboard, apretarás el botón de Luz o Niebla, y verificaremos si el Monitor Serial del ESP32 registra el comando entrante.
