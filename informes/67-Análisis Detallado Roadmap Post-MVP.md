# 🗺️ Análisis Detallado: Roadmap Post-MVP

Este documento profundiza en cada uno de los puntos del roadmap propuesto, analizando la necesidad técnica, la estrategia de implementación y el impacto directo en la madurez industrial del sistema.

---

## 🟢 Fase 1: Ajuste Fino y Control Avanzado (Q4 2026)

Esta fase se centra en pasar de un control de fuerza bruta a un control elegante y preciso, mejorando la calidad del cultivo y la experiencia del usuario.

### 1. Redundancia Ambiental Dual (2x DHT22)
> *Retirar la sonda NTC2 de ambiente y reemplazarla por un segundo DHT22.*

*   **El Problema Actual:** Actualmente la temperatura ambiental se promedia usando un DHT22 y una sonda NTC2. Sin embargo, la *humedad* ambiental depende 100% de un solo sensor DHT22. Los sensores de humedad son propensos al desgaste (drift) a lo largo del tiempo, y fallarían el cálculo de VPD de toda la sala.
*   **La Solución:** Implementar dos DHT22 físicamente separados.
*   **Implementación Técnica:** Asignar un nuevo GPIO para leer un DHT22 secundario. Promediar tanto la temperatura como la humedad antes de introducirlas en la fórmula de Magnus-Tetens.
*   **Impacto Industrial:** Crea una redundancia absoluta para el cálculo del VPD. Permite que el sistema alerte si hay una discrepancia grave entre ambos sensores (ej: >10% de diferencia), sirviendo como un sistema de auto-diagnóstico. Esto es el prerrequisito vital antes de que el control PID tome decisiones.

### 2. Control PID para Modulación (PWM)
> *Actualmente, los actuadores térmicos operan bajo una lógica determinista binaria de ON/OFF.*

*   **El Problema Actual:** El control ON/OFF genera "dientes de sierra" en los gráficos de temperatura. El sistema enciende el calefactor al 100% hasta llegar al setpoint y luego lo apaga, causando que la inercia térmica sobrepase el objetivo (overshoot).
*   **La Solución (PID + PWM):** Un algoritmo PID calcula exactamente cuánta energía se necesita para mantener la temperatura estable. En lugar de encender un relé, enviamos una señal PWM (Modulación por Ancho de Pulso) a un driver de potencia (como un SSR o un módulo MOSFET).
*   **Implementación Técnica:** Modificar el `HardwareController.cpp` para incluir una librería PID. Se debe ajustar (tunear) empíricamente los valores Kp, Ki y Kd para el volumen específico de la cámara de cultivo. Se requerirá cambiar los módulos de relés mecánicos por relés de estado sólido (SSR) para la calefacción y drivers DC para extractores/Peltier.
*   **Impacto Industrial:** Estabilidad térmica casi perfecta (líneas planas en el gráfico). Reducción masiva del estrés en los relés (evitando el desgaste mecánico) y ahorro de energía eléctrica.

### 2. Crop Steering Algorítmico Dinámico
> *El sistema inyecta metas ambientales según la etapa fenológica, pero estas son estáticas.*

*   **El Problema Actual:** Los cultivos vivos no hacen transiciones abruptas. Un salto repentino de 25°C a 18°C puede causar un shock indeseado en ciertas especies. Además, requiere que el operario cambie la etapa manualmente en el momento exacto.
*   **La Solución:** Curvas de automatización en el tiempo (Time-Series Setpoints).
*   **Implementación Técnica:** En el Dashboard (React), crear un constructor visual de curvas. Estos datos se guardan en Firebase como un array de nodos `{día, temp_objetivo, hum_objetivo}`. El ESP32, al recibir este "plan de vuelo", interpola los valores diariamente (o por hora) para ir moviendo el setpoint gradualmente.
*   **Impacto Industrial:** Permite crear recetas agronómicas altamente sofisticadas (ej. simular la bajada térmica natural del atardecer o la llegada progresiva del otoño para inducir fructificación en hongos). El sistema se vuelve verdaderamente autónomo durante semanas.

### 3. Alarmas y Notificaciones Push
> *Implementar Firebase Cloud Messaging (FCM) o integración webhooks.*

*   **El Problema Actual:** Si ocurre una catástrofe (ej. se va la luz en la nave y sube la temperatura críticamente, o se desconectan ambos sensores), el sistema entra en `SAFE_MODE`, pero el operario solo se entera si mira activamente el Dashboard.
*   **La Solución:** Notificaciones activas (Push).
*   **Implementación Técnica:** Utilizar Firebase Cloud Functions. Cuando un nodo en la RTDB cambia su estado a `error` o la temperatura cruza un umbral crítico por más de `X` minutos, la Cloud Function se dispara y envía un Webhook a un bot de Telegram, un mensaje por WhatsApp (Twilio/Meta API) o una notificación Push al móvil (FCM).
*   **Impacto Industrial:** Tranquilidad total para el agricultor. El sistema avisa proactivamente antes de que un problema térmico arruine una cosecha.

