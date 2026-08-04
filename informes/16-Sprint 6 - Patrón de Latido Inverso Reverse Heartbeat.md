# Sprint 6: Patrón de "Latido Inverso" (Reverse Heartbeat)

El objetivo de esta fase es otorgar al ESP32 (Edge) la capacidad de discernir entre una conexión activa con el broker MQTT y la salud real del cerebro central (Backend Node.js). Si el backend crashea o se apaga, el ESP32 lo detectará y alertará al operador local.

## Proposed Changes

### 1. Capa Backend (`backend_node/src/subscriber.ts`)

#### [MODIFY] subscriber.ts
- Añadiremos un temporizador asíncrono (`setInterval`) de 10 segundos justo después de la conexión exitosa o antes de arrancar el servidor.
- El backend publicará un payload ligero `{"status": "alive"}` en el tópico global `proyecto_iot/servidor/latido`.
- Se validará que el cliente MQTT esté conectado antes de publicar para evitar apilar errores si la red cae.

### 2. Capa Edge (`edge_esp32/src/main.cpp`)

#### [MODIFY] main.cpp
- **Estado Global:** Inyección de las variables `ultimoLatidoServidor` (tipo `unsigned long`) y `servidorCaido` (booleano, inicializado en `true`).
- **Suscripción:** Dentro de la rutina de reconexión MQTT en el `loop()`, ordenaremos al cliente que se suscriba a `proyecto_iot/servidor/latido`.
- **Intercepción de Latidos:** El `callback` MQTT interceptará este tópico específico. Al recibirlo, actualizará el *timestamp* (`ultimoLatidoServidor = millis()`) y declarará `servidorCaido = false`. Haremos un `return;` inmediato para no malgastar ciclos de CPU intentando parsear comandos para los relés.
- **Vigilante Asíncrono (Watchdog):** En el `loop()` principal, inyectaremos una validación no bloqueante. Si han pasado más de 35,000 milisegundos (3.5 latidos perdidos) desde `ultimoLatidoServidor`, se activará la bandera `servidorCaido = true`.
- **UX/UI Industrial:** En la función `actualizarPantalla()`, reemplazaremos el indicador de red actual por el triple estado solicitado:
  - `!client.connected()` → **Naranja:** `[WIFI/BROKER OFFLINE]`
  - `client.connected() && servidorCaido` → **Rojo:** `[SERVIDOR CAIDO]`
  - `client.connected() && !servidorCaido` → **Verde:** `[NUBE: ONLINE]`

## Verification Plan

### Automated / Manual Verification
1. Compilar y flashear el código en el ESP32.
2. Observar la pantalla TFT en tiempo real.
3. El sistema arrancará asumiendo que el servidor está caído (texto ROJO) hasta que reciba el primer latido.
4. Apagar el backend (Control+C en la consola de Node).
5. Esperar 35 segundos. El ESP32 debería cambiar de VERDE a ROJO, a pesar de seguir conectado al WiFi y al Broker MQTT público.
6. Encender el backend. En menos de 10 segundos, la pantalla debe recuperar el color VERDE.
