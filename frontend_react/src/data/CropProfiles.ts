import type { DeviceCropProfile } from '../types/cultivo';

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
  stageTips?: string;
  targets: PhaseTargets;
}

export interface CropProfile {
  id: string;
  kingdom: 'FUNGI' | 'PLANTAE';
  scientificName: string;
  commonName: string;
  description: string;
  imageUrl?: string;
  phases: CropPhase[];
}

export const CROP_PROFILES: Record<string, CropProfile> = {
  fungi_psilocybe_cubensis: {
    id: 'fungi_psilocybe_cubensis',
    kingdom: 'FUNGI',
    scientificName: 'Psilocybe cubensis',
    commonName: 'Cubensis',
    description: 'Hongo de alto valor que requiere humedad extrema en pinning.',
    phases: [
      {
        id: 'colonization',
        name: '1. Incubación / Colonización',
        targets: {
          temperature: { day: { min: 24, max: 27 }, night: { min: 24, max: 27 } },
          humidity: { min: 90, max: 95 },
          vpd: { min: 0.4, max: 0.6 },
          co2: { min: 5000, max: 10000 },
          fae: { ach: { min: 0, max: 1 } },
          lighting: { photoperiod: "0/24" }
        }
      },
      {
        id: 'primordia',
        name: '2. Inducción (Pinning)',
        targets: {
          temperature: { day: { min: 20, max: 23 }, night: { min: 20, max: 23 } },
          humidity: { min: 95, max: 99 },
          vpd: { min: 0.1, max: 0.3 },
          co2: { min: 400, max: 800 },
          fae: { ach: { min: 4, max: 6 } },
          lighting: { photoperiod: "12/12" }
        }
      },
      {
        id: 'fruiting',
        name: '3. Fructificación',
        targets: {
          temperature: { day: { min: 21, max: 24 }, night: { min: 21, max: 24 } },
          humidity: { min: 85, max: 92 },
          vpd: { min: 0.3, max: 0.5 },
          co2: { min: 400, max: 800 },
          fae: { ach: { min: 3, max: 5 } },
          lighting: { photoperiod: "12/12" }
        }
      },
      {
        id: 'recovery',
        name: '4. Descanso / Re-flush',
        targets: {
          temperature: { day: { min: 23, max: 25 }, night: { min: 23, max: 25 } },
          humidity: { min: 80, max: 85 },
          vpd: { min: 0.4, max: 0.7 },
          co2: { min: 800, max: 1500 },
          fae: { ach: { min: 1, max: 2 } },
          lighting: { photoperiod: "0/24" }
        }
      },
    ]
  },
  fungi_pleurotus_ostreatus: {
    id: 'fungi_pleurotus_ostreatus',
    kingdom: 'FUNGI',
    scientificName: 'Pleurotus ostreatus',
    commonName: 'Hongo Ostra Perla',
    description: 'Hongo ostra muy resistente, alta tasa de respiración (requiere mucho FAE).',
    phases: [
      {
        id: 'colonization',
        name: '1. Incubación / Colonización',
        targets: {
          temperature: { day: { min: 22, max: 25 }, night: { min: 22, max: 25 } },
          humidity: { min: 65, max: 80 },
          vpd: { min: 0.6, max: 1 },
          co2: { min: 4000, max: 20000 },
          fae: { ach: { min: 0, max: 1 } },
          lighting: { photoperiod: "0/24" }
        }
      },
      {
        id: 'primordia',
        name: '2. Inducción (Pinning)',
        targets: {
          temperature: { day: { min: 10, max: 15 }, night: { min: 10, max: 15 } },
          humidity: { min: 92, max: 96 },
          vpd: { min: 0.1, max: 0.3 },
          co2: { min: 500, max: 800 },
          fae: { ach: { min: 4, max: 6 } },
          lighting: { photoperiod: "12/12" }
        }
      },
      {
        id: 'fruiting',
        name: '3. Fructificación',
        targets: {
          temperature: { day: { min: 15, max: 20 }, night: { min: 15, max: 20 } },
          humidity: { min: 85, max: 90 },
          vpd: { min: 0.3, max: 0.6 },
          co2: { min: 500, max: 800 },
          fae: { ach: { min: 4, max: 8 } },
          lighting: { photoperiod: "12/12" }
        }
      },
      {
        id: 'recovery',
        name: '4. Descanso / Re-flush',
        targets: {
          temperature: { day: { min: 18, max: 22 }, night: { min: 18, max: 22 } },
          humidity: { min: 80, max: 85 },
          vpd: { min: 0.4, max: 0.7 },
          co2: { min: 800, max: 1200 },
          fae: { ach: { min: 1, max: 2 } },
          lighting: { photoperiod: "0/24" }
        }
      },
    ]
  },
  fungi_pleurotus_eryngii: {
    id: 'fungi_pleurotus_eryngii',
    kingdom: 'FUNGI',
    scientificName: 'Pleurotus eryngii',
    commonName: 'Ostra Rey',
    description: 'Produce tallos gruesos con niveles moderados de CO2 en fructificación.',
    phases: [
      {
        id: 'colonization',
        name: '1. Incubación / Colonización',
        targets: {
          temperature: { day: { min: 22, max: 25 }, night: { min: 22, max: 25 } },
          humidity: { min: 65, max: 80 },
          vpd: { min: 0.6, max: 1 },
          co2: { min: 4000, max: 20000 },
          fae: { ach: { min: 0, max: 1 } },
          lighting: { photoperiod: "0/24" }
        }
      },
      {
        id: 'primordia',
        name: '2. Inducción (Pinning)',
        targets: {
          temperature: { day: { min: 12, max: 15 }, night: { min: 12, max: 15 } },
          humidity: { min: 95, max: 98 },
          vpd: { min: 0.1, max: 0.2 },
          co2: { min: 500, max: 800 },
          fae: { ach: { min: 4, max: 6 } },
          lighting: { photoperiod: "12/12" }
        }
      },
      {
        id: 'fruiting',
        name: '3. Fructificación',
        targets: {
          temperature: { day: { min: 15, max: 18 }, night: { min: 15, max: 18 } },
          humidity: { min: 85, max: 90 },
          vpd: { min: 0.3, max: 0.5 },
          co2: { min: 800, max: 1200 },
          fae: { ach: { min: 3, max: 5 } },
          lighting: { photoperiod: "12/12" }
        }
      },
      {
        id: 'recovery',
        name: '4. Descanso / Re-flush',
        targets: {
          temperature: { day: { min: 18, max: 20 }, night: { min: 18, max: 20 } },
          humidity: { min: 80, max: 85 },
          vpd: { min: 0.4, max: 0.7 },
          co2: { min: 1000, max: 1500 },
          fae: { ach: { min: 1, max: 2 } },
          lighting: { photoperiod: "0/24" }
        }
      },
    ]
  },
  fungi_hericium_erinaceus: {
    id: 'fungi_hericium_erinaceus',
    kingdom: 'FUNGI',
    scientificName: 'Hericium erinaceus',
    commonName: 'Melena de León',
    description: 'Hongo medicinal, prefiere frío y altísima humedad sin FAE directo que seque sus espinas.',
    phases: [
      {
        id: 'colonization',
        name: '1. Incubación / Colonización',
        targets: {
          temperature: { day: { min: 21, max: 24 }, night: { min: 21, max: 24 } },
          humidity: { min: 60, max: 75 },
          vpd: { min: 0.6, max: 1.1 },
          co2: { min: 5000, max: 20000 },
          fae: { ach: { min: 0, max: 1 } },
          lighting: { photoperiod: "0/24" }
        }
      },
      {
        id: 'primordia',
        name: '2. Inducción (Pinning)',
        targets: {
          temperature: { day: { min: 10, max: 15 }, night: { min: 10, max: 15 } },
          humidity: { min: 95, max: 98 },
          vpd: { min: 0.1, max: 0.2 },
          co2: { min: 500, max: 800 },
          fae: { ach: { min: 4, max: 6 } },
          lighting: { photoperiod: "12/12" }
        }
      },
      {
        id: 'fruiting',
        name: '3. Fructificación',
        targets: {
          temperature: { day: { min: 18, max: 20 }, night: { min: 18, max: 20 } },
          humidity: { min: 85, max: 95 },
          vpd: { min: 0.2, max: 0.4 },
          co2: { min: 500, max: 1000 },
          fae: { ach: { min: 3, max: 6 } },
          lighting: { photoperiod: "12/12" }
        }
      },
      {
        id: 'recovery',
        name: '4. Descanso / Re-flush',
        targets: {
          temperature: { day: { min: 20, max: 22 }, night: { min: 20, max: 22 } },
          humidity: { min: 80, max: 85 },
          vpd: { min: 0.4, max: 0.7 },
          co2: { min: 800, max: 1500 },
          fae: { ach: { min: 1, max: 2 } },
          lighting: { photoperiod: "0/24" }
        }
      },
    ]
  },
  fungi_lentinula_edodes: {
    id: 'fungi_lentinula_edodes',
    kingdom: 'FUNGI',
    scientificName: 'Lentinula edodes',
    commonName: 'Shiitake',
    description: 'Requiere una larga fase de incubación (popcorning) y browning, seguido de un cold shock.',
    phases: [
      {
        id: 'colonization',
        name: '1. Incubación / Browning',
        targets: {
          temperature: { day: { min: 22, max: 25 }, night: { min: 22, max: 25 } },
          humidity: { min: 60, max: 70 },
          vpd: { min: 0.7, max: 1.2 },
          co2: { min: 5000, max: 10000 },
          fae: { ach: { min: 0, max: 1 } },
          lighting: { photoperiod: "0/24" }
        }
      },
      {
        id: 'primordia',
        name: '2. Inducción (Cold Shock)',
        targets: {
          temperature: { day: { min: 10, max: 15 }, night: { min: 8, max: 12 } },
          humidity: { min: 90, max: 95 },
          vpd: { min: 0.1, max: 0.3 },
          co2: { min: 400, max: 800 },
          fae: { ach: { min: 4, max: 6 } },
          lighting: { photoperiod: "12/12" }
        }
      },
      {
        id: 'fruiting',
        name: '3. Fructificación',
        targets: {
          temperature: { day: { min: 16, max: 20 }, night: { min: 14, max: 18 } },
          humidity: { min: 85, max: 90 },
          vpd: { min: 0.3, max: 0.5 },
          co2: { min: 400, max: 1000 },
          fae: { ach: { min: 3, max: 5 } },
          lighting: { photoperiod: "12/12" }
        }
      },
      {
        id: 'recovery',
        name: '4. Descanso / Secado',
        targets: {
          temperature: { day: { min: 20, max: 25 }, night: { min: 20, max: 25 } },
          humidity: { min: 60, max: 70 },
          vpd: { min: 0.8, max: 1.2 },
          co2: { min: 800, max: 1500 },
          fae: { ach: { min: 1, max: 2 } },
          lighting: { photoperiod: "0/24" }
        }
      },
    ]
  },
  fungi_agaricus_bisporus: {
    id: 'fungi_agaricus_bisporus',
    kingdom: 'FUNGI',
    scientificName: 'Agaricus bisporus',
    commonName: 'Champiñón Portobello',
    description: 'Requiere capa de cobertura (casing) e inducción al ventilar el CO2 acumulado.',
    phases: [
      {
        id: 'colonization',
        name: '1. Incubación (Spawn Run)',
        targets: {
          temperature: { day: { min: 23, max: 25 }, night: { min: 23, max: 25 } },
          humidity: { min: 90, max: 95 },
          vpd: { min: 0.2, max: 0.4 },
          co2: { min: 10000, max: 20000 },
          fae: { ach: { min: 0, max: 0 } },
          lighting: { photoperiod: "0/24" }
        }
      },
      {
        id: 'primordia',
        name: '2. Inducción (Airing)',
        targets: {
          temperature: { day: { min: 16, max: 18 }, night: { min: 16, max: 18 } },
          humidity: { min: 95, max: 98 },
          vpd: { min: 0.1, max: 0.2 },
          co2: { min: 800, max: 1200 },
          fae: { ach: { min: 4, max: 6 } },
          lighting: { photoperiod: "0/24" }
        }
      },
      {
        id: 'fruiting',
        name: '3. Fructificación',
        targets: {
          temperature: { day: { min: 17, max: 19 }, night: { min: 17, max: 19 } },
          humidity: { min: 85, max: 90 },
          vpd: { min: 0.3, max: 0.5 },
          co2: { min: 1000, max: 1500 },
          fae: { ach: { min: 3, max: 5 } },
          lighting: { photoperiod: "0/24" }
        }
      },
      {
        id: 'recovery',
        name: '4. Descanso / Re-flush',
        targets: {
          temperature: { day: { min: 20, max: 22 }, night: { min: 20, max: 22 } },
          humidity: { min: 85, max: 90 },
          vpd: { min: 0.3, max: 0.5 },
          co2: { min: 1500, max: 2500 },
          fae: { ach: { min: 1, max: 2 } },
          lighting: { photoperiod: "0/24" }
        }
      },
    ]
  },
  fungi_flammulina_velutipes: {
    id: 'fungi_flammulina_velutipes',
    kingdom: 'FUNGI',
    scientificName: 'Flammulina velutipes',
    commonName: 'Enoki',
    description: 'Cultivado en frascos, requiere CO2 extremo en fructificación para alargar tallos y mantener capelos pequeños.',
    phases: [
      {
        id: 'colonization',
        name: '1. Incubación / Colonización',
        targets: {
          temperature: { day: { min: 22, max: 24 }, night: { min: 22, max: 24 } },
          humidity: { min: 65, max: 75 },
          vpd: { min: 0.6, max: 1 },
          co2: { min: 3000, max: 5000 },
          fae: { ach: { min: 0, max: 1 } },
          lighting: { photoperiod: "0/24" }
        }
      },
      {
        id: 'primordia',
        name: '2. Inducción (Scratching)',
        targets: {
          temperature: { day: { min: 10, max: 12 }, night: { min: 10, max: 12 } },
          humidity: { min: 95, max: 98 },
          vpd: { min: 0.1, max: 0.2 },
          co2: { min: 500, max: 800 },
          fae: { ach: { min: 4, max: 6 } },
          lighting: { photoperiod: "12/12" }
        }
      },
      {
        id: 'fruiting',
        name: '3. Fructificación (Elongación)',
        targets: {
          temperature: { day: { min: 13, max: 16 }, night: { min: 13, max: 16 } },
          humidity: { min: 90, max: 95 },
          vpd: { min: 0.2, max: 0.3 },
          co2: { min: 4000, max: 6000 },
          fae: { ach: { min: 1, max: 2 } },
          lighting: { photoperiod: "0/24" }
        }
      },
      {
        id: 'recovery',
        name: '4. Descanso / Re-flush',
        targets: {
          temperature: { day: { min: 18, max: 20 }, night: { min: 18, max: 20 } },
          humidity: { min: 80, max: 85 },
          vpd: { min: 0.4, max: 0.6 },
          co2: { min: 2000, max: 3000 },
          fae: { ach: { min: 1, max: 2 } },
          lighting: { photoperiod: "0/24" }
        }
      },
    ]
  },
  fungi_ganoderma_lucidum: {
    id: 'fungi_ganoderma_lucidum',
    kingdom: 'FUNGI',
    scientificName: 'Ganoderma lucidum',
    commonName: 'Reishi',
    description: 'Prefiere calor tropical y altísimo CO2 si se buscan formas de cuerno (antler form).',
    phases: [
      {
        id: 'colonization',
        name: '1. Incubación / Colonización',
        targets: {
          temperature: { day: { min: 25, max: 28 }, night: { min: 25, max: 28 } },
          humidity: { min: 65, max: 75 },
          vpd: { min: 0.8, max: 1.2 },
          co2: { min: 5000, max: 10000 },
          fae: { ach: { min: 0, max: 1 } },
          lighting: { photoperiod: "0/24" }
        }
      },
      {
        id: 'primordia',
        name: '2. Inducción (Pinning)',
        targets: {
          temperature: { day: { min: 22, max: 25 }, night: { min: 22, max: 25 } },
          humidity: { min: 95, max: 98 },
          vpd: { min: 0.1, max: 0.2 },
          co2: { min: 800, max: 1200 },
          fae: { ach: { min: 3, max: 5 } },
          lighting: { photoperiod: "12/12" }
        }
      },
      {
        id: 'fruiting',
        name: '3. Fructificación (Conch form)',
        targets: {
          temperature: { day: { min: 24, max: 27 }, night: { min: 24, max: 27 } },
          humidity: { min: 85, max: 90 },
          vpd: { min: 0.3, max: 0.6 },
          co2: { min: 800, max: 1500 },
          fae: { ach: { min: 3, max: 5 } },
          lighting: { photoperiod: "12/12" }
        }
      },
      {
        id: 'recovery',
        name: '4. Descanso / Re-flush',
        targets: {
          temperature: { day: { min: 25, max: 28 }, night: { min: 25, max: 28 } },
          humidity: { min: 80, max: 85 },
          vpd: { min: 0.4, max: 0.7 },
          co2: { min: 1500, max: 2500 },
          fae: { ach: { min: 1, max: 2 } },
          lighting: { photoperiod: "0/24" }
        }
      },
    ]
  },
  fungi_grifola_frondosa: {
    id: 'fungi_grifola_frondosa',
    kingdom: 'FUNGI',
    scientificName: 'Grifola frondosa',
    commonName: 'Maitake',
    description: 'Hongo que requiere mucha frescura, propenso a abortar si la temperatura sube de 20C en fructificación.',
    phases: [
      {
        id: 'colonization',
        name: '1. Incubación / Colonización',
        targets: {
          temperature: { day: { min: 22, max: 25 }, night: { min: 22, max: 25 } },
          humidity: { min: 65, max: 75 },
          vpd: { min: 0.7, max: 1.1 },
          co2: { min: 5000, max: 10000 },
          fae: { ach: { min: 0, max: 1 } },
          lighting: { photoperiod: "0/24" }
        }
      },
      {
        id: 'primordia',
        name: '2. Inducción (Pinning)',
        targets: {
          temperature: { day: { min: 15, max: 18 }, night: { min: 15, max: 18 } },
          humidity: { min: 95, max: 98 },
          vpd: { min: 0.1, max: 0.2 },
          co2: { min: 500, max: 800 },
          fae: { ach: { min: 4, max: 6 } },
          lighting: { photoperiod: "12/12" }
        }
      },
      {
        id: 'fruiting',
        name: '3. Fructificación',
        targets: {
          temperature: { day: { min: 16, max: 19 }, night: { min: 16, max: 19 } },
          humidity: { min: 85, max: 90 },
          vpd: { min: 0.3, max: 0.5 },
          co2: { min: 600, max: 1000 },
          fae: { ach: { min: 3, max: 6 } },
          lighting: { photoperiod: "12/12" }
        }
      },
      {
        id: 'recovery',
        name: '4. Descanso / Re-flush',
        targets: {
          temperature: { day: { min: 20, max: 22 }, night: { min: 20, max: 22 } },
          humidity: { min: 80, max: 85 },
          vpd: { min: 0.4, max: 0.7 },
          co2: { min: 1000, max: 1500 },
          fae: { ach: { min: 1, max: 2 } },
          lighting: { photoperiod: "0/24" }
        }
      },
    ]
  },
  fungi_pleurotus_djamor: {
    id: 'fungi_pleurotus_djamor',
    kingdom: 'FUNGI',
    scientificName: 'Pleurotus djamor',
    commonName: 'Ostra Rosa',
    description: 'Variedad tropical de rápido crecimiento, amante del calor.',
    phases: [
      {
        id: 'colonization',
        name: '1. Incubación / Colonización',
        targets: {
          temperature: { day: { min: 25, max: 30 }, night: { min: 25, max: 30 } },
          humidity: { min: 70, max: 80 },
          vpd: { min: 0.6, max: 1 },
          co2: { min: 5000, max: 15000 },
          fae: { ach: { min: 0, max: 1 } },
          lighting: { photoperiod: "0/24" }
        }
      },
      {
        id: 'primordia',
        name: '2. Inducción (Pinning)',
        targets: {
          temperature: { day: { min: 20, max: 24 }, night: { min: 20, max: 24 } },
          humidity: { min: 95, max: 98 },
          vpd: { min: 0.1, max: 0.2 },
          co2: { min: 500, max: 800 },
          fae: { ach: { min: 4, max: 6 } },
          lighting: { photoperiod: "12/12" }
        }
      },
      {
        id: 'fruiting',
        name: '3. Fructificación',
        targets: {
          temperature: { day: { min: 22, max: 28 }, night: { min: 22, max: 28 } },
          humidity: { min: 85, max: 90 },
          vpd: { min: 0.3, max: 0.6 },
          co2: { min: 600, max: 900 },
          fae: { ach: { min: 4, max: 8 } },
          lighting: { photoperiod: "12/12" }
        }
      },
      {
        id: 'recovery',
        name: '4. Descanso / Re-flush',
        targets: {
          temperature: { day: { min: 25, max: 28 }, night: { min: 25, max: 28 } },
          humidity: { min: 80, max: 85 },
          vpd: { min: 0.4, max: 0.8 },
          co2: { min: 1000, max: 2000 },
          fae: { ach: { min: 1, max: 2 } },
          lighting: { photoperiod: "0/24" }
        }
      },
    ]
  },
  plantae_solanum_lycopersicum: {
    id: 'plantae_solanum_lycopersicum',
    kingdom: 'PLANTAE',
    scientificName: 'Solanum lycopersicum',
    commonName: 'Tomate de Invernadero',
    description: 'Cultivo demandante. Requiere VPD alto en floración para evitar mildiu.',
    phases: [
      {
        id: 'germination',
        name: '1. Germinación / Esquejes',
        targets: {
          temperature: { day: { min: 22, max: 26 }, night: { min: 20, max: 22 } },
          humidity: { min: 75, max: 85 },
          vpd: { min: 0.4, max: 0.6 },
          co2: { min: 400, max: 500 },
          fae: { ach: { min: 1, max: 2 } },
          lighting: { photoperiod: "18/6" }
        }
      },
      {
        id: 'vegetative',
        name: '2. Crecimiento Vegetativo',
        targets: {
          temperature: { day: { min: 22, max: 28 }, night: { min: 18, max: 22 } },
          humidity: { min: 60, max: 70 },
          vpd: { min: 0.8, max: 1 },
          co2: { min: 800, max: 1000 },
          fae: { ach: { min: 2, max: 4 } },
          lighting: { photoperiod: "16/8" }
        }
      },
      {
        id: 'flowering',
        name: '3. Floración / Cuajado',
        targets: {
          temperature: { day: { min: 20, max: 26 }, night: { min: 16, max: 20 } },
          humidity: { min: 50, max: 60 },
          vpd: { min: 1, max: 1.4 },
          co2: { min: 1000, max: 1200 },
          fae: { ach: { min: 4, max: 6 } },
          lighting: { photoperiod: "14/10" }
        }
      },
      {
        id: 'ripening',
        name: '4. Maduración / Cosecha',
        targets: {
          temperature: { day: { min: 18, max: 24 }, night: { min: 14, max: 18 } },
          humidity: { min: 40, max: 55 },
          vpd: { min: 1.2, max: 1.6 },
          co2: { min: 800, max: 1000 },
          fae: { ach: { min: 4, max: 6 } },
          lighting: { photoperiod: "12/12" }
        }
      },
    ]
  },
  plantae_cannabis_sativa: {
    id: 'plantae_cannabis_sativa',
    kingdom: 'PLANTAE',
    scientificName: 'Cannabis sativa',
    commonName: 'Cannabis (Indoor)',
    description: 'Control estricto de fotoperiodo y VPD. Extremadamente sensible a humedad en floración.',
    phases: [
      {
        id: 'germination',
        name: '1. Germinación / Clones',
        targets: {
          temperature: { day: { min: 24, max: 26 }, night: { min: 22, max: 24 } },
          humidity: { min: 75, max: 85 },
          vpd: { min: 0.4, max: 0.7 },
          co2: { min: 400, max: 600 },
          fae: { ach: { min: 1, max: 2 } },
          lighting: { photoperiod: "18/6" }
        }
      },
      {
        id: 'vegetative',
        name: '2. Crecimiento Vegetativo',
        targets: {
          temperature: { day: { min: 24, max: 28 }, night: { min: 20, max: 24 } },
          humidity: { min: 55, max: 65 },
          vpd: { min: 0.8, max: 1.1 },
          co2: { min: 1000, max: 1200 },
          fae: { ach: { min: 2, max: 5 } },
          lighting: { photoperiod: "18/6" }
        }
      },
      {
        id: 'flowering',
        name: '3. Floración',
        targets: {
          temperature: { day: { min: 22, max: 26 }, night: { min: 18, max: 22 } },
          humidity: { min: 45, max: 55 },
          vpd: { min: 1.1, max: 1.5 },
          co2: { min: 1200, max: 1500 },
          fae: { ach: { min: 4, max: 8 } },
          lighting: { photoperiod: "12/12" }
        }
      },
      {
        id: 'ripening',
        name: '4. Maduración / Lavado',
        targets: {
          temperature: { day: { min: 18, max: 23 }, night: { min: 15, max: 18 } },
          humidity: { min: 40, max: 45 },
          vpd: { min: 1.3, max: 1.7 },
          co2: { min: 1000, max: 1200 },
          fae: { ach: { min: 4, max: 8 } },
          lighting: { photoperiod: "12/12" }
        }
      },
    ]
  },
  plantae_lactuca_sativa: {
    id: 'plantae_lactuca_sativa',
    kingdom: 'PLANTAE',
    scientificName: 'Lactuca sativa',
    commonName: 'Lechuga Hidropónica',
    description: 'Cultivo de hoja rápida. No entra a floración; la maduración es el repollo final.',
    phases: [
      {
        id: 'germination',
        name: '1. Germinación (Almácigo)',
        targets: {
          temperature: { day: { min: 18, max: 22 }, night: { min: 16, max: 20 } },
          humidity: { min: 75, max: 85 },
          vpd: { min: 0.3, max: 0.5 },
          co2: { min: 400, max: 500 },
          fae: { ach: { min: 1, max: 2 } },
          lighting: { photoperiod: "18/6" }
        }
      },
      {
        id: 'vegetative',
        name: '2. Vegetativo Temprano',
        targets: {
          temperature: { day: { min: 20, max: 24 }, night: { min: 16, max: 20 } },
          humidity: { min: 60, max: 70 },
          vpd: { min: 0.7, max: 1 },
          co2: { min: 800, max: 1000 },
          fae: { ach: { min: 2, max: 4 } },
          lighting: { photoperiod: "16/8" }
        }
      },
      {
        id: 'flowering',
        name: '3. Vegetativo Avanzado',
        targets: {
          temperature: { day: { min: 20, max: 24 }, night: { min: 16, max: 20 } },
          humidity: { min: 55, max: 65 },
          vpd: { min: 0.8, max: 1.1 },
          co2: { min: 800, max: 1000 },
          fae: { ach: { min: 2, max: 4 } },
          lighting: { photoperiod: "16/8" }
        }
      },
      {
        id: 'ripening',
        name: '4. Formación de Cabeza',
        targets: {
          temperature: { day: { min: 16, max: 20 }, night: { min: 12, max: 16 } },
          humidity: { min: 50, max: 60 },
          vpd: { min: 0.8, max: 1.2 },
          co2: { min: 800, max: 1000 },
          fae: { ach: { min: 2, max: 4 } },
          lighting: { photoperiod: "14/10" }
        }
      },
    ]
  },
  plantae_capsicum_annuum: {
    id: 'plantae_capsicum_annuum',
    kingdom: 'PLANTAE',
    scientificName: 'Capsicum annuum',
    commonName: 'Pimiento / Morrón',
    description: 'Requiere temperaturas cálidas y buena luz.',
    phases: [
      {
        id: 'germination',
        name: '1. Germinación / Esquejes',
        targets: {
          temperature: { day: { min: 25, max: 28 }, night: { min: 22, max: 25 } },
          humidity: { min: 75, max: 85 },
          vpd: { min: 0.4, max: 0.7 },
          co2: { min: 400, max: 600 },
          fae: { ach: { min: 1, max: 2 } },
          lighting: { photoperiod: "16/8" }
        }
      },
      {
        id: 'vegetative',
        name: '2. Crecimiento Vegetativo',
        targets: {
          temperature: { day: { min: 22, max: 28 }, night: { min: 18, max: 22 } },
          humidity: { min: 60, max: 70 },
          vpd: { min: 0.8, max: 1.1 },
          co2: { min: 800, max: 1000 },
          fae: { ach: { min: 2, max: 4 } },
          lighting: { photoperiod: "16/8" }
        }
      },
      {
        id: 'flowering',
        name: '3. Floración / Cuajado',
        targets: {
          temperature: { day: { min: 22, max: 26 }, night: { min: 18, max: 20 } },
          humidity: { min: 50, max: 60 },
          vpd: { min: 1, max: 1.3 },
          co2: { min: 1000, max: 1200 },
          fae: { ach: { min: 3, max: 5 } },
          lighting: { photoperiod: "14/10" }
        }
      },
      {
        id: 'ripening',
        name: '4. Maduración',
        targets: {
          temperature: { day: { min: 20, max: 25 }, night: { min: 16, max: 18 } },
          humidity: { min: 45, max: 55 },
          vpd: { min: 1.1, max: 1.5 },
          co2: { min: 800, max: 1000 },
          fae: { ach: { min: 3, max: 5 } },
          lighting: { photoperiod: "12/12" }
        }
      },
    ]
  },
  plantae_fragaria_ananassa: {
    id: 'plantae_fragaria_ananassa',
    kingdom: 'PLANTAE',
    scientificName: 'Fragaria × ananassa',
    commonName: 'Fresa / Frutilla',
    description: 'Propenso a la botritis. Humedad estricta en floración.',
    phases: [
      {
        id: 'germination',
        name: '1. Propagación (Estolones)',
        targets: {
          temperature: { day: { min: 20, max: 24 }, night: { min: 16, max: 20 } },
          humidity: { min: 80, max: 90 },
          vpd: { min: 0.3, max: 0.5 },
          co2: { min: 400, max: 600 },
          fae: { ach: { min: 1, max: 2 } },
          lighting: { photoperiod: "16/8" }
        }
      },
      {
        id: 'vegetative',
        name: '2. Crecimiento Vegetativo',
        targets: {
          temperature: { day: { min: 20, max: 25 }, night: { min: 12, max: 16 } },
          humidity: { min: 65, max: 75 },
          vpd: { min: 0.6, max: 0.9 },
          co2: { min: 800, max: 1000 },
          fae: { ach: { min: 2, max: 4 } },
          lighting: { photoperiod: "16/8" }
        }
      },
      {
        id: 'flowering',
        name: '3. Floración',
        targets: {
          temperature: { day: { min: 18, max: 22 }, night: { min: 10, max: 14 } },
          humidity: { min: 55, max: 65 },
          vpd: { min: 0.8, max: 1.2 },
          co2: { min: 1000, max: 1200 },
          fae: { ach: { min: 3, max: 5 } },
          lighting: { photoperiod: "14/10" }
        }
      },
      {
        id: 'ripening',
        name: '4. Fructificación / Maduración',
        targets: {
          temperature: { day: { min: 16, max: 20 }, night: { min: 10, max: 12 } },
          humidity: { min: 50, max: 60 },
          vpd: { min: 0.9, max: 1.3 },
          co2: { min: 800, max: 1000 },
          fae: { ach: { min: 3, max: 5 } },
          lighting: { photoperiod: "12/12" }
        }
      },
    ]
  },
  plantae_cucumis_sativus: {
    id: 'plantae_cucumis_sativus',
    kingdom: 'PLANTAE',
    scientificName: 'Cucumis sativus',
    commonName: 'Pepino de Invernadero',
    description: 'Crecimiento extremadamente rápido, alta demanda de humedad ambiental comparado al tomate.',
    phases: [
      {
        id: 'germination',
        name: '1. Germinación / Plántula',
        targets: {
          temperature: { day: { min: 25, max: 28 }, night: { min: 22, max: 25 } },
          humidity: { min: 80, max: 85 },
          vpd: { min: 0.3, max: 0.5 },
          co2: { min: 400, max: 600 },
          fae: { ach: { min: 1, max: 2 } },
          lighting: { photoperiod: "16/8" }
        }
      },
      {
        id: 'vegetative',
        name: '2. Vegetativo',
        targets: {
          temperature: { day: { min: 24, max: 28 }, night: { min: 20, max: 22 } },
          humidity: { min: 70, max: 80 },
          vpd: { min: 0.6, max: 0.9 },
          co2: { min: 1000, max: 1200 },
          fae: { ach: { min: 2, max: 4 } },
          lighting: { photoperiod: "16/8" }
        }
      },
      {
        id: 'flowering',
        name: '3. Floración (Flores Femeninas)',
        targets: {
          temperature: { day: { min: 22, max: 26 }, night: { min: 18, max: 20 } },
          humidity: { min: 65, max: 75 },
          vpd: { min: 0.8, max: 1.1 },
          co2: { min: 1200, max: 1500 },
          fae: { ach: { min: 3, max: 5 } },
          lighting: { photoperiod: "14/10" }
        }
      },
      {
        id: 'ripening',
        name: '4. Engorde de Fruto',
        targets: {
          temperature: { day: { min: 20, max: 24 }, night: { min: 18, max: 20 } },
          humidity: { min: 60, max: 70 },
          vpd: { min: 0.9, max: 1.2 },
          co2: { min: 1000, max: 1200 },
          fae: { ach: { min: 3, max: 5 } },
          lighting: { photoperiod: "12/12" }
        }
      },
    ]
  },
  plantae_ocimum_basilicum: {
    id: 'plantae_ocimum_basilicum',
    kingdom: 'PLANTAE',
    scientificName: 'Ocimum basilicum',
    commonName: 'Albahaca Dulce',
    description: 'Evitar temperaturas menores a 10C. Se cosecha antes de floración.',
    phases: [
      {
        id: 'germination',
        name: '1. Germinación',
        targets: {
          temperature: { day: { min: 24, max: 26 }, night: { min: 20, max: 22 } },
          humidity: { min: 75, max: 85 },
          vpd: { min: 0.4, max: 0.6 },
          co2: { min: 400, max: 600 },
          fae: { ach: { min: 1, max: 2 } },
          lighting: { photoperiod: "16/8" }
        }
      },
      {
        id: 'vegetative',
        name: '2. Crecimiento Inicial',
        targets: {
          temperature: { day: { min: 24, max: 28 }, night: { min: 20, max: 22 } },
          humidity: { min: 60, max: 70 },
          vpd: { min: 0.8, max: 1 },
          co2: { min: 800, max: 1000 },
          fae: { ach: { min: 2, max: 4 } },
          lighting: { photoperiod: "18/6" }
        }
      },
      {
        id: 'flowering',
        name: '3. Crecimiento Maduro',
        targets: {
          temperature: { day: { min: 24, max: 28 }, night: { min: 20, max: 22 } },
          humidity: { min: 55, max: 65 },
          vpd: { min: 0.9, max: 1.2 },
          co2: { min: 800, max: 1200 },
          fae: { ach: { min: 2, max: 4 } },
          lighting: { photoperiod: "18/6" }
        }
      },
      {
        id: 'ripening',
        name: '4. Acumulación Aceites (Pre-cosecha)',
        targets: {
          temperature: { day: { min: 22, max: 26 }, night: { min: 18, max: 20 } },
          humidity: { min: 50, max: 60 },
          vpd: { min: 1, max: 1.3 },
          co2: { min: 800, max: 1000 },
          fae: { ach: { min: 2, max: 4 } },
          lighting: { photoperiod: "16/8" }
        }
      },
    ]
  },
  plantae_spinacia_oleracea: {
    id: 'plantae_spinacia_oleracea',
    kingdom: 'PLANTAE',
    scientificName: 'Spinacia oleracea',
    commonName: 'Espinaca',
    description: 'Cultivo de clima frío. Espiga rápidamente con fotoperiodos largos y calor.',
    phases: [
      {
        id: 'germination',
        name: '1. Germinación',
        targets: {
          temperature: { day: { min: 15, max: 18 }, night: { min: 10, max: 14 } },
          humidity: { min: 75, max: 85 },
          vpd: { min: 0.3, max: 0.5 },
          co2: { min: 400, max: 500 },
          fae: { ach: { min: 1, max: 2 } },
          lighting: { photoperiod: "12/12" }
        }
      },
      {
        id: 'vegetative',
        name: '2. Plántula',
        targets: {
          temperature: { day: { min: 16, max: 20 }, night: { min: 12, max: 16 } },
          humidity: { min: 65, max: 75 },
          vpd: { min: 0.5, max: 0.8 },
          co2: { min: 800, max: 1000 },
          fae: { ach: { min: 2, max: 4 } },
          lighting: { photoperiod: "12/12" }
        }
      },
      {
        id: 'flowering',
        name: '3. Desarrollo Foliar',
        targets: {
          temperature: { day: { min: 16, max: 20 }, night: { min: 12, max: 16 } },
          humidity: { min: 60, max: 70 },
          vpd: { min: 0.6, max: 0.9 },
          co2: { min: 800, max: 1000 },
          fae: { ach: { min: 2, max: 4 } },
          lighting: { photoperiod: "12/12" }
        }
      },
      {
        id: 'ripening',
        name: '4. Maduración (Cosecha)',
        targets: {
          temperature: { day: { min: 14, max: 18 }, night: { min: 8, max: 12 } },
          humidity: { min: 55, max: 65 },
          vpd: { min: 0.7, max: 1 },
          co2: { min: 600, max: 800 },
          fae: { ach: { min: 2, max: 4 } },
          lighting: { photoperiod: "10/14" }
        }
      },
    ]
  },
  plantae_solanum_melongena: {
    id: 'plantae_solanum_melongena',
    kingdom: 'PLANTAE',
    scientificName: 'Solanum melongena',
    commonName: 'Berenjena',
    description: 'Similar al tomate, pero requiere aún más calor.',
    phases: [
      {
        id: 'germination',
        name: '1. Germinación / Esquejes',
        targets: {
          temperature: { day: { min: 25, max: 30 }, night: { min: 22, max: 25 } },
          humidity: { min: 75, max: 85 },
          vpd: { min: 0.4, max: 0.7 },
          co2: { min: 400, max: 600 },
          fae: { ach: { min: 1, max: 2 } },
          lighting: { photoperiod: "16/8" }
        }
      },
      {
        id: 'vegetative',
        name: '2. Vegetativo',
        targets: {
          temperature: { day: { min: 24, max: 29 }, night: { min: 20, max: 24 } },
          humidity: { min: 60, max: 70 },
          vpd: { min: 0.9, max: 1.2 },
          co2: { min: 800, max: 1000 },
          fae: { ach: { min: 2, max: 4 } },
          lighting: { photoperiod: "16/8" }
        }
      },
      {
        id: 'flowering',
        name: '3. Floración',
        targets: {
          temperature: { day: { min: 24, max: 28 }, night: { min: 18, max: 22 } },
          humidity: { min: 55, max: 65 },
          vpd: { min: 1, max: 1.3 },
          co2: { min: 1000, max: 1200 },
          fae: { ach: { min: 3, max: 5 } },
          lighting: { photoperiod: "14/10" }
        }
      },
      {
        id: 'ripening',
        name: '4. Maduración',
        targets: {
          temperature: { day: { min: 22, max: 26 }, night: { min: 18, max: 20 } },
          humidity: { min: 50, max: 60 },
          vpd: { min: 1.1, max: 1.4 },
          co2: { min: 800, max: 1000 },
          fae: { ach: { min: 3, max: 5 } },
          lighting: { photoperiod: "12/12" }
        }
      },
    ]
  },
  plantae_mentha_spicata: {
    id: 'plantae_mentha_spicata',
    kingdom: 'PLANTAE',
    scientificName: 'Mentha spicata',
    commonName: 'Menta',
    description: 'Planta aromática perenne, rápido crecimiento.',
    phases: [
      {
        id: 'germination',
        name: '1. Enraizamiento Clones',
        targets: {
          temperature: { day: { min: 20, max: 24 }, night: { min: 18, max: 20 } },
          humidity: { min: 80, max: 90 },
          vpd: { min: 0.3, max: 0.5 },
          co2: { min: 400, max: 500 },
          fae: { ach: { min: 1, max: 2 } },
          lighting: { photoperiod: "18/6" }
        }
      },
      {
        id: 'vegetative',
        name: '2. Vegetativo Inicial',
        targets: {
          temperature: { day: { min: 22, max: 26 }, night: { min: 18, max: 22 } },
          humidity: { min: 65, max: 75 },
          vpd: { min: 0.7, max: 1 },
          co2: { min: 800, max: 1000 },
          fae: { ach: { min: 2, max: 4 } },
          lighting: { photoperiod: "18/6" }
        }
      },
      {
        id: 'flowering',
        name: '3. Desarrollo de Biomasa',
        targets: {
          temperature: { day: { min: 22, max: 26 }, night: { min: 18, max: 22 } },
          humidity: { min: 60, max: 70 },
          vpd: { min: 0.8, max: 1.1 },
          co2: { min: 800, max: 1000 },
          fae: { ach: { min: 2, max: 4 } },
          lighting: { photoperiod: "16/8" }
        }
      },
      {
        id: 'ripening',
        name: '4. Estrés Pre-cosecha (Terpenos)',
        targets: {
          temperature: { day: { min: 18, max: 22 }, night: { min: 14, max: 18 } },
          humidity: { min: 50, max: 60 },
          vpd: { min: 0.9, max: 1.3 },
          co2: { min: 600, max: 800 },
          fae: { ach: { min: 2, max: 4 } },
          lighting: { photoperiod: "14/10" }
        }
      },
    ]
  },
};

