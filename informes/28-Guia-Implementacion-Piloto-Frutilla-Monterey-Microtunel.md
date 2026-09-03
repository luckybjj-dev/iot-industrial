# 🍓 Guía de Manejo y Automatización — Frutilla Monterey (Piloto 100 Plantas)

> **Documento de Referencia Técnica y Agronómica — Primer Piloto Comercial AgriEdge OS**  
> **Cultivo:** Frutilla Monterey (*Fragaria × ananassa*, Día Neutro)  
> **Escala:** 100 plantas en bancal en suelo bajo microtúnel  
> **Responsable Agronómico:** Equipo de Ingeniería Agronómica  
> **Plataforma de Control:** AgriEdge OS (ESP32-S3 + RS-485 Modbus + SCADA React)  

---

## 0. Contexto de la Variedad y Fisiología

*Monterey* es una variedad de **día neutro** (no responde al fotoperíodo; su inducción floral se rige exclusivamente por la **temperatura del suelo y del aire**). Esto permite una producción escalonada y fuera de temporada bajo microtúnel. 

* **Características:** Planta vigorosa, fruto de gran calibre y alto contenido de azúcar (grados Brix).
* **Sensibilidad Crítica:** Muy exigente en el manejo del Nitrógeno y altamente sensible al estrés térmico (calor en aire $>30^\circ\text{C}-32^\circ\text{C}$ provoca aborto floral; frío en raíz $<12^\circ\text{C}$ detiene la absorción de nutrientes e inducción floral).

---

## 1. Parámetros Clave de Control Agronómico

| Parámetro | Rango Óptimo | Efecto Fisiológico si se Sale de Rango |
| :--- | :--- | :--- |
| **Temp. Suelo (Zona Radicular)** | **$12.0^\circ\text{C} - 20.0^\circ\text{C}$** | $<12^\circ\text{C}$ detiene inducción floral y absorción de nutrientes ($P, K, Fe$); $>24^\circ\text{C}$ estresa la raíz e induce proliferación de *Pythium*. |
| **Temp. Aire Diurna** | **$18.0^\circ\text{C} - 24.0^\circ\text{C}$** | $>30^\circ\text{C}-32^\circ\text{C}$ aborta flores y esteriliza polen; $<8^\circ\text{C}$ frena el desarrollo celular. |
| **Temp. Aire Nocturna** | **$8.0^\circ\text{C} - 12.0^\circ\text{C}$** | Heladas ($<0^\circ\text{C}$) dañan irreversiblemente coronas, flores y frutos cuajados. |
| **Humedad Relativa (HR)** | **$65\% - 75\%$** | $>80\%-85\%$ favorece *Botrytis cinerea* y Oídio; $<50\%$ genera estrés hídrico estomático y mal cuaje. |
| **Humedad de Suelo (Tensión / VWC)**| **$-10$ a $-25\text{ kPa}$ ($\sim 70-80\%$ VWC)** | Exceso causa asfixia radicular y muerte de pelos absorbentes; déficit reduce calibre y deforma frutos. |
| **pH en Suelo / Solución** | **$5.5 - 6.5$** | Fuera de rango genera precipitación y bloqueo de Hierro ($Fe$), Manganeso ($Mn$) y Fósforo ($P$). |
| **Conductividad Eléctrica (EC)** | **$1.0 - 1.8\text{ dS/m}$** | $\text{EC} > 2.0\text{ dS/m}$ quema ápices radiculares por estrés osmótico y reduce calibre. |
| **Radiación / Luz** | **Alta pero difusa** | Sombra excesiva etiola las plantas y reduce floración. |
| **Ventilación / Circulación** | **Renovación regular** | Aire estancado y condensación matutina multiplican hongos fitopatógenos. |

---

## 2. Arquitectura de Automatización y Lazos de Control (AgriEdge OS)

AgriEdge OS gobierna el microtúnel mediante **4 lazos de control de lazo cerrado**:

```
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│                             ARQUITECTURA DE LAZOS AGRIEDGE OS                               │
├─────────────────────────┬───────────────────────┬───────────────────────────────────────────┤
│ Lazo de Control         │ Sensor Asignado       │ Actuador / Relé Gobernado                 │
├─────────────────────────┼───────────────────────┼───────────────────────────────────────────┤
│ 1. Riego por Goteo      │ Sonda 7-en-1 (RS-485) │ Electroválvula de Riego (GPIO 33)         │
│    de Precisión         │ % VWC en Suelo        │ • Riego diurno por umbral (<60% VWC).     │
│                         │                       │ • Pulsos de 3 min + Soak Time de 15 min.  │
├─────────────────────────┼───────────────────────┼───────────────────────────────────────────┤
│ 2. Calefacción Radicular│ Sonda 7-en-1 (RS-485) │ Bomba Circuladora de Agua Tibia (GPIO 4)  │
│    (Agua Tibia / PEX)   │ Temp. Suelo (°C)      │ • ON si T_suelo < 12°C.                   │
│                         │                       │ • OFF si T_suelo >= 16°C a 18°C.          │
├─────────────────────────┼───────────────────────┼───────────────────────────────────────────┤
│ 3. Clima Aéreo & FAE    │ Sensirion SHT35 (I2C) │ Extractor / Motor de Apertura (GPIO 32)   │
│    (Evacuación Calor/HR)│ Temp. Aire y HR (%)   │ • ON si T_aire > 24°C o HR > 80%.         │
├─────────────────────────┼───────────────────────┼───────────────────────────────────────────┤
│ 4. Anti-Condensación    │ Reloj NTP + SHT35     │ Ventilador de Circulación Interna (GPIO 17│
│    (Secado de Rocío)    │ Hora y HR (%)         │ • Pulso matutino para secar rocío en hoja.│
└─────────────────────────┴───────────────────────┴───────────────────────────────────────────┘
```

