# INFORME TÉCNICO N° 26 — Optimización de Reactividad SCADA, Heartbeat REST, Semáforo en Reposo y Contención de Timeline

**Proyecto:** AgriEdge OS — Invernadero Industrial / Cámara Fungi  
**Fecha:** 16 de Agosto de 2026  
**Autor:** Antigravity AI (Pair Programming con el Usuario)  
**Estado:** ✅ Aprobado y Validado Empíricamente (Tier 1 & Tier 2)

---

## 1. Resumen Ejecutivo

En este sprint se implementaron correcciones críticas de reactividad, sincronización de estado local y renderizado en el SCADA React, asegurando una experiencia de usuario fluida, determinista y de latencia cero ($0\,\text{ms}$):

1. **Heartbeat REST Resiliente:** Incorporación de ciclos de refresco periódicos (polling cada 2.5s a 3s) en [`firebaseService.ts`](../frontend_react/src/services/firebaseService.ts) que respaldan las conexiones WebSocket del SDK de Firebase, garantizando que la telemetría viva nunca quede estática en el Dashboard.
2. **Cronómetro Manual Instantáneo:** Inicialización en tiempo real de `manualStartTimes[deviceId] = Date.now()` en [`App.tsx`](../frontend_react/src/App.tsx) al conmutar a `MANUAL`, permitiendo el descuento inmediato desde el segundo 1.
3. **Detención Determinista de Cultivos (Botón STOP):** Limpieza optimista inmediata de `planState = null` en [`CropStatePanel.tsx`](../frontend_react/src/components/CropStatePanel.tsx) y actualización a `STANDBY` en Firebase RTDB.
4. **Semáforo en Modo Monitoreo:** Priorización en [`SemaforoEstabilidad.tsx`](../frontend_react/src/components/SemaforoEstabilidad.tsx) del estado `MODO MONITOREO` (*"Sin perfil de cultivo asignado. Sensores en línea y actuadores en reposo"*) cuando no hay un perfil biológico cargado.
5. **Inyección de Recetas en Tiempo Real ($0\,\text{ms}$):** Sincronización optimista de `setConfigs` en [`App.tsx`](../frontend_react/src/App.tsx) al aplicar un perfil desde el modal, eliminando la necesidad de recargar la página (`F5`).
6. **Contención Geométrica de Fases Biológicas:** Rediseño de `renderCompactTimeline` en [`CropStatePanel.tsx`](../frontend_react/src/components/CropStatePanel.tsx) con `px-6 md:px-8`, alineación inteligente de tooltips (`left-0`, `right-0`, `center`) y `overflow-visible`.
7. **Formalización del Protocolo de No Regresión:** Registro permanente del estándar de trabajo en [`.agents/rules/protocolo-no-regresion.md`](../.agents/rules/protocolo-no-regresion.md) y [`docs/PROTOCOLO_NO_REGRESION.md`](../docs/PROTOCOLO_NO_REGRESION.md).

---

## 2. Archivos Modificados

* [`frontend_react/src/services/firebaseService.ts`](../frontend_react/src/services/firebaseService.ts): Suscripciones con fallback continuo y timers limpios.
* [`frontend_react/src/App.tsx`](../frontend_react/src/App.tsx): Gestión de estado optimista, timer manual y sync de recetas.
* [`frontend_react/src/components/CropStatePanel.tsx`](../frontend_react/src/components/CropStatePanel.tsx): Botón STOP optimista y timeline acotado sin desbordamientos.
* [`frontend_react/src/components/SemaforoEstabilidad.tsx`](../frontend_react/src/components/SemaforoEstabilidad.tsx): Priorización de Modo Monitoreo en reposo.
* [`.agents/rules/estandar-trabajo.md`](../.agents/rules/estandar-trabajo.md): Protocolo de doble barrera de validación (Tier 1 autónomo + Tier 2 usuario).
* [`.agents/rules/protocolo-no-regresion.md`](../.agents/rules/protocolo-no-regresion.md): Regla `always_on` de aislamiento quirúrgico.
* [`docs/PROTOCOLO_NO_REGRESION.md`](../docs/PROTOCOLO_NO_REGRESION.md): Documento de control de ingeniería.

---

## 3. Verificación y Validación

* **Tier 1 (Técnico Autónomo):** Compilación `tsc -b && vite build` completada con 0 errores y bundle optimizado. Verificación de flujos RTDB por script Python.
* **Tier 2 (Empírico Usuario):** Validado en vivo en navegador por el usuario (Telemetría oscilante, Timer en retroceso, STOP determinista, Semáforo en reposo, Inyección instantánea y Timeline acotado).
