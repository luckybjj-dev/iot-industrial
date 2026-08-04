# Informe Oficial de Cierre - Sprint 5
**Proyecto:** Cámara Fungi Inteligente (Monorepo IoT)
**Fase:** Integración Full-Stack y Refactorización Core
**Autor:** Principal Software Engineer

---

## Resumen Ejecutivo
El Sprint 5 marca un hito crítico en la evolución del proyecto Cámara Fungi, logrando la transición exitosa de un prototipo de telemetría aislada hacia una arquitectura de grado industrial completamente Full-Stack. Hemos consolidado el ecosistema integrando tres capas fundamentales: Edge (ESP32), Backend (Node.js/InfluxDB) y Frontend (React). Esta evolución establece una topología robusta que permite la recolección, orquestación y visualización de datos termodinámicos en tiempo real, pavimentando el camino hacia futuras integraciones de Inteligencia Artificial para el control autónomo del micelio.

## Refactorización Core (Edge & Backend)

### Capa Edge (ESP32)
- **Identidad Dinámica (MAC Address):** Se refactorizó la lógica de conexión MQTT para que el `client_id` y los tópicos de publicación dependan de la dirección MAC del dispositivo. Esto permite la coexistencia y escalabilidad masiva de múltiples nodos sin colisiones de red.
- **Optimización de Memoria (SRAM):** Se implementó de manera rigurosa la macro `F()` en todas las cadenas de texto (strings) estáticas y mensajes de depuración. Esta directiva fuerza el almacenamiento en la memoria Flash (PROGMEM) en lugar de la SRAM, erradicando los reinicios aleatorios (Watchdog resets) provocados por desbordamiento de memoria (heap exhaustion).
- **Resiliencia LWT:** Implementación de mensajes *Last Will and Testament* (LWT) específicos por dispositivo (`proyecto_iot/edge/[DEVICE_ID]/estado`) para notificar caídas abruptas de energía de forma inmediata.

### Capa Backend (Node.js)
- **Gestión Multicámara (Estado en Memoria):** Sustitución de variables de estado singulares por estructuras `Map<string, any>` de alto rendimiento. El Cerebro Central ahora orquesta concurrentemente el estado (`estadosEdge`) y telemetría (`telemetriaRecibida`) de $N$ nodos.
- **Optimización de Inserción InfluxDB:** Se delegó el *flush* de datos de escritura hacia la base de datos al mecanismo automático de lotes (*batching*) del cliente `@influxdata/influxdb-client`, eliminando cuellos de botella de latencia I/O durante ráfagas de telemetría.
- **Blindaje y Seguridad:** Integración de `cors` para acceso seguro desde el Frontend y el diseño de un Middleware de seguridad estricto que exige una `API Key` para proteger endpoints críticos (control bidireccional y comandos hacia los relés físicos).

## Despliegue del Frontend (React)

- **Arquitectura y Stack:** Despliegue de una *Single Page Application* (SPA) ultrarrápida impulsada por Vite, React, TypeScript y Tailwind CSS.
- **Flujo de Tipos Estrictos:** Modelado tipado estricto en la frontera de datos (`EstadoCamara`, `TelemetriaFungi`) para garantizar un contrato impecable con la respuesta del Backend.
- **Dashboard en Tiempo Real:** Orquestación en `App.tsx` implementando un patrón de sondeo (polling) protegido por bloques de limpieza (cleanup). Renderización dinámica que separa automáticamente los nodos detectados y sus respectivas métricas a través de componentes encapsulados modulares (`MetricCard.tsx`).
- **Diseño Glassmorphism:** Implementación visual avanzada para una experiencia de usuario premium, utilizando superposición y desenfoque (backdrop-blur) adaptado al ecosistema corporativo.

## Decisiones de Ingeniería (Trade-offs)

> [!NOTE]
> **Aislamiento de Entornos (Múltiples Terminales)**
> Decidimos separar estricta y deliberadamente los entornos de ejecución (Vite en un puerto, Node.js en otro, PlatformIO en paralelo). Aunque incrementa la complejidad del orquestador de desarrollo local, asegura que fallos críticos en el pipeline de un compilador (ej: Hot Reloading de Vite) no detengan el broker o la orquestación IoT en segundo plano.

> [!WARNING]
> **Evolución del Motor Tailwind (v3 vs v4)**
> Durante la integración del framework CSS, navegamos la transición del motor de Tailwind. Inicialmente condicionados al comportamiento tradicional, migramos con éxito a la especificación nativa de la versión 4 (`@tailwindcss/vite` y directivas `@utility`), sacrificando compatibilidad de sintaxis anidada de `@layer components` antigua a cambio de compilación *Just-In-Time* ultrarrápida usando `esbuild`.

## Próximos Pasos (Backlog Sprint 6)

El Sprint 6 estará centrado en cerrar el bucle de control (Closed-Loop Control) y preparar el terreno para ML/AI:

1. **Inyección de Inteligencia Artificial (Self-Tuning):** Incorporar un algoritmo basado en IA que analice series temporales en InfluxDB para auto-ajustar los umbrales de humedad y temperatura según la curva de crecimiento ideal del hongo.
2. **Generación Aumentada por Recuperación (RAG):** Integrar un asistente RAG en el Dashboard para consultar *papers* y literatura científica sobre micelio, recomendando regímenes termodinámicos dinámicos.
3. **Hardware en el Lazo (HIL):** Subir el firmware Edge definitivo al hardware físico y validar el enrutamiento bidireccional mediante el panel de control del frontend.
4. **Almacenamiento Persistente en Edge:** Soporte SPIFFS para guardar los umbrales ante pérdidas de conexión prolongadas.
