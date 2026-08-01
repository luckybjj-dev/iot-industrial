# Informe de Pivote Estratégico y Hoja de Ruta - Sprint 8
**Proyecto:** Cámara Fungi Inteligente (Ecosistema IoT de Grado Industrial)  
**Fase:** Pivote de PMV (Producto Mínimo Viable) hacia "Plug & Play" Comercial  
**Objetivo Principal:** Validación en mercado con *Burn Rate* de $0.  

---

> [!IMPORTANT]
> **Resumen Ejecutivo**
> Tras una auditoría exhaustiva de nuestra arquitectura actual, la Junta Directiva ha decidido ejecutar un pivote estratégico. El objetivo es evolucionar el prototipo de laboratorio hacia un producto IoT comercial 100% "Plug & Play", priorizando el *Time-to-Value* para el cliente y erradicando los costos fijos de infraestructura cloud. Este documento detalla la transición hacia un modelo Serverless (Firebase) y la adopción de un motor de control agnóstico.

---

## 1. El Pivote Estratégico (Visión Lean Startup)

Nuestra estrategia comercial y tecnológica se realinea bajo tres pilares fundamentales para garantizar la escalabilidad financiera y operativa:

*   **Arquitectura Serverless ($0 Costo Fijo):**
    Migramos de un stack tradicional dependiente de servidores 24/7 (Node.js + MQTT + InfluxDB) a una arquitectura 100% Serverless. El microcontrolador inyectará datos directamente a Firebase mediante su API REST. Esto elimina los costos fijos de servidores intermediarios y prepara el ecosistema para una futura integración nativa con una aplicación móvil desarrollada en Flutter.
*   **Filosofía "Edge-First" (Autonomía Absoluta):**
    El hardware no debe ser un esclavo de la nube. El ESP32 operará de manera autónoma desde el minuto cero, garantizando el control termodinámico del cultivo sin requerir conexión a internet. El producto será entregado bajo el estándar "Plug & Play".
*   **Principio YAGNI (Desacople de Cámara Espacial):**
    *(You Aren't Gonna Need It)*. Para proteger la integridad operativa, la memoria SRAM y evitar el bloqueo de los relés físicos del ESP32 principal, la funcionalidad de visión artificial (cámara) queda estrictamente fuera del MVP actual. Se delega arquitectónicamente a un hardware secundario dedicado (ej. ESP32-CAM) proyectado para la V2.0.

---

## 2. El Motor Agnóstico y Resiliencia (Ingeniería de Hardware)

El valor del microcontrolador dejará de estar acoplado a un cultivo específico. Transformaremos el Edge en un motor agnóstico de control climático industrial.

*   **Aprovisionamiento Dinámico (Cero Hardcodeo):**
    Se erradican definitivamente las credenciales de red quemadas en el firmware (`"Presidio" / "manchita2"`). El cliente final será el único dueño y orquestador del aprovisionamiento de su red.
*   **Archivos de Estado (`config.json`):**
    El comportamiento termodinámico será parametrizado. El ESP32 consumirá un archivo de configuración local que dictará los umbrales operativos. Esto convierte a nuestra placa base en un producto versátil, capaz de controlar desde un entorno Fungi hasta incubadoras avícolas o invernaderos botánicos, únicamente alterando el `.json`.
*   **Integridad de Datos con LittleFS:**
    Ante los riesgos inherentes de los entornos industriales (cortes de suministro eléctrico), abandonamos SPIFFS en favor de **LittleFS**. Este sistema de archivos está diseñado específicamente para prevenir la corrupción de datos durante fallos de energía, asegurando la persistencia de la configuración del cliente.

---

## 3. Plan de Ejecución del Sprint 8 (El Roadmap)

El equipo de ingeniería ejecutará este pivote en tres fases secuenciales y estrictamente dependientes:

### Paso 1: Portal Cautivo Asíncrono
> [!NOTE]
> **Objetivo:** Resolver el *Onboarding* del usuario sin comprometer el control en tiempo real.

Se refactorizará el módulo `NetworkManager`. Se integrarán los servidores `ESPAsyncWebServer` y `DNSServer` para desplegar una interfaz web local de configuración. **Restricción crítica:** Este portal operará de manera estrictamente asíncrona, garantizando que el bucle de la Máquina de Estados (FSM) que evalúa los sensores y dispara los actuadores térmicos nunca se bloquee mientras el usuario teclea su contraseña.

### Paso 2: Sistema de Archivos y Configuración Local
> [!NOTE]
> **Objetivo:** Inyección dinámica de dependencias termodinámicas.

Se inicializará el subsistema LittleFS en la memoria Flash del ESP32. El firmware será capaz de leer, parsear (vía JSON) y escribir el archivo `config.json`. En la secuencia de arranque, la FSM absorberá estos parámetros dinámicamente para ajustar los umbrales de los relés (manta térmica, humidificador, ventilación).

### Paso 3: Integración Directa a Firebase REST
> [!NOTE]
> **Objetivo:** Alimentar el Dashboard Innegociable.

Eliminación total del cliente MQTT. Integración de la librería `mobizt/Firebase-ESP-Client`. Se implementará el patrón *Push* sobre conexiones asíncronas con *Keep-Alive*. Esto mitiga la penalización de procesamiento del handshake TLS (SSL) constante, enviando la telemetría vital a la nube de Google para su consumo inmediato por parte del cliente en su celular.

---

## 4. Puntos Críticos Añadidos (Lo que quedó en el tintero) 💡

Como CTO, he añadido las siguientes dos directrices técnicas obligatorias que no estaban en la propuesta original, pero que son **requisitos innegociables** para que el Paso 1 y el Paso 3 no colapsen el microcontrolador:

> [!WARNING]
> **Adición 1: Sincronización de Tiempo Obligatoria (NTP)**
> **Contexto:** Para que el *Paso 3* funcione (Firebase REST sobre HTTPS), el ESP32 **debe** validar los certificados de seguridad de Google.
> **Mandato:** Antes de emitir un solo byte hacia Firebase, el `NetworkManager` deberá sincronizar el reloj interno del ESP32 mediante servidores NTP. Sin hora exacta, el TLS fallará silenciosamente.

> [!WARNING]
> **Adición 2: Arquitectura Dual-Core Estricta (Task Pinning)**
> **Contexto:** El servidor web asíncrono (*Paso 1*) y la criptografía de Firebase (*Paso 3*) van a exigir picos masivos de CPU que podrían generar micro-bloqueos.
> **Mandato:** Aprovecharemos la arquitectura Xtensa LX6 del ESP32. Se anclará (pin) la FSM Termodinámica (sensores y relés) estrictamente al **Core 1** (App Core), mientras que la gestión pesada de red (WiFi, AsycnWeb, Firebase/mbedTLS) quedará relegada al **Core 0** (Pro Core). Esto es lo único que garantizará un sistema 100% libre de riesgos de bloqueo de relés en un escenario Serverless directo.
