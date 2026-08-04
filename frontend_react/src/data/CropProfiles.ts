import type { ReglaTermodinamica } from '../types/cultivo';

export interface PhaseTargets {
  temperature: {
    day: { min: number; max: number };
    night: { min: number; max: number };
  };
  humidity: { min: number; max: number };
  vpd: { min: number; max: number };
  co2: { min: number; max: number };
  fae: { ach: { min: number; max: number } };
  lighting: {
    photoperiod: string; // Ej: "12/12" o "0/24"
    lux?: { min: number; max: number };
  };
  ppfd?: { min: number; max: number };
  dli?: { min: number; max: number };
  ec?: { min: number; max: number };
  ph?: { min: number; max: number };
}

export interface CropPhase {
  id: string;
  name: string;
  duration_days?: number;
  targets: PhaseTargets;
}

export interface CropProfile {
  id: string;
  kingdom: 'FUNGI' | 'PLANTAE';
  scientificName: string;
  commonName: string;
  description: string;
  phases: CropPhase[];
}

export const CROP_PROFILES: Record<string, CropProfile> = {
  fungi_pleurotus_ostreatus: {
    id: 'fungi_pleurotus_ostreatus',
    kingdom: 'FUNGI',
    scientificName: 'Pleurotus ostreatus',
    commonName: 'Hongo Ostra',
    description: 'Nivel de dificultad: Bajo. Uno de los hongos más cultivados por su agresividad y resistencia. Ideal para principiantes. El control de CO₂ y la ventilación (FAE) es vital durante la fructificación para evitar tallos largos y sombreros pequeños (malformaciones).',
    phases: [
      {
        id: 'colonization',
        name: '1. Colonización (Incubación)',
        targets: {
          temperature: { day: { min: 24, max: 26 }, night: { min: 24, max: 26 } },
          humidity: { min: 65, max: 75 },
          vpd: { min: 0.7, max: 1.0 },
          co2: { min: 5000, max: 20000 },
          fae: { ach: { min: 0, max: 1 } },
          lighting: { photoperiod: "0/24" }
        }
      },
      {
        id: 'consolidation',
        name: '2. Consolidación',
        targets: {
          temperature: { day: { min: 22, max: 24 }, night: { min: 22, max: 24 } },
          humidity: { min: 70, max: 80 },
          vpd: { min: 0.5, max: 0.8 },
          co2: { min: 4000, max: 10000 },
          fae: { ach: { min: 0, max: 2 } },
          lighting: { photoperiod: "0/24" }
        }
      },
      {
        id: 'primordia',
        name: '3. Inducción de Primordios',
        targets: {
          temperature: { day: { min: 16, max: 18 }, night: { min: 15, max: 17 } },
          humidity: { min: 92, max: 96 },
          vpd: { min: 0.2, max: 0.4 },
          co2: { min: 600, max: 1000 },
          fae: { ach: { min: 4, max: 8 } },
          lighting: { photoperiod: "12/12", lux: { min: 200, max: 500 } }
        }
      },
      {
        id: 'fruiting',
        name: '4. Fructificación',
        targets: {
          temperature: { day: { min: 17, max: 19 }, night: { min: 16, max: 18 } },
          humidity: { min: 88, max: 93 },
          vpd: { min: 0.3, max: 0.6 },
          co2: { min: 600, max: 900 },
          fae: { ach: { min: 6, max: 10 } },
          lighting: { photoperiod: "12/12", lux: { min: 300, max: 500 } }
        }
      },
      {
        id: 'recovery',
        name: '5. Descanso y Recuperación',
        targets: {
          temperature: { day: { min: 18, max: 20 }, night: { min: 18, max: 20 } },
          humidity: { min: 85, max: 90 },
          vpd: { min: 0.5, max: 0.8 },
          co2: { min: 800, max: 1500 },
          fae: { ach: { min: 2, max: 4 } },
          lighting: { photoperiod: "8/16", lux: { min: 200, max: 200 } }
        }
      }
    ]
  },
  fungi_hericium_erinaceus: {
    id: 'fungi_hericium_erinaceus',
    kingdom: 'FUNGI',
    scientificName: 'Hericium erinaceus',
    commonName: 'Melena de León',
    description: 'Nivel de dificultad: Medio. Seta medicinal y gourmet con potente efecto neurotrófico. Muy sensible a la condensación y humedad excesiva sobre sus espinas capilares, lo que puede causar manchas bacterianas rojizas.',
    phases: [
      {
        id: 'colonization',
        name: '1. Incubación',
        targets: {
          temperature: { day: { min: 23, max: 25 }, night: { min: 23, max: 25 } },
          humidity: { min: 65, max: 75 },
          vpd: { min: 0.7, max: 1.0 },
          co2: { min: 5000, max: 15000 },
          fae: { ach: { min: 0, max: 1 } },
          lighting: { photoperiod: "0/24" }
        }
      },
      {
        id: 'consolidation',
        name: '2. Consolidación',
        targets: {
          temperature: { day: { min: 21, max: 23 }, night: { min: 21, max: 23 } },
          humidity: { min: 70, max: 80 },
          vpd: { min: 0.6, max: 0.8 },
          co2: { min: 4000, max: 8000 },
          fae: { ach: { min: 0, max: 2 } },
          lighting: { photoperiod: "0/24" }
        }
      },
      {
        id: 'primordia',
        name: '3. Inducción de Primordios',
        targets: {
          temperature: { day: { min: 17, max: 19 }, night: { min: 16, max: 18 } },
          humidity: { min: 94, max: 97 },
          vpd: { min: 0.15, max: 0.3 },
          co2: { min: 600, max: 800 },
          fae: { ach: { min: 4, max: 8 } },
          lighting: { photoperiod: "12/12", lux: { min: 200, max: 400 } }
        }
      },
      {
        id: 'fruiting',
        name: '4. Fructificación',
        targets: {
          temperature: { day: { min: 17, max: 19 }, night: { min: 16, max: 18 } },
          humidity: { min: 90, max: 94 },
          vpd: { min: 0.25, max: 0.45 },
          co2: { min: 600, max: 900 },
          fae: { ach: { min: 4, max: 8 } },
          lighting: { photoperiod: "12/12", lux: { min: 300, max: 500 } }
        }
      },
      {
        id: 'recovery',
        name: '5. Recuperación',
        targets: {
          temperature: { day: { min: 18, max: 20 }, night: { min: 18, max: 20 } },
          humidity: { min: 88, max: 92 },
          vpd: { min: 0.4, max: 0.6 },
          co2: { min: 1000, max: 1500 },
          fae: { ach: { min: 2, max: 4 } },
          lighting: { photoperiod: "8/16" }
        }
      }
    ]
  },
  fungi_ganoderma_lucidum_conk: {
    id: 'fungi_ganoderma_lucidum_conk',
    kingdom: 'FUNGI',
    scientificName: 'Ganoderma lucidum',
    commonName: 'Reishi (Sombrero / Conk)',
    description: 'Nivel de dificultad: Medio. Hongo medicinal milenario. La morfología de "sombrero" (Conk) clásico se logra aplicando una reducción drástica del CO₂ y aumentando masivamente la oxigenación (FAE) y la iluminación cuando el primordio madura.',
    phases: [
      {
        id: 'colonization',
        name: '1. Colonización',
        targets: {
          temperature: { day: { min: 24, max: 28 }, night: { min: 24, max: 28 } },
          humidity: { min: 65, max: 75 },
          vpd: { min: 0.8, max: 1.1 },
          co2: { min: 5000, max: 20000 },
          fae: { ach: { min: 0, max: 1 } },
          lighting: { photoperiod: "0/24" }
        }
      },
      {
        id: 'consolidation',
        name: '2. Consolidación',
        targets: {
          temperature: { day: { min: 23, max: 26 }, night: { min: 23, max: 26 } },
          humidity: { min: 70, max: 80 },
          vpd: { min: 0.7, max: 0.9 },
          co2: { min: 4000, max: 10000 },
          fae: { ach: { min: 1, max: 2 } },
          lighting: { photoperiod: "0/24" }
        }
      },
      {
        id: 'induction',
        name: '3. Inducción',
        targets: {
          temperature: { day: { min: 22, max: 25 }, night: { min: 21, max: 23 } },
          humidity: { min: 92, max: 95 },
          vpd: { min: 0.2, max: 0.4 },
          co2: { min: 800, max: 1200 },
          fae: { ach: { min: 4, max: 6 } },
          lighting: { photoperiod: "12/12", lux: { min: 300, max: 500 } }
        }
      },
      {
        id: 'fruiting',
        name: '4. Fructificación (Conk)',
        targets: {
          temperature: { day: { min: 22, max: 27 }, night: { min: 22, max: 27 } },
          humidity: { min: 88, max: 92 },
          vpd: { min: 0.4, max: 0.7 },
          co2: { min: 600, max: 1000 },
          fae: { ach: { min: 6, max: 8 } },
          lighting: { photoperiod: "12/12", lux: { min: 300, max: 700 } }
        }
      },
      {
        id: 'maturation',
        name: '5. Maduración',
        targets: {
          temperature: { day: { min: 22, max: 25 }, night: { min: 22, max: 25 } },
          humidity: { min: 85, max: 90 },
          vpd: { min: 0.5, max: 0.8 },
          co2: { min: 800, max: 1200 },
          fae: { ach: { min: 2, max: 4 } },
          lighting: { photoperiod: "12/12" }
        }
      }
    ]
  },
  fungi_ganoderma_lucidum_antler: {
    id: 'fungi_ganoderma_lucidum_antler',
    kingdom: 'FUNGI',
    scientificName: 'Ganoderma lucidum',
    commonName: 'Reishi (Asta / Antler)',
    description: 'Nivel de dificultad: Medio. Al mantener niveles de CO₂ excesivamente altos (>5000 ppm) y restringir la ventilación e iluminación de manera artificial, el Reishi muta su morfología creciendo en forma de "astas" o cuernos, lo cual facilita la cosecha vertical.',
    phases: [
      {
        id: 'colonization',
        name: '1. Colonización',
        targets: {
          temperature: { day: { min: 24, max: 28 }, night: { min: 24, max: 28 } },
          humidity: { min: 65, max: 75 },
          vpd: { min: 0.8, max: 1.1 },
          co2: { min: 5000, max: 20000 },
          fae: { ach: { min: 0, max: 1 } },
          lighting: { photoperiod: "0/24" }
        }
      },
      {
        id: 'consolidation',
        name: '2. Consolidación',
        targets: {
          temperature: { day: { min: 23, max: 26 }, night: { min: 23, max: 26 } },
          humidity: { min: 70, max: 80 },
          vpd: { min: 0.7, max: 0.9 },
          co2: { min: 4000, max: 10000 },
          fae: { ach: { min: 1, max: 2 } },
          lighting: { photoperiod: "0/24" }
        }
      },
      {
        id: 'induction',
        name: '3. Inducción',
        targets: {
          temperature: { day: { min: 22, max: 25 }, night: { min: 21, max: 23 } },
          humidity: { min: 92, max: 95 },
          vpd: { min: 0.2, max: 0.4 },
          co2: { min: 800, max: 1200 },
          fae: { ach: { min: 4, max: 6 } },
          lighting: { photoperiod: "12/12", lux: { min: 300, max: 500 } }
        }
      },
      {
        id: 'fruiting',
        name: '4. Fructificación (Antler)',
        targets: {
          temperature: { day: { min: 24, max: 28 }, night: { min: 24, max: 28 } },
          humidity: { min: 88, max: 92 },
          vpd: { min: 0.4, max: 0.7 },
          co2: { min: 5000, max: 15000 },
          fae: { ach: { min: 0, max: 1 } },
          lighting: { photoperiod: "12/12", lux: { min: 300, max: 500 } }
        }
      },
      {
        id: 'maturation',
        name: '5. Maduración',
        targets: {
          temperature: { day: { min: 22, max: 25 }, night: { min: 22, max: 25 } },
          humidity: { min: 85, max: 90 },
          vpd: { min: 0.5, max: 0.8 },
          co2: { min: 800, max: 1200 },
          fae: { ach: { min: 2, max: 4 } },
          lighting: { photoperiod: "12/12" }
        }
      }
    ]
  },
  fungi_lentinula_edodes: {
    id: 'fungi_lentinula_edodes',
    kingdom: 'FUNGI',
    scientificName: 'Lentinula edodes',
    commonName: 'Shiitake',
    description: 'Nivel de dificultad: Alta. Demanda paciencia y un ciclo largo. Su fase más crítica es el "browning" (maduración del bloque que genera una corteza protectora marrón) y requiere shocks físicos (golpes) o hídricos (remojo frío) para desencadenar el pinning explosivo.',
    phases: [
      {
        id: 'colonization',
        name: '1. Incubación',
        targets: {
          temperature: { day: { min: 23, max: 25 }, night: { min: 23, max: 25 } },
          humidity: { min: 65, max: 75 },
          vpd: { min: 0.7, max: 1.0 },
          co2: { min: 5000, max: 15000 },
          fae: { ach: { min: 0, max: 1 } },
          lighting: { photoperiod: "0/24" }
        }
      },
      {
        id: 'browning',
        name: '2. Maduración (Browning)',
        targets: {
          temperature: { day: { min: 18, max: 22 }, night: { min: 18, max: 20 } },
          humidity: { min: 70, max: 80 },
          vpd: { min: 0.6, max: 0.9 },
          co2: { min: 3000, max: 8000 },
          fae: { ach: { min: 1, max: 2 } },
          lighting: { photoperiod: "8/16", lux: { min: 100, max: 300 } }
        }
      },
      {
        id: 'primordia',
        name: '3. Inducción de Primordios',
        targets: {
          temperature: { day: { min: 15, max: 17 }, night: { min: 14, max: 16 } },
          humidity: { min: 92, max: 95 },
          vpd: { min: 0.2, max: 0.4 },
          co2: { min: 600, max: 900 },
          fae: { ach: { min: 4, max: 6 } },
          lighting: { photoperiod: "12/12", lux: { min: 300, max: 500 } }
        }
      },
      {
        id: 'fruiting',
        name: '4. Fructificación',
        targets: {
          temperature: { day: { min: 14, max: 18 }, night: { min: 13, max: 16 } },
          humidity: { min: 85, max: 90 },
          vpd: { min: 0.4, max: 0.7 },
          co2: { min: 600, max: 1000 },
          fae: { ach: { min: 6, max: 8 } },
          lighting: { photoperiod: "12/12", lux: { min: 300, max: 700 } }
        }
      },
      {
        id: 'recovery',
        name: '5. Recuperación (Flush)',
        targets: {
          temperature: { day: { min: 18, max: 20 }, night: { min: 18, max: 20 } },
          humidity: { min: 85, max: 90 },
          vpd: { min: 0.5, max: 0.8 },
          co2: { min: 1000, max: 2000 },
          fae: { ach: { min: 2, max: 4 } },
          lighting: { photoperiod: "8/16", lux: { min: 200, max: 200 } }
        }
      }
    ]
  },
  fungi_agaricus_bisporus: {
    id: 'fungi_agaricus_bisporus',
    kingdom: 'FUNGI',
    scientificName: 'Agaricus bisporus',
    commonName: 'Champiñón de París',
    description: 'Nivel de dificultad: Alta. Se diferencia de las especies xilófagas porque no descompone madera sino sustratos compostados y estiércol. Requiere estrictamente una capa de cobertura (casing layer) que estimule el paso micelial a fase reproductiva debido a bacterias específicas (Pseudomonas).',
    phases: [
      {
        id: 'colonization',
        name: '1. Colonización del Compost',
        targets: {
          temperature: { day: { min: 23, max: 25 }, night: { min: 23, max: 24 } },
          humidity: { min: 90, max: 95 },
          vpd: { min: 0.2, max: 0.4 },
          co2: { min: 5000, max: 10000 },
          fae: { ach: { min: 0, max: 1 } },
          lighting: { photoperiod: "0/24" }
        }
      },
      {
        id: 'casing_run',
        name: '2. Colonización de Casing',
        targets: {
          temperature: { day: { min: 22, max: 24 }, night: { min: 22, max: 24 } },
          humidity: { min: 92, max: 95 },
          vpd: { min: 0.15, max: 0.3 },
          co2: { min: 4000, max: 8000 },
          fae: { ach: { min: 1, max: 2 } },
          lighting: { photoperiod: "0/24" }
        }
      },
      {
        id: 'pinning',
        name: '3. Inducción (Pinning)',
        targets: {
          temperature: { day: { min: 17, max: 18 }, night: { min: 16, max: 17 } },
          humidity: { min: 92, max: 95 },
          vpd: { min: 0.2, max: 0.4 },
          co2: { min: 800, max: 1000 },
          fae: { ach: { min: 4, max: 6 } },
          lighting: { photoperiod: "0/24" }
        }
      },
      {
        id: 'fruiting',
        name: '4. Fructificación',
        targets: {
          temperature: { day: { min: 16, max: 18 }, night: { min: 15, max: 17 } },
          humidity: { min: 85, max: 90 },
          vpd: { min: 0.4, max: 0.7 },
          co2: { min: 800, max: 1200 },
          fae: { ach: { min: 6, max: 8 } },
          lighting: { photoperiod: "0/24" }
        }
      },
      {
        id: 'recovery',
        name: '5. Recuperación',
        targets: {
          temperature: { day: { min: 17, max: 19 }, night: { min: 17, max: 19 } },
          humidity: { min: 88, max: 92 },
          vpd: { min: 0.4, max: 0.6 },
          co2: { min: 1000, max: 2000 },
          fae: { ach: { min: 2, max: 4 } },
          lighting: { photoperiod: "0/24" }
        }
      }
    ]
  },
  plantae_solanum_lycopersicum: {
    id: 'plantae_solanum_lycopersicum',
    kingdom: 'PLANTAE',
    scientificName: 'Solanum lycopersicum',
    commonName: 'Tomate de Invernadero',
    description: 'Nivel de dificultad: Alta. El cultivo rey en los entornos de CEA industrial. Exige control termodinámico muy preciso del VPD para orquestar el "Crop Steering", inclinando la balanza metabólica de la planta hacia el crecimiento vegetativo o generativo de forma intencional.',
    phases: [
      {
        id: 'germination',
        name: '1. Germinación',
        targets: {
          temperature: { day: { min: 24, max: 26 }, night: { min: 22, max: 24 } },
          humidity: { min: 90, max: 95 },
          vpd: { min: 0.2, max: 0.4 },
          co2: { min: 400, max: 600 },
          fae: { ach: { min: 1, max: 2 } },
          lighting: { photoperiod: "16/8" },
          ppfd: { min: 120, max: 180 },
          dli: { min: 7, max: 10 },
          ec: { min: 1.2, max: 1.6 },
          ph: { min: 5.8, max: 6.2 }
        }
      },
      {
        id: 'seedling',
        name: '2. Plántula',
        targets: {
          temperature: { day: { min: 22, max: 24 }, night: { min: 18, max: 20 } },
          humidity: { min: 70, max: 80 },
          vpd: { min: 0.6, max: 0.8 },
          co2: { min: 600, max: 800 },
          fae: { ach: { min: 2, max: 4 } },
          lighting: { photoperiod: "16/8" },
          ppfd: { min: 200, max: 300 },
          dli: { min: 12, max: 18 },
          ec: { min: 1.8, max: 2.2 },
          ph: { min: 5.8, max: 6.2 }
        }
      },
      {
        id: 'vegetative',
        name: '3. Crecimiento Vegetativo',
        targets: {
          temperature: { day: { min: 22, max: 25 }, night: { min: 18, max: 19 } },
          humidity: { min: 65, max: 75 },
          vpd: { min: 0.8, max: 1.0 },
          co2: { min: 800, max: 1000 },
          fae: { ach: { min: 4, max: 6 } },
          lighting: { photoperiod: "16/8" },
          ppfd: { min: 350, max: 500 },
          dli: { min: 20, max: 30 },
          ec: { min: 2.5, max: 3.0 },
          ph: { min: 5.6, max: 6.0 }
        }
      },
      {
        id: 'flowering',
        name: '4. Floración y Cuajado',
        targets: {
          temperature: { day: { min: 21, max: 24 }, night: { min: 17, max: 19 } },
          humidity: { min: 65, max: 70 },
          vpd: { min: 1.0, max: 1.2 },
          co2: { min: 900, max: 1200 },
          fae: { ach: { min: 6, max: 8 } },
          lighting: { photoperiod: "16/8" },
          ppfd: { min: 500, max: 700 },
          dli: { min: 25, max: 35 },
          ec: { min: 2.8, max: 3.5 },
          ph: { min: 5.6, max: 6.0 }
        }
      },
      {
        id: 'fruiting',
        name: '5. Desarrollo y Maduración',
        targets: {
          temperature: { day: { min: 20, max: 24 }, night: { min: 17, max: 19 } },
          humidity: { min: 60, max: 70 },
          vpd: { min: 1.1, max: 1.4 },
          co2: { min: 900, max: 1200 },
          fae: { ach: { min: 6, max: 8 } },
          lighting: { photoperiod: "16/8" },
          ppfd: { min: 500, max: 800 },
          dli: { min: 30, max: 40 },
          ec: { min: 3.0, max: 3.8 },
          ph: { min: 5.6, max: 6.0 }
        }
      }
    ]
  },
  plantae_cannabis_sativa: {
    id: 'plantae_cannabis_sativa',
    kingdom: 'PLANTAE',
    scientificName: 'Cannabis sativa',
    commonName: 'Cultivo Indoor / CEA',
    description: 'Nivel de dificultad: Muy Alto. El perfil agnóstico medioambiental para esta planta demanda altas tasas de irradiación (DLI/PPFD) combinadas con una sintonización sub-milimétrica del Déficit de Presión de Vapor (VPD) en floración, previniendo microclimas estancados que disparen brotes de Botrytis.',
    phases: [
      {
        id: 'germination',
        name: '1. Germinación',
        targets: {
          temperature: { day: { min: 24, max: 26 }, night: { min: 22, max: 24 } },
          humidity: { min: 70, max: 80 },
          vpd: { min: 0.4, max: 0.8 },
          co2: { min: 400, max: 600 },
          fae: { ach: { min: 1, max: 2 } },
          lighting: { photoperiod: "18/6" },
          ppfd: { min: 100, max: 200 },
          dli: { min: 6, max: 12 },
          ec: { min: 0.6, max: 1.0 },
          ph: { min: 5.8, max: 6.2 }
        }
      },
      {
        id: 'seedling',
        name: '2. Plántula',
        targets: {
          temperature: { day: { min: 23, max: 25 }, night: { min: 20, max: 22 } },
          humidity: { min: 65, max: 75 },
          vpd: { min: 0.6, max: 0.9 },
          co2: { min: 600, max: 800 },
          fae: { ach: { min: 2, max: 4 } },
          lighting: { photoperiod: "18/6" },
          ppfd: { min: 200, max: 300 },
          dli: { min: 13, max: 19 },
          ec: { min: 1.0, max: 1.4 },
          ph: { min: 5.8, max: 6.2 }
        }
      },
      {
        id: 'vegetative',
        name: '3. Crecimiento Vegetativo',
        targets: {
          temperature: { day: { min: 24, max: 27 }, night: { min: 20, max: 22 } },
          humidity: { min: 60, max: 70 },
          vpd: { min: 0.9, max: 1.2 },
          co2: { min: 800, max: 1000 },
          fae: { ach: { min: 4, max: 6 } },
          lighting: { photoperiod: "18/6" },
          ppfd: { min: 400, max: 600 },
          dli: { min: 26, max: 39 },
          ec: { min: 1.5, max: 2.0 },
          ph: { min: 5.8, max: 6.2 }
        }
      },
      {
        id: 'flowering',
        name: '4. Floración',
        targets: {
          temperature: { day: { min: 22, max: 26 }, night: { min: 18, max: 21 } },
          humidity: { min: 45, max: 55 },
          vpd: { min: 1.2, max: 1.5 },
          co2: { min: 800, max: 1000 },
          fae: { ach: { min: 6, max: 8 } },
          lighting: { photoperiod: "12/12" },
          ppfd: { min: 600, max: 900 },
          dli: { min: 26, max: 39 },
          ec: { min: 1.8, max: 2.4 },
          ph: { min: 5.8, max: 6.2 }
        }
      },
      {
        id: 'maturation',
        name: '5. Maduración',
        targets: {
          temperature: { day: { min: 20, max: 24 }, night: { min: 18, max: 20 } },
          humidity: { min: 40, max: 50 },
          vpd: { min: 1.3, max: 1.6 },
          co2: { min: 400, max: 800 },
          fae: { ach: { min: 6, max: 8 } },
          lighting: { photoperiod: "12/12" },
          ppfd: { min: 500, max: 700 },
          dli: { min: 22, max: 30 },
          ec: { min: 1.8, max: 2.4 },
          ph: { min: 5.8, max: 6.2 }
        }
      }
    ]
  },
  plantae_capsicum_annuum: {
    id: 'plantae_capsicum_annuum',
    kingdom: 'PLANTAE',
    scientificName: 'Capsicum annuum',
    commonName: 'Pimiento / Chile',
    description: 'Nivel de dificultad: Medio-Alto. Primo biológico del tomate (solanácea), pero más delicado térmicamente. Requiere humedad relativa cuidadosa durante la polinización o sus flores abortarán de inmediato, además posee un sistema radicular sumamente sensible.',
    phases: [
      {
        id: 'germination',
        name: '1. Germinación',
        targets: {
          temperature: { day: { min: 25, max: 28 }, night: { min: 23, max: 25 } },
          humidity: { min: 85, max: 95 },
          vpd: { min: 0.2, max: 0.4 },
          co2: { min: 400, max: 600 },
          fae: { ach: { min: 1, max: 2 } },
          lighting: { photoperiod: "16/8" },
          ppfd: { min: 100, max: 180 },
          dli: { min: 6, max: 10 },
          ec: { min: 1.2, max: 1.5 },
          ph: { min: 5.8, max: 6.2 }
        }
      },
      {
        id: 'seedling',
        name: '2. Plántula',
        targets: {
          temperature: { day: { min: 23, max: 25 }, night: { min: 20, max: 22 } },
          humidity: { min: 70, max: 80 },
          vpd: { min: 0.6, max: 0.8 },
          co2: { min: 600, max: 800 },
          fae: { ach: { min: 2, max: 4 } },
          lighting: { photoperiod: "16/8" },
          ppfd: { min: 200, max: 300 },
          dli: { min: 12, max: 18 },
          ec: { min: 1.8, max: 2.2 },
          ph: { min: 5.8, max: 6.2 }
        }
      },
      {
        id: 'vegetative',
        name: '3. Crecimiento Vegetativo',
        targets: {
          temperature: { day: { min: 22, max: 26 }, night: { min: 18, max: 20 } },
          humidity: { min: 65, max: 75 },
          vpd: { min: 0.8, max: 1.1 },
          co2: { min: 800, max: 1000 },
          fae: { ach: { min: 4, max: 6 } },
          lighting: { photoperiod: "16/8" },
          ppfd: { min: 350, max: 500 },
          dli: { min: 20, max: 30 },
          ec: { min: 2.2, max: 2.8 },
          ph: { min: 5.6, max: 6.0 }
        }
      },
      {
        id: 'flowering',
        name: '4. Floración y Cuajado',
        targets: {
          temperature: { day: { min: 21, max: 24 }, night: { min: 18, max: 20 } },
          humidity: { min: 60, max: 70 },
          vpd: { min: 1.0, max: 1.3 },
          co2: { min: 900, max: 1200 },
          fae: { ach: { min: 6, max: 8 } },
          lighting: { photoperiod: "16/8" },
          ppfd: { min: 450, max: 650 },
          dli: { min: 25, max: 35 },
          ec: { min: 2.5, max: 3.2 },
          ph: { min: 5.6, max: 6.0 }
        }
      },
      {
        id: 'fruiting',
        name: '5. Maduración de Frutos',
        targets: {
          temperature: { day: { min: 20, max: 24 }, night: { min: 18, max: 20 } },
          humidity: { min: 60, max: 70 },
          vpd: { min: 1.1, max: 1.4 },
          co2: { min: 900, max: 1200 },
          fae: { ach: { min: 6, max: 8 } },
          lighting: { photoperiod: "16/8" },
          ppfd: { min: 500, max: 700 },
          dli: { min: 28, max: 38 },
          ec: { min: 2.8, max: 3.5 },
          ph: { min: 5.6, max: 6.0 }
        }
      }
    ]
  },
  plantae_fragaria_ananassa: {
    id: 'plantae_fragaria_ananassa',
    kingdom: 'PLANTAE',
    scientificName: 'Fragaria × ananassa',
    commonName: 'Fresa / Frutilla',
    description: 'Nivel de dificultad: Alta. Una gran exigencia termodinámica debido a que los racimos de fruta suelen colgar libremente expuestos. Cualquier descuido en la prevención de la condensación (VPD bajo sin ventilación) destruirá las frutillas rápidamente por pudrición fungosa.',
    phases: [
      {
        id: 'establishment',
        name: '1. Establecimiento',
        targets: {
          temperature: { day: { min: 20, max: 22 }, night: { min: 16, max: 18 } },
          humidity: { min: 80, max: 90 },
          vpd: { min: 0.4, max: 0.6 },
          co2: { min: 500, max: 700 },
          fae: { ach: { min: 1, max: 2 } },
          lighting: { photoperiod: "16/8" },
          ppfd: { min: 150, max: 250 },
          dli: { min: 10, max: 15 },
          ec: { min: 1.0, max: 1.4 },
          ph: { min: 5.5, max: 6.0 }
        }
      },
      {
        id: 'vegetative',
        name: '2. Vegetativo',
        targets: {
          temperature: { day: { min: 20, max: 24 }, night: { min: 16, max: 18 } },
          humidity: { min: 65, max: 75 },
          vpd: { min: 0.8, max: 1.0 },
          co2: { min: 800, max: 1000 },
          fae: { ach: { min: 2, max: 4 } },
          lighting: { photoperiod: "16/8" },
          ppfd: { min: 250, max: 400 },
          dli: { min: 18, max: 25 },
          ec: { min: 1.4, max: 1.8 },
          ph: { min: 5.5, max: 6.0 }
        }
      },
      {
        id: 'flowering',
        name: '3. Floración',
        targets: {
          temperature: { day: { min: 18, max: 22 }, night: { min: 14, max: 16 } },
          humidity: { min: 60, max: 70 },
          vpd: { min: 1.0, max: 1.2 },
          co2: { min: 900, max: 1000 },
          fae: { ach: { min: 4, max: 6 } },
          lighting: { photoperiod: "16/8" },
          ppfd: { min: 350, max: 500 },
          dli: { min: 22, max: 30 },
          ec: { min: 1.5, max: 2.0 },
          ph: { min: 5.5, max: 6.0 }
        }
      },
      {
        id: 'fruit_development',
        name: '4. Desarrollo de Frutos',
        targets: {
          temperature: { day: { min: 18, max: 22 }, night: { min: 14, max: 16 } },
          humidity: { min: 60, max: 70 },
          vpd: { min: 1.0, max: 1.3 },
          co2: { min: 900, max: 1000 },
          fae: { ach: { min: 6, max: 8 } },
          lighting: { photoperiod: "16/8" },
          ppfd: { min: 400, max: 600 },
          dli: { min: 25, max: 35 },
          ec: { min: 1.8, max: 2.2 },
          ph: { min: 5.5, max: 6.0 }
        }
      },
      {
        id: 'continuous_harvest',
        name: '5. Maduración y Cosecha Continua',
        targets: {
          temperature: { day: { min: 18, max: 22 }, night: { min: 14, max: 16 } },
          humidity: { min: 55, max: 65 },
          vpd: { min: 1.2, max: 1.4 },
          co2: { min: 800, max: 1000 },
          fae: { ach: { min: 6, max: 8 } },
          lighting: { photoperiod: "16/8" },
          ppfd: { min: 400, max: 600 },
          dli: { min: 25, max: 35 },
          ec: { min: 1.8, max: 2.2 },
          ph: { min: 5.5, max: 6.0 }
        }
      }
    ]
  },
  plantae_lactuca_sativa: {
    id: 'plantae_lactuca_sativa',
    kingdom: 'PLANTAE',
    scientificName: 'Lactuca sativa',
    commonName: 'Lechuga Hidropónica',
    description: 'Nivel de dificultad: Media. El estándar de facto en Granjas Verticales (Vertical Farming). Su calidad comercial dicta que las hojas sean firmes. Requiere ventilación de aire direccional (FAE/VPD) adecuada para prevenir el desorden de "Tip Burn" originado por deficiencia localizada de Calcio.',
    phases: [
      {
        id: 'germination',
        name: '1. Germinación',
        targets: {
          temperature: { day: { min: 20, max: 22 }, night: { min: 18, max: 20 } },
          humidity: { min: 90, max: 95 },
          vpd: { min: 0.2, max: 0.4 },
          co2: { min: 400, max: 600 },
          fae: { ach: { min: 1, max: 2 } },
          lighting: { photoperiod: "16/8" },
          ppfd: { min: 80, max: 120 },
          dli: { min: 5, max: 7 },
          ec: { min: 0.8, max: 1.0 },
          ph: { min: 5.8, max: 6.2 }
        }
      },
      {
        id: 'seedling',
        name: '2. Plántula',
        targets: {
          temperature: { day: { min: 20, max: 22 }, night: { min: 18, max: 20 } },
          humidity: { min: 75, max: 85 },
          vpd: { min: 0.5, max: 0.7 },
          co2: { min: 600, max: 800 },
          fae: { ach: { min: 2, max: 4 } },
          lighting: { photoperiod: "16/8" },
          ppfd: { min: 120, max: 180 },
          dli: { min: 8, max: 12 },
          ec: { min: 1.0, max: 1.3 },
          ph: { min: 5.8, max: 6.2 }
        }
      },
      {
        id: 'vegetative',
        name: '3. Vegetativo',
        targets: {
          temperature: { day: { min: 20, max: 24 }, night: { min: 18, max: 20 } },
          humidity: { min: 60, max: 70 },
          vpd: { min: 0.8, max: 1.0 },
          co2: { min: 800, max: 1000 },
          fae: { ach: { min: 4, max: 6 } },
          lighting: { photoperiod: "16/8" },
          ppfd: { min: 180, max: 250 },
          dli: { min: 12, max: 17 },
          ec: { min: 1.3, max: 1.7 },
          ph: { min: 5.8, max: 6.2 }
        }
      },
      {
        id: 'head_formation',
        name: '4. Formación de Cabeza',
        targets: {
          temperature: { day: { min: 18, max: 22 }, night: { min: 16, max: 18 } },
          humidity: { min: 60, max: 70 },
          vpd: { min: 0.9, max: 1.1 },
          co2: { min: 900, max: 1000 },
          fae: { ach: { min: 6, max: 8 } },
          lighting: { photoperiod: "16/8" },
          ppfd: { min: 220, max: 300 },
          dli: { min: 15, max: 20 },
          ec: { min: 1.5, max: 1.8 },
          ph: { min: 5.8, max: 6.2 }
        }
      },
      {
        id: 'harvest',
        name: '5. Cosecha',
        targets: {
          temperature: { day: { min: 18, max: 20 }, night: { min: 16, max: 18 } },
          humidity: { min: 60, max: 65 },
          vpd: { min: 1.0, max: 1.2 },
          co2: { min: 800, max: 1000 },
          fae: { ach: { min: 6, max: 8 } },
          lighting: { photoperiod: "16/8" },
          ppfd: { min: 180, max: 250 },
          dli: { min: 14, max: 18 },
          ec: { min: 1.5, max: 1.8 },
          ph: { min: 5.8, max: 6.2 }
        }
      }
    ]
  }
};

