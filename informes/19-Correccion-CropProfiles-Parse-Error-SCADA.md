# 19 — Corrección Error de Parse en CropProfiles.ts y Limpieza de Imports SCADA React

> **Fecha:** 2026-08-15
> **Área:** SCADA React / Modelo de Datos (Perfiles de Cultivo)
> **Estado:** ✅ Implementado y Verificado (build 0 errores, 0 warnings)
> **Commit:** `92cbf96`
> **Referencia:** [Informe Maestro](../docs/INFORME_MAESTRO_AGRIEDGE_OS.md)

---

## 1. Justificación Técnica y Planteamiento del Problema

El servidor de desarrollo Vite (parser OXC) lanzaba un error fatal que impedía compilar el frontend:

```
[plugin:vite:oxc] Transform failed with 1 error:
[PARSE_ERROR] Unexpected token `{`  src/data/CropProfiles.ts:1735:11
```

**Defecto 1 — Fragmento huérfano dentro de targets:** En la fase `ripening` de Albahaca, el objeto `targets` estaba incompleto (solo `temperature`). Un fragmento de otra fase fue insertado dentro del objeto abierto, lo que causaba que el parser OXC encontrara `{` en contexto de clave de objeto.

**Defecto 2 — Claves duplicadas en CROP_PROFILES:** Los crops `plantae_solanum_melongena` y `plantae_mentha_spicata` quedaron definidos dos veces. TypeScript: TS1117.

**Defecto 3 — Imports no utilizados en TelemetryDashboard.tsx:** `AlertTriangle` y `StatsAccordion` importados pero nunca referenciados. TypeScript: TS6133.

---

## 2. Descripción de la Solución e Implementación

**2.1** Se corrigió el `targets` del ripening de Albahaca eliminando el fragmento basura y completando todos los campos del esquema con valores agronómicos correctos:

| Campo | Valor |
|:---|:---|
| temperature.day | 22–26 °C |
| temperature.night | 18–21 °C |
| humidity | 60–70 % RH |
| vpd | 0.8–1.2 kPa |
| co2 | 800–1000 ppm |
| fae | 4–6 ACH |
| lighting.photoperiod | 16/8 h |

**2.2** Se eliminaron 170 líneas de bloques duplicados (Berenjena × 2, Menta × 2) vía PowerShell.

**2.3** Se removieron los imports no utilizados de TelemetryDashboard.tsx.

---

## 3. Matriz de Archivos Modificados

| Archivo | Cambio |
|:---|:---|
| `frontend_react/src/data/CropProfiles.ts` | Corregir targets incompleto de Albahaca ripening; eliminar 170 líneas de crops duplicados |
| `frontend_react/src/components/TelemetryDashboard.tsx` | Remover imports no utilizados: AlertTriangle, StatsAccordion |

---

## 4. Estado de Validación y Pruebas

| Prueba | Resultado |
|:---|:---|
| tsc -b (TypeScript strict) | ✅ 0 errores |
| vite build (OXC parser) | ✅ 0 errores de parse |
| Módulos transformados | ✅ 2381 módulos |
| Bundle generado | ✅ dist/ 935 kB (gzip: 269 kB) |
| Claves duplicadas en CROP_PROFILES | ✅ Eliminadas |