---

## 🟡 Fase 2: Diseño del Producto Físico (Hardware Industrial) (Q1 2027)

Esta fase es crucial para transformar el software en un producto tangible, eliminando los riesgos asociados a los prototipos de laboratorio.

### 1. Diseño de Placa de Circuito Impreso (PCB Custom)
> *Diseñar una placa base (Motherboard) utilizando software EDA.*

*   **El Problema Actual:** El uso de una placa de desarrollo comercial (Wemos D1 R32) con cables Dupont y protoboards es propenso a fallas mecánicas, falsos contactos, oxidación y susceptibilidad al ruido eléctrico.
*   **La Solución:** Una PCB (Printed Circuit Board) diseñada a medida.
*   **Implementación Técnica:** Usar herramientas como KiCad o Altium Designer. Se integrará el módulo base **ESP32-WROOM-32E** soldado en superficie (SMD). La placa incluirá:
    *   **Aislamiento Galvánico:** Optoacopladores para proteger el ESP32 de picos de voltaje de los relés.
    *   **Potencia Integrada:** Reguladores *Buck Converter* robustos (ej. LM2596) para alimentar el sistema desde fuentes de 12V/24V industriales.
    *   **Conectividad Segura:** Borneras (Terminal Blocks) de tornillo o conectores Phoenix para los sensores y actuadores.
*   **Impacto Industrial:** Fiabilidad absoluta. El hardware soportará vibraciones, variaciones térmicas y garantizará que el cerebro del sistema no se reinicie por interferencias electromagnéticas (EMI) cuando un motor grande arranque.

### 2. Diseño Industrial de la Carcasa (Enclosure)
> *Modelado 3D de una carcasa protectora.*

*   **El Problema Actual:** Los componentes electrónicos expuestos en un ambiente agrícola (alta humedad, polvo, esporas, salpicaduras) tienen una vida útil muy corta por corrosión.
*   **La Solución:** Un "Enclosure" profesional con certificación IP.
*   **Implementación Técnica:** Modelado paramétrico en SolidWorks o Fusion 360.
    *   **Estética y Funcionalidad:** Un bisel exacto para que la pantalla TFT encaje a ras (flush mount), dándole un aspecto moderno y limpio.
    *   **Montaje:** Sistema de anclaje para **Riel DIN**, el estándar en tableros eléctricos industriales.
    *   **Sellado:** Orificios equipados con prensaestopas (Cable Glands) y juntas tóricas (O-rings) para garantizar que, una vez cerrado, el interior quede estanco (Idealmente **IP65/IP67**).
*   **Impacto Industrial:** Convierte un "invento DIY" en un equipo que cualquier instalador eléctrico puede atornillar en un tablero con confianza. Protege la inversión y define la identidad de marca del producto físico.

---

## 🟠 Fase 3: Expansión de Nodos e ISA-95 (Q2 2027)

Esta fase prepara al sistema para escalar de controlar "una carpa" a gestionar "una nave industrial con 50 carpas".

### 1. Despliegue de Red Local en Malla (ESP-NOW)
> *Implementar el protocolo ESP-NOW.*

*   **El Problema Actual:** En una instalación grande, conectar decenas de ESP32 al mismo router WiFi satura la red y depende de tener excelente cobertura en cada rincón del invernadero.
*   **La Solución:** ESP-NOW es un protocolo nativo de Espressif (sin necesidad de router WiFi) ultrarrápido y de largo alcance.
*   **Implementación Técnica:** Crear dos perfiles de firmware: `Gateway` y `SensorNode`. Un ESP32 central (`Gateway`) se conecta al WiFi y a Firebase. Los otros ESP32 (`SensorNodes`) solo leen sensores y controlan relés locales, enviando su telemetría al Gateway vía ESP-NOW.
*   **Impacto Industrial:** Escalabilidad masiva. Puedes desplegar 20 nodos esclavos en una nave sin preocuparte por la contraseña del WiFi o la cobertura, reduciendo drásticamente los puntos de fallo de red.

### 2. Arquitectura Multi-Zona en el Dashboard
> *El Dashboard podrá desplegar un mapa interactivo (Plano 2D).*

