# 25 — Optimización Termodinámica de Setpoints, Control Dinámico de VPD y Diagnóstico Inteligente SCADA

> **Fecha:** 16 de Agosto de 2026  
> **Área:** Firmware ESP32 / SCADA React / Algoritmo de Control Termodinámico  
> **Estado:** ✅ **Implementado, Flasheado en COM9 y Verificado en Firebase RTDB**  
> **Referencia:** [Informe 24](./24-Implementacion-Modo-Standby-Monitoreo-Edge-SCADA.md) | [Informe 15](./15-Validacion-Termodinamica-Sustrato-Ambiente.md) | [ESP32_ARCH.md](../ESP32_ARCH.md)

---

## 1. Justificación Técnica y Planteamiento del Problema

Durante las pruebas operativas en vivo con hardware real conectado (ESP32 `7C:9E:BD:61:8F:54` y SCADA React), se identificaron cuatro discrepancias funcionales y agronómicas:

1. **Desbordamiento y Visualización en Cero de Setpoints en Standby:**
   Al entrar en reposo o inyectar recetas, las tarjetas métricas mostraban `Ideal: 0 - 0 °C` o desbordaban el contenedor de la card debido a la longitud del prefijo `Ideal: `.
2. **Inconsistencia Térmica en Sustrato por Defecto:**
   Al no especificar un rango de sustrato en perfiles personalizados, el fallback igualaba el sustrato al mínimo ambiental ($22^\circ\text{C}$), ignorando la **termogénesis metabólica** ($\Delta T_{\text{metabólico}} \approx +2.5^\circ\text{C} \text{ a } +3.0^\circ\text{C}$) producida por la respiración celular en el micelio y raíces.
3. **Falso Positivo en Estado Operacional `CALENTANDO`:**
   El residuo integral del PID (`_pidOutput > 0`) retenía el estado `CALENTANDO` en la máquina de estados incluso cuando la temperatura ambiental estaba dentro del rango óptimo ($22.4^\circ\text{C} \in [22.0, 25.0]^\circ\text{C}$), enmascarando la acción activa del humidificador (`Niebla ON`).
4. **Conflicto de Umbrales Estáticos de VPD vs. Receta Dinámica:**
   El firmware mantenía umbrales fijos de humidificación ($1.00 / 1.20\text{ kPa}$), provocando que se encendiera la niebla con $1.69\text{ kPa}$, a pesar de que la receta activa permitía un rango de operación natural de hasta $1.90\text{ kPa}$.

---

## 2. Descripción de la Solución e Implementación

### A. Termogénesis Biológica en el Generador de Perfiles (`CropProfiles.ts`)
Se ajustó la derivación automática de setpoints de sustrato:
$$T_{\text{sustrato}}^{\text{ideal}} = \text{round}\left(\frac{T_{\text{amb}}^{\text{mín}} + T_{\text{amb}}^{\text{máx}}}{2}\right) + 3^\circ\text{C}$$

### B. Desacoplamiento de la Máquina de Estados Térmica (`HardwareController.cpp`)
Se eliminó la dependencia de `_pidOutput > 0` para la transición de estado:
- `demandaCalor` opera con histéresis estricta sobre $T_{\text{amb}}$ ($< T_{\text{min}}$ para encender, $< T_{\text{min}} + \text{HIST\_TEMP}$ para mantener).
- La modulación Time-Proportioning del SSR gestiona la potencia sin bloquear las transiciones hacia `HUMIDIFICANDO` o `NORMAL`.

### C. Cálculo Dinámico de Límites de VPD en Edge y Cloud
El límite superior de activación de niebla se calcula en tiempo real a partir de la receta:
$$VPD_{\text{máx\_receta}} = \text{calcularVPD}(T_{\text{ideal\_max}}, H_{\text{ideal\_min}})$$
- Niebla activa si $H_{\text{amb}} \le H_{\text{min}}$ ó $VPD > VPD_{\text{máx\_receta}}$.
- Niebla corta si $H_{\text{amb}} \ge H_{\text{min}} + \text{HIST\_HUM}$ y $VPD \le (VPD_{\text{máx\_receta}} - 0.10\text{ kPa})$.

