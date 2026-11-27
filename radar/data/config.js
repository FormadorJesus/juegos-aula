/**
 * radar/data/config.js
 * Configuración base de Operación Radar Subterráneo:
 * coordenadas por defecto, constantes de profundidad y definición de cuadrillas.
 */
(function (root) {
  'use strict';

  const DEFAULT_ANSWERS = [-4, -5, 2, -18, -23]; // Posición final exacta: -48 m
  const TOTAL_TRAMOS = 5;
  const MAX_DEPTH_VISUAL = 15;   // +15 m (parte superior de la regla)
  const MIN_DEPTH_VISUAL = -65;  // -65 m (parte inferior de la regla)
  const ANOMALY_ZONE_TOP = -42;
  const ANOMALY_ZONE_BOTTOM = -54;

  const CREWS_CONFIG = [
    {
      id: 0,
      name: 'Cuadrilla 1',
      accentHex: '#e11d48',
      lightHex: '#fb7185',
      darkHex: '#9f1239',
      helmetMain: '#e11d48',
      helmetLight: '#fda4af',
      helmetDark: '#881337',
      visorHex: '#38bdf8',
      badgeHex: '#fde047',
      tool: 'pickaxe',
      crystalColor: 'cyan',
      bgTint: 'rgba(225, 29, 72, 0.14)',
      borderClass: 'border-rose-600/60',
      badgeClass: 'bg-rose-600 text-white'
    },
    {
      id: 1,
      name: 'Cuadrilla 2',
      accentHex: '#2563eb',
      lightHex: '#60a5fa',
      darkHex: '#1d4ed8',
      helmetMain: '#2563eb',
      helmetLight: '#93c5fd',
      helmetDark: '#1e3a8a',
      visorHex: '#67e8f9',
      badgeHex: '#34d399',
      tool: 'drill',
      crystalColor: 'emerald',
      bgTint: 'rgba(37, 99, 235, 0.14)',
      borderClass: 'border-blue-500/60',
      badgeClass: 'bg-blue-600 text-white'
    },
    {
      id: 2,
      name: 'Cuadrilla 3',
      accentHex: '#10b981',
      lightHex: '#6ee7b7',
      darkHex: '#047857',
      helmetMain: '#10b981',
      helmetLight: '#a7f3d0',
      helmetDark: '#065f46',
      visorHex: '#fde047',
      badgeHex: '#22d3ee',
      tool: 'pickaxe',
      crystalColor: 'violet',
      bgTint: 'rgba(16, 185, 129, 0.14)',
      borderClass: 'border-emerald-500/60',
      badgeClass: 'bg-emerald-600 text-white'
    },
    {
      id: 3,
      name: 'Cuadrilla 4',
      accentHex: '#f59e0b',
      lightHex: '#fcd34d',
      darkHex: '#b45309',
      helmetMain: '#f59e0b',
      helmetLight: '#fef08a',
      helmetDark: '#92400e',
      visorHex: '#22d3ee',
      badgeHex: '#fb7185',
      tool: 'drill',
      crystalColor: 'amber',
      bgTint: 'rgba(245, 158, 11, 0.14)',
      borderClass: 'border-amber-500/60',
      badgeClass: 'bg-amber-500 text-stone-950'
    }
  ];

  root.RadarConfig = {
    DEFAULT_ANSWERS,
    TOTAL_TRAMOS,
    MAX_DEPTH_VISUAL,
    MIN_DEPTH_VISUAL,
    ANOMALY_ZONE_TOP,
    ANOMALY_ZONE_BOTTOM,
    CREWS_CONFIG
  };
})(typeof window !== 'undefined' ? window : globalThis);
