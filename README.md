# 🍄 Cámara Fungi Inteligente (Motor Core IoT Industrial 2.0)

## 📌 Descripción General
Este repositorio contiene la arquitectura base de un **Sistema de Monitoreo Predictivo y Control Industrial basado en Internet de las Cosas (IoT)**. 

Originalmente concebido como un SCADA B2B genérico para entornos industriales severos, el proyecto ha pivotado mediante la metodología **Lean Startup** hacia su primer **Producto Mínimo Viable (PMV): La Automatización de Cultivos Fungi (AgroTech)**. 

A pesar de este enfoque de nicho para salir al mercado rápido, el sistema conserva un núcleo **Agnóstico y Modular (OOP)**. La placa no tiene reglas biológicas "quemadas" (hardcodeadas) en el firmware, sino que es impulsada por un Motor de Reglas dinámico (`config.json`).

### 🎓 Enfoque Educativo
Todo el código fuente en C++ (ubicado en `edge_esp32/src/`) ha sido **documentado exhaustivamente con fines educativos**. Cada clase, método y decisión arquitectónica (como la inyección de dependencias y el uso de FreeRTOS) cuenta con bloques de comentarios detallados en español. Esto facilita el estudio, la comprensión y la escalabilidad del sistema para nuevos desarrolladores.

## 🚀 Filosofía de Diseño: El Master Roadmap

El desarrollo de este producto sigue 3 pasos innegociables para alcanzar el nivel de mercado comercial:

### 1. Portal Cautivo (Plug & Play)
Se eliminan las credenciales Wi-Fi fijas. El ESP32 arranca como su propio Punto de Acceso (AP) y ofrece un portal web asíncrono para que el cliente final introduzca su red local. Cero fricción para el usuario.

### 2. Motor Agnóstico (`config.json` en LittleFS)
El ESP32 opera mediante un archivo de configuración universal que reside en su memoria interna. Este archivo determina el perfil de funcionamiento (ej. `FUNGI`, `INVERNADERO`, `REPOSO`) y los umbrales precisos de temperatura, humedad y CO2. Si el cultivo cambia, solo se inyecta un nuevo JSON; no hay necesidad de compilar código C++.

### 3. Integración Directa a Firebase (El Dashboard Innegociable)
Dejando atrás arquitecturas puente como Node.js + InfluxDB + MQTT, el Edge node (ESP32) se conecta directamente a **Firebase (Realtime Database)**. Esto garantiza la alimentación fluida del Dashboard en React, permitiendo al cliente monitorear y controlar su cultivo desde cualquier parte del mundo.

---

## 🛠️ Stack Tecnológico (V2.0)

**Capa Edge (Dispositivo Físico - C++ / PlatformIO):**
*   **Hardware:** WeMos D1 R32 (Cerebro ESP32).
*   **Sensores:** DHT22 (Clima), NTC 10K / DS18B20 (Temperatura Núcleo), MH-Z19 (CO2 - *Future Proofing*).
*   **Actuadores:** Módulos de relés estándar 3.3V (Lógica Directa) controlando ventiladores 12V, humidificadores ultrasónicos, calefactores y luces (fotoperiodo).
*   **Lógica:** Programación Orientada a Objetos (OOP), FSM, Archivos LittleFS.
*   **Protecciones:** Gatillos Térmicos Autónomos (Failsafe) y temporizadores de extracción asíncronos en caso de pérdida de conexión.

**Capa Cloud & Frontend (Dashboard):**
*   **Base de Datos:** Firebase Realtime Database.
*   **Frontend:** React + Vite + TailwindCSS.

---

## 🖥️ Interfaz Local (TFT UI)
La pantalla local del dispositivo muestra en tiempo real las métricas y el estado de los actuadores (con etiquetas optimizadas en español para la interfaz):
- **Sensores:** `Temp` (Ambiente), `Hum` (Humedad), `NTC` (Temperatura del Sustrato).
- **Actuadores (Relés):** `CAL` (Calefactor), `EXT` (Extractor), `NBL` (Niebla/Humidificador), `LUZ` (Iluminación).

---

## 💼 Arquitectura Híbrida y Failsafe
En la automatización biológica, el internet puede fallar, pero el micelio no espera.
Si se corta la fibra óptica o se cae el router del cliente, el ESP32 entra en **Modo de Supervivencia Local (Edge Computing)**. El sistema seguirá gobernando el microclima internamente para salvar la cosecha, retomando la comunicación con Firebase solo cuando la red se restaure.

## 🔮 Roadmap y Próximos Pasos (Próximo Sprint)
- **Dashboard Web (React + Firebase):** Construcción de la interfaz web para visualización de métricas en tiempo real y control de actuadores desde la nube.
- **Configuración Dinámica de Hardware (Portal Web):** Permitir al usuario seleccionar su configuración de hardware directamente desde un menú de configuración web inicial.
