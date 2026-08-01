# Informe Oficial de Cierre — Sprint 7
## Ecosistema IoT Industrial: Cámara Fungi Inteligente
**Fecha de Cierre:** 29 de julio de 2026  
**Commit de Entrega:** `f52b569` → `main`  
**Metodología:** Lean Startup / Ingeniería de Software Ágil  
**Estado:** ✅ CERRADO EN VERDE — Firmware flasheado y operativo en hardware físico

---

## 1. Resumen Ejecutivo

El Sprint 7 marca un punto de inflexión estructural en el ciclo de vida del ecosistema IoT de la Cámara Fungi Inteligente. Lejos de agregar funcionalidades superficiales, este sprint tuvo como objetivo estratégico **saldar la deuda técnica acumulada en la capa Edge** durante los sprints de integración acelerada (MVP). La capa de firmware del ESP32 había evolucionado orgánicamente en un *"God Object"*: un archivo monolítico de 486 líneas que concentraba, sin separación de responsabilidades, la lógica de red, el protocolo MQTT, la telemetría de sensores, el control físico de actuadores y el renderizado gráfico de la pantalla TFT. Este acoplamiento horizontal representaba no solo una deuda de mantenimiento, sino una **barrera arquitectónica que habría bloqueado la incorporación de la Inteligencia Artificial** planificada para los Sprints 8 y 9. Al refactorizar el firmware a una Arquitectura Limpia Orientada a Objetos con dependencias estrictamente unidireccionales, el ecosistema dispone ahora de una plataforma profesional, testeble y extensible. El monolito fue demolido y reemplazado por cinco módulos de propósito único. El nuevo `main.cpp` —el orquestador central— quedó reducido a **87 líneas de código**, compiló en verde absoluto y opera de forma autónoma en la placa física desde el primer ciclo de arranque.

---

## 2. Estado de la Capa Edge — Hardware en el Lazo

El nodo Edge (Wemos D1 R32 / ESP32) opera actualmente como una unidad de control industrial autónoma, integrando los siguientes subsistemas validados:

### 2.1 Telemetría de Sensores

| Sensor | Interfaz | Protocolo | Estado |
|---|---|---|---|
| DHT22 (Clima Ambiental) | GPIO 27 | 1-Wire | ✅ Operativo con diagnóstico `dhtOk` |
| Sonda NTC 10K (Sustrato) | GPIO 34 (ADC) | Steinhart-Hart | ✅ Operativo con diagnóstico `sustratoOk` |

Ambos sensores implementan un protocolo de **Null-Safety** activo: si la lectura es inválida (NaN o fuera de rango ADC), el nodo emite un valor `null` explícito en el payload JSON, propagando la señal de fallo a través del stack completo hasta el Dashboard de React, donde se activan alertas visuales de emergencia.

### 2.2 Control de Actuadores (Relés)

| Actuador | GPIO | Lógica de Control |
|---|---|---|
| Humidificador Ultrasónico | 25 | Histéresis: ON < 50% HR → OFF ≥ 70% HR |
| Ventilador FAE (CO₂) | 26 | Ciclo temporal: 2 min/h + alerta térmica |
| Manta Calefactora | 4 | Termostato autónomo: ON < 24°C → OFF ≥ 26°C |

### 2.3 Mecanismos de Supervivencia Autónoma

El nodo implementa una arquitectura de resiliencia en múltiples capas independientes:

- **Failsafe Térmico (Termostato Local):** El `HardwareController` mantiene activo el control de la Manta Calefactora con histéresis (24°C – 26°C) incluso en ausencia total de conectividad. El micelio no puede congelarse por pérdida de red.
- **AP de Rescate Local:** Ante la caída del router WiFi, el `NetworkManager` despliega automáticamente una red `ESP32_RESCATE_MOTOR1`, preservando el acceso físico al nodo para diagnóstico en campo.
- **Watchdog de Latido Inverso (Reverse Heartbeat):** El `MqttManager` evalúa en cada iteración del `loop()` el tiempo transcurrido desde el último latido del Backend Node.js (tópico `proyecto_iot/servidor/latido`). Si el silencio supera los **35 segundos** (3.5 latidos perdidos), el sistema declara autónomamente `servidorCaido = true` y lo refleja en la pantalla TFT local.
- **HMI Local con Estados Independientes:** La pantalla TFT muestra en tiempo real dos líneas de estado de conectividad independientes:
  - `RED: ONLINE / OFFLINE / RESCATE AP` (estado WiFi + Broker MQTT)
  - `CEREBRO: OK / CAIDO` (estado del proceso Node.js vía latido inverso)

