# Hardware en el Lazo (HIL) - Implementación Completada

Se ha cerrado exitosamente el bucle de control (Closed-Loop Control) en el ESP32, estableciendo la autopista de datos bidireccional necesaria para la futura Consola Virtual y las órdenes dictadas por Inteligencia Artificial.

## Cambios Ejecutados

### 1. Asignación de Hardware (Pines)
Se consolidó la topología física de los actuadores asegurando que no haya colisiones lógicas con los sensores (I2C/SPI/Analógicos) existentes:
* **Humidificador:** `GPIO 25` (Estable)
* **Ventilador (FAE):** `GPIO 26` (Estable)
* **Manta Calefactora:** `GPIO 32` (Nuevo - Modo Incubación)
  > Se eligió el GPIO 32 porque es un pin de salida seguro (Output-capable RTC GPIO) que no afecta el comportamiento de arranque (boot strapping) del ESP32, a diferencia de otros pines.

### 2. Receptor de Comandos (Callback MQTT)
El Cerebro Edge ahora no solo transmite, sino que escucha y obedece:
* Al interceptar el tópico `proyecto_iot/edge/[DEVICE_ID]/comandos`, el ESP32 usa `ArduinoJson` para parsear la orden entrante.
* Modifica inmediatamente el voltaje (`HIGH`/`LOW`) del GPIO correspondiente.
* Activa una bandera de exclusión mutua (`modoManualRemoto = true`) para evitar que el termostato local interno anule la orden del servidor.

### 3. Trazabilidad de Consola (Logs de Precisión)
Siguiendo las estrictas reglas de gestión de memoria, cada conmutación de relé es notificada utilizando `logRemoto` junto con la macro Flash String `F()`:
```cpp
logRemoto(F("Comando ejecutado -> Rele Manta Calefactora: ON"));
```
Esto garantiza que la futura Consola Web reciba un flujo constante de diagnósticos en tiempo real sin desbordar la memoria SRAM (Heap) del microcontrolador.

### 4. Actualización del Contrato JSON (Telemetría)
El paquete de telemetría emitido al broker ahora expone de manera transparente y en tiempo real el estado de los actuadores:
```json
{
  "temp_ambiente": 24.5,
  "humedad": 88.2,
  "temp_sustrato": 26.1,
  "humidificador_on": true,
  "ventilador_on": false,
  "manta_on": true
}
```
Esto permite que React (Frontend) renderice interfaces reactivas (luces LED, toggles) basadas en la realidad física de la placa, no en suposiciones.

## Siguientes Pasos
El código ha sido refactorizado e inyectado en tu disco local. Está listo para compilarse y flashearse al ESP32 a través de PlatformIO en tu entorno VS Code.
