# Walkthrough: Dashboard Web (Sprint 10)

Hemos completado la construcción del Dashboard Web moderno en React conectado directamente a la nube.

## 🚀 Cambios Implementados

### 1. Limpieza de Seguridad
- [x] Eliminamos las credenciales Wi-Fi (SSID/Password) de la antigua configuración en `main.cpp` porque ya no eran necesarias (estamos utilizando el Portal Cautivo para obtenerlas). Esto mejora notablemente la seguridad de tu repositorio.

### 2. Conexión de React con Firebase
- [x] Instalamos el SDK oficial de `firebase` en el frontend.
- [x] Agregamos un archivo oculto `.env` (que ignora GitHub) para almacenar de manera segura tu `API_KEY` y la `DATABASE_URL`.
- [x] Configuramos e inicializamos Firebase en `src/config/firebase.ts`.

### 3. Sincronización en Tiempo Real
- [x] Se eliminó el antiguo archivo `apiService.ts` que se comunicaba localmente por HTTP (lo que solías arrancar en la carpeta `backend_node`).
- [x] Se creó `firebaseService.ts` el cual escucha de manera activa la ruta de Firebase: `/telemetry` 
- [x] Actualizamos el `App.tsx` para abandonar el ciclo `setInterval` de 5 segundos. Ahora, cada vez que el ESP32 actualice algo en Firebase, la pantalla web cambiará instantáneamente por WebSockets, mostrando los valores de Temperatura, Humedad y NTC en un instante.

### 4. Interfaz Gráfica de Control (UI)
- [x] En `App.tsx` integramos el panel de control estético (diseñado con Vanilla CSS / Tailwind) para **Luz, Niebla, Extractor y Manta Calefactora**.
- [x] Cada vez que le des click a uno de estos botones interactivos en el navegador, React escribirá en la ruta de Firebase `/devices/ESP32_.../commands/`, notificándole a tu microcontrolador que encienda los relés respectivos de manera manual.

## ✅ Validación 
El proyecto se ha compilado exitosamente con TypeScript (`npm run build`). ¡No hay errores de tipos!

## Siguientes Pasos
Para ver tu Dashboard en funcionamiento, solo tienes que:
1. Abrir una nueva terminal.
2. Navegar a la carpeta del frontend: `cd C:\Users\lagos\OneDrive\Desktop\ESP32Proyecto - Industrial\Node-monitor-iot-backend\proyecto_iot-code-workspace\frontend_react`
3. Ejecutar: `npm run dev`
4. Abrir en tu navegador `http://localhost:5173`
