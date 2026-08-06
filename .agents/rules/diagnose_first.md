# Diagnóstico Lógico Previo a la Implementación

**Obligatoriedad:** Esta regla es de estricto cumplimiento para todos los requerimientos que impliquen resolver bugs lógicos o desarrollar nuevas lógicas complejas solicitadas por el usuario.

## Regla
Antes de escribir o modificar código fuente para solucionar un problema reportado por el usuario, el agente **DEBE**:
1. Entender el problema real a nivel de código y experiencia de usuario.
2. Detenerse y explicarle al usuario, en texto plano, los **pasos lógicos** y el **diagnóstico** del problema.
3. Esperar la confirmación/aprobación (luz verde) del usuario antes de ejecutar los comandos de edición (`multi_replace_file_content`, `run_command`, etc.).

## Excepciones
Esta regla no aplica para errores tipográficos simples, ajustes triviales de CSS (color, padding), o cuando el usuario explícitamente pide una ejecución rápida sin explicaciones.
