/* ==========================================================================
   MOTOR DE ARTE PIXEL 16-BIT (SPRITES EN CANVAS OFFSCREEN SIN SUAVIZADO)
   ========================================================================== */

const PixelArt = (() => {
  function makeCanvas(w, h) {
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    return { canvas, ctx };
  }

  function px(ctx, x, y, color, w = 1, h = 1) {
    ctx.fillStyle = color;
    ctx.fillRect(Math.floor(x), Math.floor(y), Math.floor(w), Math.floor(h));
  }

  // Traza píxeles simétricos respecto al eje vertical de un lienzo de ancho W
  function symPx(ctx, W, x, y, color, w = 1, h = 1) {
    ctx.fillStyle = color;
    const ix = Math.floor(x);
    const iy = Math.floor(y);
    const iw = Math.floor(w);
    const ih = Math.floor(h);
    ctx.fillRect(ix, iy, iw, ih);
    const mx = W - ix - iw;
    if (mx !== ix) {
      ctx.fillRect(mx, iy, iw, ih);
    }
  }

  // Traza una fila horizontal simétrica desde x1 hasta x2 (incluidos) en la mitad izquierda
  function symSpan(ctx, W, x1, x2, y, color) {
    const leftW = x2 - x1 + 1;
    if (leftW <= 0) return;
    symPx(ctx, W, x1, y, color, leftW, 1);
  }

  /* ------------------------------------------------------------------------
     1. NAVE ESPACIAL DE EXPLORACIÓN (48x48 PIXEL GRID, MULTI-FRAME)
     ------------------------------------------------------------------------ */
  function buildStarshipFrame(mode, frameIdx) {
    const W = 48;
    const H = 48;
    const { canvas, ctx } = makeCanvas(W, H);

    // Paleta 16-bit de acero espacial, cian energético y dorado de mando
    const C = {
      out: '#080e24',
      navy: '#172752',
      steelDk: '#243c7a',
      steelMd: '#3f69b8',
      steelLt: '#7eb6eb',
      white: '#eaf7ff',
      pure: '#ffffff',
      cyanDk: '#006f8f',
      cyanMd: '#00b8d9',
      cyanBt: '#00f0ff',
      cyanGl: '#9efbff',
      goldDk: '#a86b00',
      goldMd: '#e6a800',
      goldBt: '#ffd633',
      goldHl: '#fff4a8',
      emDk: '#008c4f',
      emBt: '#00ff88',
      redBt: '#ff2a55',
      redDk: '#5e142a',
      emDim: '#104a32'
    };

    // --- A) LLAMAS DE PROPULSORES IÓNICOS (triple tobera animada) ---
    const flamePalettes = {
      idle: ['#143d99', '#0088ff', '#00f0ff', '#ffffff'],
      boost: ['#008f68', '#00d9ff', '#00ff88', '#ffffff'],
      warp: ['#ff2a85', '#ff8c00', '#ffd000', '#ffffff']
    };
    const fp = flamePalettes[mode] || flamePalettes.idle;

    const mainLens = mode === 'warp' ? [12, 13, 11, 13]
      : mode === 'boost' ? [10, 12, 9, 11]
      : [6, 8, 5, 7];
    const sideLens = mode === 'warp' ? [9, 10, 8, 10]
      : mode === 'boost' ? [7, 9, 6, 8]
      : [3, 5, 4, 3];

    const mLen = mainLens[frameIdx % 4];
    const sLen = sideLens[frameIdx % 4];

    // Propulsor central (x = 21..26, y = 34..34+mLen)
    for (let dy = 0; dy < mLen; dy++) {
      const t = dy / Math.max(1, mLen - 1);
      const y = 34 + dy;
      const halfW = t < 0.25 ? 3 : t < 0.6 ? 2 : 1;
      px(ctx, 24 - halfW, y, fp[0], halfW * 2, 1);
      if (halfW >= 2) {
        px(ctx, 24 - (halfW - 1), y, t < 0.45 ? fp[2] : fp[1], (halfW - 1) * 2, 1);
      }
      if (dy < Math.max(2, Math.floor(mLen * 0.42))) {
        px(ctx, 23, y, fp[3], 2, 1);
      }
    }
    // Chispas desprendidas del chorro central
    if (mode !== 'idle') {
      const sparkY = Math.min(46, 35 + mLen + (frameIdx % 2));
      px(ctx, frameIdx % 2 === 0 ? 22 : 25, sparkY, fp[2], 1, 1);
      px(ctx, 23 + (frameIdx % 2), Math.min(47, sparkY), fp[3], 1, 1);
    }

    // Propulsores laterales dobles (x = 14..17 y 30..33, y = 34..34+sLen)
    for (let dy = 0; dy < sLen; dy++) {
      const t = dy / Math.max(1, sLen - 1);
      const y = 34 + dy;
      const w = t < 0.5 ? 2 : 1;
      symPx(ctx, W, 15 + (w === 1 ? 1 : 0), y, t < 0.35 ? fp[2] : fp[1], w, 1);
      if (dy < 2) {
        symPx(ctx, W, 15, y, fp[3], 2, 1);
      }
    }

    // --- B) ALAS ARTICULADAS Y PODS LATERALES ---
    // Contorno exterior de las alas barridas hacia atrás
    const wingOutline = [
      [14, 17, 17],
      [13, 18, 18],
      [11, 19, 19],
      [9, 20, 20],
      [7, 21, 21],
      [6, 22, 22],
      [5, 23, 23],
      [4, 24, 24],
      [3, 25, 25],
      [2, 26, 26],
      [2, 27, 27],
      [2, 28, 28],
      [2, 29, 29],
      [3, 30, 30],
      [4, 31, 31],
      [5, 32, 32],
      [7, 33, 33]
    ];
    for (const [x1, x2, y] of wingOutline) {
      symSpan(ctx, W, x1, x2, y, C.out);
    }

    // Relleno blindado de alas con degradado 16-bit
    symSpan(ctx, W, 14, 17, 18, C.steelMd);
    symSpan(ctx, W, 12, 18, 19, C.steelMd);
    symSpan(ctx, W, 10, 18, 20, C.steelLt);
    symSpan(ctx, W, 8, 18, 21, C.steelMd);
    symSpan(ctx, W, 7, 18, 22, C.steelMd);
    symSpan(ctx, W, 6, 18, 23, C.steelDk);
    symSpan(ctx, W, 5, 18, 24, C.steelMd);
    symSpan(ctx, W, 4, 18, 25, C.steelMd);
    symSpan(ctx, W, 3, 18, 26, C.steelDk);
    symSpan(ctx, W, 3, 17, 27, C.steelDk);
    symSpan(ctx, W, 3, 16, 28, C.navy);
    symSpan(ctx, W, 4, 16, 29, C.navy);
    symSpan(ctx, W, 5, 15, 30, C.steelDk);
    symSpan(ctx, W, 6, 13, 31, C.navy);

    // Borde de ataque blanco/cian luminoso en las alas
    symPx(ctx, W, 13, 19, C.white, 2, 1);
    symPx(ctx, W, 11, 20, C.white, 2, 1);
    symPx(ctx, W, 9, 21, C.steelLt, 2, 1);
    symPx(ctx, W, 7, 22, C.steelLt, 2, 1);
    symPx(ctx, W, 6, 23, C.steelLt, 1, 1);
    symPx(ctx, W, 5, 24, C.steelLt, 1, 1);
    symPx(ctx, W, 4, 25, C.steelLt, 1, 1);

    // Conductos de energía cian en las alas + galones dorados
    symPx(ctx, W, 13, 21, C.goldBt, 3, 1);
    symPx(ctx, W, 12, 22, C.goldMd, 3, 1);
    symPx(ctx, W, 10, 24, C.cyanBt, 5, 1);
    symPx(ctx, W, 9, 25, C.cyanMd, 5, 1);
    symPx(ctx, W, 7, 27, C.cyanDk, 4, 1);

    // Costuras de paneles metálicos
    symPx(ctx, W, 11, 23, C.out, 1, 6);
    symPx(ctx, W, 7, 25, C.out, 1, 5);

    // Pods sensores/cañones delanteros en mitad de las alas (x = 9..11 y 36..38)
    symPx(ctx, W, 9, 15, C.out, 3, 9);
    symPx(ctx, W, 10, 16, C.white, 1, 5);
    symPx(ctx, W, 10, 21, C.goldBt, 1, 2);
    symPx(ctx, W, 10, 14, mode === 'warp' ? C.goldHl : C.cyanBt, 1, 2);

    // Estabilizadores de punta de ala + balizas de navegación parpadeantes
    symPx(ctx, W, 2, 24, C.out, 2, 8);
    symPx(ctx, W, 3, 25, C.steelLt, 1, 5);
    const portOn = frameIdx === 0 || frameIdx === 1;
    const stbdOn = frameIdx === 2 || frameIdx === 3;
    // Babor (izquierda) rojo parpadeante
    px(ctx, 2, 26, portOn ? C.redBt : C.redDk, 2, 2);
    if (portOn) px(ctx, 1, 26, 'rgba(255, 42, 85, 0.55)', 1, 2);
    // Estribor (derecha) verde esmeralda parpadeante
    px(ctx, 44, 26, stbdOn ? C.emBt : C.emDk, 2, 2);
    if (stbdOn) px(ctx, 46, 26, 'rgba(0, 255, 136, 0.55)', 1, 2);

    // --- C) FUSELAJE CENTRAL BLINDADO ---
    const hullRows = [
      [23, 23, 2],
      [22, 23, 3],
      [22, 23, 4],
      [21, 23, 5],
      [21, 23, 6],
      [20, 23, 7],
      [19, 23, 8],
      [18, 23, 9],
      [18, 23, 10],
      [17, 23, 11],
      [17, 23, 12],
      [16, 23, 13],
      [16, 23, 14],
      [16, 23, 15],
      [16, 23, 16],
      [15, 23, 17],
      [15, 23, 18],
      [15, 23, 19],
      [15, 23, 20],
      [15, 23, 21],
      [15, 23, 22],
      [15, 23, 23],
      [15, 23, 24],
      [15, 23, 25],
      [15, 23, 26],
      [14, 23, 27],
      [14, 23, 28],
      [14, 23, 29],
      [14, 23, 30],
      [14, 23, 31],
      [14, 23, 32]
    ];
    // Contorno exterior del fuselaje
    for (const [x1, x2, y] of hullRows) {
      symSpan(ctx, W, x1 - 1, x2, y, C.out);
    }
    symSpan(ctx, W, 22, 23, 1, C.out);
    symSpan(ctx, W, 14, 23, 33, C.out);

    // Sombreado tridimensional direccional (luz desde arriba-izquierda)
    for (const [x1, x2, y] of hullRows) {
      // Lado izquierdo iluminado (blanco / acero claro)
      px(ctx, x1, y, y < 15 ? C.white : C.steelLt, x2 - x1 + 1, 1);
      // Lado derecho sombreado (acero medio / acero oscuro)
      const rx1 = W - 1 - x2;
      const rx2 = W - 1 - x1;
      px(ctx, rx1, y, y < 14 ? C.steelLt : C.steelMd, rx2 - rx1 + 1, 1);
      // Borde derecho más oscuro para volumen 16-bit
      if (rx2 - rx1 >= 2) {
        px(ctx, rx2 - 1, y, C.steelDk, 2, 1);
      }
      // Borde izquierdo de reflejo puro
      if (x2 - x1 >= 2 && y >= 4 && y <= 26) {
        px(ctx, x1, y, C.pure, 1, 1);
      }
    }

    // Espina dorsal brillante y collarín dorado en la proa
    px(ctx, 23, 3, C.pure, 1, 5);
    px(ctx, 24, 3, C.white, 1, 5);
    symSpan(ctx, W, 20, 23, 7, C.goldBt);
    symSpan(ctx, W, 19, 23, 8, C.goldMd);
    px(ctx, 21, 7, C.goldHl, 3, 1);

    // Franjas doradas y detalles de blindaje lateral
    symPx(ctx, W, 16, 15, C.goldBt, 2, 3);
    symPx(ctx, W, 16, 18, C.goldDk, 2, 1);
    symPx(ctx, W, 17, 23, C.cyanBt, 2, 5);
    symPx(ctx, W, 17, 24, C.cyanGl, 1, 2);
    symPx(ctx, W, 16, 29, C.steelDk, 3, 2);

    // --- D) CABINA DE CRISTAL REFLECTANTE (x = 20..27, y = 10..19) ---
    // Marco oscuro de la cúpula
    px(ctx, 21, 10, C.out, 6, 1);
    px(ctx, 20, 11, C.out, 8, 8);
    px(ctx, 21, 19, C.out, 6, 1);
    // Cristal con gradiente cian profundo -> cian neón
    px(ctx, 22, 11, C.cyanBt, 4, 1);
    px(ctx, 21, 12, C.cyanBt, 6, 2);
    px(ctx, 21, 14, C.cyanMd, 6, 3);
    px(ctx, 21, 17, C.cyanDk, 6, 2);
    // Reflejo especular diagonal nítido sobre el vidrio
    px(ctx, 22, 11, C.pure, 2, 1);
    px(ctx, 21, 12, C.pure, 2, 2);
    px(ctx, 21, 14, C.cyanGl, 1, 2);
    px(ctx, 23, 13, C.cyanGl, 1, 1);
    // Pequeño destello del HUD interior en la parte baja de la cabina
    px(ctx, 24, 17, frameIdx % 2 === 0 ? C.goldHl : C.emBt, 2, 1);

    // --- E) NÚCLEO DE REACTOR DORSAL (y = 21..27) ---
    px(ctx, 21, 21, C.out, 6, 7);
    px(ctx, 22, 22, C.navy, 4, 5);
    const coreColor = mode === 'warp' ? C.goldBt : mode === 'boost' ? C.emBt : C.cyanBt;
    const coreCore = mode === 'warp' ? C.goldHl : C.pure;
    px(ctx, 22, 23, coreColor, 4, 3);
    px(ctx, 23, 23 + (frameIdx % 2), coreCore, 2, 2);
    // Costillas metálicas sobre el reactor
    px(ctx, 21, 28, C.steelDk, 6, 2);
    px(ctx, 22, 28, C.steelLt, 4, 1);

    // --- F) MINI-ANTENA / PLATO SENSOR ROTATORIO (lado estribor del fuselaje) ---
    // Base del mástil en (28, 22)
    px(ctx, 28, 21, C.out, 4, 4);
    px(ctx, 29, 22, C.goldDk, 2, 2);
    const dishPhase = frameIdx % 4;
    if (dishPhase === 0) {
      // Plato inclinado izquierda
      px(ctx, 28, 20, C.white, 3, 1);
      px(ctx, 28, 21, C.steelLt, 2, 2);
      px(ctx, 30, 22, C.goldBt, 1, 1);
      px(ctx, 27, 20, C.cyanBt, 1, 1);
    } else if (dishPhase === 1) {
      // Plato frontal amplio
      px(ctx, 28, 20, C.white, 4, 1);
      px(ctx, 29, 21, C.goldBt, 2, 1);
      px(ctx, 29, 19, C.cyanGl, 2, 1);
    } else if (dishPhase === 2) {
      // Plato inclinado derecha
      px(ctx, 29, 20, C.white, 3, 1);
      px(ctx, 30, 21, C.steelLt, 2, 2);
      px(ctx, 29, 22, C.goldBt, 1, 1);
      px(ctx, 32, 20, C.cyanBt, 1, 1);
    } else {
      // Plato de perfil
      px(ctx, 29, 19, C.white, 2, 3);
      px(ctx, 30, 20, C.goldBt, 1, 2);
      px(ctx, 30, 18, C.cyanBt, 1, 1);
    }

    // --- G) TOBERAS TRASERAS (3 motores) ---
    // Tobera central
    px(ctx, 20, 31, C.out, 8, 4);
    px(ctx, 21, 31, C.steelDk, 6, 2);
    px(ctx, 22, 31, C.steelLt, 3, 1);
    px(ctx, 21, 33, fp[2], 6, 1);
    px(ctx, 22, 33, C.pure, 4, 1);
    // Toberas laterales
    symPx(ctx, W, 14, 31, C.out, 4, 4);
    symPx(ctx, W, 15, 31, C.steelMd, 2, 2);
    symPx(ctx, W, 15, 33, fp[2], 2, 1);

    return canvas;
  }

  /* ------------------------------------------------------------------------
     2. ESCUDO HEXAGONAL PIXEL-ART (64x64 PIXEL GRID, 4 FRAMES)
     ------------------------------------------------------------------------ */
  function buildHexShieldFrame(variant, frameIdx) {
    const S = 64;
    const { canvas, ctx } = makeCanvas(S, S);
    const cx = 31.5;
    const cy = 31.5;
    const R = 28;
    const isSurge = variant === 'surge';

    const colEdge = isSurge ? '#00ff88' : '#00f0ff';
    const colHex = isSurge ? 'rgba(0, 255, 136, 0.52)' : 'rgba(0, 240, 255, 0.22)';
    const colFill = isSurge ? 'rgba(0, 255, 160, 0.14)' : 'rgba(0, 220, 255, 0.06)';
    const colSpark = isSurge ? '#e6fff4' : '#a8fbff';

    for (let y = 0; y < S; y++) {
      for (let x = 0; x < S; x++) {
        const dx = x - cx;
        const dy = y - cy;
        const d = Math.hypot(dx, dy);
        if (d > R + 0.6) continue;

        if (d >= R - 1.3) {
          // Borde exterior pixelado con efecto shimmer rotatorio
          const ang = Math.atan2(dy, dx);
          const wave = Math.sin(ang * 6 + frameIdx * (Math.PI / 2));
          if (wave > 0.55) {
            px(ctx, x, y, colSpark);
          } else if (wave > -0.65 || isSurge) {
            px(ctx, x, y, colEdge);
          }
        } else {
          // Relleno sutil + patrón de celdas hexagonales pixel-art
          const hx = (x + (Math.floor(y / 6) % 2) * 4) % 8;
          const hy = y % 6;
          const isHexLine =
            (hy === 0 && hx >= 2 && hx <= 5) ||
            (hy === 1 && (hx === 1 || hx === 6)) ||
            (hy === 2 && (hx === 0 || hx === 7)) ||
            (hy === 3 && (hx === 0 || hx === 7)) ||
            (hy === 4 && (hx === 1 || hx === 6));

          if (isHexLine && (d > R - 11 || isSurge)) {
            const pulseBand = ((x + y + frameIdx * 4) % 16) < 4;
            px(ctx, x, y, pulseBand && isSurge ? colSpark : colHex);
          } else if (d > R - 5) {
            px(ctx, x, y, colFill);
          }
        }
      }
    }

    return canvas;
  }

  /* ------------------------------------------------------------------------
     3. EXPLOSIÓN / FRAGMENTACIÓN PIXEL-ART (56x56 PIXEL GRID, 6 FRAMES)
     ------------------------------------------------------------------------ */
  function buildExplosionFrame(frameIdx) {
    const S = 56;
    const { canvas, ctx } = makeCanvas(S, S);
    const cx = 27.5;
    const cy = 27.5;

    // Radio y paleta por fotograma
    const radii = [9, 16, 21, 24, 26, 27];
    const innerR = [0, 4, 10, 15, 19, 23];
    const rOut = radii[frameIdx];
    const rIn = innerR[frameIdx];

    for (let y = 0; y < S; y++) {
      for (let x = 0; x < S; x++) {
        const dx = x - cx;
        const dy = y - cy;
        const d = Math.hypot(dx, dy);
        const ang = Math.atan2(dy, dx);
        // Forma dentada 16-bit usando armónicos deterministas
        const jag = Math.sin(ang * 7 + frameIdx * 1.3) * 2.4 + Math.cos(ang * 11 - frameIdx) * 1.6;
        const effOut = rOut + jag;
        const effIn = Math.max(0, rIn + jag * 0.6);

        if (d <= effOut && d >= effIn) {
          const norm = (d - effIn) / Math.max(1, effOut - effIn);
          // Dither pixelado en los bordes y últimos fotogramas
          const dither = (x + y) % 2 === 0;
          if (frameIdx === 0) {
            px(ctx, x, y, norm < 0.5 ? '#ffffff' : norm < 0.8 ? '#fff2a6' : '#ffd000');
          } else if (frameIdx === 1) {
            px(ctx, x, y, norm < 0.3 ? '#ffffff' : norm < 0.6 ? '#ffd000' : norm < 0.85 ? '#ff5e2b' : '#ff2a85');
          } else if (frameIdx === 2) {
            px(ctx, x, y, norm < 0.25 ? '#fff2a6' : norm < 0.55 ? '#ff8c00' : norm < 0.82 ? '#ff2a85' : '#8a1253');
          } else if (frameIdx === 3) {
            if (norm > 0.85 && !dither) continue;
            px(ctx, x, y, norm < 0.35 ? '#ffd000' : norm < 0.65 ? '#ff2a85' : '#57194b');
          } else if (frameIdx === 4) {
            if (!dither && norm > 0.45) continue;
            px(ctx, x, y, norm < 0.45 ? '#ff5e2b' : '#4a1b47');
          } else {
            if ((x * 3 + y * 5) % 4 !== 0) continue;
            px(ctx, x, y, norm < 0.5 ? '#ff2a85' : '#3a1b4a');
          }
        }
      }
    }

    // Rayos de destello en cruz y esquirlas del casco en los primeros frames
    if (frameIdx <= 2) {
      const ray = 14 + frameIdx * 5;
      px(ctx, cx - ray, cy, '#ffffff', ray * 2, 2);
      px(ctx, cx, cy - ray, '#ffffff', 2, ray * 2);
    }
    if (frameIdx >= 1 && frameIdx <= 4) {
      const spread = 6 + frameIdx * 4.5;
      const shards = [
        [1, -0.8, '#eaf7ff'],
        [-1, -0.7, '#00f0ff'],
        [0.9, 0.85, '#ffd000'],
        [-0.85, 0.9, '#7eb6eb'],
        [0.2, -1.1, '#ff2a85'],
        [-0.3, 1.1, '#ff8c00']
      ];
      for (const [vx, vy, col] of shards) {
        px(ctx, cx + vx * spread, cy + vy * spread, col, 2, 2);
      }
    }

    return canvas;
  }

  /* ------------------------------------------------------------------------
     4. PLANETA ALIENÍGENA ANILLADO (78x48) Y LUNA ORBITANTE (12x12)
     ------------------------------------------------------------------------ */
  function buildRingedPlanet() {
    const W = 78;
    const H = 48;
    const { canvas, ctx } = makeCanvas(W, H);
    const cx = 39;
    const cy = 24;
    const R = 14.5;

    function drawRingHalf(isFront) {
      for (let y = 0; y < H; y++) {
        for (let x = 0; x < W; x++) {
          const dx = x - cx;
          const dy = y - cy;
          // Rotar -14 grados para anillos inclinados
          const cos = 0.97;
          const sin = -0.24;
          const rx = dx * cos - dy * sin;
          const ry = dx * sin + dy * cos;

          if (isFront ? ry < 0 : ry >= 0) continue;

          const ell = Math.hypot(rx / 35, ry / 8.8);
          if (ell < 0.56 || ell > 1.0) continue;
          // División de Cassini (banda oscura vacía)
          if (ell > 0.77 && ell < 0.82) continue;

          // Sombra proyectada del planeta sobre la parte trasera derecha del anillo
          const inShadow = !isFront && dx > 4 && dx < 22 && dy > -10 && dy < 4;

          let col = '#7b5cd6';
          if (ell > 0.91) col = '#4ceeff';
          else if (ell > 0.82) col = '#c2a6ff';
          else if (ell > 0.67) col = '#ffd066';
          else col = '#8b5fbf';

          if (inShadow) col = '#141538';
          if ((x + y) % 2 === 0 || ell > 0.63) {
            px(ctx, x, y, col);
          }
        }
      }
    }

    // 1. Mitad trasera del anillo
    drawRingHalf(false);

    // 2. Esfera del planeta con bandas atmosféricas, tormenta y terminador
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const dx = x - cx;
        const dy = y - cy;
        const d = Math.hypot(dx, dy);
        if (d > R) continue;

        // Coordenada de latitud inclinada para las bandas nubosas
        const lat = (dy * 0.97 + dx * 0.24) / R;
        // Iluminación desde arriba-izquierda
        const light = (-dx * 0.68 - dy * 0.62) / R;
        const dither = ((x + y) % 2) * 0.11;

        // Base por banda atmosférica
        let col;
        if (lat < -0.55) col = '#312573';
        else if (lat < -0.2) col = '#4f38a8';
        else if (lat < 0.08) col = '#7c44b8';
        else if (lat < 0.34) col = '#2a6b9e';
        else if (lat < 0.6) col = '#3c3082';
        else col = '#221b54';

        // Óvalo de tormenta cósmica
        const sdx = (dx + 4) / 4.2;
        const sdy = (dy - 2) / 2.2;
        if (sdx * sdx + sdy * sdy < 1) {
          col = (sdx * sdx + sdy * sdy < 0.42) ? '#ff88c2' : '#d63384';
        }

        // Sombreado de lado nocturno y borde atmosférico iluminado
        if (light + dither < -0.42) {
          col = '#0c0f2b';
        } else if (light + dither < -0.1) {
          col = '#1a1c4a';
        } else if (d > R - 1.7 && light > 0.15) {
          col = '#7cf7ff';
        } else if (light + dither > 0.55) {
          col = lat > 0.05 && lat < 0.35 ? '#4ceeff' : '#b28cff';
        }

        px(ctx, x, y, col);
      }
    }

    // 3. Mitad delantera del anillo pasando por delante del planeta
    drawRingHalf(true);

    return canvas;
  }

  function buildPixelMoon() {
    const S = 12;
    const { canvas, ctx } = makeCanvas(S, S);
    const cx = 5.5;
    const cy = 5.5;
    const R = 4.6;
    for (let y = 0; y < S; y++) {
      for (let x = 0; x < S; x++) {
        const dx = x - cx;
        const dy = y - cy;
        if (Math.hypot(dx, dy) > R) continue;
        const light = (-dx * 0.7 - dy * 0.7) / R;
        let col = light > 0.35 ? '#e8f6ff' : light > -0.15 ? '#8fb2de' : '#2a3a6b';
        px(ctx, x, y, col);
      }
    }
    // Cráteres diminutos
    px(ctx, 4, 4, '#5a7cb0', 2, 1);
    px(ctx, 7, 6, '#1c284f', 1, 2);
    px(ctx, 4, 7, '#6c8ec4', 1, 1);
    return canvas;
  }

  /* ------------------------------------------------------------------------
     5. EMISORES LÁSER / BARRERA DE ENERGÍA PIXEL-ART (24x34, IZQ/DER, 4 FRAMES)
     ------------------------------------------------------------------------ */
  function buildEmitterFrame(side, mode, frameIdx) {
    const W = 24;
    const H = 34;
    const { canvas, ctx } = makeCanvas(W, H);

    const isScanned = mode === 'scanned';
    const coreBright = isScanned ? '#00ff88' : '#ff2a85';
    const coreGlow = isScanned ? '#a8ffd9' : '#ffb8dc';
    const accent = isScanned ? '#00f0ff' : '#b400ff';

    // Dibujamos orientado hacia la derecha (emisor izquierdo) y luego espejamos si side === 'right'
    const work = makeCanvas(W, H);
    const wctx = work.ctx;

    // Base blindada anclada al borde
    px(wctx, 1, 3, '#080e24', 14, 28);
    px(wctx, 2, 4, '#1b2b59', 11, 26);
    px(wctx, 3, 5, '#2e478a', 9, 24);
    px(wctx, 3, 5, '#6c92d4', 8, 2); // brillo superior

    // Soportes superior e inferior con franjas doradas de advertencia
    px(wctx, 2, 2, '#080e24', 16, 5);
    px(wctx, 3, 3, '#3b579e', 13, 3);
    px(wctx, 5, 4, '#ffd000', 2, 1);
    px(wctx, 9, 4, '#ffd000', 2, 1);
    px(wctx, 13, 4, '#ffd000', 2, 1);

    px(wctx, 2, 27, '#080e24', 16, 5);
    px(wctx, 3, 28, '#233870', 13, 3);
    px(wctx, 5, 29, '#c98a00', 2, 1);
    px(wctx, 9, 29, '#c98a00', 2, 1);
    px(wctx, 13, 29, '#c98a00', 2, 1);

    // Condensadores verticales energizados
    px(wctx, 5, 9, '#091026', 4, 16);
    const chargeY = 22 - (frameIdx % 4) * 3;
    px(wctx, 6, 10, accent, 2, 14);
    px(wctx, 6, chargeY, coreGlow, 2, 3);

    // Pinzas enfocadoras frontales
    px(wctx, 13, 8, '#080e24', 7, 5);
    px(wctx, 14, 9, '#7eb6eb', 5, 2);
    px(wctx, 14, 11, '#2d4b94', 4, 1);

    px(wctx, 13, 21, '#080e24', 7, 5);
    px(wctx, 14, 22, '#7eb6eb', 5, 2);
    px(wctx, 14, 24, '#2d4b94', 4, 1);

    // Cristal emisor central pulsante
    px(wctx, 12, 13, '#080e24', 8, 8);
    px(wctx, 13, 14, accent, 6, 6);
    px(wctx, 14, 15, coreBright, 5, 4);
    px(wctx, 16, 16, '#ffffff', 3, 2);

    // Arcos eléctricos pixel-art saliendo de la boquilla
    const arcOffsets = [
      [[20, 15], [21, 14], [22, 16], [23, 17], [20, 19], [22, 18]],
      [[20, 16], [21, 17], [22, 15], [23, 16], [21, 19], [23, 18]],
      [[20, 17], [21, 16], [22, 18], [23, 16], [20, 14], [22, 15]],
      [[20, 15], [21, 18], [22, 17], [23, 15], [21, 16], [22, 19]]
    ];
    for (const [ax, ay] of arcOffsets[frameIdx % 4]) {
      px(wctx, ax, ay, (ax + ay) % 2 === 0 ? coreGlow : coreBright, 1, 1);
    }

    if (side === 'right') {
      ctx.save();
      ctx.translate(W, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(work.canvas, 0, 0);
      ctx.restore();
    } else {
      ctx.drawImage(work.canvas, 0, 0);
    }

    return canvas;
  }

  /* ------------------------------------------------------------------------
     CACHÉ DE SPRITES PRE-RENDERIZADOS (INICIALIZACIÓN PEREZOSA SEGURA)
     ------------------------------------------------------------------------ */
  let cache = null;

  function ensureCache() {
    if (cache) return cache;
    cache = {
      ships: { idle: [], boost: [], warp: [] },
      shields: { ambient: [], surge: [] },
      explosions: [],
      planet: buildRingedPlanet(),
      moon: buildPixelMoon(),
      emitters: {
        leftLocked: [],
        rightLocked: [],
        leftScanned: [],
        rightScanned: []
      }
    };

    for (let f = 0; f < 4; f++) {
      cache.ships.idle.push(buildStarshipFrame('idle', f));
      cache.ships.boost.push(buildStarshipFrame('boost', f));
      cache.ships.warp.push(buildStarshipFrame('warp', f));

      cache.shields.ambient.push(buildHexShieldFrame('ambient', f));
      cache.shields.surge.push(buildHexShieldFrame('surge', f));

      cache.emitters.leftLocked.push(buildEmitterFrame('left', 'locked', f));
      cache.emitters.rightLocked.push(buildEmitterFrame('right', 'locked', f));
      cache.emitters.leftScanned.push(buildEmitterFrame('left', 'scanned', f));
      cache.emitters.rightScanned.push(buildEmitterFrame('right', 'scanned', f));
    }

    for (let f = 0; f < 6; f++) {
      cache.explosions.push(buildExplosionFrame(f));
    }

    return cache;
  }

  /* ------------------------------------------------------------------------
     FUNCIONES DE DIBUJO CON PIXEL-ART NÍTIDO (imageSmoothingEnabled = false)
     ------------------------------------------------------------------------ */
  function drawCrisp(ctx, sprite, cx, cy, scale = 2, alpha = 1) {
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.globalAlpha = alpha;
    const dw = Math.round(sprite.width * scale);
    const dh = Math.round(sprite.height * scale);
    const dx = Math.round(cx - dw / 2);
    const dy = Math.round(cy - dh / 2);
    ctx.drawImage(sprite, dx, dy, dw, dh);
    ctx.restore();
  }

  function drawStarship(ctx, cx, cy, opts = {}) {
    const c = ensureCache();
    const mode = opts.mode || 'idle';
    const time = opts.time || 0;
    const scale = opts.scale || 2;
    const fps = mode === 'warp' ? 16 : mode === 'boost' ? 14 : 7;
    const frame = Math.floor(time * fps) % 4;
    const bank = opts.bank || 0;

    ctx.save();
    ctx.translate(Math.round(cx), Math.round(cy));
    if (Math.abs(bank) > 0.005) {
      ctx.rotate(bank);
    }

    // Aura de escudo hexagonal si tiene escudos o está cruzando con éxito
    if (opts.shieldSurge > 0.01) {
      const sf = Math.floor(time * 12) % 4;
      drawCrisp(ctx, c.shields.surge[sf], 0, -2, scale * 0.95, Math.min(1, opts.shieldSurge));
    } else if (opts.hasShields) {
      const sf = Math.floor(time * 5) % 4;
      const pulse = 0.42 + 0.18 * Math.sin(time * 4);
      drawCrisp(ctx, c.shields.ambient[sf], 0, -2, scale * 0.92, pulse);
    }

    const shipSprite = (c.ships[mode] || c.ships.idle)[frame];
    drawCrisp(ctx, shipSprite, 0, 0, scale, 1);
    ctx.restore();
  }

  function drawExplosion(ctx, cx, cy, progress, scale = 2.4) {
    const c = ensureCache();
    const idx = Math.min(c.explosions.length - 1, Math.max(0, Math.floor(progress * c.explosions.length)));
    const alpha = progress > 0.8 ? Math.max(0, 1 - (progress - 0.8) / 0.2) : 1;
    drawCrisp(ctx, c.explosions[idx], cx, cy, scale, alpha);
  }

  function drawPlanetAndMoon(ctx, cx, cy, time, scale = 2) {
    const c = ensureCache();
    const orbitAngle = time * 0.45;
    const moonX = cx + Math.cos(orbitAngle) * (44 * scale);
    const moonY = cy + Math.sin(orbitAngle) * (13 * scale) - Math.cos(orbitAngle) * (5 * scale);
    const moonInFront = Math.sin(orbitAngle) >= 0;

    if (!moonInFront) {
      drawCrisp(ctx, c.moon, moonX, moonY, scale * 0.85, 0.85);
    }
    drawCrisp(ctx, c.planet, cx, cy, scale, 0.92);
    if (moonInFront) {
      drawCrisp(ctx, c.moon, moonX, moonY, scale * 0.95, 0.98);
    }
  }

  function drawEmitter(ctx, side, cx, cy, time, scanned = false, scale = 2) {
    const c = ensureCache();
    const frame = Math.floor(time * 9) % 4;
    const key = side === 'left'
      ? (scanned ? 'leftScanned' : 'leftLocked')
      : (scanned ? 'rightScanned' : 'rightLocked');
    drawCrisp(ctx, c.emitters[key][frame], cx, cy, scale, 1);
  }

  // Estrellas pixel-art (polvo 1x1, cuadrado 2x2, cruz 5x5 / 7x7 centelleante)
  function drawPixelStar(ctx, x, y, kind, color, alpha, twinklePhase) {
    const ix = Math.round(x);
    const iy = Math.round(y);
    ctx.fillStyle = color;
    ctx.globalAlpha = Math.max(0, Math.min(1, alpha));

    if (kind === 0) {
      ctx.fillRect(ix, iy, 2, 2);
    } else if (kind === 1) {
      ctx.fillRect(ix - 1, iy - 1, 3, 3);
    } else {
      // Estrella brillante en cruz 16-bit con parpadeo de brazos
      const arm = twinklePhase > 0.62 ? 4 : twinklePhase > 0.28 ? 3 : 2;
      ctx.fillRect(ix - arm, iy, arm * 2 + 1, 1);
      ctx.fillRect(ix, iy - arm, 1, arm * 2 + 1);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(ix - 1, iy - 1, 3, 3);
    }
  }

  // Retícula pixel-art sobre el eje X
  function drawPixelReticle(ctx, x, y, time) {
    const ix = Math.round(x);
    const iy = Math.round(y);
    const pulse = Math.round(Math.sin(time * 6) * 2);
    ctx.save();
    ctx.imageSmoothingEnabled = false;

    // Diamante pixelado dorado central
    ctx.fillStyle = '#080e24';
    ctx.fillRect(ix - 3, iy - 11, 6, 22);
    ctx.fillRect(ix - 11, iy - 3, 22, 6);

    ctx.fillStyle = '#ffd000';
    ctx.fillRect(ix - 2, iy - 10, 4, 20);
    ctx.fillRect(ix - 10, iy - 2, 20, 4);
    ctx.fillRect(ix - 6, iy - 6, 12, 12);

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(ix - 2, iy - 2, 4, 4);

    // Corchetes cian pulsantes a ambos lados
    const off = 13 + pulse;
    ctx.fillStyle = '#00f0ff';
    // Izquierdo
    ctx.fillRect(ix - off - 2, iy - 8, 2, 16);
    ctx.fillRect(ix - off, iy - 8, 4, 2);
    ctx.fillRect(ix - off, iy + 6, 4, 2);
    // Derecho
    ctx.fillRect(ix + off, iy - 8, 2, 16);
    ctx.fillRect(ix + off - 4, iy - 8, 4, 2);
    ctx.fillRect(ix + off - 4, iy + 6, 4, 2);

    ctx.restore();
  }

  return {
    init: ensureCache,
    drawStarship,
    drawExplosion,
    drawPlanetAndMoon,
    drawEmitter,
    drawPixelStar,
    drawPixelReticle
  };
})();
