/* ==========================================================================
   CONTROLADOR PRINCIPAL DEL JUEGO (ESTADO, ONDAS, INPUT, PANTALLA COMPLETA)
   ========================================================================== */

(() => {
  const state = {
    mode: 'mix',
    queue: [],
    index: 0,
    score: 0,
    streak: 0,
    bestStreak: 0,
    cleared: 0,
    shields: 3,
    inputStr: '',
    selectedX: 0,
    hasSelection: false,
    phase: 'IDLE', // IDLE | AIMING | FLYING | WARP | RESULT
    revealed: false,
    waveSolved: false,
    // Variables de animación en Canvas
    shipX: 0,
    shipYNorm: 0.86, // 0 arriba, 1 abajo
    shipBank: 0,
    targetX: 0,
    warpProgress: 0,
    shakeTime: 0,
    scanAlpha: 0,
    shieldSurge: 0,
    explosion: null,
    particles: [],
    stars: [],
    time: 0
  };

  let dom = {};

  function collectDOM() {
    dom = {
      missionSelect: document.getElementById('missionSelect'),
      statLevel: document.getElementById('statLevel'),
      statScore: document.getElementById('statScore'),
      statStreak: document.getElementById('statStreak'),
      shieldsDisplay: document.getElementById('shieldsDisplay'),
      btnRecharge: document.getElementById('btnRecharge'),
      btnPencil: document.getElementById('btnPencil'),
      btnMute: document.getElementById('btnMute'),
      btnFullscreen: document.getElementById('btn-fullscreen'),
      categoryBadge: document.getElementById('categoryBadge'),
      mathFormula: document.getElementById('mathFormula'),
      canvasFrame: document.getElementById('canvasFrame'),
      spaceCanvas: document.getElementById('spaceCanvas'),
      coordValue: document.getElementById('coordValue'),
      xSlider: document.getElementById('xSlider'),
      btnLaunch: document.getElementById('btnLaunch'),
      btnWarp: document.getElementById('btnWarp'),
      btnHint: document.getElementById('btnHint'),
      btnReveal: document.getElementById('btnReveal'),
      hintBox: document.getElementById('hintBox'),
      feedbackOverlay: document.getElementById('feedbackOverlay'),
      feedbackTitle: document.getElementById('feedbackTitle'),
      feedbackBody: document.getElementById('feedbackBody'),
      domainBox: document.getElementById('domainBox'),
      btnCloseFeedback: document.getElementById('btnCloseFeedback'),
      btnRetryWave: document.getElementById('btnRetryWave'),
      btnNextWave: document.getElementById('btnNextWave'),
      summaryModal: document.getElementById('summaryModal'),
      sumScore: document.getElementById('sumScore'),
      sumCleared: document.getElementById('sumCleared'),
      sumBestStreak: document.getElementById('sumBestStreak'),
      btnReplayMission: document.getElementById('btnReplayMission'),
      btnNextCategory: document.getElementById('btnNextCategory')
    };
  }

  function shuffle(arr) {
    const copy = [...arr];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }

  function buildQueue(mode) {
    if (mode === 'mix') {
      // Selección equilibrada de todas las categorías (10 ondas variadas)
      const r = shuffle(MISSION_BANK.racionales).slice(0, 3);
      const rad = shuffle(MISSION_BANK.radicales).slice(0, 2);
      const log = shuffle(MISSION_BANK.logaritmicas).slice(0, 2);
      const pro = shuffle(MISSION_BANK.pro).slice(0, 3);
      return shuffle([...r, ...rad, ...log, ...pro]);
    }
    return [...MISSION_BANK[mode]];
  }

  function currentWave() {
    return state.queue[state.index];
  }

  function startMission(mode) {
    state.mode = mode;
    state.queue = buildQueue(mode);
    state.index = 0;
    state.score = 0;
    state.streak = 0;
    state.bestStreak = 0;
    state.cleared = 0;
    state.shields = 3;
    dom.summaryModal.classList.remove('show');
    loadWave();
    updateHUD();
  }

  function loadWave() {
    const wave = currentWave();
    if (!wave) {
      showSummary();
      return;
    }
    state.phase = 'IDLE';
    state.revealed = false;
    state.waveSolved = false;
    state.shipYNorm = 0.86;
    state.shipBank = 0;
    state.warpProgress = 0;
    state.scanAlpha = 0;
    state.shieldSurge = 0;
    state.explosion = null;
    state.particles = [];
    state.inputStr = '';
    state.hasSelection = false;
    state.selectedX = 0;
    state.shipX = 0;

    dom.categoryBadge.textContent = wave.category;
    dom.mathFormula.innerHTML = wave.formulaHTML;
    dom.xSlider.value = '0';
    dom.hintBox.classList.remove('show');
    dom.hintBox.textContent = '';
    hideFeedback();
    renderCoordDisplay();
    updateHUD();
  }

  function updateHUD() {
    dom.statLevel.textContent = `${Math.min(state.index + 1, state.queue.length)}/${state.queue.length}`;
    dom.statScore.textContent = state.score;
    dom.statStreak.textContent = `${state.streak}🔥`;
    const icons = dom.shieldsDisplay.querySelectorAll('.shield-icon');
    icons.forEach((el, i) => {
      el.classList.toggle('lost', i >= state.shields);
    });
  }

  function renderCoordDisplay() {
    if (!state.hasSelection && state.inputStr === '') {
      dom.coordValue.textContent = 'Elige un número';
      dom.coordValue.classList.add('placeholder');
    } else {
      dom.coordValue.textContent = state.inputStr !== '' ? state.inputStr : formatNum(state.selectedX);
      dom.coordValue.classList.remove('placeholder');
    }
  }

  function setCoordinateFromNumber(val) {
    if (state.phase !== 'IDLE') return;
    const clamped = Math.max(-8, Math.min(8, Math.round(val * 100) / 100));
    state.selectedX = clamped;
    state.inputStr = formatNum(clamped);
    state.hasSelection = true;
    dom.xSlider.value = String(Math.max(-8, Math.min(8, clamped)));
    renderCoordDisplay();
  }

  function handleNumpadKey(key) {
    if (state.phase !== 'IDLE') return;
    SoundFX.click();

    if (key === 'clear') {
      state.inputStr = '';
      state.hasSelection = false;
      state.selectedX = 0;
      dom.xSlider.value = '0';
      renderCoordDisplay();
      return;
    }

    if (key === 'back') {
      state.inputStr = state.inputStr.slice(0, -1);
      if (state.inputStr === '' || state.inputStr === '-') {
        state.hasSelection = false;
      } else {
        const parsed = parseFloat(state.inputStr);
        if (!Number.isNaN(parsed)) {
          state.selectedX = parsed;
          state.hasSelection = true;
          dom.xSlider.value = String(Math.max(-8, Math.min(8, parsed)));
        }
      }
      renderCoordDisplay();
      return;
    }

    if (key === 'sign') {
      if (state.inputStr === '') {
        state.inputStr = '-';
      } else if (state.inputStr.startsWith('-')) {
        state.inputStr = state.inputStr.slice(1);
      } else {
        state.inputStr = '-' + state.inputStr;
      }
      const parsed = parseFloat(state.inputStr);
      if (!Number.isNaN(parsed)) {
        state.selectedX = parsed;
        state.hasSelection = true;
        dom.xSlider.value = String(Math.max(-8, Math.min(8, parsed)));
      }
      renderCoordDisplay();
      return;
    }

    if (key === '-') {
      if (state.inputStr === '') {
        state.inputStr = '-';
        renderCoordDisplay();
      }
      return;
    }

    if (key === '.') {
      if (!state.inputStr.includes('.')) {
        state.inputStr = (state.inputStr === '' || state.inputStr === '-') ? state.inputStr + '0.' : state.inputStr + '.';
        renderCoordDisplay();
      }
      return;
    }

    // Dígito 0-9
    if (state.inputStr.length >= 6) return;
    state.inputStr += key;
    const parsed = parseFloat(state.inputStr);
    if (!Number.isNaN(parsed)) {
      state.selectedX = parsed;
      state.hasSelection = true;
      dom.xSlider.value = String(Math.max(-8, Math.min(8, parsed)));
    }
    renderCoordDisplay();
  }

  /* ========================================================================
     LANZAMIENTO DE LA NAVE, SALTO HIPERESPACIAL Y EVALUACIÓN MATEMÁTICA
     ======================================================================== */
  function launchShip() {
    if (state.phase !== 'IDLE') return;
    const parsed = parseFloat(state.inputStr);
    if (!state.hasSelection || Number.isNaN(parsed)) {
      showFeedback(
        'info',
        '⚠️ Introduce una coordenada x',
        'Selecciona un valor de x en el teclado numérico o toca directamente sobre el eje X antes de lanzar la nave.',
        null,
        false,
        true
      );
      return;
    }

    if (parsed < -8 || parsed > 8) {
      showFeedback(
        'info',
        '📡 Coordenada fuera del radar',
        'El visor cubre el intervalo [−8, 8]. Introduce un valor de x entre −8 y +8.',
        null,
        false,
        true
      );
      return;
    }

    hideFeedback();
    state.selectedX = parsed;
    state.targetX = parsed;
    state.phase = 'AIMING';
    SoundFX.launch();
  }

  function triggerWarp() {
    if (state.phase !== 'IDLE') return;
    hideFeedback();
    const wave = currentWave();
    state.phase = 'WARP';
    state.warpProgress = 0;
    state.revealed = true;
    state.scanAlpha = 1;

    if (wave.isAllReals) {
      SoundFX.warp();
      state.shieldSurge = 1.4;
      SpaceRenderer.spawnParticles(
        SpaceRenderer.worldToScreenX(state.shipX),
        SpaceRenderer.getBarrierY(),
        ['#ffffff', '#fff2a6', '#ffd000', '#00f0ff'],
        36
      );
    } else {
      SoundFX.impact();
      SpaceRenderer.triggerExplosion(
        SpaceRenderer.worldToScreenX(state.shipX),
        SpaceRenderer.getBarrierY()
      );
    }
  }

  function evaluateArrival() {
    const wave = currentWave();
    const x = state.targetX;
    state.revealed = true;
    state.phase = 'RESULT';

    const outside = wave.isOutsideDomain(x);
    const sx = SpaceRenderer.worldToScreenX(x);
    const sy = SpaceRenderer.getBarrierY();

    if (outside) {
      // ¡ÉXITO! La función NO existe en x
      state.waveSolved = true;
      state.cleared++;
      state.streak++;
      if (state.streak > state.bestStreak) state.bestStreak = state.streak;
      state.score += 100 + (state.streak - 1) * 20;
      SoundFX.success();
      SpaceRenderer.triggerShieldFlash(sx, sy);
      updateHUD();

      showFeedback(
        'success',
        `✅ ¡CRUCE SEGURO EN x = ${formatNum(x)}!`,
        wave.explainPoint(x),
        wave.domainText,
        true,
        false
      );
    } else {
      // ¡IMPACTO! La función SÍ existe en x
      state.streak = 0;
      state.shields = Math.max(0, state.shields - 1);
      state.shakeTime = 0.45;
      SoundFX.impact();
      SpaceRenderer.triggerExplosion(sx, sy);
      updateHUD();

      const fxVal = wave.evalFn(x);
      const valText = Number.isFinite(fxVal) ? fxVal.toFixed(2) : 'muy elevada';
      let extra = wave.isAllReals
        ? ' ¡Pista: comprueba si esta función tiene dominio todo ℝ y necesita el Salto Hiperespacial!'
        : ' Analiza de nuevo qué valor de x hace que la función deje de existir.';

      if (state.shields === 0) {
        extra += ' (Escudos agotados: pulsa ⚡ arriba para recargarlos y seguir practicando).';
      }

      showFeedback(
        'error',
        '💥 ¡IMPACTO CONTRA LA ONDA!',
        `En <strong>x = ${formatNum(x)}</strong> la función <strong>SÍ existe</strong> con intensidad <strong>f(${formatNum(x)}) = ${valText}</strong>.${extra}`,
        null,
        false,
        true
      );
    }
  }

  function evaluateWarpResult() {
    const wave = currentWave();
    state.phase = 'RESULT';

    if (wave.isAllReals) {
      state.waveSolved = true;
      state.cleared++;
      state.streak++;
      if (state.streak > state.bestStreak) state.bestStreak = state.streak;
      state.score += 150 + (state.streak - 1) * 20;
      updateHUD();

      showFeedback(
        'success',
        '⚡ ¡SALTO HIPERESPACIAL PERFECTO!',
        wave.explainPoint(0),
        wave.domainText,
        true,
        false
      );
    } else {
      state.streak = 0;
      state.shields = Math.max(0, state.shields - 1);
      state.shakeTime = 0.4;
      updateHUD();

      showFeedback(
        'error',
        '⚠️ ¡ENERGÍA HIPERESPACIAL DESPERDICIADA!',
        'Esta onda <strong>SÍ tenía brechas reales</strong> donde la función no existe. No hacía falta usar el Salto Hiperespacial. Observa la gráfica revelada o inténtalo de nuevo.',
        wave.domainText,
        false,
        true
      );
    }
  }

  function showFeedback(type, title, bodyHTML, domainText, showNext, showRetry) {
    dom.feedbackOverlay.className = `feedback-overlay show ${type}`;
    dom.feedbackTitle.textContent = title;
    dom.feedbackBody.innerHTML = bodyHTML;
    if (domainText) {
      dom.domainBox.style.display = 'inline-flex';
      dom.domainBox.textContent = `📐 ${domainText}`;
    } else {
      dom.domainBox.style.display = 'none';
    }
    dom.btnNextWave.style.display = showNext ? 'inline-flex' : 'none';
    dom.btnRetryWave.style.display = showRetry ? 'inline-flex' : 'none';
  }

  function hideFeedback() {
    dom.feedbackOverlay.classList.remove('show');
  }

  function showSummary() {
    dom.sumScore.textContent = state.score;
    dom.sumCleared.textContent = `${state.cleared}/${state.queue.length}`;
    dom.sumBestStreak.textContent = `${state.bestStreak}🔥`;
    dom.summaryModal.classList.add('show');
  }

  /* ========================================================================
     PANTALLA COMPLETA (REQUESTFULLSCREEN / EXITFULLSCREEN)
     ======================================================================== */
  function isFullscreenActive() {
    return Boolean(document.fullscreenElement || document.webkitFullscreenElement);
  }

  function updateFullscreenButton() {
    if (!dom.btnFullscreen) return;
    const active = isFullscreenActive();
    dom.btnFullscreen.textContent = active ? '🗗 Salir' : '⛶ Pantalla';
    dom.btnFullscreen.classList.toggle('is-active', active);
    dom.btnFullscreen.setAttribute(
      'title',
      active ? 'Salir de pantalla completa' : 'Ver a pantalla completa'
    );
  }

  function toggleFullscreen() {
    SoundFX.click();
    if (!isFullscreenActive()) {
      const root = document.documentElement;
      const req = root.requestFullscreen || root.webkitRequestFullscreen;
      if (req) {
        Promise.resolve(req.call(root)).catch(() => {});
      }
    } else {
      const exit = document.exitFullscreen || document.webkitExitFullscreen;
      if (exit) {
        Promise.resolve(exit.call(document)).catch(() => {});
      }
    }
  }

  function onFullscreenChange() {
    updateFullscreenButton();
    setTimeout(() => {
      SpaceRenderer.resize();
      WhiteboardTool.resize();
    }, 60);
  }

  /* ========================================================================
     EVENTOS DE INTERFAZ Y TECLADO FÍSICO
     ======================================================================== */
  function bindEvents() {
    dom.missionSelect.addEventListener('change', (e) => {
      SoundFX.click();
      startMission(e.target.value);
    });

    dom.xSlider.addEventListener('input', (e) => {
      setCoordinateFromNumber(parseFloat(e.target.value));
    });

    document.querySelectorAll('.num-key').forEach((btn) => {
      btn.addEventListener('click', () => handleNumpadKey(btn.dataset.key));
    });

    dom.btnLaunch.addEventListener('click', launchShip);
    dom.btnWarp.addEventListener('click', triggerWarp);

    dom.btnHint.addEventListener('click', () => {
      const wave = currentWave();
      if (!wave) return;
      SoundFX.click();
      dom.hintBox.innerHTML = `<strong>💡 Pista matemática:</strong> ${wave.hint}`;
      dom.hintBox.classList.toggle('show');
    });

    dom.btnReveal.addEventListener('click', () => {
      const wave = currentWave();
      if (!wave) return;
      SoundFX.reveal();
      state.revealed = true;
      state.scanAlpha = 1;
      state.phase = 'RESULT';
      showFeedback(
        'info',
        '📊 GRÁFICA Y DOMINIO REVELADOS (MODO PROFESOR)',
        wave.isAllReals
          ? wave.explainPoint(0)
          : 'Observa en rojo/magenta los valores donde <strong>f(x)</strong> existe y en verde brillante las brechas donde la función <strong>no existe</strong>.',
        wave.domainText,
        true,
        true
      );
    });

    dom.btnNextWave.addEventListener('click', () => {
      SoundFX.click();
      state.index++;
      loadWave();
    });

    dom.btnRetryWave.addEventListener('click', () => {
      SoundFX.click();
      state.phase = 'IDLE';
      state.shipYNorm = 0.86;
      state.explosion = null;
      hideFeedback();
    });

    dom.btnCloseFeedback.addEventListener('click', () => {
      hideFeedback();
      if (!state.waveSolved) {
        state.phase = 'IDLE';
        state.shipYNorm = 0.86;
        state.explosion = null;
      }
    });

    dom.btnRecharge.addEventListener('click', () => {
      state.shields = 3;
      SoundFX.success();
      updateHUD();
    });

    dom.btnMute.addEventListener('click', () => {
      const isMuted = SoundFX.toggleMute();
      dom.btnMute.textContent = isMuted ? '🔇' : '🔊';
    });

    if (dom.btnFullscreen) {
      dom.btnFullscreen.addEventListener('click', toggleFullscreen);
      document.addEventListener('fullscreenchange', onFullscreenChange);
      document.addEventListener('webkitfullscreenchange', onFullscreenChange);
      updateFullscreenButton();
    }

    dom.btnReplayMission.addEventListener('click', () => {
      SoundFX.click();
      startMission(state.mode);
    });

    dom.btnNextCategory.addEventListener('click', () => {
      SoundFX.click();
      dom.missionSelect.value = 'mix';
      startMission('mix');
    });

    // Soporte para teclado físico del ordenador conectado a la pizarra
    window.addEventListener('keydown', (e) => {
      if (WhiteboardTool.isActive()) return;
      if (e.key >= '0' && e.key <= '9') handleNumpadKey(e.key);
      else if (e.key === '.' || e.key === ',') handleNumpadKey('.');
      else if (e.key === '-') handleNumpadKey('-');
      else if (e.key === 'Backspace') handleNumpadKey('back');
      else if (e.key === 'Escape') handleNumpadKey('clear');
      else if (e.key === 'Enter') {
        if (state.phase === 'IDLE') launchShip();
        else if (state.waveSolved) {
          state.index++;
          loadWave();
        }
      }
    });

    window.addEventListener('resize', () => {
      SpaceRenderer.resize();
      WhiteboardTool.resize();
    });
  }

  function bootstrap() {
    collectDOM();
    SpaceRenderer.init({
      canvas: dom.spaceCanvas,
      frameEl: dom.canvasFrame,
      getState: () => state,
      getCurrentWave: currentWave,
      onEvaluateArrival: evaluateArrival,
      onEvaluateWarpResult: evaluateWarpResult,
      onPickX: setCoordinateFromNumber
    });
    WhiteboardTool.init(dom.btnPencil);
    bindEvents();
    startMission('mix');
    SpaceRenderer.startLoop();
  }

  window.addEventListener('load', bootstrap);
})();
