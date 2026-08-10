# Crop Steering Algorítmico Dinámico (Revisión V2)

Me parece una decisión arquitectónica brillante. Define exactamente un modelo extensible (Fases de Máquina de Estado) con transiciones progresivas, muy alineado con la realidad biológica y la filosofía Lean Startup.

## User Review Required

> [!IMPORTANT]
> **Estructura de Datos del Perfil (JSON)**
> Revisa la estructura JSON propuesta abajo para asegurar que cumple con tu visión de "Fases Discretas + Estrategia de Transición". Si la apruebas, procederé a reescribir el motor en Node.js.

## Propuesta de Arquitectura (Niveles 1, 2 y 3)

He rediseñado la interfaz en TypeScript para soportar tu visión de escalones y transiciones lineales:

```typescript
export interface TransitionStrategy {
    durationHours: number;       // Tiempo que tomará la transición
    strategy: 'STEP' | 'LINEAR'; // 'STEP' (Inmediato) o 'LINEAR' (Interpolación)
}

export interface CropPhase {
    name: string;
    durationDays: number; // Duración base de la fase (excluyendo la transición, o incluyéndola)
    config: {
        temp_ideal_min: number;
        temp_ideal_max: number;
        // ... demás variables
    };
    transitionToNext?: TransitionStrategy; 
}
```

### Comportamiento del Motor (Steering Engine)

El motor (`node-cron`) se ejecutará cada 1 hora y calculará en qué punto de la línea de tiempo nos encontramos:
1. **Fase Estable**: Si estamos dentro del tiempo base de la fase, envía los setpoints estáticos de la `CropPhase` actual (Comportamiento *Escalón*).
2. **Fase de Transición**: Si estamos en el tramo final de la fase (determinado por `durationHours` de la transición hacia la siguiente fase), el motor:
   - Mirará los setpoints de la *Fase Actual*.
   - Mirará los setpoints de la *Fase Siguiente*.
   - Calculará el porcentaje de progreso de la transición (ej. hora 24 de 48 = 50%).
   - Aplicará interpolación lineal para todas las variables numéricas y enviará los setpoints intermedios al ESP32.

### Ejemplo Práctico (Incubación a Pinning)

```json
{
  "deviceId": "ESP32_1",
  "startDateISO": "2026-08-01T00:00:00Z",
  "phases": [
    {
      "name": "Incubacion",
      "durationDays": 15,
      "config": { "temp_ideal_min": 24, "hum_ideal_min": 90 },
      "transitionToNext": {
        "durationHours": 48,
        "strategy": "LINEAR"
      }
    },
    {
      "name": "Pinning",
      "durationDays": 5,
      "config": { "temp_ideal_min": 18, "hum_ideal_min": 95 }
    }
  ]
}
```
**Línea de tiempo del motor para este ejemplo:**
- **Días 1 al 13**: La cámara se mantiene a `24°C` y `90%`.
- **Día 14 y 15 (Últimas 48 horas de Incubación)**: El motor empieza a bajar la temperatura de `24°C` hacia `18°C` de forma continua (aprox `-0.12°C` cada hora) y subiendo la humedad.
- **Día 16 en adelante**: Arranca la fase de Pinning firme a `18°C`.

## Open Questions

> [!WARNING]
> ¿Prefieres que las horas de `transitionToNext` se **resten** del `durationDays` de la fase actual (como en el ejemplo de arriba, donde la transición ocurre en los últimos 2 días de los 15), o prefieres que se **sumen** (15 días estables + 2 días extras de transición)?