---

## 3. Arquitectura OOP y Desacople — Jerarquía de Cinco Capas

El resultado central del Sprint 7 es la transición de un monolito procedural a una **jerarquía de clases con dependencias estrictamente unidireccionales**. Las capas superiores conocen a las inferiores; las capas inferiores son completamente ignorantes de las superiores. Esto elimina el acoplamiento circular y permite modificar o reemplazar cualquier módulo sin efecto colateral.

```
main.cpp  [Orquestador — 87 líneas]
│
├── Capa 0: HardwareController   (sin dependencias externas)
│   ├── Sensores: DHT22, NTC (Steinhart-Hart)
│   ├── Actuadores: GPIO de los 3 relés
│   └── Lógica autónoma: Failsafe térmico, ciclos FAE
│
├── Capa 1: NetworkManager       (sin dependencias del proyecto)
│   ├── WiFi STA + AP Failsafe
│   ├── Reconexión asíncrona (sin delay())
│   └── Actualizaciones OTA (hostname dinámico por MAC)
│
├── Capa 2: MqttManager          (depende de HardwareController)
│   ├── PubSubClient: Conexión, LWT, Suscripciones
│   ├── Callback de comandos → HardwareController (via setters)
│   ├── Publicación de telemetría JSON (Null-Safe)
│   └── Watchdog del latido inverso
│
└── Capa 3: DisplayManager       (depende de todas las capas, solo lectura)
    └── Renderizado HMI TFT puro (const& en las 3 dependencias)
```

### Regla de Oro: Flujo de Dependencias
Ninguna clase de Capa N puede incluir headers o instanciar objetos de Capa N+1. El `HardwareController` no sabe que existe WiFi. El `NetworkManager` no sabe que existe una pantalla TFT. Esta regla garantiza que cada módulo pueda ser desarrollado, testeado y reemplazado de forma completamente independiente.

### Bus de Datos Centralizado
La comunicación entre capas se realiza a través de dos estructuras de datos (`struct`) que actúan como un **bus de datos interno del sistema**:

```cpp
struct SensorData   { float tempAmb, humAmb, tempSustrato; bool dhtOk, sustratoOk; };
struct ActuadorData { bool humidificadorON, ventiladorON, mantaON; };
```

Estas estructuras eliminan el need de variables globales compartidas: cualquier módulo superior accede al estado del hardware mediante `hw.getSensores()` y `hw.getActuadores()`, ambos retornando `const&`.

---

## 4. Decisiones de Ingeniería y Trade-offs

### 4.1 Encapsulamiento por Setters — Patrón Comando Semántico

**Problema resuelto:** El `MqttManager` (Capa 2) necesita modificar el estado físico de los relés al recibir un comando remoto. La solución ingenua habría sido exponer el struct `ActuadorData` como mutable. Esto habría creado una fuga de abstracción: el `MqttManager` necesitaría conocer los números de pin físicos del hardware.

**Decisión adoptada:** Se implementaron setters explícitos con semántica de negocio en el `HardwareController`:

```cpp
void HardwareController::setManta(bool estado) {
    _actuadores.mantaON = estado;
    digitalWrite(PIN_RELE_MANTA, estado ? HIGH : LOW);
}
```

**Beneficio:** El `MqttManager` habla el idioma del dominio (`_hw.setManta(true)`), no el del silicio (`digitalWrite(4, HIGH)`). Si el pin de la manta cambia de GPIO 4 a GPIO 32, la modificación ocurre en **un único punto del código**, en la capa que corresponde arquitectónicamente.

### 4.2 `const` Correctness y `mutable` — Gestión de Librerías de Terceros

**Problema resuelto:** El método `PubSubClient::connected()` no está declarado como `const` en la librería de terceros. Nuestro método `MqttManager::isConnected() const` no podía invocarlo sin que el compilador lanzara el error: *"passing `const PubSubClient` as `this` argument discards qualifiers"*.

**Alternativas evaluadas:**

