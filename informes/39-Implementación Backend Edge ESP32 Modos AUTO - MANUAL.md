# Plan de Implementación: Backend Edge ESP32 (Modos AUTO / MANUAL)

Con el Dashboard (Frontend) ya enviando y reaccionando a los comandos del modo de operación, ahora necesitamos que el **Hardware (ESP32)** cierre el circuito. El ESP32 deberá escuchar los comandos desde Firebase, procesarlos y aplicarlos de forma segura en la lógica de control para garantizar que los reles no se enciendan cuando el operador los haya tomado en control manual, y viceversa.

## Proposed Changes

### Componente: HardwareController (El Motor Core)

#### [MODIFY] [HardwareController.h](file:///C:/Users/lagos/OneDrive/Desktop/ESP32Proyecto%20-%20Industrial/Node-monitor-iot-backend/proyecto_iot-code-workspace/edge_esp32/src/HardwareController.h)
1. **Definir el Enum:** Crear `enum class ModoOperacion { AUTO, MANUAL };`.
2. **Reemplazar Estado:** Cambiar la variable booleana `_modoManualRemoto` por `ModoOperacion _modoActual = ModoOperacion::AUTO;`.
3. **Actualizar API:** Cambiar el setter a `void setModoOperacion(ModoOperacion modo)` y el getter a `ModoOperacion getModoOperacion() const`.

#### [MODIFY] [HardwareController.cpp](file:///C:/Users/lagos/OneDrive/Desktop/ESP32Proyecto%20-%20Industrial/Node-monitor-iot-backend/proyecto_iot-code-workspace/edge_esp32/src/HardwareController.cpp)
1. **Bloqueo en Modo Manual (Interlock Térmico):** En `procesarLogicaDeControl()`, modificar la guardia a `if (_modoActual == ModoOperacion::MANUAL) return;`.
2. **Interlock (Bloqueo) Remoto en Modo Automático:** Modificar los setters de los relés (`setHeater`, `setFogger`, `setExtractor`, `setLight`) para que rechacen la orden si el sistema cree estar en AUTO:
```cpp
void HardwareController::setHeater(bool estado) {
    if (_modoActual == ModoOperacion::AUTO) {
        Serial.println("[Hardware] Ignorando comando manual. Sistema en modo AUTO.");
        return; 
    }
    // Lógica existente...
}
```

### Componente: Integración con la Nube (FirebaseManager)

#### [MODIFY] [FirebaseManager.cpp](file:///C:/Users/lagos/OneDrive/Desktop/ESP32Proyecto%20-%20Industrial/Node-monitor-iot-backend/proyecto_iot-code-workspace/edge_esp32/src/FirebaseManager.cpp)
1. **Procesar Payload de Modo:** En `_procesarPayloadStream()` (donde se reciben los comandos en tiempo real), detectar si el nodo que cambió fue `modo_operacion`.
2. **Actualizar Hardware y Telemetría:** Si recibe `"AUTO"`, llamar a `_hw.setModoOperacion(ModoOperacion::AUTO)`. Si recibe `"MANUAL"`, llamar con `ModoOperacion::MANUAL`.
3. **Publicar Estado:** En `publicarTelemetria()`, asegurar que el payload JSON que se sube a Firebase incluya `"modo_operacion": "AUTO"` (o `"MANUAL"`), cerrando así el lazo de retroalimentación para que el Frontend lo sepa.

### Componente: Interfaz Local (DisplayManager)

#### [MODIFY] [DisplayManager.cpp](file:///C:/Users/lagos/OneDrive/Desktop/ESP32Proyecto%20-%20Industrial/Node-monitor-iot-backend/proyecto_iot-code-workspace/edge_esp32/src/DisplayManager.cpp)
1. **Feedback Visual:** Agregar una etiqueta en la interfaz gráfica del TFT local. Si el equipo está en `AUTO`, pintar `[AUTO]` en verde. Si un operador lo pone en `MANUAL` desde la web, el TFT mostrará `[MAN]` en amarillo o naranja.

## Verification Plan

### Manual Verification
1. Compilar y flashear el código en la ESP32.
2. Desde la página web, cambiar el modo de AUTO a MANUAL. El ESP32 deberá imprimir por monitor serial que el modo ha cambiado y la pantalla TFT cambiará a `[MAN]`.
3. Presionar un botón de actuador en el Dashboard web. El ESP32 encenderá el relé sin problemas.
4. Cambiar de MANUAL a AUTO en la web. El TFT vuelve a `[AUTO]`.
5. Forzar un cambio de relé manual desde Firebase (simulando un ataque/error); el ESP32 denegará el cambio y lo dejará bloqueado en estado autónomo.