*   **El Problema Actual:** Visualizar muchos dispositivos en una lista plana se vuelve inmanejable.
*   **La Solución:** Un HMI (Interfaz Hombre-Máquina) espacial.
*   **Implementación Técnica:** Crear una vista en React donde se pueda subir un plano SVG de la nave. Mapear las coordenadas de cada nodo. Usar bibliotecas como D3.js o Canvas para dibujar mapas de calor (Heatmaps) que muestren gradientes de temperatura o humedad a lo largo de toda la granja.
*   **Impacto Industrial:** Operabilidad intuitiva. El jefe de planta puede ver de un vistazo si hay una zona "caliente" en la nave y actuar en consecuencia, aplicando comandos en bloque (ej. "Apagar luces en toda la Zona A").

### 3. Exportación y Ciencia de Datos (Data Lake)
> *Botón exportador para extraer todos los datos históricos (JSON o CSV).*

*   **El Problema Actual:** Los datos históricos son valiosos para ver el gráfico, pero no se pueden cruzar con otros sistemas contables o de rendimiento agrícola.
*   **La Solución:** Exportabilidad e integración.
*   **Implementación Técnica:** Integrar Firebase Extensions (Stream to BigQuery) o crear una función en el backend que consolide los datos de un mes y ofrezca un enlace de descarga en formato `.csv`.
*   **Impacto Industrial:** Permite a los ingenieros agrónomos aplicar Machine Learning o análisis estadístico profundo (ej. ¿Hubo correlación entre el promedio del VPD de la semana 3 y el peso final de la cosecha?).

---

## 🔴 Fase 4: Seguridad y Fiabilidad Hardware (Q3 2027)

Esta fase blinda el sistema contra contingencias y asegura la precisión de los datos y el acceso.

### 1. Resiliencia Offline Definitiva (Registro SD)
> *Añadir soporte para una tarjeta MicroSD o usar la partición SPIFFS/LittleFS en el ESP32.*

*   **El Problema Actual:** Si se corta el internet, el ESP32 sigue controlando el clima localmente de forma segura (excelente), pero toda la telemetría de ese período "oscuro" se pierde. No queda registro de qué pasó.
*   **La Solución:** Data Logging Local (Caja Negra).
*   **Implementación Técnica:** Añadir un módulo de tarjeta MicroSD por SPI, o asignar 2MB de la memoria interna a LittleFS. Cuando no hay conexión, los registros de telemetría se escriben en un archivo JSON local. Al recuperar la conexión, el ESP32 ejecuta una rutina de sincronización masiva con Firebase y limpia la memoria local.
*   **Impacto Industrial:** Auditoría garantizada al 100%. Nunca más habrá "huecos" en los gráficos históricos debido a fallos de los proveedores de internet rural.

### 2. Autenticación y Auditoría (RBAC)
> *Múltiples cuentas de usuario en Firebase Authentication.*

*   **El Problema Actual:** Cualquier persona con acceso al Dashboard tiene control total (modo Dios). En una empresa real, esto es un riesgo de seguridad grave.
*   **La Solución:** Control de Acceso Basado en Roles (RBAC - Role-Based Access Control).
*   **Implementación Técnica:** Habilitar Firebase Auth (Email/Google). Asignar Custom Claims (`role: admin | agronomist | operator | viewer`). Configurar Firebase Security Rules para rechazar escrituras en `/config` si el usuario no es admin o agrónomo. Crear un nodo `/audit_log` donde se registre qué usuario cambió qué actuador a qué hora.
*   **Impacto Industrial:** Cumplimiento de normativas de trazabilidad industrial. Evita errores humanos costosos (ej. un operario cambiando la temperatura de fructificación por error).

### 3. Calibración de Sensores vía Software
> *Permitir configurar Offsets a las lecturas del DHT22 y NTC.*

*   **El Problema Actual:** Los sensores de bajo coste tienen tolerancias de fábrica (el DHT22 puede medir +0.5°C de lo real). Físicamente, un sensor a 10 metros del otro puede tener una ligera variación debido a la resistencia del cable.
*   **La Solución:** Offsets de calibración inyectables por UI.
*   **Implementación Técnica:** Añadir un campo de calibración en la sección de configuración del Dashboard. El ESP32 descarga este `offset_temp` y `offset_hum`. En `HardwareController.cpp`, simplemente se suma: `temp_final = temp_leida + offset_temp`.
*   **Impacto Industrial:** Permite certificar las cámaras de cultivo con equipos patrón (ej. Termómetros de precisión Fluke). Si el termómetro patrón dice 24.0°C y nuestro sistema dice 24.3°C, inyectamos un offset de `-0.3`, garantizando precisión de laboratorio sin cambiar hardware físico.
