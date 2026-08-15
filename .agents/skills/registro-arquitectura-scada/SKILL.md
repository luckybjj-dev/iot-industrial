---
name: registro-arquitectura-scada
description: Protocolo formal de documentación y trazabilidad ante cambios estructurales en AgriEdge OS (Firmware ESP32, SCADA React, Firebase, Algoritmos de Control y Modelos Biológicos). Usar cuando se implementen cambios arquitectónicos, correcciones de auditoría o nuevos módulos.
---

# 📋 Protocolo de Registro de Cambios Estructurales — AgriEdge OS

Este skill define el procedimiento innegociable de cierre y trazabilidad documental que debe ejecutarse cada vez que se realice un cambio estructural, refactorización de fondo, corrección de deuda técnica o integración algorítmica en el ecosistema AgriEdge OS.

---

## 🎯 Criterios de Activación
Este protocolo debe ejecutarse cuando se complete:
1. Modificaciones en el Firmware C++ del ESP32 (sensores, actuadores, PID, FreeRTOS, WiFi, Firebase).
2. Cambios en el modelo de datos o contratos de comunicación (Firebase RTDB, payloads JSON, perfiles de cultivo).
3. Modificaciones en el motor de control, arbitraje de conflictos o lógica SCADA del Frontend React.
4. Resolución de ítems auditados en el informe maestro o checklist de deuda técnica.

---

## 🛠️ Procedimiento de 3 Pasos Obligatorios

### Paso 1: Generar Informe Técnico Correlativo en `informes/`
Crear un nuevo archivo Markdown con numeración correlativa inmediata (ej: `informes/NN-Nombre-Del-Cambio.md`) con la siguiente estructura estándar:

```markdown
# NN — [Título Descriptivo del Cambio Arquitectónico]

> **Fecha:** [Fecha actual]  
> **Área:** [Firmware ESP32 / SCADA React / Firebase / Algoritmo de Control]  
> **Estado:** ✅ [Implementado y Verificado / En Pruebas]  
> **Referencia:** [Auditoría Integral V3](../docs/AUDITORIA_INTEGRAL_V3_2026-08-14.md) | [Informe Maestro](../docs/INFORME_MAESTRO_AGRIEDGE_OS.md)

---

## 1. Justificación Técnica y Planteamiento del Problema
- Explicación del problema físico, agronómico o computacional que motivó el cambio.
- Fórmulas matemáticas o termodinámicas aplicadas si corresponde.

## 2. Descripción de la Solución e Implementación
- Lógica algorítmica aplicada.
- Reglas de control, estados, histéresis o validaciones integradas.

## 3. Matriz de Archivos Modificados
| Archivo | Cambio Realizado |
| :--- | :--- |
| `ruta/al/archivo` | Resumen técnico del cambio |

## 4. Estado de Validación y Pruebas
- Pruebas unitarias, compilación PlatformIO o validación TypeScript (`tsc --noEmit`).
- Comprobación de casos borde y ausencia de efectos colaterales.
```

---

### Paso 2: Actualizar el `ROADMAP.md`
En el archivo [ROADMAP.md](../../ROADMAP.md):
- Si el ítem ya existía: marcarlo como completado con `~~` y añadir `✅ COMPLETADO ([Informe NN](./informes/NN-...md))`.
- Si es una mejora no planificada: incorporarlo en la fase correspondiente con su referencia al informe técnico generado.

---

### Paso 3: Actualizar el `docs/CHECKLIST_CORRECCIONES_DEUDA_TECNICA.md`
En el archivo [CHECKLIST_CORRECCIONES_DEUDA_TECNICA.md](../../docs/CHECKLIST_CORRECCIONES_DEUDA_TECNICA.md):
- Marcar la casilla `- [x]` del ítem correspondiente.
- Especificar el problema corregido, la acción realizada y el estado de validación empírica.
- Si corresponde a un nuevo ítem de deuda técnica resuelto, crear la entrada correlativa `#NN`.

---

### Paso 4: Sincronizar `ESP32_ARCH.md` (Si involucra Firmware / Hardware / Algoritmo)
En el archivo [ESP32_ARCH.md](../../ESP32_ARCH.md):
- Si el cambio afectó la lógica C++, pines, estados operacionales o módulos del microcontrolador: actualizar la sección técnica correspondiente.
- Actualizar la tabla de la **Sección 7 (Matriz de Deuda Técnica)** marcando como `✅ Resuelto` el problema abordado.

---

## 🔒 Regla de Integridad
**Ningún cambio estructural se considera finalizado hasta que todos los documentos aplicables hayan sido actualizados y verificados.**
