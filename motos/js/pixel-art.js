/**
 * motos/js/pixel-art.js
 * Motor gráfico Pixel Art 16-bit para Moto GP Matemático:
 * - Sprites animados de motos + pilotos (64x48) con 4 modelos, 4 cascos y 4 equipos
 * - Curvas cerradas Catmull-Rom reparametrizadas por longitud de arco (5, 7 y 10 tramos exactos)
 * - Mapa de circuito pixel-art 360x210 con 6 biomas detallados (dithering Bayer, gradas, props y partículas)
 * - Miniaturas pixel-art para el selector de circuitos (144x84)
 * - Tira lateral de velocidad arcade 16-bit (320x68) estilo Super Hang-On con scroll parallax
 */
(function (root) {
  'use strict';

  const BAYER2 = [
    [0, 2],
    [3, 1]
  ];

  const BIKE_W = 64;
  const BIKE_H = 48;
  const TRACK_W = 360;
  const TRACK_H = 210;
  const SPRINT_W = 320;
  const SPRINT_H = 68;

  function getData() {
    return root.MotosData;
  }

  function getTeamPalette(teamId) {
    const data = getData();
    return (data && data.TEAM_PALETTES && data.TEAM_PALETTES[teamId]) || data.TEAM_PALETTES[1];
  }

  /* ==========================================================================
   * PRIMITIVAS PIXEL-PERFECT
   * ========================================================================== */
  function createBrush(ctx, width, height, ox, oy) {
    const offsetX = ox || 0;
    const offsetY = oy || 0;

    function px(x, y, color, alpha) {
      const ix = Math.round(x + offsetX);
      const iy = Math.round(y + offsetY);
      if (ix < 0 || ix >= width || iy < 0 || iy >= height) return;
      if (alpha !== undefined && alpha < 1) {
        const prev = ctx.globalAlpha;
        ctx.globalAlpha = prev * alpha;
        ctx.fillStyle = color;
        ctx.fillRect(ix, iy, 1, 1);
        ctx.globalAlpha = prev;
      } else {
        ctx.fillStyle = color;
        ctx.fillRect(ix, iy, 1, 1);
      }
    }

    function rect(x, y, w, h, color, alpha) {
      const x0 = Math.round(x + offsetX);
      const y0 = Math.round(y + offsetY);
      const rw = Math.round(w);
      const rh = Math.round(h);
      if (rw <= 0 || rh <= 0) return;
      if (alpha !== undefined && alpha < 1) {
        const prev = ctx.globalAlpha;
        ctx.globalAlpha = prev * alpha;
        ctx.fillStyle = color;
        ctx.fillRect(x0, y0, rw, rh);
        ctx.globalAlpha = prev;
      } else {
        ctx.fillStyle = color;
        ctx.fillRect(x0, y0, rw, rh);
      }
    }

    function hline(x, y, len, color, alpha) {
      rect(x, y, len, 1, color, alpha);
    }

    function vline(x, y, len, color, alpha) {
      rect(x, y, 1, len, color, alpha);
    }

    function circle(cx, cy, r, color, alpha) {
      const r2 = r * r;
      for (let dy = -r; dy <= r; dy++) {
        for (let dx = -r; dx <= r; dx++) {
          if (dx * dx + dy * dy <= r2) {
            px(cx + dx, cy + dy, color, alpha);
          }
        }
      }
    }

    function ring(cx, cy, rOuter, rInner, color) {
      const ro2 = rOuter * rOuter;
      const ri2 = rInner * rInner;
      for (let dy = -rOuter; dy <= rOuter; dy++) {
        for (let dx = -rOuter; dx <= rOuter; dx++) {
          const d2 = dx * dx + dy * dy;
          if (d2 <= ro2 && d2 >= ri2) {
            px(cx + dx, cy + dy, color);
          }
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

    function ditherRect(x, y, w, h, c1, c2, density) {
      const d = density === undefined ? 2 : density;
      for (let j = 0; j < h; j++) {
        for (let i = 0; i < w; i++) {
          const t = BAYER2[(Math.round(y + j)) & 1][(Math.round(x + i)) & 1];
          const col = t < d ? c2 : c1;
          if (col) px(x + i, y + j, col);
        }
      }
    }

    return { px, rect, hline, vline, circle, ring, line, ditherRect };
  }

  /* ==========================================================================
   * DIBUJO DE MOTO + PILOTO PIXEL-ART 16-BIT (64x48)
   * ========================================================================== */
  function drawWheel(b, cx, cy, r, frame, bikeType, team) {
    // Neumático exterior
    b.circle(cx, cy, r, '#0b0f17');
    b.ring(cx, cy, r - 1, r - 2, '#1f2937');
    // Llanta metálica / color de equipo
    const rimR = Math.max(2, r - 3);
    b.circle(cx, cy, rimR, '#334155');
    if (bikeType === 'cyber') {
      b.ring(cx, cy, rimR, rimR - 1, team.light);
    } else {
      b.ring(cx, cy, rimR, rimR - 1, '#94a3b8');
    }
    // Radios giratorios
    const rot = frame % 4;
    const spokeColor = bikeType === 'cyber' ? team.bright : '#cbd5e1';
    if (rot === 0 || rot === 2) {
      b.hline(cx - rimR + 1, cy, rimR * 2 - 1, spokeColor);
      b.vline(cx, cy - rimR + 1, rimR * 2 - 1, spokeColor);
    } else {
      b.line(cx - rimR + 1, cy - rimR + 1, cx + rimR - 1, cy + rimR - 1, spokeColor);
      b.line(cx - rimR + 1, cy + rimR - 1, cx + rimR - 1, cy - rimR + 1, spokeColor);
    }
    // Disco de freno y buje central
    b.circle(cx, cy, 2, '#64748b');
    b.px(cx, cy, '#f8fafc');
    // Tacos para rally
    if (bikeType === 'rally') {
      const k = frame % 2;
      b.px(cx - r + k, cy - 2, '#374151');
      b.px(cx + r - k, cy + 2, '#374151');
      b.px(cx - 2, cy - r + k, '#374151');
      b.px(cx + 2, cy + r - k, '#374151');
    }
  }

  function drawBikeSprite(ctx, width, height, riderCfg, frame, state, ox, oy) {
    const team = getTeamPalette(riderCfg.id || 1);
    const bikeType = riderCfg.bike || 'superbike';
    const helmetType = riderCfg.helmet || 'classic';

    const bounce = state === 'boost'
      ? (frame % 2 === 0 ? -1 : 0)
      : state === 'skid'
        ? (frame % 2 === 0 ? 1 : -1)
        : (frame % 4 < 2 ? 0 : -1);

    const wheelieLift = (state === 'boost' || state === 'victory') ? -3 : 0;
    const baseOx = (ox || 0);
    const baseOy = (oy || 0);

    const b = createBrush(ctx, width, height, baseOx, baseOy);

    // Sombra bajo la moto
    b.rect(10, 41, 44, 3, '#020617', 0.5);
    b.rect(14, 40, 36, 1, '#020617', 0.35);

    // Humo / llamas de escape según estado
    const exhaustX = 11;
    const exhaustY = 30 + bounce;
    if (state === 'boost' || state === 'victory') {
      const fLen = 8 + (frame % 3) * 4;
      b.rect(exhaustX - fLen, exhaustY - 1, fLen, 4, team.flameOuter);
      b.rect(exhaustX - fLen + 3, exhaustY, Math.max(2, fLen - 3), 2, team.flameMid);
      b.rect(exhaustX - Math.floor(fLen * 0.45), exhaustY, Math.max(2, Math.floor(fLen * 0.45)), 1, team.flameCore);
      // Líneas de velocidad
      const sOff = (frame * 5) % 14;
      b.hline(2 + (sOff % 5), 14, 7, '#f8fafc', 0.6);
      b.hline(4 + ((sOff + 4) % 6), 23, 9, team.bright, 0.55);
      b.hline(1 + ((sOff + 2) % 4), 35, 8, '#f8fafc', 0.45);
    } else if (state === 'skid') {
      // Nubes de humo de frenada / derrape
      const puff = frame % 3;
      b.circle(12 - puff * 2, 38 - puff, 4, '#cbd5e1', 0.85);
      b.circle(7 - puff, 36 - puff, 3, '#f1f5f9', 0.75);
      b.circle(16, 39, 3, '#94a3b8', 0.8);
      // Chispas de derrape
      b.px(19, 40, '#facc15');
      b.px(15, 41, '#fb923c');
    } else if (frame % 3 === 0) {
      b.rect(exhaustX - 4, exhaustY, 3, 2, '#94a3b8', 0.45);
      b.px(exhaustX - 6, exhaustY - 1, '#cbd5e1', 0.3);
    }

    // Ruedas (delantera sube un poco en wheelie)
    const rearX = 18;
    const rearY = 35;
    const frontX = 48;
    const frontY = 35 + wheelieLift;
    const wheelR = bikeType === 'rally' ? 7 : 6;
    drawWheel(b, rearX, rearY, wheelR, frame, bikeType, team);
    drawWheel(b, frontX, frontY, wheelR, frame, bikeType, team);

    // Chasis + cuerpo con vibración
    const bb = createBrush(ctx, width, height, baseOx, baseOy + bounce);

    // Basculante trasero y cadena
    bb.rect(18, 32, 13, 3, '#475569');
    bb.hline(18, 32, 12, '#94a3b8');
    bb.hline(19, 34, 10, '#0f172a');

    // Escape según modelo
    if (bikeType === 'superbike') {
      bb.line(11, 29, 25, 33, '#64748b');
      bb.line(11, 30, 25, 34, '#cbd5e1');
      bb.rect(10, 28, 4, 3, '#1e293b');
    } else if (bikeType === 'turbo') {
      bb.rect(10, 31, 15, 3, '#94a3b8');
      bb.hline(10, 31, 15, '#f8fafc');
      bb.rect(9, 30, 3, 4, '#334155');
    } else if (bikeType === 'rally') {
      bb.line(11, 24, 24, 29, '#64748b');
      bb.line(11, 25, 24, 30, '#e2e8f0');
      bb.rect(10, 23, 4, 3, '#1e293b');
    } else {
      // Cyber plasma exhaust
      bb.rect(11, 29, 13, 4, '#1e293b');
      bb.hline(11, 30, 12, team.light);
      bb.rect(10, 29, 2, 4, team.bright);
    }

    // Bloque motor metálico
    bb.rect(25, 27, 13, 9, '#1e293b');
    bb.rect(26, 28, 11, 7, '#475569');
    bb.hline(27, 29, 8, '#94a3b8');
    bb.hline(27, 31, 8, '#94a3b8');
    bb.hline(27, 33, 8, '#64748b');
    bb.rect(29, 30, 4, 4, '#cbd5e1');

    // Horquilla delantera
    bb.line(41, 18 + Math.floor(wheelieLift / 2), frontX, frontY - bounce, '#cbd5e1');
    bb.line(42, 18 + Math.floor(wheelieLift / 2), frontX + 1, frontY - bounce, '#64748b');
    bb.line(40, 19 + Math.floor(wheelieLift / 2), frontX - 1, frontY - bounce, '#1e293b');

    // Carenado y depósito según modelo
    if (bikeType === 'superbike') {
      // Colín afilado + carenado aerodinámico completo
      bb.rect(12, 23, 12, 4, team.dark);
      bb.rect(13, 22, 11, 3, team.main);
      bb.hline(14, 22, 9, team.light);
      // Carenado central y frontal
      bb.rect(28, 22, 17, 11, team.dark);
      bb.rect(29, 21, 17, 9, team.main);
      bb.rect(31, 22, 14, 3, team.light);
      bb.hline(32, 25, 13, team.stripe);
      bb.rect(45, 22, 5, 6, team.main);
      bb.rect(47, 23, 4, 4, team.light);
      // Cúpula transparente
      bb.line(39, 17, 46, 21, '#bae6fd');
      bb.line(38, 18, 45, 22, '#38bdf8');
      // Faro
      bb.rect(49, 24, 2, 3, '#fef08a');
    } else if (bikeType === 'turbo') {
      // Café racer retro con depósito redondeado y faro redondo
      bb.rect(14, 24, 10, 3, '#1e293b');
      bb.rect(26, 21, 14, 6, team.dark);
      bb.rect(27, 20, 12, 5, team.main);
      bb.hline(28, 20, 10, team.light);
      bb.hline(27, 23, 12, team.stripe);
      // Semicarenado retro
      bb.rect(41, 20, 7, 7, team.main);
      bb.rect(42, 21, 5, 3, team.light);
      bb.circle(48, 23, 2, '#fef08a');
      bb.px(49, 22, '#ffffff');
    } else if (bikeType === 'rally') {
      // Cross rally alto con guardabarros elevado y pico delantero
      bb.rect(12, 22, 13, 3, team.main);
      bb.hline(13, 22, 10, team.light);
      bb.rect(26, 20, 14, 7, team.main);
      bb.rect(28, 21, 10, 3, team.stripe);
      // Guardabarros delantero elevado
      bb.rect(42, 23, 11, 2, team.main);
      bb.hline(43, 22, 9, team.light);
      // Placa porta-número y manillar alto
      bb.rect(39, 16, 6, 7, '#f8fafc');
      bb.rect(41, 18, 2, 3, team.dark);
    } else {
      // Cyber Moto futurista con líneas neón y morro largo
      bb.rect(11, 23, 15, 5, '#1e293b');
      bb.hline(12, 24, 13, team.main);
      bb.rect(26, 21, 22, 10, '#0f172a');
      bb.rect(28, 22, 19, 7, team.deep);
      bb.hline(29, 23, 17, team.light);
      bb.hline(31, 26, 15, team.bright);
      bb.rect(47, 23, 6, 5, team.main);
      bb.rect(50, 24, 3, 2, '#ffffff');
      // Cúpula angular neón
      bb.line(37, 16, 48, 22, team.bright);
      bb.line(36, 17, 46, 22, team.main);
    }

    // Piloto en postura racing aerodinámica
    // Pierna y bota en estribera
    bb.rect(25, 29, 5, 5, team.suitDark);
    bb.rect(27, 27, 5, 4, team.suitMid);
    bb.rect(29, 28, 3, 2, team.suitAccent); // rodillera
    bb.rect(23, 33, 4, 3, '#111827'); // bota

    // Torso inclinado hacia adelante + joroba aerodinámica
    bb.rect(21, 18, 13, 7, team.suitDark);
    bb.rect(22, 17, 12, 6, team.suitMid);
    bb.rect(23, 16, 8, 3, team.main);
    bb.hline(24, 16, 6, team.light);
    bb.hline(23, 19, 10, team.stripe);

    // Brazo sujetando el manillar
    bb.line(32, 19, 40, 20, team.suitMid);
    bb.line(32, 20, 40, 21, team.main);
    bb.rect(39, 19, 3, 3, '#f8fafc'); // guante

    // Casco del piloto (cabeza alrededor de x=35, y=13)
    const hx = 36;
    const hy = 13;
    bb.circle(hx, hy, 5, team.outline);
    bb.circle(hx, hy, 4, team.main);
    bb.rect(hx - 2, hy - 4, 5, 2, team.light);
    bb.px(hx - 1, hy - 3, team.bright);

    // Visera reflectante
    bb.rect(hx + 1, hy - 2, 4, 3, team.visor);
    bb.hline(hx + 2, hy - 2, 2, team.visorGlow);

    // Detalles por estilo de casco
    if (helmetType === 'aero') {
      // Alerón trasero aerodinámico en el casco
      bb.rect(hx - 7, hy - 3, 4, 2, team.stripe);
      bb.hline(hx - 7, hy - 4, 3, team.bright);
    } else if (helmetType === 'bolt') {
      // Rayo lateral dorado/blanco
      bb.px(hx - 3, hy - 1, '#facc15');
      bb.px(hx - 2, hy - 2, '#facc15');
      bb.px(hx - 1, hy - 1, '#fef08a');
      bb.px(hx, hy - 2, '#facc15');
    } else if (helmetType === 'crown') {
      // Corona dorada de campeón sobre el casco
      bb.hline(hx - 3, hy - 5, 6, '#f59e0b');
      bb.px(hx - 3, hy - 6, '#fde047');
      bb.px(hx, hy - 7, '#fde047');
      bb.px(hx + 2, hy - 6, '#fde047');
    } else {
      // Franja clásica
      bb.hline(hx - 3, hy, 4, team.stripe);
    }

    // Luz de freno trasera roja (más intensa al derrapar)
    bb.rect(12, 24, 2, 2, state === 'skid' ? '#ff2a2a' : '#991b1b');
    if (state === 'skid') {
      bb.px(11, 24, '#fca5a5');
    }

    // Estrellitas en victoria
    if (state === 'victory') {
      const s = frame % 4;
      bb.px(18 + s * 4, 6 + (s % 2) * 3, '#fde047');
      bb.px(46 - s * 3, 5 + ((s + 1) % 2) * 3, '#ffffff');
      bb.px(30, 3 + (s % 2) * 2, '#facc15');
    }
  }

  /* ==========================================================================
   * REGISTRO DE PREVIEWS DE MOTOS ANIMADAS (GARAJE / PODIO / HUD)
   * ========================================================================== */
  const bikeRegistry = new Map();
  let globalAnimFrame = 0;
  let lastBikeTick = 0;

  function registerBikePreview(key, containerOrCanvas, riderCfg, opts) {
    if (!containerOrCanvas) return;
    let canvas = containerOrCanvas;
    if (canvas.tagName !== 'CANVAS') {
      canvas = containerOrCanvas.querySelector('canvas');
      if (!canvas) {
        canvas = document.createElement('canvas');
        canvas.width = BIKE_W;
        canvas.height = BIKE_H;
        canvas.className = 'pixel-canvas pixel-bike-canvas';
        containerOrCanvas.innerHTML = '';
        containerOrCanvas.appendChild(canvas);
      }
    }
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    bikeRegistry.set(key, {
      canvas,
      ctx,
      cfg: Object.assign({}, riderCfg),
      state: (opts && opts.state) || 'idle',
      stateUntil: 0
    });
    renderSingleBike(bikeRegistry.get(key));
  }

  function unregisterBikePreview(key) {
    bikeRegistry.delete(key);
  }

  function updateBikePreview(key, riderCfg) {
    const item = bikeRegistry.get(key);
    if (!item) return;
    item.cfg = Object.assign({}, item.cfg, riderCfg);
    renderSingleBike(item);
  }

  function setBikePreviewState(key, state, durationMs) {
    const item = bikeRegistry.get(key);
    if (!item) return;
    item.state = state;
    item.stateUntil = durationMs ? performance.now() + durationMs : 0;
    renderSingleBike(item);
  }

  function renderSingleBike(item) {
    const { ctx, canvas, cfg, state } = item;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawBikeSprite(ctx, canvas.width, canvas.height, cfg, globalAnimFrame, state, 0, 0);
  }

  /* ==========================================================================
   * GEOMETRÍA CATMULL-ROM CERRADA Y REPARAMETRIZACIÓN POR ARCO
   * ========================================================================== */
  function buildTrackCurve(waypoints, samplesTotal) {
    const n = waypoints.length;
    const raw = [];
    const stepsPerSeg = 24;

    for (let i = 0; i < n; i++) {
      const p0 = waypoints[(i - 1 + n) % n];
      const p1 = waypoints[i];
      const p2 = waypoints[(i + 1) % n];
      const p3 = waypoints[(i + 2) % n];

      for (let s = 0; s < stepsPerSeg; s++) {
        const t = s / stepsPerSeg;
        const t2 = t * t;
        const t3 = t2 * t;
        const x = 0.5 * (
          (2 * p1[0]) +
          (-p0[0] + p2[0]) * t +
          (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 +
          (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3
        );
        const y = 0.5 * (
          (2 * p1[1]) +
          (-p0[1] + p2[1]) * t +
          (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 +
          (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3
        );
        raw.push({ x, y });
      }
    }

    // Longitud acumulada
    const cum = [0];
    let totalLen = 0;
    for (let i = 1; i <= raw.length; i++) {
      const a = raw[i - 1];
      const b = raw[i % raw.length];
      totalLen += Math.hypot(b.x - a.x, b.y - a.y);
      cum.push(totalLen);
    }

    // Remuestreo equidistante
    const count = samplesTotal || 360;
    const points = [];
    let j = 0;
    for (let k = 0; k < count; k++) {
      const target = (k / count) * totalLen;
      while (j < raw.length - 1 && cum[j + 1] < target) j++;
      const segLen = Math.max(0.0001, cum[j + 1] - cum[j]);
      const frac = (target - cum[j]) / segLen;
      const a = raw[j];
      const b = raw[(j + 1) % raw.length];
      points.push({
        x: a.x + (b.x - a.x) * frac,
        y: a.y + (b.y - a.y) * frac
      });
    }

    // Tangentes y normales
    for (let k = 0; k < count; k++) {
      const prev = points[(k - 1 + count) % count];
      const next = points[(k + 1) % count];
      const dx = next.x - prev.x;
      const dy = next.y - prev.y;
      const len = Math.hypot(dx, dy) || 1;
      points[k].tx = dx / len;
      points[k].ty = dy / len;
      points[k].nx = -dy / len;
      points[k].ny = dx / len;
    }

    return { points, totalLen };
  }

  function sampleTrack(curve, progress01) {
    const pts = curve.points;
    const n = pts.length;
    const wrapped = ((progress01 % 1) + 1) % 1;
    const fIdx = wrapped * n;
    const i0 = Math.floor(fIdx) % n;
    const i1 = (i0 + 1) % n;
    const frac = fIdx - Math.floor(fIdx);
    const a = pts[i0];
    const b = pts[i1];
    return {
      x: a.x + (b.x - a.x) * frac,
      y: a.y + (b.y - a.y) * frac,
      tx: a.tx + (b.tx - a.tx) * frac,
      ty: a.ty + (b.ty - a.ty) * frac,
      nx: a.nx + (b.nx - a.nx) * frac,
      ny: a.ny + (b.ny - a.ny) * frac
    };
  }

  /* ==========================================================================
   * PROPS Y BIOMAS PIXEL-ART 16-BIT PARA CIRCUITOS
   * ========================================================================== */
  function isNearTrack(curve, x, y, minDist) {
    const pts = curve.points;
    const minD2 = minDist * minDist;
    for (let i = 0; i < pts.length; i += 4) {
      const dx = pts[i].x - x;
      const dy = pts[i].y - y;
      if (dx * dx + dy * dy < minD2) return true;
    }
    return false;
  }

  function drawPalmTree(b, x, y) {
    b.rect(x - 1, y - 2, 3, 2, '#14532d', 0.4);
    b.rect(x, y - 9, 2, 9, '#92400e');
    b.px(x, y - 7, '#b45309');
    b.px(x + 1, y - 4, '#78350f');
    // Hojas de palmera
    b.hline(x - 5, y - 10, 5, '#16a34a');
    b.hline(x + 2, y - 10, 5, '#16a34a');
    b.hline(x - 4, y - 11, 9, '#22c55e');
    b.hline(x - 2, y - 12, 5, '#4ade80');
    b.px(x - 5, y - 9, '#15803d');
    b.px(x + 6, y - 9, '#15803d');
    b.px(x, y - 9, '#78350f'); // coco
  }

  function drawPineTree(b, x, y) {
    b.rect(x, y - 2, 2, 3, '#78350f');
    b.hline(x - 4, y - 3, 10, '#14532d');
    b.hline(x - 3, y - 4, 8, '#166534');
    b.hline(x - 3, y - 6, 8, '#15803d');
    b.hline(x - 2, y - 7, 6, '#16a34a');
    b.hline(x - 2, y - 9, 6, '#22c55e');
    b.hline(x - 1, y - 10, 4, '#e2e8f0'); // toque de nieve
    b.px(x, y - 11, '#ffffff');
  }

  function drawCactus(b, x, y) {
    b.rect(x, y - 9, 3, 9, '#15803d');
    b.vline(x + 1, y - 9, 8, '#22c55e');
    b.rect(x - 3, y - 6, 3, 2, '#15803d');
    b.rect(x - 3, y - 8, 2, 3, '#16a34a');
    b.rect(x + 3, y - 5, 3, 2, '#15803d');
    b.rect(x + 4, y - 7, 2, 3, '#16a34a');
  }

  function drawSakuraTree(b, x, y) {
    b.rect(x, y - 5, 2, 6, '#78350f');
    b.circle(x + 1, y - 8, 5, '#ec4899');
    b.circle(x - 1, y - 9, 4, '#f472b6');
    b.circle(x + 2, y - 9, 3, '#fbcfe8');
    b.px(x, y - 11, '#fff1f2');
  }

  function drawGrandstand(b, x, y, w, roofColor) {
    b.rect(x, y, w, 12, '#1e293b');
    b.rect(x + 1, y + 1, w - 2, 10, '#334155');
    // Público pixelado multicolor
    const crowdColors = ['#ef4444', '#facc15', '#38bdf8', '#f8fafc', '#22c55e', '#fb923c'];
    for (let row = 0; row < 2; row++) {
      for (let i = 2; i < w - 3; i += 3) {
        const col = crowdColors[(i + row * 3) % crowdColors.length];
        b.rect(x + i, y + 4 + row * 3, 2, 2, col);
      }
    }
    // Techo de grada
    b.rect(x - 1, y - 2, w + 2, 3, roofColor || '#dc2626');
    b.hline(x - 1, y - 2, w + 2, '#f8fafc', 0.45);
  }

  function drawBiomeTerrain(ctx, w, h, circuit, curve) {
    const b = createBrush(ctx, w, h, 0, 0);

    // 1. Suelo base con dithering pixel-art 16-bit
    b.ditherRect(0, 0, w, h, circuit.groundA, circuit.groundB, 1);

    // Franja superior panorámica de cielo / horizonte (24px)
    const skyH = 26;
    for (let y = 0; y < skyH; y++) {
      const col = y < 10 ? circuit.skyTop : (y < 18 ? circuit.skyTop : circuit.skyBot);
      if (y >= 8 && y < 18 && y % 2 === 0) {
        b.ditherRect(0, y, w, 1, circuit.skyTop, circuit.skyBot, 2);
      } else {
        b.hline(0, y, w, col);
      }
    }

    // 2. Detalles específicos de cada bioma
    if (circuit.biome === 'coast') {
      // Mar azul pixelado en la franja superior y esquina inferior derecha
      b.rect(0, 18, w, 18, '#0284c7');
      b.ditherRect(0, 28, w, 6, '#0284c7', '#38bdf8', 2);
      b.rect(0, 34, w, 9, '#fde047'); // playa
      b.ditherRect(0, 41, w, 4, '#fde047', '#22c55e', 2);
      // Sol pixelado
      b.circle(316, 11, 7, '#fef08a');
      b.circle(316, 11, 5, '#ffffff');
      // Faro en esquina superior izquierda
      b.rect(18, 22, 7, 16, '#f8fafc');
      b.rect(18, 26, 7, 3, '#ef4444');
      b.rect(18, 32, 7, 3, '#ef4444');
      b.rect(19, 19, 5, 3, '#fde047');
      b.rect(18, 17, 7, 2, '#dc2626');
    } else if (circuit.biome === 'city') {
      // Skyline nocturno pixelado
      const buildings = [
        [8, 6, 22, 24], [34, 10, 18, 20], [58, 4, 24, 26], [88, 12, 20, 18],
        [114, 7, 26, 23], [148, 3, 22, 27], [176, 11, 20, 19], [202, 6, 28, 24],
        [236, 9, 20, 21], [262, 4, 26, 26], [294, 8, 24, 22], [324, 5, 28, 25]
      ];
      buildings.forEach(([bx, by, bw, bh], idx) => {
        b.rect(bx, by, bw, bh, idx % 2 === 0 ? '#0f172a' : '#1e293b');
        b.hline(bx, by, bw, idx % 3 === 0 ? '#06b6d4' : '#f59e0b');
        for (let wy = by + 3; wy < by + bh - 3; wy += 4) {
          for (let wx = bx + 3; wx < bx + bw - 3; wx += 4) {
            if ((wx + wy + idx) % 3 !== 0) {
              b.rect(wx, wy, 2, 2, (wx + idx) % 2 === 0 ? '#fde047' : '#38bdf8');
            }
          }
        }
      });
      // Cuadrícula sutil de asfalto urbano en el suelo
      for (let gx = 0; gx < w; gx += 24) {
        b.vline(gx, 32, h - 32, '#0f172a', 0.35);
      }
    } else if (circuit.biome === 'alpine') {
      // Montañas nevadas en el horizonte
      const peaks = [[30, 8, 56], [95, 4, 68], [175, 7, 74], [260, 5, 72], [330, 9, 54]];
      peaks.forEach(([px, py, baseW]) => {
        const half = Math.floor(baseW / 2);
        for (let row = 0; row < 28 - py; row++) {
          const span = Math.floor((row / (28 - py)) * half);
          const isSnow = row < 10;
          b.hline(px - span, py + row, span * 2 + 1, isSnow ? '#f1f5f9' : '#475569');
          if (!isSnow && row % 2 === 0) {
            b.hline(px, py + row, span + 1, '#334155');
          }
        }
      });
      // Arroyo helado en el interior
      b.rect(146, 128, 42, 10, '#38bdf8');
      b.ditherRect(146, 134, 42, 4, '#38bdf8', '#0284c7', 2);
    } else if (circuit.biome === 'desert') {
      // Sol poniente grande y mesetas rojas
      b.circle(275, 16, 10, '#fef08a');
      b.circle(275, 16, 7, '#ffffff');
      b.rect(20, 14, 48, 16, '#9a3412');
      b.rect(28, 10, 32, 6, '#c2410c');
      b.rect(118, 16, 62, 14, '#9a3412');
      b.rect(128, 12, 40, 5, '#b45309');
      // Dunas suaves
      b.ditherRect(0, 32, w, 14, '#f59e0b', '#d97706', 2);
      // Pequeño oasis
      b.circle(182, 126, 11, '#16a34a');
      b.circle(182, 126, 7, '#0ea5e9');
      b.hline(179, 124, 5, '#bae6fd');
    } else if (circuit.biome === 'sakura') {
      // Monte Fuji icónico en el horizonte
      const fx = 180;
      for (let row = 0; row < 26; row++) {
        const span = 8 + row * 2;
        b.hline(fx - span, 4 + row, span * 2, row < 9 ? '#ffffff' : '#475569');
        if (row === 9) b.ditherRect(fx - span, 13, span * 2, 2, '#ffffff', '#64748b', 2);
      }
      // Lago zen en el interior
      b.circle(220, 132, 13, '#38bdf8');
      b.circle(220, 132, 9, '#0ea5e9');
      // Puerta Torii roja
      b.rect(155, 128, 18, 3, '#dc2626');
      b.rect(157, 132, 14, 2, '#dc2626');
      b.rect(159, 131, 2, 11, '#b91c1c');
      b.rect(167, 131, 2, 11, '#b91c1c');
    } else if (circuit.biome === 'volcano') {
      // Volcán en el horizonte + río de lava
      for (let row = 0; row < 26; row++) {
        const span = 10 + row * 2;
        b.hline(180 - span, 6 + row, span * 2, '#1c1917');
      }
      b.rect(170, 5, 20, 3, '#f97316');
      b.rect(174, 4, 12, 2, '#fde047');
      // Charcos de magma en el terreno
      b.circle(172, 134, 14, '#ea580c');
      b.circle(172, 134, 9, '#f97316');
      b.circle(172, 134, 4, '#fde047');
      b.circle(336, 186, 12, '#ea580c');
      b.circle(336, 186, 7, '#facc15');
    }

    // 3. Árboles / props dispersos lejos del asfalto
    const propSeeds = [
      [18, 62], [22, 118], [16, 178], [340, 56], [344, 116], [338, 180],
      [172, 38], [218, 132], [116, 134], [250, 132], [150, 194], [278, 194],
      [66, 194], [202, 194], [132, 38], [286, 36], [36, 44], [326, 44]
    ];
    propSeeds.forEach(([px, py]) => {
      if (isNearTrack(curve, px, py, 20)) return;
      if (circuit.biome === 'coast') drawPalmTree(b, px, py);
      else if (circuit.biome === 'alpine') drawPineTree(b, px, py);
      else if (circuit.biome === 'desert') drawCactus(b, px, py);
      else if (circuit.biome === 'sakura') drawSakuraTree(b, px, py);
      else if (circuit.biome === 'city') {
        // Farola neón urbana
        b.rect(px, py - 8, 2, 8, '#64748b');
        b.rect(px - 1, py - 9, 4, 2, '#38bdf8');
      } else if (circuit.biome === 'volcano') {
        // Roca obsidiana con grieta de lava
        b.rect(px - 4, py - 5, 8, 5, '#1c1917');
        b.rect(px - 3, py - 7, 5, 3, '#292524');
        b.px(px - 1, py - 4, '#f97316');
      }
    });

    // 4. Grada principal junto a la recta de meta (parte inferior)
    const standY = 186;
    if (!isNearTrack(curve, 165, standY + 4, 16)) {
      drawGrandstand(b, 126, standY, 82, circuit.kerbA);
    }

    // 5. Renderizado de la pista (escapatoria -> pianos -> borde -> asfalto -> línea discontinua)
    const pts = curve.points;
    const drawRibbon = (radius, color) => {
      ctx.fillStyle = color;
      for (let i = 0; i < pts.length; i++) {
        const p = pts[i];
        ctx.fillRect(Math.round(p.x - radius), Math.round(p.y - radius), radius * 2, radius * 2);
      }
    };

    // Escapatoria / grava exterior
    drawRibbon(13, '#0f172a');

    // Pianos (kerbs) alternos rojo/blanco o temáticos
    for (let i = 0; i < pts.length; i++) {
      const p = pts[i];
      ctx.fillStyle = (Math.floor(i / 4) % 2 === 0) ? circuit.kerbA : circuit.kerbB;
      ctx.fillRect(Math.round(p.x - 11), Math.round(p.y - 11), 22, 22);
    }

    // Borde interior oscuro del asfalto
    drawRibbon(9, circuit.asphaltDark);
    // Superficie principal de asfalto
    drawRibbon(8, circuit.asphalt);
    // Trazo de agarre central ligeramente más claro
    drawRibbon(5, circuit.asphaltLight);
    drawRibbon(4, circuit.asphalt);

    // Línea central discontinua pixel-art
    for (let i = 0; i < pts.length; i++) {
      if (Math.floor(i / 5) % 2 === 0) {
        const p = pts[i];
        ctx.fillStyle = 'rgba(248, 250, 252, 0.55)';
        ctx.fillRect(Math.round(p.x), Math.round(p.y), 2, 2);
      }
    }

    // 6. Línea de salida/meta a cuadros en progreso 0
    const startPt = sampleTrack(curve, 0);
    for (let s = -8; s <= 8; s += 2) {
      for (let t = -2; t <= 2; t += 2) {
        const cx = Math.round(startPt.x + startPt.nx * s + startPt.tx * t);
        const cy = Math.round(startPt.y + startPt.ny * s + startPt.ty * t);
        const isWhite = ((Math.floor((s + 8) / 2) + Math.floor((t + 2) / 2)) % 2) === 0;
        ctx.fillStyle = isWhite ? '#ffffff' : '#0f172a';
        ctx.fillRect(cx, cy, 2, 2);
      }
    }

    // Arco de meta pixel-art
    const gx1 = Math.round(startPt.x + startPt.nx * 13);
    const gy1 = Math.round(startPt.y + startPt.ny * 13);
    const gx2 = Math.round(startPt.x - startPt.nx * 13);
    const gy2 = Math.round(startPt.y - startPt.ny * 13);
    b.rect(gx1 - 2, gy1 - 12, 3, 13, '#cbd5e1');
    b.rect(gx2 - 2, gy2 - 12, 3, 13, '#cbd5e1');
    b.line(gx1 - 1, gy1 - 12, gx2 - 1, gy2 - 12, '#0f172a');
    b.line(gx1 - 1, gy1 - 11, gx2 - 1, gy2 - 11, '#facc15');
    b.line(gx1 - 1, gy1 - 10, gx2 - 1, gy2 - 10, '#0f172a');
  }

  /* ==========================================================================
   * MINIATURA PIXEL-ART PARA TARJETAS DE SELECCIÓN DE CIRCUITO
   * ========================================================================== */
  function drawCircuitPreview(canvas, circuit) {
    if (!canvas || !circuit) return;
    const fullCanvas = document.createElement('canvas');
    fullCanvas.width = TRACK_W;
    fullCanvas.height = TRACK_H;
    const fctx = fullCanvas.getContext('2d');
    fctx.imageSmoothingEnabled = false;

    const curve = buildTrackCurve(circuit.waypoints, 300);
    drawBiomeTerrain(fctx, TRACK_W, TRACK_H, circuit, curve);

    // Marcadores de partes en la miniatura
    for (let s = 1; s < circuit.parts; s++) {
      const pt = sampleTrack(curve, s / circuit.parts);
      fctx.fillStyle = '#0f172a';
      fctx.fillRect(Math.round(pt.x - 4), Math.round(pt.y - 4), 8, 8);
      fctx.fillStyle = '#facc15';
      fctx.fillRect(Math.round(pt.x - 3), Math.round(pt.y - 3), 6, 6);
    }

    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(fullCanvas, 0, 0, canvas.width, canvas.height);
  }

  /* ==========================================================================
   * MICRO-SPRITE DE MOTO EN EL MAPA DEL CIRCUITO + ETIQUETA DE PILOTO
   * ========================================================================== */
  function drawMicroBike(ctx, x, y, rider, isActive, animFrame) {
    const team = getTeamPalette(rider.id);
    const ix = Math.round(x);
    const iy = Math.round(y);
    const dir = rider.facingLeft ? -1 : 1;

    // Halo pulsante si es el piloto activo
    if (isActive) {
      const pulse = (animFrame % 6) < 3 ? 9 : 11;
      ctx.strokeStyle = '#fde047';
      ctx.lineWidth = 1;
      ctx.strokeRect(ix - pulse, iy - pulse + 1, pulse * 2, pulse * 2 - 2);
    }

    // Sombra
    ctx.fillStyle = 'rgba(2, 6, 23, 0.65)';
    ctx.fillRect(ix - 6, iy + 3, 12, 3);

    // Ruedas
    ctx.fillStyle = '#090d16';
    ctx.fillRect(ix - 6, iy + 1, 4, 4);
    ctx.fillRect(ix + 2, iy + 1, 4, 4);
    ctx.fillStyle = '#94a3b8';
    ctx.fillRect(ix - 5, iy + 2, 2, 2);
    ctx.fillRect(ix + 3, iy + 2, 2, 2);

    // Chasis y carenado del color del piloto
    ctx.fillStyle = team.outline;
    ctx.fillRect(ix - 6, iy - 3, 12, 5);
    ctx.fillStyle = team.main;
    ctx.fillRect(ix - 5, iy - 2, 10, 3);
    ctx.fillStyle = team.bright;
    ctx.fillRect(dir > 0 ? ix + 1 : ix - 4, iy - 2, 3, 2);

    // Casco del piloto
    ctx.fillStyle = team.outline;
    ctx.fillRect(ix - 2, iy - 6, 5, 4);
    ctx.fillStyle = team.light;
    ctx.fillRect(ix - 1, iy - 5, 3, 2);
    ctx.fillStyle = team.visor;
    ctx.fillRect(dir > 0 ? ix + 1 : ix - 1, iy - 5, 1, 2);

    // Etiqueta compacta J1 / J2 / J3 / J4 encima
    const label = `J${rider.id}`;
    const bx = ix - 6;
    const by = iy - 15;
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(bx, by, 13, 8);
    ctx.fillStyle = team.main;
    ctx.fillRect(bx + 1, by + 1, 11, 6);
    ctx.fillStyle = rider.id === 4 ? '#0f172a' : '#ffffff';
    ctx.font = 'bold 6px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, ix + 0.5, by + 4.5);
  }

  /* ==========================================================================
   * MOTOR PRINCIPAL DEL CIRCUITO EN CARRERA + TIRA DE VELOCIDAD LATERAL
   * ========================================================================== */
  const raceView = {
    trackCanvas: null,
    trackCtx: null,
    staticLayer: null,
    sprintCanvas: null,
    sprintCtx: null,
    circuit: null,
    curve: null,
    riders: [], // { id, name, bike, helmet, progress, targetProgress, visualProgress, facingLeft, state }
    activeRiderId: 1,
    activeSectorIndex: 0, // 0 .. parts-1
    trafficLight: 'idle', // 'idle' | 'red' | 'amber' | 'green'
    particles: [],
    sprintScroll: 0,
    sprintSpeed: 1.5,
    sprintState: 'idle',
    sprintStateUntil: 0,
    dashAnimations: [] // { riderId, from, to, startTime, duration, kind }
  };

  function initRaceStage(trackCanvas, sprintCanvas) {
    raceView.trackCanvas = trackCanvas;
    raceView.trackCtx = trackCanvas ? trackCanvas.getContext('2d') : null;
    if (raceView.trackCtx) raceView.trackCtx.imageSmoothingEnabled = false;

    raceView.sprintCanvas = sprintCanvas;
    raceView.sprintCtx = sprintCanvas ? sprintCanvas.getContext('2d') : null;
    if (raceView.sprintCtx) raceView.sprintCtx.imageSmoothingEnabled = false;
  }

  function loadCircuit(circuit, ridersList) {
    raceView.circuit = circuit;
    raceView.curve = buildTrackCurve(circuit.waypoints, 360);
    raceView.particles = [];
    raceView.dashAnimations = [];
    raceView.activeSectorIndex = 0;
    raceView.trafficLight = 'idle';

    // Pre-render de la capa estática pixel-art
    const off = document.createElement('canvas');
    off.width = TRACK_W;
    off.height = TRACK_H;
    const octx = off.getContext('2d');
    octx.imageSmoothingEnabled = false;
    drawBiomeTerrain(octx, TRACK_W, TRACK_H, circuit, raceView.curve);
    raceView.staticLayer = off;

    raceView.riders = (ridersList || []).map((r, idx) => ({
      id: r.id,
      name: r.name,
      bike: r.bike,
      helmet: r.helmet,
      visualProgress: 0,
      targetProgress: 0,
      laneOffset: (idx - ((ridersList.length - 1) / 2)) * 4.2,
      gridStagger: (idx - ((ridersList.length - 1) / 2)) * 0.009,
      facingLeft: false
    }));
  }

  function setActiveRaceContext(riderId, sectorIndex, trafficLight) {
    raceView.activeRiderId = riderId;
    raceView.activeSectorIndex = sectorIndex;
    if (trafficLight !== undefined) {
      raceView.trafficLight = trafficLight;
    }
  }

  function setTrafficLight(state) {
    raceView.trafficLight = state;
  }

  function animateRiderSector(riderId, fromProgress, toProgress, isCorrect, durationMs) {
    const dur = durationMs || 1100;
    raceView.dashAnimations = raceView.dashAnimations.filter((a) => a.riderId !== riderId);
    raceView.dashAnimations.push({
      riderId,
      from: fromProgress,
      to: toProgress,
      startTime: performance.now(),
      duration: dur,
      kind: isCorrect ? 'boost' : 'skid'
    });

    raceView.sprintState = isCorrect ? 'boost' : 'skid';
    raceView.sprintStateUntil = performance.now() + dur + 350;
  }

  function snapRidersProgress(progressMap) {
    raceView.dashAnimations = [];
    raceView.riders.forEach((r) => {
      if (progressMap[r.id] !== undefined) {
        r.visualProgress = progressMap[r.id];
        r.targetProgress = progressMap[r.id];
      }
    });
  }

  function spawnTrackParticle(x, y, kind, team) {
    const count = kind === 'boost' ? 2 : 1;
    for (let i = 0; i < count; i++) {
      raceView.particles.push({
        x: x + (Math.random() * 4 - 2),
        y: y + (Math.random() * 4 - 2),
        vx: (Math.random() - 0.5) * 0.7,
        vy: -0.35 - Math.random() * 0.5,
        life: 16 + Math.floor(Math.random() * 10),
        maxLife: 26,
        color: kind === 'boost'
          ? (Math.random() > 0.4 ? team.flameMid : team.flameOuter)
          : (Math.random() > 0.5 ? '#cbd5e1' : '#94a3b8'),
        size: kind === 'boost' ? 2 : 3
      });
    }
  }

  function renderTrackFrame(now) {
    const ctx = raceView.trackCtx;
    const circuit = raceView.circuit;
    const curve = raceView.curve;
    if (!ctx || !circuit || !curve || !raceView.staticLayer) return;

    // 1. Fondo estático
    ctx.clearRect(0, 0, TRACK_W, TRACK_H);
    ctx.drawImage(raceView.staticLayer, 0, 0);

    // 2. Resaltar el tramo activo actual sobre la pista con un brillo dorado pulsante
    const parts = circuit.parts;
    const secIdx = Math.max(0, Math.min(parts - 1, raceView.activeSectorIndex));
    const startIdx = Math.floor((secIdx / parts) * curve.points.length);
    const endIdx = Math.floor(((secIdx + 1) / parts) * curve.points.length);
    const pulseAlpha = 0.25 + 0.18 * Math.sin(now / 180);
    ctx.fillStyle = `rgba(250, 204, 21, ${pulseAlpha.toFixed(2)})`;
    for (let i = startIdx; i < endIdx; i += 2) {
      const p = curve.points[i % curve.points.length];
      ctx.fillRect(Math.round(p.x - 4), Math.round(p.y - 4), 8, 8);
    }

    // 3. Animaciones ambientales del bioma
    const waveShift = Math.floor(now / 260) % 12;
    if (circuit.biome === 'coast') {
      ctx.fillStyle = '#bae6fd';
      for (let wx = 12 + waveShift; wx < TRACK_W - 10; wx += 36) {
        ctx.fillRect(wx, 23, 7, 1);
        ctx.fillRect(wx + 12, 27, 5, 1);
      }
    } else if (circuit.biome === 'volcano') {
      ctx.fillStyle = (globalAnimFrame % 2 === 0) ? '#fef08a' : '#f97316';
      ctx.fillRect(170, 132 + (globalAnimFrame % 3), 3, 2);
      ctx.fillRect(175, 135 - (globalAnimFrame % 2), 2, 2);
      ctx.fillRect(334, 185, 3, 2);
    } else if (circuit.biome === 'sakura') {
      // Pétalos cayendo suavemente
      ctx.fillStyle = '#fbcfe8';
      for (let k = 0; k < 8; k++) {
        const px = (k * 47 + Math.floor(now / 65)) % TRACK_W;
        const py = (k * 29 + Math.floor(now / 95)) % TRACK_H;
        ctx.fillRect(px, py, 2, 2);
      }
    }

    // 4. Banderines / hitos numerados de las 5, 7 o 10 partes del circuito
    for (let s = 0; s < parts; s++) {
      const frac = s / parts;
      const pt = sampleTrack(curve, frac);
      const bx = Math.round(pt.x + pt.nx * 15);
      const by = Math.round(pt.y + pt.ny * 15);
      const isCurrent = s === secIdx;
      const isDone = s < secIdx;

      if (s === 0) continue; // En 0 está la meta

      ctx.fillStyle = '#0f172a';
      ctx.fillRect(bx - 5, by - 5, 11, 10);
      ctx.fillStyle = isCurrent ? '#facc15' : (isDone ? '#22c55e' : '#334155');
      ctx.fillRect(bx - 4, by - 4, 9, 8);
      ctx.fillStyle = isCurrent ? '#0f172a' : '#f8fafc';
      ctx.font = 'bold 7px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(String(s + 1), bx + 0.5, by + 0.5);
    }

    // Luces del arco de meta
    const startPt = sampleTrack(curve, 0);
    const lx = Math.round(startPt.x);
    const ly = Math.round(startPt.y - 12);
    const lightCol = raceView.trafficLight === 'green'
      ? '#22c55e'
      : raceView.trafficLight === 'red'
        ? '#ef4444'
        : raceView.trafficLight === 'amber'
          ? '#facc15'
          : '#64748b';
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(lx - 7, ly - 3, 14, 5);
    ctx.fillStyle = lightCol;
    ctx.fillRect(lx - 5, ly - 2, 3, 3);
    ctx.fillRect(lx - 1, ly - 2, 3, 3);
    ctx.fillRect(lx + 3, ly - 2, 3, 3);

    // 5. Actualizar animaciones de avance de las motos
    const stillActive = [];
    raceView.dashAnimations.forEach((anim) => {
      const t = Math.min(1, (now - anim.startTime) / anim.duration);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - t, 3);
      const rider = raceView.riders.find((r) => r.id === anim.riderId);
      if (rider) {
        rider.visualProgress = anim.from + (anim.to - anim.from) * eased;
        const pt = sampleTrack(curve, rider.visualProgress);
        rider.facingLeft = pt.tx < 0;
        if (t < 0.95 && Math.random() < 0.65) {
          spawnTrackParticle(
            pt.x + pt.nx * rider.laneOffset,
            pt.y + pt.ny * rider.laneOffset,
            anim.kind,
            getTeamPalette(rider.id)
          );
        }
      }
      if (t < 1) {
        stillActive.push(anim);
      } else if (rider) {
        rider.visualProgress = anim.to;
      }
    });
    raceView.dashAnimations = stillActive;

    // 6. Dibujar partículas de pista
    for (let i = raceView.particles.length - 1; i >= 0; i--) {
      const p = raceView.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.life--;
      if (p.life <= 0) {
        raceView.particles.splice(i, 1);
        continue;
      }
      ctx.globalAlpha = Math.max(0.15, p.life / p.maxLife);
      ctx.fillStyle = p.color;
      ctx.fillRect(Math.round(p.x), Math.round(p.y), p.size, p.size);
      ctx.globalAlpha = 1;
    }

    // 7. Dibujar todas las motos (la activa al final para que quede encima)
    const sortedForDraw = raceView.riders.slice().sort((a, b) => {
      if (a.id === raceView.activeRiderId) return 1;
      if (b.id === raceView.activeRiderId) return -1;
      return a.id - b.id;
    });

    sortedForDraw.forEach((r) => {
      const baseProg = Math.min(0.998, Math.max(0, r.visualProgress));
      const prog = ((baseProg + (r.gridStagger || 0)) % 1 + 1) % 1;
      const pt = sampleTrack(curve, prog);
      r.facingLeft = pt.tx < 0;
      const rx = pt.x + pt.nx * r.laneOffset;
      const ry = pt.y + pt.ny * r.laneOffset;
      drawMicroBike(ctx, rx, ry, r, r.id === raceView.activeRiderId, globalAnimFrame);
    });
  }

  /* ==========================================================================
   * TIRA LATERAL DE VELOCIDAD PIXEL-ART 16-BIT (320x68)
   * ========================================================================== */
  function renderSprintStrip(now) {
    const ctx = raceView.sprintCtx;
    const circuit = raceView.circuit;
    if (!ctx || !circuit) return;

    const activeState = now < raceView.sprintStateUntil ? raceView.sprintState : 'idle';
    const targetSpeed = activeState === 'boost' ? 6.5 : (activeState === 'skid' ? 0.8 : 2.6);
    raceView.sprintSpeed += (targetSpeed - raceView.sprintSpeed) * 0.14;
    raceView.sprintScroll = (raceView.sprintScroll + raceView.sprintSpeed) % 320;

    const b = createBrush(ctx, SPRINT_W, SPRINT_H, 0, 0);

    // Cielo
    b.rect(0, 0, SPRINT_W, 24, circuit.skyTop);
    b.ditherRect(0, 14, SPRINT_W, 10, circuit.skyTop, circuit.skyBot, 2);

    // Horizonte parallax lento
    const farOff = Math.floor(raceView.sprintScroll * 0.25) % 80;
    for (let x = -farOff; x < SPRINT_W + 80; x += 80) {
      if (circuit.biome === 'city') {
        b.rect(x + 4, 8, 16, 18, '#0f172a');
        b.rect(x + 26, 4, 20, 22, '#1e293b');
        b.rect(x + 52, 10, 18, 16, '#0f172a');
        b.rect(x + 30, 8, 3, 3, '#fde047');
        b.rect(x + 38, 12, 3, 3, '#38bdf8');
        b.rect(x + 10, 12, 3, 3, '#38bdf8');
      } else if (circuit.biome === 'alpine' || circuit.biome === 'volcano') {
        const col = circuit.biome === 'volcano' ? '#292524' : '#475569';
        const tip = circuit.biome === 'volcano' ? '#f97316' : '#f8fafc';
        for (let r = 0; r < 14; r++) {
          b.hline(x + 24 - r * 2, 10 + r, r * 4 + 2, r < 4 ? tip : col);
        }
      } else if (circuit.biome === 'coast') {
        b.rect(0, 18, SPRINT_W, 8, '#0284c7');
        b.hline(x + 10, 21, 14, '#bae6fd');
        b.hline(x + 46, 23, 12, '#7dd3fc');
      } else if (circuit.biome === 'desert') {
        for (let r = 0; r < 10; r++) {
          b.hline(x + 28 - r * 3, 14 + r, r * 6 + 6, '#c2410c');
        }
      } else {
        // Sakura hills + Fuji
        for (let r = 0; r < 12; r++) {
          b.hline(x + 36 - r * 2, 12 + r, r * 4 + 4, r < 4 ? '#ffffff' : '#64748b');
        }
      }
    }

    // Franja verde/terreno tras el arcén
    b.rect(0, 24, SPRINT_W, 12, circuit.groundA);
    b.ditherRect(0, 24, SPRINT_W, 4, circuit.groundB, circuit.groundA, 2);

    // Postes / árboles parallax medio
    const midOff = Math.floor(raceView.sprintScroll * 0.75) % 64;
    for (let x = -midOff; x < SPRINT_W + 64; x += 64) {
      if (circuit.biome === 'coast') drawPalmTree(b, x + 20, 34);
      else if (circuit.biome === 'alpine') drawPineTree(b, x + 20, 34);
      else if (circuit.biome === 'desert') drawCactus(b, x + 20, 34);
      else if (circuit.biome === 'sakura') drawSakuraTree(b, x + 20, 34);
      else if (circuit.biome === 'city') {
        b.rect(x + 20, 20, 2, 14, '#64748b');
        b.rect(x + 17, 19, 8, 2, '#06b6d4');
      } else {
        b.rect(x + 18, 28, 8, 6, '#1c1917');
        b.px(x + 21, 30, '#f97316');
      }
    }

    // Piano superior del asfalto
    const roadOff = Math.floor(raceView.sprintScroll * 1.6) % 24;
    for (let x = -roadOff; x < SPRINT_W + 24; x += 12) {
      const idx = Math.floor((x + roadOff) / 12);
      b.rect(x, 35, 12, 3, idx % 2 === 0 ? circuit.kerbA : circuit.kerbB);
    }

    // Asfalto principal
    b.rect(0, 38, SPRINT_W, 26, circuit.asphalt);
    b.hline(0, 38, SPRINT_W, circuit.asphaltDark);
    b.rect(0, 44, SPRINT_W, 14, circuit.asphaltLight, 0.35);

    // Línea discontinua veloz
    const dashOff = Math.floor(raceView.sprintScroll * 2.2) % 32;
    for (let x = -dashOff; x < SPRINT_W + 32; x += 32) {
      b.rect(x, 50, 14, 2, '#f8fafc', 0.75);
    }

    // Piano inferior
    for (let x = -roadOff; x < SPRINT_W + 24; x += 12) {
      const idx = Math.floor((x + roadOff) / 12);
      b.rect(x, 64, 12, 4, idx % 2 === 0 ? circuit.kerbB : circuit.kerbA);
    }

    // Dibujar la moto del piloto activo en el centro-izquierda de la tira
    const activeRider = raceView.riders.find((r) => r.id === raceView.activeRiderId) || raceView.riders[0];
    if (activeRider) {
      const boostShift = activeState === 'boost' ? 18 : (activeState === 'skid' ? -8 : 0);
      drawBikeSprite(ctx, SPRINT_W, SPRINT_H, activeRider, globalAnimFrame, activeState, 118 + boostShift, 18);
    }
  }

  /* ==========================================================================
   * BUCLE DE ANIMACIÓN GLOBAL (~60 FPS PISTA, ~10 FPS SPRITES PIXEL-ART)
   * ========================================================================== */
  function animationLoop(now) {
    if (now - lastBikeTick >= 95) {
      lastBikeTick = now;
      globalAnimFrame = (globalAnimFrame + 1) % 1024;

      bikeRegistry.forEach((item) => {
        if (item.stateUntil && now > item.stateUntil) {
          item.state = 'idle';
          item.stateUntil = 0;
        }
        renderSingleBike(item);
      });
    }

    if (raceView.circuit && raceView.trackCanvas) {
      renderTrackFrame(now);
    }
    if (raceView.circuit && raceView.sprintCanvas) {
      renderSprintStrip(now);
    }

    root.requestAnimationFrame(animationLoop);
  }

  root.requestAnimationFrame(animationLoop);

  root.MotosPixelArt = {
    registerBikePreview,
    unregisterBikePreview,
    updateBikePreview,
    setBikePreviewState,
    drawCircuitPreview,
    initRaceStage,
    loadCircuit,
    setActiveRaceContext,
    setTrafficLight,
    animateRiderSector,
    snapRidersProgress
  };
})(typeof window !== 'undefined' ? window : globalThis);
