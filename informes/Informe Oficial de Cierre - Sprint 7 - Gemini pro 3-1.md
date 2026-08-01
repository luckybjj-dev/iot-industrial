# Informe Oficial de Cierre — Sprint 7
## Ecosistema IoT de Grado Industrial: Cámara Fungi Inteligente

**Estado:** Completado (`[SUCCESS]`)
**Metodología:** Lean Startup

---

### 1. Resumen Ejecutivo

El cierre exitoso del Sprint 7 representa un hito arquitectónico fundacional para el ecosistema de la Cámara Fungi Inteligente. Estratégicamente, hemos priorizado la erradicación de una severa deuda técnica en el microcontrolador (Edge) antes de escalar hacia la complejidad algorítmica. La demolición del anti-patrón "God Object" en nuestro firmware y su transición hacia una Arquitectura Limpia Orientada a Objetos garantiza un sistema modular, robusto y altamente mantenible. Este saneamiento estructural no es un mero ejercicio académico; es el prerrequisito técnico insoslayable que nos permite preparar el terreno para la orquestación mediante Inteligencia Artificial, asegurando que la futura inyección de modelos predictivos ocurra sobre cimientos sólidos y escalables, sin riesgo de colapso sistémico.

### 2. Estado de la Capa Edge (Hardware en el Lazo)

El nodo Edge opera actualmente con total autonomía y resiliencia, consolidando el concepto de "Hardware en el Lazo" (HIL). 

*   **Sensores y Actuadores:** La integración física es estable. Las lecturas ambientales (DHT22) y de sustrato (NTC) fluyen correctamente, impulsando la actuación precisa sobre la Manta Calefactora, el Humidificador y el Ventilador FAE.
*   **Mecanismos de Supervivencia Autónoma:** La fiabilidad industrial está garantizada mediante protocolos de Failsafe de múltiples niveles. Un Failsafe térmico local protege el cultivo de fluctuaciones críticas independientemente de la conectividad. Adicionalmente, el nodo cuenta con un AP de rescate para recuperación in-situ y un sofisticado Watchdog de Latido Inverso (Reverse Heartbeat) que monitorea proactivamente la salud del cerebro central (Node.js), dotando al Edge de verdadera consciencia sobre el estado global del sistema.

### 3. Arquitectura OOP y Desacople

El rediseño arquitectónico ha transformado un monolito procedural de 486 líneas en un ecosistema de 5 capas de responsabilidades discretas, regido por la regla de oro: **cero acoplamiento circular y dependencias fluyendo estrictamente hacia abajo**. El archivo `main.cpp` ha sido purgado de toda lógica de negocio, reduciéndose a un orquestador minimalista de 87 líneas.

La nueva jerarquía se define así:

*   **`HardwareController` (Capa 0):** Aislado de cualquier abstracción de red. Gobierna los sensores y relés físicos. Encapsula la lógica de protección termodinámica.
*   **`NetworkManager` (Capa 1):** Orquestador de conectividad. Administra de forma asíncrona la topología WiFi (STA y AP Failsafe) y el ciclo de vida de las actualizaciones OTA.
*   **`MqttManager` (Capa 2):** Motor de comunicaciones. Gestiona el PubSubClient, implementa LWT, maneja los callbacks estáticos de comandos entrantes y ejecuta el Watchdog del latido inverso.
*   **`DisplayManager` (Capa 3):** Interfaz HMI (Human-Machine Interface). Dedicado en exclusiva al renderizado TFT puro, consumiendo el estado del sistema bajo una política estricta de solo lectura (`const&`).

### 4. Decisiones de Ingeniería y Trade-offs

Para alcanzar este nivel de desacople, se han tomado decisiones arquitectónicas deliberadas:

*   **Patrón de Comando Semántico y Encapsulamiento:** Se rechazó la exposición de estructuras de datos mutables. En su lugar, el `HardwareController` expone setters explícitos (ej. `setManta`). Esto centraliza la mutación del estado y la actuación sobre los pines físicos en un solo lugar, protegiendo la integridad del sistema y ocultando los detalles de hardware a las capas superiores de red.
*   **Const-Correctness y el uso de `mutable`:** Se impuso una disciplina estricta de inyección de dependencias inmutables (`const&`). Sin embargo, nos enfrentamos a una limitación de diseño en la librería de terceros `PubSubClient`, cuyos métodos de verificación de estado (ej. `connected()`) no son `const`. En lugar de romper la arquitectura propagando referencias mutables innecesarias, se optó por el uso táctico de la palabra clave `mutable` en la declaración del cliente MQTT. Esta decisión es semánticamente correcta según el estándar C++ moderno, permitiendo mutaciones lógicas internas (gestión del socket TCP) mientras se preserva la inmutabilidad de la interfaz externa del objeto.

### 5. Próximos Pasos (Backlog - Sprint 8)

Con la arquitectura estabilizada, el Sprint 8 marca el inicio de la orquestación biológica avanzada. 

El objetivo primordial será la inyección de una Máquina de Estados Finitos (`CultivoStateMachine`). Esta FSM digitalizará el ciclo de vida del micelio, permitiendo transiciones de fase deterministas. Este componente es vital: la futura Inteligencia Artificial (Self-Tuning) no enviará comandos primitivos de encendido/apagado a los relés. En su lugar, la IA actuará como un estratega, despachando intenciones de alto nivel a la `CultivoStateMachine`, la cual se encargará de traducir estas directivas en operaciones de hardware seguras y validadas a través del `HardwareController`.
