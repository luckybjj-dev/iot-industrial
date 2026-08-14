# Resumen de Implementación: Backend Edge ESP32

Con esta actualización, el hardware físico (ESP32) cierra exitosamente el circuito de control de Modos de Operación propuesto para el ecosistema IoT. El sistema ahora discrimina de forma inteligente si debe obedecer a sus propios sensores térmicos o si debe dejar el control directo a un operario remoto.

## Arquitectura Refactorizada

1. **Capa Física (HardwareController)**
   - Se reemplazó la antigua variable booleana por un estricto `enum class ModoOperacion { AUTO, MANUAL };`, elevando la calidad del código a estándares de C++ moderno.
   - **Interlock Automático:** La máquina de estados principal (`procesarLogicaDeControl`) fue blindada para apagarse (return temprano) cuando el sistema está en `MANUAL`.
   - **Interlock Manual:** Cada uno de los relés (`setHeater`, `setFogger`, etc.) fue protegido. Si alguien o algo intenta encender un relé manualmente pero el sistema está en `AUTO`, la orden es rechazada firmemente con una notificación al puerto Serial, evitando accidentes físicos (ej. apagar el extractor en pleno riesgo térmico).

2. **Capa Cloud (FirebaseManager)**
   - **Doble Conexión:** Se asignó un segundo objeto `FirebaseData (_fbdoStream)` dedicado exclusivamente a mantener vivo el túnel asíncrono (*Stream*) con Firebase. Esto previene colapsos con la publicación de telemetría.
   - **Deserialización de Comandos:** El módulo ahora escucha los cambios del dashboard bajo la ruta `/commands` y aplica la lógica de parseo utilizando `ArduinoJson`, traduciendo las peticiones web en acciones físicas inmediatas.
   - **Retroalimentación (Feedback Loop):** En cada ciclo de telemetría, el ESP32 inyecta su modo actual (`modo_operacion`) en el payload JSON. Esto garantiza que el Frontend *siempre* sepa el estado verdadero del hardware, incluso si este se reinicia.

3. **Capa Visual Local (DisplayManager)**
   - El operador que se encuentre frente a la máquina física ahora sabrá instantáneamente en qué modo está. En la esquina superior derecha del TFT, se renderizará dinámicamente `[AUTO]` en color Verde o `[MAN]` en color Amarillo, al lado de la etiqueta `PERFIL: AGNOSTICO`.

## Verificación en Dispositivo Real

Para verificar el ciclo completo:
1. Compila y sube el firmware a tu ESP32 (junto con la pantalla TFT).
2. El TFT debería mostrar `[AUTO]` al arrancar.
3. Ingresa al Dashboard Web (React) que modificamos anteriormente, localiza la cámara y haz clic en cambiar modo a `MANUAL`.
4. El texto en el TFT de la ESP32 cambiará a `[MAN]` casi instantáneamente.
5. Intenta accionar un relé desde la Web. Escucharás o verás el LED indicador de ese relé encenderse en la placa.
6. Devuélvelo a `AUTO` y trata de encender el relé de nuevo: verás que la Web te lo bloquea, y si fuerzas el envío, el ESP32 te rechazará la orden imprimiéndolo en su monitor serial.
