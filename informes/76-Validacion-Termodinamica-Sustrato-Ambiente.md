# 76 — Validación Termodinámica Cruzada: Sustrato vs. Ambiente (Algoritmo Racional)

> **Fecha de Emisión:** 14 de Agosto de 2026  
> **Área:** Algoritmo SCADA / Capa 3 (Gestión de Perfiles y Coherencia Biológica)  
> **Estado:** ✅ **Implementado y Verificado**  
> **Referencia Cruzada:** [Auditoría Integral V3](../docs/AUDITORIA_INTEGRAL_V3_2026-08-14.md) | [Informe Maestro](../docs/INFORME_MAESTRO_AGRIEDGE_OS.md) | [Informe 49 - Investigación Agronómica](./49-Investigaci%C3%B3n%20Agron%C3%B3mica%20Profunda%20Par%C3%A1metros%20Termodin%C3%A1micos%20y%20Ambientales%20para%20SCADAagronomic_research.md)

---

## 1. Justificación y Planteamiento del Problema

Durante la inspección de los perfiles de cultivo en el Dashboard SCADA, se detectó una inconsistencia física y agronómica en los parámetros ideales configurados:

$$\text{Temp. Ambiente Ideal} = [20^\circ\text{C}, 25^\circ\text{C}] \quad \longleftrightarrow \quad \text{Temp. Sustrato Ideal} = \sim 20^\circ\text{C}$$

### Inconsistencia Biológica:
El micelio fúngico activo (*Pleurotus*, *Agaricus*, *Lentinula*, *Psilocybe*) es un organismo heterótrofo que experimenta respiración aeróbica continua durante la colonización y fructificación, generando calor metabólico endógeno (**termogénesis micelial**):

$$T_{\text{sustrato}} = T_{\text{ambiente}} + \Delta T_{\text{metabólico}} \quad (\text{donde } \Delta T_{\text{metabólico}} \in [+1.5^\circ\text{C}, +4.0^\circ\text{C}])$$

### Impacto de Permitir Inconsistencias:
1. Si el ambiente opera a $22^\circ\text{C}$, el bloque de sustrato alcanzará de forma natural $24^\circ\text{C}$ a $26^\circ\text{C}$.
2. Si el setpoint o límite ideal de sustrato se fija erróneamente en $\le 20^\circ\text{C}$, el sistema SCADA reportará permanentemente alarmas falsas o intentará enfriar el ambiente a temperaturas sub-óptimas ($<16^\circ\text{C}$), estresando el cultivo y provocando condensación no deseada.
3. Un sistema SCADA de grado industrial **no debe permitir configuraciones termodinámicamente imposibles ni contradictorias**.

---

## 2. Regla de Validación Termodinámica Implementada

Se implementó el motor de validación cruzada (`validateThermodynamics`) en `CropProfiles.ts` y se integró en `CropProfileSelectorModal.tsx`.

### Reglas de Decisión:

1. **Bloqueo Crítico (Error Termodinámico Inviolable):**
   $$\text{Si } T_{\text{sustrato}}^{\text{máx}} \le T_{\text{ambiente}}^{\text{mín}} \implies \text{BLOQUEO DE GUARDADO/INYECCIÓN}$$
   *Mensaje:* *"Violación Termodinámica: El sustrato no puede ser menor o igual al aire ambiente debido a la termogénesis del micelio."*

2. **Advertencia Preventiva (Warning):**
   $$\text{Si } T_{\text{sustrato}}^{\text{mín}} < T_{\text{ambiente}}^{\text{mín}} \implies \text{ADVERTENCIA VISUAL (Badge Amarillo)}$$
   *Mensaje:* *"Advertencia Térmica: El sustrato mínimo está por debajo del ambiente mínimo. El calor metabólico elevará el sustrato de forma natural."*

3. **Alerta de Pasteurización / Límite Letal:**
   $$\text{Si } T_{\text{sustrato}}^{\text{máx}} > 30^\circ\text{C} \implies \text{ALERTA DE SEGURIDAD BIOLÓGICA}$$
   *Mensaje:* *"Peligro de Muerte de Micelio: Temperatura de sustrato cercana o superior al límite letal (>30°C)."*

4. **Algoritmo de Auto-Cálculo Asistido:**
   Se incorporó la función `handleAutoCalculateSubstrate` en el modal con el botón interactivo **"⚡ Auto-Calcular Sustrato (+2°C metabólico)"**, que ajusta automáticamente los rangos de sustrato:
   $$T_{\text{sustrato}}^{\text{mín}} = T_{\text{ambiente}}^{\text{mín}} + 1^\circ\text{C}$$
   $$T_{\text{sustrato}}^{\text{máx}} = T_{\text{ambiente}}^{\text{máx}} + 3^\circ\text{C}$$

5. **Corrección de Fallback en Generador de Payload (`generateDeviceProfile`):**
   Cuando un perfil o fase no define explícitamente el sustrato, el valor por defecto ya **no** se iguala a $T_{\text{ambiente}}^{\text{mín}}$, sino que se deriva como:
   $$\text{temp\_sustrato\_ideal} = \text{round}\left(\frac{T_{\text{amb}}^{\text{mín}} + T_{\text{amb}}^{\text{máx}}}{2}\right) + 2^\circ\text{C}$$

---

## 3. Archivos Modificados

| Archivo | Cambio Realizado |
| :--- | :--- |
| `frontend_react/src/data/CropProfiles.ts` | Creación de `validateThermodynamics()`, interface `ThermodynamicValidation` y corrección de fallback en `generateDeviceProfile()`. |
| `frontend_react/src/components/CropProfileSelectorModal.tsx` | Integración de guards en `handleSaveEditsOnly` y `handleSaveInjection`, badge dinámico de estado térmico y botón de auto-cálculo asistido. |
| `ROADMAP.md` | Registro de la característica completada en Fase 1 (Control Avanzado). |
| `docs/CHECKLIST_CORRECCIONES_DEUDA_TECNICA.md` | Incorporación del ítem #19 como resuelto. |

---

## 4. Estado de Validación

- ✅ Verificación estática con TypeScript (`npx tsc --noEmit` exitoso, código 0).
- ✅ Prevención en UI: Guardar o Inyectar perfiles con $T_{\text{sustrato}} \le T_{\text{ambiente}}$ queda bloqueado con alerta explícita.
- ✅ Respeto a la autonomía del usuario con asistencia automática (auto-cálculo a un clic).
