# Auditoría Técnica y Estratégica Definitiva — Arquitectura SCADA V1 (AgriEdge OS)

**Fecha:** Agosto de 2026  
**Rol del Auditor:** Arquitecto de Software Senior — Sistemas Embebidos IoT / DevOps / Ciencias Agronómicas  
**Alcance de la Auditoría:** Refactorización Integral a V1, Migración desde MQTT a Firebase RTDB, Filtrado Digital Industrial, Backend Node.js y Frontend React SCADA.

---

## 1. 📊 ESTADO EJECUTIVO DEL PROYECTO (EL HITO V1)

El proyecto ha madurado desde un MVP experimental (Cámara Fungi) a un sistema industrial completo y agnóstico denominado **AgriEdge OS (V1)**. Esta auditoría exhaustiva unifica el conocimiento extraído a través de 74 reportes de sprint previos, contrastando los hallazgos críticos del reporte #64 con las resoluciones definitivas de los últimos sprints.

El sistema se compone ahora de un ecosistema fuertemente desacoplado de 4 pilares:
1. **Edge Node (ESP32 C++)**: Inteligencia en el lazo cerrado, autonomía total offline, y filtrado matemático.
2. **Central Hub (Firebase RTDB)**: Única fuente de la verdad (SSOT), gestionando estados en tiempo real sin brokers intermediarios.
3. **Steering Engine (Node.js)**: Orquestador cronológico y puente histórico (InfluxDB).
4. **SCADA Dashboard (React)**: Interfaz Humano-Máquina reactiva de latencia ultra-baja.

---

## 2. 🏗️ CAPA 1: EDGE NODE (FIRMWARE ESP32 C++)

El código C++ ha sido la pieza más desafiante. Se ha estabilizado la arquitectura modular orientada a objetos (OOP) y se han solucionado múltiples deudas de rendimiento.

### 2.1 Gestión de Memoria y Actualizaciones Over-The-Air (OTA)
*   **Flash y Particiones (`min_spiffs.csv`):** El firmware actual ocupa ~1.75MB de los 1.9MB asignados a la partición `app0`. El margen para actualizaciones OTA es estrecho (~150KB). 
*   **Corrección OTA:** En la auditoría #64 se detectó que el OTA fallaba (WDT Timeout) debido a la competencia de CPU por las tareas SSL de Firebase. Se ha documentado la necesidad de agregar callbacks `ArduinoOTA.onStart([]() { Firebase.end(); })` para matar los sockets antes del volcado a Flash. Además, se requiere aplicar una contraseña (`setPassword`) para evitar flasheos maliciosos en red local.
*   **RAM y Fragmentación:** El uso de `DynamicJsonDocument` dentro de los loops de red ha sido un punto crítico. La adopción de variables `StaticJsonDocument` y arreglos de caracteres estáticos (`char[]`) es la solución recomendada para evitar fragmentación del Heap a lo largo de los meses.

### 2.2 Motor Termodinámico Industrial (HardwareController)
La clase `HardwareController` actúa como el árbitro (PLC) del sistema, evaluando métricas a 5 segundos de intervalo.
*   **Filtro Digital EWMA (Exponentially Weighted Moving Average):** Las métricas crudas de los sensores (DHT22 y NTC) generaban "ruido" que activaba falsamente los relés. Implementamos el estándar industrial EWMA (con `alpha = 0.1`). Esto significa que el hardware descarta el 90% del ruido instantáneo basándose en su inercia térmica histórica, entregando curvas perfectas (suaves) tanto al PID como al dashboard web.
*   **Control PID de Modulación Lenta (Time-Proportioning):** Se abandonó el control *Bang-Bang* (On/Off basado en ifs brutos). Ahora, un lazo Proporcional-Integral-Derivativo (PID) calcula el esfuerzo térmico y genera un PWM ultra lento (ventana de 5 segundos), ideal para Relés de Estado Sólido (SSR) sin desgaste electromecánico.
*   **Anti-Short-Cycle vs Histéresis:** El firmware protege el desgaste mecánico apagando relés instantáneamente ante emergencias, pero impidiendo el re-encendido por 3 minutos (debouncing de potencia).

### 2.3 Resiliencia a Caídas y Sensórica
*   **Sensores y Calibración:** El DHT22 cuenta con control de errores (`isnan`). El termistor (NTC de sustrato) utiliza la Ecuación de Steinhart-Hart (Beta 3950). *Deuda pendiente:* Integrar calibración del conversor analógico/digital (`esp_adc_cal_characterize`) para eliminar el sesgo nativo del hardware de Espressif (error ~2°C).
*   **Portal Cautivo WiFi y Operación Offline:** El sistema sobrevive sin WiFi, levantando un portal cautivo temporal (AP Fallback `Fungi_Setup_XX`). El ESP32 sigue controlando la cámara basándose en el último `CropProfile` guardado en memoria flash (LittleFS).

---

## 3. ☁️ CAPA 2: CENTRAL HUB Y BACKEND (NODE.JS)

