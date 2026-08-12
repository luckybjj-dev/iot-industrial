# Documento de Arquitectura de Software (SAD) — AgriEdge OS V1

**Fecha de Compilación:** 11 de Agosto de 2026
**Alcance:** Consolidación Técnica y Estratégica de los Sprints 01 al 74.
**Estado del Sistema:** Estabilización de Arquitectura V1.

---

## 1. Visión General y Evolución Estratégica

**AgriEdge OS** es un ecosistema IoT de grado industrial concebido para la Agricultura en Entorno Controlado (CEA). 

### La Evolución de la Hipótesis
El proyecto nació bajo el dominio del monitoreo predictivo de motores en minería. Tras probar la viabilidad de la infraestructura base, se pivotó estratégicamente hacia el sector de la micología (Cámara Fungi Inteligente), buscando resolver el problema del control termodinámico preciso del micelio. 

Finalmente, la arquitectura convergió en un modelo superior: **El Motor Agnóstico (SCADA Industrial)**. La premisa central (validada en V1) dicta que el controlador de hardware (ESP32) no debe contener reglas biológicas hardcodeadas. El firmware actúa como un Autómata Programable (PLC) universal que ejecuta *Perfiles de Cultivo* (JSON), lo que permite que el mismo hardware e infraestructura escalen idénticamente para invernaderos de Tomate, granjas de *Cannabis sativa* o cámaras de fructificación de *Pleurotus ostreatus*.

### Pivotes Arquitectónicos Estructurales
1. **El Abandono de MQTT y el Monolito Node.js:** Se eliminó el Broker MQTT (HiveMQ) y la dependencia de un backend central como mediador. La latencia, la complejidad de mantener *topics* sincronizados y el costo operativo resultaban anti-patrones para una red IoT con alta fluctuación de conexión.
2. **Adopción de Firebase Realtime Database (RTDB):** Se implementó una arquitectura Serverless donde Firebase actúa como la Única Fuente de Verdad (SSOT). El ESP32 y el Dashboard React interactúan mediante flujos nativos *Server-Sent Events (SSE)*, garantizando bidireccionalidad instantánea y soporte nativo para *offline-caching*.

---

## 2. Topología del Ecosistema (Las 4 Capas)

El ecosistema opera mediante un diseño altamente desacoplado basado en micro-roles:

### Capa 1: Edge Computing (ESP32 C++)
Firmware desarrollado en PlatformIO, refactorizado desde un archivo espagueti monolítico hacia una arquitectura pura orientada a objetos (OOP).
* **Paralelismo (FreeRTOS):** La máquina de estados termodinámica (lectura de sensores y actuación de relés) opera ininterrumpidamente en el **Core 1** del microprocesador. Todas las operaciones asíncronas de red, portal cautivo WiFi y túneles criptográficos TLS (Firebase SDK) fueron fijadas (*Task Pinning*) al **Core 0** para evitar condiciones de carrera.
* **Persistencia Local (LittleFS):** El microcontrolador es resistente a cortes eléctricos y caídas de Internet. Almacena en memoria Flash el archivo `config.json` con los parámetros del cultivo en curso.
* **Gestión de Memoria y OTA:** Para mitigar la fragmentación de la memoria SRAM (Heap), se implementó el uso estricto de buffers estáticos (`StaticJsonDocument`) y la macro `F()` en PROGMEM para constantes. 

### Capa 2: Central Hub (Firebase RTDB)
Sustituto del bróker tradicional. Segmenta los datos en 3 grandes árboles lógicos:
* `/telemetry/{deviceId}`: Escrito por el ESP32, leído por React (Variables Físicas).
* `/devices/{deviceId}/commands`: Leído asíncronamente por el ESP32. Inyecta estados *Override* (ej. Forzar Encendido de Extractor).
* `/devices/{deviceId}/config`: Almacena el `CropProfile` JSON activo.

### Capa 3: Steering Engine (Orquestador Node.js)
El backend Node.js fue relegado de ser el controlador principal a operar como un **Proceso Diferido (Worker/Cron-job)**.
* **Interpolación Lineal (Lerp):** El motor despierta cada 5 minutos, evalúa la edad cronológica del cultivo y calcula las transiciones de fase fenológica. Si el cultivo pasa de "Vegetativo" a "Floración", el backend inyecta progresivamente los nuevos setpoints en Firebase para evitar un shock térmico perjudicial.
* **Puente a InfluxDB:** Para proteger los costos y límites de inserción del Data Warehouse temporal (InfluxDB), el Node.js aplica un *Rate Limiting* estricto (1 muestra por minuto por nodo) antes de persistir la telemetría en frío.

### Capa 4: Dashboard SCADA (Frontend React)
SPA construida sobre React 19, Vite y Tailwind CSS. 
* **Zero-Latency / Estado Optimista:** La interfaz puentea al backend. Si el operario activa un control manual, React muta la variable en RTDB directamente. El ESP32 reacciona en $< 200\text{ms}$.
* **Protección UI:** La lógica asegura que si el sistema está en `AUTO`, la interfaz bloquea (disable) cualquier intervención manual.

