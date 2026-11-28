/**
 * motos/data/circuitos.js
 * Catálogo de circuitos (5, 7 y 10 partes), modelos de motos, cascos,
 * paletas 16-bit y configuración inicial de los 4 pilotos.
 */
(function (root) {
  'use strict';

  const PENALTY_SECONDS = 10.0;

  // Paletas vibrantes 16-bit para hasta 4 pilotos (alta legibilidad en pizarra digital)
  const TEAM_PALETTES = {
    1: {
      id: 1,
      name: 'Rojo Corsa',
      cssMain: '#ef4444',
      cssLight: '#fca5a5',
      cssDark: '#7f1d1d',
      cssBg: 'rgba(239, 68, 68, 0.16)',
      outline: '#2b0909',
      deep: '#7f1d1d',
      dark: '#b91c1c',
      main: '#ef4444',
      light: '#f87171',
      bright: '#fecaca',
      stripe: '#ffffff',
      visor: '#38bdf8',
      visorGlow: '#e0f2fe',
      suitDark: '#1f2937',
      suitMid: '#374151',
      suitAccent: '#ef4444',
      flameCore: '#ffffff',
      flameMid: '#fde047',
      flameOuter: '#f97316'
    },
    2: {
      id: 2,
      name: 'Azul Cobalto',
      cssMain: '#0ea5e9',
      cssLight: '#7dd3fc',
      cssDark: '#0c4a6e',
      cssBg: 'rgba(14, 165, 233, 0.16)',
      outline: '#061a2e',
      deep: '#0c4a6e',
      dark: '#0284c7',
      main: '#0ea5e9',
      light: '#38bdf8',
      bright: '#bae6fd',
      stripe: '#facc15',
      visor: '#facc15',
      visorGlow: '#fef9c3',
      suitDark: '#172554',
      suitMid: '#1e3a8a',
      suitAccent: '#38bdf8',
      flameCore: '#ffffff',
      flameMid: '#67e8f9',
      flameOuter: '#2563eb'
    },
    3: {
      id: 3,
      name: 'Verde Rayo',
      cssMain: '#22c55e',
      cssLight: '#86efac',
      cssDark: '#14532d',
      cssBg: 'rgba(34, 197, 94, 0.16)',
      outline: '#052110',
      deep: '#14532d',
      dark: '#15803d',
      main: '#22c55e',
      light: '#4ade80',
      bright: '#bbf7d0',
      stripe: '#f8fafc',
      visor: '#fb923c',
      visorGlow: '#ffedd5',
      suitDark: '#111827',
      suitMid: '#1f2937',
      suitAccent: '#4ade80',
      flameCore: '#ffffff',
      flameMid: '#bef264',
      flameOuter: '#16a34a'
    },
    4: {
      id: 4,
      name: 'Amarillo Turbo',
      cssMain: '#eab308',
      cssLight: '#fde047',
      cssDark: '#713f12',
      cssBg: 'rgba(234, 179, 8, 0.16)',
      outline: '#291704',
      deep: '#713f12',
      dark: '#a16207',
      main: '#eab308',
      light: '#facc15',
      bright: '#fef08a',
      stripe: '#1e293b',
      visor: '#ef4444',
      visorGlow: '#fecaca',
      suitDark: '#1c1917',
      suitMid: '#292524',
      suitAccent: '#facc15',
      flameCore: '#ffffff',
      flameMid: '#fde047',
      flameOuter: '#ea580c'
    }
  };

  const BIKE_MODELS = {
    superbike: { id: 'superbike', label: 'Superbike GP', tag: 'Aerodinámica' },
    turbo: { id: 'turbo', label: 'Café Turbo', tag: 'Retro 16-bit' },
    rally: { id: 'rally', label: 'Cross Rally', tag: 'Todoterreno' },
    cyber: { id: 'cyber', label: 'Ciber Moto', tag: 'Futurista' }
  };

  const HELMET_STYLES = {
    classic: { id: 'classic', label: 'Clásico' },
    aero: { id: 'aero', label: 'Alerón Pro' },
    bolt: { id: 'bolt', label: 'Rayo GP' },
    crown: { id: 'crown', label: 'Campeón' }
  };

  const DEFAULT_RIDERS = [
    { id: 1, name: 'Rayo', bike: 'superbike', helmet: 'aero' },
    { id: 2, name: 'Valkiria', bike: 'cyber', helmet: 'bolt' },
    { id: 3, name: 'Tornado', bike: 'rally', helmet: 'classic' },
    { id: 4, name: 'Fénix', bike: 'turbo', helmet: 'crown' }
  ];

  /**
   * 6 circuitos pixel-art 16-bit:
   * - 2 circuitos de 5 partes (Sprint)
   * - 2 circuitos de 7 partes (Gran Premio)
   * - 2 circuitos de 10 partes (Resistencia)
   *
   * Los waypoints están normalizados en el espacio del canvas 360x210 (márgenes seguros).
   * El motor pixel-art construye una curva cerrada suave (Catmull-Rom) y divide
   * la longitud total en exactamente `parts` tramos iguales con banderas numeradas.
   */
  const CIRCUITS = [
    {
      id: 'costa_sol',
      name: 'Costa del Sol GP',
      parts: 5,
      category: 'Sprint · 5 Partes',
      badge: '5 PARTES',
      icon: '🌴',
      biome: 'coast',
      difficulty: 'Rápido',
      description: 'Circuito costero soleado entre palmeras, playas doradas y el mar pixelado.',
      kerbA: '#ef4444',
      kerbB: '#f8fafc',
      asphalt: '#334155',
      asphaltLight: '#475569',
      asphaltDark: '#1e293b',
      skyTop: '#0284c7',
      skyBot: '#7dd3fc',
      groundA: '#22c55e',
      groundB: '#16a34a',
      goldTargetPerPart: 6.5,
      silverTargetPerPart: 10.5,
      sectorNames: [
        'Recta del Paseo Marítimo',
        'Curva del Faro',
        'Chicane de las Palmeras',
        'Horquilla de la Bahía',
        'Recta de Meta'
      ],
      waypoints: [
        [105, 166],
        [242, 166],
        [308, 138],
        [302, 74],
        [235, 52],
        [165, 86],
        [98, 56],
        [52, 92],
        [58, 146]
      ]
    },
    {
      id: 'urbano_neon',
      name: 'Circuito Urbano Neón',
      parts: 5,
      category: 'Sprint · 5 Partes',
      badge: '5 PARTES',
      icon: '🌃',
      biome: 'city',
      difficulty: 'Rápido',
      description: 'Gran Premio nocturno entre rascacielos iluminados, puentes y curvas cerradas.',
      kerbA: '#06b6d4',
      kerbB: '#f8fafc',
      asphalt: '#272c3a',
      asphaltLight: '#3b4256',
      asphaltDark: '#161922',
      skyTop: '#0b1120',
      skyBot: '#1e293b',
      groundA: '#1e293b',
      groundB: '#172033',
      goldTargetPerPart: 6.5,
      silverTargetPerPart: 10.5,
      sectorNames: [
        'Avenida Central',
        'Curva del Puente',
        'Túnel del Metro',
        'Plaza de los Focos',
        'Recta de la Torre'
      ],
      waypoints: [
        [96, 168],
        [258, 168],
        [310, 146],
        [310, 88],
        [252, 62],
        [192, 62],
        [176, 112],
        [114, 112],
        [96, 66],
        [52, 84],
        [54, 148]
      ]
    },
    {
      id: 'sierra_nevada',
      name: 'Sierra Nevada GP',
      parts: 7,
      category: 'Gran Premio · 7 Partes',
      badge: '7 PARTES',
      icon: '🏔️',
      biome: 'alpine',
      difficulty: 'Intermedio',
      description: 'Puerto de montaña con pinos, cumbres nevadas, viaductos y enlazadas técnicas.',
      kerbA: '#dc2626',
      kerbB: '#ffffff',
      asphalt: '#374151',
      asphaltLight: '#4b5563',
      asphaltDark: '#1f2937',
      skyTop: '#1d4ed8',
      skyBot: '#93c5fd',
      groundA: '#15803d',
      groundB: '#166534',
      goldTargetPerPart: 7.0,
      silverTargetPerPart: 11.5,
      sectorNames: [
        'Recta del Refugio',
        'Subida de los Pinos',
        'Horquilla de la Cumbre',
        'Puente del Glaciar',
        'Eses del Ventisquero',
        'Curva del Mirador',
        'Bajada a Meta'
      ],
      waypoints: [
        [98, 170],
        [232, 170],
        [306, 152],
        [314, 102],
        [264, 62],
        [208, 74],
        [182, 116],
        [138, 112],
        [142, 62],
        [84, 54],
        [46, 94],
        [56, 148]
      ]
    },
    {
      id: 'sahara_dunas',
      name: 'Desierto del Sáhara GP',
      parts: 7,
      category: 'Gran Premio · 7 Partes',
      badge: '7 PARTES',
      icon: '🏜️',
      biome: 'desert',
      difficulty: 'Intermedio',
      description: 'Asfalto abrasador entre dunas ocres, cañones rojizos y oasis al atardecer.',
      kerbA: '#f59e0b',
      kerbB: '#fef3c7',
      asphalt: '#3f3834',
      asphaltLight: '#574e48',
      asphaltDark: '#26211e',
      skyTop: '#c2410c',
      skyBot: '#fcd34d',
      groundA: '#d97706',
      groundB: '#b45309',
      goldTargetPerPart: 7.0,
      silverTargetPerPart: 11.5,
      sectorNames: [
        'Recta del Oasis',
        'Curva del Cañón',
        'Doble Duna',
        'Paso de las Rocas',
        'Curva del Espejismo',
        'Chicane del Siroco',
        'Sprint del Atardecer'
      ],
      waypoints: [
        [102, 170],
        [244, 170],
        [312, 134],
        [284, 96],
        [308, 60],
        [238, 48],
        [182, 82],
        [136, 52],
        [68, 62],
        [48, 112],
        [88, 126],
        [60, 156]
      ]
    },
    {
      id: 'sakura_intl',
      name: 'Internacional Sakura',
      parts: 10,
      category: 'Resistencia · 10 Partes',
      badge: '10 PARTES',
      icon: '🌸',
      biome: 'sakura',
      difficulty: 'Campeonato',
      description: 'Gran trazado técnico japonés con cerezos en flor, diez sectores y curvas míticas.',
      kerbA: '#e11d48',
      kerbB: '#fff1f2',
      asphalt: '#334155',
      asphaltLight: '#475569',
      asphaltDark: '#1e293b',
      skyTop: '#38bdf8',
      skyBot: '#fbcfe8',
      groundA: '#22a35a',
      groundB: '#1b8a4b',
      goldTargetPerPart: 7.5,
      silverTargetPerPart: 12.0,
      sectorNames: [
        'Recta Imperial',
        'Curva del Torii',
        'Eses del Cerezo',
        'Horquilla de Kioto',
        'Recta del Lago',
        'Curva del Dragón',
        'Chicane Samurai',
        'Curva del Monte Fuji',
        'Parabólica Sakura',
        'Meta del Campeonato'
      ],
      waypoints: [
        [94, 172],
        [226, 172],
        [302, 160],
        [316, 122],
        [266, 108],
        [298, 72],
        [254, 48],
        [198, 62],
        [182, 104],
        [142, 116],
        [136, 68],
        [92, 50],
        [48, 74],
        [66, 116],
        [46, 152]
      ]
    },
    {
      id: 'volcan_magma',
      name: 'Volcán Magma Speedway',
      parts: 10,
      category: 'Resistencia · 10 Partes',
      badge: '10 PARTES',
      icon: '🌋',
      biome: 'volcano',
      difficulty: 'Extremo',
      description: 'Diez sectores de pura adrenalina sobre roca volcánica y ríos de lava incandescentes.',
      kerbA: '#f97316',
      kerbB: '#fef08a',
      asphalt: '#292524',
      asphaltLight: '#44403c',
      asphaltDark: '#1c1917',
      skyTop: '#450a0a',
      skyBot: '#ea580c',
      groundA: '#44403c',
      groundB: '#292524',
      goldTargetPerPart: 7.5,
      silverTargetPerPart: 12.0,
      sectorNames: [
        'Recta de Obsidiana',
        'Curva de la Ceniza',
        'Puente de Lava',
        'Cráter Norte',
        'Horquilla de Basalto',
        'Cañón del Magma',
        'Eses Ardientes',
        'Curva del Géiser',
        'Chicane del Volcán',
        'Recta de la Caldera'
      ],
      waypoints: [
        [96, 172],
        [244, 172],
        [312, 148],
        [282, 118],
        [314, 84],
        [278, 50],
        [218, 56],
        [196, 98],
        [156, 72],
        [114, 52],
        [62, 62],
        [46, 102],
        [92, 120],
        [52, 148]
      ]
    }
  ];

  function getCircuitById(id) {
    return CIRCUITS.find((c) => c.id === id) || CIRCUITS[0];
  }

  root.MotosData = {
    PENALTY_SECONDS,
    TEAM_PALETTES,
    BIKE_MODELS,
    HELMET_STYLES,
    DEFAULT_RIDERS,
    CIRCUITS,
    getCircuitById
  };
})(typeof window !== 'undefined' ? window : globalThis);
