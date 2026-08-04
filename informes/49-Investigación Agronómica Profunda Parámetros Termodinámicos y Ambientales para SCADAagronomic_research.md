# 🔬 Investigación Agronómica Profunda: Parámetros Termodinámicos y Ambientales para SCADA

**Documento de Referencia Técnica para Sistemas de Lazo Cerrado (CEA)**
*Elaborado a partir de bases de datos agronómicas, bibliografía de micología comercial (Stamets, P., 2000) y modelos de transpiración vegetal estomática.*

---

## 🍄 SECCIÓN I: REINO FUNGI
*Los hongos carecen de estomas; su respiración se rige por gradientes de presión osmótica. La humedad relativa (RH) y la acumulación de dióxido de carbono (CO₂) son los triggers morfológicos absolutos.*

### 1. Pleurotus Ostreatus (Hongo Ostra Comercial)
| Fase Fenológica | Temp Diurna/Nocturna | Humedad (RH) | Nivel de CO₂ | Intercambio de Aire (FAE) | Iluminación (Fotoperiodo / PPFD / Lux) |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Incubación (Spawn Run)** | 24.0°C constante | 75% - 85% | 5,000 - 20,000 ppm | Nulo (Sellado) | 0h Luz (Oscuridad total) |
| **Formación de Primordios (Pinning)** | 10.0°C - 15.0°C (Choque) | 95% - 100% | < 1,000 ppm | Muy Alto (Evacuar CO₂) | 12h / 50 PPFD / 200-500 Lux |
| **Fructificación (Fruiting)** | 15.0°C - 21.0°C | 85% - 90% | < 800 ppm | Alto (Constante) | 12h / 50-100 PPFD / 300-600 Lux |

> ⚠️ **Riesgo Biológico/Morfológico:** Si el CO₂ en Fructificación excede los 1,000 ppm, *P. ostreatus* sufrirá "Elongación del Estípite" (tallos muy largos y sombreros enanos) como mecanismo evolutivo para escapar del aire viciado.

### 2. Hericium Erinaceus (Melena de León)
| Fase Fenológica | Temp Diurna/Nocturna | Humedad (RH) | Nivel de CO₂ | Intercambio de Aire (FAE) | Iluminación (Fotoperiodo / PPFD / Lux) |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Incubación** | 21.0°C - 24.0°C | 80% - 85% | 5,000 - 10,000 ppm | Nulo | 0h Luz |
| **Formación de Primordios** | 10.0°C - 15.0°C | 95% | < 800 ppm | Alto | 12h / 50 PPFD / 100-250 Lux |
| **Fructificación** | 18.0°C - 21.0°C | 85% - 95% | < 800 ppm | Alto | 12h / 50-80 PPFD / 200-400 Lux |

> ⚠️ **Riesgo Biológico/Morfológico:** Si la iluminación (fototropismo) es deficiente (< 100 lux), *H. erinaceus* formará estructuras de tipo coral en lugar del cuerpo fructífero denso en forma de globo con espinas (fenómeno de ramificación aberrante).

### 3. Lentinula Edodes (Shiitake)
| Fase Fenológica | Temp Diurna/Nocturna | Humedad (RH) | Nivel de CO₂ | Intercambio de Aire (FAE) | Iluminación (Fotoperiodo / PPFD / Lux) |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Incubación / Pardeamiento** | 22.0°C - 25.0°C | 60% - 75% | > 5,000 ppm | Nulo | 0h Luz |
| **Inducción (Choque Físico/Térmico)**| 10.0°C - 15.0°C | 85% - 95% | < 1,000 ppm | Alto | 12h / 50 PPFD / 200 Lux |
| **Fructificación** | 15.0°C - 20.0°C | 70% - 85% | < 1,000 ppm | Medio | 12h / 50 PPFD |

### 4. Ganoderma Lucidum (Reishi)
| Fase Fenológica | Temp Diurna/Nocturna | Humedad (RH) | Nivel de CO₂ | Intercambio de Aire (FAE) | Iluminación (Fotoperiodo / PPFD / Lux) |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Incubación** | 24.0°C - 28.0°C | 85% - 90% | > 5,000 ppm | Nulo | 0h Luz |
| **Crecimiento Antler (Cuernos)** | 22.0°C - 25.0°C | 90% - 95% | **2,000 - 5,000 ppm** | Bajo | 12h / 100 PPFD / 500 Lux |
| **Crecimiento Conk (Sombrero)** | 22.0°C - 25.0°C | 85% - 90% | **< 1,000 ppm** | Alto | 12h / 150-200 PPFD / 1000 Lux |

---

## 🌿 SECCIÓN II: REINO PLANTAE (CEA e Hidroponía)
*A diferencia de los hongos, la fotosíntesis y el flujo de la savia del xilema están regidos estrictamente por el **Déficit de Presión de Vapor (VPD)** y el **DLI** (Integral de Luz Diaria).*

