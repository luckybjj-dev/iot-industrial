# Informe Maestro: Auditoría Técnica y Estratégica Completa - Arquitectura SCADA V1 (AgriEdge OS)

**Fecha:** Agosto 2026
**Hito:** Estabilización de Arquitectura SCADA V1, Pivote RTDB y Filtros Matemáticos.

---

## 1. Introducción
El proyecto ha dejado formalmente atrás su etapa de prototipo para consolidarse como una aplicación de nivel industrial (AgriEdge OS). Este documento sirve como una auditoría de código de principio a fin, documentando el recorrido arquitectónico, los pivotes estratégicos tomados a lo largo de los *sprints*, y las razones técnicas de peso que forjaron la estructura actual.

## 2. Topología de Red y Arquitectura Final (V1)
El sistema ahora opera bajo una arquitectura desacoplada de 4 pilares fundamentales, todos orquestados mediante **Firebase Realtime Database (RTDB)** como única fuente de la verdad.

1. **Hardware Edge (ESP32 - C++)**: Actúa como el "músculo y los reflejos". Su única misión es leer sensores, filtrar ruido, publicar telemetría y mantener la estabilidad termodinámica del cultivo basándose en un "perfil ideal" cargado en memoria. Es 100% autónomo frente a caídas de internet.
2. **Cerebro Central (Firebase RTDB)**: Sustituye por completo al antiguo Broker MQTT. Maneja la sincronización de estado bidireccional mediante nodos de telemetría y comandos de forma nativa.
3. **Motor de Steering (Node.js)**: Actúa como el "director de orquesta del tiempo". Un proceso backend que corre de fondo evaluando la línea de tiempo de la fase actual, calculando interpolaciones lineales matemáticas para suavizar transiciones de 24 horas entre etapas, e inyectando las nuevas reglas al Firebase.
4. **Dashboard SCADA (React + TypeScript)**: La interfaz humano-máquina. Proporciona visualización histórica, gestión de perfiles de cultivo (Crop Profiles), semáforos de estabilidad y control de la línea de tiempo (Pause, Stop, Avanzar).

## 3. Pivotes Estratégicos (Decisiones Clave)

A lo largo del proyecto, tomamos decisiones drásticas pero necesarias para alcanzar el estándar industrial. Estas son las más importantes:

### 3.1. Abandono de MQTT a favor de Firebase RTDB Nativo
*   **Contexto:** Originalmente, la comunicación dependía de HiveMQ y el protocolo MQTT.
*   **Problema:** Sincronizar el estado histórico, la telemetría en vivo, y los comandos requería tener 2 canales paralelos (MQTT para vivo, Firebase para historial) y lógicas complejas de retención.
*   **El Pivote:** Eliminamos MQTT por completo. Pasamos a usar los SDK de Firebase tanto en el ESP32, Node.js y React. Esto nos dio un "State Management" nativo, donde cada variable es una rama en un árbol JSON gigante, sincronizado en tiempo real y con persistencia offline garantizada por Google.

### 3.2. Delegación del Control al Edge (Failsafes Locales)
*   **Contexto:** Al inicio, la nube o el usuario enviaban comandos directos (ej. "Enciende el calefactor").
*   **Problema:** Si el internet caía, el ESP32 se quedaba ciego o pegado en un estado, arriesgando quemar el cultivo.
*   **El Pivote:** La nube ahora **solo envía reglas o perfiles** (ej. "Mantén la temperatura entre 22° y 24°"). El ESP32 guarda este `DeviceCropProfile` en su RAM y toma decisiones de vida o muerte localmente mediante su controlador lógico.