| Alternativa | Veredicto |
|---|---|
| Eliminar `const` de `isConnected()` | ❌ Rompe la garantía de que `DisplayManager` no modifica estado |
| Cachear un `bool _connected` | ❌ Introduce staleness: el bool puede desincronizarse del socket TCP |
| `const_cast<PubSubClient&>(_client)` | ❌ Comportamiento indefinido si el objeto es realmente `const` |
| `mutable PubSubClient _client` | ✅ Solución semánticamente correcta por el estándar C++ |

**Decisión adoptada:** Declarar `_client` como `mutable`. La especificación del estándar C++11 define `mutable` precisamente para miembros cuyo estado interno cambia de forma lógicamente transparente al observador externo —como el estado de un socket de red. Esta es la solución canónica cuando una librería de terceros no implementa `const`-correctness.

### 4.3 Callback Estático con Bridge a Instancia — Interfaz C/C++

`PubSubClient` requiere un puntero a función C libre (`void(*)(char*, byte*, unsigned int)`) para su callback. Las funciones miembro de clase no son directamente compatibles con este tipo. Se implementó el patrón **Singleton de Instancia Estática**:

```cpp
static MqttManager* MqttManager::_instancia = nullptr;

// Callback libre registrado en PubSubClient:
void MqttManager::onMessageStatic(char* t, byte* p, unsigned int l) {
    if (_instancia) _instancia->_procesarMensaje(t, p, l);
}
```

Este patrón es la solución estándar en ecosistemas embebidos donde el framework (Arduino/ESP-IDF) opera con ABI de C pero el código de la aplicación usa C++. No requiere memoria dinámica (`new`/`delete`) y no introduce fugas.

---

## 5. Próximos Pasos — Backlog Sprint 8

Con la deuda técnica de la capa Edge saldada y la arquitectura preparada para extensión, el Sprint 8 puede incorporar inteligencia sin modificar una sola línea de los módulos existentes.

### 5.1 Máquina de Estados Finitos — `CultivoStateMachine`

El ciclo biológico del micelio no es un booleano. Es una secuencia de fases con transiciones bien definidas que deben orquestarse con precisión:

```
INCUBACION → PRIMORDIOS → FRUCTIFICACION → DESCANSO → [ciclo]
```

Se creará una nueva clase `CultivoStateMachine` que recibe `HardwareController&` por constructor (inyección de dependencias) y puede transicionar entre fases enviando los comandos semánticos correctos (`setManta`, `setHumidificador`, `setVentilador`) sin conocer los pines físicos ni la lógica de red.

La IA del Sprint 9 no enviará comandos de relés crudos: enviará **transiciones de fase** (`"CAMBIAR_A_PRIMORDIOS"`) y la FSM sabrá exactamente qué parámetros termodinámicos activar para ese cultivo específico.

### 5.2 Preparación para Self-Tuning con IA

La arquitectura modular actual ya expone los puntos de extensión necesarios:

- **Punto de lectura:** `hw.getSensores()` retorna el estado en tiempo real con tipado fuerte.
- **Punto de escritura:** Los setters semánticos (`setManta`, `setHumidificador`, `setVentilador`) permiten que la FSM actúe sobre el hardware con una sola línea de código.
- **Punto de observación:** El `MqttManager` puede recibir nuevos tópicos de comandos de la IA sin alterar el callback existente (extensión por `containsKey`, no modificación).

El modelo de IA recibirá el historial de InfluxDB, correrá sus modelos de predicción y publicará un mensaje MQTT con la fase objetivo. La FSM lo interceptará, validará la transición y orquestará los actuadores. **La IA nunca toca el hardware directamente.**

---

## Indicadores del Sprint

| Métrica | Antes (Sprint 6) | Después (Sprint 7) | Delta |
|---|---|---|---|
| Líneas en `main.cpp` | 486 | 87 | **-82%** |
| Archivos en `src/` | 1 | 9 | **+8 módulos** |
| Variables globales | ~20 | 0 | **-100%** |
| Acoplamiento circular | Presente | Eliminado | ✅ |
| Errores de compilación | — | 0 (`[SUCCESS]`) | ✅ |
| Firmware en hardware | Validado | Validado | ✅ |

---

*Informe redactado por el equipo de ingeniería del Proyecto Cámara Fungi Inteligente.*  
*Repositorio oficial:* `luckybjj-dev/iot-industrial` → commit `f52b569`