---

## 3. Cerebro Termodinámico y Señales Analógicas

El núcleo del hardware (`HardwareController.cpp`) implementa lógica de control industrial para maximizar la vida útil de los actuadores y descartar lecturas falsas.

### A. Filtrado Digital (Filtro EWMA)
Los sensores ambientales (DHT22) y analógicos (NTC) están sujetos a interferencia electromagnética. En lugar de utilizar una media móvil simple (que consume mucha RAM en arrays circulares), se implementó el **Filtro de Media Móvil Ponderada Exponencialmente (EWMA)** con un factor de suavizado $\alpha = 0.1$. El controlador descarta el 90% del impacto de una lectura instantánea espuria, respondiendo únicamente a variaciones térmicas reales sostenidas.

### B. Jerarquía de Supervivencia y Failsafes
El algoritmo de control no es un simple *if/else*. Es un árbitro de conflictos:
1. **Inercia del Sustrato:** La masa del bloque de tierra/micelio retiene calor por horas. Si el termistor (NTC) del sustrato supera los $28.0^\circ\text{C}$, se declara `EMERGENCIA_SUSTRATO_CALIENTE`. El sistema impone un *Override* físico: enciende la extracción al 100% y bloquea electrónicamente el encendido de la calefacción, sin importar la configuración de la fase agronómica actual.
2. **Protección Electromecánica (Anti-Short Cycle):** Una vez que un relé cambia de estado (ej. de ON a OFF), un temporizador (`MIN_RELAY_TIME_MS` de 180s) bloquea una nueva orden de conmutación. Esto protege a los compresores, relés de estado sólido (SSR) y contactores de un desgaste prematuro inducido por micro-oscilaciones alrededor del Setpoint.

---

## 4. El Motor Agnóstico y Bases Agronómicas

El sistema abstrae las diferencias biológicas de las especies en perfiles JSON intercambiables (`CropProfiles`).

### A. Dinámicas del Reino Fungi (*Pleurotus*, *Lentinula*)
* **Termogénesis Micelial:** Durante la fase 1 (Incubación), el metabolismo del hongo produce calor radiante. La arquitectura compensa asumiendo empíricamente que el núcleo del sustrato estará $+2^\circ\text{C}$ a $+5^\circ\text{C}$ por encima del aire circundante.
* **Control por CO2:** En fase 3 (Fructificación), los altos niveles de CO2 indujeron malformaciones morfológicas en pruebas tempranas (elongación del estípite). El perfil fuerza ciclos agresivos de renovación de aire (FAE) para mantener el umbral por debajo de $800\text{ ppm}$.

### B. Dinámicas del Reino Plantae (Horticultura en CEA)
* **Control por Evapotranspiración (VPD):** A diferencia de los hongos, las plantas en fase de engorde hídrico mantienen su zona radicular más fría que el aire.
* El perfil fenológico se estructura en torno al **Déficit de Presión de Vapor (VPD)** (ideal entre $0.8$ y $1.2\text{ kPa}$), priorizando la humedad relativa inversamente proporcional a la temperatura para asegurar el flujo de savia hacia los estomas foliares.

---

## 5. Deuda Técnica y Roadmap Post-V1

A pesar de la robustez arquitectónica alcanzada, la auditoría del hito V1 expone vectores de mejora críticos que deben ser abordados de forma obligatoria en la iteración V2:

| Componente | Vulnerabilidad / Deuda Técnica | Resolución Estratégica Planificada |
| :--- | :--- | :--- |
| **Seguridad de Credenciales** | El archivo `Secrets.h` (Claves Firebase) fue excluido de `.gitignore` en etapas tempranas. | **Acción inmediata:** Rotación de credenciales de Base de Datos y Auth Keys de producción. |
| **Over-The-Air (OTA)** | Riesgos de inyección local e inestabilidad de RAM al flashear debido a sockets abiertos. | Incorporar `ArduinoOTA.setPassword()` y rutinas de apagado seguro (`Firebase.end()`) en el callback `onStart`. |
| **Hardware Analógico** | El Termistor (NTC) sufre un desvío de $\sim 2^\circ\text{C}$ debido a la no-linealidad nativa del ADC de Espressif. | Aplicar el marco de calibración de hardware `esp_adc_cal_characterize()` en la función de inicialización del ESP32. |
| **Sensores Futuros** | Ausencia de lectura física de Dióxido de Carbono real (se maneja por cronometría inferida). | Integración del protocolo UART para módulo NDIR de CO2 (Serie MH-Z19). |
| **Data Warehouse** | Los gráficos históricos de Recharts colapsan la UI si se extraen miles de puntos por mes. | Implementar *Downsampling Tasks* en InfluxDB que resuman (promedien) datos con antigüedad $> 30\text{ días}$ a gránulos de 1 hora. |

---

*Documento auditado, consolidado y aprobado en el Hito V1 del Proyecto AgriEdge OS.*
