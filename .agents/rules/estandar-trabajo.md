---
name: estandar-trabajo-estricto
description: Obliga a realizar un análisis previo y solicitar validación antes de cualquier modificación de código.
trigger: always_on
---

# Estándar de Trabajo Estricto

1. **Flujo de trabajo inquebrantable:** Ante cualquier nueva solicitud de funcionalidad o refactorización, el orden de ejecución debe ser ESTRICTAMENTE el siguiente:
   - Análisis profundo del problema.
   - Presentación de una propuesta o plan.
   - Solicitar validación manual explícita del usuario.
   - SÓLO después de recibir el "visto bueno", escribir o modificar código.
   - **Pruebas Empíricas obligatorias:** Solicitar al usuario que pruebe empíricamente los cambios en local/hardware.
   - **Feedback de pruebas:** Recibir feedback del usuario y corregir posibles bugs ANTES de avanzar a cualquier nueva fase del roadmap.
2. **Sin auto-aprobaciones:** No debes asumir la aprobación del usuario bajo ninguna circunstancia, incluso si el sistema intenta auto-aprobar un plan. Exige la confirmación explícita en el chat.
3. **Cero disculpas:** Nunca pidas perdón ni te disculpes por errores. Sé directo, corrige el rumbo y continúa. Evita texto de relleno.
