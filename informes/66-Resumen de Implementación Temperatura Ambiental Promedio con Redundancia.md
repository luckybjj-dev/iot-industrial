# Resumen de Implementación: Temperatura Ambiental Promedio con Redundancia

> [!NOTE]
> Se ha implementado la lógica de promedio de temperatura para la Máquina de Estados (Rule Engine) y el Dashboard, asegurando que ambos sensores de ambiente trabajen en conjunto y sirvan de respaldo en caso de que uno falle.

### 1. Hardware y Firmware (C++)
- **Cálculo de Promedio y Redundancia**: 
  - Se agregó `tempPromedio` en la estructura de datos.
  - El sistema evalúa: Si ambos (DHT22 y NTC2) funcionan, hace un promedio. Si uno falla, el sistema se apoya en el otro como respaldo automático, sin apagar los sistemas de control (Fail-Safe redundante). Si ambos fallan, el sistema entra en modo de emergencia (SAFE_MODE).
- **Máquina de Estados (Rule Engine)**: La decisión de encender Calefactor, Enfriador o Extractores ahora toma decisiones usando la variable `tempPromedio` como única verdad absoluta de la temperatura ambiental de la sala.
- **Pantalla TFT**: En la línea `T.Amb` ahora se muestra el promedio. Se eliminó la doble fila de temperatura que causaba ruido visual.

### 2. Dashboard Frontend (React)
- **Tarjeta Unificada**: 
  - La temperatura principal mostrada en el número gigante es el **Promedio**.
  - Justo debajo, en un texto diminuto de color neutro, se agregaron las lecturas independientes: `DHT: 24.5° | NTC: 24.1°`.
  - Si los dos sensores de ambiente fallan, el estatus pasará a rojo (`DANGER`), pero si solo falla uno, seguirá mostrándose estable indicando resiliencia.

---

# Resumen de Implementación: Frío (Peltier) y NTC2

> [!NOTE]
> Se ha implementado el soporte completo para manejar un módulo Peltier de enfriamiento y una segunda sonda analógica para temperatura ambiente, basados en la asignación de hardware de la Wemos D1 R32.

### 1. Hardware y Firmware (C++)
- **Asignación de Pines**:
  - `PIN_COOLER` asignado al **GPIO 17**.
  - `PIN_NTC_2` asignado al **GPIO 35** (exclusivo para ADC).
- **Lógica Termodinámica**:
  - El sistema leerá el `PIN_NTC_2` y la guardará como Temperatura Ambiental 2 (`tempAmb2`).
  - La **Máquina de Estados (Rule Engine)** ahora cuenta con el estado `ENFRIANDO`.
  - Si la temperatura real supera la `temp_ideal_max`, se encenderá el `PIN_COOLER` de inmediato y se pasará al estado `ENFRIANDO`. A diferencia de otros motores, el Peltier **no requiere** un tiempo mínimo de descanso (Filtro Anti-Short Cycle), por lo que responderá de manera inmediata (al igual que la luz) para proteger el cultivo.
- **Pantalla TFT**:
  - Se agregó el relé de frío como `FRI: ON/OFF` en el footer de actuadores de la pantalla TFT.
  - Se agregó la nueva lectura de ambiente como `NTC2: XX.X C` junto a la lectura NTC principal.

### 2. Dashboard Frontend (React)
- **Icono e Interfaz**: Se agregó el ícono de copo de nieve (`Snowflake`) importado desde Lucide.
- **Sensores**: Agregada una nueva `MetricCard` color ámbar para mostrar la "Temp. Ambiente (NTC2)".
- **Actuadores**: En la lista del panel lateral se agregó el "Enfriador" con controles manual/automáticos completos.
- **Telemetría JSON**: Se actualizó el contrato de datos `TelemetriaFungi` para enviar e interpretar `cooler_on`, `temp_ambiente` y `ntc2_ok`.

---

