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
