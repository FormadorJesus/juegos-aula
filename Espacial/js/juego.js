/**
 * Espacial/js/juego.js
 * Lógica principal de Galaxia Matemática:
 * - Hangar de personalización con vista previa pixel-art animada en vivo
 * - Integración completa con BancoMatematicas + BancoUI.crearSelector
 * - Combate por turnos con temporizador adaptativo, proyectiles y explosiones 16-bit
 * - Control de sonido, pantalla completa y reinicio seguro
 */
(function (root) {
  'use strict';

  const Data = root.EspacialData;
  const Audio = root.EspacialAudio;
  const Pixel = root.EspacialPixelArt;

  let selectorEjercicios = null;

  const gameState = {
    currentTurn: 1,
    isAnimating: false,
    gameOver: false,
    currentExercise: null,
    timerInterval: null,
    turnTimeout: null,
    maxTime: 12.0,
    timeLeft: 12.0,
    lastTickSecond: 4,
    ships: {
      1: Object.assign({ hp: 100, maxHp: 100, hits: 0, misses: 0 }, Data.DEFAULT_SHIPS[1]),
      2: Object.assign({ hp: 100, maxHp: 100, hits: 0, misses: 0 }, Data.DEFAULT_SHIPS[2])
    }
  };

  /* ==========================================================================
   * UTILIDADES DE PANTALLA Y RESUMEN DEL BANCO DE EJERCICIOS
   * ========================================================================== */
  function escapeHtml(text) {
    return String(text || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function clearAllTimers() {
    if (gameState.timerInterval) {
      clearInterval(gameState.timerInterval);
      gameState.timerInterval = null;
    }
    if (gameState.turnTimeout) {
      clearTimeout(gameState.turnTimeout);
      gameState.turnTimeout = null;
    }
  }

  function updateConfigSummaries() {
    if (!selectorEjercicios) return;
    const detallado = selectorEjercicios.getResumenDetallado();
    const corto = selectorEjercicios.getResumen();

    const brandSub = document.getElementById('brand-sub');
    if (brandSub) {
      brandSub.textContent = `Combate 16-bit · ${detallado}`;
    }

    const setupSummary = document.getElementById('setup-config-summary');
    if (setupSummary) {
      setupSummary.innerHTML = `Banco activo: <strong>${escapeHtml(detallado)}</strong>`;
    }

    const hudTopicPill = document.getElementById('hud-topic-pill');
    if (hudTopicPill) {
      hudTopicPill.textContent = `📚 ${corto}`;
    }
  }

  function handleSelectorChange() {
    updateConfigSummaries();
    Audio.play('click');

    // Si estamos en combate y esperando respuesta, actualizamos la pregunta al instante
    const arena = document.getElementById('arena-screen');
    if (arena && !arena.classList.contains('hidden') && !gameState.isAnimating && !gameState.gameOver) {
      setupTurn();
    }
  }

  /* ==========================================================================
   * HANGAR Y PERSONALIZACIÓN PIXEL-ART EN VIVO
   * ========================================================================== */
  function initSetupPreviews() {
    const s1El = document.getElementById('preview-s1');
    const s2El = document.getElementById('preview-s2');
    if (s1El) Pixel.registerShip('setup-s1', s1El, gameState.ships[1], 1);
    if (s2El) Pixel.registerShip('setup-s2', s2El, gameState.ships[2], 2);
  }

  function syncSetupPreviews() {
    Pixel.updateShipConfig('setup-s1', gameState.ships[1]);
    Pixel.updateShipConfig('setup-s2', gameState.ships[2]);
  }

  function selectEquipment(playerNum, prop, val, silent) {
    if (!silent) Audio.play('click');
    gameState.ships[playerNum][prop] = val;

    const buttons = document.querySelectorAll(`.opt-choice[data-player="${playerNum}"][data-prop="${prop}"]`);
    buttons.forEach((btn) => {
      if (btn.getAttribute('data-val') === val) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    syncSetupPreviews();

    // Destello de prueba al cambiar de arma en el hangar
    if (prop === 'weapon' && !silent) {
      Pixel.setShipState(`setup-s${playerNum}`, 'attack', 450);
    }
  }

  /* ==========================================================================
   * COMBATE POR TURNOS Y PREGUNTAS DEL BANCO DE EJERCICIOS
   * ========================================================================== */
  function startBattle() {
    Audio.play('click');
    clearAllTimers();
    Pixel.clearFx();

    const name1 = document.getElementById('input-name-1').value.trim();
    const name2 = document.getElementById('input-name-2').value.trim();
    gameState.ships[1].name = name1 || Data.DEFAULT_SHIPS[1].name;
    gameState.ships[2].name = name2 || Data.DEFAULT_SHIPS[2].name;

    [1, 2].forEach((id) => {
      gameState.ships[id].hp = 100;
      gameState.ships[id].hits = 0;
      gameState.ships[id].misses = 0;
    });

    gameState.currentTurn = 1;
    gameState.isAnimating = false;
    gameState.gameOver = false;

    document.getElementById('setup-screen').classList.add('hidden');
    document.getElementById('arena-screen').classList.remove('hidden');
    document.getElementById('victory-overlay').classList.add('hidden');
    document.getElementById('reset-modal').classList.add('hidden');

    renderArenaShips();
    updateHealthHUD();
    updateConfigSummaries();
    setupTurn();
  }

  function renderArenaShips() {
    [1, 2].forEach((id) => {
      const wrapper = document.getElementById(`ship-${id}-wrapper`);
      const sprite = document.getElementById(`ship-${id}-sprite`);
      if (wrapper) wrapper.style.transform = 'translateX(0px) rotate(0deg) scale(1)';
      if (sprite) {
        sprite.className = 'fighter-sprite';
        Pixel.registerShip(`arena-s${id}`, sprite, gameState.ships[id], id);
        Pixel.setShipState(`arena-s${id}`, 'idle');
      }
    });
  }

  function updateHealthHUD() {
    [1, 2].forEach((id) => {
      const s = gameState.ships[id];
      const pct = Math.max(0, (s.hp / s.maxHp) * 100);
      const wStat = Data.WEAPONS[s.weapon];
      const hStat = Data.HULLS[s.hull];

      document.getElementById(`hud-name-${id}`).textContent = s.name;
      document.getElementById(`hud-hp-text-${id}`).textContent = `${s.hp} / ${s.maxHp} HP`;
      document.getElementById(`hud-gear-${id}`).textContent = `${hStat.label} • ${wStat.label} (${wStat.damage} DMG)`;

      const bar = document.getElementById(`hud-hp-bar-${id}`);
      bar.style.width = `${pct}%`;
      bar.classList.remove('mid', 'low');
      if (pct <= 25) bar.classList.add('low');
      else if (pct <= 55) bar.classList.add('mid');
    });
  }

  function computeTurnTime(weaponStat, ej) {
    let total = weaponStat.time;
    if (ej && ej.tipo === 'problema') {
      total += 14;
    }
    const nivel = ej && ej.nivel ? ej.nivel : '1eso';
    if (nivel === '3eso' || nivel === '4eso') {
      total += 3;
    } else if (nivel === '1bach' || nivel === '2bach') {
      total += 6;
    }
    return total;
  }

  function renderExerciseUI(ej) {
    const mathEl = document.getElementById('math-expression');
    const statement = String(ej.enunciado || '').trim();
    mathEl.textContent = statement;
    mathEl.classList.remove('math-text--short', 'math-text--medium', 'math-text--long');
    if (statement.length <= 28) {
      mathEl.classList.add('math-text--short');
    } else if (statement.length <= 74) {
      mathEl.classList.add('math-text--medium');
    } else {
      mathEl.classList.add('math-text--long');
    }

    const metaBadge = document.getElementById('exercise-meta-badge');
    if (metaBadge) {
      metaBadge.textContent = `${ej.nivelLabel || ''} · ${ej.temaLabel || ''} · ${ej.tipoLabel || ''}`;
    }

    const fb = document.getElementById('feedback-bar');
    fb.className = 'feedback-banner hidden';
    fb.innerHTML = '';

    const grid = document.getElementById('options-grid');
    grid.innerHTML = '';

    const maxOptLen = ej.opciones.reduce((max, o) => Math.max(max, String(o).length), 0);
    if (maxOptLen > 9) {
      grid.classList.add('options-cols-2');
    } else {
      grid.classList.remove('options-cols-2');
    }

    ej.opciones.forEach((opt, idx) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'ans-btn';
      btn.dataset.idx = String(idx);
      const optStr = String(opt);
      if (optStr.length > 16) {
        btn.classList.add('ans-text-xs');
      } else if (optStr.length > 8) {
        btn.classList.add('ans-text-sm');
      }
      btn.textContent = optStr;
      btn.addEventListener('click', () => handleAnswer(idx, btn));
      grid.appendChild(btn);
    });
  }

  function setupTurn() {
    if (gameState.gameOver) return;
    clearAllTimers();

    const attackerId = gameState.currentTurn;
    const attacker = gameState.ships[attackerId];

    const turnPill = document.getElementById('turn-pill');
    if (turnPill) {
      turnPill.className = `turn-pill ${attackerId === 2 ? 'turn-p2' : ''}`;
    }
    document.getElementById('turn-text').textContent = `TURNO DE ${attacker.name.toUpperCase()}`;

    const badge = document.getElementById('speaker-badge');
    badge.textContent = `${attacker.name} apunta:`;
    badge.className = `speaker-pill ${attackerId === 1 ? 'speaker-p1' : 'speaker-p2'}`;

    const panel = document.getElementById('holo-panel');
    panel.className = `holo-panel ${attackerId === 1 ? 'point-left' : 'point-right'}`;

    const ej = selectorEjercicios.solicitarEjercicio();
    gameState.currentExercise = ej;

    renderExerciseUI(ej);
    startTurnTimer(ej);
  }

  function startTurnTimer(ej) {
    const attacker = gameState.ships[gameState.currentTurn];
    const weaponStat = Data.WEAPONS[attacker.weapon];
    const turnSeconds = computeTurnTime(weaponStat, ej);

    gameState.maxTime = turnSeconds;
    gameState.timeLeft = turnSeconds;
    gameState.lastTickSecond = Math.min(4, Math.ceil(turnSeconds) + 1);
    updateTimerDisplay();

    gameState.timerInterval = setInterval(() => {
      if (gameState.isAnimating || gameState.gameOver) {
        clearAllTimers();
        return;
      }

      gameState.timeLeft = Math.max(0, +(gameState.timeLeft - 0.1).toFixed(1));
      updateTimerDisplay();

      const sec = Math.ceil(gameState.timeLeft);
      if (sec <= 3 && sec > 0 && sec < gameState.lastTickSecond) {
        gameState.lastTickSecond = sec;
        Audio.play('tick');
      }

      if (gameState.timeLeft <= 0) {
        clearAllTimers();
        handleTimeOut();
      }
    }, 100);
  }

  function updateTimerDisplay() {
    const txt = document.getElementById('timer-text');
    const bar = document.getElementById('timer-bar');
    const pct = gameState.maxTime > 0 ? (gameState.timeLeft / gameState.maxTime) * 100 : 0;

    txt.textContent = `${gameState.timeLeft.toFixed(1)}s`;
    bar.style.width = `${pct}%`;

    txt.classList.remove('warn', 'danger');
    bar.classList.remove('warn', 'danger');

    if (pct <= 30) {
      txt.classList.add('danger');
      bar.classList.add('danger');
    } else if (pct <= 55) {
      txt.classList.add('warn');
      bar.classList.add('warn');
    }
  }

  function lockOptionButtons(clickedBtn, isCorrect) {
    const ej = gameState.currentExercise;
    const buttons = document.getElementById('options-grid').querySelectorAll('button');
    buttons.forEach((btn) => {
      btn.disabled = true;
      const idx = Number(btn.dataset.idx);
      const isRightBtn = idx === ej.indiceCorrecto || btn.textContent === String(ej.respuestaCorrecta);
      if (isRightBtn) {
        btn.classList.add('correct');
      } else if (btn === clickedBtn && !isCorrect) {
        btn.classList.add('wrong');
      } else {
        btn.classList.add('dimmed');
      }
    });
  }

  function showFeedbackBanner(ok, headline, explanation) {
    const fb = document.getElementById('feedback-bar');
    fb.className = `feedback-banner ${ok ? 'fb-ok' : 'fb-bad'}`;
    if (explanation) {
      fb.innerHTML = `${escapeHtml(headline)}<span class="feedback-exp">💡 ${escapeHtml(explanation)}</span>`;
    } else {
      fb.textContent = headline;
    }
  }

  function handleTimeOut() {
    if (gameState.isAnimating || gameState.gameOver) return;
    gameState.isAnimating = true;

    const attackerId = gameState.currentTurn;
    const defenderId = attackerId === 1 ? 2 : 1;
    const attacker = gameState.ships[attackerId];
    const ej = gameState.currentExercise;
    attacker.misses++;

    lockOptionButtons(null, false);

    showFeedbackBanner(
      false,
      `⏰ ¡Tiempo agotado! Respuesta correcta: ${ej.respuestaCorrecta}.`,
      ej.explicacion
    );

    Audio.play('timeout');
    spawnFloatingBadge(attackerId, '¡TIEMPO!', 'float-miss');

    const delay = ej.explicacion ? 2600 : 1550;
    gameState.turnTimeout = setTimeout(() => {
      if (gameState.gameOver) return;
      gameState.currentTurn = defenderId;
      gameState.isAnimating = false;
      setupTurn();
    }, delay);
  }

  function handleAnswer(selectedIdx, clickedBtn) {
    if (gameState.isAnimating || gameState.gameOver) return;
    clearAllTimers();
    gameState.isAnimating = true;

    const attackerId = gameState.currentTurn;
    const defenderId = attackerId === 1 ? 2 : 1;
    const attacker = gameState.ships[attackerId];
    const ej = gameState.currentExercise;

    const selectedText = String(ej.opciones[selectedIdx]);
    const isCorrect =
      selectedIdx === ej.indiceCorrecto ||
      selectedText === String(ej.respuestaCorrecta);

    lockOptionButtons(clickedBtn, isCorrect);

    if (isCorrect) {
      attacker.hits++;
      const wStat = Data.WEAPONS[attacker.weapon];
      const ratio = gameState.maxTime > 0 ? gameState.timeLeft / gameState.maxTime : 0;
      const timeBonus = Math.floor(ratio * wStat.time);
      const damage = wStat.damage + timeBonus;
      const bonusText = timeBonus > 0 ? ` (${wStat.damage} base + ${timeBonus} por rapidez)` : '';

      showFeedbackBanner(
        true,
        `💥 ¡Impacto directo! ${attacker.name} dispara ${wStat.label} (-${damage} HP${bonusText}).`,
        ''
      );
      performAttackSequence(attackerId, defenderId, damage);
    } else {
      attacker.misses++;
      showFeedbackBanner(
        false,
        `❌ ¡Disparo desviado! La respuesta correcta era ${ej.respuestaCorrecta}.`,
        ej.explicacion
      );
      performMissSequence(attackerId, defenderId, Boolean(ej.explicacion));
    }
  }

  function performAttackSequence(attackerId, defenderId, damage) {
    const attRig = document.getElementById(`ship-${attackerId}-wrapper`);
    const arena = document.getElementById('arena-screen');
    const attacker = gameState.ships[attackerId];
    const defender = gameState.ships[defenderId];
    const dir = attackerId === 1 ? 1 : -1;

    Audio.play(attacker.weapon);
    Pixel.setShipState(`arena-s${attackerId}`, 'attack', 520);
    attRig.style.transform = `translateX(${-20 * dir}px)`;

    setTimeout(() => {
      attRig.style.transform = 'translateX(0px)';
    }, 260);

    Pixel.fireProjectile({
      weapon: attacker.weapon,
      fromPlayer: attackerId,
      isMiss: false,
      onImpact: () => {
        if (gameState.gameOver) return;
        Audio.play('explosion');
        Pixel.setShipState(`arena-s${defenderId}`, 'hit', 650);
        arena.classList.add('arena-shake');

        spawnFloatingBadge(defenderId, `-${damage} HP`, 'float-dmg');
        defender.hp = Math.max(0, defender.hp - damage);
        updateHealthHUD();

        gameState.turnTimeout = setTimeout(() => {
          arena.classList.remove('arena-shake');

          if (defender.hp <= 0) {
            triggerVictory(attackerId, defenderId);
          } else {
            gameState.turnTimeout = setTimeout(() => {
              if (gameState.gameOver) return;
              gameState.currentTurn = defenderId;
              gameState.isAnimating = false;
              setupTurn();
            }, 460);
          }
        }, 520);
      }
    });
  }

  function performMissSequence(attackerId, defenderId, hasExplanation) {
    const attRig = document.getElementById(`ship-${attackerId}-wrapper`);
    const defRig = document.getElementById(`ship-${defenderId}-wrapper`);
    const attacker = gameState.ships[attackerId];
    const dir = attackerId === 1 ? 1 : -1;

    Pixel.setShipState(`arena-s${attackerId}`, 'attack', 380);
    attRig.style.transform = `translateX(${14 * dir}px) rotate(${-5 * dir}deg)`;
    defRig.style.transform = 'translateY(-26px)';

    Pixel.fireProjectile({
      weapon: attacker.weapon,
      fromPlayer: attackerId,
      isMiss: true,
      onImpact: () => {
        Audio.play('miss');
        spawnFloatingBadge(attackerId, '¡DESVIADO!', 'float-miss');

        setTimeout(() => {
          attRig.style.transform = 'translateX(0px) rotate(0deg)';
          defRig.style.transform = 'translateY(0px)';
        }, 320);

        const nextDelay = hasExplanation ? 2150 : 950;
        gameState.turnTimeout = setTimeout(() => {
          if (gameState.gameOver) return;
          gameState.currentTurn = defenderId;
          gameState.isAnimating = false;
          setupTurn();
        }, nextDelay);
      }
    });
  }

  function spawnFloatingBadge(playerId, text, extraClass) {
    const zone = document.getElementById(`float-zone-${playerId}`);
    if (!zone) return;
    const badge = document.createElement('div');
    badge.className = `float-badge font-scifi ${extraClass}`;
    badge.textContent = text;
    zone.appendChild(badge);
    setTimeout(() => badge.remove(), 1250);
  }

  function triggerVictory(winnerId, loserId) {
    clearAllTimers();
    gameState.gameOver = true;
    gameState.isAnimating = false;

    const winner = gameState.ships[winnerId];
    const loser = gameState.ships[loserId];

    const loserSprite = document.getElementById(`ship-${loserId}-sprite`);
    const winnerSprite = document.getElementById(`ship-${winnerId}-sprite`);

    Pixel.setShipState(`arena-s${loserId}`, 'defeat');
    Pixel.setShipState(`arena-s${winnerId}`, 'victory');

    if (loserSprite) {
      loserSprite.classList.add(loserId === 1 ? 'anim-destroyed-left' : 'anim-destroyed-right');
    }
    if (winnerSprite) {
      winnerSprite.classList.add('anim-victory');
    }

    Audio.play('victory');

    gameState.turnTimeout = setTimeout(() => {
      document.getElementById('winner-title').textContent = `¡VICTORIA PARA ${winner.name.toUpperCase()}!`;
      document.getElementById('winner-subtitle').textContent = `${winner.name} ha derrotado a ${loser.name} en el sector estelar.`;

      [1, 2].forEach((id) => {
        const s = gameState.ships[id];
        const total = s.hits + s.misses;
        const pct = total > 0 ? Math.round((s.hits / total) * 100) : 0;
        document.getElementById(`stat-name-${id}`).textContent = s.name;
        document.getElementById(`stat-score-${id}`).textContent = `Aciertos: ${s.hits} | Fallos: ${s.misses} (${pct}%)`;
      });

      document.getElementById('victory-overlay').classList.remove('hidden');
    }, 1200);
  }

  /* ==========================================================================
   * CONTROLES GLOBALES (SONIDO, PANTALLA COMPLETA Y REINICIO)
   * ========================================================================== */
  function toggleSound() {
    const on = Audio.toggle();
    document.getElementById('sound-icon').textContent = on ? '🔊' : '🔇';
    document.getElementById('sound-text').textContent = on ? 'Sonido: ON' : 'Sonido: OFF';
  }

  function bindFullscreen() {
    const btn = document.getElementById('btn-fullscreen');
    const fsIcon = document.getElementById('fs-icon');
    const fsText = document.getElementById('fs-text');
    if (!btn) return;

    function syncFs() {
      const isFs = Boolean(document.fullscreenElement || document.webkitFullscreenElement);
      btn.setAttribute('aria-pressed', String(isFs));
      if (fsIcon) fsIcon.textContent = isFs ? '⤹' : '⛶';
      if (fsText) fsText.textContent = isFs ? 'Salir Pantalla' : 'Pantalla Completa';
      btn.title = isFs ? 'Salir de pantalla completa' : 'Ver a pantalla completa';
    }

    btn.addEventListener('click', () => {
      const el = document.documentElement;
      if (!document.fullscreenElement && !document.webkitFullscreenElement) {
        const fn = el.requestFullscreen || el.webkitRequestFullscreen;
        if (fn) Promise.resolve(fn.call(el)).catch(() => {});
      } else {
        const fn = document.exitFullscreen || document.webkitExitFullscreen;
        if (fn) Promise.resolve(fn.call(document)).catch(() => {});
      }
    });

    document.addEventListener('fullscreenchange', syncFs);
    document.addEventListener('webkitfullscreenchange', syncFs);
    syncFs();
  }

  function handleRestartClick() {
    Audio.play('click');
    const isSetup = !document.getElementById('setup-screen').classList.contains('hidden');
    if (isSetup) {
      document.getElementById('input-name-1').value = Data.DEFAULT_SHIPS[1].name;
      document.getElementById('input-name-2').value = Data.DEFAULT_SHIPS[2].name;
      gameState.ships[1].name = Data.DEFAULT_SHIPS[1].name;
      gameState.ships[2].name = Data.DEFAULT_SHIPS[2].name;

      selectEquipment(1, 'hull', Data.DEFAULT_SHIPS[1].hull, true);
      selectEquipment(1, 'shield', Data.DEFAULT_SHIPS[1].shield, true);
      selectEquipment(1, 'weapon', Data.DEFAULT_SHIPS[1].weapon, true);

      selectEquipment(2, 'hull', Data.DEFAULT_SHIPS[2].hull, true);
      selectEquipment(2, 'shield', Data.DEFAULT_SHIPS[2].shield, true);
      selectEquipment(2, 'weapon', Data.DEFAULT_SHIPS[2].weapon, true);
    } else {
      document.getElementById('reset-modal').classList.remove('hidden');
    }
  }

  function rematchCurrentDuel() {
    Audio.play('click');
    clearAllTimers();
    Pixel.clearFx();

    [1, 2].forEach((id) => {
      gameState.ships[id].hp = 100;
      gameState.ships[id].hits = 0;
      gameState.ships[id].misses = 0;
    });

    gameState.currentTurn = 1;
    gameState.isAnimating = false;
    gameState.gameOver = false;

    document.getElementById('victory-overlay').classList.add('hidden');
    document.getElementById('reset-modal').classList.add('hidden');

    renderArenaShips();
    updateHealthHUD();
    setupTurn();
  }

  function goBackToSetup() {
    Audio.play('click');
    clearAllTimers();
    Pixel.clearFx();

    gameState.isAnimating = false;
    gameState.gameOver = false;

    document.getElementById('arena-screen').classList.add('hidden');
    document.getElementById('victory-overlay').classList.add('hidden');
    document.getElementById('reset-modal').classList.add('hidden');
    document.getElementById('setup-screen').classList.remove('hidden');

    syncSetupPreviews();
  }

  /* ==========================================================================
   * INICIALIZACIÓN TRAS DOMContentLoaded
   * ========================================================================== */
  document.addEventListener('DOMContentLoaded', () => {
    // 1. Conectar Selector de Ejercicios al Banco de Ejercicios
    selectorEjercicios = root.BancoUI.crearSelector({
      gameId: 'espacial',
      defaultTemas: ['enteros'],
      defaultNivel: '1eso',
      defaultTipo: 'operacion',
      onChange: handleSelectorChange
    });

    selectorEjercicios.bindButton(document.getElementById('btn-selector-ejercicios'));
    selectorEjercicios.bindButton(document.getElementById('btn-selector-setup'));
    updateConfigSummaries();

    // 2. Inicializar motores pixel-art 16-bit (naves de hangar, fondo espacial y capa FX)
    initSetupPreviews();
    Pixel.initSpaceBackdrop(document.getElementById('space-bg-canvas'));
    Pixel.initBattleFx(document.getElementById('fx-canvas'));

    // 3. Eventos de configuración del hangar
    document.querySelectorAll('.opt-choice').forEach((btn) => {
      btn.addEventListener('click', () => {
        const player = Number(btn.getAttribute('data-player'));
        const prop = btn.getAttribute('data-prop');
        const val = btn.getAttribute('data-val');
        selectEquipment(player, prop, val, false);
      });
    });

    document.getElementById('input-name-1').addEventListener('input', (e) => {
      gameState.ships[1].name = e.target.value.trim() || Data.DEFAULT_SHIPS[1].name;
    });
    document.getElementById('input-name-2').addEventListener('input', (e) => {
      gameState.ships[2].name = e.target.value.trim() || Data.DEFAULT_SHIPS[2].name;
    });

    // 4. Botones principales y controles globales
    document.getElementById('btn-start-battle').addEventListener('click', startBattle);
    document.getElementById('btn-sound').addEventListener('click', toggleSound);
    document.getElementById('btn-restart').addEventListener('click', handleRestartClick);
    bindFullscreen();

    document.getElementById('btn-rematch').addEventListener('click', rematchCurrentDuel);
    document.getElementById('btn-to-setup').addEventListener('click', goBackToSetup);
    document.getElementById('btn-reset-duel').addEventListener('click', rematchCurrentDuel);
    document.getElementById('btn-reset-setup').addEventListener('click', goBackToSetup);
    document.getElementById('btn-reset-cancel').addEventListener('click', () => {
      document.getElementById('reset-modal').classList.add('hidden');
    });
  });
})(typeof window !== 'undefined' ? window : globalThis);