/**
 * Traduce un perfil y fase a las Reglas de Hardware que entiende el ESP32
 */
export const generateDeviceProfile = (phase: CropPhase): DeviceCropProfile => {
  const [lightHoursStr] = phase.targets.lighting.photoperiod.split('/');
  const lightHours = parseInt(lightHoursStr, 10);
  
  // Extraemos o definimos valores por defecto en caso de no existir
  const tempIdealMin = phase.targets.temperature.day.min;
  const tempIdealMax = phase.targets.temperature.day.max;
  
  // Limites criticos: si no están explícitos, los estimamos
  const tempCritMin = tempIdealMin - 5;
  const tempCritMax = tempIdealMax + 5;
  
  const humIdealMin = phase.targets.humidity.min;
  const humIdealMax = phase.targets.humidity.max;
  const humCritMin = Math.max(0, humIdealMin - 15);
  
  const co2IdealMin = phase.targets.co2.min;
  const co2IdealMax = phase.targets.co2.max;
  const co2CritMax = co2IdealMax + (co2IdealMax * 0.5); // 50% extra como limite crítico

  return {
      temp_ideal_min: tempIdealMin,
      temp_ideal_max: tempIdealMax,
      temp_crit_min: tempCritMin,
      temp_crit_max: tempCritMax,
      hum_ideal_min: humIdealMin,
      hum_ideal_max: humIdealMax,
      hum_crit_min: humCritMin,
      co2_ideal_min: co2IdealMin || 400,
      co2_ideal_max: co2IdealMax,
      co2_crit_max: co2CritMax,
      light_hours_on: lightHours > 0 ? lightHours : 0
  };
};

export const getCustomProfiles = (): Record<string, CropProfile> => {
  const saved = localStorage.getItem('CUSTOM_PROFILES');
  if (!saved) return {};

  try {
    const customProfiles = JSON.parse(saved);
    let migrated = false;
    
    for (const key in customProfiles) {
      const profile = customProfiles[key];
      if (profile.phases && profile.phases.length === 5) {
        profile.phases.splice(1, 1); // Remover Consolidación antigua
        migrated = true;
        profile.phases.forEach((p: any, index: number) => {
           const cleanName = p.name.replace(/^\d+\.\s*/, '');
           p.name = `${index + 1}. ${cleanName}`;
        });
      }
    }

    if (migrated) {
      localStorage.setItem('CUSTOM_PROFILES', JSON.stringify(customProfiles));
      console.log('Perfiles personalizados migrados a 4 fases automáticamente.');
    }
    return customProfiles;
  } catch (e) {
    console.error('Error parsing custom profiles', e);
    return {};
  }
};

export const getAllProfiles = (): Record<string, CropProfile> => {
  return { ...CROP_PROFILES, ...getCustomProfiles() };
};
