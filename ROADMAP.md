# 🗺️ Roadmap de Desarrollo — AgriEdge OS

> **Última actualización:** 14 de Agosto de 2026 (Post-Auditoría V3)

---

## 🔴 Prioridad Inmediata: Corrección de Deuda Técnica Crítica

> Estas tareas son **bloqueantes** y deben completarse antes de cualquier feature nueva.

### 1. Corregir Bug de Safe Mode [CRÍTICO]
- **Problema:** Cuando ambos DHTs fallan, el filtro EWMA congela `ewma_temp` en su último valor válido. El sistema nunca entra en Safe Mode y el calefactor opera a ciegas.
- **Impacto:** Riesgo de incendio.
- **Archivo:** `HardwareController.cpp:167,247`

### 2. Activar Watchdog de Hardware [CRÍTICO]
- **Problema:** El campo `watchdog_timeout_ms` existe en `config.json` pero `esp_task_wdt` no está inicializado.
- **Impacto:** Bloqueo SSL deja al ESP32 colgado indefinidamente.
- **Archivo:** `main.cpp`

### 3. Rotar Credenciales [CRÍTICO]
- **Problema:** `Secrets.h` fue commiteado al historial Git.
- **Impacto:** API Key y password de Firebase potencialmente expuestas.

---

## 🟢 Fase 1: Ajuste Fino y Control Avanzado (Q4 2026)

### ~~1. Redundancia Ambiental Dual (2× DHT22)~~ ✅ COMPLETADO
### ~~2. Control PID para Modulación~~ ✅ COMPLETADO
### ~~3. Filtro EWMA Industrial~~ ✅ COMPLETADO
### ~~4. Árbitro de Conflictos Determinista~~ ✅ COMPLETADO
### ~~5. Anti-Short-Cycle (180s)~~ ✅ COMPLETADO
### ~~6. Modos AUTO/MANUAL con interlocks~~ ✅ COMPLETADO
### ~~7. Firebase Auth + Security Rules~~ ✅ COMPLETADO

### 8. Desacoplar PID a tarea FreeRTOS independiente
- **Objetivo:** Evaluar el SSR del calefactor cada 50-100 ms (no cada 5000 ms) para lograr modulación PWM real.
- **Impacto:** El PID dejará de degradarse a On/Off binario.

### 9. Implementar Histéresis Paramétrica
- **Objetivo:** Agregar `hysteresis_temp` y `hysteresis_hum` al CropProfile con banda muerta configurable.
- **Impacto:** Elimina relay chatter sin depender exclusivamente del EWMA.

### 10. Crop Steering Algorítmico Dinámico
- **Objetivo:** Automatizar curvas graduales diarias (ej. bajar 1°C/día para simular otoño en Shiitake).
- **Estado:** Motor V2 implementado en React (`steeringEngine.ts`). Falta validación end-to-end con ESP32.

### 11. Alarmas y Notificaciones Push
- **Objetivo:** Firebase Cloud Functions → Telegram / WhatsApp / FCM.
- **Impacto:** Alertas instantáneas si la cámara entra en `SAFE_MODE` o excede rangos críticos.

### 12. Fix OTA
- **Objetivo:** Detener Firebase y WebServer en `onStart()` para liberar heap durante el flash.
- **Impacto:** OTA actualmente falla al 100% por contención de recursos.

---

## 🟡 Fase 2: Diseño del Producto Físico (Q1 2027)

### 1. Diseño de PCB Custom (KiCad / Altium)
- ESP32-WROOM-32E en SMD, eliminando la placa Wemos D1 R32.
- SSR integrados, optoacopladores, fusibles y borneras industriales.
- Eliminación total de cables Dupont y protoboards.

### 2. Diseño Industrial de Carcasa (IP65/IP67)
- Modelado 3D (SolidWorks / Fusion 360) para montaje en Riel DIN.
- Prensaestopas para cables de sensores/relés.
- Bisel para pantalla TFT sin tornillos visibles.

### 3. Sensor CO2 NDIR Real
- Integración de SCD30, SCD40 o MH-Z19 por UART/I2C.
- Reemplaza el placeholder hardcodeado de 400 ppm.

### 4. Calibración ADC + Multisampling NTC
- Usar `esp_adc_cal` para corregir no-linealidad del ADC (±1.5-3°C actual).
- Implementar multisampling (8-16 muestras) para reducir ruido.

---

## 🟠 Fase 3: Expansión Multi-Nodo e ISA-95 (Q2 2027)

### 1. Red Mesh Local (ESP-NOW)
- Nodo Maestro (Gateway WiFi/Firebase) + Nodos Esclavos locales.
- Reducción de latencia y descongestión WiFi.

### 2. Dashboard Multi-Zona
- Plano 2D interactivo con topología de la nave (D3.js / Canvas).
- Mapas de calor y configuración masiva por zona.

### 3. Data Lake y Ciencia de Datos
- Streaming a BigQuery vía Firebase Extensions.
- Exportación CSV/JSON para análisis de correlaciones a largo plazo.

---

## 🔴 Fase 4: Seguridad y Fiabilidad (Q3 2027)

### 1. Resiliencia Offline Definitiva
- Datalogger en MicroSD SPI o partición LittleFS expandida.
- Sincronización por lotes tras reconexión.

### 2. RBAC (Control de Acceso por Roles)
- Firebase Auth con roles: `admin`, `agronomist`, `operator`, `viewer`.
- Audit log de acciones en `/audit_log`.

### 3. Calibración de Sensores desde UI
- Offsets configurables (`offset_temp`, `offset_hum`) desde el Dashboard.
- Margen de error <1% para certificación industrial.

### 4. Downsampling de Históricos
- Datos >30 días reducidos a resolución de 1 hora.
- Worker automático para controlar crecimiento de Firebase RTDB.

---

## 🟣 Fase 5: Visión Ciberfísica e IA (2028+)

### 1. Visión Computacional (ESP32-CAM / Cámaras IP)
- Modelos YOLO/OpenCV para medir crecimiento físico real.
- Transiciones de fase basadas en evidencia visual (no solo tiempo).

### 2. OTA Masivo (Fleet Management)
- Gestor de firmware en el Dashboard.
- Actualización de N nodos desde un `.bin` subido a la UI.

### 3. Gemelo Digital y Auto-Tuning
- TinyML (MPC predictivo en ESP32).
- Machine Learning sobre Data Lake para optimizar Crop Steering.

### 4. Integración ERP / Logística Comercial
- Firebase → SAP/Odoo para órdenes de cosecha automáticas.
- Estimación de kilos y fecha de cosecha.
