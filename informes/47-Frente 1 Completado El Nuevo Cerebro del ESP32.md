# 🍄 Frente 1 Completado: El Nuevo Cerebro del ESP32

¡Hemos transformado el ESP32 en un verdadero nodo *Edge Computing*! El código ha sido exitosamente refactorizado y **compilado sin errores**. El hardware ya no tiene sus reglas termodinámicas escritas en piedra, sino que ahora es un lienzo en blanco listo para recibir órdenes dinámicas desde tu Dashboard.

## 🛠️ ¿Qué construimos en el código C++?

### 1. El Rule Engine (Motor de Reglas Declarativo)
Se rediseñó por completo el `FileManager` y el `HardwareController`:
*   **Diccionario Físico:** Creamos estructuras nativas ultrarrápidas (`VariableFisica`, `OperadorLogico`, `ActuadorFisico`).
*   **Adiós a los if-else rígidos:** Todo el bloque enorme de código que controlaba la histéresis del calefactor y humidificador desapareció. 
*   **Motor Iterativo:** Ahora el ESP32 simplemente recorre un arreglo de reglas y pregunta: *"¿El [Sensor] es [Mayor/Menor/Igual] al [Valor]? Entonces enciendo/apago el [Actuador]"*. Todo en microsegundos y sin gastar memoria RAM dinámica (0 leaks).

### 2. El Modo MANUAL Caducable (La Bomba de Tiempo)
Aplicamos tu brillante propuesta para evitar desastres humanos:
*   Si envías un comando manual (ej: prender el Extractor), el ESP32 inicia un cronómetro con `millis()`.
*   El tiempo máximo (`max_manual_time_ms`) ahora es configurable (por defecto 15 minutos).
*   Una vez expirado, el ESP32 vuelve a `AUTO` por sí mismo.
*   **Luz en la oscuridad:** Gracias a este seguro, ahora el modo manual te permite encender la luz de noche para revisiones visuales.

### 3. Failsafes Blindados (Modo Supervivencia)
El Rule Engine es inteligente, pero obedece a ciegas lo que le manden. Por eso, dejamos los **Seguros Termodinámicos** hardcodeados por debajo del motor de reglas:
*   Si se quema o desconecta el DHT22, el sistema ignorará las reglas y apagará el calefactor de inmediato.
*   Si la temperatura interna cruza el límite crítico (Ej. 30°C), forzará el Extractor al 100%, incluso si una regla (o tú en modo manual) pidió apagarlo.

---

## ✅ Siguientes Pasos (Prueba en Hardware Real)

El firmware está compilado (`[SUCCESS] Took 35.63 seconds`). Es hora de probarlo en placa.

1.  Abre tu VS Code y conecta el ESP32 por USB.
2.  Haz clic en **Upload** (Subir código).
3.  Revisa el Monitor Serial para confirmar que dice: `Creando perfil inicial (MODO FUNGI PMV) por defecto...`. Esto confirmará que el nuevo sistema de Reglas se instaló en el disco duro (LittleFS).

¡Cuando me confirmes que la placa sigue viva y reportando, estaremos listos para atacar el **Frente 2 (React SCADA)**!
