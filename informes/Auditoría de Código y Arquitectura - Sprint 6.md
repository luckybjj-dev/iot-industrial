# Auditoría de Código y Arquitectura - Sprint 6

Como Arquitecto de Software Principal, he analizado el estado actual del monorepo. Hemos logrado hitos operativos masivos (Hardware-in-the-Loop, Null-Safety, Reverse Heartbeat), pero desde la perspectiva de ingeniería de software, el código está comenzando a mostrar fracturas de escalabilidad. 

Si no pagamos la **Deuda Técnica** ahora, el sistema colapsará por su propio peso al intentar integrar funcionalidades complejas como la Inteligencia Artificial.

---

## 1. Deuda Técnica Actual (El Código "Feo")

### Capa EDGE (C++ / ESP32)
- **El Monolito de 450+ Líneas:** `main.cpp` ha mutado a un *God Object*. Contiene la lógica de WiFi, MQTT, renderizado TFT, lectura de sensores DHT/NTC, y el motor de reglas termodinámicas, todo entrelazado.
- **Acoplamiento Fuerte:** La función `actualizarPantalla()` y `procesarLogicaDeControl()` dependen de decenas de variables globales (`tempAmb`, `dhtOk`, `releMantaON`). Esto hace que el código sea frágil, imposible de probar unitariamente (Unit Testing) y propenso a efectos colaterales (Race Conditions).
- **Hardcoding de Hardware:** Los umbrales de temperatura y tiempos del ventilador están hardcodeados como variables globales, lo que impide un cambio de configuración dinámico escalable.

### Capa BACKEND (Node.js / TS)
- **Falta de Persistencia de Estado en Caliente:** Usar `Map` (`estadosEdge`, `telemetriaRecibida`) es rápido, pero volátil. Si el contenedor Node.js se reinicia, el backend pierde la memoria temporal de las cámaras hasta que publiquen de nuevo.
- **Ausencia de Inyección de Dependencias:** El archivo `subscriber.ts` mezcla responsabilidades violando el principio de Responsabilidad Única (SOLID). En un solo archivo levantamos Express, nos conectamos a MQTT e inyectamos a InfluxDB.
- **Modelo de Comandos Frágil:** Enrutar los "Modos de Cultivo" mediante simples comandos JSON crudos (`set_modo`) es insostenible para orquestar ciclos biológicos que duran semanas.

### Capa FRONTEND (React / TS)
- **HTTP Polling Agresivo:** El uso de `setInterval` en `App.tsx` para hacer *polling* a la API REST cada 5 segundos es ineficiente y no escala. Con 10 cámaras y 5 clientes conectados, el backend sufrirá una tormenta de peticiones HTTP innecesarias.
- **Lógica de UI Entrelazada:** `App.tsx` mezcla el estado de la conexión, el mapeo de los nodos y el diseño (Tailwind) en un componente gigante.

---

## 2. Roadmap Arquitectónico (Próximos 3 Pasos Críticos)

Antes de añadir más funcionalidades comerciales, debemos ejecutar el siguiente refactor:

### I. Refactor Orientado a Objetos (POO) en C++ (El Desacople del Edge)
Migrar `main.cpp` a una arquitectura modular basada en clases (`.h` y `.cpp`):
- `DisplayManager`: Encapsula toda la lógica TFT y Adafruit_GFX.
- `TelemetryEngine`: Se encarga exclusivamente de leer sensores físicos (DHT, NTC).
- `NetworkManager`: Aísla la complejidad de WiFi, OTA y PubSubClient.
- `ThermostatController`: Aislar el motor de reglas de Failsafe y Modos.

### II. Migración de Polling a WebSockets o MQTT-WS (Tiempo Real Real)
Destruir el *polling* de React. El backend debe convertirse en un orquestador asíncrono que haga *push* de los datos al frontend solo cuando haya cambios (Event-Driven). 
- **Solución:** Integrar `Socket.io` en Node y React, o conectar React directamente a HiveMQ usando MQTT sobre WebSockets para telemetría directa (dejando a Node.js solo para almacenamiento y comandos críticos).

### III. Desacople del Backend (Arquitectura Hexagonal o MVC Ligero)
Fracturar `subscriber.ts` en:
- `controllers/`: Para manejar las rutas HTTP (Express).
- `services/mqttService.ts`: Gestor puro de Pub/Sub.
- `services/influxService.ts`: Bóveda de datos.

---

## 3. Visión a Futuro: Preparando la Inyección de IA (Sprints 8/9)

Para que la futura Inteligencia Artificial (Self-Tuning y RAG) sea un simple "conectar y usar", debemos adoptar los siguientes patrones de diseño **hoy**:

> [!TIP] Patrón: Máquina de Estados Finitos (FSM)
> **Para el Backend y Edge:** El ciclo de vida del micelio no es un booleano (ON/OFF), es un flujo. Implementar una FSM (Ej: `INCUBACION` -> `PRIMORDIOS` -> `FRUCTIFICACION` -> `DESCANSO`). La IA no enviará comandos de relés crudos ("enciende el ventilador"); la IA enviará el comando de transición "Cambia a Fase Primordios con Delta 15% humedad", y la FSM local sabrá exactamente cómo orquestar los relés.

> [!TIP] Patrón: Digital Twin (Gemelo Digital)
> **Para el Backend:** La memoria volátil (`Map`) debe evolucionar a un "Gemelo Digital" alojado en Redis (para estado en tiempo real ultrarrápido) acoplado a InfluxDB (para historial). La IA leerá el Gemelo Digital en Redis, correrá simulaciones (RAG) y ajustará parámetros en milisegundos sin asfixiar la base de datos temporal.

> [!TIP] Patrón: Event Sourcing & CQRS
> **Para los Comandos:** Separar completamente la lectura de telemetría (Query) de la inyección de comandos de la IA (Command). Si la IA necesita afinar un parámetro, no lo hará por la misma vía que los logs; utilizará un bus de comandos estructurado, permitiendo auditar cada decisión que la IA tome sobre el cultivo biológico.

### Veredicto del Arquitecto
Estamos en el punto de inflexión clásico de toda startup. Hemos demostrado tracción técnica (MVP superado). Es hora de estabilizar los cimientos. Recomiendo que el **Sprint 7** sea un sprint de 100% limpieza, Desacople POO y WebSockets. Nada de nuevas métricas. Si lo hacemos, la IA del Sprint 8 se conectará como un guante.
