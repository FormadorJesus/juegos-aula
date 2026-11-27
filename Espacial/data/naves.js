/**
 * Espacial/data/naves.js
 * Definiciones de armamento, chasis, alas/blindajes y paletas de color 16-bit
 * para Galaxia Matemática.
 */
(function (root) {
  'use strict';

  const WEAPONS = {
    laser: {
      id: 'laser',
      label: 'Láser Pulsos',
      shortLabel: 'Láser',
      icon: '⚡',
      damage: 20,
      time: 12,
      color: '#38bdf8',
      glow: '#e0f2fe',
      desc: 'Daño: 20 • 12s'
    },
    plasma: {
      id: 'plasma',
      label: 'Cañón Plasma',
      shortLabel: 'Plasma',
      icon: '🟣',
      damage: 25,
      time: 10,
      color: '#c084fc',
      glow: '#f5d0fe',
      desc: 'Daño: 25 • 10s'
    },
    missile: {
      id: 'missile',
      label: 'Misil Fotón',
      shortLabel: 'Misiles',
      icon: '🚀',
      damage: 30,
      time: 8,
      color: '#fb923c',
      glow: '#fef08a',
      desc: 'Daño: 30 • 8s'
    }
  };

  const HULLS = {
    interceptor: {
      id: 'interceptor',
      label: 'Interceptor',
      fullLabel: 'Interceptor',
      thrusters: 2,
      desc: 'Caza delta ultrarrápido'
    },
    cruiser: {
      id: 'cruiser',
      label: 'Crucero',
      fullLabel: 'Crucero Estelar',
      thrusters: 3,
      desc: 'Fragata táctica pesada'
    },
    stealth: {
      id: 'stealth',
      label: 'Furtiva',
      fullLabel: 'Furtiva Sigma',
      thrusters: 2,
      desc: 'Casco sigiloso angular'
    },
    dreadnought: {
      id: 'dreadnought',
      label: 'Acorazado',
      fullLabel: 'Acorazado',
      thrusters: 4,
      desc: 'Nave capital blindada'
    }
  };

  const SHIELDS = {
    light: {
      id: 'light',
      label: 'Alas Ligeras',
      shortLabel: 'Ligeras',
      desc: 'Aletas rápidas con balizas'
    },
    titanium: {
      id: 'titanium',
      label: 'Titanio Reforzado',
      shortLabel: 'Titanio',
      desc: 'Placas remachadas pesadas'
    },
    plasma: {
      id: 'plasma',
      label: 'Escudo de Plasma',
      shortLabel: 'Plasma',
      desc: 'Barrera hexagonal activa'
    },
    quantum: {
      id: 'quantum',
      label: 'Placas Cuánticas',
      shortLabel: 'Cuánticas',
      desc: 'Alerones de fase cuántica'
    }
  };

  const PALETTES = {
    metal: {
      outline: '#070b14',
      deep: '#111827',
      dark: '#1e293b',
      midDark: '#334155',
      mid: '#64748b',
      light: '#94a3b8',
      bright: '#cbd5e1',
      shine: '#f8fafc'
    },
    obsidian: {
      outline: '#04060d',
      deep: '#0b1120',
      dark: '#131c31',
      midDark: '#1e293b',
      mid: '#334155',
      light: '#475569',
      bright: '#64748b',
      shine: '#94a3b8'
    },
    teams: {
      1: {
        name: 'Flota Cian',
        outline: '#041a2b',
        deep: '#0c4a6e',
        dark: '#0369a1',
        main: '#0284c7',
        light: '#38bdf8',
        bright: '#67e8f9',
        glow: '#e0f2fe',
        cockpitDeep: '#083344',
        cockpitMid: '#06b6d4',
        cockpitBright: '#a5f3fc',
        cockpitShine: '#ffffff',
        thrusterCore: '#ffffff',
        thrusterMid: '#67e8f9',
        thrusterOuter: '#2563eb',
        shieldLine: '#38bdf8',
        shieldBright: '#a5f3fc',
        beaconA: '#22d3ee',
        beaconB: '#4ade80'
      },
      2: {
        name: 'Flota Carmesí',
        outline: '#2b0512',
        deep: '#881337',
        dark: '#be123c',
        main: '#e11d48',
        light: '#fb7185',
        bright: '#f472b6',
        glow: '#ffe4e6',
        cockpitDeep: '#4c0519',
        cockpitMid: '#f43f5e',
        cockpitBright: '#fbcfe8',
        cockpitShine: '#ffffff',
        thrusterCore: '#ffffff',
        thrusterMid: '#fda4af',
        thrusterOuter: '#c026d3',
        shieldLine: '#fb7185',
        shieldBright: '#fbcfe8',
        beaconA: '#f472b6',
        beaconB: '#facc15'
      }
    }
  };

  const DEFAULT_SHIPS = {
    1: {
      name: 'Valkiria-X',
      hull: 'interceptor',
      shield: 'titanium',
      weapon: 'laser'
    },
    2: {
      name: 'Nébula-9',
      hull: 'stealth',
      shield: 'plasma',
      weapon: 'plasma'
    }
  };

  root.EspacialData = {
    WEAPONS,
    HULLS,
    SHIELDS,
    PALETTES,
    DEFAULT_SHIPS
  };
})(typeof window !== 'undefined' ? window : globalThis);
