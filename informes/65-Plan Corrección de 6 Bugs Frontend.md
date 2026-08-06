# Plan: Corrección de 6 Bugs Frontend

## Diagnóstico Completo

| # | Bug Reportado | Causa Raíz | Archivo |
|---|---|---|---|
| 1 | "Fijar Ajustes" no guarda | Solo llama `setIsEditing(false)`, no persiste nada | `CropProfileSelectorModal.tsx` |
| 2 | No inyecta al ESP32 automáticamente | Inyección solo ocurre en el footer, no al fijar | `CropProfileSelectorModal.tsx` |
| ➕ | Fotoperiodo sin validación | Input texto libre, puede ingresar L+O > 24h | `CropProfileSelectorModal.tsx` |
| 3 | Relé de luz no responde en MANUAL | `sendCommand` escribe en `/commands/` (raíz) — llega al ESP32 como path `/commands` en vez de `/commands/light_on`, activando la rama de JSON en vez de la rama de primitivos que es más robusta | `firebaseService.ts` |
| 4 | "Cargando MQTT" al recargar | Texto del spinner desactualizado | `App.tsx` |
| 5 | Combo box no recarga el cronómetro | `onChange` actualiza Firebase pero **no resetea `manualStartTimes`** — el timer sigue desde la hora de inicio MANUAL original, no desde 00:00 del tiempo nuevo | `App.tsx` |
| 6 | No vuelve a AUTO al llegar a cero | No existe ningún `useEffect` que detecte `remaining === 0` y llame `sendModeCommand('AUTO')` — el revert depende solo del ESP32 | `App.tsx` |

---

## Cambios Propuestos

---

### `App.tsx` — 3 fixes

#### Fix #4: Texto spinner
```diff
- Estableciendo conexión MQTT / RTDB...
+ Conectando con Firebase RTDB...
```

#### Fix #5: Combo resetea el cronómetro
Cuando el usuario cambia el tiempo del select, además de enviar a Firebase, se resetea el `manualStartTimes` para ese dispositivo a `Date.now()`. Así el countdown arranca desde el valor elegido.

```typescript
onChange={(e) => {
  const val = parseInt(e.target.value);
  updateConfigField(camara.deviceId, 'max_manual_time_ms', val);
  // NUEVO: resetear el inicio del cronómetro
  setManualStartTimes(prev => ({ ...prev, [camara.deviceId]: Date.now() }));
}}
```

#### Fix #6: Auto-revertir a AUTO al llegar a cero
Nuevo `useEffect` que vigila el tiempo restante de cada cámara en MANUAL. Cuando llega a 0, envía `sendModeCommand(deviceId, 'AUTO')` automáticamente desde React. Esto cubre el caso en que el ESP32 no pueda procesar el comando.

```typescript
useEffect(() => {
  camaras.forEach(camara => {
    const modo = optimisticModes[camara.deviceId] || camara.modo_operacion;
    if (modo !== 'MANUAL') return;

    const start = manualStartTimes[camara.deviceId];
    if (!start) return;

    const config = configs[camara.deviceId];
    const timeoutMs = (config?.max_manual_time_ms >= 60000) ? config.max_manual_time_ms : 300000;
    const elapsed = now - start;

    if (elapsed >= timeoutMs) {
      // Timeout alcanzado: forzar AUTO desde React también
      sendModeCommand(camara.deviceId, 'AUTO').then(() => {
        setOptimisticModes(prev => ({ ...prev, [camara.deviceId]: 'AUTO' }));
        setManualStartTimes(prev => {
          const next = { ...prev };
          delete next[camara.deviceId];
          return next;
        });
      });
    }
  });
}, [now]); // Se evalúa cada segundo gracias al ticker de now
```

---

### `firebaseService.ts` — Fix #3

`sendCommand` para actuadores escribe directamente en la ruta hija del campo:

```typescript
// ❌ ACTUAL: path llega como /commands al ESP32 → parseo JSON complejo
await update(commandRef, { [actuator]: state, timestamp: Date.now() });

// ✅ NUEVO: path llega como /commands/light_on al ESP32 → rama primitiva robusta
await set(childRef(database, `devices/${deviceId}/commands/${actuator}`), state);
```

---

### `CropProfileSelectorModal.tsx` — Fixes #1, #2 y Fotoperiodo

**Fix #1 y #2:** "Fijar Ajustes" = guardar en localStorage + inyectar al ESP32 inmediatamente.

**Fix fotoperiodo:**
- Separar en 2 inputs numéricos: horas de Luz y horas de Oscuridad
- Validador en tiempo real: suma debe ser exactamente 24h
- Indicador visual: 🟢 `8 + 16 = 24h ✓` / 🔴 `10 + 9 = 19h ✗ (faltan 5h)`
- "Fijar Ajustes" deshabilitado si suma ≠ 24

---

## Archivos a Modificar

| Archivo | Bugs que resuelve |
|---|---|
| [`App.tsx`](file:///C:/Users/lagos/OneDrive/Desktop/ESP32Proyecto%20-%20Industrial/Node-monitor-iot-backend/proyecto_iot-code-workspace/frontend_react/src/App.tsx) | #4 (MQTT), #5 (combo reset), #6 (auto revert) |
| [`firebaseService.ts`](file:///C:/Users/lagos/OneDrive/Desktop/ESP32Proyecto%20-%20Industrial/Node-monitor-iot-backend/proyecto_iot-code-workspace/frontend_react/src/services/firebaseService.ts) | #3 (relé luz) |
| [`CropProfileSelectorModal.tsx`](file:///C:/Users/lagos/OneDrive/Desktop/ESP32Proyecto%20-%20Industrial/Node-monitor-iot-backend/proyecto_iot-code-workspace/frontend_react/src/components/CropProfileSelectorModal.tsx) | #1, #2, fotoperiodo |

> [!IMPORTANT]
> El bug #3 (relé de luz) tiene **dos capas**: React + ESP32 firmware. Con este fix de React (ruta hija), el ESP32 debe responder correctamente porque el streamCallback ya maneja `path.indexOf("light_on") >= 0` correctamente. Si persiste después del fix, el paso siguiente es subir el firmware por USB con el monitor serial abierto.
