# Auditoría de Arquitectura: Cámara Fungi Inteligente (IoT)

He realizado una revisión profunda de las capas de **Edge (C++)** y **Backend (Node.js/TypeScript)** de tu ecosistema.

> [!TIP]
> **Conclusión General:** El nivel de ingeniería aplicado aquí es excepcional para un PMV. La transición a un modelo no bloqueante y la modularidad orientada a objetos en C++ demuestran que el proyecto está verdaderamente preparado para entornos industriales (y no es un simple script de Arduino). 

A continuación, el desglose detallado de mis hallazgos:

## 1. Capa Edge (ESP32 Firmware)

He revisado los archivos core, en particular `main.cpp` y `HardwareController.cpp`.

### Puntos Fuertes (Aprobados)
- **Arquitectura No Bloqueante:** El `loop()` principal en `main.cpp` está inmaculado. No hay una sola llamada a `delay()`. La gestión del ciclo de trabajo de 5000ms mediante la evaluación asíncrona de `millis()` garantiza que el Watchdog del ESP32 no se reinicie y que la red (MQTT/WiFi/OTA) tenga tiempo de procesador.
- **Matemática del NTC 10K:** La ecuación *Steinhart-Hart* simplificada (parámetro Beta) está correctamente implementada usando aritmética de punto flotante (`float`) y logaritmos naturales (`log()`). El ESP32 tiene una unidad de punto flotante en hardware (FPU), por lo que estas operaciones no penalizan el rendimiento.
- **Failsafe Industrial:** La lógica de `HardwareController::procesarLogicaDeControl()` implementa perfectamente el concepto de *Fail-Safe*. Si la lectura del DHT22 o del NTC falla (`_sensores.dhtOk == false`), los relés de la manta y el humidificador se apagan forzosamente. 

### Oportunidades de Mejora / Refactorización
- **Ruido en ADC (Lectura del NTC):** La lectura actual es directa (`int ntcValue = analogRead(PIN_NTC);`). En entornos industriales o cerca de relés/balastros, el ADC del ESP32 sufre de ruido eléctrico.
  - *Propuesta:* Implementar un filtro de promedio móvil (Oversampling) leyendo el ADC unas 10 o 20 veces consecutivas con un pequeño retraso de microsegundos y promediando el resultado antes de inyectarlo a la ecuación de Steinhart-Hart.

## 2. Capa Backend (Cerebro Node.js)

He revisado el motor de suscripción MQTT e integración con InfluxDB en `subscriber.ts`.

### Puntos Fuertes (Aprobados)
- **Batching en InfluxDB:** Es excelente que hayas eliminado el `writeApi.flush()` por cada mensaje. La librería `@influxdata/influxdb-client` gestiona buffers internos y realiza el envío de datos en ráfagas (batching) automáticamente. Esto previene un cuello de botella HTTP si en el futuro tienes 50 cámaras enviando telemetría al mismo tiempo.
- **Watchdog Lógico (Latidos):** El uso de `Map` para gestionar temporizadores de desconexión por cada `deviceId` permite que el sistema escale (Multicámara) sin que el fallo de un ESP32 detenga la evaluación de los demás.
- **Apagado Seguro (Graceful Shutdown):** La captura de la señal `SIGINT` (Ctrl+C o reinicio de contenedor) que fuerza un `await writeApi.close()` asegura que el buffer en memoria de InfluxDB se escriba en disco antes de matar el proceso.

### Oportunidades de Mejora / Refactorización
- **Gestión de Memoria en Watchdog:** Si una cámara se desconecta, el `setTimeout` cambia su estado a OFFLINE, pero el objeto temporizador en sí ya cumplió su función. Si la cámara nunca vuelve, el mapa `temporizadoresLatidos` seguirá acumulando referencias muertas.
  - *Propuesta:* Dentro del *callback* del `setTimeout` que declara la pérdida de latidos, añade un `temporizadoresLatidos.delete(deviceId);` para limpiar el mapa y liberar memoria (Garbage Collection).

---

## Próximos Pasos

Dado que la base es muy sólida, mi recomendación es que ataquemos cualquiera de estos frentes ahora mismo. **¿Qué te gustaría hacer?**

1. **Refactorizar el ADC del ESP32:** Te escribo la función de *Oversampling* para limpiar la señal del sensor NTC.
2. **Ajuste en TypeScript:** Aplicar las mejoras de limpieza de memoria en el backend.
3. **Movernos al Frontend:** Iniciar la auditoría de la capa de React, verificando los componentes `MetricCards` y cómo consumen el endpoint `/api/cultivo/estado`.
4. **Comenzar con la Inteligencia Artificial:** Si ya quieres conectar Node.js con Google AI Studio para predicciones.
