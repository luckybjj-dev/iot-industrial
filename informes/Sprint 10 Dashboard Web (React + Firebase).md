# Sprint 10: Dashboard Web (React + Firebase)

Este plan detalla la construcción de la interfaz gráfica web (Frontend) para monitorear y controlar el Invernadero Agnóstico desde cualquier dispositivo. Ya tenemos un esqueleto base en la carpeta `frontend_react` usando tecnologías modernas (Vite, React 19, Tailwind CSS 4, y TypeScript).

## 🎯 Objetivos del MVP Frontend
1. **Conexión a Firebase:** Leer en tiempo real los datos que el ESP32 está empujando a la Realtime Database.
2. **Visualización de Telemetría:** Tarjetas visuales para la Temperatura, Humedad, VPD y estado de la red.
3. **Estado de Actuadores:** Indicadores visuales para saber si la calefacción, el humidificador o el extractor están encendidos en tiempo real.

## User Review Required

> [!CAUTION]  
> **Variables de Entorno (.env):** Al igual que hicimos con `Secrets.h` en C++, el frontend necesita tu API Key de Firebase. Deberás crear un archivo `.env` en la carpeta `frontend_react` con estas credenciales. Yo te proporcionaré la plantilla exacta, pero tú deberás pegar tu apiKey real.

> [!IMPORTANT]  
> **Mac Address del ESP32:** En la consola de Firebase, el ESP32 está guardando los datos bajo su propia dirección MAC (ej. `telemetry/A0:B1:C2:D3:E4:F5/data`). Necesitarás copiar esa Mac Address exacta desde tu consola de Firebase para que el Frontend sepa a qué dispositivo escuchar.

## Proposed Changes

### Dependencias
- Instalación de la SDK web de Firebase:
```bash
npm install firebase
```

---

### [NEW] `frontend_react/.env`
Archivo local para almacenar el `VITE_FIREBASE_API_KEY` y `VITE_FIREBASE_DATABASE_URL`.

### [NEW] `frontend_react/src/config/firebase.ts`
Módulo de inicialización. Toma las variables de entorno, inicializa la app de Firebase Web y exporta la referencia a la base de datos (Realtime Database).

### [NEW] `frontend_react/src/hooks/useTelemetry.ts`
Un React Custom Hook que se suscribirá a la ruta `/telemetry/{deviceId}/data`. Retornará el estado actualizado automáticamente cada vez que el ESP32 envíe un nuevo pulso (cada 5 segundos).

### [MODIFY] `frontend_react/src/App.tsx`
El núcleo de la interfaz. Implementaremos un diseño oscuro moderno (Dark Mode) usando Tailwind CSS, que incluirá:
- **Cabecera (Header):** Mostrando el estado de conexión a Firebase.
- **Grid de Sensores:** 
  - Tarjeta de Temperatura (Termómetro)
  - Tarjeta de Humedad (Gota de agua)
  - Tarjeta de VPD (Déficit de Presión de Vapor)
- **Grid de Actuadores:**
  - Relé de Calor (CAL)
  - Relé de Humedad (NBL)
  - Relé de Extractor (EXT)
  - Relé de Luces (LUZ)

*(Para los íconos utilizaremos la librería `lucide-react` que ya tienes instalada).*

## Verification Plan

### Manual Verification
1. Ingresas tus credenciales en el archivo `.env`.
2. Lanzaremos el servidor de desarrollo local con `npm run dev`.
3. Abrirás tu navegador en `http://localhost:5173`.
4. El Dashboard debería cargar y mostrar los mismos datos que ves en tu pequeña pantalla TFT del ESP32, actualizándose mágicamente sin recargar la página.
