# Arquitectura PLC Industrial de 3 Capas (Algoritmo Racional)
**Documento Maestro de Arquitectura y Plan de Implementación**

Este documento define la refactorización completa del sistema (ESP32 y React) para eliminar el antiguo "Motor de Reglas" y utilizar un esquema declarativo y determinista basado en perfiles de cultivo absolutos (`CropProfile`), integrando protección de hardware de nivel industrial y un Árbitro de Conflictos.

---

## 1. Capa 1: Modelos de Datos (Frontend a Backend)

Se abandona la configuración por reglas iterativas. El usuario (desde React) enviará un objeto `CropProfile` absoluto que define las condiciones ideales y críticas para el cultivo.

### Modificaciones en el Código:
- **`cultivo.ts` (React) & `FileManager.h` (ESP32):**
  - Eliminar los tipos: `ReglaTermodinamica`, `VariableFisica`, `OperadorLogico`, `ActuadorFisico`, `EstadoDeseado`.
  - Crear el modelo `CropProfile` con los siguientes setpoints:
    - `temp_ideal_min`, `temp_ideal_max` (Banda muerta de operación térmica)
    - `temp_crit_min`, `temp_crit_max` (Límites de supervivencia)
    - `hum_ideal_min`, `hum_ideal_max` (Banda muerta hídrica)
    - `hum_crit_min` (Límite crítico de sequedad)
    - `co2_ideal_min`, `co2_ideal_max`, `co2_crit_max` (Gestión de gases)
    - `light_hours_on` (Fotoperiodo)
- **`FileManager.cpp` (ESP32):**
  - Actualizar la lógica de lectura y escritura JSON (`guardarConfiguracionJson`, `cargarConfiguracion`).
  - **Manejo de Retrocompatibilidad (Día Cero):** Si el ESP32 detecta un archivo de configuración antiguo (con reglas), lo descartará y creará un perfil seguro por defecto para proteger el cultivo hasta recibir nuevos datos.
- **`RuleEditorModal.tsx` (React):**
  - Refactorizar (Opción A): Renombrar y reutilizar este componente como `CropProfileEditorModal.tsx`. Contendrá el formulario de interfaz para definir los setpoints del cultivo.

---

## 2. Capa 2: Motor de Control y Árbitro de Conflictos

El ESP32 tomará decisiones centralizadas basadas en la biología y la supervivencia (como un Horno Rational), eliminando ejecuciones contradictorias.

### Modificaciones en el Código:
- **`HardwareController.cpp`:**
  - Eliminar el bloque iterativo de reglas en `procesarLogicaDeControl`.
  - Implementar la **Jerarquía de Supervivencia (Árbitro de Conflictos)**:
    1. **Supervivencia Térmica / Gases (Crítica):** Si `Temp > temp_crit_max` o `CO2 > co2_crit_max` ➔ **Gana Extractor**. El Calefactor y Humidificador se apagan forzosamente.
    2. **Protección contra Frío:** Si `Temp < temp_ideal_min` ➔ **Gana Calefactor**. El Extractor se apaga temporalmente (salvo riesgo tóxico de CO2).
    3. **Humedad (Secundaria):** El Humidificador opera solo si las prioridades 1 y 2 están en rangos seguros.
  - *Nota a Futuro:* El sistema considerará la futura adición de un aire acondicionado (Peltier/Inverter) integrando un actuador `COOLER` que operará por encima de la `temp_ideal_max`.

---

## 3. Capa 3: Protección de Hardware y Modo Manual

Protección física absoluta del equipo y manejo de operaciones manuales.

### Modificaciones en el Código:
- **`HardwareController.cpp` & `HardwareController.h`:**
  - **Filtro de Relés (Anti-Short Cycle Timer):** Antes de enviar la señal `digitalWrite` a los actuadores, el sistema verificará que han pasado al menos **180,000 milisegundos (3 minutos)** desde el último cambio de estado. Esto protege contactores y futuros compresores contra desgaste e irrupción de corriente.
  - **Exención de la Luz:** El actuador de la LUZ estará excluido del temporizador de 180s y de los bloqueos térmicos. Podrá encenderse instantáneamente en cualquier momento para inspección visual.
- **`TelemetryDashboard.tsx` (React):**
  - **Temporizador de Modo Manual:** Integrar un ComboBox para seleccionar el `max_manual_time_ms`. Al activar el modo manual, el panel mostrará un cronómetro regresivo. Al llegar a cero, el sistema retornará al Modo AUTO de forma segura.

---

## 4. Telemetría y Monitoreo

Transmisión del estado interno del PLC hacia el usuario.

### Modificaciones en el Código:
- **ESP32 & React:**
  - Añadir el enum `EstadoOperacional` (`NORMAL`, `CALENTANDO`, `ENFRIANDO`, `HUMIDIFICANDO`, `SAFE_MODE`, `EMERGENCIA`).
  - El ESP32 enviará este estado dentro del payload de telemetría a Firebase.
  - El componente `TelemetryDashboard.tsx` consumirá este estado para alimentar el componente `SemaforoEstabilidad.tsx`, dando retroalimentación visual al usuario.

---

## Plan de Verificación
1. **Compilación ESP32:** Ejecutar `pio run` para verificar sintaxis C++.
2. **Compilación React:** Ejecutar `npm run build` para asegurar la correcta declaración de interfaces TypeScript.
3. **Validación del Filtro (Debounce):** Simular variaciones de temperatura y confirmar mediante consola serial que los relés respetan la exclusión de 3 minutos.
4. **Validación Modo Manual:** Confirmar que la Luz responde en tiempo real (0s delay).
