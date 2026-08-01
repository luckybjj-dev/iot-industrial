# Hardware en el Lazo (HIL) - Sprint 6

Este plan detalla la implementación del control bidireccional físico en el ESP32, estableciendo las bases para la Consola Virtual y preparando el terreno para los futuros modos de cultivo operados por IA.

## User Review Required

> [!WARNING]
> **Conflicto de Hardware (Pin 27)**
> Sugeriste los pines 25, 26 y 27 para los relés. Sin embargo, revisando el código actual, **el pin 27 ya está siendo utilizado por el sensor DHT22** (`#define DHTPIN 27`). 
> 
> **Decisión de Diseño:** Mantendré el ventilador en el pin 26 y el humidificador en el pin 25. Para la **Manta Calefactora**, utilizaré el **pin 32**, ya que es un pin seguro (output-capable, sin restricciones de pull-up en el arranque) y está libre de conflictos con la pantalla TFT (5, 13, 14) y el NTC (34).

## Proposed Changes

### `edge_esp32/src/main.cpp`

Se refactorizará el Firmware Core para soportar recepción de comandos y actuación física.

#### [MODIFY] main.cpp
1. **Mapeo de Actuadores (GPIO):**
   - Mantener: `pinReleVentilador = 26`
   - Mantener: `pinReleHumidificador = 25`
   - **Nuevo:** `pinReleManta = 32` (Manta Calefactora)
   - *Se añadirán las variables globales de estado correspondientes.*

2. **Lógica Bidireccional (MQTT Callback):**
   - Modificaremos la función `client.setCallback` para interceptar el `topic_comandos`.
   - Se utilizará `ArduinoJson` (`StaticJsonDocument`) para parsear la orden del servidor.
   - Si se recibe la orden, se aplicará `digitalWrite(pin, HIGH/LOW)` y se activará `modoManualRemoto = true` para evitar que el bucle de control interno sobre-escriba el comando.

3. **Trazabilidad (Logs en Tiempo Real):**
   - Cada cambio de estado de un relé desde el callback disparará un log envolvente usando la macro `F()`:
     `logRemoto(F("Comando ejecutado -> Relé Manta Calefactora: %s"), estado ? "ON" : "OFF");`

4. **Contrato JSON de Telemetría:**
   - Ampliaremos la función `enviarTelemetriaYLogs()` para que el JSON enviado al servidor sea explícito y sirva para el Dashboard/Consola Virtual:
     ```json
     {
       "manta_on": true,
       "humidificador_on": false,
       "ventilador_on": true
       // ...resto de telemetría (temp, hum)
     }
     ```

## Verification Plan

### Manual Verification
1. Compilaremos y subiremos el código mediante PlatformIO al ESP32 por USB.
2. Usaremos el Dashboard o un cliente MQTT (ej. MQTT Explorer) para enviar un comando al tópico `proyecto_iot/edge/[DEVICE_ID]/comandos`.
3. Verificaremos físicamente (con multímetro o escuchando el 'click' del relé) si el voltaje cambia en los GPIO 25, 26 y 32.
4. Leeremos el tópico de telemetría para comprobar que el nuevo JSON refleja fielmente los estados `true/false` de los relés.
