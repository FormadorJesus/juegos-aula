/**
 * Espacial/js/pixel-art.js
 * Motor de gráficos Pixel Art 16-bit animado para Galaxia Matemática:
 * - Naves espaciales detalladas en rejilla 64×48 con sombreado metálico,
 *   dithering, líneas de panel, reflejos de cabina y animaciones multi-frame (~9 FPS).
 * - Fondo espacial animado 320×180 con estrellas centelleantes, nebulosas parallax
 *   y planeta anillado en pixel art.
 * - Efectos de combate 240×120: rayos láser, orbes de plasma, ráfagas de misiles
 *   teledirigidos y explosiones pixel-art multi-frame.
 */
(function (root) {
  'use strict';

  const SHIP_W = 64;
  const SHIP_H = 48;
  const BG_W = 320;
  const BG_H = 180;
  const FX_W = 240;
  const FX_H = 120;

  // Matriz Bayer 2x2 para dithering retro 16-bit
  const BAYER2 = [
    [0, 2],
    [3, 1]
  ];

  function getPalettes() {
    const data = root.EspacialData;
    if (data && data.PALETTES) return data.PALETTES;
    return {
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
          outline: '#041a2b', deep: '#0c4a6e', dark: '#0369a1', main: '#0284c7',
          light: '#38bdf8', bright: '#67e8f9', glow: '#e0f2fe',
          cockpitDeep: '#083344', cockpitMid: '#06b6d4', cockpitBright: '#a5f3fc', cockpitShine: '#ffffff',
          thrusterCore: '#ffffff', thrusterMid: '#67e8f9', thrusterOuter: '#2563eb',
          shieldLine: '#38bdf8', shieldBright: '#a5f3fc', beaconA: '#22d3ee', beaconB: '#4ade80'
        },
        2: {
          outline: '#2b0512', deep: '#881337', dark: '#be123c', main: '#e11d48',
          light: '#fb7185', bright: '#f472b6', glow: '#ffe4e6',
          cockpitDeep: '#4c0519', cockpitMid: '#f43f5e', cockpitBright: '#fbcfe8', cockpitShine: '#ffffff',
          thrusterCore: '#ffffff', thrusterMid: '#fda4af', thrusterOuter: '#c026d3',
          shieldLine: '#fb7185', shieldBright: '#fbcfe8', beaconA: '#f472b6', beaconB: '#facc15'
        }
      }
    };
  }

  /* ==========================================================================
   * PRIMITIVAS DE DIBUJO PIXEL-PERFECT
   * ========================================================================== */
  function createBrush(ctx, width, height, flipX, ox, oy) {
    const offsetX = ox || 0;
    const offsetY = oy || 0;

    function px(x, y, color, alpha) {
      const ix = Math.round(x + offsetX);
      const iy = Math.round(y + offsetY);
      if (ix < 0 || ix >= width || iy < 0 || iy >= height) return;
      const drawX = flipX ? (width - 1 - ix) : ix;
      if (alpha !== undefined && alpha < 1) {
        const prev = ctx.globalAlpha;
        ctx.globalAlpha = prev * alpha;
        ctx.fillStyle = color;
        ctx.fillRect(drawX, iy, 1, 1);
        ctx.globalAlpha = prev;
      } else {
        ctx.fillStyle = color;
        ctx.fillRect(drawX, iy, 1, 1);
      }
    }

    function hline(x, y, len, color, alpha) {
      if (len <= 0) return;
      for (let i = 0; i < len; i++) {
        px(x + i, y, color, alpha);
      }
    }

    function vline(x, y, len, color, alpha) {
      if (len <= 0) return;
      for (let i = 0; i < len; i++) {
        px(x, y + i, color, alpha);
      }
    }

    function rect(x, y, w, h, color, alpha) {
      for (let j = 0; j < h; j++) {
        for (let i = 0; i < w; i++) {
          px(x + i, y + j, color, alpha);
        }
      }
    }

    function ditherRect(x, y, w, h, c1, c2, density) {
      const d = density === undefined ? 2 : density; // 1=25%, 2=50%, 3=75%
      for (let j = 0; j < h; j++) {
        for (let i = 0; i < w; i++) {
          const threshold = BAYER2[(y + j) & 1][(x + i) & 1];
          const col = threshold < d ? c2 : c1;
          if (col) px(x + i, y + j, col);
        }
      }
    }

    function line(x0, y0, x1, y1, color, alpha) {
      let ix0 = Math.round(x0);
      let iy0 = Math.round(y0);
      const ix1 = Math.round(x1);
      const iy1 = Math.round(y1);
      const dx = Math.abs(ix1 - ix0);
      const dy = Math.abs(iy1 - iy0);
      const sx = ix0 < ix1 ? 1 : -1;
      const sy = iy0 < iy1 ? 1 : -1;
      let err = dx - dy;

      while (true) {
        px(ix0, iy0, color, alpha);
        if (ix0 === ix1 && iy0 === iy1) break;
        const e2 = err * 2;
        if (e2 > -dy) { err -= dy; ix0 += sx; }
        if (e2 < dx) { err += dx; iy0 += sy; }
      }
    }

    function fillPoly(points, colorFn) {
      if (!points || points.length < 3) return;
      let minY = height;
      let maxY = 0;
      for (let i = 0; i < points.length; i++) {
        if (points[i][1] < minY) minY = points[i][1];
        if (points[i][1] > maxY) maxY = points[i][1];
      }
      minY = Math.max(0, Math.floor(minY));
      maxY = Math.min(height - 1, Math.ceil(maxY));

      for (let y = minY; y <= maxY; y++) {
        const nodes = [];
        let j = points.length - 1;
        for (let i = 0; i < points.length; i++) {
          const yi = points[i][1];
          const yj = points[j][1];
          const xi = points[i][0];
          const xj = points[j][0];
          if ((yi < y + 0.5 && yj >= y + 0.5) || (yj < y + 0.5 && yi >= y + 0.5)) {
            nodes.push(xi + ((y + 0.5 - yi) / (yj - yi)) * (xj - xi));
          }
          j = i;
        }
        nodes.sort((a, b) => a - b);
        for (let k = 0; k < nodes.length - 1; k += 2) {
          const xStart = Math.max(0, Math.floor(nodes[k]));
          const xEnd = Math.min(width - 1, Math.ceil(nodes[k + 1]));
          for (let x = xStart; x <= xEnd; x++) {
            const col = typeof colorFn === 'function' ? colorFn(x, y) : colorFn;
            if (col) px(x, y, col);
          }
        }
      }
    }

    function strokePoly(points, color, alpha) {
      for (let i = 0; i < points.length; i++) {
        const a = points[i];
        const b = points[(i + 1) % points.length];
        line(a[0], a[1], b[0], b[1], color, alpha);
      }
    }

    function fillEllipse(cx, cy, rx, ry, colorFn) {
      const x0 = Math.floor(cx - rx);
      const x1 = Math.ceil(cx + rx);
      const y0 = Math.floor(cy - ry);
      const y1 = Math.ceil(cy + ry);
      for (let y = y0; y <= y1; y++) {
        for (let x = x0; x <= x1; x++) {
          const nx = (x - cx) / rx;
          const ny = (y - cy) / ry;
          if (nx * nx + ny * ny <= 1) {
            const col = typeof colorFn === 'function' ? colorFn(x, y, nx, ny) : colorFn;
            if (col) px(x, y, col);
          }
        }
      }
    }

    function star4(cx, cy, radius, coreColor, armColor) {
      px(cx, cy, coreColor);
      for (let r = 1; r <= radius; r++) {
        const c = r === 1 ? coreColor : armColor;
        px(cx + r, cy, c);
        px(cx - r, cy, c);
        px(cx, cy + r, c);
        px(cx, cy - r, c);
      }
    }

    return { px, hline, vline, rect, ditherRect, line, fillPoly, strokePoly, fillEllipse, star4 };
  }

  /* ==========================================================================
   * RENDERIZADOR DE NAVES 16-BIT (64×48)
   * ========================================================================== */
  function drawThrusterPlume(b, nozzleX, nozzleY, height, team, state, frame, seed) {
    const f = (frame + seed) % 4;
    if (state === 'defeat') {
      // Propulsor averiado chisporroteando
      if (f === 0 || f === 2) {
        b.hline(nozzleX - 3, nozzleY, 3, '#f97316');
        b.px(nozzleX - 1, nozzleY, '#fef08a');
      }
      if (f === 1) {
        b.px(nozzleX - 4, nozzleY - 1, '#64748b');
        b.px(nozzleX - 6, nozzleY - 2, '#475569');
      }
      return;
    }

    const isVictory = state === 'victory';
    const isAttack = state === 'attack';
    const baseLen = isVictory ? 12 : (isAttack ? 11 : 7);
    const lenVariance = [0, 3, 1, 2][f];
    const totalLen = baseLen + lenVariance;

    const cCore = isVictory ? '#ffffff' : team.thrusterCore;
    const cMid = isVictory ? '#fde047' : team.thrusterMid;
    const cOuter = isVictory ? '#f97316' : team.thrusterOuter;

    // Llama exterior
    for (let dx = 1; dx <= totalLen; dx++) {
      const progress = dx / totalLen;
      const spread = progress < 0.35 ? Math.floor(height / 2) : (progress < 0.72 ? Math.max(0, Math.floor(height / 2) - 1) : 0);
      const col = progress < 0.28 ? cCore : (progress < 0.68 ? cMid : cOuter);
      for (let dy = -spread; dy <= spread; dy++) {
        // Dithering en la cola del propulsor
        if (progress > 0.75 && ((dx + dy + frame) & 1) === 0) continue;
        b.px(nozzleX - dx, nozzleY + dy, col);
      }
    }

    // Chispa iónica desprendida
    const sparkDist = totalLen + 1 + ((frame + seed) % 3);
    b.px(nozzleX - sparkDist, nozzleY + (seed % 2 === 0 ? 0 : -1), cMid, 0.85);
  }

  function drawWingsAndShieldBase(b, config, metal, team, frame, state) {
    const shield = config.shield || 'titanium';
    const beaconBlink = Math.floor(frame / 3) % 2 === 0;
    const beaconColTop = beaconBlink ? team.beaconA : team.beaconB;
    const beaconColBot = beaconBlink ? team.beaconB : team.beaconA;

    if (shield === 'light') {
      // Alas ligeras barridas hacia atrás con balizas en las puntas
      const topWing = [[17, 19], [28, 7], [36, 9], [31, 19]];
      const botWing = [[17, 28], [28, 40], [36, 38], [31, 28]];

      const shadeTop = (x, y) => {
        if (y <= 10) return team.bright;
        if (y <= 13) return ((x + y) & 1) ? team.light : team.main;
        return x < 26 ? metal.mid : team.dark;
      };
      const shadeBot = (x, y) => {
        if (y >= 37) return team.dark;
        if (y >= 34) return ((x + y) & 1) ? team.main : team.dark;
        return x < 26 ? metal.dark : team.main;
      };

      b.fillPoly(topWing, shadeTop);
      b.strokePoly(topWing, metal.outline);
      b.line(29, 8, 35, 10, team.glow); // borde de ataque luminoso

      b.fillPoly(botWing, shadeBot);
      b.strokePoly(botWing, metal.outline);
      b.line(29, 39, 35, 37, team.light);

      // Balizas parpadeantes en las puntas
      b.px(28, 7, beaconColTop);
      b.px(28, 40, beaconColBot);
      if (beaconBlink && state !== 'defeat') {
        b.px(28, 6, '#ffffff', 0.85);
        b.px(27, 7, beaconColTop, 0.65);
        b.px(29, 7, beaconColTop, 0.65);
      } else if (state !== 'defeat') {
        b.px(28, 41, '#ffffff', 0.85);
        b.px(27, 40, beaconColBot, 0.65);
      }
    } else if (shield === 'titanium') {
      // Placas anchas de titanio reforzado con remaches y franja de equipo
      const topWing = [[14, 18], [24, 5], [39, 9], [35, 19]];
      const botWing = [[14, 29], [24, 42], [39, 38], [35, 28]];

      const shadeTop = (x, y) => {
        if (y <= 7) return metal.shine;
        if (x >= 26 && x <= 32 && y >= 9 && y <= 16) return ((x + y) & 1) ? team.light : team.main;
        if (y <= 12) return ((x + y) & 1) ? metal.bright : metal.light;
        return metal.mid;
      };
      const shadeBot = (x, y) => {
        if (y >= 40) return metal.dark;
        if (x >= 26 && x <= 32 && y >= 31 && y <= 38) return ((x + y) & 1) ? team.main : team.dark;
        if (y >= 35) return ((x + y) & 1) ? metal.midDark : metal.mid;
        return metal.light;
      };

      b.fillPoly(topWing, shadeTop);
      b.strokePoly(topWing, metal.outline);
      b.fillPoly(botWing, shadeBot);
      b.strokePoly(botWing, metal.outline);

      // Líneas de panel y remaches metálicos
      b.line(20, 14, 34, 14, metal.midDark);
      b.line(20, 33, 34, 33, metal.dark);
      b.px(24, 7, metal.dark);
      b.px(35, 10, metal.dark);
      b.px(24, 40, metal.deep);
      b.px(35, 37, metal.deep);

      // Borde luminoso + balizas de titanio
      b.line(25, 6, 38, 9, metal.shine);
      b.px(38, 9, beaconColTop);
      b.px(38, 38, beaconColBot);
    } else if (shield === 'plasma') {
      // Pilones emisores elegantes de escudo de plasma
      const topPylon = [[16, 18], [26, 8], [38, 12], [33, 19]];
      const botPylon = [[16, 29], [26, 39], [38, 35], [33, 28]];

      b.fillPoly(topPylon, (x, y) => (y < 12 ? team.bright : (((x + y) & 1) ? team.main : metal.midDark)));
      b.strokePoly(topPylon, metal.outline);
      b.fillPoly(botPylon, (x, y) => (y > 35 ? team.deep : (((x + y) & 1) ? team.dark : metal.dark)));
      b.strokePoly(botPylon, metal.outline);

      // Nodos emisores de plasma pulsantes
      const nodeGlow = frame % 2 === 0 ? '#ffffff' : team.bright;
      b.rect(25, 8, 3, 2, team.light);
      b.px(26, 8, nodeGlow);
      b.rect(25, 37, 3, 2, team.light);
      b.px(26, 38, nodeGlow);
    } else {
      // Placas cuánticas flotantes con puentes de energía chispeantes
      const topPod = [[16, 11], [25, 4], [40, 7], [36, 13]];
      const botPod = [[16, 36], [25, 43], [40, 40], [36, 34]];

      b.fillPoly(topPod, (x, y) => (y <= 6 ? metal.bright : (((x + y) & 1) ? metal.dark : metal.midDark)));
      b.strokePoly(topPod, team.light);
      b.fillPoly(botPod, (x, y) => (y >= 41 ? metal.deep : (((x + y) & 1) ? metal.deep : metal.dark)));
      b.strokePoly(botPod, team.light);

      // Franja de energía cuántica interna
      b.line(23, 8, 37, 10, team.bright);
      b.line(23, 39, 37, 37, team.bright);

      // Arcos cuánticos animados entre el fuselaje y las placas flotantes
      if (state !== 'defeat') {
        const arcShift = frame % 3;
        b.line(24 + arcShift, 13, 25, 18, team.glow);
        b.line(32 - arcShift, 13, 31, 18, team.bright);
        b.line(24 + arcShift, 34, 25, 29, team.glow);
        b.line(32 - arcShift, 34, 31, 29, team.bright);
        b.px(22 + (frame % 14), 6, '#ffffff', 0.9);
        b.px(36 - (frame % 14), 41, '#ffffff', 0.9);
      }
    }
  }

  function drawWeapons(b, config, metal, team, frame, state) {
    const weapon = config.weapon || 'laser';
    const isAttack = state === 'attack';

    if (weapon === 'laser') {
      // Cañones gemelos de láser de precisión con bobinas de enfoque
      [14, 31].forEach((y) => {
        b.rect(35, y, 16, 3, metal.midDark);
        b.hline(35, y, 16, metal.bright);
        b.hline(35, y + 2, 16, metal.outline);
        // Bobinas de enfriamiento cian
        b.px(41, y + 1, '#38bdf8');
        b.px(44, y + 1, '#38bdf8');
        b.px(47, y + 1, '#67e8f9');
        // Boquilla emisora
        const tipCol = isAttack || (frame % 4 === 0) ? '#ffffff' : '#38bdf8';
        b.rect(51, y, 3, 3, '#0284c7');
        b.px(52, y + 1, tipCol);
        b.px(53, y + 1, '#e0f2fe');
      });
    } else if (weapon === 'plasma') {
      // Contenedores magnéticos con orbes de plasma giratorios
      [13, 31].forEach((y, idx) => {
        b.rect(32, y, 14, 4, metal.dark);
        b.hline(32, y, 13, metal.light);
        b.hline(32, y + 3, 14, metal.outline);
        // Pinzas magnéticas abiertas
        b.hline(46, y, 4, '#c084fc');
        b.hline(46, y + 3, 4, '#9333ea');
        // Orbe de plasma pulsante
        const pulse = (frame + idx) % 3;
        const orbCore = pulse === 0 || isAttack ? '#ffffff' : '#f5d0fe';
        b.rect(46, y + 1, 3, 2, '#d946ef');
        b.px(47, y + 1, orbCore);
        if (pulse === 1 || isAttack) {
          b.px(49, y + 1, '#e879f9');
          b.px(49, y + 2, '#c084fc');
        }
      });
    } else {
      // Lanzadores pesados de misiles fotónicos con ojivas naranjas visibles
      [12, 31].forEach((y) => {
        b.rect(30, y, 15, 5, metal.midDark);
        b.hline(30, y, 15, metal.bright);
        b.hline(30, y + 4, 15, metal.outline);
        b.vline(30, y, 5, metal.outline);
        // Rejillas de escape traseras
        b.px(32, y + 2, metal.deep);
        b.px(34, y + 2, metal.deep);
        b.px(36, y + 2, team.light);
        // Ojiva del misil sobresaliendo
        b.rect(45, y + 1, 3, 3, '#f97316');
        b.px(46, y + 1, '#fde047');
        b.px(48, y + 2, '#ef4444');
        b.px(49, y + 2, isAttack ? '#ffffff' : '#fde047');
      });
    }
  }

  function drawHull(b, config, palettes, team, frame, state) {
    const hull = config.hull || 'interceptor';
    const metal = hull === 'stealth' ? palettes.obsidian : palettes.metal;

    if (hull === 'interceptor') {
      // Toberas gemelas traseras
      b.rect(12, 20, 4, 3, metal.dark);
      b.rect(12, 25, 4, 3, metal.dark);
      b.vline(12, 20, 3, metal.outline);
      b.vline(12, 25, 3, metal.outline);

      // Fuselaje afilado tipo caza delta
      const body = [[14, 19], [36, 17], [58, 24], [36, 31], [14, 29]];
      b.fillPoly(body, (x, y) => {
        if (y <= 19) return metal.shine;
        if (y <= 21) return ((x + y) & 1) ? metal.bright : metal.light;
        if (y <= 25) return metal.light;
        if (y <= 27) return ((x + y) & 1) ? metal.mid : metal.midDark;
        return metal.dark;
      });
      b.strokePoly(body, metal.outline);

      // Franja deportiva de equipo a lo largo del lomo
      const stripe = [[18, 21], [45, 23], [45, 25], [18, 27]];
      b.fillPoly(stripe, (x, y) => (y <= 23 ? team.light : team.main));
      b.hline(46, 24, 9, team.bright);

      // Cabina burbuja con reflejo especular
      b.fillEllipse(37, 24, 7, 3, (x, y, nx, ny) => {
        if (ny < -0.35 && nx < 0.3) return team.cockpitShine;
        if (ny < 0.15) return team.cockpitBright;
        if (ny < 0.55) return team.cockpitMid;
        return team.cockpitDeep;
      });
      b.hline(33, 21, 7, metal.outline);
      b.hline(33, 27, 7, metal.outline);
      // Reflejo diagonal especular animado
      const glintX = 34 + (Math.floor(frame / 4) % 3);
      b.px(glintX, 22, '#ffffff');
      b.px(glintX + 1, 22, '#ffffff');
      b.px(glintX, 23, team.cockpitBright);

      // Líneas de panel y tomas de aire
      b.vline(24, 19, 10, metal.midDark);
      b.px(19, 20, metal.dark);
      b.px(19, 28, metal.dark);
      b.px(56, 24, '#ffffff');
    } else if (hull === 'cruiser') {
      // Toberas triples
      [18, 23, 28].forEach((ny) => {
        b.rect(10, ny, 4, 2, metal.dark);
        b.vline(10, ny, 2, metal.outline);
      });

      // Casco ancho de crucero estelar con mandíbulas delanteras
      const body = [[12, 16], [42, 16], [55, 20], [55, 22], [47, 23], [47, 25], [55, 26], [55, 28], [42, 32], [12, 32]];
      b.fillPoly(body, (x, y) => {
        if (y <= 18) return metal.shine;
        if (y <= 21) return ((x + y) & 1) ? metal.bright : metal.light;
        if (y <= 26) return metal.mid;
        if (y <= 29) return ((x + y) & 1) ? metal.midDark : metal.dark;
        return metal.deep;
      });
      b.strokePoly(body, metal.outline);

      // Núcleo del reactor central entre mandíbulas
      const coreGlow = frame % 2 === 0 ? '#ffffff' : team.bright;
      b.rect(47, 23, 5, 2, team.main);
      b.px(50, 23, coreGlow);
      b.px(51, 24, team.glow);

      // Cubierta blindada de equipo
      b.ditherRect(16, 20, 24, 8, team.main, team.dark, 2);
      b.hline(16, 20, 24, team.light);
      b.hline(16, 27, 24, team.deep);

      // Puente de mando panorámico
      b.rect(32, 21, 11, 6, team.cockpitDeep);
      b.rect(33, 22, 9, 4, team.cockpitMid);
      b.hline(34, 22, 7, team.cockpitBright);
      b.px(35, 22, '#ffffff');
      b.px(36, 22, '#ffffff');
      // Luces parpadeantes del puente
      b.px(39, 24, (frame % 4 < 2) ? '#fde047' : team.glow);
      b.px(41, 24, (frame % 4 >= 2) ? '#4ade80' : team.cockpitBright);

      // Costillas de blindaje y remaches
      b.vline(22, 17, 14, metal.midDark);
      b.vline(28, 17, 14, metal.midDark);
      b.px(15, 18, metal.dark);
      b.px(15, 30, metal.dark);
    } else if (hull === 'stealth') {
      // Toberas ocultas sigilosas
      b.rect(12, 20, 3, 3, metal.deep);
      b.rect(12, 25, 3, 3, metal.deep);

      // Silueta angular de diamante sigiloso
      const body = [[13, 24], [24, 15], [58, 24], [24, 33]];
      b.fillPoly(body, (x, y) => {
        if (y < 20) return ((x + y) & 1) ? metal.light : metal.mid;
        if (y < 24) return metal.midDark;
        if (y < 28) return metal.dark;
        return metal.deep;
      });
      b.strokePoly(body, metal.outline);

      // Ribete neón de equipo en los bordes de ataque
      b.line(25, 16, 56, 23, team.light);
      b.line(25, 32, 56, 25, team.main);

      // Faceta dorsal interna
      const inner = [[20, 24], [28, 19], [46, 24], [28, 29]];
      b.fillPoly(inner, (x, y) => (y < 24 ? metal.mid : metal.dark));
      b.line(28, 19, 46, 24, metal.bright);

      // Visor sigiloso estrecho con brillo láser
      const visor = [[30, 24], [35, 22], [44, 24], [35, 26]];
      b.fillPoly(visor, (x, y) => (y <= 23 ? team.cockpitBright : team.cockpitMid));
      b.px(35, 23, '#ffffff');
      b.px(36, 23, '#ffffff');
      // Escáner móvil en el visor
      const scanX = 33 + (frame % 8);
      if (state !== 'defeat') b.px(scanX, 24, '#ffffff');

      // Rejillas de disipación térmica
      b.px(22, 22, team.bright);
      b.px(22, 26, team.bright);
    } else {
      // Acorazado (Dreadnought): nave capital masiva con 4 propulsores y torre de mando
      [16, 21, 26, 31].forEach((ny) => {
        b.rect(9, ny, 4, 3, metal.dark);
        b.vline(9, ny, 3, metal.outline);
      });

      const body = [[12, 14], [44, 14], [54, 19], [57, 24], [54, 29], [44, 34], [12, 34]];
      b.fillPoly(body, (x, y) => {
        if (y <= 16) return metal.shine;
        if (y <= 19) return ((x + y) & 1) ? metal.bright : metal.light;
        if (y <= 27) return metal.light;
        if (y <= 31) return ((x + y) & 1) ? metal.mid : metal.midDark;
        return metal.dark;
      });
      b.strokePoly(body, metal.outline);

      // Franjas blindadas del equipo
      b.ditherRect(15, 17, 30, 14, team.main, team.dark, 2);
      b.hline(15, 17, 30, team.bright);
      b.hline(15, 30, 30, team.deep);

      // Espolón blindado frontal con líneas de advertencia
      b.rect(47, 19, 6, 10, metal.bright);
      b.line(48, 20, 52, 20, '#fbbf24');
      b.line(48, 28, 52, 28, '#fbbf24');
      b.vline(53, 21, 6, metal.shine);

      // Puente acorazado + antena radar parpadeante
      b.rect(28, 19, 14, 10, metal.midDark);
      b.rect(29, 20, 12, 8, team.cockpitDeep);
      b.rect(31, 21, 9, 6, team.cockpitMid);
      b.hline(32, 21, 7, team.cockpitBright);
      b.px(33, 21, '#ffffff');
      b.px(34, 21, '#ffffff');
      b.vline(24, 11, 5, metal.bright);
      b.px(24, 10, (frame % 4 < 2) ? '#f43f5e' : '#fde047');

      // Ventilaciones del reactor pulsantes en el costado
      const ventCol = (frame % 3 === 0) ? '#ffffff' : team.bright;
      [18, 21, 24].forEach((vx) => {
        b.vline(vx, 22, 4, team.deep);
        b.px(vx, 23, ventCol);
        b.px(vx, 24, team.light);
      });
    }
  }

  function drawPlasmaShieldOverlay(b, team, frame) {
    // Barrera energética hexagonal brillante alrededor de la nave
    const cx = 34;
    const cy = 24;
    const rx = 27;
    const ry = 20;
    const scanAngle = (frame * 0.55) % (Math.PI * 2);

    for (let deg = 0; deg < 360; deg += 7) {
      const rad = (deg * Math.PI) / 180;
      const pxX = Math.round(cx + Math.cos(rad) * rx);
      const pxY = Math.round(cy + Math.sin(rad) * ry);
      const angDiff = Math.abs(Math.atan2(Math.sin(rad - scanAngle), Math.cos(rad - scanAngle)));
      const isHot = angDiff < 0.55;
      const dashOn = ((deg + frame * 12) % 24) < 16;
      if (!dashOn && !isHot) continue;
      b.px(pxX, pxY, isHot ? '#ffffff' : team.shieldBright, isHot ? 0.95 : 0.65);
      if (isHot) {
        b.px(pxX - 1, pxY, team.shieldLine, 0.55);
      }
    }

    // Destellos de celdas hexagonales internas
    const hexPts = [
      [20, 12], [46, 13], [52, 24], [46, 35], [20, 36], [12, 24]
    ];
    const activeHex = hexPts[frame % hexPts.length];
    b.px(activeHex[0], activeHex[1], '#ffffff', 0.8);
    b.px(activeHex[0] + 1, activeHex[1] - 1, team.shieldBright, 0.5);
    b.px(activeHex[0] + 1, activeHex[1] + 1, team.shieldBright, 0.5);
  }

  function drawStateEffects(b, config, team, state, frame) {
    if (state === 'attack') {
      // Carga de energía y destello en las bocas de las armas
      const w = config.weapon || 'laser';
      const glowA = w === 'plasma' ? '#e879f9' : (w === 'missile' ? '#f97316' : '#38bdf8');
      const glowB = w === 'plasma' ? '#ffffff' : (w === 'missile' ? '#fde047' : '#ffffff');
      const tipX = w === 'laser' ? 54 : 50;
      const ys = w === 'laser' ? [15, 32] : [14, 33];
      const rad = frame % 2 === 0 ? 4 : 3;

      ys.forEach((ty) => {
        b.star4(tipX, ty, rad, glowB, glowA);
        b.px(tipX + 2, ty - 2, glowA);
        b.px(tipX + 2, ty + 2, glowA);
        b.hline(tipX + 1, ty, 5 + (frame % 3), glowB);
      });
    } else if (state === 'hit') {
      // Chispas de alerta rojas/naranjas, humo y restos metálicos
      const sparks = [
        [24, 15], [38, 13], [46, 22], [32, 34], [20, 31], [42, 30], [28, 22]
      ];
      sparks.forEach((pt, idx) => {
        const dx = ((frame * 2 + idx * 3) % 7) - 3;
        const dy = ((frame + idx * 2) % 5) - 2;
        const col = (frame + idx) % 2 === 0 ? '#fef08a' : '#f43f5e';
        b.px(pt[0] + dx, pt[1] + dy, col);
        b.px(pt[0] + dx + 1, pt[1] + dy, '#fb923c', 0.8);
      });
      // Nube de humo del impacto
      const smokeX = 34 + (frame % 3);
      const smokeY = 18 - (frame % 4);
      b.rect(smokeX, smokeY, 3, 2, '#94a3b8', 0.75);
      b.px(smokeX - 2, smokeY + 2, '#475569', 0.7);
    } else if (state === 'victory') {
      // Estrellas doradas de hipervelocidad orbitando la nave
      const orbPts = [
        [14, 10], [52, 11], [56, 25], [48, 38], [16, 37], [34, 6]
      ];
      orbPts.forEach((pt, idx) => {
        const phase = (frame + idx) % 6;
        if (phase < 3) {
          b.star4(pt[0], pt[1], phase === 1 ? 2 : 1, '#ffffff', '#fde047');
        } else {
          b.px(pt[0], pt[1], '#fbbf24');
        }
      });
    } else if (state === 'defeat') {
      // Grietas oscuras en el casco
      b.line(25, 20, 32, 26, '#020617');
      b.line(32, 26, 38, 22, '#020617');
      b.line(32, 26, 30, 30, '#450a0a');
      b.line(40, 23, 45, 27, '#020617');
      b.px(32, 25, '#ef4444');
      b.px(41, 24, '#f97316');

      // Columnas de humo pixelado ascendiendo
      for (let i = 0; i < 4; i++) {
        const rise = (frame + i * 3) % 12;
        const sx = 28 + i * 5 + Math.round(Math.sin((frame + i) * 0.7) * 2);
        const sy = 22 - rise;
        const smokeCol = rise < 4 ? '#334155' : (rise < 8 ? '#475569' : '#64748b');
        b.rect(sx, sy, rise > 6 ? 3 : 2, 2, smokeCol, 0.8);
      }

      // Arcos eléctricos intermitentes por cortocircuito
      if (frame % 3 !== 0) {
        const ax = 24 + (frame * 5) % 20;
        const ay = 19 + (frame * 3) % 8;
        b.line(ax, ay, ax + 3, ay - 2, '#67e8f9');
        b.line(ax + 3, ay - 2, ax + 5, ay + 1, '#fde047');
        b.px(ax + 3, ay - 2, '#ffffff');
      }
    }
  }

  function renderShipCanvas(entry, globalFrame) {
    const { canvas, ctx, config, playerNum, state, stateFrame } = entry;
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, SHIP_W, SHIP_H);

    const palettes = getPalettes();
    const team = palettes.teams[playerNum] || palettes.teams[1];
    const metal = config.hull === 'stealth' ? palettes.obsidian : palettes.metal;
    const flipX = playerNum === 2;
    const f = globalFrame;

    // Desplazamiento animado según estado
    let ox = 0;
    let oy = 0;
    if (state === 'idle') {
      oy = [0, 0, -1, -1, 0, 1, 1, 0][(f + playerNum * 3) % 8];
    } else if (state === 'attack') {
      ox = stateFrame < 2 ? -3 : (stateFrame < 4 ? -2 : -1);
    } else if (state === 'hit') {
      ox = (f % 2 === 0 ? -2 : 2);
      oy = (f % 3 === 0 ? -1 : 1);
    } else if (state === 'victory') {
      oy = [0, -1, -2, -2, -1, 0, -1, -2][f % 8];
    } else if (state === 'defeat') {
      oy = 3;
    }

    const b = createBrush(ctx, SHIP_W, SHIP_H, flipX, ox, oy);

    // 1. Aura dorada trasera en victoria
    if (state === 'victory') {
      const pulseR = 19 + (f % 3);
      b.fillEllipse(34, 24, pulseR + 6, pulseR - 2, (x, y, nx, ny) => {
        const dist = nx * nx + ny * ny;
        if (dist > 0.72 && ((x + y + f) & 1) === 0) return '#fde047';
        if (dist > 0.45 && ((x + y) & 1) === 0 && ((x + f) & 2) === 0) return '#f59e0b';
        return null;
      });
    }

    // 2. Estelas de propulsores iónicos (2, 3 o 4 según chasis)
    const hull = config.hull || 'interceptor';
    if (hull === 'cruiser') {
      drawThrusterPlume(b, 10, 18, 2, team, state, f, 0);
      drawThrusterPlume(b, 10, 23, 3, team, state, f, 1);
      drawThrusterPlume(b, 10, 28, 2, team, state, f, 2);
    } else if (hull === 'dreadnought') {
      drawThrusterPlume(b, 9, 17, 2, team, state, f, 0);
      drawThrusterPlume(b, 9, 22, 2, team, state, f, 1);
      drawThrusterPlume(b, 9, 27, 2, team, state, f, 2);
      drawThrusterPlume(b, 9, 32, 2, team, state, f, 3);
    } else {
      drawThrusterPlume(b, 12, 21, 3, team, state, f, 0);
      drawThrusterPlume(b, 12, 26, 3, team, state, f, 2);
    }

    // 3. Alas y blindaje
    drawWingsAndShieldBase(b, config, metal, team, f, state);

    // 4. Armamento montado
    drawWeapons(b, config, metal, team, f, state);

    // 5. Chasis y cabina
    drawHull(b, config, palettes, team, f, state);

    // 6. Barrera de escudo de plasma superpuesta
    if (config.shield === 'plasma' && state !== 'defeat') {
      drawPlasmaShieldOverlay(b, team, f);
    }

    // 7. Destello de impacto (flash blanco/carmesí sobre la silueta)
    if (state === 'hit' && f % 2 === 0) {
      ctx.save();
      ctx.globalCompositeOperation = 'source-atop';
      ctx.fillStyle = f % 4 === 0 ? 'rgba(255, 255, 255, 0.72)' : 'rgba(244, 63, 94, 0.55)';
      ctx.fillRect(0, 0, SHIP_W, SHIP_H);
      ctx.restore();
    }

    // 8. Efectos específicos de estado (fogonazo, chispas, humo, arcos, estrellas)
    drawStateEffects(b, config, team, state, f);

    // Oscurecimiento ligero en derrota
    if (state === 'defeat') {
      ctx.save();
      ctx.globalCompositeOperation = 'source-atop';
      ctx.fillStyle = 'rgba(15, 23, 42, 0.34)';
      ctx.fillRect(0, 0, SHIP_W, SHIP_H);
      ctx.restore();
    }
  }

  /* ==========================================================================
   * FONDO ESPACIAL PIXEL-ART ANIMADO (320×180)
   * ========================================================================== */
  let bgState = null;

  function buildStaticSpaceLayer() {
    const off = document.createElement('canvas');
    off.width = BG_W;
    off.height = BG_H;
    const octx = off.getContext('2d');
    octx.imageSmoothingEnabled = false;

    // Degradado espacial vertical con dithering Bayer 2x2
    const stops = ['#030612', '#070d24', '#0d183b', '#121f4a', '#0a122e', '#040714'];
    for (let y = 0; y < BG_H; y++) {
      const t = (y / BG_H) * (stops.length - 1);
      const idx = Math.min(stops.length - 2, Math.floor(t));
      const frac = t - idx;
      const dLevel = Math.floor(frac * 4);
      for (let x = 0; x < BG_W; x++) {
        const col = BAYER2[y & 1][x & 1] < dLevel ? stops[idx + 1] : stops[idx];
        octx.fillStyle = col;
        octx.fillRect(x, y, 1, 1);
      }
    }

    // Luna rojiza con cráteres pixelados (arriba a la izquierda)
    const moonCx = 48;
    const moonCy = 38;
    const moonR = 11;
    for (let y = moonCy - moonR; y <= moonCy + moonR; y++) {
      for (let x = moonCx - moonR; x <= moonCx + moonR; x++) {
        const dx = x - moonCx;
        const dy = y - moonCy;
        if (dx * dx + dy * dy <= moonR * moonR) {
          const light = (-dx * 0.65 - dy * 0.55) / moonR;
          let col = '#4c0519';
          if (light > 0.45) col = '#fda4af';
          else if (light > 0.1) col = ((x + y) & 1) ? '#fb7185' : '#e11d48';
          else if (light > -0.22) col = ((x + y) & 1) ? '#be123c' : '#881337';
          octx.fillStyle = col;
          octx.fillRect(x, y, 1, 1);
        }
      }
    }
    // Cráteres de la luna
    [[44, 35, 2], [51, 41, 2], [47, 43, 1]].forEach(([cx, cy, r]) => {
      octx.fillStyle = '#4c0519';
      octx.fillRect(cx, cy, r + 1, r);
      octx.fillStyle = '#fda4af';
      octx.fillRect(cx, cy - 1, r, 1);
    });

    // Planeta gigante gaseoso con anillos pixelados (arriba a la derecha)
    const pCx = 258;
    const pCy = 46;
    const pR = 21;

    function drawRingPixel(rx, ry, isFront) {
      for (let a = 0; a < 360; a += 1) {
        const rad = (a * Math.PI) / 180;
        const sinA = Math.sin(rad);
        if (isFront && sinA < 0) continue;
        if (!isFront && sinA >= 0) continue;
        const lx = Math.cos(rad) * rx;
        const ly = sinA * ry;
        // Rotación de -16 grados
        const rotX = lx * 0.96 - ly * -0.27;
        const rotY = lx * -0.27 + ly * 0.96;
        const pxX = Math.round(pCx + rotX);
        const pxY = Math.round(pCy + rotY);
        if (pxX < 0 || pxX >= BG_W || pxY < 0 || pxY >= BG_H) continue;
        if (((pxX + pxY) & 1) === 0 || rx === 42) {
          octx.fillStyle = rx > 43 ? '#38bdf8' : (rx > 38 ? '#bae6fd' : '#0284c7');
          octx.fillRect(pxX, pxY, 1, 1);
        }
      }
    }

    // Anillo trasero
    [36, 39, 42, 45].forEach((r) => drawRingPixel(r, r * 0.23, false));

    // Esfera del planeta gaseoso con bandas atmosféricas y sombra dither
    for (let y = pCy - pR; y <= pCy + pR; y++) {
      for (let x = pCx - pR; x <= pCx + pR; x++) {
        const dx = x - pCx;
        const dy = y - pCy;
        if (dx * dx + dy * dy <= pR * pR) {
          const shade = (-dx * 0.7 - dy * 0.5) / pR;
          const band = Math.sin((dy + dx * 0.15) * 0.55);
          let col = '#0b1120';
          if (shade > 0.55) {
            col = band > 0 ? '#bae6fd' : '#7dd3fc';
          } else if (shade > 0.15) {
            col = band > 0.2 ? '#38bdf8' : (((x + y) & 1) ? '#0284c7' : '#2563eb');
          } else if (shade > -0.25) {
            col = ((x + y) & 1) ? '#1d4ed8' : '#1e3a8a';
          } else {
            col = ((x + y) & 1) ? '#172554' : '#090d1f';
          }
          octx.fillStyle = col;
          octx.fillRect(x, y, 1, 1);
        }
      }
    }

    // Anillo delantero cruzando sobre el planeta
    [36, 39, 42, 45].forEach((r) => drawRingPixel(r, r * 0.23, true));

    // Rejilla táctica espacial tenue en el borde inferior
    octx.fillStyle = 'rgba(56, 189, 248, 0.14)';
    [146, 156, 168].forEach((gy) => {
      for (let x = 0; x < BG_W; x += 2) {
        octx.fillRect(x, gy, 1, 1);
      }
    });
    const bGrid = createBrush(octx, BG_W, BG_H, false, 0, 0);
    [-120, -60, 0, 60, 120].forEach((offset) => {
      bGrid.line(160 + offset * 0.45, 140, 160 + offset * 1.5, 179, '#38bdf8', 0.12);
    });

    return off;
  }

  function initSpaceBackdrop(canvas) {
    if (!canvas) return;
    canvas.width = BG_W;
    canvas.height = BG_H;
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;

    const stars = [];
    const starColors = ['#ffffff', '#bae6fd', '#fde68a', '#fbcfe8', '#93c5fd'];
    for (let i = 0; i < 96; i++) {
      stars.push({
        x: Math.floor(Math.random() * BG_W),
        y: Math.floor(Math.random() * (BG_H - 18)),
        layer: i < 45 ? 0 : (i < 82 ? 1 : 2),
        color: starColors[i % starColors.length],
        phase: Math.floor(Math.random() * 24),
        speed: i < 45 ? 0 : (i < 82 ? 0.08 : 0.16)
      });
    }

    const nebulae = [
      { x: 64, y: 66, rx: 52, ry: 22, c1: '#06b6d4', c2: '#1d4ed8', speed: 0.12 },
      { x: 240, y: 112, rx: 58, ry: 24, c1: '#ec4899', c2: '#7e22ce', speed: 0.18 },
      { x: 156, y: 34, rx: 40, ry: 15, c1: '#38bdf8', c2: '#312e81', speed: 0.09 }
    ];

    const asteroids = [
      { x: 34, y: 154, size: 5, speed: 0.15 },
      { x: 118, y: 164, size: 4, speed: 0.1 },
      { x: 224, y: 158, size: 5, speed: 0.14 },
      { x: 292, y: 150, size: 4, speed: 0.12 }
    ];

    bgState = {
      canvas,
      ctx,
      staticLayer: buildStaticSpaceLayer(),
      stars,
      nebulae,
      asteroids,
      comet: null
    };

    renderSpaceBackdrop(0);
    ensureLoopRunning();
  }

  function renderSpaceBackdrop(frame) {
    if (!bgState) return;
    const { ctx, staticLayer, stars, nebulae, asteroids } = bgState;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(staticLayer, 0, 0);

    // 1. Nebulosas parallax pixeladas con dithering
    nebulae.forEach((neb) => {
      const cx = ((neb.x - frame * neb.speed) % (BG_W + 90) + BG_W + 90) % (BG_W + 90) - 45;
      const cy = neb.y;
      const x0 = Math.max(0, Math.floor(cx - neb.rx));
      const x1 = Math.min(BG_W - 1, Math.ceil(cx + neb.rx));
      const y0 = Math.max(0, Math.floor(cy - neb.ry));
      const y1 = Math.min(BG_H - 1, Math.ceil(cy + neb.ry));
      for (let y = y0; y <= y1; y += 2) {
        for (let x = x0; x <= x1; x += 2) {
          const nx = (x - cx) / neb.rx;
          const ny = (y - cy) / neb.ry;
          const dist = nx * nx + ny * ny;
          if (dist < 0.95) {
            const hash = (x * 7 + y * 13) & 7;
            if (dist < 0.35 && hash < 3) {
              ctx.fillStyle = neb.c1;
              ctx.globalAlpha = 0.22;
              ctx.fillRect(x, y, 2, 1);
            } else if (dist < 0.78 && hash < 2) {
              ctx.fillStyle = neb.c2;
              ctx.globalAlpha = 0.18;
              ctx.fillRect(x, y, 1, 1);
            }
          }
        }
      }
      ctx.globalAlpha = 1;
    });

    // 2. Estrellas pixeladas en 3 capas con centelleo
    stars.forEach((s) => {
      const sx = Math.floor(((s.x - frame * s.speed) % BG_W + BG_W) % BG_W);
      const sy = s.y;
      const p = (frame + s.phase) % 16;

      if (s.layer === 0) {
        ctx.fillStyle = p < 3 ? '#94a3b8' : '#475569';
        ctx.fillRect(sx, sy, 1, 1);
      } else if (s.layer === 1) {
        ctx.fillStyle = p < 5 ? '#ffffff' : s.color;
        ctx.globalAlpha = p < 2 ? 0.35 : 0.92;
        ctx.fillRect(sx, sy, 1, 1);
        ctx.globalAlpha = 1;
      } else {
        // Estrellas brillantes en cruz pixelada de 4 puntas
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(sx, sy, 1, 1);
        if (p < 8) {
          ctx.fillStyle = s.color;
          ctx.fillRect(sx - 1, sy, 1, 1);
          ctx.fillRect(sx + 1, sy, 1, 1);
          ctx.fillRect(sx, sy - 1, 1, 1);
          ctx.fillRect(sx, sy + 1, 1, 1);
        }
        if (p === 3 || p === 4) {
          ctx.fillStyle = '#e0f2fe';
          ctx.fillRect(sx - 2, sy, 1, 1);
          ctx.fillRect(sx + 2, sy, 1, 1);
          ctx.fillRect(sx, sy - 2, 1, 1);
          ctx.fillRect(sx, sy + 2, 1, 1);
        }
      }
    });

    // 3. Cometa fugaz ocasional
    if (!bgState.comet && frame % 95 === 20) {
      bgState.comet = {
        x: 70 + Math.floor(Math.random() * 180),
        y: 8 + Math.floor(Math.random() * 30),
        life: 14
      };
    }
    if (bgState.comet) {
      const c = bgState.comet;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(c.x, c.y, 2, 1);
      ctx.fillStyle = '#67e8f9';
      ctx.fillRect(c.x - 2, c.y - 1, 2, 1);
      ctx.fillStyle = '#38bdf8';
      ctx.fillRect(c.x - 5, c.y - 2, 3, 1);
      c.x += 5;
      c.y += 2;
      c.life--;
      if (c.life <= 0) bgState.comet = null;
    }

    // 4. Asteroides pixelados a la deriva en la zona baja
    asteroids.forEach((a) => {
      const ax = Math.floor(((a.x - frame * a.speed) % (BG_W + 20) + BG_W + 20) % (BG_W + 20)) - 10;
      const ay = a.y;
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(ax, ay + 1, a.size + 1, a.size - 1);
      ctx.fillStyle = '#475569';
      ctx.fillRect(ax + 1, ay, a.size - 1, a.size - 2);
      ctx.fillStyle = '#64748b';
      ctx.fillRect(ax + 1, ay, 2, 1);
    });
  }

  /* ==========================================================================
   * CAPA DE EFECTOS DE COMBATE PIXEL-ART (240×120): PROYECTILES Y EXPLOSIONES
   * ========================================================================== */
  let fxState = null;

  function initBattleFx(canvas) {
    if (!canvas) return;
    canvas.width = FX_W;
    canvas.height = FX_H;
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    fxState = {
      canvas,
      ctx,
      projectiles: [],
      explosions: [],
      particles: []
    };
    ensureLoopRunning();
  }

  function spawnExplosion(x, y, weapon) {
    if (!fxState) return;
    fxState.explosions.push({
      x: Math.round(x),
      y: Math.round(y),
      weapon: weapon || 'laser',
      age: 0,
      maxAge: 18
    });

    const colors = weapon === 'plasma'
      ? ['#ffffff', '#f5d0fe', '#d946ef', '#7e22ce']
      : (weapon === 'missile'
        ? ['#ffffff', '#fde047', '#f97316', '#ef4444']
        : ['#ffffff', '#bae6fd', '#38bdf8', '#fde047']);

    for (let i = 0; i < 22; i++) {
      const ang = (Math.PI * 2 * i) / 22 + (Math.random() - 0.5) * 0.35;
      const spd = 1.4 + Math.random() * 3.4;
      fxState.particles.push({
        x,
        y,
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd,
        color: colors[i % colors.length],
        size: i % 3 === 0 ? 2 : 1,
        life: 10 + Math.floor(Math.random() * 10),
        maxLife: 20
      });
    }
  }

  function fireProjectile(opts) {
    if (!fxState) {
      if (opts && typeof opts.onImpact === 'function') {
        setTimeout(opts.onImpact, 320);
      }
      return;
    }

    const fromPlayer = opts.fromPlayer === 2 ? 2 : 1;
    const weapon = opts.weapon || 'laser';
    const isMiss = Boolean(opts.isMiss);
    const startX = fromPlayer === 1 ? 48 : FX_W - 48;
    const endX = fromPlayer === 1 ? FX_W - 42 : 42;
    const baseY = 66;

    if (weapon === 'missile') {
      // Ráfaga de 3 misiles fotónicos con trayectorias curvas
      [-12, 0, 12].forEach((arcAmp, idx) => {
        fxState.projectiles.push({
          weapon: 'missile',
          fromPlayer,
          isMiss,
          startX,
          endX: isMiss ? (fromPlayer === 1 ? FX_W + 10 : -10) : endX,
          startY: baseY + (idx === 0 ? -8 : (idx === 2 ? 8 : 0)),
          endY: isMiss ? (idx % 2 === 0 ? 16 : 106) : baseY + (idx - 1) * 5,
          arcAmp: isMiss ? arcAmp * 1.4 : arcAmp,
          progress: -idx * 0.14,
          speed: 0.082,
          impacted: false,
          onImpact: idx === 1 ? opts.onImpact : null
        });
      });
    } else {
      fxState.projectiles.push({
        weapon,
        fromPlayer,
        isMiss,
        startX,
        endX: isMiss ? (fromPlayer === 1 ? FX_W + 12 : -12) : endX,
        startY: baseY,
        endY: isMiss ? 22 : baseY,
        arcAmp: isMiss ? -14 : 0,
        progress: 0,
        speed: weapon === 'laser' ? 0.105 : 0.088,
        impacted: false,
        onImpact: opts.onImpact || null
      });
    }
    ensureLoopRunning();
  }

  function stepBattleFx() {
    if (!fxState) return;
    const { ctx, projectiles, explosions, particles } = fxState;
    if (!projectiles.length && !explosions.length && !particles.length) {
      ctx.clearRect(0, 0, FX_W, FX_H);
      return;
    }

    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, FX_W, FX_H);

    // 1. Actualizar y dibujar proyectiles
    for (let i = projectiles.length - 1; i >= 0; i--) {
      const p = projectiles[i];
      p.progress += p.speed;
      if (p.progress < 0) continue;

      const t = Math.min(1, p.progress);
      const x = p.startX + (p.endX - p.startX) * t;
      const y = p.startY + (p.endY - p.startY) * t + Math.sin(t * Math.PI) * p.arcAmp;
      const dir = p.fromPlayer === 1 ? 1 : -1;

      if (p.weapon === 'laser') {
        // Rayo láser doble de alta precisión
        const teamColor = p.fromPlayer === 1 ? '#38bdf8' : '#fb7185';
        const glowColor = p.fromPlayer === 1 ? '#67e8f9' : '#f472b6';
        [-9, 9].forEach((dy) => {
          const bx = Math.round(x - (dir === 1 ? 24 : 0));
          const by = Math.round(y + dy);
          ctx.fillStyle = teamColor;
          ctx.fillRect(bx - 2 * dir, by - 1, 26, 4);
          ctx.fillStyle = glowColor;
          ctx.fillRect(bx, by, 24, 2);
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(bx + (dir === 1 ? 6 : 2), by, 16, 2);
          // Chispa en la punta
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(Math.round(x), by - 1, 2, 4);
        });
        particles.push({
          x: x - dir * 14,
          y: y + (Math.random() < 0.5 ? -9 : 9),
          vx: -dir * 0.8,
          vy: (Math.random() - 0.5) * 0.8,
          color: '#bae6fd',
          size: 1,
          life: 6,
          maxLife: 6
        });
      } else if (p.weapon === 'plasma') {
        // Orbe de plasma pulsante con anillos y relámpagos pixelados
        const cx = Math.round(x);
        const cy = Math.round(y);
        const r = 7 + (Math.floor(p.progress * 20) % 2);
        const b = createBrush(ctx, FX_W, FX_H, false, 0, 0);
        b.fillEllipse(cx, cy, r, r - 1, (pxX, pxY, nx, ny) => {
          const d = nx * nx + ny * ny;
          if (d < 0.25) return '#ffffff';
          if (d < 0.55) return '#f5d0fe';
          if (d < 0.82) return ((pxX + pxY) & 1) ? '#d946ef' : '#a855f7';
          return '#6b21a8';
        });
        // Rayitos eléctricos saliendo del orbe
        const jitter = (Math.floor(p.progress * 30) % 3) - 1;
        b.line(cx - dir * 6, cy, cx - dir * 13, cy + jitter * 4, '#e879f9');
        b.line(cx, cy - 6, cx + jitter * 3, cy - 11, '#ffffff');
        b.line(cx, cy + 6, cx - jitter * 3, cy + 11, '#c084fc');

        particles.push({
          x: cx - dir * 7,
          y: cy + (Math.random() - 0.5) * 8,
          vx: -dir * 0.6,
          vy: (Math.random() - 0.5) * 0.6,
          color: Math.random() < 0.5 ? '#e879f9' : '#a855f7',
          size: 2,
          life: 8,
          maxLife: 8
        });
      } else {
        // Misil fotónico con estela de humo y fuego
        const mx = Math.round(x);
        const my = Math.round(y);
        // Cuerpo del misil
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(mx - 5, my - 2, 11, 5);
        ctx.fillStyle = '#e2e8f0';
        ctx.fillRect(mx - 4, my - 1, 8, 3);
        // Ojiva roja/naranja
        ctx.fillStyle = '#f97316';
        ctx.fillRect(dir === 1 ? mx + 4 : mx - 6, my - 1, 2, 3);
        ctx.fillStyle = '#fde047';
        ctx.fillRect(dir === 1 ? mx + 6 : mx - 7, my, 1, 1);
        // Llama del cohete
        ctx.fillStyle = '#fde047';
        ctx.fillRect(dir === 1 ? mx - 7 : mx + 5, my - 1, 3, 3);
        ctx.fillStyle = '#f97316';
        ctx.fillRect(dir === 1 ? mx - 10 : mx + 8, my, 3, 1);

        // Estela de humo pixelado
        particles.push({
          x: mx - dir * 9,
          y: my + (Math.random() - 0.5) * 2,
          vx: -dir * 0.5,
          vy: (Math.random() - 0.5) * 0.5,
          color: Math.random() < 0.4 ? '#fb923c' : '#94a3b8',
          size: 2,
          life: 9,
          maxLife: 9
        });
      }

      if (p.progress >= 1 && !p.impacted) {
        p.impacted = true;
        if (!p.isMiss) {
          spawnExplosion(p.endX, p.endY, p.weapon);
        }
        if (typeof p.onImpact === 'function') {
          p.onImpact();
        }
        projectiles.splice(i, 1);
      }
    }

    // 2. Explosiones 16-bit multi-frame
    for (let i = explosions.length - 1; i >= 0; i--) {
      const ex = explosions[i];
      ex.age++;
      const progress = ex.age / ex.maxAge;
      const b = createBrush(ctx, FX_W, FX_H, false, 0, 0);

      // Onda expansiva pixelada
      const ringR = Math.round(6 + progress * 24);
      const ringCol = ex.weapon === 'plasma' ? '#e879f9' : (ex.weapon === 'laser' ? '#67e8f9' : '#fde047');
      for (let a = 0; a < 360; a += 14) {
        const rad = (a * Math.PI) / 180;
        b.px(ex.x + Math.cos(rad) * ringR, ex.y + Math.sin(rad) * ringR, ringCol, Math.max(0, 1 - progress));
      }

      // Bola de fuego por etapas
      if (progress < 0.72) {
        const coreR = Math.max(2, Math.round((1 - progress * 0.65) * 16));
        b.fillEllipse(ex.x, ex.y, coreR, coreR, (pxX, pxY, nx, ny) => {
          const d = nx * nx + ny * ny;
          if (progress < 0.25 && d < 0.55) return '#ffffff';
          if (d < 0.3) return '#ffffff';
          if (d < 0.58) return ex.weapon === 'plasma' ? '#f5d0fe' : '#fde047';
          if (d < 0.82) return ((pxX + pxY) & 1) ? (ex.weapon === 'plasma' ? '#d946ef' : '#f97316') : '#ef4444';
          return ((pxX + pxY) & 1) ? '#991b1b' : null;
        });
      } else {
        // Nubes residuales de humo
        const smokeR = Math.round(10 + (progress - 0.7) * 18);
        b.fillEllipse(ex.x, ex.y, smokeR, smokeR * 0.85, (pxX, pxY, nx, ny) => {
          const d = nx * nx + ny * ny;
          if (d > 0.35 && d < 0.95 && ((pxX + pxY + ex.age) & 1) === 0) return '#475569';
          return null;
        });
      }

      if (ex.age >= ex.maxAge) {
        explosions.splice(i, 1);
      }
    }

    // 3. Partículas y metralla pixelada
    for (let i = particles.length - 1; i >= 0; i--) {
      const pt = particles[i];
      pt.x += pt.vx;
      pt.y += pt.vy;
      pt.vx *= 0.94;
      pt.vy *= 0.94;
      pt.life--;
      if (pt.life <= 0) {
        particles.splice(i, 1);
        continue;
      }
      ctx.globalAlpha = Math.max(0.15, pt.life / pt.maxLife);
      ctx.fillStyle = pt.color;
      ctx.fillRect(Math.round(pt.x), Math.round(pt.y), pt.size, pt.size);
      ctx.globalAlpha = 1;
    }
  }

  /* ==========================================================================
   * REGISTRO DE SPRITES Y BUCLE DE ANIMACIÓN COMPARTIDO
   * ========================================================================== */
  const shipsRegistry = new Map();
  let rafId = null;
  let lastPixelTick = 0;
  let lastFxTick = 0;
  let globalFrame = 0;

  function ensureLoopRunning() {
    if (rafId !== null) return;
    if (typeof root.requestAnimationFrame !== 'function') return;
    rafId = root.requestAnimationFrame(tickLoop);
  }

  function tickLoop(ts) {
    rafId = root.requestAnimationFrame(tickLoop);

    // 1. Paso de sprites de nave y fondo espacial a ~9 FPS (110ms)
    if (ts - lastPixelTick >= 110) {
      lastPixelTick = ts;
      globalFrame++;

      shipsRegistry.forEach((entry) => {
        if (!entry.canvas.isConnected) return;
        entry.stateFrame++;
        if (entry.stateUntil && ts >= entry.stateUntil) {
          entry.state = 'idle';
          entry.stateFrame = 0;
          entry.stateUntil = 0;
        }
        renderShipCanvas(entry, globalFrame);
      });

      if (bgState && bgState.canvas.isConnected) {
        renderSpaceBackdrop(globalFrame);
      }
    }

    // 2. Paso de efectos de proyectiles y explosiones a ~30 FPS (33ms)
    if (fxState && fxState.canvas.isConnected && ts - lastFxTick >= 33) {
      lastFxTick = ts;
      stepBattleFx();
    }
  }

  function registerShip(slotId, containerOrCanvas, config, playerNum) {
    if (!containerOrCanvas) return null;
    let canvas;
    if (containerOrCanvas.tagName && containerOrCanvas.tagName.toLowerCase() === 'canvas') {
      canvas = containerOrCanvas;
    } else {
      canvas = containerOrCanvas.querySelector('canvas.pixel-ship-canvas');
      if (!canvas) {
        containerOrCanvas.innerHTML = '';
        canvas = document.createElement('canvas');
        canvas.className = 'pixel-ship-canvas';
        containerOrCanvas.appendChild(canvas);
      }
    }

    canvas.width = SHIP_W;
    canvas.height = SHIP_H;
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;

    const entry = {
      slotId,
      canvas,
      ctx,
      config: Object.assign({}, config),
      playerNum: playerNum === 2 ? 2 : 1,
      state: 'idle',
      stateFrame: 0,
      stateUntil: 0
    };

    shipsRegistry.set(slotId, entry);
    renderShipCanvas(entry, globalFrame);
    ensureLoopRunning();
    return canvas;
  }

  function updateShipConfig(slotId, config) {
    const entry = shipsRegistry.get(slotId);
    if (!entry) return;
    entry.config = Object.assign({}, config);
    renderShipCanvas(entry, globalFrame);
  }

  function setShipState(slotId, state, durationMs) {
    const entry = shipsRegistry.get(slotId);
    if (!entry) return;
    entry.state = state || 'idle';
    entry.stateFrame = 0;
    const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
    entry.stateUntil = durationMs ? now + durationMs : 0;
    renderShipCanvas(entry, globalFrame);
  }

  function clearFx() {
    if (!fxState) return;
    fxState.projectiles.length = 0;
    fxState.explosions.length = 0;
    fxState.particles.length = 0;
    fxState.ctx.clearRect(0, 0, FX_W, FX_H);
  }

  root.EspacialPixelArt = {
    SHIP_W,
    SHIP_H,
    BG_W,
    BG_H,
    FX_W,
    FX_H,
    registerShip,
    updateShipConfig,
    setShipState,
    initSpaceBackdrop,
    initBattleFx,
    fireProjectile,
    spawnExplosion,
    clearFx
  };
})(typeof window !== 'undefined' ? window : globalThis);
