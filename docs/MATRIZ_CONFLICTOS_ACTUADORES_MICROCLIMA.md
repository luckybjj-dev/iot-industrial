# MATRIZ DE RESOLUCIÓN DE CONFLICTOS MULTIVARIABLE Y ACCIONES SIMULTÁNEAS (AgriEdge OS)

**Componente:** SCADA React (`frontend_react/`) y Firmware ESP32 (`edge_esp32/`)  
**Fecha:** 17 de Agosto de 2026  
**Revisión:** 1.0.0 (Estándar de Supervisión y Diagnóstico de Microclima)  

---

## 1. 📋 Propósito y Filosofía de Diseño

En cámaras de cultivo biológico herméticas (Invernaderos y Cámaras Fungi), múltiples variables microclimáticas (Temperatura, Humedad Relativa $\text{RH}$, $\text{CO}_2$, $\text{VPD}$ y Fotoperiodo) interactúan constantemente en un mismo volumen de aire.

Para que un operador humano tenga **100% de certidumbre** en el funcionamiento autónomo del sistema, el SCADA React debe explicar con precisión matemática y agronómica **el por qué** de cada actuador activo o inhibido, eliminando falsas alarmas, aparentes contradicciones o interpretaciones de "caja negra".

---

## 2. 📊 Matriz de Escenarios y Reglas de Visualización en SCADA

