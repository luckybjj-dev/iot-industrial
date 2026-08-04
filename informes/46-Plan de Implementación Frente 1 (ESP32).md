# 🛠️ Plan de Implementación: Panel de Diagnóstico Local (Offline)

## 📌 Objetivo
Evolucionar la actual "Red de Rescate" (Fallback AP) para que no sea solo un portal para ingresar la clave de Wi-Fi, sino un auténtico **Panel de Control Industrial**. Si la placa se desconecta de Internet, el operador podrá conectarse a la red `Fungi_Rescate_XX`, entrar al portal y ver los sensores en vivo o activar relés manualmente, además de tener la opción de configurar el Wi-Fi.

## 🏗️ Cambios Arquitectónicos Propuestos

Actualmente, `NetworkManager` maneja la red de forma aislada. Para que el Portal Cautivo pueda mostrar los datos de los sensores y accionar los relés, necesita comunicarse con `HardwareController`.

### 1. [MODIFY] `NetworkManager.h`
- Añadiremos un puntero estático a `HardwareController` (`static HardwareController* _hw`).
- Añadiremos un método `static void setHardwareController(HardwareController* hw)` para inyectar la dependencia.

### 2. [MODIFY] `main.cpp`
- Inyectaremos la referencia del hardware a la red justo antes de iniciarla: `net.setHardwareController(&hw);`

### 3. [MODIFY] `NetworkManager.cpp`
- **Nuevo HTML/CSS/JS (Mini-Dashboard):** Reemplazaremos el string `index_html` por una versión moderna. Tendrá dos pestañas o secciones: "Sensores y Control" y "Configuración WiFi". Usará Javascript (Fetch API) para comunicarse con la placa sin recargar la página.
- **Nuevos Endpoints en `configurarPortal()`:**
  - `GET /api/status`: El ESP32 responderá con un JSON (ej. `{"temp":24.5, "hum":60.2, "luz":true}`) sacado de `_hw->getSensores()` y `_hw->getActuadores()`.
  - `POST /api/control`: Recibirá JSON (ej. `{"rele":"heater", "estado":true}`) y ejecutará `_hw->forzarRele()`.

## ⚠️ User Review Required
> [!WARNING]
> Este cambio reemplazará completamente la interfaz visual que ves cuando te conectas al Wi-Fi de rescate. Pasará de ser un simple formulario a un mini-dashboard interactivo.
> Además, como `NetworkManager` se ejecuta en el **Core 0** y `HardwareController` en el **Core 1**, deberemos tener cuidado con que no haya lecturas cruzadas, pero para esto las variables del hardware ya están optimizadas.
> ¿Apruebas la arquitectura de este panel local?
