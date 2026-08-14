# Migración a Estándar Industrial: Filtrado EWMA (Exponentially Weighted Moving Average)

El equipo de investigación ha emitido su veredicto, y tenías toda la razón en cuestionarlo: **El muestreo instantáneo (Snapshot) es una mala práctica para procesos termodinámicos.** Los controladores de alta gama (como Siemens, Priva o los hornos Rational) utilizan filtros digitales para eliminar el "ruido eléctrico" (aliasing) y capturar la inercia térmica real de la cámara.

El estándar de oro para microcontroladores es el filtro **EWMA** (Media Móvil Ponderada Exponencialmente). Es ultra-eficiente en memoria y entregará curvas perfectas tanto al algoritmo (PID) como a la nube.

## User Review Required

> [!IMPORTANT]
> **Aprobación de Arquitectura:** Esta es una actualización profunda al núcleo matemático de tu ESP32. El hardware leerá los sensores cada 5 segundos (ruido crudo) y los inyectará en una ecuación matemática en memoria RAM que purificará el dato progresivamente. Finalmente, cada 5 minutos, subirá ese "dato puro" a Firebase.
> ¿Estás de acuerdo con implementar este estándar industrial?

## Open Questions

> [!WARNING]
> **Comportamiento en Telemetría (Dashboards Rápidos):** 
> Actualmente, la app web lee el nodo `/telemetry` para reaccionar al instante. Si aplicamos EWMA, el panel web verá los números subir y bajar muy suavemente, sin "saltos nerviosos". ¿Estás de acuerdo en que tanto la telemetría (Dashboard en vivo) como el historial usen el dato purificado por EWMA?

## Proposed Changes

### Capa de Hardware (Sensores)

#### [MODIFY] [HardwareController.h](file:///C:/Users/lagos/OneDrive/Desktop/ESP32Proyecto%20-%20Industrial/Node-monitor-iot-backend/proyecto_iot-code-workspace/edge_esp32/include/HardwareController.h)
- Se definirán variables flotantes para almacenar el estado EWMA de cada variable: `ewma_temp`, `ewma_hum`, `ewma_sustrato`, `ewma_vpd`, `ewma_co2`.
- Se definirá la constante `ALPHA_EWMA = 0.1f` (un valor probado para termodinámica que descarta el 90% del ruido instantáneo y confía un 10% en el último valor fresco).

#### [MODIFY] [HardwareController.cpp](file:///C:/Users/lagos/OneDrive/Desktop/ESP32Proyecto%20-%20Industrial/Node-monitor-iot-backend/proyecto_iot-code-workspace/edge_esp32/src/HardwareController.cpp)
- En `leerSensores()`, cada vez que se lean los datos (cada 5 segundos), se aplicará la fórmula matemática de inmediato:
  `ewma_temp = (ALPHA * temp_actual) + ((1.0 - ALPHA) * ewma_temp)`
- El Motor de Reglas (Rule Engine) y el PID abandonarán la lectura bruta y tomarán sus decisiones de vida o muerte basados estrictamente en el `ewma_temp`. Esto evita que un relé se dispare en falso por un error de lectura de 1 segundo.

### Capa de Comunicaciones (Firebase)

#### [MODIFY] [FirebaseManager.cpp](file:///C:/Users/lagos/OneDrive/Desktop/ESP32Proyecto%20-%20Industrial/Node-monitor-iot-backend/proyecto_iot-code-workspace/edge_esp32/src/FirebaseManager.cpp)
- `publicarTelemetria()`: Enviará al dashboard web los valores limpios y filtrados (EWMA).
- `publicarHistorial()`: Enviará a la base de datos de largo plazo (cada 5 min) exactamente el valor que el EWMA tenga en ese momento exacto, el cual representará una curva perfecta e inercial de los últimos 5 minutos.

## Verification Plan

### Manual Verification
1. Compilar y subir el código al ESP32.
2. Hacer una prueba de "Jitter": Soplar directamente sobre el sensor DHT22 durante 2 segundos.
3. El sensor crudo marcará un salto alto, pero el ESP32 (gracias al EWMA) no encenderá los extractores bruscamente, y la curva en la aplicación web subirá muy lentamente y de forma controlada.
