# Implementación de Gráficos Históricos en React (Firebase)

Este plan detalla los pasos para construir la **visualización de datos históricos** en tu aplicación web, consumiendo la bitácora que el ESP32 ahora está guardando en Firebase.

## Goal Description
Descargar los registros históricos desde el nodo `/history/<deviceId>/` en Firebase Realtime Database y graficarlos de manera profesional utilizando la librería `recharts`. Se implementará una pestaña o modal de "Historial" por cada dispositivo para no saturar la vista en vivo (Dashboard).

## User Review Required

> [!IMPORTANT]
> **Elección de Librería:** Propongo utilizar `recharts`, una de las librerías de gráficos más populares, maduras y limpias para React. ¿Estás de acuerdo con instalar esta dependencia en el frontend?
> 
> **Profundidad de los datos:** Por defecto, planeo descargar los últimos 100 registros de Firebase (aprox. 16 horas de datos a 10 min por muestra) para evitar sobrecargar el navegador y optimizar los costos de lectura de Firebase. ¿Te parece bien este límite inicial?

## Open Questions

> [!NOTE]
> 1. **Métricas a graficar:** ¿Qué variables consideras críticas para tener en el gráfico? Propongo graficar **Temperatura del Aire** y **Humedad Relativa** juntas en un mismo gráfico con dos ejes Y.
> 2. **Ubicación en UI:** ¿Prefieres que el gráfico histórico se muestre justo debajo de los botones de control manual al hacer clic en un botón "Ver Historial", o prefieres una vista completamente separada (modal/página)?

---

## Proposed Changes

### Dependencias del Proyecto
Se instalará la librería de gráficos.
- `npm install recharts`

### Capa de Servicios (Firebase)
Se añadirá una nueva función de consulta para obtener el historial.

#### [MODIFY] [firebaseService.ts](file:///C:/Users/lagos/OneDrive/Desktop/ESP32Proyecto - Industrial/Node-monitor-iot-backend/proyecto_iot-code-workspace/frontend_react/src/services/firebaseService.ts)
- Se implementará `fetchDeviceHistory(deviceId: string, limit: number)` usando consultas de Firebase (`query`, `orderByChild`, `limitToLast`).

### Tipos de Datos

#### [MODIFY] [cultivo.ts](file:///C:/Users/lagos/OneDrive/Desktop/ESP32Proyecto - Industrial/Node-monitor-iot-backend/proyecto_iot-code-workspace/frontend_react/src/types/cultivo.ts)
- Se añadirá una interfaz `HistorialData` para tipar correctamente los objetos que vienen del nodo `/history`.

### Componentes UI

#### [NEW] `src/components/HistoryChart.tsx`
- Componente dedicado a renderizar los gráficos de temperatura y humedad usando `recharts`. Incluirá un estado de carga mientras descarga los datos de Firebase.

#### [MODIFY] [App.tsx](file:///C:/Users/lagos/OneDrive/Desktop/ESP32Proyecto - Industrial/Node-monitor-iot-backend/proyecto_iot-code-workspace/frontend_react/src/App.tsx)
- Se añadirá un estado local para alternar entre "Vista en Vivo" y "Vista Histórica".
- Se añadirá un botón estilizado para abrir el panel histórico de cada cámara.

---

## Verification Plan

### Automated Tests / Compilación
- Ejecutaré `npm run build` para asegurar que las nuevas dependencias (recharts) y el tipado de TypeScript compilen correctamente sin errores.

### Manual Verification
- Te indicaré que inicies el servidor de desarrollo (`npm run dev`) para que valides visualmente los gráficos. Si el ESP32 ya ha enviado algunos puntos al historial, estos deberían renderizarse automáticamente.