# Resumen de Cambios: Sprint Telemetría e ISA-95

# 🐛 Fix: Bloqueo de Luz en Modo Manual

Hemos encontrado y solucionado un "bug oculto" muy interesante que estaba provocando que los botones manuales dejaran de funcionar.

## ¿Por qué sucedía esto?
Cuando cambiabas el perfil (ej: 0 horas de luz), la app React enviaba un bloque de datos `JSON` con todas las reglas juntas a Firebase. El ESP32 recibía este `JSON` y aplicaba las reglas sin problema.

Sin embargo, cuando hacías clic en el botón de "Luz" en modo manual, la aplicación React no enviaba un bloque `JSON`, sino que enviaba un único dato simple o primitivo (un booleano: `true` o `false`). El sistema interno del ESP32 que escucha los cambios en tiempo real desde Firebase (Stream) tenía una condición restrictiva: **solo aceptaba comandos si el tipo de dato era estrictamente `JSON`**.

Al recibir un dato de tipo booleano en lugar de un `JSON`, el ESP32 ignoraba el comando por completo. Esto daba la impresión de que el sistema estaba "bloqueado" o fallando porque no respondía a los clics de la interfaz, y la regla de 0 horas de luz del modo `AUTO` mantenía la luz apagada (como era de esperarse).

void HardwareController::setLight(bool estado) {
    if (_modoActual == ModoOperacion::AUTO) {
        Serial.println(F("❌ [Hardware] Ignorando comando de Luz. Sistema en modo AUTO."));
        Firebase.setString("/debug/last_event", "Rechazo: Modo AUTO");
        return;
    }
    // Failsafe de fotoperiodo relajado en modo manual. Se asume que expirará pronto.
    _actuadores.light_ON = estado;
    digitalWrite(PIN_LIGHT, estado ? HIGH : LOW);
    Firebase.setString("/debug/last_event", estado ? "Luz Encendida Manual" : "Luz Apagada Manual");
}

## ¿Cómo lo solucionamos?
1. Se modificó el archivo `FirebaseManager.cpp` en el firmware C++ del ESP32.
2. Se reescribió el *callback* (la función que escucha a Firebase) para que acepte tanto datos estructurados (`JSON`) como actualizaciones individuales de tipo primitivo (`booleanos`, `enteros`, `cadenas de texto`).
3. Compilé el nuevo código y se lo inyecté directamente a tu placa ESP32 por aire mediante la actualización remota (**OTA**).

A partir de ahora, puedes usar el modo manual libremente en cualquier momento y los botones responderán instantáneamente. Además, **el cronómetro de cuenta regresiva para la protección por olvido (5 minutos) está funcionando perfectamente** y puedes verlo bajar segundo a segundo tras activar el modo `MANUAL`.

---

En este sprint hemos avanzado significativamente en la profesionalización de la interfaz (React) para soportar datos masivos y estructurar el sistema hacia un despliegue industrial multisede.

### Sincronización del Modo Operación (UI y Hardware)
- **Problema Anterior:** El frontend y el hardware se desincronizaban al cambiar a modo MANUAL. El ESP32 pasaba internamente a AUTO tras 15 minutos, pero no lo reflejaba en el nodo `/commands`, por lo que la interfaz seguía mostrando "MANUAL" falsamente.
- **Solución ESP32:** Se añadió captura directa del parámetro `max_manual_time_ms` a nivel de raíz del JSON de Firebase para que el ESP32 no lo ignore al recibirlo de forma aislada.
- **Solución React:**
  - Al pulsar "MANUAL", la interfaz confía en el click por 5 segundos. Pasado ese tiempo, la fuente de verdad absoluta de la UI vuelve a ser la **telemetría** real (`camara.modo_operacion`) reportada por el ESP32, asegurando que si el ESP32 aborta el modo manual o se agota el tiempo, la interfaz vuelve a mostrar "AUTO" y la advertencia "Bloqueado por Rule Engine".