/**
 * Traduce un perfil y fase a las Reglas Matemáticas que entiende el ESP32
 */
export function generateRulesFromProfile(phase: CropPhase): ReglaTermodinamica[] {
  const rules: ReglaTermodinamica[] = [];

  // TEMPERATURA (Prioridad Diurna para el MVP, luego se puede integrar lógica NTP de Noche)
  rules.push({ var: 'TEMP', op: 'MENOR_QUE', val: phase.targets.temperature.day.min, act: 'CALEFACTOR', estado: 'ENCENDIDO' });
  rules.push({ var: 'TEMP', op: 'MAYOR_QUE', val: phase.targets.temperature.day.max, act: 'CALEFACTOR', estado: 'APAGADO' });
  
  // Refrigeración si sube demasiado
  rules.push({ var: 'TEMP', op: 'MAYOR_QUE', val: phase.targets.temperature.day.max + 1, act: 'EXTRACTOR', estado: 'ENCENDIDO' });

  // HUMEDAD
  rules.push({ var: 'HUMEDAD', op: 'MENOR_QUE', val: phase.targets.humidity.min, act: 'NIEBLA', estado: 'ENCENDIDO' });
  rules.push({ var: 'HUMEDAD', op: 'MAYOR_QUE', val: phase.targets.humidity.max, act: 'NIEBLA', estado: 'APAGADO' });

  // CO2 -> Solo encendemos extractor si hay exceso, asumiendo que no inyectamos en Fungi.
  rules.push({ var: 'CO2', op: 'MAYOR_QUE', val: phase.targets.co2.max, act: 'EXTRACTOR', estado: 'ENCENDIDO' });
  // Apagamos extractor si el CO2 bajó lo suficiente, a menos que la temperatura lo obligue a encender.
  rules.push({ var: 'CO2', op: 'MENOR_QUE', val: phase.targets.co2.min, act: 'EXTRACTOR', estado: 'APAGADO' });

  // LUZ (Fotoperiodo)
  const [lightHoursStr] = phase.targets.lighting.photoperiod.split('/');
  const lightHours = parseInt(lightHoursStr, 10);
  
  if (lightHours > 0) {
    // Ejemplo: 12 horas de luz (de 08:00 a 20:00)
    // El ESP32 encenderá la luz si HORA_DEL_DIA >= 8 y la apagará si HORA_DEL_DIA >= (8 + lightHours)
    rules.push({ var: 'HORA_DEL_DIA', op: 'MAYOR_QUE', val: 7, act: 'LUZ', estado: 'ENCENDIDO' });
    rules.push({ var: 'HORA_DEL_DIA', op: 'MAYOR_QUE', val: 7 + lightHours, act: 'LUZ', estado: 'APAGADO' });
  } else {
    // 0 horas = Apagar siempre
    rules.push({ var: 'HORA_DEL_DIA', op: 'MAYOR_QUE', val: -1, act: 'LUZ', estado: 'APAGADO' });
  }

  return rules;
}
