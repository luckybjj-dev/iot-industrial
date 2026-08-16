# 24 — Implementación del Modo STANDBY / MONITOREO (Sin Perfil Activo)

> **Fecha:** 16 de Agosto de 2026  
> **Área:** Firmware ESP32 / SCADA React / Máquina de Estados / Control de Actuadores  
> **Estado:** ✅ Implementado, Flasheado y Verificado en Vivo en Hardware  
> **Referencia:** [Informe Técnico 23](./23-Informe-Tecnico-Algoritmo-Control-Microclima-AgriEdge.md) | [ESP32 Architecture](../../ESP32_ARCH.md)

---

## 1. Justificación Técnica y Planteamiento del Problema

En versiones anteriores, el ESP32 arrancaba cargando por defecto un perfil biológico pregrabado (`Fungi_Fruiting_v1`) en su memoria flash (LittleFS). Cuando no había un perfil explícitamente inyectado desde la interfaz SCADA o tras detener un plan de cultivo:
1. El motor de control entraba en modo `AUTO` contra los setpoints pregrabados.
2. Esto provocaba que los relés conmutaran (calefactor, niebla, extractor) para intentar climatizar una cámara que podía estar vacía o en reposo.

Se requería un comportamiento industrial determinista: si no hay un perfil biológico activo, el ESP32 debe operar en modo **`STANDBY / MONITOREO`**, midiendo y publicando toda la telemetría pero manteniendo todos los actuadores apagados (0 consumo y 0 desgaste de relés), interviniendo únicamente si se disparan los umbrales de emergencia catastrófica ($>35^\circ\text{C}$).

---

## 2. Descripción de la Solución e Implementación

### A. Firmware ESP32 (`edge_esp32`)
1. **Nuevo Estado Operacional:** Se incorporó `EstadoOperacional::STANDBY` al enum de la máquina de estados en `HardwareController.h`.
2. **Bandera de Perfil Activo:** Se añadió `bool _perfilActivo` que se valida en `setConfiguracion()`. Un perfil se considera activo solo si su identificador es distinto de `STANDBY`/`NONE` y sus setpoints térmicos son válidos ($>0$).
3. **Lógica de Standby en `procesarLogicaDeControl()`:**
   - Si `!_perfilActivo`: Todos los relés climáticos se fuerzan a `false` (`heater_on = false`, `cooler_on = false`, `fogger_on = false`, `extractor_on = false`, `light_on = false`).
   - Estado operacional reporta `"MONITOREO"`.
   - Mantiene la lectura continua de sensores (DHT1, DHT2, NTC de sustrato, VPD, CO2) y su filtrado matemático EWMA.
   - Supervisión pasiva de emergencia: si la temperatura ambiental o de sustrato supera $35^\circ\text{C}$, conmuta a `EMERGENCIA` encendiendo extracción y enfriamiento de seguridad.
4. **Pantalla ST7735:** Se actualizó `DisplayManager.cpp` para mostrar `ESTADO: MONITOREO` cuando no hay cultivo y `CULT: <Nombre>` cuando hay un perfil inyectado.

### B. SCADA React & Firebase RTDB (`frontend_react`)
1. **Dual-Channel Injection & Standby:** `sendConfigRules()` implementa envío simultáneo por REST directo y SDK con timeout de 2s para eliminar cualquier bloqueo de UI.
2. Al detener un plan o reiniciar el cultivo, se envía el objeto `standbyCrop` que pone inmediatamente al ESP32 en modo `MONITOREO`.
3. `CropStatePanel.tsx` visualiza el estado `INACTIVO` con la leyenda *"Sin plan dinámico activo (Modo Monitoreo)"*.

---

## 3. Matriz de Archivos Modificados

| Archivo | Cambio Realizado |
| :--- | :--- |
| [`edge_esp32/src/HardwareController.h`](file:///c:/Users/lagos/PROYECTOS/ESP32Proyecto%20-%20Industrial/monitor-iot-backend/proyecto-iot-code-workspace/edge_esp32/src/HardwareController.h) | Adición de `EstadoOperacional::STANDBY`, métodos `tienePerfilActivo()` y bandera `_perfilActivo`. |
| [`edge_esp32/src/HardwareController.cpp`](file:///c:/Users/lagos/PROYECTOS/ESP32Proyecto%20-%20Industrial/monitor-iot-backend/proyecto-iot-code-workspace/edge_esp32/src/HardwareController.cpp) | Evaluación de `_perfilActivo` en `setConfiguracion()` e inhibición de relés climáticos en `STANDBY`. |
| [`edge_esp32/src/FirebaseManager.cpp`](file:///c:/Users/lagos/PROYECTOS/ESP32Proyecto%20-%20Industrial/monitor-iot-backend/proyecto-iot-code-workspace/edge_esp32/src/FirebaseManager.cpp) | Mapeo de `STANDBY` a string `"MONITOREO"` en telemetría y procesamiento de `activeProfileName` en stream. |
| [`edge_esp32/src/DisplayManager.cpp`](file:///c:/Users/lagos/PROYECTOS/ESP32Proyecto%20-%20Industrial/monitor-iot-backend/proyecto-iot-code-workspace/edge_esp32/src/DisplayManager.cpp) | Cabecera dinámica en pantalla TFT ST7735 (`ESTADO: MONITOREO` vs `CULT: <Especie>`). |
| [`edge_esp32/src/FileManager.cpp`](file:///c:/Users/lagos/PROYECTOS/ESP32Proyecto%20-%20Industrial/monitor-iot-backend/proyecto-iot-code-workspace/edge_esp32/src/FileManager.cpp) | Configuración inicial por defecto en `STANDBY` en lugar de perfil de hongos forzado. |
| [`frontend_react/src/services/firebaseService.ts`](file:///c:/Users/lagos/PROYECTOS/ESP32Proyecto%20-%20Industrial/monitor-iot-backend/proyecto-iot-code-workspace/frontend_react/src/services/firebaseService.ts) | Envío de `standbyCrop` al detener plan e inyección dual REST + SDK con timeout seguro. |

---

## 4. Estado de Validación y Pruebas en Hardware

- **Compilación Firmware:** `PlatformIO` compila en **19.9s** con 0 errores (Flash: 63.6%, RAM: 16.4%).
- **Flasheo USB:** Flasheado exitosamente en `COM9` @ 460800 baud en **19.1s** con verificación de hash OK.
- **Compilación Frontend:** `npm run build` completa en **4.63s** con 0 errores de TypeScript/Vite.
- **Prueba en Vivo Telemetría RTDB:**
  - En estado `STANDBY`: `estado_operacional: "MONITOREO"`, `heater_on: false`, `cooler_on: false`, `fogger_on: false`, `extractor_on: false`, `light_on: false`.
  - Sensores en tiempo real: `temp_promedio: 21.71°C`, `humedad_promedio: 46.44%`, `sensor_analogico: 20.71°C`, `vpd: 1.39 kPa`.
