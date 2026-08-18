# INFORME TÉCNICO OFICIAL #28
## Armonía Visual, Diagnóstico Multivariable SCADA y Ticker Dinámico TFT ST7735

**Fecha:** 17 de Agosto de 2026  
**Autor:** Antigravity AI Engineering Pair Programmer  
**Proyecto:** AgriEdge OS / SCADA Industrial & IoT Edge  
**Estado:** ✅ **COMPLETADO Y VALIDADO EMPÍRICAMENTE EN PRODUCCIÓN**  

---

### 1. 🎯 Resumen Ejecutivo

Este sprint abordó y solucionó definitivamente la ambigüedad visual y el desacople de diagnóstico entre el **Dashboard Web SCADA React** y la **Pantalla Local TFT ST7735 ($160\times 128\text{ px}$)** del microcontrolador ESP32. 

Anteriormente, cuando múltiples variables demandaban compensación simultánea (por ejemplo: baja temperatura ambiental con modulación rápida por pulsos del calefactor SSR y exceso de humedad ambiental requiriendo extracción forzada), el operador se enfrentaba a información aparentemente contradictoria:
1. El banner declaraba `CALENTANDO (Calefactor ON)` mientras el botón del Calefactor mostraba `OFF` en gris y el Extractor mostraba `ON` sin motivo visible.
2. La pantalla TFT física mostraba `CAL:OF` y `EXT:ON`, generando confusión sobre el estado real de los relés.

---

### 2. 🏛️ Arquitectura y Documentación Creada

1. **Matriz de Conflictos Multivariable ([`docs/MATRIZ_CONFLICTOS_ACTUADORES_MICROCLIMA.md`](file:///c:/Users/lagos/PROYECTOS/ESP32Proyecto%20-%20Industrial/monitor-iot-backend/proyecto-iot-code-workspace/docs/MATRIZ_CONFLICTOS_ACTUADORES_MICROCLIMA.md)):**
   * Formalización matemática y agronómica de los **6 escenarios de operación simultánea**:
     * Escenario 1: Calefactor ON + Extractor ON (Frío + Exceso de Humedad / $\text{CO}_2$).
     * Escenario 2: Extractor ON + Niebla OFF (Interlock de exclusión mutua para no expulsar niebla por ductos).
     * Escenario 3: Enfriador ON + Niebla ON (Enfriamiento evaporativo / mitigación de sequedad).
     * Escenario 4: Sustrato Caliente vs Aire Frío (Protección de zona radicular/micelio).
     * Escenario 5: Fotoperiodo Activo (Compensación de calor por radiación).
     * Escenario 6: Prohibición Lógica Calefactor vs Enfriador (Alarma de anomalía crítica).
2. **Sincronización del Algoritmo ([`docs/ALGORITMO_CONTROL_MICROCLIMA.md`](file:///c:/Users/lagos/PROYECTOS/ESP32Proyecto%20-%20Industrial/monitor-iot-backend/proyecto-iot-code-workspace/docs/ALGORITMO_CONTROL_MICROCLIMA.md)):**
   * Enlace transversal a la matriz y unificación de criterios de control.

---

### 3. 🛠️ Implementaciones Técnicas

#### A. Frontend SCADA React
* **Semáforo Multivariable Inteligente ([`SemaforoEstabilidad.tsx`](file:///c:/Users/lagos/PROYECTOS/ESP32Proyecto%20-%20Industrial/monitor-iot-backend/proyecto-iot-code-workspace/frontend_react/src/components/SemaforoEstabilidad.tsx)):**
  * Concatena dinámicamente el estado térmico y las razones secundarias:  
    *Ejemplo:* `CALENTANDO / DESHUMIDIFICANDO`  
    *«Sistema compensando: Calefactor ON (Temp. baja: 19.9°C < 23°C) + Extractor ON (Exceso humedad: 64.6% > 45%)»*
* **Panel de Actuadores ([`App.tsx`](file:///c:/Users/lagos/PROYECTOS/ESP32Proyecto%20-%20Industrial/monitor-iot-backend/proyecto-iot-code-workspace/frontend_react/src/App.tsx)):**
  * Calefactor SSR en modo `AUTO`: Botón activo en ámbar con insignia **`PID ON`** y micro-etiqueta `• Modulación Térmica`.
  * Extractor en modo `AUTO`: Micro-etiquetas contextuales dinámicas (`• Evacuando Humedad`, `• Purga de CO2`, `• Evacuando Calor`).
  * Niebla en modo `AUTO`: Badge de interlock `⚠️ Inhibido por Extracción` cuando el extractor está ventilando.

#### B. Firmware ESP32 ([`DisplayManager.cpp`](file:///c:/Users/lagos/PROYECTOS/ESP32Proyecto%20-%20Industrial/monitor-iot-backend/proyecto-iot-code-workspace/edge_esp32/src/DisplayManager.cpp))
* **Actuadores Fijos:**
  * `CAL:PID` en amarillo activo durante calentamiento.
  * `NBL:INH` en magenta si está inhibida por el extractor.
  * Actuadores inactivos o en reposo con indicación clara `OF` en rojo.
* **Ticker Inferior Rotativo (Alternancia suave cada 3 segundos sin flickering):**
  * Alterna entre el estado térmico principal (`EST: CALOR (PID SSR)`), la causa secundaria (`EXT: EXC HUM >45%` / `SUPERVISION LOCAL OK`) y la salud del sistema.
  * En modo reposo: `ESTADO: MODO MONITOREO` / `ACTUADORES: REPOSO (OF)`.

---

### 4. 🧪 Protocolo de Verificación y Aprobación

1. **Auto-Verificación Técnica (Tier 1):**
   * `npm run build`: Compilación de frontend TypeScript + Vite completada en $4.40\,\text{s}$ con **0 errores y 0 warnings**.
   * PlatformIO: Compilación de firmware y flasheo exitoso a través del puerto **COM9** (`[SUCCESS]`).
2. **Validación Empírica por el Usuario (Tier 2):**
   * El usuario verificó en vivo tanto en el navegador como en la pantalla TFT física el funcionamiento de la visualización coordinada, aprobando formalmente el cierre del ítem.

---

### 5. 📦 Archivos Afectados
* `docs/MATRIZ_CONFLICTOS_ACTUADORES_MICROCLIMA.md` (Nuevo)
* `docs/ALGORITMO_CONTROL_MICROCLIMA.md` (Modificado)
* `docs/CHECKLIST_CORRECCIONES_DEUDA_TECNICA.md` (Modificado)
* `frontend_react/src/components/SemaforoEstabilidad.tsx` (Modificado)
* `frontend_react/src/App.tsx` (Modificado)
* `edge_esp32/src/DisplayManager.cpp` (Modificado)
* `informes/28-Informe-Oficial-Armonia-Visual-Diagnostico-Multivariable-Ticker-TFT.md` (Nuevo)
