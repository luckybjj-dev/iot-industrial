# Resumen de Implementación: Frontend Modos de Operación

Se han implementado con éxito los modos de operación Automático y Manual directamente en la interfaz del **Dashboard Web (React)**. Estos cambios brindan mayor control y previenen la manipulación accidental del equipo cuando este se encuentra gestionando el clima de forma autónoma.

## Cambios Realizados

1. **Gestión de Estado (Types y Firebase)**
   - Se extendió el modelo de datos `EstadoCamara` (en [cultivo.ts](file:///C:/Users/lagos/OneDrive/Desktop/ESP32Proyecto%20-%20Industrial/Node-monitor-iot-backend/proyecto_iot-code-workspace/frontend_react/src/types/cultivo.ts)) para aceptar la propiedad `modo_operacion`.
   - El servicio `firebaseService.ts` fue modificado para interceptar la lectura de este nuevo estado desde la base de datos y adjuntarlo a la tarjeta de cada cámara.
   - Se implementó la nueva función asíncrona `sendModeCommand` para enviar el cambio de estado a la ruta `/commands/modo_operacion`.

2. **Interfaz de Usuario y UX (App.tsx)**
   - **Botón de Modo (Header):** Se añadió un botón en la cabecera del nodo que indica explícitamente el modo actual y permite cambiarlo entre `AUTO` y `MANUAL` al hacer clic. Utiliza código de colores (Azul para Auto, Naranja para Manual) para un reconocimiento visual rápido.
   - **Interlock Visual (Bloqueo de UI):** Cuando el sistema está en `AUTO`, todos los botones del panel de "Control Manual" (Niebla, Extractor, Calefacción, Iluminación) quedan automáticamente deshabilitados (`disabled`).
   - **Feedback de Bloqueo:** Se incluyó un mensaje de alerta suave en la interfaz: *"Control bloqueado. El sistema opera en modo Automático."*, además de alterar la opacidad de los botones y cambiar el cursor para indicar la restricción al usuario final.
   - **Seguridad Adicional:** La función interna que envía las órdenes de control a Firebase fue reforzada. Si el frontend cree que está en `AUTO`, bloquea silenciosamente cualquier click accidental que haya podido sobrepasar el bloqueo visual.

## Verificación

Para probar los cambios, ejecuta el servidor de desarrollo local del Dashboard:
```bash
cd frontend_react
npm run dev
```

Al cargar la aplicación web y recibir los datos del nodo conectado:
1. El botón de **MODO** en la parte superior derecha de la tarjeta indicará el modo actual.
2. Comprueba que, estando en modo **AUTO**, los botones inferiores se ven atenuados y bloqueados.
3. Haz clic en el botón **MODO: AUTO** para pasarlo a **MODO: MANUAL**; la interfaz debería desbloquearse instantáneamente permitiendo el control sobre los actuadores.