### 1. Solanum Lycopersicum (Tomate de Invernadero)
| Fase Fenológica | Temp Día / Noche | VPD Objetivo (kPa) | Humedad (RH) | Nivel de CO₂ | Iluminación (Fotoperiodo / PPFD) |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Germinación / Clonación** | 24.0°C constante | 0.4 - 0.6 kPa | 85% - 95% | 400 - 800 ppm | 18h / 100-200 µmol/m²/s |
| **Crecimiento Vegetativo** | 22.0°C / 18.0°C | 0.8 - 1.0 kPa | 60% - 70% | 800 - 1,000 ppm | 16h / 400-600 µmol/m²/s |
| **Floración / Engorde** | 24.0°C / 16.0°C | 1.0 - 1.2 kPa | 50% - 60% | 800 - 1,200 ppm | 14h / 600-800 µmol/m²/s |

> ⚠️ **Riesgo Biológico:** Un VPD bajo (< 0.5 kPa) en fase de engorde impide el transporte pasivo de Calcio hacia las zonas de crecimiento, causando "Pudrición Apical" (*Blossom End Rot*). 

### 2. Cannabis Sativa (Cultivo Indoor - Alta Precisión)
| Fase Fenológica | Temp Día / Noche | VPD Objetivo (kPa) | Humedad (RH) | Nivel de CO₂ | Iluminación (Fotoperiodo / PPFD) |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Enraizamiento / Clonación** | 25.0°C constante | 0.4 - 0.6 kPa | 80% - 90% | 400 - 800 ppm | 18h o 24h / 100-250 µmol/m²/s |
| **Crecimiento Vegetativo** | 26.0°C / 20.0°C | 0.8 - 1.0 kPa | 60% - 70% | 800 - 1,200 ppm | 18h luz / 6h oscuridad / 400-600 PPFD |
| **Floración Temprana (S 1-4)**| 24.0°C / 18.0°C | 1.2 - 1.4 kPa | 50% - 55% | 1,200 - 1,500 ppm | 12h luz / 12h oscuridad / 800-1000 PPFD |
| **Maduración Final (S 5-8)** | 22.0°C / 16.0°C | 1.4 - 1.6 kPa | 40% - 45% | < 1,000 ppm (Bajar CO₂) | 12h / 12h / > 1000 PPFD (Requiere DLI masivo) |

> ⚠️ **Riesgo Biológico:** Humedad Relativa mayor al 55% (VPD inferior a 1.0 kPa) durante las semanas finales de floración induce inmediatamente la esporulación de *Botrytis cinerea* (Pudrición de cogollo o Bud Rot), destruyendo el 100% de la cosecha. Se requiere extracción extrema o deshumidificadores industriales.

### 3. Fragaria × ananassa (Fresa/Frutilla en Hidroponía Vertical)
| Fase Fenológica | Temp Día / Noche | VPD Objetivo (kPa) | Humedad (RH) | Nivel de CO₂ | Iluminación (Fotoperiodo / PPFD) |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Vegetativo** | 20.0°C / 12.0°C | 0.6 - 0.8 kPa | 65% - 75% | 800 ppm | 14h / 250-400 µmol/m²/s |
| **Floración y Cosecha** | 22.0°C / 14.0°C | 0.8 - 1.0 kPa | 60% - 70% | 800 ppm | 14h / 300-500 µmol/m²/s |

> ⚠️ **Nota Agronómica (DIF):** Las fresas son extremadamente dependientes de un gran diferencial térmico entre el día y la noche (DIF). Noches a 12-14°C son obligatorias para evitar el estrés metabólico y asegurar la acumulación de azúcares (grados Brix) en el fruto.

### 4. Lactuca Sativa (Lechuga Hidropónica - NFT/DWC)
| Fase Fenológica | Temp Día / Noche | VPD Objetivo (kPa) | Humedad (RH) | Nivel de CO₂ | Iluminación (Fotoperiodo / PPFD) |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Ciclo Único (Plantul a Cosecha)** | 20.0°C / 16.0°C | 0.6 - 0.9 kPa | 60% - 70% | 800 - 1,000 ppm | 16h / 200-300 µmol/m²/s |

> ⚠️ **Riesgo Biológico:** Temperaturas del aire o solución nutritiva por encima de los 24.0°C inducen el "Bolting" (Espigado), donde la lechuga inicia su floración, produciendo compuestos amargos y arruinando el valor comercial.

---

## 💻 TRADUCCIÓN A BASE DE DATOS (SCADA)

Para implementar esto en tu frontend, aquí tienes el diseño de la base de datos maestra (Modelo TypeScript) que deberás inyectar en `CropProfiles.ts`. Nuestro algoritmo tomará este JSON y lo traducirá en arreglos numéricos para el ESP32:

```typescript
export interface PhaseThermodynamics {
  phase_id: string;             // Ej: "CANNABIS_FLOWER_LATE"
  phase_name: string;           // "Floración Maduración"
  target_temp_day_c: number;    // 22.0
  target_temp_night_c: number;  // 16.0
  target_rh_pct: number;        // 45.0
  target_vpd_kpa: number;       // 1.5
  max_co2_ppm: number;          // 1000
  light_hours: number;          // 12
  requires_night_drop: boolean; // true (Instruye al ESP32 a leer el NTP Time)
  risk_alerts: string[];        // ["Riesgo de Botrytis si RH > 55%"]
}

export interface CropProfileDatabase {
  id: string;                   // "CANNABIS_SATIVA"
  kingdom: "FUNGI" | "PLANTAE";
  common_name: string;
  scientific_name: string;
  phases: PhaseThermodynamics[];
}
```
