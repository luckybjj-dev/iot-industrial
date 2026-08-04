# Frente 2: Dashboard Industrial (SCADA) en React

Este plan describe la arquitectura y los pasos para transformar el actual frontend en un Dashboard tipo SCADA (Supervisory Control and Data Acquisition) de nivel industrial. El objetivo es proporcionar una interfaz robusta que conecte el Rule Engine (recién construido en el ESP32) con una experiencia de usuario inmersiva, clara y segura.

## Propuesta de Diseño e Interfaz

- **Estética Industrial (HMI - Human Machine Interface):** Se utilizará un modo oscuro por defecto (`#121212` / fondos grises plomo) contrastado con colores flúor (verde esmeralda, rojo alerta, cian) para fácil lectura a distancia.
- **Hero Cards (Métricas Principales):** Tarjetas de gran tamaño para las variables críticas (Temp. Ambiente, Humedad, Temp. Sustrato, VPD, CO2) usando `recharts` para mini-gráficos (sparklines) de tendencia en cada tarjeta.
- **Semáforo de Clima Estable:** Un componente global (o por invernadero) que agregue el estado de las métricas. Mostrará un ✅ (Verde) si todo está dentro de los rangos de las reglas, o un ❌ (Rojo/Naranja) indicando qué métrica está fallando (Ej: "Alerta: Temperatura excede umbral de 30°C").

## User Review Required

> [!WARNING]
> **Cambio de Paradigma: Editor de Reglas**
> Actualmente, en el código C++, el ESP32 lee un arreglo de hasta 20 reglas (el Motor de Reglas Declarativo). Para aprovechar esto, necesitamos construir una pantalla (o modal) en React que te permita inyectar este JSON de reglas directamente a Firebase. 
> ¿Deseas que incluyamos el **Editor Visual de Reglas** en este Sprint, o prefieres que por ahora mantengamos solo el panel de lectura y control manual (Overrides)?

> [!NOTE]
> **Overrides y Feedback Visual**
> Cuando un actuador se fuerce a MANUAL, el botón cambiará drásticamente de diseño (por ejemplo, a un color naranja parpadeante o de advertencia) para recordarte visualmente que el sistema está ignorando el Rule Engine y que el cronómetro de 15 minutos está corriendo.

## Open Questions

> [!IMPORTANT]
> 1. **Diseño de "Semáforo":** ¿Quieres que el semáforo simplemente evalúe las últimas lecturas contra umbrales estáticos que configuremos en el Frontend, o prefieres que lea las Reglas actuales desde Firebase para calcular si está en verde o rojo?
> 2. **Datos Históricos:** Actualmente tienes un componente `HistoryChart`. ¿Quieres que lo mantenga tal cual, o lo mejoramos (ej. agrupar múltiples variables en un solo gráfico grande, estilo Grafana)?

## Proposed Changes

---

### Rediseño de App.tsx y Estructura
Vamos a desglosar el mastodóntico `App.tsx` en pequeños componentes reutilizables.

#### [MODIFY] [App.tsx](file:///C:/Users/lagos/OneDrive/Desktop/ESP32Proyecto%20-%20Industrial/Node-monitor-iot-backend/proyecto_iot-code-workspace/frontend_react/src/App.tsx)
- Reestructurar el grid layout para priorizar las **Hero Cards**.
- Incorporar el nuevo componente `SemaforoEstabilidad`.
- Mejorar la sección de Actuadores (Control Manual) añadiendo el estado "Override Activo" con contadores de tiempo estimados en UI.

#### [NEW] [SemaforoEstabilidad.tsx](file:///C:/Users/lagos/OneDrive/Desktop/ESP32Proyecto%20-%20Industrial/Node-monitor-iot-backend/proyecto_iot-code-workspace/frontend_react/src/components/SemaforoEstabilidad.tsx)
- Componente visual que consolida el estado del nodo. Muestra alertas grandes si los sensores principales cruzan los Failsafes o umbrales definidos.

#### [MODIFY] [MetricCard.tsx](file:///C:/Users/lagos/OneDrive/Desktop/ESP32Proyecto%20-%20Industrial/Node-monitor-iot-backend/proyecto_iot-code-workspace/frontend_react/src/components/MetricCard.tsx)
- Ampliar la tarjeta para incluir micro-tendencias (ej. "+1.2°C en la última hora") e integrarla visualmente al estilo SCADA.

---

### Integración de Reglas en Firebase

#### [MODIFY] [firebaseService.ts](file:///C:/Users/lagos/OneDrive/Desktop/ESP32Proyecto%20-%20Industrial/Node-monitor-iot-backend/proyecto_iot-code-workspace/frontend_react/src/services/firebaseService.ts)
- Añadir método `sendConfigRules(deviceId, rulesArray)` para inyectar el arreglo JSON de `ReglaTermodinamica[]` hacia la ruta `/devices/{deviceId}/commands/reglas`.

#### [NEW] [RuleEditorModal.tsx](file:///C:/Users/lagos/OneDrive/Desktop/ESP32Proyecto%20-%20Industrial/Node-monitor-iot-backend/proyecto_iot-code-workspace/frontend_react/src/components/RuleEditorModal.tsx)
- (Opcional, sujeto a User Review): Interfaz para crear/editar visualmente las reglas (Ej: Seleccionar `TEMP`, `MENOR_QUE`, `20`, `CALEFACTOR`, `ENCENDIDO`).

## Verification Plan

### Manual Verification
1. Correr el entorno de desarrollo local con `npm run dev`.
2. Validar que la interfaz escale correctamente en móviles y pantallas grandes (Responsive HMI).
3. Simular el apagado/encendido del Modo Manual y observar los cambios de color/alertas visuales en el Dashboard.
4. Confirmar que el Semáforo de Clima evalúa correctamente los umbrales enviando datos simulados a Firebase.
