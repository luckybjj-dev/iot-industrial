# Plan de Acción: Modelo de Datos Industrial y Dashboard de Telemetría

Este plan define el rediseño arquitectónico de los datos en el Frontend para soportar múltiples granjas, zonas y nodos (ESP32), así como la implementación del Dashboard Analítico para visualización de telemetría en tiempo real.

## ⚠️ User Review Required

> [!WARNING]
> **Cambio Arquitectónico Importante:** Implementar este modelo de datos (ISA-95) significa que nuestro frontend dejará de estar "atado" a un único dispositivo (`deviceId: "ESP32_01"`). Pasaremos a una estructura jerárquica. Necesito tu confirmación para proceder con este refactor, ya que cambiará la forma en que los componentes React leen los datos.

## ❓ Open Questions / Respuestas al Feedback

> [!IMPORTANT]
> **Resolución de Almacenamiento (30 días):** ¡Para nada, 7 días no es el límite! Te explico la matemática: la capa gratuita de Firebase nos da 1GB (1,000 Megabytes). Si un ESP32 guarda un dato por minuto, 30 días seguidos pesan apenas **~1.7 MB**. Esto significa que podrías tener **casi 500 invernaderos conectados simultáneamente** guardando historiales de 30 días ¡sin salir de la capa gratuita!
> - **Estrategia acordada:** Guardaremos y graficaremos un historial de **30 días completos** por defecto en Firebase RTDB.

## Proposed Changes

### 1. Modelo de Datos Industrial (Jerarquía ISA-95)

#### [NEW] [DataModel.ts](file:///C:/Users/lagos/OneDrive/Desktop/ESP32Proyecto%20-%20Industrial/Node-monitor-iot-backend/proyecto_iot-code-workspace/frontend_react/src/types/DataModel.ts)
Se creará un nuevo archivo de tipos TypeScript para definir la topología física:
```typescript
interface Farm { id: string; name: string; rooms: Record<string, Room>; }
interface Room { id: string; name: string; zones: Record<string, Zone>; }
interface Zone { id: string; name: string; nodes: Record<string, Node>; }
interface Node { 
  id: string; 
  macAddress: string; 
  type: 'ESP32_AGNOSTIC'; 
  activeProfile?: { profileId: string; phaseId: string }; // Novedad: Saber qué cultiva
}
```

### 2. Dashboard de Telemetría (Gráficos y UX)

#### [NEW] [TelemetryDashboard.tsx](file:///C:/Users/lagos/OneDrive/Desktop/ESP32Proyecto%20-%20Industrial/Node-monitor-iot-backend/proyecto_iot-code-workspace/frontend_react/src/components/TelemetryDashboard.tsx)
- **Selector Jerárquico:** (Granja -> Sala -> Zona -> Nodo).
- **Indicador de Cultivo Activo:** Debajo del nodo, se mostrará claramente (Ej: `🍄 Shiitake -> Etapa: Fructificación`).
- **Gráficos Históricos (30 Días) y En Vivo:** Uso de `recharts` para T°, H% y VPD.

#### [MODIFY] [CropProfileSelectorModal.tsx](file:///C:/Users/lagos/OneDrive/Desktop/ESP32Proyecto%20-%20Industrial/Node-monitor-iot-backend/proyecto_iot-code-workspace/frontend_react/src/components/CropProfileSelectorModal.tsx)
- **Botón "Restablecer Valores Predeterminados":** En el modo *Tuning*, si el usuario modifica los valores y olvida los originales, un botón retornará los valores exactos definidos por la librería oficial.

### 3. Enciclopedia Agronómica 2.0 (Mejora Evolutiva)
- **Mejora de Contenido:** Se expandirá la estructura de `CropProfile` para incluir `imageUrl` (fotos de la especie) y `stageTips` (consejos específicos por cada etapa fenológica, no solo una descripción general).

## Verification Plan

### Automated Tests
- Compilación completa estricta en TypeScript (`npm run build`).

### Manual Verification
- Verificar que el botón "Restablecer" regrese los valores correctos.
- Comprobar que el Dashboard principal renderiza el nombre de la especie activa.
- Simular el guardado de telemetría de 30 días y visualizarlo en Recharts.