```
┌────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                 MATRIZ DE CONFLICTOS MULTIVARIABLE                                     │
├────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ 1. Calefactor ON + Extractor ON  ──► Temp baja (Frío) + Exceso de Humedad / CO2                        │
│ 2. Extractor ON + Niebla OFF     ──► Interlock: Niebla inhibida para no botarla por ductos             │
│ 3. Enfriador ON + Niebla ON      ──► Enfriamiento evaporativo: Mitigando sequedad / VPD alto           │
│ 4. Sustrato Caliente + Aire Frío ──► Calefactor pausado por protección de zona radicular/micelio       │
│ 5. Fotoperiodo ON + Subida Temp  ──► Radiación lumínica aportando calor: PID disminuye potencia        │
│ 6. Calefactor ON + Enfriador ON  ──► PROHIBICIÓN LÓGICA (Bloqueo en Firmware / Alarma en SCADA)       │
└────────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

### Detalle de Escenarios

| # | Escenario Simultáneo | Fenómeno Físico / Agronómico | Justificación de Control (Firmware) | Visualización en Semáforo SCADA | Visualización en Panel de Actuadores |
|---|---|---|---|---|---|
| **1** | **Calefactor ON + Extractor ON** | El aire está frío ($T < T_{\text{ideal\_min}}$) pero la humedad supera el límite ($RH > RH_{\text{ideal\_max}}$) o el $\text{CO}_2$ es tóxico. | La asfixia por $\text{CO}_2$ o la saturación de humedad (riesgo de moho/pudrición) tienen prioridad de evacuación, mientras el calefactor SSR mantiene la inercia térmica de base. | `CALENTANDO / DESHUMIDIFICANDO`<br>*«Sistema compensando: Calefactor ON (Temp. baja: 20.3°C < 23°C) + Extractor ON (Exceso humedad: 66.7% > 45%)»* | • **Calefactor:** `PID ON` (Ámbar / *Modulación Térmica*)<br>• **Extractor:** `ON` (Esmeralda / *Evacuando Humedad*) |
| **2** | **Extractor ON + Niebla OFF (con Humedad Baja)** | El aire ambiente está seco ($RH < RH_{\text{ideal\_min}}$), pero el Extractor está encendido por calor o $\text{CO}_2$. | **Interlock de Exclusión Mutua:** Encender niebla ultrasónica con el extractor activo expulsaría el vapor de agua inmediatamente por los ductos, desperdiciando agua y saturando los filtros de aire. | `EXTRAYENDO`<br>*«Extractor evacuando aire viciado. Inyección de niebla en pausa temporal por ventilación»* | • **Extractor:** `ON` (Esmeralda / *Ventilación Activa*)<br>• **Niebla:** `OFF` (Gris / Badge: *INHIBIDO POR EXTRACCIÓN*) |
| **3** | **Enfriador ON + Niebla ON** | La temperatura es alta ($T > T_{\text{ideal\_max}}$) y la humedad es deficiente ($RH < RH_{\text{ideal\_min}}$ o $VPD > VPD_{\text{máx}}$). | **Enfriamiento Evaporativo:** La inyección de micro-gotas de agua ayuda a reducir la temperatura por entalpía de evaporación mientras la celda Peltier enfría el aire. | `ENFRIANDO / HUMIDIFICANDO`<br>*«Sistema en enfriamiento con humidificación activa (Mitigando sequedad / VPD alto)»* | • **Enfriador:** `ON` (Azul / *Control Térmico Frío*)<br>• **Niebla:** `ON` (Cyan / *Inyección de Niebla*) |
| **4** | **Sustrato Caliente vs Aire Frío** | La sonda NTC del sustrato detecta calor metabólico interno ($T_{\text{sustrato}} \ge T_{\text{sustrato\_crit\_max}}$) mientras los sensores DHT marcan aire frío. | **Prioridad P1 de Supervivencia:** El micelio muere irreversiblemente por encima de $30^\circ\text{C}$. El PLC inhibe el calefactor y activa ventilación aunque el aire marque $19^\circ\text{C}$. | `EMERGENCIA TÉRMICA EN SUSTRATO`<br>*«Calefactor inhibido por seguridad: Sustrato caliente (28.5°C >= 27°C) → Evacuando calor radicular»* | • **Calefactor:** `LOCKED` (Rojo / *Bloqueo por Sustrato*)<br>• **Extractor:** `ON` (Esmeralda / *Protección Radicular*) |
| **5** | **Fotoperiodo Activo** | La iluminación artificial programada está en horas de encendido. | Las lámparas aportan radiación térmica. El lazo PID del calefactor detecta el incremento de temperatura y reduce su *duty cycle* automáticamente. | `CLIMA ESTABLE / FOTOPERIODO DIURNO`<br>*«Variables en rango. Fotoperiodo activo (Horas 8/12)»* | • **Luz:** `ON` (Amarillo / *Fotoperiodo Diurno*) |
| **6** | **Calefactor ON vs Enfriador ON** | Hipotético intento de activar calefacción y refrigeración a la vez. | **Prohibición Lógica Absoluta en Capa 2:** La máquina de estados del ESP32 garantiza exclusión mutua en hardware. Si la telemetría reportara ambos, es un fallo de hardware. | `FALLO CRÍTICO: CONFLICTO TÉRMICO`<br>*«Anomalía detectada: Calefactor y Enfriador activos a la vez. Failsafe activado.»* | • **Ambos:** Insignia de advertencia roja parpadeante |

---

## 3. 🎯 Directrices de Implementación para el SCADA Frontend

1. **Estado Optimista y de Modulación SSR:**
   * En modo `AUTO`, si el microcontrolador reporta `estado_operacional === 'CALENTANDO'`, el botón del Calefactor debe reflejar `PID ON` en lugar de `OFF`.
2. **Concatenación Dinámica de Mensajes en Semáforo:**
   * La función de diagnóstico en `SemaforoEstabilidad.tsx` debe evaluar el vector completo de actuadores encendidos (`heater_on`, `cooler_on`, `fogger_on`, `extractor_on`, `light_on`) y generar una descripción articulada con las variables desencadenantes.
3. **Micro-Etiquetas Agronómicas en Tarjetas de Actuador:**
   * Cada actuador en estado activo debe mostrar una micro-etiqueta debajo del botón que describa su función actual (*"Modulación Térmica"*, *"Evacuando Humedad"*, *"Purga de CO2"*, *"Inhibido por Extracción"*).
