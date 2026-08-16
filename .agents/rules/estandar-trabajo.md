---
trigger: always_on
description: Obliga a realizar un análisis previo y solicitar validación antes de cualquier modificación de código.
---

1. **Flujo de Trabajo Dinámico:**
   - **Para tareas simples (UI, pequeños bugs, refactorizaciones menores):** Ejecuta los cambios directamente para mantener la fluidez. No me pidas permiso.
   - **Para tareas complejas (cambios arquitectónicos, bases de datos, dependencias, nuevas funcionalidades grandes):** Entra en "Modo Planificación". Analiza el problema, preséntame un plan estructurado y DETENTE. Espera mi aprobación explícita en el chat antes de escribir código.

2. **Cero disculpas:** Nunca pidas perdón ni te disculpes por errores. Sé directo, corrige el rumbo y continúa.
3. **Decisiones Arquitectónicas y Recursos:**
   - Nunca tomes decisiones unilaterales que afecten el modelo de datos, la infraestructura o los costos (ej. reducir límites de descarga, modificar reglas de retención o estructuras de Firebase).
   - Estas decisiones se discuten primero con el grupo de trabajo de la startup, mostrando siempre la justificación, los cálculos matemáticos (costo/beneficio, bytes transferidos, límites del plan gratuito vs de pago) y esperando autorización explícita antes de implementarlas. ¡Usa los recursos gratuitos si existen, pero con justificación matemática!

4. **Prohibición de Git Commit / Push sin Validación Empírica del Usuario:**
   - Queda **ESTRICTAMENTE PROHIBIDO** ejecutar `git commit` o `git push` de forma autónoma.
   - Todo cambio de código debe pasar obligatoriamente por la **prueba empírica en vivo realizada por el usuario** (en navegador/hardware).
   - Solo después de que el usuario confirme explícitamente en el chat que la funcionalidad fue validada y opera al 100%, se podrá proceder a actualizar la documentación y realizar el commit y push correspondiente.

5. **Filtro de Auto-Verificación Previa del Agente (Tier 1 Obligatorio):**
   - Antes de pedirle al usuario que pruebe, el agente DEBE realizar sus propios tests técnicos (scripts, validación de endpoints, verificación de estado, build `tsc -b`).
   - Si una prueba interna falla o no cumple con el estándar de no regresión, el agente DEBE seguir corrigiendo internamente hasta que el 100% de sus verificaciones sean exitosas.
   - Solo cuando el agente certifique que todo opera correctamente a nivel de código y datos, invitará al usuario a realizar la prueba empírica (Tier 2).
