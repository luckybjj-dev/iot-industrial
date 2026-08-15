---
trigger: always_on
description: Obliga a ejecutar el protocolo de documentación y registro formal tras cualquier cambio estructural o arquitectónico en el proyecto.
---

# Estandar Obligatorio: Protocolo de Registro y Trazabilidad Arquitectónica

1. **Cierre Documental Mandatorio:**
   Cada vez que se complete una tarea que involucre cambios estructurales en el firmware del ESP32, en el SCADA React, en las reglas de control biológico o en el esquema de Firebase, es **estrictamente obligatorio** ejecutar el skill de documentación:
   - Crear el informe técnico correlativo en `informes/`.
   - Actualizar el estado en [ROADMAP.md](../../ROADMAP.md).
   - Actualizar y marcar el ítem en [docs/CHECKLIST_CORRECCIONES_DEUDA_TECNICA.md](../../docs/CHECKLIST_CORRECCIONES_DEUDA_TECNICA.md).
   - Sincronizar [ESP32_ARCH.md](../../ESP32_ARCH.md) si el cambio afecta firmware, pines, control o deuda técnica del ESP32.

2. **Criterio de Aceptación:**
   Ningún cambio estructural se dará por concluido sin haber dejado esta trazabilidad técnica completa.
