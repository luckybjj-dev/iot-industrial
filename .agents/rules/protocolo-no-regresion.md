---
trigger: always_on
description: Protocolo estricto de No Regresión, Aislamiento Quirúrgico y Validación de Impacto Cruzado.
---

# Protocolo Mandatorio: Cero Regresiones y Validación de Impacto Cruzado

**CRÍTICO - SIEMPRE DEBES RECORDAR ESTO AL TRABAJAR EN ESTE PROYECTO:**

1. **Aislamiento Quirúrgico:**
   - Cualquier modificación debe realizarse exclusivamente en el componente o función afectada sin alterar contratos de interfaz, eliminaciones de mecanismos de respaldo (fallbacks) o lógica preexistente que ya fue validada.
   - NUNCA elimines funciones de soporte, redundancias REST, timers locales o estados optimistas bajo el supuesto de que "ya no son necesarios" sin una verificación exhaustiva.

2. **Matriz de Impacto Cruzado Previa:**
   - Antes de modificar una función en servicios compartidos (ej. `firebaseService.ts`), analiza todos los componentes consumidores (`App.tsx`, `TelemetryDashboard.tsx`, `CropStatePanel.tsx`, `SemaforoEstabilidad.tsx`, `CropProfileSelectorModal.tsx`).
   - Garantiza que los cambios de estado local y remoto sean coherentes en toda la cadena.

3. **Batería de Auto-Verificación Interna del Agente (Tier 1 Mandatorio):**
   - **Telemetría Viva:** Comprobar suscripciones y flujo de datos continuo desde Firebase RTDB.
   - **Lógica de Control y Modos:** Ejecutar tests automáticos / scripts sobre contratos de datos (`MANUAL`, relés, inyección de recetas y detención determinista).
   - **Integridad de Layout:** Comprobar que no existan desbordamientos de texto o tarjetas (`overflow`, `truncate`, paddings).
   - **Build & Tipado Estricto:** Ejecutar `npm run build` / `tsc -b` asegurando cero errores y cero warnings.
   - *Si alguna prueba interna falla, el agente DEBE iterar y corregir por su cuenta sin transferir el defecto al usuario.*

4. **Validación Empírica por el Usuario (Tier 2 Obligatorio antes de Git):**
   - Solo tras superar el 100% de Tier 1, el usuario prueba físicamente la aplicación/hardware en vivo.
   - NUNCA realizar `git commit` ni `git push` sin el visto bueno explícito del usuario tras su prueba empírica.
