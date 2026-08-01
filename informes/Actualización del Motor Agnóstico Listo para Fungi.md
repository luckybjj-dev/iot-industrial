# Actualización del Motor Agnóstico: Listo para Fungi

He modificado exitosamente el código de nuestro Edge (ESP32) para integrar todos los aprendizajes y lógica de seguridad que definimos en la fase de prototipado.

## ¿Qué cambió internamente?

### 1. `FileManager.cpp` (El Cerebro)
Modifiqué el inicializador para que el **"Día Cero"** (primer arranque de la placa) no asuma que está en reposo, sino que asuma inmediatamente que es una **Cámara Fungi** con los umbrales seguros por defecto:
*   Temperatura de alerta: **26.0 °C**
*   Rango de humedad: **50.0% a 55.0%**
*   Luz: **12 horas**

### 2. `HardwareController.h` (Mapeo Físico)
Corregí la asignación de los pines para que coincida exactamente con tu placa física:
*   `PIN_RELE_B` = **Pin 25** (Control Hídrico - Humidificador)
*   `PIN_RELE_C` = **Pin 26** (Control de Gases / Aire - Ventilador)
*   *Nota: El PIN 32 quedó reservado para un futuro calefactor.*

### 3. `HardwareController.cpp` (La Lógica Biológica)
Se incluyeron los dos bloques vitales que faltaban en la arquitectura modular:
*   **Temporizador FAE:** Si no hay sensor de CO2 conectado, el sistema recurre al "Plan B", encendiendo el ventilador 2 minutos cada hora de forma asíncrona.
*   **Gatillo Térmico (Failsafe):** Si la temperatura del DHT22 supera el `temp_aire_max` (26°C), se activa inmediatamente la `_alertaCalor`, forzando el encendido del extractor para evacuar el aire caliente y salvar el micelio, independientemente del temporizador FAE.

---

> [!TIP]
> **Acción Requerida:** 
> Abre tu proyecto en Visual Studio Code (PlatformIO) y presiona el botón **Build (El check en la barra inferior)** o **Upload (La flecha)**. 
> Como todo el código fuente en la carpeta `src/` fue actualizado directamente en tu disco duro, PlatformIO debería compilarlo de inmediato sin que tengas que copiar y pegar nada.

Confírmame si la placa compila bien y si ves el arranque exitoso en el Monitor Serie. Si es así, **¡Habremos cerrado el Hardware y el Edge estará oficialmente en nivel de producción B2B!** y podremos saltar por fin a levantar el Dashboard en React.
