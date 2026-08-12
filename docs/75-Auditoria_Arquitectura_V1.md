# Auditoría Maestra y Evolución Arquitectónica V1: AgriEdge OS
**Enfoque:** Construcción de un SCADA Agronómico Agnóstico bajo metodología Lean Startup.
**Fecha de Consolidación:** 11 de Agosto de 2026 (Basado en el análisis de 74 iteraciones históricas).

---

## 1. Fundamento Filosófico: Lean Startup y YAGNI

El éxito de la arquitectura actual (V1) no es producto de un diseño en cascada (Waterfall), sino de la aplicación estricta de la metodología **Lean Startup** y su ciclo **Build-Measure-Learn**. Desde el informe 01, el proyecto ha sido tratado como un organismo vivo que evoluciona eliminando el desperdicio (*Muda*) tecnológico.

*   **Principio YAGNI (*You Aren't Gonna Need It*):** En etapas tempranas, se descartó la implementación de Inteligencia Artificial (Visión por Computadora) en el Edge, priorizando alcanzar el *Product-Market Fit* del control termodinámico básico. La IA se relegó al *backlog* hasta que la infraestructura core estuviera madura.
*   **Evolución del MVP:** El proyecto nació como un prototipo de telemetría para cintas transportadoras industriales en minería. Al descubrir la oportunidad en el sector CEA (Controlled Environment Agriculture), pivotó hacia una cámara de incubación Fungi, y finalmente trascendió a su forma definitiva: un **Motor Agnóstico Universal** capaz de controlar cualquier biología (Fungi, Plantae) mediante abstracción de datos.

---

## 2. Los Pivotes Estratégicos (Decisiones Arquitectónicas Críticas)

El ciclo *Build-Measure-Learn* forzó dos grandes pivotes que definen la robustez del sistema actual:

### Pivote A: De MQTT/Node.js a Arquitectura Serverless (Firebase RTDB)
*   **La Hipótesis Fallida:** Inicialmente, se usó un Bróker MQTT (HiveMQ) y un backend en Node.js como puente obligatorio entre el hardware y el frontend. 
*   **El Problema (Measure):** El monolito introducía latencia, multiplicaba los puntos de falla (si Node.js caía, el ESP32 quedaba ciego) y requería sincronización manual de *topics*.
*   **La Solución (Learn):** Se migró a **Firebase Realtime Database (RTDB)**. Firebase actúa ahora como la Única Fuente de Verdad (SSOT). El ESP32 y la SPA en React se suscriben de forma nativa vía *Server-Sent Events (SSE)*. Esto eliminó el servidor intermediario para el control en tiempo real, garantizando latencia cero y caché *offline* nativo en el cliente.

### Pivote B: El Motor Agnóstico y los `CropProfiles`
*   El ESP32 ya no contiene reglas biológicas *hardcodeadas*. El hardware actúa exclusivamente como un Autómata Programable (PLC). Toda la inteligencia botánica o micológica reside en archivos JSON (Perfiles de Cultivo) que definen 4 Fases Universales, Setpoints y Umbrales de Emergencia. El mismo código C++ cultiva micelio o tomates sin alteración.

---

## 3. Topología de Sistemas (El Ecosistema de 4 Capas)

### Capa 1: Edge Computing (Hardware ESP32)
Firmware estructurado en C++ Orientado a Objetos (PlatformIO). 
*   **Concurrencia (FreeRTOS):** División estricta de núcleos para evitar *Kernel Panics*. El **Core 1** ejecuta el *Main Loop* termodinámico (HardwareController). El **Core 0** fue confinado (*Task Pinning*) para manejar el Stack WiFi, el Portal Cautivo y el túnel TLS de Firebase.
*   **Resiliencia (LittleFS):** El ESP32 guarda en memoria Flash el último estado conocido (`config.json`). Ante un corte de internet, el microcontrolador sigue operando de forma autónoma (Failsafe).

### Capa 2: Hub Central (Firebase RTDB)
La matriz de datos estructurada en ramas jerárquicas:
*   `/telemetry/{id}`: Solo escritura por el ESP32.
*   `/commands/{id}`: Patrón asíncrono para inyectar *Overrides* (ej. forzar ventilador) desde React.
*   `/config/{id}`: El estado actual del cultivo.

### Capa 3: Steering Engine (Orquestador Node.js)
Relegado de su rol de jefe a un proceso diferido (*Cron/Worker*).
*   **Interpolación Lineal (Lerp):** Evalúa la edad cronológica del cultivo y suaviza las transiciones de fase (ej. Vegetativo a Floración) calculando setpoints intermedios diariamente para evitar shocks térmicos en los organismos.
*   **Puente a InfluxDB:** Protege la base de datos de series temporales de la saturación aplicando *Rate Limiting* (1 inserción por minuto por nodo).

### Capa 4: Interfaz de Operador (SCADA React 19)
Construida con React 19, Vite y un diseño UI *Glassmorphic* de vanguardia.
*   **Estado Optimista:** Si el operador apaga un actuador, React actualiza la UI al instante (0 latencia perceptible) y muta la base de datos en segundo plano.
*   **Gráficos (Recharts):** Renderizado dinámico que utiliza los *ReferenceAreas* definidos en el JSON del cultivo para pintar los "rangos ideales" (verde) o "peligrosos" (rojo) directamente sobre la gráfica de temperatura y humedad.

---

## 4. El Cerebro Termodinámico (Algoritmos de Control en C++)

El diseño del hardware descarta el control *If/Else* inocente a favor de lógica industrial rigurosa:

1.  **Filtro Digital EWMA (Exponentially Weighted Moving Average):**
    Para combatir el ruido electromagnético de los relés, las lecturas de los sensores (DHT22, NTC) se pasan por un filtro EWMA con $\alpha = 0.1$. El sistema ignora picos súbitos (ruido blanco) y reacciona solo a inercias térmicas reales.
2.  **Anti-Short Cycle (Protección Electromecánica):**
    Una macro temporal (`MIN_RELAY_TIME_MS` de 180s) impide que un compresor o SSR conmute repetidamente en milisegundos cuando oscila alrededor del Setpoint, extendiendo drásticamente la vida útil del hardware.
3.  **Jerarquía de Supervivencia y Failsafes:**
    Las reglas de seguridad anulan las reglas agronómicas. Ejemplo: Si el termistor (NTC) detecta que el núcleo del sustrato supera los $28^\circ\text{C}$ (riesgo de cocción del micelio/raíces), el ESP32 entra en `EMERGENCIA`. Apaga incondicionalmente las mantas térmicas y fuerza los extractores al 100%, ignorando cualquier comando manual o fase actual, hasta que la temperatura vuelva a rangos seguros.

---

## 5. El Núcleo de Calidad Absoluta: Agronomía Aplicada

El sistema se alimenta de investigaciones biológicas exhaustivas (cero parámetros genéricos), representadas en los `CropProfiles`:

*   **Comportamiento Fungi (*Pleurotus ostreatus*):** 
    El algoritmo contempla la **Termogénesis Micelial**. Durante la Fase 1 (Incubación), el metabolismo del hongo produce calor radiante, obligando al sistema a entender que el núcleo estará entre $2^\circ\text{C}$ y $5^\circ\text{C}$ más caliente que el aire. En la Fase 3 (Fructificación/Pinning), la extracción se dispara agresivamente para mantener el CO2 $< 800\text{ppm}$, previniendo malformaciones en los primordios (elongación del estípite).
*   **Comportamiento Plantae (Horticultura Avanzada):**
    El control pivota hacia el **VPD (Déficit de Presión de Vapor)**. El sistema prioriza equilibrar la temperatura foliar con la humedad relativa ambiente ($0.8 - 1.2\text{ kPa}$) para no asfixiar los estomas y garantizar la evapotranspiración constante.

---

## 6. Deuda Técnica y Roadmap (Acciones Inmediatas Post-V1)

Para proteger la inversión y asegurar la escalabilidad hacia la V2, el método *Lean* exige identificar y priorizar los cuellos de botella residuales:

| Nivel de Riesgo | Componente | Descripción de la Deuda Técnica | Resolución Estratégica Planificada |
| :--- | :--- | :--- | :--- |
| **CRÍTICO** | **Seguridad (Credenciales)** | El archivo `Secrets.h` fue commiteado accidentalmente en el pasado con las llaves de producción. | Ejecutar rotación inmediata de credenciales en Google Cloud/Firebase y forzar exclusión estricta en el `.gitignore`. |
| **ALTO** | **Seguridad (OTA)** | Las actualizaciones remotas de Firmware no poseen protección criptográfica ni contraseña (`ArduinoOTA.setPassword`). | Implementar contraseña OTA y rutina de apagado de *Sockets* (`Firebase.end()`) antes del *Flash* para evitar corrupción de RAM. |
| **MEDIO** | **Integridad Analógica** | El ADC del ESP32 no es completamente lineal, causando un desvío de $\sim 2^\circ\text{C}$ en las sondas NTC. | Incorporar curvas polinómicas (Ecuación de Steinhart-Hart) e inyectar calibración por hardware (`esp_adc_cal`). |
| **FEATURE** | **Integración de CO2** | El CO2 actual se maneja de forma cronometrada por carencia de hardware físico. | Integrar sensor infrarrojo NDIR (MH-Z19) vía UART, vinculando su telemetría directamente a los umbrales del `CropProfile`. |
| **ARQUITECTURA** | **Costos de Almacenamiento** | InfluxDB acumulará millones de filas a largo plazo, arriesgando la capa gratuita o rendimiento. | Escribir un *Cloud Function* / Worker que aplique **Downsampling**: Resumir (promediar) la telemetría histórica con antigüedad $> 30\text{ días}$ a gránulos de 1 o 2 horas. |

---
*Este documento certifica la consolidación de la V1 del AgriEdge OS, logrando la hibridación perfecta entre Ingeniería de Hardware, Arquitectura de Software Serverless y Ciencias Agronómicas empíricas.*
