# 🚀 Resumen del Sprint 11: Control Bidireccional

¡Hemos cruzado una frontera vital! El ESP32 ya no es un esclavo "sordo" que solo escupe datos, ahora es un nodo Edge inteligente que escucha en tiempo real tus comandos desde la nube.

## 🛠️ Cambios Implementados

### 1. Manejo Paralelo de Red (`FirebaseManager`)
Para que el ESP32 pueda enviar telemetría sin trabarse mientras escucha tus comandos, creamos un segundo canal de conexión independiente.
- Se agregó `_fbdoStream` para mantener una conexión abierta (SSE/WebSockets).
- Se programó `Firebase.beginStream()` apuntando al nodo `/devices/ESP32_MAC/commands`.
- Se configuraron los callbacks asíncronos (`streamCallback`) que se disparan instantáneamente cuando presionas un botón en React.

### 2. Parseo de Comandos y Control de Actuadores
Cuando el callback detecta un cambio, toma el *payload* (el pedazo de información que manda Firebase) y lo procesa.
- Utilizamos `ArduinoJson` para extraer de manera segura si encendiste la Luz, la Niebla, el Extractor o el Calefactor.
- **Modo Manual Automático:** Tan pronto como el ESP32 detecta una orden manual en el payload (ej. `fogger_on: true`), inyecta la señal en tu `HardwareController` y suspende el termostato biológico de forma segura.

## ✅ Siguientes Pasos (Tu Turno)

He mandado a compilar el código. Si no hay errores, el siguiente paso es probarlo en la vida real.
1. Conecta el cable USB.
2. Ejecuta **Upload** en PlatformIO (asegurándote de que `upload_protocol = espota` siga comentado con `;`).
3. Abre tu Dashboard Web.
4. Presiona el botón del **Extractor** (o cualquier otro).
5. Observa el ESP32: El relé físico debería sonar (*click*) y en el monitor serial verás el mensaje: `📥 [Firebase] Nuevo Comando Recibido!`.