---

## 3. Sistema de Calefacción Radicular por Agua Tibia (Diseño Físico)

Calentar la zona radicular es **energéticamente más eficiente** que calentar todo el volumen de aire del túnel.

### Esquema Hidráulico:
$$\text{[Fuente de Calor]} \longrightarrow \text{[Estanque]} \longrightarrow \text{[Bomba Circuladora]} \longrightarrow \text{[Serpentín PEX bajo Bancal]} \longrightarrow \text{Retorno}$$

### Parámetros de Instalación:
* **Tubería:** Polietileno reticulado (PEX) o manguera apta para agua caliente ($16-20\text{ mm}$ de diámetro).
* **Profundidad:** $10-15\text{ cm}$ bajo la línea de plantación (directamente en la rizósfera activa).
* **Separación:** Serpentín cada $20-25\text{ cm}$ a lo largo del bancal.
* **Aislamiento Base:** Plancha de poliestireno expandido bajo los tubos para direccionar el calor hacia arriba.
* **Temperatura del Agua Circulante:** $25.0^\circ\text{C} - 32.0^\circ\text{C}$ (jamás $>35^\circ\text{C}$ para evitar gradientes térmicos letales en raíz).
* **Fuente de Calor Recomendada:** Calefón/termo con termostato, colector solar térmico o biopila compost (*Biomeiler*).

---

## 4. Acciones Correctivas y Manejo Cultural Pasivo

1. **Acolchado Plástico (Mulch):** Mulch negro en otoño-invierno para captar radiación y conservar calor en suelo; mulch blanco/negro en verano para repeler calor excesivo.
2. **Manta Térmica Interna (TNT / Agrotela):** Colocación sobre los arcos en noches con riesgo de helada ($<3^\circ\text{C}$).
3. **Manejo de Nutrición en Frío:** Reducir Nitrógeno ($N$) en días cortos y nublados para evitar follaje tierno susceptible a hongos; priorizar Potasio ($K$) y Fósforo ($P$) para consistencia de fruto y floración.
4. **Ventilación Matutina:** Ventilar en las horas centrales del día para evacuar humedad acumulada, incluso con bajas temperaturas exteriores.
5. **Horarios de Riego:** Regar a media mañana (cuando el suelo y el agua ya se han templado con el sol), **nunca en la tarde o noche**.

---

## 5. Perfil de Cultivo Oficial en AgriEdge OS (`CropProfiles.ts`)

```typescript
export const PLANTAE_FRAGARIA_MONTEREY: CropProfile = {
  id: 'plantae_fragaria_monterey',
  kingdom: 'PLANTAE',
  scientificName: 'Fragaria × ananassa (Monterey)',
  commonName: 'Frutilla Monterey (Día Neutro)',
  description: 'Variedad de día neutro sensible a estrés térmico radicular. Requiere suelo >12°C, HR <75% y CE 1.0-1.8 dS/m.',
  phases: [
    {
      id: 'production_continuous',
      name: 'Producción Continua en Microtúnel',
      duration_days: 180,
      targets: {
        temperature: {
          day: { min: 18.0, max: 24.0 },      // Óptimo aire diurno
          night: { min: 8.0, max: 12.0 },     // Óptimo aire nocturno (Failsafe helada < 0°C)
          substrate: { min: 12.0, max: 18.0 } // Calefacción radicular ON < 12°C, OFF >= 16°C
        },
        humidity: { min: 65.0, max: 75.0 },   // Alerta Botrytis si > 80%
        vpd: { min: 0.8, max: 1.2 },          // Transpiración equilibrada (kPa)
        co2: { min: 400, max: 800 },
        fae: { ach: { min: 2, max: 4 } },
        lighting: { photoperiod: "12/12" },   // Día neutro
        ec: { min: 1.0, max: 1.8 },           // dS/m (Alerta salinidad > 1.8)
        ph: { min: 5.5, max: 6.5 }            // Rango de asimilación óptimo
      }
    }
  ]
};
```
