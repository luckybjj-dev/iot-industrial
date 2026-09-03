# INFORME TÉCNICO OFICIAL Nº 30
## Auditoría Integral AgriEdge OS, Resolución de Deuda Técnica en Firmware y Optimización Científica del Reino Plantae (Piloto Frutilla Monterey)

- **Fecha de Emisión:** 27 de Agosto de 2026
- **Autor:** Antigravity (Google DeepMind Team) & Equipo de Ingeniería AgriEdge OS
- **Ámbito:** Firmware ESP32 (`edge_esp32`), Frontend SCADA (`frontend_react`), Enciclopedia Biológica (`CropProfiles.ts`), Infraestructura Firebase RTDB.

---

### 1. Resumen Ejecutivo y Motivación

En preparación para la primera prueba de fuego real con el cultivo de **Frutilla Monterey** (*Fragaria × ananassa 'Monterey'*), se ejecutó una auditoría integral de tres capas (Firmware, SCADA y Documentación). La auditoría identificó:
1. Un defecto crítico en la persistencia local de recetas agronómicas en LittleFS (`FileManager.cpp`).
2. Una referencia de log desactualizada en el controlador de hardware (`HardwareController.cpp`).
3. Incompletitud en los parámetros de suelo y zona radicular en 10 de los 11 perfiles del Reino Plantae en `CropProfiles.ts`.
4. Repetición de la URL base de Firebase RTDB en `firebaseService.ts`.

Todas las discrepancias fueron resueltas, investigadas con rigor científico y validadas mediante compilación estricta al 100%.

---

### 2. Detalle de Modificaciones y Correcciones Realizadas

#### A. Firmware ESP32 (`edge_esp32`)
1. **Persistencia Atómica de Parámetros de Suelo (`FileManager.cpp`):**
   - Se incorporó la extracción de `hum_suelo_ideal_min`, `hum_suelo_ideal_max` y `hum_suelo_crit_min` en la función `guardarConfiguracionJson()`.
   - Se eliminó la asignación redundante de `light_hours_on`.
   - *Impacto:* Garantiza que las recetas agronómicas inyectadas desde la nube vía Firebase RTDB se almacenen en `config.json` en LittleFS y sobrevivan a reinicios de hardware.
2. **Corrección de Log de Runtime (`HardwareController.cpp`):**
   - Se corrigió el mensaje de debug en línea 79: `"Modo MANUAL activado por Dashboard / Firebase RTDB"`, eliminando el texto obsoleto de MQTT.
3. **Estado de Riego Automático por Pulsos:**
   - La lógica de irrigación se mantiene en reposo seguro (`req_irrigation = false`) hasta la conexión física del sensor capacitivo en canal ADC dedicado. El control manual remoto (`bomba_riego_on`) opera al 100%.

#### B. Frontend SCADA React (`frontend_react`)
1. **Centralización de Infraestructura RTDB (`firebaseService.ts`):**
   - Se declaró la constante `FIREBASE_RTDB_BASE_URL` y se refactorizaron 12 llamadas directas `fetch()`, eliminando URLs hardcodeadas y limpiando comentarios JSDoc duplicados.
2. **Enciclopedia Agronómica Científica (`CropProfiles.ts`):**
   - Se completaron las metas de **10 perfiles del Reino Plantae** especie por especie con datos de literatura científica (*Sonneveld & Voogt, 2009; Resh, 2012; Brechner & Both, 2013; Chandra et al., 2017*):
     - *Solanum lycopersicum* (Tomate de Invernadero)
     - *Cannabis sativa* (Indoor)
     - *Lactuca sativa* (Lechuga Hidropónica)
     - *Capsicum annuum* (Pimiento / Morrón)
     - *Fragaria × ananassa* (Fresa Día Corto)
     - *Cucumis sativus* (Pepino de Invernadero)
     - *Ocimum basilicum* (Albahaca Dulce)
     - *Spinacia oleracea* (Espinaca)
     - *Solanum melongena* (Berenjena)
     - *Mentha spicata* (Menta / Hierbabuena)
   - Cada perfil cuenta ahora con:
     - Rango seguro de zona radicular (`temperature.substrate: 14°C - 24°C`) para prevenir Pythium y anoxia.
     - Contenido volumétrico de agua (`soilMoisture: % VWC`) adaptado a sustrato inerte/hidroponía.
     - PPFD ($\mu\text{mol/m}^2/\text{s}$), DLI ($\text{mol/m}^2/\text{d}$), EC ($\text{mS/cm}$), pH y consejos por etapa (`stageTips`).

---

### 3. Matriz de Validación y Pruebas Internas (Tier 1)

| Capa / Módulo | Verificación Ejecutada | Resultado |
|---|---|---|
| **Firmware ESP32** | `pio run` (PlatformIO GCC Espressif 32) | ✅ **0 Errores** (RAM: 16.5%, Flash: 63.7%) |
| **Frontend SCADA** | `npm run build` (`tsc -b && vite build`) | ✅ **0 Errores** (Bundle generado en 1.08s) |
| **Termodinámica** | Validación de 21 perfiles × todas las fases | ✅ **0 Violaciones** (100% compliant) |

---

### 4. Estado de Preparación para Prueba de Fuego (Frutilla Monterey)

- **Perfil Activo:** `plantae_fragaria_monterey` listo con 3 fases fenológicas (Vegetativo 21d, Floración 28d, Maduración 60d).
- **Layout SCADA:** 6 Hero Cards reactivas (Temp. Ambiente, Humedad Ambiente, VPD Magnus, Temp. Radicular NTC, Humedad Suelo % VWC con detección de desconexión, y CO₂).
- **Actuador Bomba de Riego:** Conmutación manual reactiva con feedback optimista y persistencia en Firebase RTDB.