### 3.3. Inyección de Filtrado Matemático (EWMA)
*   **Contexto:** Los sensores (DHT22, NTC) hacían muestreos instantáneos (*snapshots*) cada 5 segundos.
*   **Problema:** Pequeñas ráfagas de viento o ruido eléctrico hacían que las lecturas saltaran 2 grados en un segundo, engañando a los algoritmos y causando que los relés "parpadearan" (desgaste mecánico).
*   **El Pivote:** Se integró el estándar industrial **Exponentially Weighted Moving Average (EWMA)**. Ahora, la RAM purifica el dato de forma exponencial (10% dato nuevo, 90% inercia histórica), entregando curvas perfectas y suaves al PID y al dashboard web.

### 3.4. Inyección Instantánea de Transiciones UI
*   **Contexto:** Al avanzar una etapa fenológica manualmente desde la Web, la UI escribía el evento en la línea de tiempo (`plan_state`) y esperaba que el cron-job de Node.js (que corre cada 5 min) inyectara los comandos.
*   **Problema:** Existía un *lag* de hasta 5 minutos donde el usuario no veía reflejado su cambio.
*   **El Pivote:** Interceptamos la función en React (`sendConfigRules`) para inyectar un *bypass* directo hacia `commands/crop`. Ahora el hardware y la UI se actualizan en < 200 milisegundos tras pulsar "Avanzar".

## 4. Aciertos y Desaciertos Contrastados

| Decisión Inicial (Descartada) | Decisión Final (Acierto) | Razón Técnica |
| :--- | :--- | :--- |
| **Gráfico 3-Ejes (Y):** Intentar forzar Temperatura, Humedad y VPD en ejes separados generaba un cruce de líneas ilegible. | **Auto-escalado Interactivo y Bandas de Tolerancia:** Ejes unificados con leyendas clickeables para aislar curvas, y bandas `ReferenceArea` coloreadas de fondo. | Mejora absoluta en la Experiencia de Usuario (UX) diagnóstica. Al ocultar curvas, el gráfico recalcula sus dimensiones matemáticas (`domain`) para asegurar que el rango ideal nunca desaparezca de la pantalla. |
| **Control basado en if/else brutos:** Encender extractores apenas se supera el límite. | **Motor de Reglas Declarativo (Rule Engine):** Lógica encapsulada y estructurada. | Permite incluir múltiples variables (Temp. Sustrato vs Temp. Ambiente vs Humedad) para tomar decisiones racionales sin anidamientos espagueti. |
| **Hardcodear perfiles de cultivo:** El ESP32 sabía cómo cultivar hongos dentro del código fuente C++. | **Cerebro Agnóstico:** El ESP32 no sabe nada de hongos, solo obedece rangos matemáticos que bajan desde la nube. | Escalabilidad masiva. El mismo código hardware sirve para cultivar hongos, marihuana, tomates, o controlar el clima de una sala de servidores. |

## 5. Arquitectura del Histórico (Frontend React)
En el Dashboard SCADA, integramos `Recharts` para leer una matriz temporal desde `/device_history`. 
Logramos un mapeo eficiente gracias a que la telemetría baja en paquetes diarios (`YYYY-MM-DD`). 
Las bandas de objetivo (`ReferenceArea`) que colorean el fondo del gráfico (naranja para temperatura, azul para humedad) se alimentan directamente del `DeviceCropProfile` en memoria, vinculando estrechamente el motor de reglas con la experiencia visual del operario.

## 6. Próximos Pasos (Roadmap Post-V1)
El proyecto cuenta con un estado maduro y robusto. Las únicas tareas de deuda técnica que quedan registradas para el futuro son:
1. **Integración Sensor CO2:** Agregar lectura al pipeline EWMA y telemetría.
2. **Estrategia de Downsampling:** Crear una Cloud Function o proceso Node.js que comprima los historiales mayores a 30 días (promedios horarios en lugar de promedios de 5 minutos) para evitar inflar los costos del plan de Firebase.
3. **Paginación/Lazy Loading en UI:** Asegurar que vistas históricas de 15 a 30 días no sobrecarguen el DOM en React.

---
*Fin de la Auditoría V1.*
