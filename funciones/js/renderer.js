/* ==========================================================================
   MOTOR GRÁFICO HTML5 CANVAS (ESPACIO PIXEL-ART 16-BIT + GRÁFICA EXACTA)
   ========================================================================== */

const SpaceRenderer = (() => {
  const X_MIN = -8;
  const X_MAX = 8;
  const Y_MIN = -5;
  const Y_MAX = 5;

  let canvas = null;
  let ctx = null;
  let frameEl = null;
  let cw = 800;
  let ch = 480;
  let lastFrameTime = performance.now();
  let isDraggingAxis = false;
  let nebulaBands = [];
  let trailTimer = 0;

  // Callbacks inyectados desde juego.js
  let hooks = {
    getState: null,
    getCurrentWave: null,
    onEvaluateArrival: null,
    onEvaluateWarpResult: null,
    onPickX: null
  };

  function initStarsAndNebula(state) {
    state.stars = [];
    const colors = ['#e8f6ff', '#b8e8ff', '#8ef4ff', '#ffd97a', '#ffb8e0', '#b8c4ff'];
    for (let i = 0; i < 130; i++) {
      // 3 capas de paralaje: 0 = polvo lejano, 1 = medio, 2 = estrellas en cruz brillantes
      const roll = Math.random();
      const layer = roll < 0.58 ? 0 : roll < 0.86 ? 1 : 2;
      state.stars.push({
        x: Math.random(),
        y: Math.random(),
        layer,
        speed: layer === 0 ? (0.018 + Math.random() * 0.025)
          : layer === 1 ? (0.045 + Math.random() * 0.05)
          : (0.095 + Math.random() * 0.075),
        alpha: layer === 0 ? (0.28 + Math.random() * 0.35)
          : layer === 1 ? (0.5 + Math.random() * 0.4)
          : (0.78 + Math.random() * 0.22),
        color: colors[Math.floor(Math.random() * colors.length)],
        twinkleOffset: Math.random() * Math.PI * 2,
        twinkleSpeed: 1.8 + Math.random() * 3.2
      });
    }

    // Bandas pixeladas de nebulosa cósmica
    nebulaBands = [
      { yNorm: 0.19, h: 42, speed: 6, color: 'rgba(110, 40, 190, 0.11)', phase: 0.4 },
      { yNorm: 0.34, h: 32, speed: -4, color: 'rgba(0, 175, 220, 0.08)', phase: 1.9 },
      { yNorm: 0.62, h: 36, speed: 5, color: 'rgba(190, 35, 130, 0.07)', phase: 3.1 }
    ];
  }

  function resize() {
    if (!canvas || !frameEl) return;
    const rect = frameEl.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    cw = Math.max(300, rect.width);
    ch = Math.max(300, rect.height);
    canvas.width = Math.floor(cw * dpr);
    canvas.height = Math.floor(ch * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function getPlotBounds() {
    const padX = Math.max(44, cw * 0.062);
    const top = 46;
    const bottom = ch * 0.68;
    return {
      left: padX,
      right: cw - padX,
      top,
      bottom,
      width: cw - padX * 2,
      height: bottom - top
    };
  }

  function getBarrierY() {
    const b = getPlotBounds();
    return (b.top + b.bottom) * 0.5;
  }

  function worldToScreenX(x) {
    const b = getPlotBounds();
    return b.left + ((x - X_MIN) / (X_MAX - X_MIN)) * b.width;
  }

  function screenToWorldX(sx) {
    const b = getPlotBounds();
    const t = (sx - b.left) / b.width;
    return X_MIN + t * (X_MAX - X_MIN);
  }

  function worldToScreenY(y) {
    const b = getPlotBounds();
    return b.bottom - ((y - Y_MIN) / (Y_MAX - Y_MIN)) * b.height;
  }

  // Partículas cuadradas pixel-art
  function spawnParticles(x, y, color, count, opts = {}) {
    const state = hooks.getState();
    if (!state) return;
    const palette = Array.isArray(color) ? color : [color];
    const minSpd = opts.minSpeed ?? 65;
    const maxSpd = opts.maxSpeed ?? 235;
    const minSize = opts.minSize ?? 3;
    const maxSize = opts.maxSize ?? 6;
    const decayMin = opts.decayMin ?? 0.75;
    const decayMax = opts.decayMax ?? 1.65;

    for (let i = 0; i < count; i++) {
      const ang = opts.angle !== undefined
        ? opts.angle + (Math.random() - 0.5) * (opts.spread ?? 0.6)
        : Math.random() * Math.PI * 2;
      const spd = minSpd + Math.random() * (maxSpd - minSpd);
      const size = Math.max(2, Math.round(minSize + Math.random() * (maxSize - minSize)));
      state.particles.push({
        x,
        y,
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd,
        life: 1,
        decay: decayMin + Math.random() * (decayMax - decayMin),
        size,
        color: palette[Math.floor(Math.random() * palette.length)]
      });
    }
  }

  function triggerExplosion(x, y) {
    const state = hooks.getState();
    if (!state) return;
    state.explosion = { x, y, progress: 0 };
    spawnParticles(x, y, ['#ffffff', '#ffd000', '#ff6b2b', '#ff2a85', '#7eb6eb'], 44, {
      minSpeed: 80,
      maxSpeed: 290,
      minSize: 3,
      maxSize: 7,
      decayMin: 0.7,
      decayMax: 1.5
    });
  }

  function triggerShieldFlash(x, y) {
    const state = hooks.getState();
    if (!state) return;
    state.shieldSurge = 1.25;
    spawnParticles(x, y, ['#00ff88', '#8effc8', '#00f0ff', '#ffffff'], 46, {
      minSpeed: 70,
      maxSpeed: 260,
      minSize: 3,
      maxSize: 6,
      decayMin: 0.65,
      decayMax: 1.4
    });
  }

  /* ------------------------------------------------------------------------
     DIBUJO DEL ENTORNO ESPACIAL PIXEL-ART 16-BIT
     ------------------------------------------------------------------------ */
  function drawBackground(state, wave, dt) {
    // Gradiente cósmico profundo
    const grad = ctx.createLinearGradient(0, 0, 0, ch);
    grad.addColorStop(0, '#040717');
    grad.addColorStop(0.5, '#070e28');
    grad.addColorStop(1, '#040714');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, cw, ch);

    // Bandas de nebulosa pixel-art escalonadas (drifting pixel bands)
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    const stepW = 14;
    for (const band of nebulaBands) {
      const baseY = ch * band.yNorm;
      ctx.fillStyle = band.color;
      for (let x = 0; x < cw; x += stepW) {
        const waveY = Math.round(Math.sin(x * 0.011 + state.time * 0.16 * (band.speed > 0 ? 1 : -1) + band.phase) * 14);
        const segH = Math.round(band.h + Math.cos(x * 0.017 + band.phase) * 10);
        const py = Math.round((baseY + waveY) / 4) * 4;
        ctx.fillRect(x, py - Math.round(segH / 2), stepW, segH);
      }
    }
    ctx.restore();

    // Estrellas pixel-art con paralaje multi-capa y destellos en cruz
    const isWarp = state.phase === 'WARP' && Boolean(wave && wave.isAllReals);
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    for (const s of state.stars) {
      const mult = isWarp ? 16 : (state.phase === 'FLYING' ? 2.6 : 1);
      s.y += s.speed * dt * mult;
      if (s.y > 1.02) {
        s.y = -0.02;
        s.x = Math.random();
      }
      const sx = Math.round(s.x * cw);
      const sy = Math.round(s.y * ch);

      if (isWarp) {
        // Estelas hiperespaciales doradas y cian pixeladas
        const streakLen = 18 + s.layer * 16;
        ctx.globalAlpha = Math.min(1, s.alpha + 0.2);
        ctx.fillStyle = s.layer === 2 ? '#ffd000' : '#00f0ff';
        ctx.fillRect(sx, sy - streakLen, s.layer === 2 ? 3 : 2, streakLen);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(sx, sy - 4, s.layer === 2 ? 3 : 2, 5);
      } else {
        const tw = 0.5 + 0.5 * Math.sin(state.time * s.twinkleSpeed + s.twinkleOffset);
        const alpha = s.alpha * (0.65 + 0.35 * tw);
        PixelArt.drawPixelStar(ctx, sx, sy, s.layer, s.color, alpha, tw);
      }
    }
    ctx.restore();

    // Planeta alienígena anillado pixel-art y luna orbitante en el fondo profundo
    const planetX = cw * 0.82;
    const planetY = ch * 0.22;
    const planetScale = cw < 560 ? 1.5 : 2;
    ctx.save();
    ctx.globalAlpha = state.revealed ? 0.38 : 0.85;
    PixelArt.drawPlanetAndMoon(ctx, planetX, planetY, state.time, planetScale);
    ctx.restore();
  }

  /* ------------------------------------------------------------------------
     BARRERA MISTERIOSA + EMISORES LÁSER PIXEL-ART
     ------------------------------------------------------------------------ */
  function drawBarrierEmitters(state, scanned) {
    const b = getPlotBounds();
    const midY = getBarrierY();
    const scale = cw < 560 ? 1.5 : 2;
    PixelArt.drawEmitter(ctx, 'left', b.left - 8, midY, state.time, scanned, scale);
    PixelArt.drawEmitter(ctx, 'right', b.right + 8, midY, state.time, scanned, scale);
  }

  function drawMysteryBarrier(state) {
    const b = getPlotBounds();
    const midY = getBarrierY();
    const bandH = 66;

    // Halo de energía cósmica que oculta las brechas antes del lanzamiento
    const g = ctx.createLinearGradient(0, midY - bandH, 0, midY + bandH);
    g.addColorStop(0, 'rgba(255, 42, 133, 0)');
    g.addColorStop(0.35, 'rgba(180, 0, 255, 0.24)');
    g.addColorStop(0.5, 'rgba(255, 42, 133, 0.55)');
    g.addColorStop(0.65, 'rgba(180, 0, 255, 0.24)');
    g.addColorStop(1, 'rgba(255, 42, 133, 0)');
    ctx.fillStyle = g;
    ctx.fillRect(b.left, midY - bandH, b.width, bandH * 2);

    // Chispas pixeladas horizontales flotando dentro de la barrera
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    for (let i = 0; i < 18; i++) {
      const frac = ((i * 0.137 + state.time * (0.09 + (i % 3) * 0.04)) % 1);
      const px = Math.round(b.left + frac * b.width);
      const py = Math.round(midY + Math.sin(state.time * 4 + i * 2.1) * 24);
      ctx.fillStyle = i % 2 === 0 ? 'rgba(0, 240, 255, 0.8)' : 'rgba(255, 130, 195, 0.85)';
      ctx.fillRect(px, py, 3, 3);
    }
    ctx.restore();

    // Ondas sinusoidales animadas de interferencia
    for (let layer = 0; layer < 3; layer++) {
      ctx.beginPath();
      ctx.lineWidth = layer === 1 ? 3.5 : 2;
      ctx.strokeStyle = layer === 1 ? '#ff4da6' : 'rgba(0, 240, 255, 0.65)';
      for (let px = b.left; px <= b.right; px += 6) {
        const t = (px - b.left) / b.width;
        const amp = (14 + layer * 6) * Math.sin(state.time * 2.2 + layer);
        const py = midY + Math.sin(t * 22 + state.time * (3 + layer * 1.4)) * amp
                        + Math.cos(t * 9 - state.time * 2.1) * 7;
        if (px === b.left) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.stroke();
    }

    // Emisores pixel-art en los bordes izquierdo y derecho de la barrera
    drawBarrierEmitters(state, false);

    // Etiqueta central
    ctx.save();
    ctx.fillStyle = 'rgba(8, 14, 34, 0.88)';
    ctx.strokeStyle = 'rgba(255, 42, 133, 0.78)';
    ctx.lineWidth = 1.5;
    const label = '⚡ CAMPO DE ONDA CÓSMICA — ESCÁNER EN ESPERA ⚡';
    ctx.font = 'bold 14px Segoe UI, sans-serif';
    const tw = ctx.measureText(label).width + 26;
    const rx = cw / 2 - tw / 2;
    const ry = midY - 16;
    ctx.beginPath();
    ctx.roundRect(rx, ry, tw, 32, 16);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#ffd1e8';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, cw / 2, midY);
    ctx.restore();
  }

  /* ------------------------------------------------------------------------
     GRÁFICA MATEMÁTICA EXACTA PARA PROYECCIÓN EN PIZARRA DIGITAL
     ------------------------------------------------------------------------ */
  function drawRevealedFunction(state, wave) {
    const b = getPlotBounds();
    const alpha = Math.min(1, state.scanAlpha);
    ctx.save();
    ctx.globalAlpha = alpha;

    // 1. Rejilla cartesiana nítida
    ctx.strokeStyle = 'rgba(147, 168, 212, 0.16)';
    ctx.lineWidth = 1;
    for (let x = X_MIN; x <= X_MAX; x++) {
      const sx = worldToScreenX(x);
      ctx.beginPath();
      ctx.moveTo(sx, b.top);
      ctx.lineTo(sx, b.bottom);
      ctx.stroke();
    }
    for (let y = Y_MIN; y <= Y_MAX; y++) {
      const sy = worldToScreenY(y);
      ctx.beginPath();
      ctx.moveTo(b.left, sy);
      ctx.lineTo(b.right, sy);
      ctx.stroke();
    }

    // 2. Zonas de vacío seguro (intervalos donde la función NO existe)
    for (const [a, c] of wave.voidIntervals) {
      const x1 = worldToScreenX(Math.max(X_MIN, a));
      const x2 = worldToScreenX(Math.min(X_MAX, c));
      if (x2 > x1) {
        ctx.fillStyle = 'rgba(0, 255, 136, 0.14)';
        ctx.fillRect(x1, b.top, x2 - x1, b.height);
        ctx.strokeStyle = 'rgba(0, 255, 136, 0.65)';
        ctx.lineWidth = 2;
        ctx.setLineDash([7, 5]);
        ctx.strokeRect(x1, b.top, x2 - x1, b.height);
        ctx.setLineDash([]);

        if (x2 - x1 > 70) {
          ctx.fillStyle = '#00ff88';
          ctx.font = 'bold 13px Segoe UI, sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('BRECHA SEGURA', (x1 + x2) / 2, b.top + 20);
        }
      }
    }

    // 3. Asíntotas verticales / portales puntuales seguros en verde brillante
    for (const ax of wave.asymptotes) {
      if (ax >= X_MIN && ax <= X_MAX) {
        const sx = worldToScreenX(ax);
        const pulse = 0.65 + 0.35 * Math.sin(state.time * 6);
        ctx.fillStyle = `rgba(0, 255, 136, ${0.18 * pulse})`;
        ctx.fillRect(sx - 10, b.top, 20, b.height);

        ctx.strokeStyle = '#00ff88';
        ctx.lineWidth = 3;
        ctx.setLineDash([8, 6]);
        ctx.beginPath();
        ctx.moveTo(sx, b.top);
        ctx.lineTo(sx, b.bottom);
        ctx.stroke();
        ctx.setLineDash([]);

        // Etiqueta del portal
        ctx.fillStyle = '#031a10';
        ctx.strokeStyle = '#00ff88';
        ctx.lineWidth = 1.5;
        const tag = `x = ${formatNum(ax)}`;
        ctx.font = 'bold 13px Consolas, monospace';
        const tw = ctx.measureText(tag).width + 14;
        ctx.beginPath();
        ctx.roundRect(sx - tw / 2, b.top + 6, tw, 24, 8);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#00ff88';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(tag, sx, b.top + 18);
      }
    }

    // 4. Ejes cartesianos principales (Eje Y y Eje X del gráfico)
    const zeroX = worldToScreenX(0);
    const zeroY = worldToScreenY(0);
    ctx.strokeStyle = 'rgba(220, 240, 255, 0.58)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(b.left, zeroY);
    ctx.lineTo(b.right, zeroY);
    ctx.moveTo(zeroX, b.top);
    ctx.lineTo(zeroX, b.bottom);
    ctx.stroke();

    // Marcas numéricas discretas en el eje Y para lectura de aula
    ctx.fillStyle = 'rgba(180, 210, 245, 0.65)';
    ctx.font = 'bold 11px Consolas, monospace';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    for (const yv of [-4, -2, 2, 4]) {
      const sy = worldToScreenY(yv);
      ctx.fillText(String(yv), zeroX - 6, sy);
    }

    // 5. Curva real f(x) como muro de plasma rojo/magenta de alta precisión
    ctx.save();
    ctx.beginPath();
    ctx.rect(b.left, b.top, b.width, b.height);
    ctx.clip();

    const steps = 440;
    const dx = (X_MAX - X_MIN) / steps;

    const drawCurvePass = (color, width, blur) => {
      ctx.strokeStyle = color;
      ctx.lineWidth = width;
      ctx.shadowColor = color;
      ctx.shadowBlur = blur;
      ctx.beginPath();
      let penDown = false;
      let prevY = null;

      for (let i = 0; i <= steps; i++) {
        const x = X_MIN + i * dx;
        const y = wave.evalFn(x);
        if (!Number.isFinite(y) || Math.abs(y) > 40) {
          penDown = false;
          prevY = null;
          continue;
        }
        // Evitar líneas verticales falsas al cruzar una asíntota
        if (prevY !== null && Math.abs(y - prevY) > 6) {
          penDown = false;
        }
        const sx = worldToScreenX(x);
        const sy = worldToScreenY(y);
        if (!penDown) {
          ctx.moveTo(sx, sy);
          penDown = true;
        } else {
          ctx.lineTo(sx, sy);
        }
        prevY = y;
      }
      ctx.stroke();
    };

    drawCurvePass('rgba(255, 42, 133, 0.45)', 10, 18);
    drawCurvePass('#ff3b8d', 4, 8);
    drawCurvePass('#ffd6ea', 1.6, 0);

    // 6. Puntos cerrados (extremos incluidos en el dominio) y puntos abiertos (huecos)
    const closedDots = wave.closedDots || [];
    for (const [pxVal, pyVal] of closedDots) {
      if (pxVal >= X_MIN && pxVal <= X_MAX) {
        const sx = worldToScreenX(pxVal);
        const sy = worldToScreenY(pyVal);
        ctx.fillStyle = '#ff3b8d';
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(sx, sy, 6.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
    }

    const openDots = wave.openDots || [];
    for (const [pxVal, pyVal] of openDots) {
      if (pxVal >= X_MIN && pxVal <= X_MAX) {
        const sx = worldToScreenX(pxVal);
        const sy = worldToScreenY(pyVal);
        ctx.fillStyle = '#050816';
        ctx.strokeStyle = '#00ff88';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(sx, sy, 7, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
    }

    ctx.restore();

    // Emisores en estado escaneado a ambos lados de la ventana gráfica
    drawBarrierEmitters(state, true);

    ctx.restore();
  }

  /* ------------------------------------------------------------------------
     EJE X INTERACTIVO DE SELECCIÓN DE COORDENADA
     ------------------------------------------------------------------------ */
  function drawXAxisBar(state, wave) {
    const b = getPlotBounds();
    const axisY = ch * 0.75;

    // Barra base
    ctx.strokeStyle = 'rgba(0, 240, 255, 0.72)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(b.left, axisY);
    ctx.lineTo(b.right, axisY);
    ctx.stroke();

    // Cuando la función está revelada, marca puntos cerrados/abiertos sobre el eje X
    if (state.revealed && wave) {
      for (const [cxVal] of (wave.closedDots || [])) {
        if (cxVal >= X_MIN && cxVal <= X_MAX) {
          const sx = worldToScreenX(cxVal);
          ctx.fillStyle = '#ff3b8d';
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(sx, axisY, 5.5, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
        }
      }
      for (const ax of (wave.asymptotes || [])) {
        if (ax >= X_MIN && ax <= X_MAX) {
          const sx = worldToScreenX(ax);
          ctx.fillStyle = '#050816';
          ctx.strokeStyle = '#00ff88';
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.arc(sx, axisY, 5.5, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
        }
      }
    }

    // Marcas enteras y medias (-8 a +8)
    for (let v = X_MIN; v <= X_MAX; v += 0.5) {
      const sx = worldToScreenX(v);
      const isInt = Math.abs(v - Math.round(v)) < 1e-6;
      const tickH = isInt ? 11 : 5;
      ctx.strokeStyle = isInt ? '#00f0ff' : 'rgba(0, 240, 255, 0.45)';
      ctx.lineWidth = isInt ? 2.2 : 1.3;
      ctx.beginPath();
      ctx.moveTo(sx, axisY - tickH);
      ctx.lineTo(sx, axisY + tickH);
      ctx.stroke();

      if (isInt) {
        ctx.fillStyle = v === 0 ? '#ffd000' : '#d6ebff';
        ctx.font = v === 0 ? 'bold 16px Consolas, monospace' : 'bold 14px Consolas, monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillText(String(v), sx, axisY + 14);
      }
    }

    // Marcador de puntería pixel-art para la coordenada seleccionada
    if (state.hasSelection && state.selectedX >= X_MIN && state.selectedX <= X_MAX) {
      const tx = worldToScreenX(state.selectedX);
      ctx.save();
      ctx.strokeStyle = 'rgba(0, 240, 255, 0.58)';
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 5]);
      ctx.beginPath();
      ctx.moveTo(tx, b.top);
      ctx.lineTo(tx, axisY);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();

      PixelArt.drawPixelReticle(ctx, tx, axisY, state.time);
    }
  }

  /* ------------------------------------------------------------------------
     NAVE PIXEL-ART 16-BIT + PARTÍCULAS CUADRADAS + EXPLOSIÓN
     ------------------------------------------------------------------------ */
  function drawSpaceship(state, wave) {
    const sx = worldToScreenX(state.shipX);
    const hoverBob = state.phase === 'IDLE' ? Math.sin(state.time * 3.4) * 3 : 0;
    const sy = ch * state.shipYNorm + hoverBob;

    let mode = 'idle';
    if (state.phase === 'WARP' && wave?.isAllReals) {
      mode = 'warp';
    } else if (state.phase === 'FLYING' || state.phase === 'AIMING') {
      mode = 'boost';
    }

    // Estelas doradas extra bajo la nave durante el Salto Hiperespacial
    if (mode === 'warp') {
      ctx.save();
      ctx.imageSmoothingEnabled = false;
      const glowW = 36 + Math.round(Math.sin(state.time * 24) * 8);
      const wg = ctx.createLinearGradient(sx, sy - 40, sx, ch);
      wg.addColorStop(0, 'rgba(255, 242, 166, 0.65)');
      wg.addColorStop(0.35, 'rgba(255, 208, 0, 0.45)');
      wg.addColorStop(1, 'rgba(255, 140, 0, 0)');
      ctx.fillStyle = wg;
      ctx.fillRect(Math.round(sx - glowW / 2), Math.round(sy - 10), glowW, ch - sy + 20);
      ctx.restore();
    }

    const scale = cw < 560 ? 1.5 : 2;
    PixelArt.drawStarship(ctx, sx, sy, {
      mode,
      time: state.time,
      scale,
      bank: state.shipBank || 0,
      hasShields: state.shields > 0,
      shieldSurge: state.shieldSurge || 0
    });
  }

  function emitThrusterTrail(state, wave, dt) {
    trailTimer += dt;
    const isWarp = state.phase === 'WARP' && Boolean(wave && wave.isAllReals);
    const isFlying = state.phase === 'FLYING';
    const interval = isWarp ? 0.018 : isFlying ? 0.025 : 0.075;
    if (trailTimer < interval) return;
    trailTimer = 0;

    const sx = worldToScreenX(state.shipX);
    const sy = ch * state.shipYNorm + 34;

    if (isWarp) {
      spawnParticles(sx + (Math.random() - 0.5) * 18, sy, ['#ffffff', '#fff2a6', '#ffd000', '#ff8c00'], 3, {
        angle: Math.PI / 2,
        spread: 0.45,
        minSpeed: 140,
        maxSpeed: 280,
        minSize: 3,
        maxSize: 6,
        decayMin: 1.4,
        decayMax: 2.3
      });
    } else if (isFlying) {
      spawnParticles(sx + (Math.random() - 0.5) * 14, sy, ['#ffffff', '#00ff88', '#00f0ff'], 2, {
        angle: Math.PI / 2,
        spread: 0.35,
        minSpeed: 100,
        maxSpeed: 210,
        minSize: 3,
        maxSize: 5,
        decayMin: 1.5,
        decayMax: 2.4
      });
    } else {
      spawnParticles(sx + (Math.random() - 0.5) * 8, sy, ['#00f0ff', '#0088ff'], 1, {
        angle: Math.PI / 2,
        spread: 0.3,
        minSpeed: 45,
        maxSpeed: 95,
        minSize: 2,
        maxSize: 4,
        decayMin: 1.8,
        decayMax: 2.8
      });
    }
  }

  function updateAndDrawParticles(state, dt) {
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    for (let i = state.particles.length - 1; i >= 0; i--) {
      const p = state.particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= p.decay * dt;
      if (p.life <= 0) {
        state.particles.splice(i, 1);
        continue;
      }
      ctx.globalAlpha = Math.max(0, Math.min(1, p.life));
      ctx.fillStyle = p.color;
      const sz = Math.max(2, Math.round(p.size * (0.55 + 0.45 * p.life)));
      ctx.fillRect(Math.round(p.x - sz / 2), Math.round(p.y - sz / 2), sz, sz);
    }
    ctx.restore();
  }

  function updateAndDrawExplosion(state, dt) {
    if (!state.explosion) return;
    state.explosion.progress += dt * 1.9;
    if (state.explosion.progress >= 1) {
      state.explosion = null;
      return;
    }
    const scale = cw < 560 ? 2.0 : 2.6;
    PixelArt.drawExplosion(ctx, state.explosion.x, state.explosion.y, state.explosion.progress, scale);
  }

  /* ------------------------------------------------------------------------
     BUCLE PRINCIPAL DE ANIMACIÓN
     ------------------------------------------------------------------------ */
  function animate(now) {
    const state = hooks.getState();
    const wave = hooks.getCurrentWave();
    const dt = Math.min(0.05, (now - lastFrameTime) / 1000);
    lastFrameTime = now;
    state.time += dt;

    const prevShipX = state.shipX;

    // Actualización de estados de animación
    if (state.phase === 'IDLE' && state.hasSelection) {
      const clamped = Math.max(X_MIN, Math.min(X_MAX, state.selectedX));
      state.shipX += (clamped - state.shipX) * Math.min(1, dt * 10);
    } else if (state.phase === 'AIMING') {
      const diff = state.targetX - state.shipX;
      state.shipX += diff * Math.min(1, dt * 11);
      if (Math.abs(diff) < 0.04) {
        state.shipX = state.targetX;
        state.phase = 'FLYING';
      }
    } else if (state.phase === 'FLYING') {
      state.shipYNorm -= dt * 1.15;
      const barrierNorm = getBarrierY() / ch;
      if (state.shipYNorm <= barrierNorm + 0.04) {
        state.revealed = true;
        state.scanAlpha = Math.min(1, state.scanAlpha + dt * 5);
      }
      if (state.shipYNorm <= barrierNorm) {
        if (wave && wave.isOutsideDomain(state.targetX)) {
          hooks.onEvaluateArrival();
          state.shipYNorm = 0.14;
        } else {
          state.shipYNorm = barrierNorm + 0.09;
          hooks.onEvaluateArrival();
        }
      }
    } else if (state.phase === 'WARP') {
      state.warpProgress += dt * 1.35;
      if (wave && wave.isAllReals) {
        state.shipYNorm -= dt * 1.4;
      }
      if (state.warpProgress >= 1) {
        hooks.onEvaluateWarpResult();
      }
    }

    // Inclinación suave (bank) proporcional a la velocidad lateral
    const vx = (state.shipX - prevShipX) / Math.max(0.001, dt);
    const targetBank = Math.max(-0.22, Math.min(0.22, vx * 0.018));
    state.shipBank = (state.shipBank || 0) + (targetBank - (state.shipBank || 0)) * Math.min(1, dt * 12);

    // Decaimiento del destello de escudo hexagonal
    if (state.shieldSurge > 0) {
      state.shieldSurge = Math.max(0, state.shieldSurge - dt * 1.15);
    }

    if (state.revealed && state.scanAlpha < 1) {
      state.scanAlpha = Math.min(1, state.scanAlpha + dt * 3.5);
    }

    // Estela de propulsores pixel-art
    emitThrusterTrail(state, wave, dt);

    // Sacudida de cámara al impactar
    ctx.save();
    if (state.shakeTime > 0) {
      state.shakeTime = Math.max(0, state.shakeTime - dt);
      const mag = state.shakeTime * 18;
      ctx.translate(Math.round((Math.random() - 0.5) * mag), Math.round((Math.random() - 0.5) * mag));
    }

    drawBackground(state, wave, dt);
    if (wave) {
      if (!state.revealed) {
        drawMysteryBarrier(state);
      } else {
        drawRevealedFunction(state, wave);
      }
    }
    drawXAxisBar(state, wave);
    drawSpaceship(state, wave);
    updateAndDrawParticles(state, dt);
    updateAndDrawExplosion(state, dt);

    // Destello dorado/cian en Salto Hiperespacial exitoso
    if (state.phase === 'WARP' && wave && wave.isAllReals) {
      const flash = Math.sin(state.warpProgress * Math.PI) * 0.42;
      const g = ctx.createRadialGradient(cw / 2, ch / 2, 20, cw / 2, ch / 2, Math.max(cw, ch) * 0.65);
      g.addColorStop(0, `rgba(255, 240, 160, ${flash})`);
      g.addColorStop(0.6, `rgba(0, 240, 255, ${flash * 0.75})`);
      g.addColorStop(1, 'rgba(0, 240, 255, 0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, cw, ch);
    }

    ctx.restore();
    requestAnimationFrame(animate);
  }

  /* ------------------------------------------------------------------------
     INTERACCIÓN TÁCTIL / RATÓN SOBRE EL EJE X DEL CANVAS
     ------------------------------------------------------------------------ */
  function pickXFromPointer(e) {
    const state = hooks.getState();
    if (!state || state.phase !== 'IDLE') return;
    const rect = canvas.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const rawX = screenToWorldX(px);
    const snapped = Math.round(rawX * 2) / 2;
    hooks.onPickX(snapped);
  }

  function bindPointerEvents() {
    canvas.addEventListener('pointerdown', (e) => {
      const state = hooks.getState();
      if (!state || state.phase !== 'IDLE') return;
      isDraggingAxis = true;
      canvas.setPointerCapture(e.pointerId);
      pickXFromPointer(e);
      SoundFX.click();
    });

    canvas.addEventListener('pointermove', (e) => {
      if (!isDraggingAxis) return;
      pickXFromPointer(e);
    });

    canvas.addEventListener('pointerup', () => { isDraggingAxis = false; });
    canvas.addEventListener('pointercancel', () => { isDraggingAxis = false; });
  }

  function init(config) {
    canvas = config.canvas;
    frameEl = config.frameEl;
    ctx = canvas.getContext('2d');
    hooks = {
      getState: config.getState,
      getCurrentWave: config.getCurrentWave,
      onEvaluateArrival: config.onEvaluateArrival,
      onEvaluateWarpResult: config.onEvaluateWarpResult,
      onPickX: config.onPickX
    };
    PixelArt.init();
    initStarsAndNebula(config.getState());
    resize();
    bindPointerEvents();
  }

  function startLoop() {
    lastFrameTime = performance.now();
    requestAnimationFrame(animate);
  }

  return {
    init,
    startLoop,
    resize,
    worldToScreenX,
    screenToWorldX,
    getBarrierY,
    spawnParticles,
    triggerExplosion,
    triggerShieldFlash
  };
})();
