/**
 * radar/js/pixel-art.js
 * Motor de arte 16-bit animado en <canvas> (image-rendering: pixelated) a ~7.5 FPS:
 *  - Mineros subterráneos 32×32 animados con casco/chaleco por equipo, gafas, insignia brillante,
 *    linterna frontal oscilante, antena de radar parpadeante con ondas verdes, pico/taladro animado
 *    y estados: idle, exact (salto + destellos dorados), error (retroceso + rocas), finished (saludo).
 *  - Cofre Faraónico Egipcio 64×48 animado con tapa abriéndose, escarabajo brillante,
 *    jeroglíficos luminosos, aura dorada, antorchas pixeladas y gemas/monedas rebosantes.
 *  - Cristales subterráneos 16×16 brillantes y lava burbujeante 64×14 en el fondo de cada pozo.
 */
(function (root) {
  'use strict';

  const FRAME_INTERVAL_MS = 135; // ~7.4 FPS estilo 16-bit clásico

  const CRYSTAL_PALETTES = {
    cyan:    { outline: '#083344', dark: '#0e7490', mid: '#06b6d4', light: '#67e8f9', glint: '#ecfeff' },
    emerald: { outline: '#022c22', dark: '#047857', mid: '#10b981', light: '#6ee7b7', glint: '#ecfdf5' },
    violet:  { outline: '#2e1065', dark: '#6d28d9', mid: '#a855f7', light: '#d8b4fe', glint: '#faf5ff' },
    amber:   { outline: '#451a03', dark: '#b45309', mid: '#f59e0b', light: '#fde047', glint: '#fefce8' }
  };

  let crewsRef = [];
  const minerStates = new Map(); // crewId -> { mode: 'idle'|'exact'|'error', expiresAt: number, finished: boolean }
  let minerCanvases = [];
  let crystalCanvases = [];
  let lavaCanvases = [];
  let chestCanvas = null;
  let chestActive = false;
  let chestOpenFrame = 0;

  let globalFrame = 0;
  let lastTickTime = 0;
  let rafId = null;

  /* -------------------- Utilidades de dibujo pixel-perfect -------------------- */
  function px(ctx, x, y, color, w = 1, h = 1) {
    ctx.fillStyle = color;
    ctx.fillRect(x | 0, y | 0, w | 0, h | 0);
  }

  function drawSparkleCross(ctx, x, y, color, coreColor) {
    px(ctx, x, y - 1, color);
    px(ctx, x, y + 1, color);
    px(ctx, x - 1, y, color);
    px(ctx, x + 1, y, color);
    px(ctx, x, y, coreColor || '#ffffff');
  }

  /* ============================================================================
     1. MINERO SUBTERRÁNEO 32×32 (16-BIT ANIMADO)
     ============================================================================ */
  function drawMinerFrame(ctx, crew, animMode, isFinished, frame) {
    ctx.clearRect(0, 0, 32, 32);
    ctx.imageSmoothingEnabled = false;

    const f = frame + crew.id * 2;
    const isExact = animMode === 'exact';
    const isError = animMode === 'error';

    // Desplazamientos según estado
    let offsetX = 0;
    let bobY = 0;
    if (isExact) {
      bobY = [0, -2, -3, -2, 0, -2, -3, -1][f % 8];
    } else if (isError) {
      offsetX = [-1, 1, -1, 1, 0, -1, 1, 0][f % 8];
      bobY = 1;
    } else if (isFinished) {
      bobY = [0, -1, 0, 0][f % 4];
    } else {
      bobY = (f % 4 >= 2) ? 1 : 0;
    }

    const cx = 13 + offsetX;
    const by = 4 + bobY;

    // 1) Cable de arnés superior (baja desde el techo hasta el casco)
    for (let y = 0; y <= by + 1; y++) {
      px(ctx, cx, y, (y % 2 === 0) ? '#a8a29e' : '#57534e');
    }

    // 2) Haz de luz oscilante de la linterna frontal (derecha)
    const sweep = isError ? 1 : [-1, 0, 1, 0][Math.floor(f / 2) % 4];
    const lampX = cx + 6;
    const lampY = by + 5;
    const coneCore = isExact
      ? 'rgba(103, 232, 249, 0.50)'
      : isError
        ? 'rgba(248, 113, 113, 0.34)'
        : 'rgba(254, 240, 138, 0.44)';
    const coneEdge = isExact
      ? 'rgba(253, 224, 71, 0.24)'
      : isError
        ? 'rgba(239, 68, 68, 0.16)'
        : 'rgba(253, 224, 71, 0.19)';

    for (let dx = 1; dx <= 12; dx++) {
      const gx = lampX + dx;
      if (gx > 31) break;
      const spread = Math.floor(dx * 0.45) + 1;
      const centerY = lampY + Math.round((dx * sweep) / 6);
      for (let dy = -spread; dy <= spread; dy++) {
        const gy = centerY + dy;
        if (gy < 0 || gy > 31) continue;
        const distNorm = Math.abs(dy) / (spread + 0.2);
        if (dx <= 7 && distNorm < 0.55) {
          px(ctx, gx, gy, coneCore);
        } else if ((gx + gy + (f % 2)) % 2 === 0 || dx <= 5) {
          px(ctx, gx, gy, coneEdge);
        }
      }
    }

    // 3) Mochila tecnológica + Antena de radar parpadeante (izquierda)
    px(ctx, cx - 7, by + 11, '#0f172a', 4, 8);
    px(ctx, cx - 6, by + 12, '#334155', 2, 6);
    px(ctx, cx - 6, by + 13, '#64748b', 1, 2);
    // Indicador LED de batería en mochila
    px(ctx, cx - 6, by + 16, (f % 4 < 2) ? '#34d399' : '#059669');
    // Varilla de antena
    px(ctx, cx - 6, by + 4, '#94a3b8', 1, 7);
    px(ctx, cx - 6, by + 3, '#cbd5e1', 1, 1);
    // Punta LED parpadeante
    const ledOn = (f % 4) < 2;
    const ledColor = isError
      ? (ledOn ? '#ef4444' : '#7f1d1d')
      : (ledOn ? '#34d399' : '#22d3ee');
    px(ctx, cx - 6, by + 2, ledColor);

    // Onda verde pixelada emanando de la antena de radar
    const wavePhase = f % 6;
    const waveColor = isError ? '#f87171' : '#34d399';
    const waveDim = isError ? '#dc2626' : '#10b981';
    if (wavePhase === 1 || wavePhase === 2) {
      px(ctx, cx - 8, by + 1, waveColor);
      px(ctx, cx - 7, by, waveColor);
      px(ctx, cx - 5, by, waveColor);
    } else if (wavePhase === 3 || wavePhase === 4) {
      px(ctx, cx - 9, by + 1, waveDim);
      px(ctx, cx - 8, by - 1, waveDim);
      px(ctx, cx - 6, by - 1, waveDim);
      px(ctx, cx - 4, by, waveDim);
    }

    // 4) Piernas y Botas reforzadas
    const legLift = isExact && bobY <= -2 ? -1 : 0;
    // Pierna izquierda
    px(ctx, cx - 3, by + 20, '#1c1917', 3, 5 + legLift);
    px(ctx, cx - 2, by + 20, '#44403c', 1, 3 + legLift); // rodillera
    px(ctx, cx - 4, by + 24 + legLift, '#0c0a09', 4, 2); // bota
    px(ctx, cx - 4, by + 24 + legLift, '#78716c', 1, 1); // puntera metálica
    // Pierna derecha
    px(ctx, cx + 1, by + 20, '#1c1917', 3, 5 + legLift);
    px(ctx, cx + 2, by + 20, '#44403c', 1, 3 + legLift);
    px(ctx, cx + 1, by + 24 + legLift, '#0c0a09', 4, 2);
    px(ctx, cx + 4, by + 24 + legLift, '#78716c', 1, 1);

    // 5) Cuerpo: Chaleco / Armadura del color del equipo + Insignia luminosa
    px(ctx, cx - 4, by + 12, '#0f172a', 9, 9);          // Contorno oscuro
    px(ctx, cx - 3, by + 13, crew.accentHex, 7, 7);     // Base armadura
    px(ctx, cx - 3, by + 13, crew.lightHex, 2, 5);      // Luz lateral izq
    px(ctx, cx + 2, by + 14, crew.darkHex, 2, 5);       // Sombra lateral der
    // Correas de arnés cruzadas
    px(ctx, cx - 3, by + 13, '#1e293b');
    px(ctx, cx + 3, by + 13, '#1e293b');
    px(ctx, cx - 2, by + 17, '#1e293b');
    px(ctx, cx + 2, by + 17, '#1e293b');
    // Cinturón utilitario + hebilla dorada
    px(ctx, cx - 4, by + 19, '#1c1917', 9, 2);
    px(ctx, cx - 1, by + 19, '#eab308', 3, 2);
    px(ctx, cx, by + 19, '#fef08a', 1, 1);

    // Insignia brillante en el pecho (pulsa suavemente)
    const badgePulse = (f % 4 === 0 || isExact);
    px(ctx, cx - 1, by + 14, '#0f172a', 3, 3);
    px(ctx, cx - 1, by + 15, crew.badgeHex, 3, 1);
    px(ctx, cx, by + 14, crew.badgeHex, 1, 3);
    px(ctx, cx, by + 15, badgePulse ? '#ffffff' : crew.badgeHex);

    // 6) Cara y expresión
    px(ctx, cx - 3, by + 7, '#1c1917', 7, 5);      // contorno cabeza
    px(ctx, cx - 2, by + 8, '#fed7aa', 5, 4);      // piel
    px(ctx, cx - 2, by + 11, '#fdba74', 5, 1);     // sombra barbilla
    // Ojos
    px(ctx, cx - 1, by + 9, '#1c1917');
    px(ctx, cx + 2, by + 9, '#1c1917');
    // Boca según estado
    if (isError) {
      px(ctx, cx, by + 10, '#7f1d1d', 2, 2); // gesto de susto "O"
    } else if (isExact || isFinished) {
      px(ctx, cx, by + 10, '#9a3412', 2, 1);
      px(ctx, cx - 1, by + 10, '#c2410c', 1, 1);
      px(ctx, cx + 2, by + 10, '#c2410c', 1, 1);
    } else {
      px(ctx, cx, by + 11, '#9a3412', 2, 1);
    }

    // 7) Casco de minero del color del equipo + Gafas protectoras + Linterna
    // Silueta oscura casco
    px(ctx, cx - 4, by + 3, '#1c1917', 9, 5);
    px(ctx, cx - 3, by + 2, '#1c1917', 7, 1);
    // Cúpula con color de equipo y sombreado 16-bit
    px(ctx, cx - 3, by + 3, crew.helmetMain, 7, 4);
    px(ctx, cx - 2, by + 2, crew.helmetMain, 5, 1);
    px(ctx, cx - 2, by + 3, crew.helmetLight, 3, 1); // brillo superior
    px(ctx, cx - 3, by + 4, crew.helmetLight, 1, 2);
    px(ctx, cx + 2, by + 4, crew.helmetDark, 2, 2);
    // Franja metálica central del casco
    px(ctx, cx, by + 2, '#fde047', 1, 4);
    // Visera del casco
    px(ctx, cx - 5, by + 6, '#1c1917', 11, 2);
    px(ctx, cx - 4, by + 6, '#eab308', 9, 1);
    px(ctx, cx - 3, by + 6, '#fef08a', 3, 1);

    // Gafas protectoras reflectantes sobre la visera
    const lensColor = isError ? '#ef4444' : isExact ? '#fef08a' : crew.visorHex;
    px(ctx, cx - 3, by + 7, '#0f172a', 7, 2);
    px(ctx, cx - 2, by + 7, lensColor, 2, 2);
    px(ctx, cx + 1, by + 7, lensColor, 2, 2);
    px(ctx, cx - 2, by + 7, '#ffffff'); // reflejo cristal
    px(ctx, cx + 1, by + 7, '#ffffff');

    // Carcasa y bombilla de la linterna frontal (derecha del casco)
    px(ctx, cx + 4, by + 4, '#334155', 2, 3);
    px(ctx, cx + 6, by + 4, '#facc15', 1, 3);
    px(ctx, cx + 6, by + 5, (f % 2 === 0 || isExact) ? '#ffffff' : '#fef08a');

    // 8) Brazo izquierdo (saludo feliz en finished, puño alzado en exact, defensa en error)
    if (isFinished) {
      const waveUp = (f % 4) < 2;
      px(ctx, cx - 5, by + 13, crew.darkHex, 2, 3);
      px(ctx, cx - 6, by + (waveUp ? 9 : 10), crew.accentHex, 2, 4);
      px(ctx, cx - 6, by + (waveUp ? 8 : 9), '#fed7aa', 2, 2); // mano saludando
      if (waveUp) {
        px(ctx, cx - 8, by + 7, '#fde047'); // línea de saludo
      }
    } else if (isExact) {
      px(ctx, cx - 5, by + 10, crew.accentHex, 2, 4);
      px(ctx, cx - 5, by + 9, '#fde047', 2, 2); // guante levantado
    } else if (isError) {
      px(ctx, cx - 5, by + 11, crew.accentHex, 2, 3);
      px(ctx, cx - 5, by + 10, '#fed7aa', 2, 2);
    } else {
      px(ctx, cx - 5, by + 13, crew.darkHex, 2, 4);
      px(ctx, cx - 5, by + 17, '#44403c', 2, 2); // guante
    }

    // 9) Brazo derecho + Herramienta animada (Pico o Taladro neumático)
    if (crew.tool === 'pickaxe') {
      drawPickaxeAndArm(ctx, cx, by, crew, isExact, isError, f);
    } else {
      drawDrillAndArm(ctx, cx, by, crew, isExact, isError, f);
    }

    // 10) Efectos especiales de píxeles según estado
    if (isExact) {
      // Destellos dorados y cian orbitando/subiendo
      const s1y = by + 2 - (f % 4);
      const s2y = by + 10 - ((f + 2) % 5);
      drawSparkleCross(ctx, cx - 8, Math.max(1, s1y), '#fde047', '#ffffff');
      drawSparkleCross(ctx, cx + 10, Math.max(1, s2y), '#22d3ee', '#ffffff');
      px(ctx, cx + 2, Math.max(0, by - 1 - (f % 3)), '#fef08a');
      px(ctx, cx - 3, Math.max(0, by + 1 - ((f + 1) % 3)), '#34d399');
    } else if (isError) {
      // Piedras cayendo desde arriba y polvo de desprendimiento
      const drop = f % 6;
      const rocks = [
        { x: cx - 7, y: (drop * 4 + 1) % 24, c: '#78716c', hi: '#a8a29e' },
        { x: cx + 1, y: ((drop + 2) * 4) % 22, c: '#57534e', hi: '#a8a29e' },
        { x: cx + 7, y: ((drop + 4) * 4) % 25, c: '#78716c', hi: '#d6d3d1' },
        { x: cx - 2, y: ((drop + 1) * 5) % 26, c: '#44403c', hi: '#78716c' }
      ];
      rocks.forEach(r => {
        px(ctx, r.x, r.y, r.c, 2, 2);
        px(ctx, r.x, r.y, r.hi, 1, 1);
      });
      // Señal de impacto roja sobre el casco
      if (f % 2 === 0) {
        px(ctx, cx - 6, by + 1, '#ef4444');
        px(ctx, cx + 5, by + 1, '#ef4444');
      }
    } else if (isFinished && f % 4 < 2) {
      drawSparkleCross(ctx, cx + 9, by + 3, '#fde047', '#ffffff');
    }
  }

  function drawPickaxeAndArm(ctx, cx, by, crew, isExact, isError, f) {
    // Brazo derecho
    if (isExact) {
      // Pico alzado en victoria
      px(ctx, cx + 4, by + 11, crew.accentHex, 2, 4);
      px(ctx, cx + 5, by + 10, '#44403c', 2, 2);
      // Mango vertical-diagonal hacia arriba
      for (let i = 0; i < 8; i++) {
        px(ctx, cx + 6 + Math.floor(i / 3), by + 10 - i, (i % 2 === 0) ? '#92400e' : '#b45309');
      }
      // Cabeza metálica del pico en alto
      const hx = cx + 8;
      const hy = by + 2;
      px(ctx, hx - 3, hy + 1, '#94a3b8', 7, 1);
      px(ctx, hx - 2, hy, '#e2e8f0', 5, 1);
      px(ctx, hx - 4, hy + 2, '#cbd5e1');
      px(ctx, hx + 4, hy + 2, '#ffffff');
      return;
    }

    const swing = isError ? 2 : [0, 0, 1, 1][f % 4];
    px(ctx, cx + 4, by + 13, crew.accentHex, 2, 4);
    px(ctx, cx + 5, by + 16, '#44403c', 2, 2); // mano enguantada

    // Mango del pico balanceándose suavemente
    for (let i = 0; i < 7; i++) {
      const mx = cx + 6 + Math.floor(i * 0.7);
      const my = by + 16 - i + swing;
      px(ctx, mx, my, (i % 2 === 0) ? '#92400e' : '#b45309');
    }
    // Cabeza de acero curvada
    const hx = cx + 10;
    const hy = by + 10 + swing;
    px(ctx, hx - 2, hy - 1, '#e2e8f0', 4, 2);
    px(ctx, hx - 3, hy, '#94a3b8');
    px(ctx, hx + 2, hy + 1, '#cbd5e1', 2, 1);
    px(ctx, hx + 3, hy + 2, '#ffffff'); // punta afilada
    px(ctx, hx - 1, hy - 2, '#ffffff'); // filo superior
  }

  function drawDrillAndArm(ctx, cx, by, crew, isExact, isError, f) {
    const vib = (f % 2 === 0) ? 0 : 1;
    if (isExact) {
      // Taladro alzado triunfal
      px(ctx, cx + 4, by + 11, crew.accentHex, 2, 4);
      px(ctx, cx + 5, by + 10, '#44403c', 2, 2);
      px(ctx, cx + 5, by + 6, '#eab308', 4, 4);
      px(ctx, cx + 6, by + 6, '#fef08a', 2, 2);
      px(ctx, cx + 6, by + 2, '#cbd5e1', 2, 4);
      px(ctx, cx + 6, by + 1, '#ffffff', 1, 1);
      return;
    }

    const dy = isError ? 2 : 0;
    // Brazo derecho sosteniendo el taladro neumático
    px(ctx, cx + 4, by + 13 + dy, crew.accentHex, 2, 4);
    px(ctx, cx + 5, by + 15 + dy, '#334155', 2, 2);
    // Cuerpo del motor del taladro
    const dx = cx + 6 + vib;
    const my = by + 14 + dy;
    px(ctx, dx, my, '#1c1917', 5, 5);
    px(ctx, dx + 1, my + 1, '#f59e0b', 3, 3);
    px(ctx, dx + 1, my + 1, '#fef08a', 2, 1);
    px(ctx, dx + 2, my + 2, '#475569', 2, 1);
    // Broca espiral vibratoria
    px(ctx, dx + 5, my + 1, '#94a3b8', 4, 3);
    px(ctx, dx + 5 + (f % 2), my + 2, '#e2e8f0', 1, 1);
    px(ctx, dx + 7 + (f % 2), my + 2, '#ffffff', 1, 1);
    px(ctx, dx + 9, my + 2, '#ffffff', 2, 1);
    // Chispita de perforación
    if (!isError && f % 3 === 0 && dx + 11 <= 31) {
      px(ctx, dx + 11, my + 1, '#fde047');
      px(ctx, dx + 11, my + 3, '#fb923c');
    }
  }

  /* ============================================================================
     2. CRISTALES SUBTERRÁNEOS 16×16 BRILLANTES
     ============================================================================ */
  function drawCrystalFrame(ctx, colorKey, side, frame, seed) {
    ctx.clearRect(0, 0, 16, 16);
    ctx.imageSmoothingEnabled = false;
    const pal = CRYSTAL_PALETTES[colorKey] || CRYSTAL_PALETTES.cyan;
    const f = frame + seed;

    ctx.save();
    if (side === 'right') {
      ctx.translate(16, 0);
      ctx.scale(-1, 1);
    }

    // Base rocosa pegada a la pared izquierda
    px(ctx, 0, 5, '#292524', 3, 7);
    px(ctx, 0, 6, '#44403c', 2, 5);

    // Cristal principal central apuntando hacia el pozo
    px(ctx, 2, 6, pal.outline, 10, 5);
    px(ctx, 3, 7, pal.mid, 8, 3);
    px(ctx, 3, 7, pal.light, 6, 1);
    px(ctx, 4, 9, pal.dark, 6, 1);
    px(ctx, 11, 8, pal.light, 2, 1);
    px(ctx, 12, 8, pal.glint);

    // Cristal superior inclinado
    px(ctx, 2, 3, pal.outline, 6, 4);
    px(ctx, 3, 4, pal.mid, 4, 2);
    px(ctx, 4, 3, pal.light, 3, 1);
    px(ctx, 7, 3, pal.glint);

    // Cristal inferior pequeño
    px(ctx, 2, 10, pal.outline, 6, 4);
    px(ctx, 3, 11, pal.dark, 4, 2);
    px(ctx, 4, 11, pal.mid, 3, 1);
    px(ctx, 7, 12, pal.light);

    // Brillo viajero y destello animado
    const shimmerX = 3 + (f % 8);
    px(ctx, shimmerX, 7, pal.glint);
    if (f % 6 === 0) {
      drawSparkleCross(ctx, 12, 5, pal.light, '#ffffff');
    } else if (f % 6 === 3) {
      px(ctx, 9, 12, '#ffffff');
    }

    ctx.restore();
  }

  /* ============================================================================
     3. LAVA BURBUJEANTE 64×14 EN EL FONDO DEL POZO
     ============================================================================ */
  function drawLavaFrame(ctx, crewId, frame) {
    ctx.clearRect(0, 0, 64, 14);
    ctx.imageSmoothingEnabled = false;
    const f = frame + crewId * 3;

    // Fondo profundo de magma
    px(ctx, 0, 7, '#7f1d1d', 64, 7);
    px(ctx, 0, 8, '#b91c1c', 64, 5);
    px(ctx, 0, 9, '#ea580c', 64, 3);

    // Superficie ondulada animada
    for (let x = 0; x < 64; x++) {
      const wave = Math.round(Math.sin((x + f * 2) * 0.24) * 1.1);
      const topY = 6 + wave;
      px(ctx, x, topY, '#f97316', 1, 14 - topY);
      // Cresta ardiente amarilla/blanca
      if ((x + f) % 5 < 2) {
        px(ctx, x, topY, '#facc15');
      }
      if ((x * 3 + f * 2) % 11 === 0) {
        px(ctx, x, topY + 1, '#fef08a');
      }
      // Textura de corriente en el fondo
      if ((x + f) % 7 === 0) {
        px(ctx, x, 11, '#fb923c', 2, 1);
      }
      if ((x - f + 64) % 9 === 0) {
        px(ctx, x, 12, '#dc2626', 3, 1);
      }
    }

    // 4 burbujas de lava que crecen y estallan en chispas pixeladas
    const bubbles = [10, 26, 42, 55];
    bubbles.forEach((bx, idx) => {
      const phase = (f + idx * 3) % 10;
      if (phase === 1 || phase === 2) {
        px(ctx, bx - 1, 5, '#fb923c', 3, 2);
        px(ctx, bx, 5, '#fef08a');
      } else if (phase === 3 || phase === 4) {
        px(ctx, bx - 2, 4, '#ea580c', 5, 3);
        px(ctx, bx - 1, 3, '#facc15', 3, 2);
        px(ctx, bx, 3, '#ffffff');
      } else if (phase === 5) {
        // Estallido con chispas volando
        px(ctx, bx - 3, 2, '#fde047');
        px(ctx, bx + 3, 2, '#fb923c');
        px(ctx, bx, 1, '#ffffff');
      } else if (phase === 6) {
        px(ctx, bx - 4, 1, '#f97316');
        px(ctx, bx + 4, 0, '#fde047');
      }
    });
  }

  /* ============================================================================
     4. COFRE FARAÓNICO EGIPCIO 64×48 (16-BIT ANIMADO EN PANTALLA DE VICTORIA)
     ============================================================================ */
  function drawChestFrame(ctx, frame, openStep) {
    ctx.clearRect(0, 0, 64, 48);
    ctx.imageSmoothingEnabled = false;

    // Progreso suave de apertura de la tapa (0 -> 1 en 16 frames)
    const openProgress = Math.min(1, openStep / 16);
    const pulse = (frame % 6) < 3;

    // 1) Fondo de cámara volcánica y aura dorada radiante
    px(ctx, 0, 0, '#0c0605', 64, 48);

    // Aura radial pixelada alrededor del cofre
    const auraRadius = 15 + Math.round(openProgress * 12) + (pulse ? 1 : 0);
    for (let y = 2; y < 44; y++) {
      for (let x = 6; x < 58; x++) {
        const dx = (x - 32) * 0.78;
        const dy = (y - 22) * 1.05;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < auraRadius) {
          if (dist < auraRadius * 0.45 && openProgress > 0.2) {
            px(ctx, x, y, 'rgba(254, 240, 138, 0.34)');
          } else if ((x + y + (frame % 2)) % 2 === 0) {
            px(ctx, x, y, 'rgba(245, 158, 11, 0.22)');
          }
        }
      }
    }

    // Haz de luz ascendente saliendo del cofre al abrirse
    if (openProgress > 0.15) {
      for (let y = 0; y < 23; y++) {
        const spread = Math.floor((23 - y) * 0.55 * openProgress) + 9;
        const left = Math.max(10, 32 - spread);
        const right = Math.min(54, 32 + spread);
        for (let x = left; x < right; x++) {
          const core = Math.abs(x - 32) < spread * 0.48;
          if (core) {
            px(ctx, x, y, (y + frame) % 3 === 0 ? 'rgba(255,255,255,0.28)' : 'rgba(254,240,138,0.28)');
          } else if ((x + y) % 2 === 0) {
            px(ctx, x, y, 'rgba(251,191,36,0.16)');
          }
        }
      }
    }

    // 2) Rocas cavernosas laterales con grietas de magma
    for (let y = 12; y < 48; y++) {
      const lw = 6 + Math.floor((y - 12) * 0.18) + ((y * 7) % 3);
      px(ctx, 0, y, '#1c1513', lw, 1);
      px(ctx, 0, y, '#2b201c', Math.max(1, lw - 2), 1);

      const rw = 6 + Math.floor((y - 12) * 0.18) + ((y * 5) % 3);
      px(ctx, 64 - rw, y, '#1c1513', rw, 1);
      px(ctx, 64 - rw + 2, y, '#2b201c', Math.max(1, rw - 2), 1);
    }
    // Grietas de lava izquierda/derecha
    const magmaCol = pulse ? '#ff5500' : '#f97316';
    px(ctx, 3, 20, magmaCol); px(ctx, 4, 21, magmaCol); px(ctx, 3, 22, '#fde047'); px(ctx, 5, 23, magmaCol);
    px(ctx, 60, 19, magmaCol); px(ctx, 59, 20, '#fde047'); px(ctx, 58, 21, magmaCol); px(ctx, 59, 22, magmaCol);

    // 3) Antorchas / Braseros flameantes flanqueando el cofre
    drawPixelBrazier(ctx, 9, 29, frame);
    drawPixelBrazier(ctx, 52, 29, frame + 2);

    // 4) Pedestal de piedra faraónica
    px(ctx, 12, 41, '#1c1917', 40, 7);
    px(ctx, 13, 41, '#292524', 38, 5);
    px(ctx, 14, 40, '#44403c', 36, 2);
    px(ctx, 16, 39, '#b45309', 32, 2);
    px(ctx, 17, 39, '#fde047', 30, 1);

    // 5) Tapa arqueada del cofre (se abre suavemente)
    const lidLift = Math.round(openProgress * 8); // 0..8 px hacia arriba
    const lidY = 15 - lidLift;

    // Tapa trasera / interior dorado abierto
    if (openProgress > 0.2) {
      // Interior iluminado del cofre
      px(ctx, 19, 19, '#f59e0b', 26, 6);
      px(ctx, 20, 20, '#fde047', 24, 5);
      px(ctx, 22, 20, '#fef9c3', 20, 3);

      // Montaña de monedas y joyas asomando por el borde
      const rimCoins = [
        [21, 21, '#fbbf24'], [22, 20, '#fde047'], [23, 21, '#f59e0b'],
        [25, 19, '#e11d48'], [26, 20, '#fda4af'], // rubí
        [28, 20, '#fde047'], [29, 19, '#fef9c3'], [30, 20, '#fbbf24'],
        [32, 18, '#10b981'], [33, 19, '#a7f3d0'], // esmeralda
        [35, 19, '#fde047'], [36, 20, '#fbbf24'],
        [38, 19, '#38bdf8'], [39, 20, '#e0f2fe'], // diamante/zafiro
        [41, 20, '#fde047'], [42, 21, '#f59e0b']
      ];
      rimCoins.forEach(([cxp, cyp, col]) => px(ctx, cxp, cyp, col, 2, 2));
    }

    // Tapa principal dorada + lapislázuli
    px(ctx, 17, lidY + 2, '#0c0a09', 30, 7);
    px(ctx, 19, lidY, '#0c0a09', 26, 3);
    // Franjas de oro y lapislázuli
    px(ctx, 18, lidY + 2, '#b45309', 28, 6);
    px(ctx, 20, lidY + 1, '#f59e0b', 24, 5);
    px(ctx, 21, lidY + 1, '#fde047', 22, 1);
    px(ctx, 22, lidY + 3, '#1e3a8a', 20, 3); // incrustación lapislázuli
    px(ctx, 23, lidY + 3, '#2563eb', 18, 1);
    // Disco solar alado en la tapa
    px(ctx, 28, lidY + 2, '#fde047', 8, 1);
    px(ctx, 30, lidY + 1, '#ef4444', 4, 3);
    px(ctx, 31, lidY + 1, '#fef08a', 2, 1);
    // Borde inferior dorado de la tapa
    px(ctx, 17, lidY + 7, '#f59e0b', 30, 2);
    px(ctx, 18, lidY + 7, '#fef08a', 28, 1);

    // 6) Cuerpo del Cofre Faraónico (x=17..46, y=23..39)
    px(ctx, 17, 23, '#0c0a09', 30, 17);       // contorno oscuro
    px(ctx, 18, 24, '#1c1917', 28, 15);       // cuerpo obsidiana
    // Marco grueso dorado exterior y esquinas
    px(ctx, 18, 24, '#f59e0b', 28, 2);        // borde sup
    px(ctx, 18, 24, '#fef08a', 26, 1);        // brillo sup
    px(ctx, 18, 37, '#b45309', 28, 2);        // borde inf
    px(ctx, 18, 24, '#d97706', 3, 15);        // pilar izq
    px(ctx, 19, 25, '#fde047', 1, 13);
    px(ctx, 43, 24, '#d97706', 3, 15);        // pilar der
    px(ctx, 44, 25, '#fde047', 1, 13);

    // Panel frontal de lapislázuli
    px(ctx, 21, 26, '#172554', 22, 11);
    px(ctx, 22, 27, '#1e3a8a', 20, 9);

    // Jeroglíficos cian luminosos en ambos lados del panel
    const glyphCol = pulse ? '#67e8f9' : '#06b6d4';
    // Ankh izquierdo
    px(ctx, 24, 28, glyphCol, 2, 2);
    px(ctx, 24, 30, glyphCol, 1, 4);
    px(ctx, 23, 31, glyphCol, 3, 1);
    // Símbolo derecho
    px(ctx, 38, 28, glyphCol, 3, 1);
    px(ctx, 39, 29, glyphCol, 1, 5);
    px(ctx, 38, 33, glyphCol, 3, 1);
    px(ctx, 39, 30, '#fde047');

    // Escarabajo Alado Dorado Central (broche brillante)
    px(ctx, 28, 28, '#b45309', 8, 7);
    px(ctx, 27, 29, '#f59e0b', 10, 3);        // alas desplegadas
    px(ctx, 28, 29, '#fde047', 8, 1);
    px(ctx, 30, 27, '#fde047', 4, 7);         // cuerpo escarabajo
    // Gema central del escarabajo (pulsa entre rubí y cian)
    px(ctx, 31, 29, pulse ? '#22d3ee' : '#e11d48', 2, 3);
    px(ctx, 31, 29, '#ffffff');

    // 7) Gemas preciosas y pilas de monedas de oro rebosando al pie del cofre
    // Izquierda: rubí, esmeralda, monedas
    drawPixelGem(ctx, 13, 38, '#e11d48', '#fda4af');
    drawPixelGem(ctx, 17, 40, '#10b981', '#a7f3d0');
    drawPixelGem(ctx, 22, 41, '#a855f7', '#e9d5ff');
    px(ctx, 11, 42, '#f59e0b', 4, 2); px(ctx, 11, 42, '#fef08a', 3, 1);
    px(ctx, 15, 43, '#eab308', 4, 2); px(ctx, 16, 43, '#fef08a', 2, 1);

    // Derecha: zafiro, rubí, esmeralda, monedas
    drawPixelGem(ctx, 47, 38, '#2563eb', '#93c5fd');
    drawPixelGem(ctx, 43, 40, '#e11d48', '#fecdd3');
    drawPixelGem(ctx, 39, 41, '#10b981', '#6ee7b7');
    px(ctx, 49, 42, '#f59e0b', 4, 2); px(ctx, 50, 42, '#fef08a', 3, 1);
    px(ctx, 45, 43, '#eab308', 4, 2); px(ctx, 46, 43, '#fef08a', 2, 1);

    // Centro frente al pedestal: diamante cian + oro
    drawPixelGem(ctx, 30, 41, '#38bdf8', '#f0f9ff');
    px(ctx, 26, 42, '#fbbf24', 3, 2); px(ctx, 26, 42, '#fef9c3', 2, 1);
    px(ctx, 35, 42, '#fbbf24', 3, 2); px(ctx, 35, 42, '#fef9c3', 2, 1);

    // 8) Destellos pixel-art centelleantes en las gemas, oro y aura
    const glints = [
      [14, 38], [48, 38], [31, 41], [23, 20], [40, 19],
      [20, 10], [44, 11], [32, 6], [18, 25], [45, 25]
    ];
    glints.forEach(([gx, gy], idx) => {
      const phase = (frame + idx * 2) % 8;
      if (phase === 0) {
        drawSparkleCross(ctx, gx, gy, '#fde047', '#ffffff');
      } else if (phase === 1) {
        px(ctx, gx, gy, '#ffffff');
      }
    });
  }

  function drawPixelBrazier(ctx, x, y, frame) {
    // Copa del brasero
    px(ctx, x, y + 6, '#78350f', 4, 4);
    px(ctx, x - 1, y + 5, '#d97706', 6, 2);
    px(ctx, x, y + 5, '#fde047', 4, 1);
    // Llama animada 4 frames
    const shift = [0, 1, 0, -1][frame % 4];
    const tall = (frame % 2 === 0) ? 1 : 0;
    px(ctx, x, y + 2, '#dc2626', 4, 3);
    px(ctx, x + 1, y + 1 - tall, '#f97316', 2, 4 + tall);
    px(ctx, x + 1 + shift, y - tall, '#fde047', 2, 3);
    px(ctx, x + 1, y + 2, '#ffffff', 2, 1);
    // Chispa flotante
    const sparkY = y - 2 - (frame % 4);
    px(ctx, x + 1 + shift, Math.max(0, sparkY), '#fde047');
  }

  function drawPixelGem(ctx, x, y, mainCol, lightCol) {
    px(ctx, x, y + 1, '#0c0a09', 4, 3);
    px(ctx, x + 1, y, '#0c0a09', 2, 1);
    px(ctx, x + 1, y + 1, mainCol, 2, 2);
    px(ctx, x + 1, y + 1, lightCol, 1, 1);
  }

  /* ============================================================================
     5. GESTIÓN DEL BUCLE DE ANIMACIÓN Y SINCRONIZACIÓN DOM
     ============================================================================ */
  function buildMinerCanvasMarkup(crew) {
    return `<canvas class="pixel-canvas miner-pixel-canvas" width="32" height="32" data-pixel-miner="${crew.id}" aria-label="Minero 16-bit de ${crew.name}"></canvas>`;
  }

  function buildCrystalCanvasMarkup(colorKey, side, topPct, seed) {
    const posStyle = side === 'left' ? `top:${topPct}%;left:9px;` : `top:${topPct}%;right:9px;`;
    return `<canvas class="pixel-canvas shaft-crystal-canvas" width="16" height="16" data-pixel-crystal="${colorKey}" data-crystal-side="${side}" data-crystal-seed="${seed}" style="${posStyle}"></canvas>`;
  }

  function buildLavaCanvasMarkup(crewId) {
    return `<canvas class="pixel-canvas lava-pixel-canvas" width="64" height="14" data-pixel-lava="${crewId}"></canvas>`;
  }

  function ensureMinerState(crewId) {
    if (!minerStates.has(crewId)) {
      minerStates.set(crewId, { mode: 'idle', expiresAt: 0, finished: false });
    }
    return minerStates.get(crewId);
  }

  function triggerMinerAnim(crewId, mode) {
    const st = ensureMinerState(crewId);
    const now = performance.now();
    if (mode === 'exact') {
      st.mode = 'exact';
      st.expiresAt = now + 1650;
    } else if (mode === 'error') {
      st.mode = 'error';
      st.expiresAt = now + 1150;
    } else {
      st.mode = 'idle';
      st.expiresAt = 0;
    }
  }

  function setCrewFinished(crewId, finished) {
    const st = ensureMinerState(crewId);
    st.finished = Boolean(finished);
  }

  function syncCanvases(crews) {
    if (Array.isArray(crews)) {
      crewsRef = crews;
    }
    minerCanvases = Array.from(document.querySelectorAll('canvas[data-pixel-miner]'));
    crystalCanvases = Array.from(document.querySelectorAll('canvas[data-pixel-crystal]'));
    lavaCanvases = Array.from(document.querySelectorAll('canvas[data-pixel-lava]'));
    chestCanvas = document.getElementById('victoryChestCanvas');

    renderAllSprites(performance.now());
    startLoop();
  }

  function startChestReveal() {
    chestCanvas = document.getElementById('victoryChestCanvas');
    chestActive = true;
    chestOpenFrame = 0;
    if (chestCanvas) {
      const ctx = chestCanvas.getContext('2d');
      drawChestFrame(ctx, globalFrame, 0);
    }
    startLoop();
  }

  function stopChestReveal() {
    chestActive = false;
  }

  function renderAllSprites(now) {
    // 1. Mineros 32×32
    for (let i = 0; i < minerCanvases.length; i++) {
      const canvas = minerCanvases[i];
      if (!canvas.isConnected) continue;
      const crewId = Number(canvas.dataset.pixelMiner);
      const crew = crewsRef[crewId];
      if (!crew) continue;
      const st = ensureMinerState(crewId);
      let mode = st.mode;
      if (mode !== 'idle' && now > st.expiresAt) {
        st.mode = 'idle';
        mode = 'idle';
      }
      const ctx = canvas.getContext('2d');
      drawMinerFrame(ctx, crew, mode, st.finished, globalFrame);
    }

    // 2. Cristales subterráneos 16×16
    for (let i = 0; i < crystalCanvases.length; i++) {
      const canvas = crystalCanvases[i];
      if (!canvas.isConnected) continue;
      const ctx = canvas.getContext('2d');
      drawCrystalFrame(
        ctx,
        canvas.dataset.pixelCrystal,
        canvas.dataset.crystalSide,
        globalFrame,
        Number(canvas.dataset.crystalSeed) || 0
      );
    }

    // 3. Lava burbujeante 64×14
    for (let i = 0; i < lavaCanvases.length; i++) {
      const canvas = lavaCanvases[i];
      if (!canvas.isConnected) continue;
      const ctx = canvas.getContext('2d');
      drawLavaFrame(ctx, Number(canvas.dataset.pixelLava) || 0, globalFrame);
    }

    // 4. Cofre egipcio 64×48 (solo cuando la pantalla de victoria está activa)
    if (chestActive && chestCanvas && chestCanvas.isConnected) {
      const ctx = chestCanvas.getContext('2d');
      drawChestFrame(ctx, globalFrame, chestOpenFrame);
      if (chestOpenFrame < 16) {
        chestOpenFrame++;
      }
    }
  }

  function loop(now) {
    if (now - lastTickTime >= FRAME_INTERVAL_MS) {
      lastTickTime = now;
      globalFrame++;
      renderAllSprites(now);
    }
    rafId = root.requestAnimationFrame(loop);
  }

  function startLoop() {
    if (rafId !== null) return;
    lastTickTime = performance.now();
    rafId = root.requestAnimationFrame(loop);
  }

  root.RadarPixelArt = {
    buildMinerCanvasMarkup,
    buildCrystalCanvasMarkup,
    buildLavaCanvasMarkup,
    triggerMinerAnim,
    setCrewFinished,
    syncCanvases,
    startChestReveal,
    stopChestReveal
  };
})(typeof window !== 'undefined' ? window : globalThis);