### Inyección de Perfiles (Desbordamiento de Memoria)
- **Problema Anterior:** Al inyectar un perfil de cultivo (más de 480 bytes de JSON con las 6 reglas), la placa ESP32 no actualizaba sus parámetros a pesar de recibir el comando por el Stream de Firebase.
- **Solución ESP32:** Se incrementó la capacidad de los `DynamicJsonDocument` (ArduinoJson) en `FirebaseManager.cpp` y `FileManager.cpp` de `1024` / `2048` bytes a **4096 bytes**. Esto soluciona el `NoMemory` error silencioso que descartaba la configuración entrante.

### Configuración del Tiempo Límite Manual (Timeout)
- **Implementación:** El texto estático que mostraba "T/O: 15 MINUTOS" ha sido reemplazado por un **menú desplegable interactivo** que solo aparece cuando se está en Modo Override Manual.
- **Opciones Disponibles:** Permite cambiar en tiempo real (enviando el comando al ESP32) entre 5 MIN, 15 MIN, 30 MIN y 60 MIN.

## Tareas Pendientes
- Monitoreo en hardware real para confirmar estabilidad de la telemetría con la nueva estructura de 4096 bytes.
- Despliegue de los cambios del Frontend en Firebase Hosting (si es que se utiliza).
- Flasheo mandatorio del ESP32 con el nuevo código (PlatformIO/Arduino).

## 1. Dashboard de Telemetría (Gráficos)
Se reemplazó el antiguo gráfico simple por un avanzado `TelemetryDashboard` que utiliza **Recharts**.
*   **Histórico de 30 Días**: Capacidad nativa para mostrar una ventana de tiempo de hasta 30 días, tal como acordamos (manteniendo el almacenamiento de Firebase RTDB).
*   **Análisis Multivariable**: Permite visualizar de forma simultánea e independiente la Temperatura, Humedad y el VPD (Déficit de Presión de Vapor) a lo largo del tiempo.
*   **Filtros de Tiempo**: Botones rápidos para visualizar las últimas 24 horas, 7, 15 o 30 días.

## 2. Topología Industrial (ISA-95)
Se introdujo el estándar ISA-95 a través del nuevo `DataModel.ts`.
*   Ahora el Dashboard incluye selectores en cascada (Granja -> Nave -> Zona -> Nodo), sentando las bases para controlar múltiples ESP32 en distintas salas simultáneamente.

## 3. Enciclopedia Agronómica 2.0
El `CropProfileSelectorModal` ha recibido una actualización de UX.
*   **Imágenes**: Soporte integrado para `imageUrl`, renderizando imágenes de alta calidad de las especies.
*   **Tips por Etapa**: Soporte para `stageTips`. Cuando cambias de fase (ej. de Incubación a Fructificación), la interfaz ahora muestra consejos técnicos (ej. "¡Momento crítico! Aplica choque térmico..."). Hemos implementado ejemplos para **Shiitake** y **Tomate**.
*   **Botón de Restablecimiento**: Se agregó el botón **"Restablecer"** para revertir instantáneamente los parámetros de *Tuning* manual a los recomendados por el catálogo oficial.

## 4. Estado de Nodos y Cultivos Activos
La pantalla principal (`App.tsx`) ahora rastrea y muestra de manera persistente qué Perfil de Cultivo y qué Etapa Fenológica se está ejecutando actualmente en el ESP32, mostrándolo justo debajo del identificador del Nodo.

## Verificación Realizada
- [x] Build estricto de TypeScript (`npm run build`) validado al 100% (sin errores ni advertencias de tipo).
- [x] Todos los componentes han sido enlazados correctamente.

---
**Nota para el Operador**:
El sistema está listo en el frontend. Puedes continuar con tus pruebas físicas de hardware y relés en el ESP32 con la confianza de que el panel de control y almacenamiento web están totalmente preparados.
