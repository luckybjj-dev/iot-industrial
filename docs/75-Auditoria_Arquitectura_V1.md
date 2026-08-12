# Auditoría Histórica y Arquitectónica Definitiva — AgriEdge OS (V1)
**Documento Maestro Consolidado (Basado en 74 Reportes Históricos)**

**Fecha de Compilación:** Agosto de 2026
**Rol del Auditor:** Arquitecto de Software Senior IoT / Agrónomo de Precisión.
**Alcance:** Consolidación enciclopédica del historial de pivotes, deuda técnica, investigación agronómica y arquitectura del proyecto desde el Informe 01 al 74.

---

## 1. 📖 LA EVOLUCIÓN DEL PROYECTO (CRONOLOGÍA DE PIVOTES)

El ecosistema actual es el resultado de múltiples iteraciones bajo la metodología Lean Startup, fallando rápido y pivotando estratégicamente.

### Fase 1: El Origen (Monitoreo Predictivo Industrial)
*   **Contexto:** El proyecto nació como un sistema de monitoreo predictivo de motores para minería (cintas transportadoras).
*   **Stack Inicial:** ESP32 programado en Arduino IDE, conectado a un Broker MQTT (HiveMQ), con un backend Node.js (`subscriber.js`) que inyectaba telemetría a InfluxDB Cloud.
*   **Pivote:** Tras validar la infraestructura de telemetría y el OTA (Over-The-Air), se decidió pivotar el dominio hacia el sector agrícola de precisión.

### Fase 2: Cámara Fungi Inteligente y el Full-Stack
*   **Contexto:** Se rediseñó el sistema para el control termodinámico micelial (Fungi).
*   **Desarrollo Frontend:** Nace la SPA en React + Vite + Tailwind CSS v4 con un diseño Glassmorphic.
*   **Saneamiento de Bucle (Edge):** Se mitigaron los problemas de *Heap Exhaustion* en el ESP32 aplicando la macro `F()` (PROGMEM) y se estandarizó el uso de `client_id` dinámicos basados en la MAC.

### Fase 3: Hardware-in-the-Loop (HIL) y Resiliencia
*   **Asignación de Relés Segura:** Se evitaron los pines conflictivos de boot (Strapping pins). La Manta Calefactora se movió al `GPIO 32` (Output-capable RTC), el Humidificador al `25` y el FAE (Ventilador) al `26`.
*   **Latido Inverso (Watchdog):** En lugar de que el ESP32 hiciese ping al servidor, el Node.js emitía un latido cada 10s. El ESP32 reaccionaba visualmente en su pantalla TFT (ST7735) indicando `ONLINE`, `RESCATE AP` o `SERVIDOR CAIDO`.
*   **Null-Safety UI:** Para evitar crashes de InfluxDB, el ESP32 aprendió a enviar explícitamente `null` si el DHT22 fallaba (verificado por `isnan`).

### Fase 4: La Gran Refactorización OOP (Demolición del Monolito)
*   **El Problema:** `main.cpp` se convirtió en un "God Object" inmanejable de casi 500 líneas lleno de variables globales. Además, el entorno Arduino IDE era limitante.
*   **Solución:** Migración a **PlatformIO (VS Code)**. Reducción de `main.cpp` a 87 líneas instanciando 5 clases puras: `HardwareController`, `NetworkManager`, `FirebaseManager`, `DisplayManager` y `FileManager`.

### Fase 5: El Pivote Serverless y el Motor Agnóstico (V1)
*   **El Adiós a MQTT:** Mantener un broker MQTT, un backend Node.js 24/7 y la UI causaba latencias innecesarias y altos costos de servidor. Se adoptó **Firebase Realtime Database (RTDB)** de forma nativa para comandos y telemetría, reduciendo el costo fijo a $0 y obteniendo *offline-caching* gratis.
*   **El PLC Agnóstico:** Se eliminaron reglas de histéresis hardcodeadas en C++ como `if (isFungi)`. El ESP32 mutó a un PLC universal que lee JSON desde `LittleFS`.

---

## 2. 🧠 ARQUITECTURA DE CONTROL (EL ALGORITMO RACIONAL)

La lógica de control del hardware (Capa 3 de la Topología ISA-95 del proyecto) es el corazón del ecosistema. Opera bajo un sistema de **3 Capas Deterministas**.

### A. Filtrado Digital Industrial (EWMA)
Se erradicó el muestreo "instantáneo" que provocaba aliasing.
*   **Mecanismo:** El `HardwareController` lee los sensores DHT22 y NTC cada 5 segundos y aplica un **Filtro de Media Móvil Ponderada Exponencialmente (EWMA)** con $\alpha = 0.1$.
*   **Efecto:** El 90% del ruido eléctrico transitorio se descarta, garantizando que el relé no oscile ante ráfagas de aire espurias.

### B. El Árbitro de Conflictos y Failsafes Térmicos
El motor de estados (`NORMAL`, `COOLING`, `SAFE_MODE`, `EMERGENCIA`) posee una jerarquía estricta de supervivencia:
1.  **Veto por Sustrato (Inercia Térmica Máxima):** Si la sonda NTC del sustrato supera $28.0^\circ\text{C}$, se apaga la calefacción y se fuerza extracción (`EMERGENCIA_SUSTRATO_CALIENTE`). Si cae de $15.0^\circ\text{C}$, forzamos calefacción.
2.  **Redundancia Ambiental:** Se incorporó soporte para un segundo termistor ambiental (NTC2 en `GPIO 35`) para generar un `tempPromedio`. Si ambos sensores ambientales mueren, el sistema asume `SAFE_MODE`.
3.  **Protección de Hardware (Anti-Short Cycle):** Los relés tienen un bloqueo temporal de 180 segundos post-estado para proteger componentes electromecánicos y relés de estado sólido (SSR).
4.  **FreeRTOS Task Pinning:** La FSM y sensores corren blindados en el **Core 1**, dejando las costosas operaciones SSL/Criptografía de Firebase para el **Core 0**.

