# Arquitectura Final: Motor Fenológico y Gestor de Perfiles React

Este documento sirve como registro técnico "As-Built" de la implementación final del Gestor de Perfiles en el Frontend (React). Define la estructura, la experiencia de usuario y la lógica de inyección de parámetros.

## 1. Objetivo Logrado
Construir una interfaz agnóstica capaz de orquestar ciclos biológicos completos para el Controlador Universal (ESP32). En lugar de crear recetas vacías, el sistema inyecta **5 etapas fenológicas completas** con variables climáticas (SCADA) pre-configuradas dependiendo del reino biológico seleccionado.

---

## 2. Flujo de Experiencia de Usuario (Wizard)

El proceso de creación fue refactorizado a un flujo modal Multi-Paso para maximizar la limpieza de la interfaz:

*   **Paso 1 - Selección de Reino:** El usuario elige entre `Reino Fungi` (🍄) y `Reino Plantae` (🌿).
*   **Paso 2 - Meta-datos:** El usuario asigna un `Nombre` personalizado (Ej. "Champiñón París - Lote 4") y una `Descripción`.
*   **Finalización:** Al confirmar, el motor de React genera la matriz de datos completa y redirecciona al usuario directamente al editor de la fase 1.

---

## 3. Motor Fenológico (Generación de Fases)

Al seleccionar el reino, se inyectan arreglos JSON con parámetros seguros por defecto que el usuario luego puede afinar.

### 🍄 Reino Fungi
| ID | Fase | Fotoperiodo (L/O) | Temp (°C) | Humedad (%) | CO2 Max (ppm) |
|---|---|---|---|---|---|
| `f_1` | 1. Incubación | 0/24 | 24 - 26 | 70 - 80 | 8000 |
| `f_2` | 2. Consolidación | 0/24 | 22 - 24 | 75 - 85 | 6000 |
| `f_3` | 3. Inducción Primordios | 12/12 | 16 - 18 | 90 - 95 | 800 |
| `f_4` | 4. Fructificación | 12/12 | 18 - 20 | 85 - 90 | 1000 |
| `f_5` | 5. Descanso | 8/16 | 20 - 22 | 80 - 85 | 1500 |

### 🌿 Reino Plantae
| ID | Fase | Fotoperiodo (L/O) | Temp (°C) Día/Noche | Humedad (%) | CO2 Max (ppm) |
|---|---|---|---|---|---|
| `p_1` | 1. Germinación | 16/8 | 24 - 26 / 22 - 24 | 85 - 90 | 600 |
| `p_2` | 2. Plántula | 16/8 | 22 - 24 / 18 - 20 | 70 - 80 | 800 |
| `p_3` | 3. Crecimiento Veg. | 18/6 | 24 - 27 / 20 - 22 | 65 - 75 | 1000 |
| `p_4` | 4. Floración | 12/12 | 22 - 25 / 18 - 22 | 55 - 65 | 1200 |
| `p_5` | 5. Maduración | 12/12 | 20 - 24 / 18 - 20 | 50 - 60 | 1200 |

---

## 4. Capacidades Adicionales Implementadas

*   **Edición en línea (Inline Editing):** El usuario puede modificar el nombre y la descripción de un perfil creado previamente haciendo clic en el icono de lápiz (✏️) junto al título en la vista de Enciclopedia.
*   **Manejo de Estados Persistente:** Todos los perfiles personalizados se clonan en un JSON unificado y se inyectan en el `localStorage` (`CUSTOM_PROFILES`), garantizando que no se pierdan al recargar la aplicación.
*   **Manejo de Errores y UI:** Al eliminar el perfil seleccionado actualmente, el sistema realiza un "fallback" automático al perfil nativo por defecto (Pleurotus Ostreatus) para evitar cuelgues (NullPointerException) en el renderizado de React.

---

> [!NOTE]
> **Próxima Fase de Desarrollo:** Este documento abarca la estructuración de los datos en el Frontend. El paso lógico a seguir es conectar el botón "Inyectar Perfil al ESP32" a la tubería MQTT. Esto enviará la matriz JSON de la fase seleccionada hacia el backend C++ para que el Microcontrolador ajuste la termodinámica de sus actuadores (Relés).
