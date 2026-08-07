# 🗺️ Roadmap de Desarrollo (Post-MVP)

El sistema ha alcanzando una madurez estructural, siendo resiliente a cortes de red y agnóstico al hardware. Ahora que los cimientos están listos, las siguientes iteraciones se centrarán en la automatización algorítmica fina, modularidad avanzada de hardware y seguridad.

---

## 🟢 Fase 1: Ajuste Fino y Control Avanzado (Q4 2026)

### 1. Control PID para Modulación (PWM)
Actualmente, los actuadores térmicos operan bajo una lógica determinista binaria de ON/OFF (Histéresis simple).
- **Objetivo:** Implementar un controlador PID (Proporcional, Integral, Derivativo) en la Máquina de Estados del ESP32.
- **Impacto:** Permitirá variar la velocidad de los extractores (PWM) y la intensidad de módulos Peltier/Calefactores, logrando una curva de estabilidad térmica suave (sin picos) y reduciendo drásticamente el consumo eléctrico industrial.

### 2. Crop Steering Algorítmico Dinámico
El sistema inyecta metas ambientales según la etapa fenológica, pero estas son estáticas.
- **Objetivo:** Permitir que el Dashboard (React) automatice curvas graduales diarias. Ejemplo: Bajar 1°C de temperatura diariamente durante una semana para simular la llegada del otoño en el cultivo de Shiitake, sin intervención manual.

### 3. Alarmas y Notificaciones Push
- **Objetivo:** Implementar Firebase Cloud Messaging (FCM) o integración webhooks (Slack/WhatsApp/SMS).
- **Impacto:** El agricultor recibirá alertas instantáneas si la cámara entra en `SAFE_MODE` o si las temperaturas exceden rangos críticos por un periodo sostenido.

---

## 🟡 Fase 2: Expansión de Nodos e ISA-95 (Q1 2027)

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

## 🔴 Fase 3: Seguridad y Fiabilidad Hardware (Q2 2027)

### 1. Resiliencia Offline Definitiva (Registro SD)
- **Objetivo:** Añadir soporte para una tarjeta MicroSD o usar la partición SPIFFS/LittleFS en el ESP32 para crear un *Datalogger* interno.
- **Impacto:** Si la granja pierde conexión WiFi durante 7 días, el nodo seguirá operando y almacenando telemetría localmente. Al volver la red, sincronizará todo el paquete acumulado con Firebase.

### 2. Autenticación y Auditoría (RBAC)
- **Objetivo:** Múltiples cuentas de usuario (Dueño de Granja, Operario, Visualizador) en Firebase Authentication. El operario no podrá modificar la etapa fenológica del cultivo, pero sí ver las temperaturas.

### 3. Calibración de Sensores vía Software
- **Objetivo:** Permitir configurar *Offsets* a las lecturas del DHT22 y NTC.
- **Impacto:** Corregir tolerancias de error físicas (-0.5°C o +1.5%) de hardware genérico directamente desde la interfaz de usuario, garantizando un margen de error menor al 1% exigido a nivel industrial.