### D. Diagnóstico Contextual Inteligente (`SemaforoEstabilidad.tsx`)
El semáforo superior genera mensajes descriptivos en tiempo real que informan al operador la causa exacta y el actuador involucrado (ej. *`"Sistema compensando: Humedad baja (44.4% < 45%) y VPD elevado (1.72 > 1.74 kPa) → Niebla ON"`*).

### E. Optimización Visual de Cards Métricas (`MetricCard.tsx`, `App.tsx`)
Se eliminó el texto estático `Ideal: ` reemplazándolo por el rango conciso con soporte `min-w-0` y `truncate`, evitando desbordamientos en cualquier resolución de pantalla.

---

## 3. Matriz de Archivos Modificados

| Archivo | Cambio Realizado |
| :--- | :--- |
| [`edge_esp32/src/HardwareController.cpp`](file:///c:/Users/lagos/PROYECTOS/ESP32Proyecto%20-%20Industrial/monitor-iot-backend/proyecto-iot-code-workspace/edge_esp32/src/HardwareController.cpp) | Desacople de residuo PID en máquina de estados y cálculo dinámico de $VPD_{\text{máx}}$ según receta. |
| [`frontend_react/src/data/CropProfiles.ts`](file:///c:/Users/lagos/PROYECTOS/ESP32Proyecto%20-%20Industrial/monitor-iot-backend/proyecto-iot-code-workspace/frontend_react/src/data/CropProfiles.ts) | Auto-cálculo de $T_{\text{sustrato}}^{\text{ideal}}$ con $+3^\circ\text{C}$ de compensación termogénica. |
| [`frontend_react/src/components/SemaforoEstabilidad.tsx`](file:///c:/Users/lagos/PROYECTOS/ESP32Proyecto%20-%20Industrial/monitor-iot-backend/proyecto-iot-code-workspace/frontend_react/src/components/SemaforoEstabilidad.tsx) | Diagnóstico inteligente multivariable con reporte de actuador y variables en tiempo real. |
| [`frontend_react/src/components/MetricCard.tsx`](file:///c:/Users/lagos/PROYECTOS/ESP32Proyecto%20-%20Industrial/monitor-iot-backend/proyecto-iot-code-workspace/frontend_react/src/components/MetricCard.tsx) | Renderizado compacto de targets, prevención de overflow con `truncate` y fallback `--`. |
| [`frontend_react/src/App.tsx`](file:///c:/Users/lagos/PROYECTOS/ESP32Proyecto%20-%20Industrial/monitor-iot-backend/proyecto-iot-code-workspace/frontend_react/src/App.tsx) | Formateo limpio de targets numéricos y filtrado de modo Standby. |
| [`frontend_react/src/components/CropStatePanel.tsx`](file:///c:/Users/lagos/PROYECTOS/ESP32Proyecto%20-%20Industrial/monitor-iot-backend/proyecto-iot-code-workspace/frontend_react/src/components/CropStatePanel.tsx) | Fallback de duración de fases en tooltip de timeline (`duration_days ?? 14`). |

---

## 4. Estado de Validación y Pruebas en Hardware

1. **Compilación y Carga de Firmware:** Flasheado en `COM9` exitoso (1.25 MB @ 460800 baud, código de salida 0).
2. **Compilación Frontend React:** `npm run build` completado en 1.16s con 0 errores TypeScript.
3. **Telemetría en Vivo (Firebase RTDB):**
   - $T_{\text{amb}} = 23.49^\circ\text{C}$ (Óptimo en $[22, 25]^\circ\text{C}$).
   - $H_{\text{amb}} = 43.94\%$ (Transición controlada).
   - $VPD = 1.62\text{ kPa}$ (Dentro de $[1.19, 1.90]\text{ kPa}$).
   - `estado_operacional` = `NORMAL` con actuadores en reposo.
