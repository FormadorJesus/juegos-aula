/**
 * Gladiadores/js/juego.js
 * Controlador principal del Coliseo Matemático:
 * estado del combate, integración con Banco de Ejercicios (BancoUI.crearSelector),
 * bucle de animación Pixel Art 16-bit y controles de aula (pantalla completa, sonido, reinicio).
 */
(function (root) {
    'use strict';

    const D = root.GladiatorData;
    const PA = root.GladiatorPixelArt;
    const Audio = root.GladiatorAudio;
    const WEAPON_STATS = D.WEAPON_STATS;
    const HELMET_LABELS = D.HELMET_LABELS;

    const FRAME_MS = 130; // ~7.7 FPS estilo arcade 16-bit / GBA
    let lastAnimTime = 0;
    let ambientFrame = 0;
    let selectorEjercicios = null;

    const gameState = {
        soundEnabled: true,
        currentTurn: 1,
        isAnimating: false,
        gameOver: false,
        currentQuestion: null,
        timerInterval: null,
        turnTimeout: null,
        turnDuration: 12.0,
        timeLeft: 12.0,
        lastTickSecond: 4,
        clashActive: false,
        clashFrame: 0,
        gladiators: {
            1: {
                name: 'Máximo',
                helmet: 'murmillo',
                armor: 'bronze',
                weapon: 'sword',
                hp: 100,
                maxHp: 100,
                hits: 0,
                misses: 0,
                animState: 'idle',
                animFrame: 0
            },
            2: {
                name: 'Espartaco',
                helmet: 'thraex',
                armor: 'segmentata',
                weapon: 'mace',
                hp: 100,
                maxHp: 100,
                hits: 0,
                misses: 0,
                animState: 'idle',
                animFrame: 0
            }
        }
    };

    /* ==========================================================================
       1. INTEGRACIÓN CON BANCO DE EJERCICIOS (SELECTOR MULTI-TEMA Y CURSO)
       ========================================================================== */
    function initExerciseSelector() {
        if (!root.BancoUI || typeof root.BancoUI.crearSelector !== 'function') {
            console.warn('BancoUI no está disponible.');
            return;
        }

        selectorEjercicios = root.BancoUI.crearSelector({
            gameId: 'gladiadores',
            defaultTemas: ['enteros'],
            defaultNivel: '1eso',
            defaultTipo: 'operacion',
            onChange: () => {
                updateCurriculumBadges();
                // Si el combate está en curso y esperando respuesta, refresca la pregunta al nuevo tema/curso
                const inArena = !document.getElementById('arena-screen').classList.contains('hidden');
                if (inArena && !gameState.isAnimating && !gameState.gameOver) {
                    setupTurn();
                }
            }
        });

        const topBtn = document.getElementById('btn-selector-ejercicios');
        const setupBtn = document.getElementById('btn-selector-setup');
        if (topBtn) selectorEjercicios.bindButton(topBtn);
        if (setupBtn) selectorEjercicios.bindButton(setupBtn);

        updateCurriculumBadges();
    }

    function updateCurriculumBadges() {
        if (!selectorEjercicios) return;
        const resumen = selectorEjercicios.getResumen();
        const detallado = selectorEjercicios.getResumenDetallado();

        const brandSub = document.getElementById('brand-sub');
        if (brandSub) {
            brandSub.textContent = `${resumen} • Duelo en la Arena 16-Bit`;
        }

        const setupSummary = document.getElementById('setup-topic-summary');
        if (setupSummary) {
            setupSummary.textContent = detallado;
        }

        const arenaBadge = document.getElementById('arena-topic-badge');
        if (arenaBadge) {
            arenaBadge.textContent = `📚 ${resumen}`;
            arenaBadge.title = detallado;
        }
    }

    function getTurnDurationForExercise(ej) {
        if (!ej) return 12.0;
        if (ej.tipo === 'problema') {
            return Math.min(35, Math.max(24, Number(ej.tiempoSugerido) || 28));
        }
        const byLevel = {
            '1eso': 12,
            '2eso': 15,
            '3eso': 18,
            '4eso': 20,
            '1bach': 24,
            '2bach': 26
        };
        return byLevel[ej.nivel] || 15;
    }

    function requestNextQuestion() {
        if (selectorEjercicios) {
            return selectorEjercicios.solicitarEjercicio();
        }
        // Respaldo de emergencia si el banco no estuviera cargado
        const a = Math.floor(Math.random() * 21) - 10;
        const b = Math.floor(Math.random() * 21) - 10;
        const ans = a + b;
        const opts = [String(ans), String(ans + 2), String(ans - 3), String(-ans || 5)];
        return {
            enunciado: `Calcula: (${a}) + (${b})`,
            opciones: opts,
            respuestaCorrecta: String(ans),
            indiceCorrecto: 0,
            explicacion: `(${a}) + (${b}) = ${ans}.`,
            temaLabel: 'Números Enteros',
            nivelLabel: '1.º ESO',
            nivel: '1eso',
            tipo: 'operacion',
            tipoLabel: 'Operación'
        };
    }

    /* ==========================================================================
       2. BUCLE DE ANIMACIÓN PIXEL ART 16-BIT (GLADIADORES + ARENA)
       ========================================================================== */
    function renderAllVisibleSprites() {
        const setupEl = document.getElementById('setup-screen');
        const isSetup = setupEl && !setupEl.classList.contains('hidden');

        if (isSetup) {
            [1, 2].forEach((id) => {
                const canvas = document.getElementById(`preview-g${id}-canvas`);
                if (!canvas) return;
                const ctx = canvas.getContext('2d');
                const g = gameState.gladiators[id];
                const grid = PA.composeGladiatorPixelGrid(g, id, 'idle', g.animFrame, true);
                grid.renderTo(ctx, 1);
            });
        } else {
            [1, 2].forEach((id) => {
                const canvas = document.getElementById(`arena-g${id}-canvas`);
                if (!canvas) return;
                const ctx = canvas.getContext('2d');
                const g = gameState.gladiators[id];
                const grid = PA.composeGladiatorPixelGrid(g, id, g.animState, g.animFrame, true);
                grid.renderTo(ctx, 1);
            });

            // Elementos Pixel Art animados de la arena (braseros con fuego y estandartes)
            PA.renderPixelTorch(document.getElementById('torch-left-canvas'), ambientFrame, 0);
            PA.renderPixelTorch(document.getElementById('torch-right-canvas'), ambientFrame, 2);
            PA.renderPixelBanner(document.getElementById('banner-left-canvas'), 1, ambientFrame);
            PA.renderPixelBanner(document.getElementById('banner-right-canvas'), 2, (ambientFrame + 1) % 4);

            if (gameState.clashActive) {
                PA.renderPixelClash(gameState.clashFrame);
            }
        }
    }

    function pixelAnimationLoop(timestamp) {
        if (timestamp - lastAnimTime >= FRAME_MS) {
            lastAnimTime = timestamp;
            ambientFrame = (ambientFrame + 1) % 4;
            [1, 2].forEach((id) => {
                gameState.gladiators[id].animFrame = (gameState.gladiators[id].animFrame + 1) % 4;
            });
            if (gameState.clashActive) {
                gameState.clashFrame = (gameState.clashFrame + 1) % 4;
            }
            renderAllVisibleSprites();
        }
        requestAnimationFrame(pixelAnimationLoop);
    }

    function setGladiatorAnim(playerId, newState) {
        gameState.gladiators[playerId].animState = newState;
        gameState.gladiators[playerId].animFrame = 0;
        renderAllVisibleSprites();
    }

    /* ==========================================================================
       3. GESTIÓN DE EQUIPAMIENTO Y PARTÍCULAS AMBIENTALES
       ========================================================================== */
    function selectEquipment(playerNum, prop, val) {
        Audio.playSfx('click');
        gameState.gladiators[playerNum][prop] = val;

        const buttons = document.querySelectorAll(`.opt-choice[data-player="${playerNum}"][data-prop="${prop}"]`);
        buttons.forEach((btn) => {
            if (btn.getAttribute('data-val') === val) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });

        renderAllVisibleSprites();
    }

    function createArenaDust() {
        const layer = document.getElementById('dust-layer');
        if (!layer) return;
        layer.innerHTML = '';
        for (let i = 0; i < 24; i++) {
            const speck = document.createElement('div');
            speck.className = 'dust-speck';
            speck.style.left = `${Math.random() * 100}%`;
            speck.style.top = `${55 + Math.random() * 42}%`;
            speck.style.animationDuration = `${4 + Math.random() * 5}s`;
            speck.style.animationDelay = `${Math.random() * 4}s`;
            layer.appendChild(speck);
        }
    }

    /* ==========================================================================
       4. COMBATE POR TURNOS, TEMPORIZADOR Y RENDER DE PREGUNTAS
       ========================================================================== */
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

    function startBattle() {
        Audio.playSfx('click');
        clearAllTimers();

        const name1 = document.getElementById('input-name-1').value.trim();
        const name2 = document.getElementById('input-name-2').value.trim();
        gameState.gladiators[1].name = name1 || 'Máximo';
        gameState.gladiators[2].name = name2 || 'Espartaco';

        [1, 2].forEach((id) => {
            gameState.gladiators[id].hp = 100;
            gameState.gladiators[id].hits = 0;
            gameState.gladiators[id].misses = 0;
            gameState.gladiators[id].animState = 'idle';
            gameState.gladiators[id].animFrame = 0;
        });

        gameState.currentTurn = 1;
        gameState.isAnimating = false;
        gameState.gameOver = false;
        gameState.clashActive = false;

        document.getElementById('setup-screen').classList.add('hidden');
        document.getElementById('arena-screen').classList.remove('hidden');
        document.getElementById('victory-overlay').classList.add('hidden');
        document.getElementById('reset-modal').classList.add('hidden');
        document.getElementById('clash-effect').classList.add('hidden');

        updateCurriculumBadges();
        resetArenaPositions();
        updateHealthHUD();
        renderAllVisibleSprites();
        setupTurn();
    }

    function resetArenaPositions() {
        [1, 2].forEach((id) => {
            const wrapper = document.getElementById(`gladiator-${id}-wrapper`);
            if (wrapper) wrapper.style.transform = 'translateX(0px) translateY(0px)';
            setGladiatorAnim(id, 'idle');
        });
    }

    function updateHealthHUD() {
        [1, 2].forEach((id) => {
            const g = gameState.gladiators[id];
            const pct = Math.max(0, (g.hp / g.maxHp) * 100);
            document.getElementById(`hud-name-${id}`).textContent = g.name;
            document.getElementById(`hud-hp-text-${id}`).textContent = `${g.hp} / ${g.maxHp} HP`;
            document.getElementById(`hud-gear-${id}`).textContent = `${HELMET_LABELS[g.helmet]} • ${WEAPON_STATS[g.weapon].label}`;

            const bar = document.getElementById(`hud-hp-bar-${id}`);
            bar.style.width = `${pct}%`;
            bar.classList.remove('mid', 'low');
            if (pct <= 25) bar.classList.add('low');
            else if (pct <= 55) bar.classList.add('mid');
        });
    }

    function setupTurn() {
        if (gameState.gameOver) return;
        clearAllTimers();

        const attackerId = gameState.currentTurn;
        const attacker = gameState.gladiators[attackerId];

        document.getElementById('turn-text').textContent = `TURNO DE ${attacker.name.toUpperCase()}`;

        const badge = document.getElementById('speaker-badge');
        badge.textContent = `${attacker.name} ataca:`;
        badge.className = `speaker-pill ${attackerId === 1 ? 'speaker-p1' : 'speaker-p2'}`;

        const bubble = document.getElementById('comic-bubble');
        bubble.className = `comic-bubble ${attackerId === 1 ? 'point-left' : 'point-right'}`;

        const ej = requestNextQuestion();
        gameState.currentQuestion = ej;

        // Etiqueta de tema, curso y tipo dentro del bocadillo
        const metaEl = document.getElementById('exercise-meta-badge');
        if (metaEl) {
            const temaShort = ej.temaLabel || 'Matemáticas';
            const nivelTxt = ej.nivelLabel || '';
            const tipoTxt = ej.tipo === 'problema' ? 'Problema' : 'Operación';
            metaEl.textContent = `${temaShort} · ${nivelTxt} · ${tipoTxt}`;
        }

        // Renderizado adaptable del enunciado (operaciones cortas vs problemas largos)
        const exprEl = document.getElementById('math-expression');
        const promptText = String(ej.enunciado || '');
        exprEl.textContent = promptText;
        exprEl.classList.remove('is-medium', 'is-problem');
        if (ej.tipo === 'problema' || promptText.length > 72) {
            exprEl.classList.add('is-problem');
        } else if (promptText.length > 26) {
            exprEl.classList.add('is-medium');
        }

        const fb = document.getElementById('feedback-bar');
        fb.classList.add('hidden');
        fb.innerHTML = '';

        // Opciones con ajuste automático de rejilla y tipografía para texto arbitrario
        const grid = document.getElementById('options-grid');
        grid.innerHTML = '';
        const opts = Array.isArray(ej.opciones) ? ej.opciones : [];
        const maxLen = opts.reduce((m, o) => Math.max(m, String(o).length), 0);

        grid.classList.remove('opts-2col');
        if (maxLen > 9) {
            grid.classList.add('opts-2col');
        }

        opts.forEach((optText, idx) => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'ans-btn';
            if (String(optText).length > 18) {
                btn.classList.add('opt-long');
            } else if (String(optText).length > 10) {
                btn.classList.add('opt-medium');
            }
            btn.dataset.optionIndex = String(idx);
            btn.dataset.optionValue = String(optText);
            btn.textContent = String(optText);
            btn.addEventListener('click', () => handleAnswer(idx, btn));
            grid.appendChild(btn);
        });

        startTurnTimer(getTurnDurationForExercise(ej));
    }

    function startTurnTimer(durationSeconds) {
        gameState.turnDuration = durationSeconds || 12.0;
        gameState.timeLeft = gameState.turnDuration;
        gameState.lastTickSecond = 4;
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
                Audio.playSfx('tick');
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
        const ratio = gameState.turnDuration > 0 ? (gameState.timeLeft / gameState.turnDuration) : 0;
        const pct = Math.max(0, Math.min(100, ratio * 100));

        txt.textContent = `${gameState.timeLeft.toFixed(1)}s`;
        bar.style.width = `${pct}%`;

        txt.classList.remove('warn', 'danger');
        bar.classList.remove('warn', 'danger');

        if (gameState.timeLeft <= 3.0 || ratio <= 0.22) {
            txt.classList.add('danger');
            bar.classList.add('danger');
        } else if (ratio <= 0.48) {
            txt.classList.add('warn');
            bar.classList.add('warn');
        }
    }

    function lockOptionButtons(clickedBtn, isCorrect) {
        const q = gameState.currentQuestion;
        const buttons = document.getElementById('options-grid').querySelectorAll('button');
        buttons.forEach((btn, idx) => {
            btn.disabled = true;
            const isRightBtn = idx === q.indiceCorrecto ||
                String(btn.dataset.optionValue) === String(q.respuestaCorrecta);
            if (isRightBtn) {
                btn.classList.add('correct');
            } else if (btn === clickedBtn && !isCorrect) {
                btn.classList.add('wrong');
            } else {
                btn.classList.add('dimmed');
            }
        });
    }

    function renderFeedbackBanner(isOk, headline, explanation) {
        const fb = document.getElementById('feedback-bar');
        fb.className = `feedback-banner ${isOk ? 'fb-ok' : 'fb-bad'}`;
        fb.innerHTML = '';

        const mainLine = document.createElement('div');
        mainLine.className = 'fb-main';
        mainLine.textContent = headline;
        fb.appendChild(mainLine);

        if (explanation) {
            const expLine = document.createElement('div');
            expLine.className = 'fb-exp';
            expLine.textContent = `💡 ${explanation}`;
            fb.appendChild(expLine);
        }
    }

    function handleTimeOut() {
        if (gameState.isAnimating || gameState.gameOver) return;
        gameState.isAnimating = true;

        const attackerId = gameState.currentTurn;
        const defenderId = attackerId === 1 ? 2 : 1;
        const attacker = gameState.gladiators[attackerId];
        const q = gameState.currentQuestion;
        attacker.misses++;

        lockOptionButtons(null, false);

        renderFeedbackBanner(
            false,
            `⏰ ¡Tiempo agotado! Respuesta correcta: ${q.respuestaCorrecta}`,
            q.explicacion
        );

        Audio.playSfx('timeout');
        setGladiatorAnim(attackerId, 'miss');
        spawnFloatingBadge(attackerId, '¡TIEMPO!', 'float-miss');

        gameState.turnTimeout = setTimeout(() => {
            if (gameState.gameOver) return;
            setGladiatorAnim(attackerId, 'idle');
            gameState.currentTurn = defenderId;
            gameState.isAnimating = false;
            setupTurn();
        }, 2300);
    }

    function handleAnswer(selectedIndex, clickedBtn) {
        if (gameState.isAnimating || gameState.gameOver) return;
        clearAllTimers();
        gameState.isAnimating = true;

        const attackerId = gameState.currentTurn;
        const defenderId = attackerId === 1 ? 2 : 1;
        const attacker = gameState.gladiators[attackerId];
        const q = gameState.currentQuestion;

        const isCorrect = selectedIndex === q.indiceCorrecto ||
            String(q.opciones[selectedIndex]) === String(q.respuestaCorrecta);

        lockOptionButtons(clickedBtn, isCorrect);

        if (isCorrect) {
            attacker.hits++;
            const wStat = WEAPON_STATS[attacker.weapon];
            const damage = Math.floor(Math.random() * (wStat.maxDmg - wStat.minDmg + 1)) + wStat.minDmg;
            renderFeedbackBanner(
                true,
                `⚔️ ¡Acierto! ${attacker.name} golpea con ${wStat.label} (-${damage} HP).`,
                q.explicacion
            );
            performAttackSequence(attackerId, defenderId, damage);
        } else {
            attacker.misses++;
            renderFeedbackBanner(
                false,
                `❌ ¡Fallo! La respuesta correcta era ${q.respuestaCorrecta}.`,
                q.explicacion
            );
            performMissSequence(attackerId, defenderId);
        }
    }

    function performAttackSequence(attackerId, defenderId, damage) {
        const attRig = document.getElementById(`gladiator-${attackerId}-wrapper`);
        const arena = document.getElementById('arena-screen');
        const clash = document.getElementById('clash-effect');
        const attacker = gameState.gladiators[attackerId];
        const defender = gameState.gladiators[defenderId];

        const dir = attackerId === 1 ? 1 : -1;
        const lungeX = window.innerWidth < 640 ? 75 * dir : 155 * dir;

        setGladiatorAnim(attackerId, 'attack');
        if (attacker.weapon === 'mace') {
            attRig.style.transform = `translateX(${lungeX}px) translateY(-10px)`;
        } else {
            attRig.style.transform = `translateX(${lungeX}px)`;
        }

        gameState.turnTimeout = setTimeout(() => {
            Audio.playSfx(attacker.weapon);
            clash.classList.remove('hidden');
            gameState.clashActive = true;
            gameState.clashFrame = 0;
            PA.renderPixelClash(0);

            setGladiatorAnim(defenderId, 'hit');
            arena.classList.add('arena-shake');

            spawnFloatingBadge(defenderId, `-${damage} HP`, 'float-dmg');
            defender.hp = Math.max(0, defender.hp - damage);
            updateHealthHUD();

            gameState.turnTimeout = setTimeout(() => {
                clash.classList.add('hidden');
                gameState.clashActive = false;
                arena.classList.remove('arena-shake');
                attRig.style.transform = 'translateX(0px) translateY(0px)';
                setGladiatorAnim(attackerId, 'idle');

                if (defender.hp <= 0) {
                    triggerVictory(attackerId, defenderId);
                } else {
                    setGladiatorAnim(defenderId, 'idle');
                    gameState.turnTimeout = setTimeout(() => {
                        gameState.currentTurn = defenderId;
                        gameState.isAnimating = false;
                        setupTurn();
                    }, 950);
                }
            }, 560);
        }, 260);
    }

    function performMissSequence(attackerId, defenderId) {
        const attRig = document.getElementById(`gladiator-${attackerId}-wrapper`);
        const defRig = document.getElementById(`gladiator-${defenderId}-wrapper`);
        const dir = attackerId === 1 ? 1 : -1;

        setGladiatorAnim(attackerId, 'miss');
        attRig.style.transform = `translateX(${45 * dir}px)`;
        defRig.style.transform = `translateX(${24 * dir}px)`;

        gameState.turnTimeout = setTimeout(() => {
            Audio.playSfx('miss');
            spawnFloatingBadge(attackerId, '¡FALLO!', 'float-miss');

            gameState.turnTimeout = setTimeout(() => {
                attRig.style.transform = 'translateX(0px)';
                defRig.style.transform = 'translateX(0px)';
                setGladiatorAnim(attackerId, 'idle');

                gameState.turnTimeout = setTimeout(() => {
                    gameState.currentTurn = defenderId;
                    gameState.isAnimating = false;
                    setupTurn();
                }, 1350);
            }, 540);
        }, 260);
    }

    function spawnFloatingBadge(playerId, text, extraClass) {
        const zone = document.getElementById(`float-zone-${playerId}`);
        if (!zone) return;
        const badge = document.createElement('div');
        badge.className = `float-badge font-roman ${extraClass}`;
        badge.textContent = text;
        zone.appendChild(badge);
        setTimeout(() => badge.remove(), 1250);
    }

    function triggerVictory(winnerId, loserId) {
        clearAllTimers();
        gameState.gameOver = true;
        gameState.isAnimating = false;

        const winner = gameState.gladiators[winnerId];
        const loser = gameState.gladiators[loserId];

        setGladiatorAnim(loserId, 'defeat');
        setGladiatorAnim(winnerId, 'victory');

        Audio.playSfx('victory');

        gameState.turnTimeout = setTimeout(() => {
            document.getElementById('winner-title').textContent = `¡VICTORIA PARA ${winner.name.toUpperCase()}!`;
            const resumen = selectorEjercicios ? selectorEjercicios.getResumen() : 'Matemáticas';
            document.getElementById('winner-subtitle').textContent =
                `${winner.name} ha derrotado a ${loser.name} en el Coliseo (${resumen}).`;

            document.getElementById('stat-name-1').textContent = gameState.gladiators[1].name;
            document.getElementById('stat-score-1').textContent = `Aciertos: ${gameState.gladiators[1].hits} | Fallos: ${gameState.gladiators[1].misses}`;

            document.getElementById('stat-name-2').textContent = gameState.gladiators[2].name;
            document.getElementById('stat-score-2').textContent = `Aciertos: ${gameState.gladiators[2].hits} | Fallos: ${gameState.gladiators[2].misses}`;

            document.getElementById('victory-overlay').classList.remove('hidden');
        }, 1250);
    }

    /* ==========================================================================
       5. CONTROLES GLOBALES (SONIDO, PANTALLA COMPLETA, REINICIO Y GIF)
       ========================================================================== */
    function toggleSound() {
        gameState.soundEnabled = !gameState.soundEnabled;
        Audio.setSoundEnabled(gameState.soundEnabled);
        document.getElementById('sound-icon').textContent = gameState.soundEnabled ? '🔊' : '🔇';
        document.getElementById('sound-text').textContent = gameState.soundEnabled ? 'Sonido: ON' : 'Sonido: OFF';
        if (gameState.soundEnabled) Audio.playSfx('click');
    }

    function syncFullscreenButton() {
        const fsIcon = document.getElementById('fs-icon');
        const fsText = document.getElementById('fs-text');
        const fsBtn = document.getElementById('btn-fullscreen');
        const isFs = Boolean(document.fullscreenElement || document.webkitFullscreenElement);
        if (fsIcon) fsIcon.textContent = isFs ? '⤹' : '⛶';
        if (fsText) fsText.textContent = isFs ? 'Salir Pantalla' : 'Pantalla Completa';
        if (fsBtn) fsBtn.setAttribute('aria-pressed', String(isFs));
    }

    function toggleFullscreen() {
        const el = document.documentElement;
        if (!document.fullscreenElement && !document.webkitFullscreenElement) {
            const fn = el.requestFullscreen || el.webkitRequestFullscreen;
            if (fn) Promise.resolve(fn.call(el)).catch(() => {});
        } else {
            const fn = document.exitFullscreen || document.webkitExitFullscreen;
            if (fn) Promise.resolve(fn.call(document)).catch(() => {});
        }
    }

    function handleRestartClick() {
        Audio.playSfx('click');
        const isSetup = !document.getElementById('setup-screen').classList.contains('hidden');
        if (isSetup) {
            document.getElementById('input-name-1').value = 'Máximo';
            document.getElementById('input-name-2').value = 'Espartaco';
            gameState.gladiators[1].name = 'Máximo';
            gameState.gladiators[2].name = 'Espartaco';
            selectEquipment(1, 'helmet', 'murmillo');
            selectEquipment(1, 'armor', 'bronze');
            selectEquipment(1, 'weapon', 'sword');
            selectEquipment(2, 'helmet', 'thraex');
            selectEquipment(2, 'armor', 'segmentata');
            selectEquipment(2, 'weapon', 'mace');
        } else {
            document.getElementById('reset-modal').classList.remove('hidden');
        }
    }

    function rematchCurrentDuel() {
        Audio.playSfx('click');
        clearAllTimers();
        [1, 2].forEach((id) => {
            gameState.gladiators[id].hp = 100;
            gameState.gladiators[id].hits = 0;
            gameState.gladiators[id].misses = 0;
        });
        gameState.currentTurn = 1;
        gameState.isAnimating = false;
        gameState.gameOver = false;
        gameState.clashActive = false;

        document.getElementById('victory-overlay').classList.add('hidden');
        document.getElementById('reset-modal').classList.add('hidden');
        document.getElementById('clash-effect').classList.add('hidden');

        resetArenaPositions();
        updateHealthHUD();
        setupTurn();
    }

    function goBackToSetup() {
        Audio.playSfx('click');
        clearAllTimers();
        gameState.isAnimating = false;
        gameState.gameOver = false;
        gameState.clashActive = false;

        document.getElementById('arena-screen').classList.add('hidden');
        document.getElementById('victory-overlay').classList.add('hidden');
        document.getElementById('reset-modal').classList.add('hidden');
        document.getElementById('setup-screen').classList.remove('hidden');
        [1, 2].forEach((id) => setGladiatorAnim(id, 'idle'));
    }

    function handleDownloadGif(playerNum, btnEl) {
        Audio.playSfx('click');
        try {
            root.exportGladiatorTransparentGIF(playerNum, gameState.gladiators[playerNum]);
            const originalHTML = btnEl.innerHTML;
            btnEl.classList.add('saved');
            btnEl.innerHTML = '<span>✅</span><span>¡GIF Transparente Listo!</span>';
            setTimeout(() => {
                btnEl.classList.remove('saved');
                btnEl.innerHTML = originalHTML;
            }, 1800);
        } catch (err) {
            console.error('Error al exportar GIF:', err);
        }
    }

    /* ==========================================================================
       6. INICIALIZACIÓN SEGURA TRAS DOMContentLoaded
       ========================================================================== */
    document.addEventListener('DOMContentLoaded', () => {
        initExerciseSelector();
        createArenaDust();
        renderAllVisibleSprites();
        requestAnimationFrame(pixelAnimationLoop);

        // Botones de equipamiento
        document.querySelectorAll('.opt-choice').forEach((btn) => {
            btn.addEventListener('click', () => {
                const player = Number(btn.getAttribute('data-player'));
                const prop = btn.getAttribute('data-prop');
                const val = btn.getAttribute('data-val');
                selectEquipment(player, prop, val);
            });
        });

        // Botones de descarga GIF transparente
        const btnGif1 = document.getElementById('btn-gif-1');
        const btnGif2 = document.getElementById('btn-gif-2');
        if (btnGif1) btnGif1.addEventListener('click', () => handleDownloadGif(1, btnGif1));
        if (btnGif2) btnGif2.addEventListener('click', () => handleDownloadGif(2, btnGif2));

        // Inputs de nombre en tiempo real
        document.getElementById('input-name-1').addEventListener('input', (e) => {
            gameState.gladiators[1].name = e.target.value.trim() || 'Máximo';
        });
        document.getElementById('input-name-2').addEventListener('input', (e) => {
            gameState.gladiators[2].name = e.target.value.trim() || 'Espartaco';
        });

        // Controles principales
        document.getElementById('btn-start-battle').addEventListener('click', startBattle);
        document.getElementById('btn-sound').addEventListener('click', toggleSound);
        document.getElementById('btn-restart').addEventListener('click', handleRestartClick);
        document.getElementById('btn-fullscreen').addEventListener('click', toggleFullscreen);

        // Botones de modales
        document.getElementById('btn-rematch').addEventListener('click', rematchCurrentDuel);
        document.getElementById('btn-to-setup').addEventListener('click', goBackToSetup);
        document.getElementById('btn-reset-duel').addEventListener('click', rematchCurrentDuel);
        document.getElementById('btn-reset-setup').addEventListener('click', goBackToSetup);
        document.getElementById('btn-reset-cancel').addEventListener('click', () => {
            document.getElementById('reset-modal').classList.add('hidden');
        });

        // Sincronizar etiqueta si el usuario sale de pantalla completa con ESC
        document.addEventListener('fullscreenchange', syncFullscreenButton);
        document.addEventListener('webkitfullscreenchange', syncFullscreenButton);
        syncFullscreenButton();
    });

    root.GladiatorGame = {
        getGladiator: (id) => gameState.gladiators[id],
        getState: () => gameState
    };
})(typeof window !== 'undefined' ? window : globalThis);
