🏭 Motor Core IoT Industrial (SCADA Predictivo B2B)
📌 Descripción General
Este repositorio contiene la arquitectura base (Core) de un Sistema de Monitoreo Predictivo y Control Industrial basado en Internet de las Cosas (IoT). Diseñado bajo el paradigma de Edge Computing y Microservicios, este motor es completamente agnóstico y escalable, permitiendo su despliegue rápido en diversos nichos de negocio como Minería (monitoreo de correas transportadoras), Agroindustria (invernaderos de alto rendimiento) o Logística (cadena de frío).

A diferencia de los prototipos tradicionales, este sistema no es un simple "lector de sensores". Cuenta con un lazo de control cerrado bidireccional, actualizaciones inalámbricas, y un Instinto de Supervivencia (Failsafe Mode) que garantiza la integridad del proceso físico incluso si la infraestructura de red o la nube colapsan.

🚀 Características Críticas (Nivel Empresarial)
🧠 Arquitectura Failsafe (Edge Computing): El microcontrolador evalúa constantemente la salud de la red. Ante una caída del servidor central o pérdida de Wi-Fi, el sistema entra asíncronamente en "Modo Supervivencia Local", ejecutando reglas de rescate pregrabadas sobre los actuadores físicos sin intervención humana.

☁️ Actualizaciones OTA (Over The Air): Mantenimiento y reprogramación remota sin intervención de cables. La lógica de negocio en el Edge puede ser actualizada a kilómetros de distancia mediante el firmware inalámbrico.

📡 Comunicación Desacoplada Bidireccional: Uso del protocolo MQTT ligero para garantizar el flujo en tiempo real de telemetría hacia la nube, y la recepción de comandos remotos hacia los relés de estado sólido.

⚙️ Lógica Asíncrona (No Bloqueante): El código C++ en el Edge evita los cuellos de botella. El procesador escanea el entorno, maneja interrupciones y reconecta servicios caídos en hilos separados sin "congelar" la medición crítica.

🛠️ Stack Tecnológico
Capa Edge (Dispositivo Físico):

Hardware: ESP32 (Wemos D1 R32).

Lenguaje: C++ (Orientado a eventos y manejo de JSON en memoria).

Protocolos: Wi-Fi (2.4 GHz), MQTT, SPI (HMI Local).

Capa Backend (Motor Lógico):

Entorno: Node.js (JavaScript/TypeScript).

Broker: HiveMQ (Transporte IoT).

Base de Datos: InfluxDB (Base de datos de series temporales de alto rendimiento).

Capa Frontend (Visualización):

Framework: React + Vite (Dashboard gerencial dinámico). (En desarrollo)

💼 Casos de Uso (Marca Blanca)
Gracias a su diseño modular, basta con modificar el archivo de configuración en el Backend para adaptar el sistema a cualquier industria:

Minería: Umbrales de vibración (SW-420) y temperatura para predecir fallas en motores eléctricos.

Agroindustria: Control de humedad de suelo y encendido automático de electroválvulas de riego.

Smart Pharma: Alertas críticas en milisegundos para desviaciones térmicas en congeladores de vacunas.