# 🗺️ Roadmap de Desarrollo (Post-MVP)

El sistema ha alcanzando una madurez estructural, siendo resiliente a cortes de red y agnóstico al hardware. Ahora que los cimientos están listos, las siguientes iteraciones se centrarán en la automatización algorítmica fina, modularidad avanzada de hardware y seguridad.

---

## 🟢 Fase 1: Ajuste Fino y Control Avanzado (Q4 2026)

### 1. Redundancia Ambiental Dual (2x DHT22)
- **Objetivo:** Retirar la sonda NTC2 de ambiente y reemplazarla por un segundo DHT22.
- **Impacto:** Permite promediar tanto la Temperatura como la Humedad desde dos puntos físicos de la nave. Esto crea un cálculo de VPD a prueba de fallos y protege al cultivo contra el desgaste (drift) típico de los sensores de humedad genéricos. Prerrequisito absoluto antes del control PID.

### 2. Control PID para Modulación (PWM)
Actualmente, los actuadores térmicos operan bajo una lógica determinista binaria de ON/OFF (Histéresis simple).
- **Objetivo:** Implementar un controlador PID (Proporcional, Integral, Derivativo) en la Máquina de Estados del ESP32.
- **Impacto:** Permitirá variar la velocidad de los extractores (PWM) y la intensidad de módulos Peltier/Calefactores, logrando una curva de estabilidad térmica suave (sin picos) y reduciendo drásticamente el consumo eléctrico industrial.

### 3. Crop Steering Algorítmico Dinámico
El sistema inyecta metas ambientales según la etapa fenológica, pero estas son estáticas.
- **Objetivo:** Permitir que el Dashboard (React) automatice curvas graduales diarias. Ejemplo: Bajar 1°C de temperatura diariamente durante una semana para simular la llegada del otoño en el cultivo de Shiitake, sin intervención manual.

### 4. Alarmas y Notificaciones Push
- **Objetivo:** Implementar Firebase Cloud Messaging (FCM) o integración webhooks (Slack/WhatsApp/SMS).
- **Impacto:** El agricultor recibirá alertas instantáneas si la cámara entra en `SAFE_MODE` o si las temperaturas exceden rangos críticos por un periodo sostenido.

---

## 🟡 Fase 2: Diseño del Producto Físico (Hardware Industrial) (Q1 2027)

¡El software no flota en el aire! Para pasar de un prototipo de laboratorio (cables dupont y protoboards) a un producto comercializable y escalable, se requiere ingeniería electrónica e industrial pura.

### 1. Diseño de Placa de Circuito Impreso (PCB Custom)
- **Objetivo:** Diseñar una placa base (Motherboard) utilizando software EDA (KiCad o Altium) donde el módulo ESP32-WROOM-32E vaya soldado en superficie (SMD), eliminando la placa de desarrollo Wemos D1 R32.
- **Impacto:** Elimina por completo los falsos contactos, cables sueltos y problemas de ruido electromagnético. Permite incluir en la misma placa relés de estado sólido (SSR), optoacopladores para aislar voltajes, fusibles de protección y borneras industriales seguras.

### 2. Diseño Industrial de la Carcasa (Enclosure)
- **Objetivo:** Modelado 3D (SolidWorks / Fusion360) de una carcasa protectora.
- **Impacto:** Protección contra agua, polvo y humedad (Certificación IP65/IP67 vital para invernaderos). Debe contemplar rieles DIN para montaje en tableros eléctricos, prensaestopas para la salida segura de los cables de los sensores/relés y un bisel de precisión para encajar la pantalla TFT sin tornillos visibles, dándole la apariencia de un producto "Premium".

---

## 🟠 Fase 3: Expansión de Nodos e ISA-95 (Q2 2027)

### 1. Despliegue de Red Local en Malla (ESP-NOW)
En una granja grande, no todos los sensores pueden depender del router WiFi principal.
- **Objetivo:** Implementar el protocolo **ESP-NOW**. Existirá un "Nodo Maestro" con conexión a Firebase (Gateway), y múltiples "Nodos Esclavos" en las zonas de cultivo que se comunicarán localmente con el Gateway.
- **Beneficio:** Reducción de latencia, descongestión de la red WiFi industrial, y escalabilidad masiva.

