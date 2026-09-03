import type { DeviceCropProfile } from '../types/cultivo';

export interface PhaseTargets {
  temperature: {
    day: { min: number; max: number };
    night: { min: number; max: number };
    substrate?: { min: number; max: number };
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
  soilMoisture?: { min: number; max: number };
}

export interface CropPhase {
  id: string;
  name: string;
  duration_days?: number;
  transition_hours?: number;
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
        duration_days: 14,
        targets: {
          temperature: { day: { min: 21, max: 24 }, night: { min: 21, max: 24 }, substrate: { min: 24, max: 28 } },
          humidity: { min: 95, max: 100 },
          vpd: { min: 0.4, max: 0.6 },
          co2: { min: 5000, max: 10000 },
          fae: { ach: { min: 0, max: 1 } },
          lighting: { photoperiod: "0/24" }
        }
      },
      {
        id: 'primordia',
        name: '2. Inducción (Pinning)',
        duration_days: 5,
        targets: {
          temperature: { day: { min: 20, max: 22 }, night: { min: 20, max: 22 }, substrate: { min: 21, max: 23 } },
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
        duration_days: 7,
        targets: {
          temperature: { day: { min: 22, max: 25 }, night: { min: 22, max: 25 }, substrate: { min: 23, max: 26 } },
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
        duration_days: 8,
        targets: {
          temperature: { day: { min: 20, max: 22 }, night: { min: 20, max: 22 }, substrate: { min: 21, max: 23 } },
          humidity: { min: 85, max: 90 },
          vpd: { min: 0.4, max: 0.7 },
          co2: { min: 800, max: 1500 },
          fae: { ach: { min: 1, max: 2 } },
          lighting: { photoperiod: "12/12" }
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
            name: 'Incubación',
            duration_days: 14,
            transition_hours: 24,
            targets: {
              temperature: {
                day: { min: 23, max: 25 },
                night: { min: 23, max: 25 },
                substrate: { min: 25, max: 28 }
              },
              humidity: { min: 90, max: 100 },
              vpd: { min: 0.8, max: 1.2 },
              co2: { min: 5000, max: 20000 },
              fae: { ach: { min: 2, max: 4 } },
              lighting: {
                photoperiod: '0/24'
              }
            }
          },
          {
            id: 'pinning',
            name: 'Pinning',
            duration_days: 5,
            transition_hours: 24,
            targets: {
              temperature: {
                day: { min: 10, max: 15 },
                night: { min: 10, max: 15 },
                substrate: { min: 12, max: 17 }
              },
              humidity: { min: 95, max: 100 },
              vpd: { min: 0.8, max: 1.2 },
              co2: { min: 400, max: 800 },
              fae: { ach: { min: 2, max: 4 } },
              lighting: {
                photoperiod: '12/12'
              }
            }
          },
          {
            id: 'fruiting',
            name: 'Fructificación',
            duration_days: 6,
            transition_hours: 24,
            targets: {
              temperature: {
                day: { min: 15, max: 20 },
                night: { min: 14, max: 18 },
                substrate: { min: 16, max: 21 }
              },
              humidity: { min: 85, max: 90 },
              vpd: { min: 0.8, max: 1.2 },
              co2: { min: 400, max: 800 },
              fae: { ach: { min: 2, max: 4 } },
              lighting: {
                photoperiod: '12/12'
              }
            }
          },
          {
            id: 'recovery',
            name: 'Descanso',
            duration_days: 8,
            transition_hours: 24,
            targets: {
              temperature: {
                day: { min: 20, max: 24 },
                night: { min: 20, max: 24 },
                substrate: { min: 22, max: 26 }
              },
              humidity: { min: 85, max: 95 },
              vpd: { min: 0.8, max: 1.2 },
              co2: { min: 2000, max: 5000 },
              fae: { ach: { min: 2, max: 4 } },
              lighting: {
                photoperiod: '0/24'
              }
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
            name: 'Incubación',
            duration_days: 14,
            transition_hours: 24,
            targets: {
              temperature: {
                day: { min: 21, max: 24 },
                night: { min: 21, max: 24 },
                substrate: { min: 23, max: 26 }
              },
              humidity: { min: 90, max: 100 },
              vpd: { min: 0.8, max: 1.2 },
              co2: { min: 5000, max: 20000 },
              fae: { ach: { min: 2, max: 4 } },
              lighting: {
                photoperiod: '0/24'
              }
            }
          },
          {
            id: 'pinning',
            name: 'Pinning',
            duration_days: 5,
            transition_hours: 24,
            targets: {
              temperature: {
                day: { min: 10, max: 15 },
                night: { min: 10, max: 15 },
                substrate: { min: 12, max: 16 }
              },
              humidity: { min: 95, max: 100 },
              vpd: { min: 0.8, max: 1.2 },
              co2: { min: 500, max: 1000 },
              fae: { ach: { min: 2, max: 4 } },
              lighting: {
                photoperiod: '12/12'
              }
            }
          },
          {
            id: 'fruiting',
            name: 'Fructificación',
            duration_days: 7,
            transition_hours: 24,
            targets: {
              temperature: {
                day: { min: 15, max: 21 },
                night: { min: 15, max: 21 },
                substrate: { min: 16, max: 22 }
              },
              humidity: { min: 85, max: 90 },
              vpd: { min: 0.8, max: 1.2 },
              co2: { min: 1000, max: 2000 },
              fae: { ach: { min: 2, max: 4 } },
              lighting: {
                photoperiod: '12/12'
              }
            }
          },
          {
            id: 'recovery',
            name: 'Descanso',
            duration_days: 9,
            transition_hours: 24,
            targets: {
              temperature: {
                day: { min: 21, max: 24 },
                night: { min: 21, max: 24 },
                substrate: { min: 23, max: 26 }
              },
              humidity: { min: 90, max: 95 },
              vpd: { min: 0.8, max: 1.2 },
              co2: { min: 2000, max: 5000 },
              fae: { ach: { min: 2, max: 4 } },
              lighting: {
                photoperiod: '0/24'
              }
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
            name: 'Incubación',
            duration_days: 14,
            transition_hours: 24,
            targets: {
              temperature: {
                day: { min: 21, max: 24 },
                night: { min: 21, max: 24 },
                substrate: { min: 23, max: 26 }
              },
              humidity: { min: 90, max: 100 },
              vpd: { min: 0.8, max: 1.2 },
              co2: { min: 5000, max: 40000 },
              fae: { ach: { min: 2, max: 4 } },
              lighting: {
                photoperiod: '0/24'
              }
            }
          },
          {
            id: 'pinning',
            name: 'Pinning',
            duration_days: 5,
            transition_hours: 24,
            targets: {
              temperature: {
                day: { min: 10, max: 15 },
                night: { min: 10, max: 15 },
                substrate: { min: 12, max: 16 }
              },
              humidity: { min: 95, max: 100 },
              vpd: { min: 0.8, max: 1.2 },
              co2: { min: 500, max: 1000 },
              fae: { ach: { min: 2, max: 4 } },
              lighting: {
                photoperiod: '12/12'
              }
            }
          },
          {
            id: 'fruiting',
            name: 'Fructificación',
            duration_days: 7,
            transition_hours: 24,
            targets: {
              temperature: {
                day: { min: 18, max: 24 },
                night: { min: 18, max: 24 },
                substrate: { min: 19, max: 25 }
              },
              humidity: { min: 85, max: 90 },
              vpd: { min: 0.8, max: 1.2 },
              co2: { min: 500, max: 1000 },
              fae: { ach: { min: 2, max: 4 } },
              lighting: {
                photoperiod: '12/12'
              }
            }
          },
          {
            id: 'recovery',
            name: 'Descanso',
            duration_days: 8,
            transition_hours: 24,
            targets: {
              temperature: {
                day: { min: 21, max: 24 },
                night: { min: 21, max: 24 },
                substrate: { min: 23, max: 26 }
              },
              humidity: { min: 90, max: 95 },
              vpd: { min: 0.8, max: 1.2 },
              co2: { min: 2000, max: 5000 },
              fae: { ach: { min: 2, max: 4 } },
              lighting: {
                photoperiod: '0/24'
              }
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
            name: 'Incubación',
            duration_days: 45,
            transition_hours: 24,
            targets: {
              temperature: {
                day: { min: 21, max: 25 },
                night: { min: 21, max: 25 },
                substrate: { min: 23, max: 27 }
              },
              humidity: { min: 85, max: 95 },
              vpd: { min: 0.8, max: 1.2 },
              co2: { min: 10000, max: 20000 },
              fae: { ach: { min: 2, max: 4 } },
              lighting: {
                photoperiod: '12/12'
              }
            }
          },
          {
            id: 'pinning',
            name: 'Pinning',
            duration_days: 5,
            transition_hours: 24,
            targets: {
              temperature: {
                day: { min: 15, max: 18 },
                night: { min: 10, max: 12 },
                substrate: { min: 12, max: 18 }
              },
              humidity: { min: 95, max: 100 },
              vpd: { min: 0.8, max: 1.2 },
              co2: { min: 400, max: 1000 },
              fae: { ach: { min: 2, max: 4 } },
              lighting: {
                photoperiod: '12/12'
              }
            }
          },
          {
            id: 'fruiting',
            name: 'Fructificación',
            duration_days: 10,
            transition_hours: 24,
            targets: {
              temperature: {
                day: { min: 16, max: 20 },
                night: { min: 12, max: 15 },
                substrate: { min: 14, max: 21 }
              },
              humidity: { min: 60, max: 80 },
              vpd: { min: 0.8, max: 1.2 },
              co2: { min: 400, max: 1000 },
              fae: { ach: { min: 2, max: 4 } },
              lighting: {
                photoperiod: '12/12'
              }
            }
          },
          {
            id: 'recovery',
            name: 'Descanso',
            duration_days: 15,
            transition_hours: 24,
            targets: {
              temperature: {
                day: { min: 21, max: 25 },
                night: { min: 21, max: 25 },
                substrate: { min: 22, max: 26 }
              },
              humidity: { min: 70, max: 80 },
              vpd: { min: 0.8, max: 1.2 },
              co2: { min: 2000, max: 5000 },
              fae: { ach: { min: 2, max: 4 } },
              lighting: {
                photoperiod: '0/24'
              }
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
            name: 'Incubación',
            duration_days: 18,
            transition_hours: 24,
            targets: {
              temperature: {
                day: { min: 23, max: 24 },
                night: { min: 23, max: 24 },
                substrate: { min: 25, max: 27 }
              },
              humidity: { min: 90, max: 100 },
              vpd: { min: 0.8, max: 1.2 },
              co2: { min: 10000, max: 20000 },
              fae: { ach: { min: 2, max: 4 } },
              lighting: {
                photoperiod: '0/24'
              }
            }
          },
          {
            id: 'pinning',
            name: 'Pinning',
            duration_days: 8,
            transition_hours: 24,
            targets: {
              temperature: {
                day: { min: 16, max: 18 },
                night: { min: 16, max: 18 },
                substrate: { min: 18, max: 20 }
              },
              humidity: { min: 95, max: 100 },
              vpd: { min: 0.8, max: 1.2 },
              co2: { min: 1000, max: 2000 },
              fae: { ach: { min: 2, max: 4 } },
              lighting: {
                photoperiod: '0/24'
              }
            }
          },
          {
            id: 'fruiting',
            name: 'Fructificación',
            duration_days: 8,
            transition_hours: 24,
            targets: {
              temperature: {
                day: { min: 16, max: 18 },
                night: { min: 16, max: 18 },
                substrate: { min: 18, max: 20 }
              },
              humidity: { min: 85, max: 90 },
              vpd: { min: 0.8, max: 1.2 },
              co2: { min: 1000, max: 2000 },
              fae: { ach: { min: 2, max: 4 } },
              lighting: {
                photoperiod: '0/24'
              }
            }
          },
          {
            id: 'recovery',
            name: 'Descanso',
            duration_days: 7,
            transition_hours: 24,
            targets: {
              temperature: {
                day: { min: 20, max: 22 },
                night: { min: 20, max: 22 },
                substrate: { min: 22, max: 24 }
              },
              humidity: { min: 90, max: 95 },
              vpd: { min: 0.8, max: 1.2 },
              co2: { min: 2000, max: 5000 },
              fae: { ach: { min: 2, max: 4 } },
              lighting: {
                photoperiod: '0/24'
              }
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
            name: 'Incubación',
            duration_days: 25,
            transition_hours: 24,
            targets: {
              temperature: {
                day: { min: 22, max: 25 },
                night: { min: 22, max: 25 },
                substrate: { min: 24, max: 27 }
              },
              humidity: { min: 90, max: 100 },
              vpd: { min: 0.8, max: 1.2 },
              co2: { min: 5000, max: 10000 },
              fae: { ach: { min: 2, max: 4 } },
              lighting: {
                photoperiod: '0/24'
              }
            }
          },
          {
            id: 'pinning',
            name: 'Pinning',
            duration_days: 8,
            transition_hours: 24,
            targets: {
              temperature: {
                day: { min: 10, max: 12 },
                night: { min: 10, max: 12 },
                substrate: { min: 12, max: 14 }
              },
              humidity: { min: 95, max: 100 },
              vpd: { min: 0.8, max: 1.2 },
              co2: { min: 400, max: 1000 },
              fae: { ach: { min: 2, max: 4 } },
              lighting: {
                photoperiod: '0/24'
              }
            }
          },
          {
            id: 'fruiting',
            name: 'Fructificación',
            duration_days: 18,
            transition_hours: 24,
            targets: {
              temperature: {
                day: { min: 10, max: 15 },
                night: { min: 10, max: 15 },
                substrate: { min: 12, max: 16 }
              },
              humidity: { min: 75, max: 80 },
              vpd: { min: 0.8, max: 1.2 },
              co2: { min: 2000, max: 4000 },
              fae: { ach: { min: 2, max: 4 } },
              lighting: {
                photoperiod: '0/24'
              }
            }
          },
          {
            id: 'recovery',
            name: 'Descanso',
            duration_days: 10,
            transition_hours: 24,
            targets: {
              temperature: {
                day: { min: 20, max: 22 },
                night: { min: 20, max: 22 },
                substrate: { min: 22, max: 24 }
              },
              humidity: { min: 90, max: 95 },
              vpd: { min: 0.8, max: 1.2 },
              co2: { min: 2000, max: 5000 },
              fae: { ach: { min: 2, max: 4 } },
              lighting: {
                photoperiod: '0/24'
              }
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
            name: 'Incubación',
            duration_days: 18,
            transition_hours: 24,
            targets: {
              temperature: {
                day: { min: 21, max: 27 },
                night: { min: 21, max: 27 },
                substrate: { min: 24, max: 29 }
              },
              humidity: { min: 90, max: 100 },
              vpd: { min: 0.8, max: 1.2 },
              co2: { min: 10000, max: 40000 },
              fae: { ach: { min: 2, max: 4 } },
              lighting: {
                photoperiod: '0/24'
              }
            }
          },
          {
            id: 'pinning',
            name: 'Pinning',
            duration_days: 10,
            transition_hours: 24,
            targets: {
              temperature: {
                day: { min: 21, max: 27 },
                night: { min: 21, max: 27 },
                substrate: { min: 24, max: 29 }
              },
              humidity: { min: 95, max: 100 },
              vpd: { min: 0.8, max: 1.2 },
              co2: { min: 2000, max: 5000 },
              fae: { ach: { min: 2, max: 4 } },
              lighting: {
                photoperiod: '12/12'
              }
            }
          },
          {
            id: 'fruiting',
            name: 'Fructificación',
            duration_days: 45,
            transition_hours: 24,
            targets: {
              temperature: {
                day: { min: 21, max: 27 },
                night: { min: 21, max: 27 },
                substrate: { min: 24, max: 29 }
              },
              humidity: { min: 85, max: 90 },
              vpd: { min: 0.8, max: 1.2 },
              co2: { min: 400, max: 2000 },
              fae: { ach: { min: 2, max: 4 } },
              lighting: {
                photoperiod: '12/12'
              }
            }
          },
          {
            id: 'recovery',
            name: 'Descanso',
            duration_days: 15,
            transition_hours: 24,
            targets: {
              temperature: {
                day: { min: 24, max: 27 },
                night: { min: 24, max: 27 },
                substrate: { min: 25, max: 29 }
              },
              humidity: { min: 90, max: 95 },
              vpd: { min: 0.8, max: 1.2 },
              co2: { min: 5000, max: 10000 },
              fae: { ach: { min: 2, max: 4 } },
              lighting: {
                photoperiod: '0/24'
              }
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
            name: 'Incubación',
            duration_days: 40,
            transition_hours: 24,
            targets: {
              temperature: {
                day: { min: 20, max: 24 },
                night: { min: 20, max: 24 },
                substrate: { min: 22, max: 26 }
              },
              humidity: { min: 90, max: 100 },
              vpd: { min: 0.8, max: 1.2 },
              co2: { min: 10000, max: 40000 },
              fae: { ach: { min: 2, max: 4 } },
              lighting: {
                photoperiod: '0/24'
              }
            }
          },
          {
            id: 'pinning',
            name: 'Pinning',
            duration_days: 8,
            transition_hours: 24,
            targets: {
              temperature: {
                day: { min: 10, max: 15 },
                night: { min: 10, max: 15 },
                substrate: { min: 12, max: 16 }
              },
              humidity: { min: 95, max: 100 },
              vpd: { min: 0.8, max: 1.2 },
              co2: { min: 400, max: 1000 },
              fae: { ach: { min: 2, max: 4 } },
              lighting: {
                photoperiod: '12/12'
              }
            }
          },
          {
            id: 'fruiting',
            name: 'Fructificación',
            duration_days: 18,
            transition_hours: 24,
            targets: {
              temperature: {
                day: { min: 13, max: 16 },
                night: { min: 13, max: 16 },
                substrate: { min: 15, max: 18 }
              },
              humidity: { min: 85, max: 90 },
              vpd: { min: 0.8, max: 1.2 },
              co2: { min: 400, max: 1000 },
              fae: { ach: { min: 2, max: 4 } },
              lighting: {
                photoperiod: '12/12'
              }
            }
          },
          {
            id: 'recovery',
            name: 'Descanso',
            duration_days: 15,
            transition_hours: 24,
            targets: {
              temperature: {
                day: { min: 20, max: 24 },
                night: { min: 20, max: 24 },
                substrate: { min: 22, max: 26 }
              },
              humidity: { min: 90, max: 95 },
              vpd: { min: 0.8, max: 1.2 },
              co2: { min: 2000, max: 5000 },
              fae: { ach: { min: 2, max: 4 } },
              lighting: {
                photoperiod: '0/24'
              }
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
            name: 'Incubación',
            duration_days: 12,
            transition_hours: 24,
            targets: {
              temperature: {
                day: { min: 24, max: 30 },
                night: { min: 24, max: 30 },
                substrate: { min: 26, max: 32 }
              },
              humidity: { min: 90, max: 100 },
              vpd: { min: 0.8, max: 1.2 },
              co2: { min: 5000, max: 20000 },
              fae: { ach: { min: 2, max: 4 } },
              lighting: {
                photoperiod: '0/24'
              }
            }
          },
          {
            id: 'pinning',
            name: 'Pinning',
            duration_days: 3,
            transition_hours: 24,
            targets: {
              temperature: {
                day: { min: 18, max: 25 },
                night: { min: 18, max: 25 },
                substrate: { min: 20, max: 27 }
              },
              humidity: { min: 95, max: 100 },
              vpd: { min: 0.8, max: 1.2 },
              co2: { min: 400, max: 1000 },
              fae: { ach: { min: 2, max: 4 } },
              lighting: {
                photoperiod: '12/12'
              }
            }
          },
          {
            id: 'fruiting',
            name: 'Fructificación',
            duration_days: 5,
            transition_hours: 24,
            targets: {
              temperature: {
                day: { min: 20, max: 30 },
                night: { min: 20, max: 30 },
                substrate: { min: 22, max: 32 }
              },
              humidity: { min: 85, max: 90 },
              vpd: { min: 0.8, max: 1.2 },
              co2: { min: 400, max: 1000 },
              fae: { ach: { min: 2, max: 4 } },
              lighting: {
                photoperiod: '12/12'
              }
            }
          },
          {
            id: 'recovery',
            name: 'Descanso',
            duration_days: 8,
            transition_hours: 24,
            targets: {
              temperature: {
                day: { min: 24, max: 30 },
                night: { min: 24, max: 30 },
                substrate: { min: 26, max: 32 }
              },
              humidity: { min: 90, max: 95 },
              vpd: { min: 0.8, max: 1.2 },
              co2: { min: 2000, max: 5000 },
              fae: { ach: { min: 2, max: 4 } },
              lighting: {
                photoperiod: '0/24'
              }
            }
          },
        ]
  },
  plantae_solanum_lycopersicum: {
    id: 'plantae_solanum_lycopersicum',
    kingdom: 'PLANTAE',
    scientificName: 'Solanum lycopersicum',
    commonName: 'Tomate de Invernadero',
    description: 'Tomate de crecimiento indeterminado para hidroponía/sustrato inerte. Control estricto de temperatura radicular (18-22°C) y VPD para optimizar transporte de Calcio y prevenir Blossom End Rot.',
    imageUrl: 'https://images.unsplash.com/photo-1592841200221-a6898f307baa?auto=format&fit=crop&w=600&q=80',
    phases: [
      {
        id: 'seedling',
        name: '1. Plántula y Crecimiento Inicial',
        duration_days: 28,
        transition_hours: 24,
        stageTips: 'Mantener humedad alta para prevenir estrés hídrico post-trasplante. EC moderada para evitar quemaduras radiculares.',
        targets: {
          temperature: {
            day: { min: 22, max: 24 },
            night: { min: 18, max: 20 },
            substrate: { min: 20, max: 22 }
          },
          humidity: { min: 70, max: 80 },
          soilMoisture: { min: 65, max: 75 },
          vpd: { min: 0.6, max: 0.8 },
          co2: { min: 400, max: 600 },
          fae: { ach: { min: 2, max: 4 } },
          lighting: {
            photoperiod: '14/10'
          },
          ppfd: { min: 200, max: 300 },
          dli: { min: 10, max: 15 },
          ec: { min: 1.5, max: 2.0 },
          ph: { min: 5.5, max: 6.0 }
        }
      },
      {
        id: 'vegetative',
        name: '2. Crecimiento Vegetativo',
        duration_days: 21,
        transition_hours: 48,
        stageTips: 'Estimular enraizamiento profundo con dry-backs moderados (5-10%). Aumentar paulatinamente radiación y DLI.',
        targets: {
          temperature: {
            day: { min: 21, max: 26 },
            night: { min: 16, max: 18 },
            substrate: { min: 18, max: 22 }
          },
          humidity: { min: 65, max: 75 },
          soilMoisture: { min: 60, max: 70 },
          vpd: { min: 0.8, max: 1.0 },
          co2: { min: 600, max: 800 },
          fae: { ach: { min: 4, max: 6 } },
          lighting: {
            photoperiod: '16/8'
          },
          ppfd: { min: 350, max: 500 },
          dli: { min: 20, max: 25 },
          ec: { min: 2.0, max: 2.5 },
          ph: { min: 5.5, max: 6.0 }
        }
      },
      {
        id: 'flowering',
        name: '3. Floración y Cuajado',
        duration_days: 28,
        transition_hours: 48,
        stageTips: 'Diferencial térmico día/noche (5-7°C) estimula el cuajado. Control estricto de VPD para optimizar absorción de Calcio.',
        targets: {
          temperature: {
            day: { min: 20, max: 24 },
            night: { min: 15, max: 17 },
            substrate: { min: 18, max: 21 }
          },
          humidity: { min: 60, max: 70 },
          soilMoisture: { min: 55, max: 65 },
          vpd: { min: 0.8, max: 1.2 },
          co2: { min: 800, max: 1000 },
          fae: { ach: { min: 6, max: 10 } },
          lighting: {
            photoperiod: '16/8'
          },
          ppfd: { min: 500, max: 600 },
          dli: { min: 25, max: 30 },
          ec: { min: 2.5, max: 3.0 },
          ph: { min: 5.5, max: 6.0 }
        }
      },
      {
        id: 'production',
        name: '4. Producción y Cosecha Continua',
        duration_days: 120,
        transition_hours: 72,
        stageTips: 'Mantener EC sostenida (3-4 mS/cm) mejora la calidad organoléptica y los grados Brix en fruto.',
        targets: {
          temperature: {
            day: { min: 20, max: 25 },
            night: { min: 15, max: 17 },
            substrate: { min: 18, max: 21 }
          },
          humidity: { min: 65, max: 75 },
          soilMoisture: { min: 55, max: 65 },
          vpd: { min: 0.9, max: 1.2 },
          co2: { min: 800, max: 1000 },
          fae: { ach: { min: 8, max: 12 } },
          lighting: {
            photoperiod: '16/8'
          },
          ppfd: { min: 500, max: 700 },
          dli: { min: 25, max: 30 },
          ec: { min: 3.0, max: 4.0 },
          ph: { min: 5.5, max: 6.0 }
        }
      }
    ]
  },
  plantae_cannabis_sativa: {
    id: 'plantae_cannabis_sativa',
    kingdom: 'PLANTAE',
    scientificName: 'Cannabis sativa',
    commonName: 'Cannabis (Indoor)',
    description: 'Cultivar fotodependiente en sustrato inerte/hidroponía. Control riguroso de zona radicular (18-22°C), fotoperiodo y VPD alto en floración para máxima biosíntesis de cannabinoides y prevención de Botrytis.',
    imageUrl: 'https://images.unsplash.com/photo-1568644396922-5c3bfae12521?auto=format&fit=crop&w=600&q=80',
    phases: [
      {
        id: 'vegetative',
        name: '1. Crecimiento Vegetativo',
        duration_days: 28,
        transition_hours: 24,
        stageTips: 'Alta humedad y PPFD moderado. Fomentar expansión radicular profunda y ramificación estructural.',
        targets: {
          temperature: {
            day: { min: 24, max: 28 },
            night: { min: 20, max: 22 },
            substrate: { min: 20, max: 22 }
          },
          humidity: { min: 65, max: 75 },
          soilMoisture: { min: 55, max: 65 },
          vpd: { min: 0.8, max: 1.1 },
          co2: { min: 600, max: 800 },
          fae: { ach: { min: 4, max: 8 } },
          lighting: {
            photoperiod: '18/6'
          },
          ppfd: { min: 400, max: 600 },
          dli: { min: 25, max: 35 },
          ec: { min: 1.2, max: 1.8 },
          ph: { min: 5.8, max: 6.2 }
        }
      },
      {
        id: 'pre_flowering',
        name: '2. Pre-Floración (Stretch)',
        duration_days: 14,
        transition_hours: 48,
        stageTips: 'Inducción por cambio de fotoperiodo a 12/12. Aumentar VPD para mitigar condensación foliar por elongación rápida.',
        targets: {
          temperature: {
            day: { min: 23, max: 26 },
            night: { min: 18, max: 20 },
            substrate: { min: 19, max: 21 }
          },
          humidity: { min: 55, max: 65 },
          soilMoisture: { min: 50, max: 60 },
          vpd: { min: 1.0, max: 1.2 },
          co2: { min: 800, max: 1000 },
          fae: { ach: { min: 6, max: 10 } },
          lighting: {
            photoperiod: '12/12'
          },
          ppfd: { min: 600, max: 800 },
          dli: { min: 25, max: 35 },
          ec: { min: 1.8, max: 2.2 },
          ph: { min: 5.8, max: 6.2 }
        }
      },
      {
        id: 'flowering',
        name: '3. Floración Plena',
        duration_days: 42,
        transition_hours: 48,
        stageTips: 'Máxima demanda metabólica. Suplementación de P-K. Mantener VPD alto (1.2-1.5 kPa) para evitar Botrytis.',
        targets: {
          temperature: {
            day: { min: 22, max: 26 },
            night: { min: 16, max: 20 },
            substrate: { min: 18, max: 20 }
          },
          humidity: { min: 45, max: 55 },
          soilMoisture: { min: 45, max: 55 },
          vpd: { min: 1.2, max: 1.5 },
          co2: { min: 1000, max: 1200 },
          fae: { ach: { min: 8, max: 12 } },
          lighting: {
            photoperiod: '12/12'
          },
          ppfd: { min: 800, max: 1100 },
          dli: { min: 35, max: 45 },
          ec: { min: 2.0, max: 2.6 },
          ph: { min: 5.8, max: 6.2 }
        }
      },
      {
        id: 'late_flowering',
        name: '4. Final de Floración (Flush)',
        duration_days: 14,
        transition_hours: 24,
        stageTips: 'Lavado de sales nutritivas (EC baja). Temperaturas nocturnas frescas estimulan terpenos y antocianinas.',
        targets: {
          temperature: {
            day: { min: 20, max: 24 },
            night: { min: 14, max: 18 },
            substrate: { min: 18, max: 20 }
          },
          humidity: { min: 40, max: 50 },
          soilMoisture: { min: 40, max: 50 },
          vpd: { min: 1.3, max: 1.6 },
          co2: { min: 400, max: 600 },
          fae: { ach: { min: 8, max: 12 } },
          lighting: {
            photoperiod: '12/12'
          },
          ppfd: { min: 600, max: 800 },
          dli: { min: 25, max: 35 },
          ec: { min: 0.1, max: 0.5 },
          ph: { min: 5.8, max: 6.2 }
        }
      }
    ]
  },
  plantae_lactuca_sativa: {
    id: 'plantae_lactuca_sativa',
    kingdom: 'PLANTAE',
    scientificName: 'Lactuca sativa',
    commonName: 'Lechuga Hidropónica',
    description: 'Cultivo de hoja rápida en NFT/DWC. Temperatura radicular controlada (<20°C) para máxima oxigenación y prevención de Pythium. VPD estricto para evitar necrosis marginal (Tipburn).',
    imageUrl: 'https://images.unsplash.com/photo-1622206151226-18ca2c9ab4a1?auto=format&fit=crop&w=600&q=80',
    phases: [
      {
        id: 'seedling',
        name: '1. Plántula y Trasplante',
        duration_days: 14,
        transition_hours: 24,
        stageTips: 'Sustrato de germinación humectado y EC suave (0.8-1.0) para proteger radículas emergentes.',
        targets: {
          temperature: {
            day: { min: 20, max: 22 },
            night: { min: 16, max: 18 },
            substrate: { min: 18, max: 20 }
          },
          humidity: { min: 70, max: 80 },
          soilMoisture: { min: 80, max: 95 },
          vpd: { min: 0.5, max: 0.7 },
          co2: { min: 400, max: 500 },
          fae: { ach: { min: 2, max: 4 } },
          lighting: {
            photoperiod: '14/10'
          },
          ppfd: { min: 100, max: 150 },
          dli: { min: 5, max: 8 },
          ec: { min: 0.8, max: 1.0 },
          ph: { min: 5.5, max: 6.0 }
        }
      },
      {
        id: 'vegetative',
        name: '2. Crecimiento Vegetativo',
        duration_days: 14,
        transition_hours: 24,
        stageTips: 'Control de temperatura de solución nutritiva (<20°C) para garantizar oxígeno disuelto (>6 mg/L).',
        targets: {
          temperature: {
            day: { min: 21, max: 24 },
            night: { min: 15, max: 18 },
            substrate: { min: 18, max: 20 }
          },
          humidity: { min: 60, max: 70 },
          soilMoisture: { min: 80, max: 95 },
          vpd: { min: 0.6, max: 0.9 },
          co2: { min: 600, max: 800 },
          fae: { ach: { min: 4, max: 6 } },
          lighting: {
            photoperiod: '16/8'
          },
          ppfd: { min: 200, max: 250 },
          dli: { min: 12, max: 15 },
          ec: { min: 1.2, max: 1.6 },
          ph: { min: 5.5, max: 6.0 }
        }
      },
      {
        id: 'maturation',
        name: '3. Engorde y Cosecha',
        duration_days: 14,
        transition_hours: 24,
        stageTips: 'VPD óptimo asegura flujo transpiratorio y transporte de Calcio a hojas internas evitando quemadura de puntas.',
        targets: {
          temperature: {
            day: { min: 18, max: 22 },
            night: { min: 14, max: 16 },
            substrate: { min: 18, max: 20 }
          },
          humidity: { min: 60, max: 70 },
          soilMoisture: { min: 80, max: 95 },
          vpd: { min: 0.7, max: 1.0 },
          co2: { min: 600, max: 800 },
          fae: { ach: { min: 4, max: 8 } },
          lighting: {
            photoperiod: '16/8'
          },
          ppfd: { min: 250, max: 300 },
          dli: { min: 15, max: 17 },
          ec: { min: 1.4, max: 1.8 },
          ph: { min: 5.5, max: 6.0 }
        }
      }
    ]
  },
  plantae_capsicum_annuum: {
    id: 'plantae_capsicum_annuum',
    kingdom: 'PLANTAE',
    scientificName: 'Capsicum annuum',
    commonName: 'Pimiento / Morrón',
    description: 'Pimiento morrón en sustrato inerte/hidroponía. Alta sensibilidad radicular al frío (<18°C estanca el crecimiento). Demanda elevada de Potasio y Calcio en producción.',
    imageUrl: 'https://images.unsplash.com/photo-1563565375-f3fdfdbefa83?auto=format&fit=crop&w=600&q=80',
    phases: [
      {
        id: 'seedling',
        name: '1. Plántula y Desarrollo Inicial',
        duration_days: 35,
        transition_hours: 24,
        stageTips: 'Zona radicular cálida (21-23°C) crítica. Temperaturas bajo 18°C inducen enanismo radicular.',
        targets: {
          temperature: {
            day: { min: 23, max: 25 },
            night: { min: 20, max: 22 },
            substrate: { min: 21, max: 23 }
          },
          humidity: { min: 70, max: 80 },
          soilMoisture: { min: 65, max: 75 },
          vpd: { min: 0.6, max: 0.8 },
          co2: { min: 400, max: 600 },
          fae: { ach: { min: 2, max: 4 } },
          lighting: {
            photoperiod: '14/10'
          },
          ppfd: { min: 200, max: 300 },
          dli: { min: 10, max: 15 },
          ec: { min: 1.2, max: 1.6 },
          ph: { min: 5.5, max: 6.0 }
        }
      },
      {
        id: 'vegetative',
        name: '2. Crecimiento Vegetativo y Poda',
        duration_days: 28,
        transition_hours: 48,
        stageTips: 'Conducción y poda en V. Aumento progresivo de EC y radiación lumínica.',
        targets: {
          temperature: {
            day: { min: 22, max: 26 },
            night: { min: 18, max: 20 },
            substrate: { min: 20, max: 24 }
          },
          humidity: { min: 65, max: 75 },
          soilMoisture: { min: 60, max: 70 },
          vpd: { min: 0.8, max: 1.0 },
          co2: { min: 600, max: 800 },
          fae: { ach: { min: 4, max: 6 } },
          lighting: {
            photoperiod: '16/8'
          },
          ppfd: { min: 350, max: 450 },
          dli: { min: 20, max: 25 },
          ec: { min: 2.0, max: 2.5 },
          ph: { min: 5.5, max: 6.0 }
        }
      },
      {
        id: 'flowering',
        name: '3. Floración y Cuajado',
        duration_days: 21,
        transition_hours: 48,
        stageTips: 'Evitar temperaturas >28°C o VPD excesivo que desecan el polen y provocan aborto de flores.',
        targets: {
          temperature: {
            day: { min: 21, max: 25 },
            night: { min: 17, max: 19 },
            substrate: { min: 20, max: 23 }
          },
          humidity: { min: 65, max: 75 },
          soilMoisture: { min: 55, max: 65 },
          vpd: { min: 0.8, max: 1.1 },
          co2: { min: 800, max: 1000 },
          fae: { ach: { min: 6, max: 8 } },
          lighting: {
            photoperiod: '16/8'
          },
          ppfd: { min: 450, max: 600 },
          dli: { min: 25, max: 30 },
          ec: { min: 2.5, max: 3.0 },
          ph: { min: 5.5, max: 6.0 }
        }
      },
      {
        id: 'production',
        name: '4. Producción y Engorde de Fruto',
        duration_days: 120,
        transition_hours: 72,
        stageTips: 'Alta demanda de Potasio (K) y Calcio (Ca). EC sostenida mejora grosor de pared del fruto y vida postcosecha.',
        targets: {
          temperature: {
            day: { min: 21, max: 26 },
            night: { min: 17, max: 19 },
            substrate: { min: 20, max: 23 }
          },
          humidity: { min: 65, max: 75 },
          soilMoisture: { min: 55, max: 65 },
          vpd: { min: 0.8, max: 1.2 },
          co2: { min: 800, max: 1000 },
          fae: { ach: { min: 8, max: 12 } },
          lighting: {
            photoperiod: '16/8'
          },
          ppfd: { min: 500, max: 700 },
          dli: { min: 28, max: 35 },
          ec: { min: 2.5, max: 3.2 },
          ph: { min: 5.5, max: 6.0 }
        }
      }
    ]
  },
  plantae_fragaria_ananassa: {
    id: 'plantae_fragaria_ananassa',
    kingdom: 'PLANTAE',
    scientificName: 'Fragaria × ananassa',
    commonName: 'Fresa / Frutilla (Día Corto)',
    description: 'Variedad June-bearing de día corto tradicional en sustrato inerte. Inducción floral regulada por fotoperiodo reducido (<12h) y noches frescas. Zona radicular protegida (<18°C) para prevenir asfixia y Pythium.',
    imageUrl: 'https://images.unsplash.com/photo-1518635017498-87f514b751ba?auto=format&fit=crop&w=600&q=80',
    phases: [
      {
        id: 'establishment',
        name: '1. Enraizamiento y Establecimiento',
        duration_days: 14,
        transition_hours: 24,
        stageTips: 'Alta humedad y riego suave para favorecer el anclaje radicular de estolones sin saturar.',
        targets: {
          temperature: {
            day: { min: 20, max: 22 },
            night: { min: 14, max: 16 },
            substrate: { min: 16, max: 18 }
          },
          humidity: { min: 75, max: 85 },
          soilMoisture: { min: 65, max: 75 },
          vpd: { min: 0.6, max: 0.9 },
          co2: { min: 400, max: 600 },
          fae: { ach: { min: 2, max: 4 } },
          lighting: {
            photoperiod: '12/12'
          },
          ppfd: { min: 200, max: 250 },
          dli: { min: 9, max: 11 },
          ec: { min: 0.8, max: 1.2 },
          ph: { min: 5.8, max: 6.2 }
        }
      },
      {
        id: 'vegetative',
        name: '2. Crecimiento Vegetativo',
        duration_days: 28,
        transition_hours: 24,
        stageTips: 'Desarrollo de coronas y área foliar. Monitorear que la temperatura de sustrato no supere 18°C.',
        targets: {
          temperature: {
            day: { min: 20, max: 24 },
            night: { min: 12, max: 15 },
            substrate: { min: 15, max: 17 }
          },
          humidity: { min: 65, max: 75 },
          soilMoisture: { min: 60, max: 70 },
          vpd: { min: 0.8, max: 1.1 },
          co2: { min: 600, max: 800 },
          fae: { ach: { min: 4, max: 8 } },
          lighting: {
            photoperiod: '14/10'
          },
          ppfd: { min: 250, max: 350 },
          dli: { min: 13, max: 17 },
          ec: { min: 1.2, max: 1.5 },
          ph: { min: 5.5, max: 6.0 }
        }
      },
      {
        id: 'floral_induction',
        name: '3. Inducción Floral (Día Corto)',
        duration_days: 21,
        transition_hours: 48,
        stageTips: 'Reducción de fotoperiodo (<12h) y noches frías inducen diferenciación de yemas florales.',
        targets: {
          temperature: {
            day: { min: 18, max: 22 },
            night: { min: 10, max: 14 },
            substrate: { min: 14, max: 16 }
          },
          humidity: { min: 60, max: 70 },
          soilMoisture: { min: 55, max: 65 },
          vpd: { min: 0.9, max: 1.2 },
          co2: { min: 800, max: 1000 },
          fae: { ach: { min: 6, max: 10 } },
          lighting: {
            photoperiod: '11/13'
          },
          ppfd: { min: 300, max: 400 },
          dli: { min: 12, max: 16 },
          ec: { min: 1.4, max: 1.8 },
          ph: { min: 5.5, max: 6.0 }
        }
      },
      {
        id: 'fruiting',
        name: '4. Floración y Desarrollo de Fruto',
        duration_days: 30,
        transition_hours: 24,
        stageTips: 'Ventilación activa para evitar Botrytis. Aumento de EC para potenciar acumulación de azúcares (°Brix).',
        targets: {
          temperature: {
            day: { min: 20, max: 24 },
            night: { min: 12, max: 16 },
            substrate: { min: 15, max: 17 }
          },
          humidity: { min: 65, max: 75 },
          soilMoisture: { min: 60, max: 70 },
          vpd: { min: 0.8, max: 1.1 },
          co2: { min: 800, max: 1000 },
          fae: { ach: { min: 6, max: 10 } },
          lighting: {
            photoperiod: '12/12'
          },
          ppfd: { min: 350, max: 450 },
          dli: { min: 15, max: 19 },
          ec: { min: 1.5, max: 2.0 },
          ph: { min: 5.5, max: 6.0 }
        }
      }
    ]
  },
  plantae_cucumis_sativus: {
    id: 'plantae_cucumis_sativus',
    kingdom: 'PLANTAE',
    scientificName: 'Cucumis sativus',
    commonName: 'Pepino de Invernadero',
    description: 'Pepino indeterminado para hidroponía/sustrato inerte. Crecimiento vegetativo vigoroso y alta tasa transpiratoria. Zona radicular cálida (20-24°C) e irrigación frecuente por pulsos cortos para evitar estrés hídrico.',
    imageUrl: 'https://images.unsplash.com/photo-1449300079323-02e209d9d3a6?auto=format&fit=crop&w=600&q=80',
    phases: [
      {
        id: 'seedling',
        name: '1. Plántula y Desarrollo Inicial',
        duration_days: 21,
        transition_hours: 24,
        stageTips: 'Medio radicular cálido (23-24°C) para arranque vigoroso. Humedad alta para favorecer expansión cotiledonar.',
        targets: {
          temperature: {
            day: { min: 25, max: 28 },
            night: { min: 22, max: 24 },
            substrate: { min: 23, max: 24 }
          },
          humidity: { min: 75, max: 85 },
          soilMoisture: { min: 65, max: 75 },
          vpd: { min: 0.5, max: 0.7 },
          co2: { min: 400, max: 600 },
          fae: { ach: { min: 2, max: 4 } },
          lighting: {
            photoperiod: '14/10'
          },
          ppfd: { min: 200, max: 300 },
          dli: { min: 10, max: 15 },
          ec: { min: 1.5, max: 2.0 },
          ph: { min: 5.5, max: 6.0 }
        }
      },
      {
        id: 'vegetative',
        name: '2. Desarrollo Vegetativo y Guía',
        duration_days: 21,
        transition_hours: 48,
        stageTips: 'Alta tasa de elongación. Mantener VPD moderado (0.6-0.9 kPa) para rápida expansión del área foliar.',
        targets: {
          temperature: {
            day: { min: 24, max: 28 },
            night: { min: 20, max: 22 },
            substrate: { min: 21, max: 24 }
          },
          humidity: { min: 70, max: 80 },
          soilMoisture: { min: 60, max: 70 },
          vpd: { min: 0.6, max: 0.9 },
          co2: { min: 600, max: 800 },
          fae: { ach: { min: 4, max: 6 } },
          lighting: {
            photoperiod: '16/8'
          },
          ppfd: { min: 400, max: 500 },
          dli: { min: 20, max: 28 },
          ec: { min: 2.0, max: 2.5 },
          ph: { min: 5.5, max: 6.0 }
        }
      },
      {
        id: 'production',
        name: '3. Floración y Fructificación Continua',
        duration_days: 90,
        transition_hours: 48,
        stageTips: 'Sensible al estrés hídrico (aborto de frutos). Riego pulsado frecuente para mantener VWC estable y constante.',
        targets: {
          temperature: {
            day: { min: 23, max: 27 },
            night: { min: 19, max: 21 },
            substrate: { min: 20, max: 23 }
          },
          humidity: { min: 70, max: 80 },
          soilMoisture: { min: 60, max: 70 },
          vpd: { min: 0.7, max: 1.0 },
          co2: { min: 800, max: 1000 },
          fae: { ach: { min: 6, max: 10 } },
          lighting: {
            photoperiod: '16/8'
          },
          ppfd: { min: 500, max: 700 },
          dli: { min: 25, max: 35 },
          ec: { min: 2.5, max: 3.0 },
          ph: { min: 5.5, max: 6.0 }
        }
      }
    ]
  },
  plantae_ocimum_basilicum: {
    id: 'plantae_ocimum_basilicum',
    kingdom: 'PLANTAE',
    scientificName: 'Ocimum basilicum',
    commonName: 'Albahaca Dulce',
    description: 'Albahaca Genovesa para NFT/sustrato inerte. Altamente termófila y demandante de radiación. Temperatura radicular cálida (20-24°C) para evitar Pythium por frío (<15°C daña raíces). Cosecha y poda continua para inhibir floración.',
    imageUrl: 'https://images.unsplash.com/photo-1618164435735-413d3b066c9a?auto=format&fit=crop&w=600&q=80',
    phases: [
      {
        id: 'seedling',
        name: '1. Germinación y Plántula',
        duration_days: 14,
        transition_hours: 12,
        stageTips: 'Alta humedad y sustrato cálido (22-24°C). Sensible al frío radicular y al encharcamiento prolongado.',
        targets: {
          temperature: {
            day: { min: 24, max: 26 },
            night: { min: 20, max: 22 },
            substrate: { min: 22, max: 24 }
          },
          humidity: { min: 75, max: 85 },
          soilMoisture: { min: 70, max: 80 },
          vpd: { min: 0.5, max: 0.8 },
          co2: { min: 400, max: 600 },
          fae: { ach: { min: 2, max: 4 } },
          lighting: {
            photoperiod: '16/8'
          },
          ppfd: { min: 150, max: 200 },
          dli: { min: 9, max: 12 },
          ec: { min: 0.8, max: 1.2 },
          ph: { min: 5.8, max: 6.2 }
        }
      },
      {
        id: 'vegetative',
        name: '2. Crecimiento Vegetativo',
        duration_days: 14,
        transition_hours: 24,
        stageTips: 'Fotoperiodo extendido (18h) y radiación alta para maximizar biomasa foliar e inhibir inducción floral.',
        targets: {
          temperature: {
            day: { min: 22, max: 28 },
            night: { min: 18, max: 22 },
            substrate: { min: 20, max: 24 }
          },
          humidity: { min: 60, max: 75 },
          soilMoisture: { min: 60, max: 70 },
          vpd: { min: 0.8, max: 1.2 },
          co2: { min: 800, max: 1000 },
          fae: { ach: { min: 4, max: 8 } },
          lighting: {
            photoperiod: '18/6'
          },
          ppfd: { min: 250, max: 350 },
          dli: { min: 16, max: 22 },
          ec: { min: 1.5, max: 2.0 },
          ph: { min: 5.5, max: 6.5 }
        }
      },
      {
        id: 'production',
        name: '3. Producción y Cosecha Continua',
        duration_days: 45,
        transition_hours: 24,
        stageTips: 'Podar ápices terminales para inducir ramificación lateral y maximizar síntesis de aceites esenciales.',
        targets: {
          temperature: {
            day: { min: 24, max: 28 },
            night: { min: 18, max: 22 },
            substrate: { min: 21, max: 24 }
          },
          humidity: { min: 60, max: 70 },
          soilMoisture: { min: 55, max: 65 },
          vpd: { min: 0.9, max: 1.3 },
          co2: { min: 1000, max: 1200 },
          fae: { ach: { min: 6, max: 10 } },
          lighting: {
            photoperiod: '18/6'
          },
          ppfd: { min: 300, max: 400 },
          dli: { min: 19, max: 26 },
          ec: { min: 1.8, max: 2.4 },
          ph: { min: 5.5, max: 6.2 }
        }
      }
    ]
  },
  plantae_spinacia_oleracea: {
    id: 'plantae_spinacia_oleracea',
    kingdom: 'PLANTAE',
    scientificName: 'Spinacia oleracea',
    commonName: 'Espinaca',
    description: 'Cultivo de estación fría en NFT/DWC. Temperatura radicular fresca (15-18°C) para evitar espigado prematuro (bolting) y marchitez. Fotoperiodo moderado (<14h) para mantener calidad baby leaf.',
    imageUrl: 'https://images.unsplash.com/photo-1576045057995-568f588f82fb?auto=format&fit=crop&w=600&q=80',
    phases: [
      {
        id: 'seedling',
        name: '1. Germinación y Plántula',
        duration_days: 10,
        transition_hours: 12,
        stageTips: 'Ambiente fresco. Temperaturas >22°C durante germinación reducen drásticamente la tasa de emergencia.',
        targets: {
          temperature: {
            day: { min: 18, max: 20 },
            night: { min: 12, max: 15 },
            substrate: { min: 15, max: 18 }
          },
          humidity: { min: 70, max: 85 },
          soilMoisture: { min: 70, max: 80 },
          vpd: { min: 0.4, max: 0.7 },
          co2: { min: 400, max: 600 },
          fae: { ach: { min: 2, max: 4 } },
          lighting: {
            photoperiod: '12/12'
          },
          ppfd: { min: 150, max: 200 },
          dli: { min: 6, max: 9 },
          ec: { min: 0.8, max: 1.2 },
          ph: { min: 5.8, max: 6.4 }
        }
      },
      {
        id: 'vegetative',
        name: '2. Crecimiento Vegetativo',
        duration_days: 14,
        transition_hours: 24,
        stageTips: 'Evitar fotoperiodos largos (>14h) y estrés térmico (>24°C) para prevenir floración prematura (bolting).',
        targets: {
          temperature: {
            day: { min: 16, max: 20 },
            night: { min: 10, max: 14 },
            substrate: { min: 15, max: 18 }
          },
          humidity: { min: 65, max: 75 },
          soilMoisture: { min: 65, max: 75 },
          vpd: { min: 0.6, max: 0.9 },
          co2: { min: 600, max: 800 },
          fae: { ach: { min: 4, max: 8 } },
          lighting: {
            photoperiod: '12/12'
          },
          ppfd: { min: 250, max: 300 },
          dli: { min: 11, max: 13 },
          ec: { min: 1.4, max: 1.8 },
          ph: { min: 5.8, max: 6.2 }
        }
      },
      {
        id: 'harvest',
        name: '3. Maduración y Cosecha Baby Leaf',
        duration_days: 14,
        transition_hours: 24,
        stageTips: 'Cosecha escalonada de hojas tiernas. Nivel equilibrado de Nitrógeno para evitar acumulación excesiva de nitratos.',
        targets: {
          temperature: {
            day: { min: 16, max: 20 },
            night: { min: 10, max: 14 },
            substrate: { min: 15, max: 17 }
          },
          humidity: { min: 60, max: 70 },
          soilMoisture: { min: 60, max: 70 },
          vpd: { min: 0.7, max: 1.0 },
          co2: { min: 800, max: 1000 },
          fae: { ach: { min: 6, max: 10 } },
          lighting: {
            photoperiod: '13/11'
          },
          ppfd: { min: 300, max: 350 },
          dli: { min: 14, max: 16 },
          ec: { min: 1.8, max: 2.2 },
          ph: { min: 5.8, max: 6.2 }
        }
      }
    ]
  },
  plantae_solanum_melongena: {
    id: 'plantae_solanum_melongena',
    kingdom: 'PLANTAE',
    scientificName: 'Solanum melongena',
    commonName: 'Berenjena',
    description: 'Berenjena de invernadero en sustrato inerte. Altamente termófila y tolerante a alta conductividad eléctrica (EC hasta 3.0 mS/cm). Zona radicular cálida (20-24°C) para óptimo desarrollo vegetativo y fijación de fruto.',
    imageUrl: 'https://images.unsplash.com/photo-1615485290382-441e4d049cb5?auto=format&fit=crop&w=600&q=80',
    phases: [
      {
        id: 'seedling',
        name: '1. Plántula y Desarrollo Inicial',
        duration_days: 28,
        transition_hours: 24,
        stageTips: 'Desarrollo inicial pausado. Mantener temperatura de sustrato estable (22-24°C) para favorecer masa radicular primaria.',
        targets: {
          temperature: {
            day: { min: 24, max: 28 },
            night: { min: 18, max: 22 },
            substrate: { min: 22, max: 24 }
          },
          humidity: { min: 70, max: 80 },
          soilMoisture: { min: 65, max: 75 },
          vpd: { min: 0.6, max: 0.9 },
          co2: { min: 400, max: 600 },
          fae: { ach: { min: 2, max: 4 } },
          lighting: {
            photoperiod: '14/10'
          },
          ppfd: { min: 200, max: 300 },
          dli: { min: 10, max: 15 },
          ec: { min: 1.2, max: 1.6 },
          ph: { min: 5.8, max: 6.2 }
        }
      },
      {
        id: 'vegetative',
        name: '2. Crecimiento Vegetativo y Estructura',
        duration_days: 35,
        transition_hours: 48,
        stageTips: 'Formación de tallos y entutorado. Alta radiación lumínica y aumento progresivo de fertilización.',
        targets: {
          temperature: {
            day: { min: 22, max: 28 },
            night: { min: 18, max: 20 },
            substrate: { min: 20, max: 24 }
          },
          humidity: { min: 65, max: 75 },
          soilMoisture: { min: 60, max: 70 },
          vpd: { min: 0.8, max: 1.2 },
          co2: { min: 600, max: 800 },
          fae: { ach: { min: 4, max: 8 } },
          lighting: {
            photoperiod: '16/8'
          },
          ppfd: { min: 350, max: 450 },
          dli: { min: 20, max: 26 },
          ec: { min: 1.8, max: 2.2 },
          ph: { min: 5.8, max: 6.4 }
        }
      },
      {
        id: 'flowering',
        name: '3. Floración y Cuajado',
        duration_days: 20,
        transition_hours: 24,
        stageTips: 'Optimizar VPD (1.0-1.4 kPa) para evitar aborto floral y asegurar viabilidad del polen.',
        targets: {
          temperature: {
            day: { min: 22, max: 26 },
            night: { min: 16, max: 20 },
            substrate: { min: 20, max: 23 }
          },
          humidity: { min: 60, max: 70 },
          soilMoisture: { min: 55, max: 65 },
          vpd: { min: 1.0, max: 1.4 },
          co2: { min: 800, max: 1000 },
          fae: { ach: { min: 6, max: 10 } },
          lighting: {
            photoperiod: '14/10'
          },
          ppfd: { min: 450, max: 550 },
          dli: { min: 22, max: 28 },
          ec: { min: 2.2, max: 2.6 },
          ph: { min: 5.8, max: 6.4 }
        }
      },
      {
        id: 'production',
        name: '4. Producción y Cosecha Continua',
        duration_days: 60,
        transition_hours: 24,
        stageTips: 'Elevada demanda de Potasio (K). Alta tolerancia a sales nutritivas en fructificación pesada.',
        targets: {
          temperature: {
            day: { min: 22, max: 28 },
            night: { min: 16, max: 20 },
            substrate: { min: 20, max: 24 }
          },
          humidity: { min: 65, max: 75 },
          soilMoisture: { min: 60, max: 70 },
          vpd: { min: 0.9, max: 1.3 },
          co2: { min: 800, max: 1000 },
          fae: { ach: { min: 6, max: 12 } },
          lighting: {
            photoperiod: '16/8'
          },
          ppfd: { min: 450, max: 600 },
          dli: { min: 26, max: 34 },
          ec: { min: 2.5, max: 3.0 },
          ph: { min: 5.8, max: 6.4 }
        }
      }
    ]
  },
  plantae_mentha_spicata: {
    id: 'plantae_mentha_spicata',
    kingdom: 'PLANTAE',
    scientificName: 'Mentha spicata',
    commonName: 'Menta / Hierbabuena',
    description: 'Hierbabuena aromática para hidroponía/sustrato inerte. Crecimiento estolonífero vigoroso. Zona radicular fresca/templada (18-22°C) con alta oxigenación. Cosecha regular para concentrar aceites esenciales.',
    imageUrl: 'https://images.unsplash.com/photo-1628556270448-4d4e4148e1b1?auto=format&fit=crop&w=600&q=80',
    phases: [
      {
        id: 'establishment',
        name: '1. Establecimiento de Estolones',
        duration_days: 14,
        transition_hours: 12,
        stageTips: 'Alta humedad relativa y temperatura radicular templada (18-22°C) para enraizamiento acelerado de esquejes.',
        targets: {
          temperature: {
            day: { min: 20, max: 24 },
            night: { min: 16, max: 18 },
            substrate: { min: 18, max: 22 }
          },
          humidity: { min: 75, max: 85 },
          soilMoisture: { min: 70, max: 80 },
          vpd: { min: 0.6, max: 0.9 },
          co2: { min: 400, max: 600 },
          fae: { ach: { min: 2, max: 4 } },
          lighting: {
            photoperiod: '14/10'
          },
          ppfd: { min: 150, max: 250 },
          dli: { min: 7, max: 12 },
          ec: { min: 1.0, max: 1.4 },
          ph: { min: 5.8, max: 6.2 }
        }
      },
      {
        id: 'vegetative',
        name: '2. Crecimiento Vegetativo y Ramificación',
        duration_days: 21,
        transition_hours: 24,
        stageTips: 'Desarrollo invasivo rápido. Mantener alta oxigenación radicular para evitar decaimiento por densidad de raíces.',
        targets: {
          temperature: {
            day: { min: 22, max: 26 },
            night: { min: 16, max: 20 },
            substrate: { min: 18, max: 22 }
          },
          humidity: { min: 65, max: 75 },
          soilMoisture: { min: 65, max: 75 },
          vpd: { min: 0.8, max: 1.1 },
          co2: { min: 600, max: 800 },
          fae: { ach: { min: 4, max: 8 } },
          lighting: {
            photoperiod: '16/8'
          },
          ppfd: { min: 250, max: 350 },
          dli: { min: 14, max: 20 },
          ec: { min: 1.4, max: 1.8 },
          ph: { min: 5.5, max: 6.2 }
        }
      },
      {
        id: 'production',
        name: '3. Producción y Cosecha Continua',
        duration_days: 45,
        transition_hours: 24,
        stageTips: 'Cortes periódicos de biomasa estimulan el rebrote lateral continuo e impiden espigado con floración leñosa.',
        targets: {
          temperature: {
            day: { min: 22, max: 26 },
            night: { min: 16, max: 20 },
            substrate: { min: 18, max: 21 }
          },
          humidity: { min: 60, max: 70 },
          soilMoisture: { min: 60, max: 70 },
          vpd: { min: 0.9, max: 1.2 },
          co2: { min: 800, max: 1000 },
          fae: { ach: { min: 6, max: 10 } },
          lighting: {
            photoperiod: '16/8'
          },
          ppfd: { min: 300, max: 400 },
          dli: { min: 17, max: 23 },
          ec: { min: 1.6, max: 2.0 },
          ph: { min: 5.5, max: 6.2 }
        }
      }
    ]
  },
  plantae_fragaria_monterey: {
    id: 'plantae_fragaria_monterey',
    commonName: 'Frutilla Monterey (Día Neutro)',
    scientificName: 'Fragaria × ananassa \'Monterey\'',
    kingdom: 'PLANTAE',
    description: 'Variedad de frutilla de día neutro de alto vigor desarrollada por UC Davis. Fructificación continua con alta calidad organoléptica y °Brix. Requiere control riguroso de temperatura en zona radicular (14°C - 18°C) para evitar hipoxia y Pythium, fotoperiodo de 14-16h y riego pulsado automatizado.',
    imageUrl: 'https://images.unsplash.com/photo-1464965911861-746a04b4bca6?auto=format&fit=crop&w=600&q=80',
    phases: [
      {
        id: 'vegetative',
        name: 'Crecimiento Vegetativo y Enraizamiento',
        duration_days: 21,
        transition_hours: 24,
        stageTips: 'Promover desarrollo radicular activo en sustrato inerte (coco/perlita). Riego pulsado por goteo evitando saturación.',
        targets: {
          temperature: {
            day: { min: 20, max: 24 },
            night: { min: 14, max: 16 },
            substrate: { min: 16, max: 18 }
          },
          humidity: { min: 65, max: 75 },
          soilMoisture: { min: 65, max: 75 },
          vpd: { min: 0.8, max: 1.1 },
          co2: { min: 600, max: 800 },
          fae: { ach: { min: 4, max: 8 } },
          lighting: {
            photoperiod: '16/8'
          },
          ppfd: { min: 250, max: 350 },
          dli: { min: 15, max: 20 },
          ec: { min: 1.0, max: 1.4 },
          ph: { min: 5.8, max: 6.2 }
        }
      },
      {
        id: 'flowering',
        name: 'Floración y Cuajado de Fruto',
        duration_days: 28,
        transition_hours: 24,
        stageTips: 'Ventilación activa para cuajado óptimo y prevención de Botrytis cinerea. Mantener VPD < 1.3 kPa.',
        targets: {
          temperature: {
            day: { min: 18, max: 22 },
            night: { min: 12, max: 15 },
            substrate: { min: 15, max: 18 }
          },
          humidity: { min: 60, max: 70 },
          soilMoisture: { min: 60, max: 70 },
          vpd: { min: 0.9, max: 1.3 },
          co2: { min: 800, max: 1000 },
          fae: { ach: { min: 6, max: 10 } },
          lighting: {
            photoperiod: '14/10'
          },
          ppfd: { min: 350, max: 500 },
          dli: { min: 20, max: 25 },
          ec: { min: 1.4, max: 1.8 },
          ph: { min: 5.8, max: 6.2 }
        }
      },
      {
        id: 'ripening',
        name: 'Maduración y Cosecha Continua',
        duration_days: 60,
        transition_hours: 24,
        stageTips: 'Noches frescas (12°C - 14°C) potencian la acumulación de sólidos solubles (°Brix) y firmeza de la pulpa.',
        targets: {
          temperature: {
            day: { min: 18, max: 22 },
            night: { min: 12, max: 14 },
            substrate: { min: 14, max: 17 }
          },
          humidity: { min: 55, max: 65 },
          soilMoisture: { min: 55, max: 65 },
          vpd: { min: 1.0, max: 1.4 },
          co2: { min: 800, max: 1200 },
          fae: { ach: { min: 8, max: 12 } },
          lighting: {
            photoperiod: '14/10'
          },
          ppfd: { min: 400, max: 600 },
          dli: { min: 22, max: 28 },
          ec: { min: 1.8, max: 2.2 },
          ph: { min: 5.8, max: 6.2 }
        }
      }
    ]
  },
};

export interface ThermodynamicValidation {
  isValid: boolean;
  isWarning: boolean;
  message?: string;
  suggestedSubstrate?: { min: number; max: number };
}

/**
 * Valida la coherencia física, matemática y biológica de los parámetros SCADA
 * según el reino del cultivo (FUNGI: termogénesis micelial vs PLANTAE: zona radicular segura).
 */
export function validateThermodynamics(targets: PhaseTargets, kingdom: 'FUNGI' | 'PLANTAE' = 'FUNGI'): ThermodynamicValidation {
  // 1. Validación de Temperatura Ambiente Diurna
  const ambMin = targets.temperature.day.min;
  const ambMax = targets.temperature.day.max;

  if (ambMin > ambMax) {
    return {
      isValid: false,
      isWarning: false,
      message: `Error en Temperatura Día: El valor mínimo (${ambMin}°C) no puede ser mayor al máximo (${ambMax}°C).`
    };
  }
  if (ambMin < 0 || ambMax > 45) {
    return {
      isValid: false,
      isWarning: false,
      message: `Error en Temperatura Día: Debe encontrarse en el rango físico seguro (0°C a 45°C).`
    };
  }

  // 2. Validación de Temperatura Ambiente Nocturna (si está definida)
  if (targets.temperature.night) {
    const nightMin = targets.temperature.night.min;
    const nightMax = targets.temperature.night.max;
    if (nightMin > nightMax) {
      return {
        isValid: false,
        isWarning: false,
        message: `Error en Temperatura Noche: El valor mínimo (${nightMin}°C) no puede ser mayor al máximo (${nightMax}°C).`
      };
    }
    if (nightMin < 0 || nightMax > 45) {
      return {
        isValid: false,
        isWarning: false,
        message: `Error en Temperatura Noche: Debe encontrarse en el rango físico seguro (0°C a 45°C).`
      };
    }
  }

  // 3. Validación de Humedad Relativa
  const humMin = targets.humidity.min;
  const humMax = targets.humidity.max;
  if (humMin > humMax) {
    return {
      isValid: false,
      isWarning: false,
      message: `Error en Humedad Relativa: El valor mínimo (${humMin}%) no puede ser mayor al máximo (${humMax}%).`
    };
  }
  if (humMin < 0 || humMax > 100) {
    return {
      isValid: false,
      isWarning: false,
      message: `Error en Humedad Relativa: Debe encontrarse dentro del rango 0% a 100%.`
    };
  }

  // 4. Validación de CO2 (si está definido)
  if (targets.co2) {
    const co2Min = targets.co2.min;
    const co2Max = targets.co2.max;
    if (co2Min > co2Max) {
      return {
        isValid: false,
        isWarning: false,
        message: `Error en CO2: El valor mínimo (${co2Min} ppm) no puede ser mayor al máximo (${co2Max} ppm).`
      };
    }
    const maxCo2Limit = kingdom === 'FUNGI' ? 50000 : 3000;
    if (co2Min < 300 || co2Max > maxCo2Limit) {
      return {
        isValid: false,
        isWarning: false,
        message: `Error en CO2: El rango admisible para control en ${kingdom === 'FUNGI' ? 'Fungi' : 'Plantae'} es de 300 a ${maxCo2Limit.toLocaleString()} ppm.`
      };
    }
  }

  // 5. Validación de Humedad de Suelo (% VWC, si está definida)
  if (targets.soilMoisture) {
    const soilMin = targets.soilMoisture.min;
    const soilMax = targets.soilMoisture.max;
    if (soilMin > soilMax) {
      return {
        isValid: false,
        isWarning: false,
        message: `Error en Humedad de Suelo: El valor mínimo (${soilMin}%) no puede ser mayor al máximo (${soilMax}% VWC).`
      };
    }
    if (soilMin < 0 || soilMax > 100) {
      return {
        isValid: false,
        isWarning: false,
        message: `Error en Humedad de Suelo: Debe encontrarse dentro del rango 0% a 100% VWC.`
      };
    }
  }

  // 6. Validación de Sustrato / Zona Radicular
  if (targets.temperature.substrate) {
    const subMin = targets.temperature.substrate.min;
    const subMax = targets.temperature.substrate.max;

    if (subMin > subMax) {
      return {
        isValid: false,
        isWarning: false,
        message: `Error en Temperatura de Sustrato/Raíz: El valor mínimo (${subMin}°C) no puede ser mayor al máximo (${subMax}°C).`
      };
    }

    // --- REGLAS REINO PLANTAE ---
    if (kingdom === 'PLANTAE') {
      if (subMax > 24) {
        return {
          isValid: false,
          isWarning: false,
          message: `Peligro Radicular Crítico: Temperatura de suelo (${subMax}°C) superior a 24°C provoca anoxia (falta de O₂) y pudrición por Pythium.`
        };
      }
      if (subMin < 10) {
        return {
          isValid: false,
          isWarning: false,
          message: `Bloqueo Radicular por Frío: Temperatura de suelo (${subMin}°C) inferior a 10°C detiene la absorción de nutrientes esenciales (P, Fe).`
        };
      }
      return { 
        isValid: true, 
        isWarning: false, 
        message: 'Coherencia Agronómica SCADA: Óptima (Zona radicular segura 12°C - 20°C).' 
      };
    }

    // --- REGLAS REINO FUNGI ---
    if (kingdom === 'FUNGI') {
      if (subMax < ambMin) {
        return {
          isValid: false,
          isWarning: false,
          message: `Violación Termodinámica: El sustrato (${subMax}°C) no puede ser menor al aire ambiente (${ambMin}°C) debido a la termogénesis del micelio (+2°C a +4°C).`,
          suggestedSubstrate: { min: ambMin + 1, max: ambMax + 3 }
        };
      }

      if (subMin < ambMin) {
        return {
          isValid: true,
          isWarning: true,
          message: `Advertencia Térmica: El sustrato mín (${subMin}°C) está por debajo del ambiente mín (${ambMin}°C). El calor metabólico elevará el sustrato de forma natural.`,
          suggestedSubstrate: { min: ambMin + 1, max: ambMax + 3 }
        };
      }

      if (subMax > 30) {
        return {
          isValid: true,
          isWarning: true,
          message: `Peligro de Pasteurización/Muerte: Temperatura de sustrato (${subMax}°C) cercana al límite letal para micelio (>30°C).`
        };
      }

      return { 
        isValid: true, 
        isWarning: false, 
        message: 'Coherencia Termodinámica SCADA: Óptima (Sustrato compatible con termogénesis del micelio +2°C a +4°C).' 
      };
    }
  }

  return { isValid: true, isWarning: false };
}

/**
 * Traduce un perfil y fase a las Reglas de Hardware que entiende el ESP32
 */
export const generateDeviceProfile = (phase: CropPhase, kingdom: 'FUNGI' | 'PLANTAE' = 'FUNGI'): DeviceCropProfile => {
  const [lightHoursStr] = (phase.targets.lighting?.photoperiod || '0/24').split('/');
  const lightHours = parseInt(lightHoursStr, 10) || 0;
  
  // Extraemos o definimos valores por defecto en caso de no existir
  const tempIdealMin = phase.targets.temperature.day.min;
  const tempIdealMax = phase.targets.temperature.day.max;
  
  // Limites criticos: si no están explícitos, los estimamos
  const tempCritMin = tempIdealMin - 5;
  const tempCritMax = tempIdealMax + 5;
  
  const humIdealMin = phase.targets.humidity.min;
  const humIdealMax = phase.targets.humidity.max;
  const humCritMin = Math.max(0, humIdealMin - 15);
  
  const co2IdealMin = phase.targets.co2?.min || 400;
  const co2IdealMax = phase.targets.co2?.max || 800;
  const co2CritMax = co2IdealMax + (co2IdealMax * 0.5); // 50% extra como limite critico

  const soilMoistureMin = phase.targets.soilMoisture?.min ?? (kingdom === 'PLANTAE' ? 60 : undefined);
  const soilMoistureMax = phase.targets.soilMoisture?.max ?? (kingdom === 'PLANTAE' ? 75 : undefined);

  const profile: DeviceCropProfile = {
      temp_ideal_min: tempIdealMin,
      temp_ideal_max: tempIdealMax,
      temp_crit_min: tempCritMin,
      temp_crit_max: tempCritMax,
      temp_sustrato_ideal: phase.targets.temperature.substrate 
        ? Math.round((phase.targets.temperature.substrate.min + phase.targets.temperature.substrate.max) / 2) 
        : (kingdom === 'PLANTAE' ? 16 : Math.round((tempIdealMin + tempIdealMax) / 2) + 3),
      temp_sustrato_crit_max: phase.targets.temperature.substrate 
        ? phase.targets.temperature.substrate.max + 2 
        : (kingdom === 'PLANTAE' ? 24 : tempCritMax),
      hum_ideal_min: humIdealMin,
      hum_ideal_max: humIdealMax,
      hum_crit_min: humCritMin,
      co2_ideal_min: co2IdealMin || 400,
      co2_ideal_max: co2IdealMax,
      co2_crit_max: co2CritMax,
      light_hours_on: lightHours > 0 ? lightHours : 0,
      kingdom: kingdom
  };

  if (kingdom === 'PLANTAE' || soilMoistureMin !== undefined) {
      profile.hum_suelo_ideal_min = soilMoistureMin ?? 60;
      profile.hum_suelo_ideal_max = soilMoistureMax ?? 75;
      profile.hum_suelo_crit_min = soilMoistureMin ? Math.max(0, soilMoistureMin - 15) : 45;
  }

  return profile;
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
        profile.phases.splice(1, 1); // Remover Consolidacion antigua
        migrated = true;
        profile.phases.forEach((p: any, index: number) => {
           const cleanName = p.name.replace(/^\d+\.\s*/, '');
           p.name = `${index + 1}. ${cleanName}`;
        });
      }
    }

    if (migrated) {
      localStorage.setItem('CUSTOM_PROFILES', JSON.stringify(customProfiles));
      console.log('Perfiles personalizados migrados a 4 fases automaticamente.');
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
