/**
 * motos/js/juego.js
 * Lógica principal de Moto GP Matemático:
 * - 1 a 4 jugadores con personalización de moto y casco pixel-art 16-bit
 * - 6 circuitos de 5, 7 y 10 partes respectivamente
 * - Orden de turnos: Tramo 1 aleatorio (Fisher-Yates), Tramos 2..N por orden de posición
 * - Cronómetro ascendente: el tiempo de respuesta se suma al tiempo total de la vuelta
 * - Integración completa con BancoMatematicas, BancoUI.crearSelector y Pantalla Completa
 */
(function (root) {
  'use strict';

  const Data = root.MotosData;
  const Audio = root.MotosAudio;
  const Pixel = root.MotosPixelArt;

  let selectorEjercicios = null;

  const setupState = {
    playerCount: 2,
    selectedCircuitId: Data.CIRCUITS[0].id,
    filterParts: 'all',
    riders: Data.DEFAULT_RIDERS.map((r) => Object.assign({}, r))
  };

  const raceState = {
    circuit: null,
    racers: [],
    currentPartIndex: 0, // 0 .. parts-1
    roundOrder: [],      // array of racer IDs for current part
    orderMode: 'random', // 'random' | 'position'
    turnIndexInRound: 0,
    phase: 'idle',       // 'idle' | 'ready' | 'answering' | 'feedback' | 'finished'
    currentExercise: null,
    turnStartMs: 0,
    stopwatchTimer: null,
    feedbackUnlockMs: 0
  };

  /* ==========================================================================
   * UTILIDADES DE FORMATO Y TIEMPO
   * ========================================================================== */
  function escapeHtml(text) {
    return String(text || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function formatLapTime(seconds) {
    const safe = Math.max(0, Number(seconds) || 0);
    const mins = Math.floor(safe / 60);
    const secs = Math.floor(safe % 60);
    const hundredths = Math.floor((safe - Math.floor(safe)) * 100);
    const mm = String(mins).padStart(2, '0');
    const ss = String(secs).padStart(2, '0');
    const cc = String(hundredths).padStart(2, '0');
    return `${mm}:${ss}.${cc}`;
  }

  function formatShortSec(seconds) {
    return `${(Math.max(0, Number(seconds) || 0)).toFixed(2)}s`;
  }

  function shuffleArray(arr) {
    const copy = arr.slice();
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const tmp = copy[i];
      copy[i] = copy[j];
      copy[j] = tmp;
    }
    return copy;
  }

  function stopStopwatch() {
    if (raceState.stopwatchTimer) {
      clearInterval(raceState.stopwatchTimer);
      raceState.stopwatchTimer = null;
    }
  }

  function getRacerById(id) {
    return raceState.racers.find((r) => r.id === id);
  }

  function getSortedStandings() {
    return raceState.racers.slice().sort((a, b) => {
      // Si ambos completaron el mismo número de tramos, gana el menor tiempo total.
      // Si están en medio de un tramo, primero se ordena por tiempo acumulado de quienes ya terminaron más tramos
      // o bien por tiempo total directo al cerrar la ronda; para claridad en vivo, ordenamos por:
      // 1) Si alguien completó más tramos y se compara a mitad de ronda, comparar ritmo o tiempo acumulado
      // Al inicio de cada ronda (tramo 2+), todos tienen los mismos completedParts -> orden exacto por totalTime!
      if (a.completedParts !== b.completedParts) {
        return b.completedParts - a.completedParts;
      }
      if (Math.abs(a.totalTime - b.totalTime) > 0.0005) {
        return a.totalTime - b.totalTime;
      }
      if (a.hits !== b.hits) return b.hits - a.hits;
      return a.lastOrderRank - b.lastOrderRank;
    });
  }

  function getPositionOfRacer(racerId) {
    const standings = getSortedStandings();
    const idx = standings.findIndex((r) => r.id === racerId);
    return idx >= 0 ? idx + 1 : 1;
  }

  /* ==========================================================================
   * RESÚMENES DEL BANCO DE EJERCICIOS
   * ========================================================================== */
  function updateConfigSummaries() {
    if (!selectorEjercicios) return;
    const detallado = selectorEjercicios.getResumenDetallado();
    const circuit = Data.getCircuitById(setupState.selectedCircuitId);

    const brandSub = document.getElementById('brand-sub');
    if (brandSub) {
      brandSub.textContent = `${circuit.name} (${circuit.parts} partes) · ${detallado}`;
    }

    const setupSummary = document.getElementById('setup-config-summary');
    if (setupSummary) {
      setupSummary.innerHTML = `Banco activo: <strong>${escapeHtml(detallado)}</strong>`;
    }
  }

  function handleSelectorChange() {
    updateConfigSummaries();
    Audio.play('click');

    // Si el docente cambia de tema mientras hay una pregunta abierta, refrescamos la pregunta y reiniciamos el crono del tramo
    if (raceState.phase === 'answering') {
      launchCurrentTurn(true);
    }
  }

  /* ==========================================================================
   * PANTALLA 1: PADDOCK — CIRCUITOS Y GARAJE DE 1 A 4 PILOTOS
   * ========================================================================== */
  function renderCircuitsGrid() {
    const grid = document.getElementById('circuits-grid');
    if (!grid) return;

    const list = Data.CIRCUITS.filter((c) => {
      if (setupState.filterParts === 'all') return true;
      return c.parts === Number(setupState.filterParts);
    });

    // Asegurar que el circuito seleccionado sea visible o se mantenga
    grid.innerHTML = list.map((c) => {
      const isSelected = c.id === setupState.selectedCircuitId;
      return `
        <button type="button" class="circuit-card ${isSelected ? 'active' : ''}" data-circuit-id="${c.id}">
          <div class="circuit-thumb-wrap">
            <canvas class="pixel-canvas" width="144" height="84" data-preview-circuit="${c.id}"></canvas>
            <span class="circuit-parts-tag parts-${c.parts}">${c.badge}</span>
          </div>
          <div class="circuit-card-name"><span>${c.icon}</span><span>${escapeHtml(c.name)}</span></div>
          <div class="circuit-card-desc">${escapeHtml(c.description)}</div>
        </button>
      `;
    }).join('');

    list.forEach((c) => {
      const canvas = grid.querySelector(`canvas[data-preview-circuit="${c.id}"]`);
      if (canvas) Pixel.drawCircuitPreview(canvas, c);
    });

    grid.querySelectorAll('.circuit-card').forEach((btn) => {
      btn.addEventListener('click', () => {
        Audio.play('click');
        setupState.selectedCircuitId = btn.dataset.circuitId;
        renderCircuitsGrid();
        updateConfigSummaries();
      });
    });
  }

  function renderRidersSetup() {
    const grid = document.getElementById('riders-setup-grid');
    if (!grid) return;

    // Limpiar registros anteriores de previews
    for (let i = 1; i <= 4; i++) {
      Pixel.unregisterBikePreview(`setup-r${i}`);
    }

    const activeList = setupState.riders.slice(0, setupState.playerCount);
    const bikeList = Object.values(Data.BIKE_MODELS);
    const helmetList = Object.values(Data.HELMET_STYLES);

    grid.innerHTML = activeList.map((r) => `
      <div class="rider-setup-card team-${r.id}">
        <div class="rider-card-top">
          <div class="rider-preview-box">
            <span class="rider-tag-badge">J${r.id}</span>
            <div id="setup-bike-preview-${r.id}" style="width:100%;height:100%;"></div>
          </div>
          <div class="rider-name-field">
            <label for="rider-name-${r.id}">Nombre Piloto ${r.id}</label>
            <input id="rider-name-${r.id}" class="rider-name-input" type="text" maxlength="14" value="${escapeHtml(r.name)}" data-rider-id="${r.id}">
          </div>
        </div>

        <div>
          <span class="mini-label">Modelo de Moto</span>
          <div class="opts-row-4">
            ${bikeList.map((b) => `
              <button type="button" class="opt-pill ${r.bike === b.id ? 'active' : ''}" data-rider-id="${r.id}" data-prop="bike" data-val="${b.id}">
                ${escapeHtml(b.label)}
              </button>
            `).join('')}
          </div>
        </div>

        <div>
          <span class="mini-label">Casco Pixel-Art</span>
          <div class="opts-row-4">
            ${helmetList.map((h) => `
              <button type="button" class="opt-pill ${r.helmet === h.id ? 'active' : ''}" data-rider-id="${r.id}" data-prop="helmet" data-val="${h.id}">
                ${escapeHtml(h.label)}
              </button>
            `).join('')}
          </div>
        </div>
      </div>
    `).join('');

    // Registrar previews animados y eventos
    activeList.forEach((r) => {
      const box = document.getElementById(`setup-bike-preview-${r.id}`);
      if (box) Pixel.registerBikePreview(`setup-r${r.id}`, box, r);

      const input = document.getElementById(`rider-name-${r.id}`);
      if (input) {
        input.addEventListener('input', (e) => {
          const val = e.target.value.trim();
          r.name = val || Data.DEFAULT_RIDERS[r.id - 1].name;
        });
      }
    });

    grid.querySelectorAll('.opt-pill').forEach((btn) => {
      btn.addEventListener('click', () => {
        const rid = Number(btn.dataset.riderId);
        const prop = btn.dataset.prop;
        const val = btn.dataset.val;
        const rider = setupState.riders.find((x) => x.id === rid);
        if (!rider) return;

        rider[prop] = val;
        Audio.play(prop === 'bike' ? 'rev' : 'click');

        // Actualizar estado activo de los botones de esa propiedad
        grid.querySelectorAll(`.opt-pill[data-rider-id="${rid}"][data-prop="${prop}"]`).forEach((b) => {
          b.classList.toggle('active', b.dataset.val === val);
        });

        Pixel.updateBikePreview(`setup-r${rid}`, rider);
        if (prop === 'bike') {
          Pixel.setBikePreviewState(`setup-r${rid}`, 'boost', 550);
        }
      });
    });
  }

  function setPlayerCount(count) {
    setupState.playerCount = Math.max(1, Math.min(4, count));
    document.querySelectorAll('#player-count-row .count-btn').forEach((btn) => {
      btn.classList.toggle('active', Number(btn.dataset.count) === setupState.playerCount);
    });
    renderRidersSetup();
  }

  /* ==========================================================================
   * PANTALLA 2: FLUJO DE CARRERA (ORDEN ALEATORIO EN TRAMO 1, POSICIÓN EN 2+)
   * ========================================================================== */
  function computeRoundOrder(partIndex) {
    if (partIndex === 0) {
      // PRIMER TURNO: ORDEN ALEATORIO
      raceState.orderMode = 'random';
      const ids = raceState.racers.map((r) => r.id);
      const shuffled = shuffleArray(ids);
      shuffled.forEach((id, rank) => {
        const r = getRacerById(id);
        if (r) r.lastOrderRank = rank;
      });
      return shuffled;
    }

    // A PARTIR DEL PRIMER TURNO: ORDEN DE POSICIÓN (1.º, 2.º, 3.º, 4.º)
    raceState.orderMode = 'position';
    const sorted = getSortedStandings();
    const order = sorted.map((r, rank) => {
      r.lastOrderRank = rank;
      return r.id;
    });
    return order;
  }

  function startRace() {
    Audio.play('rev');
    stopStopwatch();

    // Sincronizar nombres escritos
    for (let i = 0; i < setupState.playerCount; i++) {
      const input = document.getElementById(`rider-name-${i + 1}`);
      if (input) {
        setupState.riders[i].name = input.value.trim() || Data.DEFAULT_RIDERS[i].name;
      }
    }

    const circuit = Data.getCircuitById(setupState.selectedCircuitId);
    raceState.circuit = circuit;
    raceState.racers = setupState.riders.slice(0, setupState.playerCount).map((r, idx) => ({
      id: r.id,
      name: r.name,
      bike: r.bike,
      helmet: r.helmet,
      totalTime: 0,
      completedParts: 0,
      hits: 0,
      misses: 0,
      penalties: 0,
      sectorTimes: [],
      lastOrderRank: idx
    }));

    raceState.currentPartIndex = 0;
    raceState.roundOrder = computeRoundOrder(0);
    raceState.turnIndexInRound = 0;
    raceState.phase = 'ready';
    raceState.currentExercise = null;

    document.getElementById('setup-screen').classList.add('hidden');
    document.getElementById('race-screen').classList.remove('hidden');
    document.getElementById('podium-overlay').classList.add('hidden');
    document.getElementById('reset-modal').classList.add('hidden');

    Pixel.initRaceStage(
      document.getElementById('track-canvas'),
      document.getElementById('sprint-canvas')
    );
    Pixel.loadCircuit(circuit, raceState.racers);

    updateConfigSummaries();
    prepareReadyGate();
  }

  function getCurrentActiveRacer() {
    const id = raceState.roundOrder[raceState.turnIndexInRound];
    return getRacerById(id) || raceState.racers[0];
  }

  function renderRaceHeaderAndQueue() {
    const circuit = raceState.circuit;
    const partNum = raceState.currentPartIndex + 1;
    const sectorName = circuit.sectorNames[raceState.currentPartIndex] || `Tramo ${partNum}`;

    document.getElementById('race-circuit-pill').textContent = `${circuit.icon} ${circuit.name}`;
    document.getElementById('race-sector-pill').textContent = `Tramo ${partNum} / ${circuit.parts} · ${sectorName}`;
    document.getElementById('track-sector-legend').textContent = `TRAMO ${partNum} / ${circuit.parts} · ${sectorName.toUpperCase()}`;

    const modeBadge = document.getElementById('order-mode-badge');
    if (raceState.racers.length === 1) {
      modeBadge.className = 'order-mode-badge by-pos';
      modeBadge.textContent = '⏱️ Modo Contrarreloj Individual';
    } else if (raceState.orderMode === 'random') {
      modeBadge.className = 'order-mode-badge';
      modeBadge.textContent = '🎲 Tramo 1: Orden Aleatorio';
    } else {
      modeBadge.className = 'order-mode-badge by-pos';
      modeBadge.textContent = `🏆 Tramo ${partNum}: Orden por Posición`;
    }

    const queueEl = document.getElementById('turn-order-queue');
    queueEl.innerHTML = raceState.roundOrder.map((rid, idx) => {
      const r = getRacerById(rid);
      const pal = Data.TEAM_PALETTES[rid];
      const statusClass = idx < raceState.turnIndexInRound
        ? 'done'
        : (idx === raceState.turnIndexInRound ? 'current' : '');
      const prefix = idx < raceState.turnIndexInRound ? '✓' : (idx === raceState.turnIndexInRound ? '▶' : `${idx + 1}.º`);
      return `
        <span class="queue-chip ${statusClass}">
          <span class="q-dot" style="background:${pal.cssMain};"></span>
          <span>${prefix} ${escapeHtml(r.name)}</span>
        </span>
      `;
    }).join('');
  }

  function renderStandingsTable() {
    const listEl = document.getElementById('standings-list');
    if (!listEl) return;

    const active = getCurrentActiveRacer();
    const standings = getSortedStandings();
    const leader = standings[0];
    const totalParts = raceState.circuit.parts;

    listEl.innerHTML = standings.map((r, idx) => {
      const pos = idx + 1;
      const pal = Data.TEAM_PALETTES[r.id];
      const isCurrent = active && r.id === active.id && raceState.phase !== 'finished';
      let gapHtml = '<span class="st-gap leader">LÍDER</span>';
      if (idx > 0) {
        if (r.completedParts === leader.completedParts) {
          const diff = Math.max(0, r.totalTime - leader.totalTime);
          gapHtml = `<span class="st-gap font-mono">+${diff.toFixed(2)}s</span>`;
        } else {
          gapHtml = `<span class="st-gap" style="color:#94a3b8;">En tramo</span>`;
        }
      }

      return `
        <div class="standing-row ${isCurrent ? 'active-rider' : ''}">
          <span class="st-pos pos-${pos}">${pos}.º</span>
          <span class="st-color" style="background:${pal.cssMain};"></span>
          <span class="st-name">${escapeHtml(r.name)}</span>
          <span class="st-parts">${r.completedParts}/${totalParts} tr.</span>
          <span class="st-time font-mono">${formatLapTime(r.totalTime)}</span>
          ${gapHtml}
          <span class="st-acc">✓${r.hits} ✗${r.misses}</span>
        </div>
      `;
    }).join('');
  }

  function updateActiveRiderCard() {
    const racer = getCurrentActiveRacer();
    const pal = Data.TEAM_PALETTES[racer.id];
    const partNum = raceState.currentPartIndex + 1;
    const totalParts = raceState.circuit.parts;

    const card = document.getElementById('stopwatch-card');
    card.style.borderLeftColor = pal.cssMain;

    const posLabel = raceState.currentPartIndex === 0
      ? `SALIDA ${raceState.turnIndexInRound + 1}.º (SORTEO)`
      : `POSICIÓN ACTUAL: ${getPositionOfRacer(racer.id)}.º`;

    document.getElementById('active-turn-kicker').textContent = raceState.racers.length === 1
      ? `CONTRARRELOJ · TRAMO ${partNum}/${totalParts}`
      : `TURNO ACTUAL · ${posLabel}`;
    document.getElementById('active-rider-name').textContent = racer.name;
    document.getElementById('active-rider-sub').textContent =
      `Vuelta acumulada: ${formatLapTime(racer.totalTime)} · Tramo ${partNum}/${totalParts}`;

    Pixel.registerBikePreview('hud-active', document.getElementById('hud-active-bike'), racer);
  }

  function setGantryBulbs(mode) {
    const b1 = document.getElementById('bulb-1');
    const b2 = document.getElementById('bulb-2');
    const b3 = document.getElementById('bulb-3');
    [b1, b2, b3].forEach((b) => {
      b.className = 'gantry-bulb';
      if (mode === 'red') b.classList.add('lit-red');
      else if (mode === 'green') b.classList.add('lit-green');
    });
  }

  function prepareReadyGate() {
    stopStopwatch();
    raceState.phase = 'ready';

    const racer = getCurrentActiveRacer();
    const circuit = raceState.circuit;
    const partNum = raceState.currentPartIndex + 1;
    const sectorName = circuit.sectorNames[raceState.currentPartIndex] || `Tramo ${partNum}`;

    Pixel.setActiveRaceContext(racer.id, raceState.currentPartIndex, 'red');
    renderRaceHeaderAndQueue();
    renderStandingsTable();
    updateActiveRiderCard();

    // Reset cronómetro LED visual
    const led = document.getElementById('led-stopwatch');
    led.textContent = '00:00.00';
    led.className = 'led-time font-mono';
    document.getElementById('led-sub').textContent = 'Listo en parrilla';

    // Mostrar Ready Gate y ocultar vista de ejercicio
    document.getElementById('ready-gate').classList.remove('hidden');
    document.getElementById('exercise-view').classList.add('hidden');
    setGantryBulbs('red');

    document.getElementById('ready-title').textContent = `¡A PISTA, ${racer.name.toUpperCase()}!`;
    document.getElementById('ready-sector-desc').textContent = `Tramo ${partNum} de ${circuit.parts} · ${sectorName}`;

    const noteEl = document.getElementById('ready-order-note');
    if (raceState.racers.length === 1) {
      noteEl.textContent = `⏱️ Tu tiempo al responder esta pregunta se sumará a tu vuelta total (${formatLapTime(racer.totalTime)}).`;
    } else if (raceState.orderMode === 'random') {
      const orderNames = raceState.roundOrder.map((id, i) => `${i + 1}.º ${getRacerById(id).name}`).join(' → ');
      noteEl.textContent = `🎲 Tramo 1 (orden aleatorio): ${orderNames}`;
    } else {
      const orderNames = raceState.roundOrder.map((id, i) => `${i + 1}.º ${getRacerById(id).name}`).join(' → ');
      noteEl.textContent = `🏆 Tramo ${partNum} (orden por posición): ${orderNames}`;
    }
  }

  function launchCurrentTurn(silent) {
    stopStopwatch();
    if (!silent) Audio.play('go');

    const racer = getCurrentActiveRacer();
    raceState.phase = 'answering';
    Pixel.setTrafficLight('green');
    setGantryBulbs('green');

    // Pedir ejercicio al Banco de Ejercicios (4 opciones)
    const ej = selectorEjercicios.solicitarEjercicio();
    raceState.currentExercise = ej;

    renderExerciseUI(ej);

    document.getElementById('ready-gate').classList.add('hidden');
    document.getElementById('exercise-view').classList.remove('hidden');

    // Iniciar cronómetro ascendente de alta precisión
    raceState.turnStartMs = performance.now();
    const led = document.getElementById('led-stopwatch');
    led.className = 'led-time font-mono running';
    document.getElementById('led-sub').textContent = 'Sumando tiempo a la vuelta...';

    raceState.stopwatchTimer = setInterval(() => {
      if (raceState.phase !== 'answering') {
        stopStopwatch();
        return;
      }
      const elapsed = (performance.now() - raceState.turnStartMs) / 1000;
      led.textContent = formatLapTime(elapsed);
    }, 33);

    Pixel.setBikePreviewState('hud-active', 'idle');
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

    document.getElementById('next-turn-bar').classList.add('hidden');

    const grid = document.getElementById('options-grid');
    grid.innerHTML = '';
    const letters = ['A', 'B', 'C', 'D'];

    ej.opciones.forEach((opt, idx) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'ans-btn';
      btn.dataset.idx = String(idx);
      const optStr = String(opt);
      if (optStr.length > 18) btn.classList.add('ans-text-xs');
      else if (optStr.length > 10) btn.classList.add('ans-text-sm');

      btn.innerHTML = `
        <span class="ans-letter">${letters[idx] || idx + 1}</span>
        <span class="ans-value">${escapeHtml(optStr)}</span>
      `;
      btn.addEventListener('click', () => handleAnswer(idx, btn));
      grid.appendChild(btn);
    });
  }

  function handleAnswer(selectedIdx, clickedBtn) {
    if (raceState.phase !== 'answering') return;
    stopStopwatch();
    raceState.phase = 'feedback';
    raceState.feedbackUnlockMs = performance.now() + 450;

    const elapsedSec = Math.max(0.05, (performance.now() - raceState.turnStartMs) / 1000);
    const ej = raceState.currentExercise;
    const racer = getCurrentActiveRacer();
    const parts = raceState.circuit.parts;

    const isCorrect = (
      selectedIdx === ej.indiceCorrecto ||
      String(ej.opciones[selectedIdx]) === String(ej.respuestaCorrecta)
    );

    const penaltySec = isCorrect ? 0 : Data.PENALTY_SECONDS;
    const addedSec = elapsedSec + penaltySec;

    const fromProgress = racer.completedParts / parts;
    racer.completedParts += 1;
    const toProgress = racer.completedParts / parts;
    racer.totalTime += addedSec;

    if (isCorrect) {
      racer.hits += 1;
    } else {
      racer.misses += 1;
      racer.penalties += penaltySec;
    }

    racer.sectorTimes.push({
      part: raceState.currentPartIndex + 1,
      elapsed: elapsedSec,
      penalty: penaltySec,
      total: addedSec,
      correct: isCorrect
    });

    // Bloquear y colorear botones de opciones
    const buttons = document.getElementById('options-grid').querySelectorAll('button');
    buttons.forEach((btn) => {
      btn.disabled = true;
      const idx = Number(btn.dataset.idx);
      const isRight = idx === ej.indiceCorrecto || String(ej.opciones[idx]) === String(ej.respuestaCorrecta);
      if (isRight) {
        btn.classList.add('correct');
      } else if (btn === clickedBtn && !isCorrect) {
        btn.classList.add('wrong');
      } else {
        btn.classList.add('dimmed');
      }
    });

    // Actualizar cronómetro LED con tiempo congelado
    const led = document.getElementById('led-stopwatch');
    led.textContent = formatLapTime(addedSec);
    led.className = `led-time font-mono ${isCorrect ? '' : 'penalty'}`;
    document.getElementById('led-sub').textContent = isCorrect
      ? `+${formatShortSec(elapsedSec)} sumados`
      : `${formatShortSec(elapsedSec)} + ${penaltySec.toFixed(0)}s penalización`;

    // Sonido + animación de moto en el circuito y tira lateral
    Audio.play(isCorrect ? 'boost' : 'skid');
    Pixel.animateRiderSector(racer.id, fromProgress, toProgress, isCorrect, isCorrect ? 1050 : 1250);
    Pixel.setBikePreviewState('hud-active', isCorrect ? 'boost' : 'skid', 1200);

    // Banner de resultado
    const fb = document.getElementById('feedback-bar');
    fb.className = `feedback-banner ${isCorrect ? 'fb-ok' : 'fb-bad'}`;
    const headline = isCorrect
      ? `✅ ¡TRAMO COMPLETADO! +${formatShortSec(elapsedSec)} sumados a la vuelta de ${racer.name} (Total: ${formatLapTime(racer.totalTime)}).`
      : `❌ ¡DERRAPE EN CURVA! Correcta: ${ej.respuestaCorrecta} · Tiempo ${formatShortSec(elapsedSec)} + ${penaltySec.toFixed(2)}s penalización = +${formatShortSec(addedSec)}.`;

    if (ej.explicacion) {
      fb.innerHTML = `${escapeHtml(headline)}<span class="feedback-exp">💡 ${escapeHtml(ej.explicacion)}</span>`;
    } else {
      fb.textContent = headline;
    }

    // Actualizar tabla en vivo y tarjeta del piloto
    renderStandingsTable();
    updateActiveRiderCard();

    // Configurar botón de siguiente turno / podio final
    const isLastTurnOfRace = (
      raceState.currentPartIndex >= parts - 1 &&
      raceState.turnIndexInRound >= raceState.roundOrder.length - 1
    );
    const nextBtn = document.getElementById('btn-next-turn');
    if (isLastTurnOfRace) {
      nextBtn.textContent = '🏁 ¡Ver Podio Final!';
    } else if (raceState.turnIndexInRound + 1 < raceState.roundOrder.length) {
      const nextRacer = getRacerById(raceState.roundOrder[raceState.turnIndexInRound + 1]);
      nextBtn.textContent = `▶ Siguiente: ${nextRacer.name}`;
    } else {
      nextBtn.textContent = `▶ Siguiente Tramo (${raceState.currentPartIndex + 2}/${parts}) · Orden por Posición`;
    }
    document.getElementById('next-turn-bar').classList.remove('hidden');
  }

  function advanceAfterFeedback() {
    if (raceState.phase !== 'feedback') return;
    Audio.play('click');

    // Asegurar que la moto quede exactamente en su marca antes de continuar
    const progressMap = {};
    raceState.racers.forEach((r) => {
      progressMap[r.id] = r.completedParts / raceState.circuit.parts;
    });
    Pixel.snapRidersProgress(progressMap);

    raceState.turnIndexInRound += 1;
    if (raceState.turnIndexInRound < raceState.roundOrder.length) {
      prepareReadyGate();
      return;
    }

    // Todos los pilotos completaron este tramo -> pasar al siguiente tramo
    raceState.currentPartIndex += 1;
    if (raceState.currentPartIndex < raceState.circuit.parts) {
      // A PARTIR DEL PRIMER TURNO: ORDEN DE POSICIÓN
      raceState.roundOrder = computeRoundOrder(raceState.currentPartIndex);
      raceState.turnIndexInRound = 0;
      prepareReadyGate();
      return;
    }

    // Fin de la carrera
    showPodium();
  }

  /* ==========================================================================
   * PODIO FINAL Y RÉCORDS EN LOCALSTORAGE
   * ========================================================================== */
  function getBestRecordKey(circuitId) {
    return `motogp_best_${circuitId}`;
  }

  function checkAndSaveCircuitRecord(circuitId, timeSec) {
    try {
      const key = getBestRecordKey(circuitId);
      const prev = parseFloat(localStorage.getItem(key));
      if (!Number.isFinite(prev) || timeSec < prev) {
        localStorage.setItem(key, String(timeSec));
        return { isNew: true, best: timeSec };
      }
      return { isNew: false, best: prev };
    } catch (_) {
      return { isNew: false, best: timeSec };
    }
  }

  function showPodium() {
    stopStopwatch();
    raceState.phase = 'finished';
    Audio.play('victory');

    const circuit = raceState.circuit;
    const standings = getSortedStandings();
    const winner = standings[0];
    const rec = checkAndSaveCircuitRecord(circuit.id, winner.totalTime);

    document.getElementById('podium-title').textContent = standings.length === 1
      ? `¡META ALCANZADA, ${winner.name.toUpperCase()}!`
      : `¡VICTORIA PARA ${winner.name.toUpperCase()}!`;
    document.getElementById('podium-subtitle').textContent =
      `${circuit.icon} ${circuit.name} (${circuit.parts} partes) · Mejor vuelta histórica: ${formatLapTime(rec.best)}`;

    document.getElementById('winner-name-big').textContent = winner.name;
    document.getElementById('winner-time-big').textContent = formatLapTime(winner.totalTime);

    const medalEl = document.getElementById('winner-medal-badge');
    if (standings.length === 1) {
      const avgPerPart = winner.totalTime / circuit.parts;
      let medal = '🥉 Medalla de Bronce';
      if (avgPerPart <= circuit.goldTargetPerPart && winner.misses === 0) {
        medal = '🥇 Medalla de Oro · Vuelta Perfecta';
      } else if (avgPerPart <= circuit.goldTargetPerPart) {
        medal = '🥇 Medalla de Oro';
      } else if (avgPerPart <= circuit.silverTargetPerPart) {
        medal = '🥈 Medalla de Plata';
      }
      medalEl.textContent = rec.isNew ? `${medal} · ⭐ ¡Nuevo Récord!` : medal;
    } else {
      medalEl.textContent = rec.isNew
        ? '🏆 Campeón del GP · ⭐ ¡Nuevo Récord del Circuito!'
        : '🏆 Campeón del Gran Premio';
    }

    Pixel.registerBikePreview('podium-winner', document.getElementById('winner-bike-box'), winner, { state: 'victory' });

    const medals = ['🥇', '🥈', '🥉', '4.º'];
    const tbody = document.getElementById('podium-tbody');
    tbody.innerHTML = standings.map((r, idx) => {
      const pal = Data.TEAM_PALETTES[r.id];
      const diff = idx === 0 ? 'GANADOR' : `+${(r.totalTime - winner.totalTime).toFixed(2)}s`;
      const bestSector = r.sectorTimes.reduce((min, s) => Math.min(min, s.total), Infinity);
      return `
        <tr class="${idx === 0 ? 'is-winner' : ''}">
          <td>${medals[idx] || `${idx + 1}.º`}</td>
          <td>
            <span style="display:inline-block;width:10px;height:10px;border-radius:2px;background:${pal.cssMain};margin-right:6px;"></span>
            ${escapeHtml(r.name)}
          </td>
          <td class="font-mono" style="color:#4ade80;">${formatLapTime(r.totalTime)}</td>
          <td class="font-mono" style="color:${idx === 0 ? '#facc15' : '#fb923c'};">${diff}</td>
          <td class="font-mono">${Number.isFinite(bestSector) ? formatShortSec(bestSector) : '—'}</td>
          <td>✓ ${r.hits} / ✗ ${r.misses}</td>
        </tr>
      `;
    }).join('');

    renderStandingsTable();
    document.getElementById('podium-overlay').classList.remove('hidden');
  }

  /* ==========================================================================
   * CONTROLES GLOBALES: SONIDO, PANTALLA COMPLETA, REINICIO Y TECLADO
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
      if (fsIcon) fsIcon.textContent = isFs ? '🗗' : '⛶';
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

  function goBackToSetup() {
    Audio.play('click');
    stopStopwatch();
    raceState.phase = 'idle';
    Pixel.unregisterBikePreview('hud-active');
    Pixel.unregisterBikePreview('podium-winner');

    document.getElementById('race-screen').classList.add('hidden');
    document.getElementById('podium-overlay').classList.add('hidden');
    document.getElementById('reset-modal').classList.add('hidden');
    document.getElementById('setup-screen').classList.remove('hidden');

    renderRidersSetup();
  }

  function handleRestartClick() {
    Audio.play('click');
    const isSetup = !document.getElementById('setup-screen').classList.contains('hidden');
    if (isSetup) {
      setupState.playerCount = 2;
      setupState.selectedCircuitId = Data.CIRCUITS[0].id;
      setupState.filterParts = 'all';
      setupState.riders = Data.DEFAULT_RIDERS.map((r) => Object.assign({}, r));
      document.querySelectorAll('#circuit-filter-tabs .filter-tab').forEach((t) => {
        t.classList.toggle('active', t.dataset.parts === 'all');
      });
      setPlayerCount(2);
      renderCircuitsGrid();
      updateConfigSummaries();
    } else {
      document.getElementById('reset-modal').classList.remove('hidden');
    }
  }

  function handleKeyShortcuts(e) {
    // No interferir si se está escribiendo un nombre o si el modal del Banco está abierto
    const tag = (e.target && e.target.tagName) ? e.target.tagName.toLowerCase() : '';
    if (tag === 'input' || tag === 'textarea') return;
    if (document.querySelector('.bm-modal-backdrop:not([hidden])')) return;

    const resetModal = document.getElementById('reset-modal');
    if (resetModal && !resetModal.classList.contains('hidden')) return;

    if (raceState.phase === 'ready' && (e.code === 'Space' || e.code === 'Enter')) {
      e.preventDefault();
      launchCurrentTurn(false);
    } else if (raceState.phase === 'answering') {
      const keyMap = { '1': 0, '2': 1, '3': 2, '4': 3, 'a': 0, 'b': 1, 'c': 2, 'd': 3 };
      const idx = keyMap[e.key.toLowerCase()];
      if (idx !== undefined) {
        const btn = document.querySelector(`#options-grid .ans-btn[data-idx="${idx}"]`);
        if (btn && !btn.disabled) {
          e.preventDefault();
          handleAnswer(idx, btn);
        }
      }
    } else if (raceState.phase === 'feedback' && (e.code === 'Space' || e.code === 'Enter')) {
      if (performance.now() >= raceState.feedbackUnlockMs) {
        e.preventDefault();
        advanceAfterFeedback();
      }
    }
  }

  /* ==========================================================================
   * INICIALIZACIÓN TRAS DOMContentLoaded
   * ========================================================================== */
  document.addEventListener('DOMContentLoaded', () => {
    // 1. Conectar Selector de Ejercicios compartido
    selectorEjercicios = root.BancoUI.crearSelector({
      gameId: 'motos',
      defaultTemas: ['enteros'],
      defaultNivel: '1eso',
      defaultTipo: 'operacion',
      onChange: handleSelectorChange
    });

    selectorEjercicios.bindButton(document.getElementById('btn-selector-ejercicios'));
    selectorEjercicios.bindButton(document.getElementById('btn-selector-setup'));
    updateConfigSummaries();

    // 2. Renderizar Paddock inicial (circuitos y garaje)
    renderCircuitsGrid();
    renderRidersSetup();

    // 3. Eventos de configuración
    document.querySelectorAll('#player-count-row .count-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        Audio.play('click');
        setPlayerCount(Number(btn.dataset.count));
      });
    });

    document.querySelectorAll('#circuit-filter-tabs .filter-tab').forEach((tab) => {
      tab.addEventListener('click', () => {
        Audio.play('click');
        setupState.filterParts = tab.dataset.parts;
        document.querySelectorAll('#circuit-filter-tabs .filter-tab').forEach((t) => {
          t.classList.toggle('active', t === tab);
        });
        // Si el circuito seleccionado no pertenece al filtro, seleccionar el primero del filtro
        if (setupState.filterParts !== 'all') {
          const match = Data.CIRCUITS.find((c) => c.parts === Number(setupState.filterParts));
          const current = Data.getCircuitById(setupState.selectedCircuitId);
          if (match && current.parts !== Number(setupState.filterParts)) {
            setupState.selectedCircuitId = match.id;
          }
        }
        renderCircuitsGrid();
        updateConfigSummaries();
      });
    });

    // 4. Botones principales y carrera
    document.getElementById('btn-start-race').addEventListener('click', startRace);
    document.getElementById('btn-launch-turn').addEventListener('click', () => launchCurrentTurn(false));
    document.getElementById('btn-next-turn').addEventListener('click', advanceAfterFeedback);

    // 5. Controles de barra superior y modales
    document.getElementById('btn-sound').addEventListener('click', toggleSound);
    document.getElementById('btn-restart').addEventListener('click', handleRestartClick);
    bindFullscreen();

    document.getElementById('btn-rematch').addEventListener('click', startRace);
    document.getElementById('btn-to-setup').addEventListener('click', goBackToSetup);
    document.getElementById('btn-reset-race').addEventListener('click', startRace);
    document.getElementById('btn-reset-setup').addEventListener('click', goBackToSetup);
    document.getElementById('btn-reset-cancel').addEventListener('click', () => {
      document.getElementById('reset-modal').classList.add('hidden');
    });

    document.addEventListener('keydown', handleKeyShortcuts);
  });
})(typeof window !== 'undefined' ? window : globalThis);
