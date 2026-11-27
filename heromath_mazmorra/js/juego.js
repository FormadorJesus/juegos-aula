/**
 * js/juego.js
 * Motor principal de HeroMath: La Mazmorra de los Enteros
 * - Personalización de 2 a 4 equipos
 * - Movimiento ortogonal con dado (1-6) y Zona de Control estricta
 * - Popup de Duelo (10 s, 4 opciones, solo aritmética de enteros, botón Iniciar)
 * - Popup de Puertas y Cofres (20 s, problema sencillo, teclado táctil, botón Iniciar)
 * - Turno automático de enemigos (BFS 1 casilla + ataque con esquiva matemática)
 */
window.HeroMath = window.HeroMath || {};

(function() {
  const HM = window.HeroMath;
  const DIRS = [[-1, 0], [1, 0], [0, -1], [0, 1]];

  const state = {
    numEquipos: 3,
    tamanoMapa: 'mediano',
    ejerciciosConfig: { temas: ['enteros'], nivel: '1eso', tipo: 'mixto' },
    equiposConfig: [],
    jugadores: [],
    mapa: null,
    turnoIdx: 0,
    ronda: 1,
    fase: 'setup', // 'setup' | 'roll' | 'move' | 'modal' | 'enemyTurn' | 'gameover'
    stepsLeft: 0,
    lastDice: null,
    timerId: null
  };

  let bancoSelector = null;

  // --- Inicialización de configuración por defecto ---
  function initConfig() {
    const nombres = ['Los Dragones', 'Magos del Norte', 'Halcones', 'Centinelas'];
    const clases = ['guerrero', 'mago', 'ladron', 'arquero'];
    state.equiposConfig = [];
    for (let i = 0; i < 4; i++) {
      state.equiposConfig.push({
        nombre: nombres[i],
        clase: clases[i],
        colorIdx: i,
        emblemaIdx: i
      });
    }
  }

  // --- Utilidades DOM ---
  const $ = id => document.getElementById(id);
  const sleep = ms => new Promise(res => setTimeout(res, ms));

  function getEjercicioConfig() {
    return bancoSelector ? bancoSelector.getConfig() : state.ejerciciosConfig;
  }

  function paintSprites() {
    if (HM.PixelArt && typeof HM.PixelArt.paintAll === 'function') {
      HM.PixelArt.paintAll();
    }
  }

  function actualizarResumenEjercicios() {
    const sub = $('setup-subtitle');
    if (!sub) return;
    if (bancoSelector) {
      sub.textContent = `Aventura RPG 16-bit estilo HeroQuest · Activo: ${bancoSelector.getResumenDetallado()}`;
    } else {
      sub.textContent = 'Aventura RPG 16-bit estilo HeroQuest · 1.º ESO – 2.º Bachillerato · Pizarra digital';
    }
  }

  function getOptionSizeClass(opciones) {
    const maxLen = Math.max(0, ...(opciones || []).map(o => String(o).length));
    if (maxLen <= 8) return 'opt-len-sm';
    if (maxLen <= 18) return 'opt-len-md';
    if (maxLen <= 30) return 'opt-len-lg';
    return 'opt-len-xl';
  }

  function renderOpcionesBotones(optsBox, pregunta, onChoose) {
    optsBox.innerHTML = '';
    const sizeCls = getOptionSizeClass(pregunta.opciones);
    pregunta.opciones.forEach((val, idx) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `duel-opt-btn ${sizeCls}`;
      btn.dataset.idx = String(idx);
      btn.textContent = String(val);
      btn.onclick = () => {
        const ok = idx === pregunta.indiceCorrecto || String(val) === String(pregunta.respuestaCorrecta);
        if (!ok) btn.classList.add('opt-wrong');
        onChoose(ok);
      };
      optsBox.appendChild(btn);
    });
  }

  function marcarOpcionCorrecta(optsBox, pregunta) {
    optsBox.querySelectorAll('.duel-opt-btn').forEach(b => {
      b.disabled = true;
      const idx = Number(b.dataset.idx);
      if (idx === pregunta.indiceCorrecto || b.textContent === String(pregunta.respuestaCorrecta)) {
        b.classList.add('opt-correct');
      }
    });
  }

  function aplicarTamanoEnunciado(el, texto) {
    el.classList.remove('op-text-medium', 'op-text-long');
    const len = String(texto || '').length;
    if (len > 48) el.classList.add('op-text-long');
    else if (len > 22) el.classList.add('op-text-medium');
  }

  function logMsg(html) {
    const log = $('battle-log');
    if (!log) return;
    const item = document.createElement('div');
    item.className = 'log-entry';
    item.innerHTML = html;
    log.prepend(item);
    while (log.children.length > 18) log.removeChild(log.lastChild);
  }

  function showFloatText(r, c, text, color = '#f1c40f') {
    const cellEl = document.querySelector(`.cell[data-r="${r}"][data-c="${c}"]`);
    if (!cellEl) return;
    const fx = document.createElement('div');
    fx.className = 'float-text';
    fx.style.color = color;
    fx.textContent = text;
    cellEl.appendChild(fx);
    setTimeout(() => fx.remove(), 1200);
  }

  // ================= PANTALLA DE SETUP =================
  function renderSetup() {
    document.querySelectorAll('.team-count-btn').forEach(btn => {
      btn.classList.toggle('active', Number(btn.dataset.count) === state.numEquipos);
    });
    document.querySelectorAll('.map-size-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.size === state.tamanoMapa);
    });

    const container = $('teams-setup-grid');
    container.innerHTML = '';

    for (let i = 0; i < state.numEquipos; i++) {
      const cfg = state.equiposConfig[i];
      const col = HM.COLORES[cfg.colorIdx];
      const card = document.createElement('div');
      card.className = 'team-setup-card';
      card.style.borderColor = col.hex;

      card.innerHTML = `
        <div class="setup-card-header" style="background:${col.oscuro}">
          <span>Equipo ${i + 1}</span>
          <span class="setup-emblem-preview">${HM.EMBLEMAS[cfg.emblemaIdx]}</span>
        </div>
        <div class="setup-avatar-box">
          ${HM.getHeroSVG(cfg.clase, col.hex, col.oscuro, { phase: i })}
        </div>
        <input type="text" class="team-name-input" data-idx="${i}" value="${cfg.nombre}" maxlength="18" placeholder="Nombre del equipo"/>
        <div class="setup-label">Clase</div>
        <div class="clase-grid">
          ${HM.CLASES.map(cl => `
            <button type="button" class="mini-btn clase-pick ${cfg.clase === cl.id ? 'active' : ''}" data-idx="${i}" data-clase="${cl.id}">
              ${cl.nombre}
            </button>
          `).join('')}
        </div>
        <div class="setup-label">Color de armadura</div>
        <div class="color-row">
          ${HM.COLORES.map((cObj, cIdx) => `
            <button type="button" class="color-dot ${cfg.colorIdx === cIdx ? 'active' : ''}" data-idx="${i}" data-cidx="${cIdx}" style="background:${cObj.hex}" title="${cObj.nombre}"></button>
          `).join('')}
        </div>
        <div class="setup-label">Emblema</div>
        <div class="emblem-row">
          ${HM.EMBLEMAS.map((emb, eIdx) => `
            <button type="button" class="emblem-btn ${cfg.emblemaIdx === eIdx ? 'active' : ''}" data-idx="${i}" data-eidx="${eIdx}">${emb}</button>
          `).join('')}
        </div>
      `;
      container.appendChild(card);
    }

    container.querySelectorAll('.team-name-input').forEach(inp => {
      inp.addEventListener('input', e => {
        state.equiposConfig[Number(e.target.dataset.idx)].nombre = e.target.value;
      });
    });
    container.querySelectorAll('.clase-pick').forEach(btn => {
      btn.addEventListener('click', e => {
        const idx = Number(e.currentTarget.dataset.idx);
        state.equiposConfig[idx].clase = e.currentTarget.dataset.clase;
        renderSetup();
      });
    });
    container.querySelectorAll('.color-dot').forEach(btn => {
      btn.addEventListener('click', e => {
        const idx = Number(e.currentTarget.dataset.idx);
        state.equiposConfig[idx].colorIdx = Number(e.currentTarget.dataset.cidx);
        renderSetup();
      });
    });
    container.querySelectorAll('.emblem-btn').forEach(btn => {
      btn.addEventListener('click', e => {
        const idx = Number(e.currentTarget.dataset.idx);
        state.equiposConfig[idx].emblemaIdx = Number(e.currentTarget.dataset.eidx);
        renderSetup();
      });
    });

    paintSprites();
  }

  // ================= INICIO DE PARTIDA =================
  function iniciarPartida() {
    state.mapa = HM.Tablero.generar(state.tamanoMapa);
    state.jugadores = [];
    for (let i = 0; i < state.numEquipos; i++) {
      const cfg = state.equiposConfig[i];
      const col = HM.COLORES[cfg.colorIdx];
      state.jugadores.push({
        id: i,
        nombre: (cfg.nombre || `Equipo ${i + 1}`).trim(),
        clase: cfg.clase,
        color: col.hex,
        colorOscuro: col.oscuro,
        emblema: HM.EMBLEMAS[cfg.emblemaIdx],
        hp: 100,
        maxHp: 100,
        oro: 0,
        escudo: false,
        aciertos: 0,
        errores: 0,
        enemigosVencidos: 0,
        alive: true,
        r: state.mapa.startPos.r,
        c: state.mapa.startPos.c
      });
    }

    state.turnoIdx = 0;
    state.ronda = 1;
    state.fase = 'roll';
    state.stepsLeft = 0;
    state.lastDice = null;

    $('setup-screen').classList.add('hidden');
    $('game-screen').classList.remove('hidden');
    $('end-modal').classList.add('hidden');
    $('battle-log').innerHTML = '';

    logMsg(`🏰 <b>¡Comienza la expedición!</b> Encuentra el Gran Cofre Real en la cámara oculta.`);
    renderAll();
  }

  // ================= UTILIDADES DE TABLERO Y REGLAS =================
  function getCurrentPlayer() {
    return state.jugadores[state.turnoIdx];
  }

  function getEnemyById(uid) {
    return state.mapa.enemies.find(e => e.uid === uid && e.alive) || null;
  }

  function getEnemyAt(r, c) {
    const cell = state.mapa.grid[r]?.[c];
    if (!cell || !cell.enemyId) return null;
    return getEnemyById(cell.enemyId);
  }

  function isCellRevealed(r, c) {
    const cell = state.mapa.grid[r]?.[c];
    return !!(cell && cell.revealed);
  }

  function getAdjacentEnemies(r, c) {
    const found = [];
    for (const [dr, dc] of DIRS) {
      const nr = r + dr, nc = c + dc;
      if (nr < 0 || nr >= state.mapa.rows || nc < 0 || nc >= state.mapa.cols) continue;
      if (!isCellRevealed(nr, nc)) continue;
      const en = getEnemyAt(nr, nc);
      if (en) found.push(en);
    }
    return found;
  }

  function isInZoneOfControl(r, c) {
    return getAdjacentEnemies(r, c).length > 0;
  }

  function getAdjacentClosedDoors(r, c) {
    const found = [];
    for (const [dr, dc] of DIRS) {
      const nr = r + dr, nc = c + dc;
      const cell = state.mapa.grid[nr]?.[nc];
      if (cell && cell.type === 'door' && !cell.doorOpen) found.push(cell);
    }
    return found;
  }

  function getAdjacentChests(r, c) {
    const found = [];
    for (const [dr, dc] of DIRS) {
      const nr = r + dr, nc = c + dc;
      const cell = state.mapa.grid[nr]?.[nc];
      if (cell && cell.revealed && cell.chest && !cell.chest.opened) found.push(cell);
    }
    return found;
  }

  function canStepInto(r, c) {
    const cell = state.mapa.grid[r]?.[c];
    if (!cell) return false;
    if (cell.type === 'wall') return false;
    if (cell.type === 'door' && !cell.doorOpen) return false;
    if (!cell.revealed) return false;
    if (getEnemyAt(r, c)) return false;
    return true;
  }

  // ================= RENDERIZADO DEL TABLERO Y HUD =================
  function renderAll() {
    renderSidebar();
    renderBoard();
    renderControls();
  }

  function renderSidebar() {
    const p = getCurrentPlayer();
    $('round-badge').textContent = `Ronda ${state.ronda}`;
    $('active-turn-banner').innerHTML = p && p.alive
      ? `<span class="turn-dot" style="background:${p.color}"></span> Turno de <b>${p.emblema} ${p.nombre}</b>`
      : 'Turno de los Enemigos';

    const list = $('players-list');
    list.innerHTML = state.jugadores.map((j, idx) => {
      const active = idx === state.turnoIdx && state.fase !== 'enemyTurn' && j.alive;
      const hpPct = Math.max(0, Math.round((j.hp / j.maxHp) * 100));
      const hpColor = hpPct > 50 ? '#2ecc71' : (hpPct > 25 ? '#f39c12' : '#e74c3c');
      return `
        <div class="player-card ${active ? 'active-turn' : ''} ${!j.alive ? 'dead-player' : ''}" style="border-left-color:${j.color}">
          <div class="pc-avatar">${HM.getHeroSVG(j.clase, j.color, j.colorOscuro, { phase: idx })}</div>
          <div class="pc-info">
            <div class="pc-top">
              <span class="pc-name">${j.emblema} ${j.nombre}</span>
              <span class="pc-gold">🪙 ${j.oro}</span>
            </div>
            <div class="hp-bar-bg">
              <div class="hp-bar-fill" style="width:${hpPct}%; background:${hpColor}"></div>
              <span class="hp-text">${j.alive ? `❤️ ${j.hp}/${j.maxHp}` : '💀 ELIMINADO'}</span>
            </div>
            <div class="pc-tags">
              ${j.escudo ? '<span class="tag-shield">🛡️ Escudo</span>' : ''}
              <span class="tag-stat">✅ ${j.aciertos}</span>
              <span class="tag-stat">⚔️ ${j.enemigosVencidos}</span>
            </div>
          </div>
        </div>
      `;
    }).join('');
    paintSprites();
  }

  function renderControls() {
    const p = getCurrentPlayer();
    const rollBtn = $('btn-roll-dice');
    const endBtn = $('btn-end-turn');
    const diceVal = $('dice-value');
    const stepsBadge = $('steps-badge');
    const dpadBtns = document.querySelectorAll('.dpad-btn');

    diceVal.textContent = state.lastDice ?? '🎲';
    stepsBadge.textContent = state.fase === 'move' ? `Pasos: ${state.stepsLeft}` : (state.fase === 'enemyTurn' ? 'Enemigos...' : 'Tira el dado');

    rollBtn.disabled = state.fase !== 'roll';
    endBtn.disabled = state.fase !== 'move';

    const canMove = state.fase === 'move' && state.stepsLeft > 0;
    dpadBtns.forEach(b => b.disabled = !canMove);

    // Acción rápida contextual si el jugador está junto a enemigo, puerta o cofre
    const quickBox = $('quick-actions');
    quickBox.innerHTML = '';
    if (p && p.alive && (state.fase === 'move' || state.fase === 'roll')) {
      const adjEnemies = getAdjacentEnemies(p.r, p.c);
      if (adjEnemies.length > 0 && state.fase === 'move') {
        adjEnemies.forEach(en => {
          const btn = document.createElement('button');
          btn.className = 'btn-action-danger';
          btn.innerHTML = `⚔️ Combatir: ${en.nombre}`;
          btn.onclick = () => iniciarCombateJugador(p, en);
          quickBox.appendChild(btn);
        });
      }
      if (state.fase === 'move') {
        const adjDoors = getAdjacentClosedDoors(p.r, p.c);
        adjDoors.forEach(dCell => {
          const btn = document.createElement('button');
          btn.className = 'btn-action-amber';
          btn.innerHTML = `🚪 Abrir Puerta (20s)`;
          btn.onclick = () => intentarAbrirPuerta(p, dCell);
          quickBox.appendChild(btn);
        });
        const adjChests = getAdjacentChests(p.r, p.c);
        adjChests.forEach(cCell => {
          const btn = document.createElement('button');
          btn.className = 'btn-action-gold';
          btn.innerHTML = cCell.chest.isGrand ? `👑 Abrir Gran Cofre (20s)` : `🧰 Abrir Cofre (20s)`;
          btn.onclick = () => intentarAbrirCofre(p, cCell);
          quickBox.appendChild(btn);
        });
      }
    }
  }

  function renderBoard() {
    const boardEl = $('dungeon-board');
    const { cols, rows, grid } = state.mapa;
    boardEl.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
    boardEl.style.gridTemplateRows = `repeat(${rows}, 1fr)`;
    boardEl.innerHTML = '';

    const activeP = getCurrentPlayer();
    const isMovePhase = state.fase === 'move' && activeP && activeP.alive;
    const activeAdjEnemies = isMovePhase ? getAdjacentEnemies(activeP.r, activeP.c) : [];
    const PA = HM.PixelArt;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const cell = grid[r][c];
        const el = document.createElement('div');
        el.className = `cell cell-${cell.type}`;
        el.dataset.r = r;
        el.dataset.c = c;

        // Antorchas parpadeantes en muros seleccionados
        if (cell.type === 'wall' && cell.hasTorch && PA) {
          el.classList.add('wall-torch-cell');
          el.innerHTML = `<div class="prop-sprite torch-prop">${PA.createPropCanvasHTML('torch', { phase: (r + c) % 4 })}</div>`;
          boardEl.appendChild(el);
          continue;
        }

        if (cell.type === 'room' && !cell.revealed) {
          el.classList.add('cell-fog');
          el.innerHTML = '<span class="fog-icon">?</span>';
          boardEl.appendChild(el);
          continue;
        }

        if (cell.type === 'door') {
          el.classList.add(cell.doorOpen ? 'door-open' : 'door-closed');
          if (PA) {
            el.innerHTML = `<div class="prop-sprite door-prop">${PA.createPropCanvasHTML(cell.doorOpen ? 'door_open' : 'door', { phase: (r + c) % 4 })}</div>`;
          } else if (!cell.doorOpen) {
            el.innerHTML = '<span class="door-icon">🚪</span>';
          }
        }

        if (cell.start) {
          el.innerHTML += PA
            ? `<div class="start-stairs-prop" title="Entrada de la Mazmorra">${PA.createPropCanvasHTML('stairs')}</div>`
            : '<span class="start-badge" title="Entrada">🪜</span>';
        }

        // Zona de control visual alrededor de enemigos vivos revelados
        if (cell.type !== 'wall' && cell.revealed && !getEnemyAt(r, c) && isInZoneOfControl(r, c)) {
          el.classList.add('zoc-cell');
        }

        // Cofre revelado
        if (cell.revealed && cell.chest) {
          if (cell.chest.opened) {
            el.innerHTML += PA
              ? `<div class="prop-sprite chest-opened-prop" title="Cofre abierto">${PA.createPropCanvasHTML('chest_open')}</div>`
              : '<span class="chest-opened-icon" title="Cofre abierto">📭</span>';
          } else {
            const propId = cell.chest.isGrand ? 'grand_chest' : 'chest';
            el.innerHTML += PA
              ? `<div class="prop-sprite chest-prop ${cell.chest.isGrand ? 'grand-chest-prop' : ''}" title="${cell.chest.isGrand ? 'Gran Cofre Real' : 'Cofre de Tesoro'}">${PA.createPropCanvasHTML(propId, { phase: (r + c) % 4 })}</div>`
              : `<span class="chest-icon ${cell.chest.isGrand ? 'grand-chest' : ''}" title="${cell.chest.isGrand ? 'Gran Cofre Real' : 'Cofre de Tesoro'}">${cell.chest.isGrand ? '👑' : '🧰'}</span>`;
          }
        }

        // Enemigo vivo revelado
        const enemy = cell.revealed ? getEnemyAt(r, c) : null;
        if (enemy) {
          const hpPct = Math.round((enemy.hp / enemy.maxHp) * 100);
          el.innerHTML += `
            <div class="enemy-token ${enemy.esJefe ? 'boss-token' : ''}" title="${enemy.nombre} (${enemy.hp}/${enemy.maxHp} HP)">
              ${HM.getEnemySVG(enemy.templateId, { phase: enemy.uid % 4 })}
              <div class="mini-hp"><div class="mini-hp-fill enemy-hp" style="width:${hpPct}%"></div></div>
            </div>
          `;
        }

        // Jugadores en esta casilla
        const playersHere = state.jugadores.filter(j => j.r === r && j.c === c);
        if (playersHere.length > 0) {
          const wrap = document.createElement('div');
          wrap.className = `tokens-wrap count-${playersHere.length}`;
          playersHere.forEach(j => {
            const tok = document.createElement('div');
            tok.className = `hero-token ${j.id === state.turnoIdx && state.fase !== 'enemyTurn' ? 'current-hero' : ''} ${!j.alive ? 'dead-token' : ''}`;
            tok.style.borderColor = j.color;
            tok.innerHTML = j.alive
              ? `${HM.getHeroSVG(j.clase, j.color, j.colorOscuro, { phase: j.id })}<span class="tok-emblem">${j.emblema}</span>`
              : (PA ? PA.createPropCanvasHTML('tomb') : '<span class="tomb-icon">🪦</span>');
            wrap.appendChild(tok);
          });
          el.appendChild(wrap);
        }

        // Interacción táctil si estamos en fase de movimiento
        if (isMovePhase) {
          const dist = Math.abs(r - activeP.r) + Math.abs(c - activeP.c);
          if (dist === 1) {
            if (enemy) {
              el.classList.add('interact-enemy');
              el.onclick = () => iniciarCombateJugador(activeP, enemy);
            } else if (cell.type === 'door' && !cell.doorOpen) {
              el.classList.add('interact-door');
              el.onclick = () => intentarAbrirPuerta(activeP, cell);
            } else if (cell.revealed && cell.chest && !cell.chest.opened) {
              el.classList.add('interact-chest');
              el.onclick = () => intentarAbrirCofre(activeP, cell);
            } else if (state.stepsLeft > 0 && canStepInto(r, c)) {
              // Regla estricta de Zona de Control: si ya estás adyacente a un enemigo vivo, no puedes pasar de largo sin combatir
              if (activeAdjEnemies.length === 0) {
                el.classList.add('step-reachable');
                el.onclick = () => moverJugadorUnPaso(r, c);
              }
            }
          }
        }

        boardEl.appendChild(el);
      }
    }

    paintSprites();
  }

  // ================= ACCIONES DE TURNO DEL JUGADOR =================
  function tirarDado() {
    if (state.fase !== 'roll') return;
    const p = getCurrentPlayer();
    HM.Audio.dice();
    const val = Math.floor(Math.random() * 6) + 1;
    state.lastDice = val;
    state.stepsLeft = val;
    state.fase = 'move';
    logMsg(`🎲 <b>${p.nombre}</b> saca un <b>${val}</b>.`);

    // Si el jugador empieza el turno ya pegado a un enemigo vivo, avisar que debe combatir
    const adj = getAdjacentEnemies(p.r, p.c);
    if (adj.length > 0) {
      logMsg(`⚔️ <b>${p.nombre}</b> está en zona de combate con <b>${adj[0].nombre}</b>: ¡debe luchar antes de avanzar!`);
    }
    renderAll();
  }

  function moverDireccion(dr, dc) {
    if (state.fase !== 'move' || state.stepsLeft <= 0) return;
    const p = getCurrentPlayer();
    const nr = p.r + dr, nc = p.c + dc;
    const cell = state.mapa.grid[nr]?.[nc];
    if (!cell) return;

    const enemy = cell.revealed ? getEnemyAt(nr, nc) : null;
    if (enemy) {
      iniciarCombateJugador(p, enemy);
      return;
    }
    if (cell.type === 'door' && !cell.doorOpen) {
      intentarAbrirPuerta(p, cell);
      return;
    }
    if (cell.revealed && cell.chest && !cell.chest.opened) {
      intentarAbrirCofre(p, cell);
      return;
    }
    if (getAdjacentEnemies(p.r, p.c).length > 0) {
      showFloatText(p.r, p.c, '⚔️ ¡Combate primero!', '#e74c3c');
      return;
    }
    if (canStepInto(nr, nc)) {
      moverJugadorUnPaso(nr, nc);
    }
  }

  function moverJugadorUnPaso(nr, nc) {
    const p = getCurrentPlayer();
    if (state.fase !== 'move' || state.stepsLeft <= 0) return;
    if (getAdjacentEnemies(p.r, p.c).length > 0) {
      showFloatText(p.r, p.c, '⚔️ ¡Combate obligatorio!', '#e74c3c');
      return;
    }

    p.r = nr;
    p.c = nc;
    state.stepsLeft--;
    HM.Audio.step();

    // Comprobar si entró en Zona de Control de un enemigo vivo -> combate obligatorio inmediato
    const adjEnemies = getAdjacentEnemies(p.r, p.c);
    if (adjEnemies.length > 0) {
      state.stepsLeft = 0;
      renderAll();
      logMsg(`⚔️ <b>${p.nombre}</b> se topa con <b>${adjEnemies[0].nombre}</b> ¡Empieza el combate!`);
      setTimeout(() => iniciarCombateJugador(p, adjEnemies[0]), 260);
      return;
    }

    // Comprobar si pisó un cofre sin abrir
    const cell = state.mapa.grid[nr][nc];
    if (cell.chest && !cell.chest.opened) {
      renderAll();
      setTimeout(() => intentarAbrirCofre(p, cell), 200);
      return;
    }

    renderAll();
    if (state.stepsLeft === 0) {
      // Si no tiene puertas ni cofres adyacentes, termina automáticamente tras breve pausa
      if (getAdjacentClosedDoors(p.r, p.c).length === 0 && getAdjacentChests(p.r, p.c).length === 0) {
        setTimeout(() => terminarTurnoJugador(), 420);
      }
    }
  }

  function terminarTurnoJugador() {
    if (state.fase === 'gameover') return;
    state.stepsLeft = 0;

    // Buscar el siguiente jugador vivo en la ronda
    let next = state.turnoIdx + 1;
    while (next < state.jugadores.length && !state.jugadores[next].alive) {
      next++;
    }

    if (next < state.jugadores.length) {
      state.turnoIdx = next;
      state.fase = 'roll';
      renderAll();
    } else {
      // Fin de la ronda de jugadores -> Turno de los Enemigos
      ejecutarTurnoEnemigos();
    }
  }

  // ================= POPUP DE DUELO (10 SEGUNDOS, 4 OPCIONES, BOTÓN INICIAR) =================
  function abrirModalDuelo({ modo, jugador, enemigo }) {
    return new Promise(resolve => {
      state.fase = 'modal';
      const modal = $('duel-modal');
      modal.classList.remove('hidden');

      const esEsquiva = modo === 'esquiva';
      $('duel-title').textContent = esEsquiva ? '🛡️ ¡ESQUIVA EL ATAQUE ENEMIGO!' : '⚔️ ¡DUELO EN LA MAZMORRA!';
      $('duel-subtitle').textContent = esEsquiva
        ? `${enemigo.nombre} ataca a ${jugador.nombre}. ¡Resuelve en 10 s para evitar 25 de daño!`
        : `${jugador.nombre} ataca a ${enemigo.nombre}. ¡Resuelve en 10 s para infligir 25 de daño!`;

      // Lado izquierdo: Personaje (Pixel Art 16-bit)
      const heroBox = $('duel-hero-sprite');
      const enemyBox = $('duel-enemy-sprite');
      heroBox.classList.remove('anim-lunge-right', 'anim-hit-shake');
      enemyBox.classList.remove('anim-lunge-left', 'anim-hit-shake');

      heroBox.innerHTML = HM.getHeroSVG(jugador.clase, jugador.color, jugador.colorOscuro, { phase: 0 });
      $('duel-hero-name').textContent = `${jugador.emblema} ${jugador.nombre}`;
      $('duel-hero-hp').textContent = `❤️ ${jugador.hp} / ${jugador.maxHp} HP`;
      $('duel-hero-bar').style.width = `${Math.max(0, (jugador.hp / jugador.maxHp) * 100)}%`;

      // Lado derecho: Enemigo (Pixel Art 16-bit)
      enemyBox.innerHTML = HM.getEnemySVG(enemigo.templateId, { phase: 2 });
      $('duel-enemy-name').textContent = enemigo.nombre;
      $('duel-enemy-hp').textContent = `❤️ ${enemigo.hp} / ${enemigo.maxHp} HP`;
      $('duel-enemy-bar').style.width = `${Math.max(0, (enemigo.hp / enemigo.maxHp) * 100)}%`;
      paintSprites();

      // Estado inicial: mostrar botón INICIAR antes de arrancar los 10 segundos
      $('duel-ready-area').classList.remove('hidden');
      $('duel-question-area').classList.add('hidden');
      $('duel-feedback-area').classList.add('hidden');
      $('duel-start-btn').textContent = esEsquiva ? '🛡️ INICIAR ESQUIVA (10 s)' : '⚔️ INICIAR COMBATE (10 s)';

      const pregunta = HM.generarOperacionCombate(getEjercicioConfig());
      let timeLeft = 10.0;
      let resolved = false;

      function stopTimer() {
        if (state.timerId) {
          clearInterval(state.timerId);
          state.timerId = null;
        }
      }

      function finalizarDuelo(acierto, timeout = false) {
        if (resolved) return;
        resolved = true;
        stopTimer();

        // Deshabilitar opciones y marcar respuesta correcta (compatible con texto/fracciones/ecuaciones)
        marcarOpcionCorrecta($('duel-options'), pregunta);

        // Animaciones de pose 16-bit (attack / hit) en la arena de duelo
        if (acierto) {
          if (HM.PixelArt) {
            HM.PixelArt.setPose(heroBox, 'attack', 800);
            if (!esEsquiva) HM.PixelArt.setPose(enemyBox, 'hit', 800);
          }
          heroBox.classList.add('anim-lunge-right');
          if (!esEsquiva) enemyBox.classList.add('anim-hit-shake');
        } else {
          if (HM.PixelArt) {
            HM.PixelArt.setPose(enemyBox, 'attack', 800);
            HM.PixelArt.setPose(heroBox, 'hit', 800);
          }
          enemyBox.classList.add('anim-lunge-left');
          heroBox.classList.add('anim-hit-shake');
        }

        const fb = $('duel-feedback-area');
        fb.classList.remove('hidden');
        if (acierto) {
          fb.className = 'duel-feedback ok';
          $('duel-fb-title').textContent = esEsquiva ? '🛡️ ¡ATAQUE ESQUIVADO!' : '💥 ¡GOLPE CERTERO! (−25 HP)';
        } else {
          fb.className = 'duel-feedback fail';
          $('duel-fb-title').textContent = timeout
            ? '⏱️ ¡TIEMPO AGOTADO!'
            : (esEsquiva ? '🩸 ¡NO LOGRASTE ESQUIVAR!' : '❌ ¡ATAQUE FALLIDO!');
        }
        $('duel-fb-exp').textContent = `Solución: ${pregunta.respuestaCorrecta}. ${pregunta.explicacion}`;

        $('duel-continue-btn').onclick = () => {
          modal.classList.add('hidden');
          resolve(acierto);
        };
      }

      $('duel-start-btn').onclick = () => {
        $('duel-ready-area').classList.add('hidden');
        $('duel-question-area').classList.remove('hidden');

        const duelTema = $('duel-tema');
        if (duelTema) duelTema.textContent = pregunta.tema || '';
        const opEl = $('duel-operation');
        opEl.textContent = pregunta.enunciado;
        aplicarTamanoEnunciado(opEl, pregunta.enunciado);

        renderOpcionesBotones($('duel-options'), pregunta, ok => finalizarDuelo(ok, false));

        // Arrancar temporizador de 10 segundos
        timeLeft = 10.0;
        let lastSec = 10;
        $('duel-timer-text').textContent = '10 s';
        $('duel-timer-fill').style.width = '100%';
        $('duel-timer-fill').classList.remove('timer-danger');

        state.timerId = setInterval(() => {
          timeLeft = Math.max(0, timeLeft - 0.1);
          const sec = Math.ceil(timeLeft);
          $('duel-timer-text').textContent = `${sec} s`;
          $('duel-timer-fill').style.width = `${(timeLeft / 10) * 100}%`;
          if (sec <= 3 && sec < lastSec && sec > 0) {
            HM.Audio.tick();
            $('duel-timer-fill').classList.add('timer-danger');
          }
          lastSec = sec;
          if (timeLeft <= 0) {
            finalizarDuelo(false, true);
          }
        }, 100);
      };
    });
  }

  async function iniciarCombateJugador(jugador, enemigo) {
    const acierto = await abrirModalDuelo({ modo: 'ataque', jugador, enemigo });

    if (acierto) {
      jugador.aciertos++;
      enemigo.hp = Math.max(0, enemigo.hp - 25);
      HM.Audio.hit();
      showFloatText(enemigo.r, enemigo.c, '−25 HP', '#e74c3c');

      if (enemigo.hp <= 0) {
        enemigo.alive = false;
        state.mapa.grid[enemigo.r][enemigo.c].enemyId = null;
        jugador.oro += enemigo.oro;
        jugador.enemigosVencidos++;
        HM.Audio.coin();
        showFloatText(jugador.r, jugador.c, `+${enemigo.oro} 🪙`, '#f1c40f');
        logMsg(`🏆 <b>${jugador.nombre}</b> derrota a <b>${enemigo.nombre}</b> y gana <b>+${enemigo.oro} 🪙</b>.`);
      } else {
        logMsg(`⚔️ <b>${jugador.nombre}</b> golpea a <b>${enemigo.nombre}</b> (−25 HP, queda a ${enemigo.hp} HP).`);
      }
    } else {
      jugador.errores++;
      HM.Audio.fail();
      logMsg(`❌ <b>${jugador.nombre}</b> falla el ataque contra <b>${enemigo.nombre}</b>.`);
    }

    renderAll();
    terminarTurnoJugador();
  }

  // ================= POPUP DE PUERTAS Y COFRES (20 SEGUNDOS, PROBLEMA) =================
  function abrirModalProblema({ tipo, titulo, icono, propId, jugador }) {
    return new Promise(resolve => {
      state.fase = 'modal';
      const modal = $('problem-modal');
      modal.classList.remove('hidden');

      const probIconEl = $('prob-icon');
      if (HM.PixelArt && propId) {
        probIconEl.innerHTML = HM.PixelArt.createPropCanvasHTML(propId, { className: 'modal-prop-canvas' });
        paintSprites();
      } else {
        probIconEl.textContent = icono;
      }
      $('prob-title').textContent = titulo;
      $('prob-team').innerHTML = `Reto para <b>${jugador.emblema} ${jugador.nombre}</b> · Si fallas o se acaba el tiempo, <b>pierdes el turno</b>.`;

      $('prob-ready-area').classList.remove('hidden');
      $('prob-active-area').classList.add('hidden');
      $('prob-feedback-area').classList.add('hidden');

      const prob = HM.generarProblemaCofre(getEjercicioConfig());
      let timeLeft = 20.0;
      let resolved = false;

      function stopTimer() {
        if (state.timerId) {
          clearInterval(state.timerId);
          state.timerId = null;
        }
      }

      function finalizarProblema(acierto, timeout = false) {
        if (resolved) return;
        resolved = true;
        stopTimer();
        marcarOpcionCorrecta($('prob-options'), prob);

        const fb = $('prob-feedback-area');
        fb.classList.remove('hidden');
        if (acierto) {
          fb.className = 'duel-feedback ok';
          $('prob-fb-title').textContent = tipo === 'puerta' ? '🚪 ¡PUERTA DESBLOQUEADA!' : '🧰 ¡COFRE ABIERTO!';
        } else {
          fb.className = 'duel-feedback fail';
          $('prob-fb-title').textContent = timeout ? '⏱️ ¡TIEMPO AGOTADO! Pierdes el turno.' : '❌ ¡INCORRECTO! Pierdes el turno.';
        }
        $('prob-fb-exp').textContent = `Solución: ${prob.respuestaCorrecta}. ${prob.explicacion}`;

        $('prob-continue-btn').onclick = () => {
          modal.classList.add('hidden');
          resolve(acierto);
        };
      }

      $('prob-start-btn').onclick = () => {
        $('prob-ready-area').classList.add('hidden');
        $('prob-active-area').classList.remove('hidden');
        $('prob-tema').textContent = prob.tema;
        $('prob-enunciado').textContent = prob.enunciado;

        renderOpcionesBotones($('prob-options'), prob, ok => finalizarProblema(ok, false));

        // Temporizador de 20 segundos
        timeLeft = 20.0;
        let lastSec = 20;
        $('prob-timer-text').textContent = '20 s';
        $('prob-timer-fill').style.width = '100%';
        $('prob-timer-fill').classList.remove('timer-danger');

        state.timerId = setInterval(() => {
          timeLeft = Math.max(0, timeLeft - 0.1);
          const sec = Math.ceil(timeLeft);
          $('prob-timer-text').textContent = `${sec} s`;
          $('prob-timer-fill').style.width = `${(timeLeft / 20) * 100}%`;
          if (sec <= 5 && sec < lastSec && sec > 0) {
            HM.Audio.tick();
            $('prob-timer-fill').classList.add('timer-danger');
          }
          lastSec = sec;
          if (timeLeft <= 0) {
            finalizarProblema(false, true);
          }
        }, 100);
      };
    });
  }

  async function intentarAbrirPuerta(jugador, doorCell) {
    const acierto = await abrirModalProblema({
      tipo: 'puerta',
      titulo: 'Puerta Cerrada con Acertijo',
      icono: '🚪',
      propId: 'door',
      jugador
    });

    if (acierto) {
      jugador.aciertos++;
      doorCell.doorOpen = true;
      HM.Audio.door();
      // Revelar habitaciones conectadas a esta puerta
      doorCell.doorRooms.forEach(roomId => {
        const room = state.mapa.rooms.find(r => r.id === roomId);
        if (room && !room.revealed) {
          room.revealed = true;
          room.cells.forEach(pt => {
            state.mapa.grid[pt.r][pt.c].revealed = true;
          });
          logMsg(`🚪 <b>${jugador.nombre}</b> abre la puerta y descubre <b>${room.nombre}</b>.`);
        }
      });
      state.fase = 'move';
      renderAll();
    } else {
      jugador.errores++;
      HM.Audio.fail();
      logMsg(`❌ <b>${jugador.nombre}</b> falla al abrir la puerta y <b>pierde el turno</b>.`);
      renderAll();
      terminarTurnoJugador();
    }
  }

  async function intentarAbrirCofre(jugador, chestCell) {
    const chest = chestCell.chest;
    const acierto = await abrirModalProblema({
      tipo: 'cofre',
      titulo: chest.isGrand ? '¡El Gran Cofre Real!' : 'Cofre del Tesoro',
      icono: chest.isGrand ? '👑' : '🧰',
      propId: chest.isGrand ? 'grand_chest' : 'chest',
      jugador
    });

    if (acierto) {
      jugador.aciertos++;
      chest.opened = true;
      jugador.oro += chest.oro;
      HM.Audio.coin();
      showFloatText(chestCell.r, chestCell.c, `+${chest.oro} 🪙`, '#f1c40f');

      let extra = '';
      if (chest.hasShield && !jugador.escudo) {
        jugador.escudo = true;
        extra = ' y un 🛡️ <b>Escudo Protector</b>';
      }
      logMsg(`🧰 <b>${jugador.nombre}</b> abre el cofre y obtiene <b>+${chest.oro} 🪙</b>${extra}.`);

      if (chest.isGrand) {
        renderAll();
        mostrarFinPartida(true, jugador);
        return;
      }

      state.fase = 'move';
      renderAll();
      if (state.stepsLeft <= 0) {
        setTimeout(() => terminarTurnoJugador(), 450);
      }
    } else {
      jugador.errores++;
      HM.Audio.fail();
      logMsg(`❌ <b>${jugador.nombre}</b> falla al abrir el cofre y <b>pierde el turno</b>.`);
      renderAll();
      terminarTurnoJugador();
    }
  }

  // ================= TURNO AUTOMÁTICO DE ENEMIGOS (BFS + ESQUIVA) =================
  function buscarSiguientePasoHaciaJugador(enemy) {
    const vivos = state.jugadores.filter(j => j.alive);
    if (vivos.length === 0) return null;

    const { rows, cols, grid } = state.mapa;
    const targetSet = new Set(vivos.map(j => `${j.r},${j.c}`));
    const visited = Array.from({ length: rows }, () => Array(cols).fill(false));
    const parent = Array.from({ length: rows }, () => Array(cols).fill(null));
    const q = [{ r: enemy.r, c: enemy.c }];
    visited[enemy.r][enemy.c] = true;

    let foundTarget = null;
    while (q.length) {
      const cur = q.shift();
      if (targetSet.has(`${cur.r},${cur.c}`)) {
        foundTarget = cur;
        break;
      }
      for (const [dr, dc] of DIRS) {
        const nr = cur.r + dr, nc = cur.c + dc;
        if (nr < 0 || nr >= rows || nc < 0 || nc >= cols || visited[nr][nc]) continue;
        const cell = grid[nr][nc];
        if (!cell.revealed || cell.type === 'wall') continue;
        if (cell.type === 'door' && !cell.doorOpen) continue;
        // Evitar casillas con otro enemigo vivo
        const otherEn = getEnemyAt(nr, nc);
        if (otherEn && otherEn.uid !== enemy.uid) continue;

        visited[nr][nc] = true;
        parent[nr][nc] = cur;
        q.push({ r: nr, c: nc });
      }
    }

    if (!foundTarget) return null;
    // Retroceder hasta el primer paso desde enemy
    let step = foundTarget;
    while (parent[step.r][step.c] && !(parent[step.r][step.c].r === enemy.r && parent[step.r][step.c].c === enemy.c)) {
      step = parent[step.r][step.c];
    }
    return step;
  }

  function getJugadorAdyacenteAEnemigo(enemy) {
    return state.jugadores.find(j => j.alive && (Math.abs(j.r - enemy.r) + Math.abs(j.c - enemy.c) === 1)) || null;
  }

  async function ejecutarTurnoEnemigos() {
    state.fase = 'enemyTurn';
    renderAll();

    const enemigosActivos = state.mapa.enemies.filter(e => e.alive && isCellRevealed(e.r, e.c));
    if (enemigosActivos.length > 0) {
      const banner = $('enemy-turn-banner');
      banner.classList.remove('hidden');
      await sleep(900);
      banner.classList.add('hidden');
    }

    for (const en of enemigosActivos) {
      if (!en.alive) continue;
      if (state.jugadores.every(j => !j.alive)) break;

      // 1. Si no está en rango de ataque, se mueve 1 casilla hacia el jugador vivo más cercano
      let objetivo = getJugadorAdyacenteAEnemigo(en);
      if (!objetivo) {
        const paso = buscarSiguientePasoHaciaJugador(en);
        if (paso && !state.jugadores.some(j => j.alive && j.r === paso.r && j.c === paso.c)) {
          state.mapa.grid[en.r][en.c].enemyId = null;
          en.r = paso.r;
          en.c = paso.c;
          state.mapa.grid[en.r][en.c].enemyId = en.uid;
          HM.Audio.step();
          renderBoard();
          await sleep(480);
        }
        objetivo = getJugadorAdyacenteAEnemigo(en);
      }

      // 2. Si entra en rango ortogonal, ataca y el jugador puede esquivar (duelo de 10 s)
      if (objetivo) {
        logMsg(`👹 <b>${en.nombre}</b> ataca a <b>${objetivo.nombre}</b>. ¡Intento de esquiva!`);
        const esquivado = await abrirModalDuelo({ modo: 'esquiva', jugador: objetivo, enemigo: en });

        if (esquivado) {
          objetivo.aciertos++;
          HM.Audio.shield();
          showFloatText(objetivo.r, objetivo.c, '🛡️ ¡ESQUIVADO!', '#2ecc71');
          logMsg(`🛡️ <b>${objetivo.nombre}</b> esquiva el ataque de <b>${en.nombre}</b>.`);
        } else {
          objetivo.errores++;
          if (objetivo.escudo) {
            objetivo.escudo = false;
            HM.Audio.shield();
            showFloatText(objetivo.r, objetivo.c, '🛡️ Escudo roto', '#3498db');
            logMsg(`🛡️ El Escudo Protector salvó a <b>${objetivo.nombre}</b> del golpe.`);
          } else {
            objetivo.hp = Math.max(0, objetivo.hp - en.danio);
            HM.Audio.hit();
            showFloatText(objetivo.r, objetivo.c, `−${en.danio} ❤️`, '#e74c3c');
            logMsg(`🩸 <b>${en.nombre}</b> hiere a <b>${objetivo.nombre}</b> (−${en.danio} HP).`);

            if (objetivo.hp <= 0) {
              objetivo.alive = false;
              logMsg(`💀 <b>${objetivo.nombre}</b> ha caído en la mazmorra.`);
            }
          }
        }
        renderAll();
        await sleep(450);
      }
    }

    // Comprobar derrota total
    if (state.jugadores.every(j => !j.alive)) {
      mostrarFinPartida(false, null);
      return;
    }

    // Iniciar siguiente ronda con el primer jugador vivo
    state.ronda++;
    state.turnoIdx = state.jugadores.findIndex(j => j.alive);
    state.fase = 'roll';
    state.lastDice = null;
    renderAll();
  }

  // ================= PANTALLA FINAL (VICTORIA / DERROTA) =================
  function mostrarFinPartida(victoria, ganador) {
    state.fase = 'gameover';
    if (victoria) HM.Audio.victory();
    else HM.Audio.fail();

    const modal = $('end-modal');
    modal.classList.remove('hidden');

    const endIcon = $('end-icon');
    if (HM.PixelArt) {
      endIcon.innerHTML = HM.PixelArt.createPropCanvasHTML(victoria ? 'grand_chest' : 'tomb', { className: 'end-prop-canvas' });
      paintSprites();
    } else {
      endIcon.textContent = victoria ? '👑' : '💀';
    }
    $('end-title').textContent = victoria ? `¡${ganador.nombre} conquista el Gran Cofre!` : '¡Derrota en la Mazmorra!';
    $('end-subtitle').textContent = victoria
      ? 'El cofre se abre rebosante de oro y sabiduría matemática.'
      : 'Todos los equipos han caído. ¡Volved a intentarlo con un nuevo mapa!';

    const ordenados = state.jugadores.slice().sort((a, b) => b.oro - a.oro || b.aciertos - a.aciertos);
    $('end-podium').innerHTML = ordenados.map((j, idx) => `
      <div class="podium-row">
        <span class="podium-rank">#${idx + 1}</span>
        <span class="podium-name">${j.emblema} ${j.nombre} ${!j.alive ? '💀' : ''}</span>
        <span class="podium-stat">🪙 ${j.oro}</span>
        <span class="podium-stat">✅ ${j.aciertos}</span>
        <span class="podium-stat">⚔️ ${j.enemigosVencidos}</span>
      </div>
    `).join('');
  }

  // ================= SELECTOR BANCO DE EJERCICIOS Y PANTALLA COMPLETA =================
  function initBancoSelector() {
    if (window.BancoUI && typeof window.BancoUI.crearSelector === 'function') {
      bancoSelector = window.BancoUI.crearSelector({
        gameId: 'heromath_mazmorra',
        defaultTemas: ['enteros'],
        defaultNivel: '1eso',
        defaultTipo: 'mixto',
        notaModalidad: 'En modo "Ambos", los combates usan Operaciones rápidas y las puertas/cofres usan Problemas.',
        onChange: (cfg) => {
          state.ejerciciosConfig = cfg;
          actualizarResumenEjercicios();
          if (state.fase !== 'setup') {
            logMsg(`📚 <b>Ejercicios actualizados:</b> ${bancoSelector.getResumenDetallado()}.`);
          }
        }
      });
      bancoSelector.bindButton($('btn-selector-ejercicios-setup'));
      bancoSelector.bindButton($('btn-selector-ejercicios-top'));
      state.ejerciciosConfig = bancoSelector.getConfig();
      actualizarResumenEjercicios();
    }

    if (window.BancoUI && typeof window.BancoUI.bindFullscreenButton === 'function') {
      window.BancoUI.bindFullscreenButton($('btn-fullscreen-setup'), {
        enterText: '⛶ Pantalla completa',
        exitText: '🗗 Salir pantalla'
      });
      window.BancoUI.bindFullscreenButton($('btn-fullscreen'), {
        enterText: '⛶ Pantalla',
        exitText: '🗗 Salir'
      });
    } else {
      const toggleFs = () => {
        if (!document.fullscreenElement) document.documentElement.requestFullscreen?.();
        else document.exitFullscreen?.();
      };
      if ($('btn-fullscreen')) $('btn-fullscreen').onclick = toggleFs;
      if ($('btn-fullscreen-setup')) $('btn-fullscreen-setup').onclick = toggleFs;
    }
  }

  // ================= EVENTOS GLOBALES =================
  function bindEvents() {
    document.querySelectorAll('.team-count-btn').forEach(btn => {
      btn.onclick = () => { state.numEquipos = Number(btn.dataset.count); renderSetup(); };
    });
    document.querySelectorAll('.map-size-btn').forEach(btn => {
      btn.onclick = () => { state.tamanoMapa = btn.dataset.size; renderSetup(); };
    });

    $('btn-start-game').onclick = iniciarPartida;
    $('btn-roll-dice').onclick = tirarDado;
    $('btn-end-turn').onclick = terminarTurnoJugador;

    $('dpad-up').onclick = () => moverDireccion(-1, 0);
    $('dpad-down').onclick = () => moverDireccion(1, 0);
    $('dpad-left').onclick = () => moverDireccion(0, -1);
    $('dpad-right').onclick = () => moverDireccion(0, 1);

    $('btn-new-map').onclick = () => {
      if (confirm('¿Generar una nueva mazmorra con los mismos equipos?')) iniciarPartida();
    };
    $('btn-back-setup').onclick = () => {
      if (confirm('¿Volver a la pantalla de equipos?')) {
        $('game-screen').classList.add('hidden');
        $('setup-screen').classList.remove('hidden');
        state.fase = 'setup';
        paintSprites();
      }
    };
    $('btn-sound').onclick = () => {
      const on = HM.Audio.toggle();
      $('btn-sound').textContent = on ? '🔊 Sonido' : '🔇 Silencio';
    };
    $('btn-rules').onclick = () => $('rules-modal').classList.remove('hidden');
    $('btn-close-rules').onclick = () => $('rules-modal').classList.add('hidden');
    $('btn-play-again').onclick = iniciarPartida;
    $('btn-end-setup').onclick = () => {
      $('end-modal').classList.add('hidden');
      $('game-screen').classList.add('hidden');
      $('setup-screen').classList.remove('hidden');
      state.fase = 'setup';
      paintSprites();
    };

    // Flechas del teclado para mover en pizarra/ordenador
    document.addEventListener('keydown', e => {
      if (state.fase !== 'move') return;
      if (e.key === 'ArrowUp')    { e.preventDefault(); moverDireccion(-1, 0); }
      if (e.key === 'ArrowDown')  { e.preventDefault(); moverDireccion(1, 0); }
      if (e.key === 'ArrowLeft')  { e.preventDefault(); moverDireccion(0, -1); }
      if (e.key === 'ArrowRight') { e.preventDefault(); moverDireccion(0, 1); }
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    initConfig();
    initBancoSelector();
    bindEvents();
    renderSetup();
  });
})();
