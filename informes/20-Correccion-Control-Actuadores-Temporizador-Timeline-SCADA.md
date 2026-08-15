# 20 — Corrección de Control de Actuadores, Temporizador Manual y Timeline de Fases en SCADA React

> **Fecha:** 15 de Agosto de 2026  
> **Área:** SCADA React / Firebase RTDB / Algoritmo de Control  
> **Estado:** ✅ Implementado y Verificado  
> **Referencia:** [Auditoría Integral V3](../docs/AUDITORIA_INTEGRAL_V3_2026-08-14.md) | [Checklist Deuda Técnica](../docs/CHECKLIST_CORRECCIONES_DEUDA_TECNICA.md)

---

## 1. Justificación Técnica y Planteamiento del Problema

Durante las pruebas de control en tiempo real del SCADA, se detectaron tres anomalías funcionales críticas que afectaban la experiencia del operador y la precisión del comando sobre el hardware ESP32:

1. **Race Condition en Control Manual de Relés:**  
   Al presionar un botón de actuador manual (Fogger, Extractor, Calefactor, etc.), el comando enviado a Firebase `commands/{actuator}` era descartado silenciosamente por el firmware del ESP32 (`HardwareController::setHeater/setFogger/etc.` bloquea el comando con `if (_modoActual == ModoOperacion::AUTO) return;`) si el estado `modo_operacion` en el hardware aún no había procesado la transición a `MANUAL`. Esto generaba que los clics del usuario no encendieran el relé correspondiente en el primer intento.
2. **Temporizador Manual con Retraso en Inicio:**  
   Al presionar `OVERRIDE MANUAL`, el cronómetro regresivo de seguridad (`manualStartTimes`) no comenzaba de inmediato en la UI porque esperaba el eco del stream de Firebase RTDB, generando un retardo perceptible y sensación de congelamiento.
3. **Desborde de Contenedor en Timeline de Fases Biológicas:**  
   En `CropStatePanel.tsx`, la barra horizontal y los tooltips de las fases de cultivo se renderizaban pegados a los bordes exteriores y con `overflow-hidden`, provocando que el primer y último nodo del ciclo biológico desbordaran o se cortaran visualmente fuera de la tarjeta contenedora.

---

## 2. Descripción de la Solución e Implementación

### A. Despacho Atómico de Modo y Actuador en Firebase RTDB (`firebaseService.ts`)
Se refactorizó `sendCommand` para realizar una actualización atómica en la raíz `/devices/{deviceId}/commands` usando `update(commandsRef, { modo_operacion: 'MANUAL', [actuator]: state })`. De esta forma, el payload SSE recibido por el ESP32 garantiza que la propiedad `modo_operacion` se procese siempre en el mismo paquete antes o junto con el estado booleano del actuador, eliminando toda condición de carrera.

### B. Feedback Optimista y Arranque Instantáneo del Temporizador (`App.tsx`)
1. **Estado Optimista de Actuadores (`optimisticActuators`):** Los botones de relé reflejan su nuevo estado inmediatamente al hacer clic, con auto-reversión en caso de error de red y reconciliación reactiva cuando la telemetría real del ESP32 confirma el cambio.
2. **Arranque Instantáneo del Timer:** En `handleToggleMode`, al conmutar a `MANUAL`, se registra de inmediato `manualStartTimes[deviceId] = Date.now()`, iniciando el conteo regresivo sin depender de latencias de red.

### C. Ajuste de Padding y Tooltips Dinámicos (`CropStatePanel.tsx`)
1. **Aislamiento de Bordes:** Se envolvió el timeline en una tarjeta interna `bg-black/40 border border-white/5 rounded-xl` con padding horizontal `px-3` y barra conectora centrada `left-4 right-4`.
2. **Alineación Inteligente de Tooltips:** El primer nodo alinea su tooltip a la izquierda (`left-0`), el último a la derecha (`right-0`), y los intermedios centrados (`-translate-x-1/2 left-1/2`).
3. **Visibilidad Completa:** Se cambió el contenedor padre a `overflow-visible` para permitir el despliegue fluido de los tooltips flotantes sin cortes.

---

## 3. Matriz de Archivos Modificados

| Archivo | Cambio Realizado |
| :--- | :--- |
| [`frontend_react/src/services/firebaseService.ts`](file:///c:/Users/lagos/PROYECTOS/ESP32Proyecto%20-%20Industrial/monitor-iot-backend/proyecto-iot-code-workspace/frontend_react/src/services/firebaseService.ts) | Envío atómico de `{ modo_operacion: 'MANUAL', [actuator]: state }` en `sendCommand`. |
| [`frontend_react/src/App.tsx`](file:///c:/Users/lagos/PROYECTOS/ESP32Proyecto%20-%20Industrial/monitor-iot-backend/proyecto-iot-code-workspace/frontend_react/src/App.tsx) | Estado optimista `optimisticActuators`, inicio instantáneo del temporizador manual en `handleToggleMode` y reconciliación en telemetría. |
| [`frontend_react/src/components/CropStatePanel.tsx`](file:///c:/Users/lagos/PROYECTOS/ESP32Proyecto%20-%20Industrial/monitor-iot-backend/proyecto-iot-code-workspace/frontend_react/src/components/CropStatePanel.tsx) | Rediseño de timeline con padding interior, barra centrada, tooltips dinámicos (`left-0`, `right-0`) y `overflow-visible`. |

---

## 4. Estado de Validación y Pruebas

- **TypeScript Typecheck (`tsc -b`):** 0 errores, 0 advertencias de tipado.
- **Build de Producción Vite (`npm run build`):** 2381 módulos transformados exitosamente en 8.01s sin errores de bundle.
- **Integridad de Algoritmo:** Conmutación atómica validada con el firmware C++ (`HardwareController.cpp` y `FirebaseManager.cpp`).
