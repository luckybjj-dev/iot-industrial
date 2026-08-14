# 🗺️ Roadmap de Desarrollo — AgriEdge OS

> **Última actualización:** 14 de Agosto de 2026 (Post-Auditoría V3)

---

## 🔴 Prioridad Inmediata: Corrección de Deuda Técnica Crítica
- [x] **1. Corregir Bug de Safe Mode [CRÍTICO]** ✅ COMPLETADO ([Informe 77](./informes/77-Resolucion-Deuda-Tecnica-Firmware-Control-Industrial.md))
- [x] **2. Activar Watchdog de Hardware [CRÍTICO]** ✅ COMPLETADO ([Informe 77](./informes/77-Resolucion-Deuda-Tecnica-Firmware-Control-Industrial.md))
- [ ] **3. Rotar Credenciales en Git [CRÍTICO]** ⏳ Plantilla lista ([`Secrets.h.template`](./edge_esp32/src/Secrets.h.template))

---

## 🟢 Fase 1: Ajuste Fino y Control Avanzado (Q4 2026)

### ~~1. Redundancia Ambiental Dual (2× DHT22)~~ ✅ COMPLETADO
### ~~2. Control PID para Modulación~~ ✅ COMPLETADO
### ~~3. Filtro EWMA Industrial~~ ✅ COMPLETADO
### ~~4. Árbitro de Conflictos Determinista~~ ✅ COMPLETADO ([Informe 77](./informes/77-Resolucion-Deuda-Tecnica-Firmware-Control-Industrial.md))
### ~~5. Anti-Short-Cycle (180s) en Peltier~~ ✅ COMPLETADO ([Informe 77](./informes/77-Resolucion-Deuda-Tecnica-Firmware-Control-Industrial.md))
### ~~6. Modos AUTO/MANUAL con interlocks~~ ✅ COMPLETADO
### ~~7. Firebase Auth + Security Rules~~ ✅ COMPLETADO
### ~~8. Validación Termodinámica Cruzada Sustrato/Ambiente~~ ✅ COMPLETADO ([Informe 76](./informes/76-Validacion-Termodinamica-Sustrato-Ambiente.md))
### ~~9. Desacoplamiento de Time-Proportioning SSR (PID PWM rápido)~~ ✅ COMPLETADO ([Informe 77](./informes/77-Resolucion-Deuda-Tecnica-Firmware-Control-Industrial.md))
### ~~10. Histéresis Paramétrica (Banda Muerta)~~ ✅ COMPLETADO ([Informe 77](./informes/77-Resolucion-Deuda-Tecnica-Firmware-Control-Industrial.md))
### ~~11. Fix OTA Teardown (liberación de Heap/Sockets)~~ ✅ COMPLETADO ([Informe 77](./informes/77-Resolucion-Deuda-Tecnica-Firmware-Control-Industrial.md))
### ~~12. Renderizado HMI TFT Anti-Flickering + Métrica VPD~~ ✅ COMPLETADO ([Informe 77](./informes/77-Resolucion-Deuda-Tecnica-Firmware-Control-Industrial.md))
### ~~13. Backoff Exponencial y Eliminación de Heap Fragmentado (StaticJson)~~ ✅ COMPLETADO ([Informe 77](./informes/77-Resolucion-Deuda-Tecnica-Firmware-Control-Industrial.md))

### 14. Crop Steering Algorítmico Dinámico
- **Objetivo:** Automatizar curvas graduales diarias (ej. bajar 1°C/día para simular otoño en Shiitake).
- **Estado:** Motor V2 implementado en React (`steeringEngine.ts`). Falta validación end-to-end con ESP32.

### 15. Alarmas y Notificaciones Push
- **Objetivo:** Firebase Cloud Functions → Telegram / WhatsApp / FCM.
- **Impacto:** Alertas instantáneas si la cámara entra en `SAFE_MODE` o excede rangos críticos.

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
