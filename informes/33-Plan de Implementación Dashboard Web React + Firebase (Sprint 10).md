# Plan de Implementación: Dashboard Web React + Firebase (Sprint 10)

## Objetivo
Desarrollar y conectar el frontend existente en React (que actualmente apunta a un backend local en Node.js) directamente con Firebase Realtime Database (RTDB), culminando la arquitectura Serverless establecida en el Sprint 9.

## User Review Required

> [!WARNING]
> **Cambio Arquitectónico:** Este cambio desconectará la aplicación React del backend Node.js local (`http://localhost:3000/api`) y la conectará directamente a la nube (Firebase).

## Open Questions

> [!IMPORTANT]
> **1. Credenciales de Firebase:** Para inicializar Firebase en el frontend, necesitaré las credenciales de tu proyecto (el objeto `firebaseConfig` que incluye `apiKey`, `authDomain`, `databaseURL`, `projectId`, etc.). ¿Me las puedes proporcionar?
> 
> **2. Estructura del JSON en RTDB:** Necesito que me confirmes en qué ruta (path) exacta está escribiendo el ESP32 sus datos. Por ejemplo: ¿Están los datos en `devices/ESP32_01/telemetry`? Y para el control de relés, ¿existe una ruta de comandos como `devices/ESP32_01/control` que el ESP32 esté escuchando?

## Proposed Changes

---

### Dependencias y Configuración

#### [MODIFY] `frontend_react/package.json`
- Añadir la dependencia oficial de Firebase (`npm install firebase`).

#### [NEW] `frontend_react/src/config/firebase.ts`
- Inicialización de la App de Firebase y exportación de la instancia de `database` (RTDB).

---

### Lógica de Datos (Services)

#### [DELETE] `frontend_react/src/services/apiService.ts`
- Se elimina el servicio de *polling* HTTP (REST API).

#### [NEW] `frontend_react/src/services/firebaseService.ts`
- Se implementan funciones para suscribirse (`onValue`) a los cambios en RTDB en tiempo real para obtener la telemetría.
- Se implementan funciones para escribir (`set` / `update`) comandos de control hacia los actuadores en la base de datos.

---

### Interfaz de Usuario (UI)

#### [MODIFY] `frontend_react/src/App.tsx`
- **Integración de Tiempo Real:** Reemplazar `setInterval` por un listener de Firebase. Las métricas (Temperatura, Humedad, CO2) se actualizarán al instante sin recargar.
- **Panel de Control (Actuadores):** Incorporar botones *toggle* (interruptores) modernos para encender/apagar manualmente LUZ, CALEFACTOR, EXTRACTOR y NIEBLA. Estos botones escribirán en Firebase y mostrarán un feedback visual (ej. *loading* spinner) hasta que el ESP32 confirme el cambio de estado.
- **Mejoras Estéticas:** Aplicar animaciones suaves de transición en los botones y paneles usando TailwindCSS para mantener el nivel *Premium* del diseño.

## Verification Plan

### Manual Verification
1. **Compilación:** Ejecutar `npm run dev` y verificar que no hay errores de sintaxis o de TypeScript.
2. **Conexión en Tiempo Real:** Modificar un valor manualmente en la consola de Firebase RTDB web y ver cómo la interfaz en React se actualiza instantáneamente en milisegundos.
3. **Hardware en el Lazo (Opcional por ahora):** Presionar un botón en el Dashboard y verificar (si la placa está conectada) que el ESP32 activa el relé correspondiente a los pocos segundos.
