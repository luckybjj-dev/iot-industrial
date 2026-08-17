# INFORME TÉCNICO N° 27 — Cierre de Sprint: Control Manual Aislado por Subruta y Certificación de Versión Estable

**Proyecto:** AgriEdge OS — Invernadero Industrial / Cámara Fungi  
**Fecha:** 16 de Agosto de 2026  
**Autor:** Antigravity AI (Pair Programming con el Usuario)  
**Versión / Tag:** `v1.0.0-stable`  
**Estado:** ✅ Aprobado y Validado Empíricamente en Hardware y SCADA (Tier 1 & Tier 2)

---

## 1. Resumen Ejecutivo

En este cierre de sprint se completó la resolución definitiva del control manual de actuadores (Ítem #3 del checklist de auditoría), eliminando cualquier sobreescritura masiva de relés, colisiones en el stream de Firebase RTDB o perturbaciones en el bus del display TFT.

El sistema completo (Firmware ESP32 + SCADA React) queda formalmente certificado como **Versión Estable (`v1.0.0-stable`)**.

---

## 2. Desglose de Mejoras y Correcciones Técnicas

1. **Despacho Quirúrgico por Subruta Hija (Aislamiento Total):**
   * Refactorizada la función `sendCommand` en [`frontend_react/src/services/firebaseService.ts`](../frontend_react/src/services/firebaseService.ts) para despachar valores booleanos directos (`PUT true/false`) a subrutas individuales (`/devices/${deviceId}/commands/${actuator}.json`).
   * Eliminado el envío de objetos compuestos (`PATCH` a la raíz `/commands`) que resucitaba estados retenidos antiguos de otros relés.
2. **Inicialización Limpia en Modo Manual:**
   * En `sendModeCommand`, al ingresar a `MANUAL`, se inicializan limpiamente todas las claves de actuadores en `false` en Firebase RTDB para garantizar que el operador arranque siempre desde reposo seguro.
3. **Bypass Determinista de Anti-Short-Cycle en Manual:**
   * En [`edge_esp32/src/HardwareController.cpp`](../edge_esp32/src/HardwareController.cpp), las llamadas manuales (`setLight`, `setHeater`, `setCooler`, `setFogger`, `setExtractor`) ejecutan `_ejecutarAccion(..., ignorarFiltro = true)`, permitiendo que la voluntad del operador humano accione físicamente el pin en $0\,\text{ms}$.
4. **Actualización de Documentación Arquitectónica Viva:**
   * Sincronizado [`docs/ALGORITMO_CONTROL_MICROCLIMA.md`](../docs/ALGORITMO_CONTROL_MICROCLIMA.md) a la **Revisión 3.3.0**, incorporando el modo Standby, la dinámica de subrutas aisladas y la matriz de protecciones.

---

## 3. Matriz de Validación y Pruebas

| Capa | Prueba Realizada | Resultado |
|---|---|:---:|
| **Firmware ESP32** | Compilación PlatformIO (`pio run`) y Flasheado en puerto físico `COM9` | ✅ **SUCCESS (37.9s)** |
| **SCADA React** | Build estricto de producción (`tsc -b && vite build`) | ✅ **0 Errores / 0 Warnings** |
| **RTDB Downlink** | Script de prueba de subrutas individuales y modo de operación | ✅ **100% Exitoso** |
| **Validación Empírica** | Conmutación física individual de cada relé en hardware real por el usuario | ✅ **APROBADO EN VIVO** |

---

## 4. Conclusión y Etiquetado

El microcontrolador y el panel SCADA operan de forma 100% determinista, reactiva y desacoplada. Se marca formalmente este hito con la bandera y tag **`v1.0.0-stable`**.