### 3.1 El Pivote Definitivo: Firebase RTDB vs MQTT
Se determinó en el ADR-001 y siguientes reportes que mantener un Broker MQTT para telemetría y Firebase para persistencia era un anti-patrón de alta fricción.
*   **Resolución:** Abandono completo de MQTT. Todo (comandos, telemetría y configuración de cultivo) se canaliza mediante Streams Persistentes (Server-Sent Events) nativos del SDK de Firebase. Esto simplifica la infraestructura, provee control de desconexión implícito, offline-caching y un JSON arbóreo global (SSOT).

### 3.2 Crop Steering Engine (Motor de Transiciones)
Ubicado en `backend_node/src/steeringEngine.ts`. 
*   **Lógica Agronómica Agnóstica:** El sistema no conoce "especies" (tomates o setas), solo lee un JSON abstracto con Fases, Setpoints y Duraciones.
*   **Interpolación Lineal (Lerp):** El backend corre un Cron-job cada 5 minutos. Si el cultivo entra en una "ventana de transición" (ej. 24 horas de otoño simulado), el Node.js calcula un % de progreso y mezcla los setpoints matemáticamente entre la fase actual y la futura, empujando los valores progresivos hacia el ESP32. Esto evita el shock térmico fisiológico.

### 3.3 El Puente Hacia InfluxDB
Ubicado en `backend_node/src/subscriber.ts`.
*   El backend escucha la telemetría viva de Firebase, pero **aplica Rate Limiting (1 vez por minuto por dispositivo)** antes de enviar el punto a InfluxDB (Serie de Tiempo / Data Warehouse). Esto es crítico para no saturar la base de datos a largo plazo ni disparar los costos en la nube.

---

## 4. 💻 CAPA 3: INTERFAZ SCADA (REACT FRONTEND)

El dashboard `frontend_react` fue elevado a estándar SCADA industrial, primando la usabilidad diagnóstica (Data Visualization) y la latencia imperceptible.

### 4.1 Arquitectura Optimista (Zero-Backend Delay)
*   **Bypass de Inyección de Fases (`CropStatePanel.tsx`):** Cuando el operador decide forzar o avanzar una fase fenológica en el dashboard, no hace un request HTTP a Node.js para que éste procese la orden y responda (round-trip pesado). La UI de React muta los comandos instantáneamente empujando a `devices/{id}/commands/crop` en Firebase. El ESP32 recibe el cambio en <200ms por su Stream, actualizando sus relés en tiempo real.

### 4.2 Visualización de Precisión y Auto-Escalado (`TelemetryDashboard.tsx`)
*   Se utilizan Gráficos Unificados con *Recharts*.
*   **Problema resuelto:** Inicialmente, si el operador quería ver una sola curva (ej. Temperatura) aislando el resto de ruido, Recharts escalaba los ejes en base a la data histórica ignorando la franja verde objetivo (ReferenceArea). Si la temperatura caía brutalmente, la banda verde quedaba fuera del monitor.
*   **Solución Algorítmica:** Se implementó una función dinámica en la propiedad `domain` del Eje Y que intercepta el `dataMin` y `dataMax` histórico y fuerza la inclusión aritmética de los variables ideales (`temp_ideal_min`, `temp_ideal_max`). De esta forma, el operario siempre tiene contexto visual de qué tan lejos está del objetivo, sin importar cuánto aísle la gráfica.

---

## 5. 🛑 CRITICIDADES Y ROADMAP HACIA V2

Pese al altísimo grado de madurez del ecosistema, el proyecto arrastra algunas deudas técnicas que deben agendarse en próximos sprints:

### Riesgos y Vulnerabilidades Actuales
1.  **Seguridad Crítica (Remediada Parcialmente):** El archivo `Secrets.h` fue un vector de vulnerabilidad. Se debe asegurar su persistencia en el `.gitignore` y proceder a rotar todas las Auth Keys de Firebase en producción.
2.  **Calibración y Desviaciones Analógicas:** El ESP32 requiere `esp_adc_cal_characterize` para el termistor NTC para ser 100% confiable en el cálculo del VPD y la humedad del sustrato.
3.  **Seguridad de Acceso Local (OTA):** Inyección imperativa de contraseña en el flujo de ArduinoOTA.

### Roadmap Técnico y Agronómico
1.  **Integración de CO2:** Inyección física del sensor MH-Z19 o similar en la placa PCB, anexarlo al filtro EWMA de C++, y al puente InfluxDB.
2.  **Estrategia de Downsampling:** Los gráficos históricos se saturan si traen miles de puntos por mes. El backend de Node.js deberá incluir rutinas programadas de "Rollup" en InfluxDB, reduciendo data >30 días de granulación de 1 min a granulación de 15 mins o 1 hora (promedios), aligerando enormemente el payload del frontend en las peticiones.
3.  **Control Computer Vision (PDI/CEI):** Las fundaciones del "Steering Agnóstico" ya existen, permitiendo evolucionar en V2 a transiciones gatilladas por imágenes de cámaras analizando la morfología de crecimiento en lugar de ser gatilladas por meros días calendario.

---
**FIN DE LA AUDITORÍA DE ARQUITECTURA V1.**
El ecosistema completo (Edge-Cloud-Frontend) es ahora coherente, tolerante a fallos y está dotado de algoritmos industriales.
