# Implementación del Motor de Fases (Niveles 1, 2 y 3)

¡Excelente decisión arquitectónica! Hemos dejado atrás la simple línea de tiempo para adoptar una **Máquina de Estados de Fases Discretas**, que encaja a la perfección con el comportamiento biológico real de los hongos y mantiene el proyecto Lean y extensible.

## Arquitectura V2 Implementada

Hemos refactorizado [`steeringEngine.ts`](file:///c:/Users/lagos/OneDrive/Desktop/ESP32Proyecto%20-%20Industrial/Node-monitor-iot-backend/proyecto_iot-code-workspace/backend_node/src/steeringEngine.ts) para que su lógica central se divida en los 3 niveles que propusiste:

- **Nivel 1 (Fases)**: El sistema evalúa continuamente en qué "estado biológico" se encuentra la cámara basado en las condiciones de salida (`exitCondition`). 
- **Nivel 2 (Setpoints)**: Cada fase envía sus variables objetivo ambientales.
- **Nivel 3 (Transiciones)**: Si una fase declara que su paso a la siguiente fase tiene una transición suave (ej. estrategia `LINEAR`), el motor tomará las últimas horas de esa fase para ir acercando gradualmente la temperatura, humedad y CO2 hacia los objetivos de la siguiente fase biológica.

## 🚀 Preparado para Transiciones Condicionales

El código ya quedó con los "cimientos" para soportar transiciones basadas en eventos y no solo en tiempo. La interfaz `PhaseCondition` está diseñada así:

```typescript
export interface PhaseCondition {
    type: 'TIME' | 'TELEMETRY' | 'MANUAL';
    
    // Si es basada en calendario:
    durationDays?: number; 
    
    // Si es basada en biomasa/CO2 (Futuro):
    metric?: string; // ej. 'co2' o 'colonizacion'
    operator?: '>' | '<' | '>=' | '<=';
    value?: number;
}
```

En el futuro, en lugar de calcular solo `diffHours < horasAcumuladas`, el motor simplemente leerá el mapa en memoria de Node.js (`telemetriaRecibida.get(deviceId)`), y si por ejemplo el CO2 cae drásticamente (señal de madurez), **gatillará automáticamente el paso a Fructificación** sin importar qué día del calendario sea.

## Estructura JSON del MVP

Puedes iniciar un plan dinámico desde el frontend, enviando el siguiente cuerpo JSON a `POST http://localhost:3000/api/cultivo/steering/start`:

```json
{
  "deviceId": "ESP32_Fungi_A1",
  "startDateISO": "2026-08-01T00:00:00Z",
  "phases": [
    {
      "name": "Incubacion",
      "exitCondition": { "type": "TIME", "durationDays": 15 },
      "config": {
        "kingdom": "Fungi",
        "temp_ideal_min": 24,
        "temp_ideal_max": 25,
        "hum_ideal_min": 85,
        "hum_ideal_max": 90,
        "co2_ideal_max": 2000,
        "light_hours_on": 0
      },
      "transitionToNext": {
        "durationHours": 48,
        "strategy": "LINEAR"
      }
    },
    {
      "name": "Pinning",
      "exitCondition": { "type": "TIME", "durationDays": 5 },
      "config": {
        "kingdom": "Fungi",
        "temp_ideal_min": 18,
        "temp_ideal_max": 20,
        "hum_ideal_min": 95,
        "hum_ideal_max": 98,
        "co2_ideal_max": 800,
        "light_hours_on": 12
      }
    }
  ]
}
```
*En este ejemplo, la Incubación durará 15 días exactos. A partir del día 13, el sistema empezará una transición Lineal de 48 horas hacia los setpoints del Pinning, bajando 0.12°C por hora.*