### 2. Arquitectura Multi-Zona en el Dashboard
- **Objetivo:** Explotar la arquitectura ISA-95 recientemente creada. El Dashboard podrá desplegar un mapa interactivo (Plano 2D) con la topología de la nave, permitiendo inyectar configuraciones de forma masiva a zonas enteras, y no solo nodo a nodo.

### 3. Exportación y Ciencia de Datos (Data Lake)
- **Objetivo:** Botón exportador para extraer todos los datos históricos (JSON o CSV).
- **Impacto:** Analizar correlaciones a largo plazo (e.g., relacionar picos de VPD con el rendimiento de cosecha mensual utilizando Machine Learning).

---

## 🔴 Fase 4: Seguridad y Fiabilidad Hardware (Q3 2027)

### 1. Resiliencia Offline Definitiva (Registro SD)
- **Objetivo:** Añadir soporte para una tarjeta MicroSD o usar la partición SPIFFS/LittleFS en el ESP32 para crear un *Datalogger* interno.
- **Impacto:** Si la granja pierde conexión WiFi durante 7 días, el nodo seguirá operando y almacenando telemetría localmente. Al volver la red, sincronizará todo el paquete acumulado con Firebase.

### 2. Autenticación y Auditoría (RBAC)
- **Objetivo:** Múltiples cuentas de usuario (Dueño de Granja, Operario, Visualizador) en Firebase Authentication. El operario no podrá modificar la etapa fenológica del cultivo, pero sí ver las temperaturas.

### 3. Calibración de Sensores vía Software
- **Objetivo:** Permitir configurar *Offsets* a las lecturas del DHT22 y NTC.
- **Impacto:** Corregir tolerancias de error físicas (-0.5°C o +1.5%) de hardware genérico directamente desde la interfaz de usuario, garantizando un margen de error menor al 1% exigido a nivel industrial.

---

## 🟣 Fase 5: End-Game, Visión Ciberfísica e IA (2028+)

Lo que queda "en el tintero" para transformar este sistema en una tecnología pionera a nivel mundial:

### 1. Visión Computacional (ESP32-CAM / Cámaras IP)
- **Objetivo:** Instalar cámaras en el cultivo y aplicar modelos de *Computer Vision* (YOLO/OpenCV).
- **Impacto:** El sistema dejará de ser ciego. Podrá medir el diámetro del sombrero del hongo o el color del tomate en tiempo real. En lugar de cambiar de etapa por "tiempo", el sistema cambiará la temperatura basándose en el **crecimiento físico real** del organismo.

### 2. Actualizaciones OTA (Over-The-Air) Masivas (Fleet Management)
- **Objetivo:** Gestor de firmware integrado en el Dashboard React.
- **Impacto:** Si la granja escala a 500 nodos, no se pueden actualizar por USB uno por uno. El agricultor subirá un archivo `.bin` al Dashboard y todos los ESP32 se actualizarán automáticamente durante la noche.

### 3. Gemelo Digital e Inteligencia Artificial (Auto-Tuning)
- **Objetivo:** Conectar el Data Lake a modelos predictivos (Machine Learning).
- **Impacto:** El sistema aprenderá qué microclimas exactos generaron las cosechas más pesadas en el pasado. La IA podrá proponer (o aplicar automáticamente) micro-ajustes a las curvas de *Crop Steering* para maximizar el rendimiento, prediciendo la fecha de cosecha exacta para el equipo de ventas.

### 4. Integración ERP / Logística Comercial
- **Objetivo:** Conectar Firebase con sistemas empresariales (SAP, Odoo).
- **Impacto:** Cuando el sistema detecta que la fase de fructificación ha terminado (ya sea por tiempo o por visión computacional), genera automáticamente una orden de trabajo para el equipo de cosecha y una alerta al equipo de ventas con la estimación de kilos a vender.