---

## 3. 🌱 INVESTIGACIÓN AGRONÓMICA PROFUNDA (REINO FUNGI Y PLANTAE)

La arquitectura agnóstica fue validada estructurando los parámetros termodinámicos de las especies más exigentes de la industria *Controlled Environment Agriculture (CEA)*.

### A. Fungi (Control por Osmosis y CO2)
*   El micelio genera **calor metabólico (termogénesis)**, por lo que el núcleo del bloque siempre estará entre 2°C a 5°C más caliente que el aire.
*   **Pleurotus ostreatus / Lentinula edodes:** Requieren 4 fases universales: Incubación, Pinning (Inducción térmica), Fructificación y Descanso.
*   El umbral crítico es el CO2: Sobre 1,000 ppm, los hongos desarrollan tallos alargados y sombreros enanos (elongación).

### B. Plantae (Control por VPD y DLI)
*   Al revés que los hongos, la transpiración foliar hace que la raíz esté 1°C a 2°C más **fría** que el ambiente.
*   **Cannabis sativa / Tomate:** El factor vital no es solo la temperatura, sino el **VPD (Déficit de Presión de Vapor)**. En etapa vegetativa exigen 0.8 a 1.0 kPa, y en floración exigen >1.2 kPa para maximizar flujo de savia y evitar *Botrytis cinerea* (Botritis).
*   **Steering Transicional:** Se implementó interpolación Lineal (Lerp) en el backend (Node.js) para que al pasar de Fase Vegetativa a Floración, los setpoints cambien de a 0.1°C por hora (evitando estrés biológico).

---

## 4. 💻 FRONTEND REACT SCADA Y EXPERIENCIA DE USUARIO

*   **Zero-Latency y Estado Optimista:** La interfaz se conecta por WebSockets (SSE) a Firebase RTDB. Si un operador acciona el Extractor manualmente, la interfaz no espera a Node.js; inyecta el valor directo a `/devices/{id}/commands` encendiendo el relé en $<200\text{ms}$.
*   **Seguridad Manual:** Los *overrides* manuales del operario incluyen un menú desplegable (5, 15, 30, 60 min). Al expirar, un temporizador interno devuelve la máquina autónomamente al estado `AUTO`.
*   **Gestor de Perfiles 2.0:** Enciclopedia agronómica embebida, protección de perfiles oficiales contra borrado y un *Wizard* de customización de recetas que genera automáticamente las 4 etapas fisiológicas.
*   **Gráficos Inteligentes:** Uso de *Recharts* con `ReferenceArea` adaptativos. Las funciones de `domain` en el eje Y aseguran que la "franja ideal" siempre sea visible en el gráfico, aun si la gráfica histórica actual no contiene datos dentro de esa franja.

---

## 5. 🛑 DEUDA TÉCNICA E HISTORIAL DE MITIGACIÓN

El proyecto ha superado bloqueantes enormes, pero la auditoría arroja deudas remanentes críticas de los Sprints pasados:

| Deuda Técnica Identificada | Severidad | Estado Actual / Acción Requerida |
| :--- | :--- | :--- |
| **Exposición de Credenciales (`Secrets.h`)** | 🔴 Crítica | En Sprints medios se identificó que el `Secrets.h` (claves Firebase) no estaba en `.gitignore`. Se parcheó recientemente, **pero obliga a rotar la contraseña del Firebase Auth**. |
| **Vulnerabilidad OTA** | 🔴 Alta | El `ArduinoOTA` corre sin `setPassword()`. Cualquiera en la LAN puede flashear la máquina. Además, falta el callback `onStart` para matar Firebase, lo que causaba WDT Reset al actualizar (Flash Partition al 92%). |
| **Calibración Analógica (ADC)** | 🟡 Media | El NTC de sustrato calcula la temperatura de Steinhart-Hart correctamente, pero el ADC nativo del ESP32 desvía ~2°C. Requiere aplicar `esp_adc_cal_characterize()`. |
| **Histéresis Física Faltante** | 🟡 Media | Existe el Anti-Short-Cycle por tiempo (180s), pero la histéresis termodinámica ($\pm 0.5^\circ\text{C}$) debe implementarse a nivel lógico para no inundar el RTDB con oscilaciones. |
| **Integración Sensor de CO2** | 🟢 Baja | Planificado en Roadmap. El Firmware y UI ya tienen los campos `co2` pre-creados esperando la inyección del hardware (MH-Z19). |
| **Saturación InfluxDB (Downsampling)** | 🟢 Baja | Firebase guarda solo 100 puntos, pero InfluxDB guarda infinito. Requiere un *Rollup Task* en InfluxDB que colapse (promedie) datos $>30$ días de 1 minuto a 1 hora. |

---

*Fin del Documento Maestro Definitivo (V1).*
*Elaborado mediante inferencia Big Data de 74 reportes y sprints iterativos de desarrollo (Julio-Agosto 2026).*
