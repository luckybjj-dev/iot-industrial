# 🛡️ Protocolo Mandatorio: Cero Regresiones y Validación de Impacto Cruzado

> **Ubicación de la Regla del Agente:** [`.agents/rules/protocolo-no-regresion.md`](../.agents/rules/protocolo-no-regresion.md)  
> **Ámbito:** Frontend SCADA React, Firmware ESP32 C++, Servicios Firebase y Esquema RTDB.

---

## 1. Filosofía y Principio de No Regresión
Cuando un requerimiento o bug ya fue validado y cerrado en un sprint anterior, **está estrictamente prohibido que futuras modificaciones introduzcan regresiones** que reactiven fallas previas.

---

## 2. Pilares de Ejecución

### A. Aislamiento Quirúrgico
* Cada edición debe enfocarse únicamente en el punto específico de la falla.
* Prohibido eliminar funciones de redundancia (ej. fallback REST, estados optimistas locales, comprobaciones de timeout) bajo la asunción de simplificar código.

### B. Matriz de Impacto Cruzado
* Todo cambio en capas base (`firebaseService.ts`, `CropProfiles.ts`, `HardwareController.h/cpp`) requiere auditar cada uno de los componentes y módulos que los consumen:
  * `App.tsx` (Gestión central de estado, modos y timers)
  * `TelemetryDashboard.tsx` (Gráficos históricos y telemetría viva)
  * `CropStatePanel.tsx` (Timeline de fases, inyección y detención de cultivos)
  * `SemaforoEstabilidad.tsx` (Diagnóstico contextual y estados operacionales)
  * `CropProfileSelectorModal.tsx` (Validación e inyección de perfiles)

### C. Barrera 1: Auto-Verificación Técnica Obligatoria del Agente (Tier 1)
Antes de solicitar la prueba al usuario, el agente debe ejecutar de forma autónoma:
1. **Flujo de Telemetría:** Comprobar suscripciones y flujo de datos continuo desde Firebase RTDB.
2. **Control Manual:** Verificar contratos de datos para modo `MANUAL`, timer y estado optimista de actuadores.
3. **Gestión de Cultivo:** Verificar inyección de recetas y parada determinista (`STOP` a `MODO MONITOREO`).
4. **Layout y Estilos:** Cero desbordamientos de tarjetas, barras o tooltips.
5. **Compilación Limpia:** `tsc -b` y `npm run build` con 0 errores y 0 warnings.
*Si algún punto de Tier 1 no cumple, el agente debe iterar y corregir internamente sin transferir código defectuoso al usuario.*

---

## 3. Barrera 2: Validación Empírica del Usuario y Protocolo Git (Tier 2)
1. **Pase a Prueba Empírica:** Solo cuando el agente certifique el 100% de éxito en Tier 1, se habilita la prueba del usuario en navegador/hardware.
2. **Comprobación en Vivo:** El usuario prueba físicamente y confirma que todo opera al 100% y sin efectos secundarios.
3. **Autorización Explícita para Git:** Solo tras la confirmación explícita del usuario en el chat, se procede a documentar y realizar `git commit` y `git push`. Prohibido cualquier commit prematuro.
