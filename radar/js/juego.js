/**
 * radar/js/juego.js
 * Estado principal, renderizado de regla y cuadrillas, entrada manual de coordenadas,
 * modal de retos conectado a BancoMatematicas / BancoUI, modal docente, renombrado
 * y pantalla completa sincronizada.
 */
(function (root) {
  'use strict';

  const CFG = root.RadarConfig;
  const DEFAULT_ANSWERS = CFG.DEFAULT_ANSWERS;
  const TOTAL_TRAMOS = CFG.TOTAL_TRAMOS;
  const MAX_DEPTH_VISUAL = CFG.MAX_DEPTH_VISUAL;
  const MIN_DEPTH_VISUAL = CFG.MIN_DEPTH_VISUAL;
  const ANOMALY_ZONE_TOP = CFG.ANOMALY_ZONE_TOP;
  const ANOMALY_ZONE_BOTTOM = CFG.ANOMALY_ZONE_BOTTOM;

  const state = {
    correctAnswers: [...DEFAULT_ANSWERS],
    soundEnabled: true,
    forceResolved: false, // Activado por el docente si juegan menos de 4 grupos
    editingCrewId: null,
    crews: CFG.CREWS_CONFIG.map((c) => ({
      ...c,
      entries: [], // { value, expected, deviation, posAfter, viaReto }
      position: 0,
      lastDeviation: null,
      totalError: 0
    }))
  };

  let selectorEjercicios = null;

  // Estado del modal de Reto Tramo
  const retoState = {
    open: false,
    crewId: null,
    ejercicio: null,
    answered: false,
    pendingValue: null,
    pendingWasCorrect: false,
    committed: false,
    autoTimer: null
  };

  /* ============================================================================
     UTILIDADES
     ============================================================================ */
  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, (m) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    }[m]));
  }

  function formatSigned(n) {
    return n > 0 ? `+${n}` : String(n);
  }

  // Convierte profundidad (+15 m a -65 m) a porcentaje vertical del pozo (8% a 88%)
  function depthToPercent(depth) {
    const clamped = Math.max(MIN_DEPTH_VISUAL, Math.min(MAX_DEPTH_VISUAL, depth));
    const ratio = (MAX_DEPTH_VISUAL - clamped) / (MAX_DEPTH_VISUAL - MIN_DEPTH_VISUAL);
    return 8 + ratio * 80;
  }

  function showToast(msg, type = 'info') {
    const toast = document.getElementById('toastBanner');
    if (!toast) return;
    const styles = {
      info: 'bg-stone-900/95 border-cyan-500/60 text-cyan-200',
      success: 'bg-emerald-950/95 border-emerald-400/75 text-emerald-200',
      error: 'bg-rose-950/95 border-rose-400/75 text-rose-200'
    };
    toast.className = `fixed top-16 left-1/2 -translate-x-1/2 z-50 px-5 py-2.5 rounded-2xl font-bold text-sm sm:text-base shadow-2xl border backdrop-blur-md transition-all ${styles[type] || styles.info}`;
    toast.textContent = msg;
    toast.classList.remove('hidden');

    clearTimeout(root.__toastTimer);
    root.__toastTimer = setTimeout(() => {
      toast.classList.add('hidden');
    }, 2800);
  }

  function updateHeaderSubtitle() {
    const sub = document.getElementById('headerSubtitle');
    if (!sub) return;
    if (selectorEjercicios && typeof selectorEjercicios.getResumenDetallado === 'function') {
      sub.textContent = `${selectorEjercicios.getResumenDetallado()} · 5 Tramos hacia la Señal Compacta`;
    } else {
      sub.textContent = '1.º ESO · Coordenadas de Números Enteros · 5 Tramos hacia la Señal Compacta';
    }
  }

  /* ============================================================================
     LÓGICA DE RESOLUCIÓN Y BOTÓN "¡LOCALIZAR SEÑAL!"
     ============================================================================ */
  function getSignalEligibility() {
    const finishedCrews = state.crews.filter((c) => c.entries.length === TOTAL_TRAMOS);
    const allFourFinished = finishedCrews.length === state.crews.length;
    const anyPerfect = finishedCrews.some((c) => c.totalError === 0);

    let minError = Infinity;
    const canEvaluateClosest = !anyPerfect && (allFourFinished || (state.forceResolved && finishedCrews.length > 0));
    if (canEvaluateClosest) {
      minError = Math.min(...finishedCrews.map((c) => c.totalError));
    }

    return { finishedCrews, allFourFinished, anyPerfect, canEvaluateClosest, minError };
  }

  /* ============================================================================
     RENDERIZADO DE REGLA LATERAL Y 4 COLUMNAS DE CUADRILLAS
     ============================================================================ */
  function renderDepthRuler() {
    const track = document.getElementById('depthRulerTrack');
    if (!track) return;

    const marks = [15, 10, 0, -10, -20, -30, -40, -50, -60, -65];
    const zoneTop = depthToPercent(ANOMALY_ZONE_TOP);
    const zoneBottom = depthToPercent(ANOMALY_ZONE_BOTTOM);
    const zoneHeight = zoneBottom - zoneTop;

    const anomalyBandHtml = `
      <div class="absolute left-0 right-0 bg-emerald-500/20 border-y border-cyan-400/50 flex items-center justify-center pointer-events-none"
           style="top: ${zoneTop}%; height: ${zoneHeight}%;">
        <span class="font-hud text-[8px] font-extrabold text-cyan-300 tracking-tighter uppercase animate-pulse">SEÑAL</span>
      </div>
    `;

    const marksHtml = marks.map((m) => {
      const topPct = depthToPercent(m);
      const isZero = m === 0;
      return `
        <div class="absolute left-0 right-0 flex items-center justify-between px-1.5 -translate-y-1/2" style="top: ${topPct}%">
          <span class="font-hud text-[10px] font-extrabold ${isZero ? 'text-amber-300' : m > 0 ? 'text-sky-300' : 'text-stone-400'}">
            ${formatSigned(m)}
          </span>
          <span class="h-[2px] ${isZero ? 'w-4 bg-amber-400' : 'w-2 bg-stone-600'}"></span>
        </div>
        ${isZero ? `<div class="absolute left-1.5 font-hud text-[7px] font-bold uppercase text-amber-400/90" style="top: calc(${topPct}% + 7px)">Superficie</div>` : ''}
      `;
    }).join('');

    track.innerHTML = anomalyBandHtml + marksHtml;
  }

  function updateHeaderHud() {
    const hudText = document.getElementById('radarHudStatusText');
    if (!hudText) return;
    const { finishedCrews, anyPerfect, canEvaluateClosest } = getSignalEligibility();

    if (anyPerfect) {
      hudText.textContent = '¡SEÑAL FIJADA CON PRECISIÓN EXACTA!';
    } else if (canEvaluateClosest) {
      hudText.textContent = 'SEÑAL LOCALIZADA · CUADRILLA MÁS CERCANA';
    } else {
      hudText.textContent = `SEÑAL COMPACTA DETECTADA · ${finishedCrews.length}/4 FIN`;
    }
  }

  function renderCrews(animatedCrewId = null, animType = null) {
    const grid = document.getElementById('crewsGrid');
    if (!grid) return;

    const { allFourFinished, canEvaluateClosest, minError } = getSignalEligibility();
    const depthLines = [15, 0, -15, -30, -45, -60];

    const zoneTop = depthToPercent(ANOMALY_ZONE_TOP);
    const zoneHeight = depthToPercent(ANOMALY_ZONE_BOTTOM) - zoneTop;

    // Conservar lo que otros grupos puedan estar escribiendo en el campo manual
    const savedInputs = {};
    state.crews.forEach((c) => {
      const inp = document.getElementById(`input-crew-${c.id}`);
      if (inp) savedInputs[c.id] = inp.value;
    });

    const crystalSecondary = ['amber', 'violet', 'cyan', 'emerald'];

    grid.innerHTML = state.crews.map((crew) => {
      const completed = crew.entries.length;
      const isFinished = completed === TOTAL_TRAMOS;
      const currentTramo = Math.min(completed + 1, TOTAL_TRAMOS);
      const topPct = depthToPercent(crew.position);
      const outOfRange = crew.position < MIN_DEPTH_VISUAL || crew.position > MAX_DEPTH_VISUAL;

      if (root.RadarPixelArt) {
        root.RadarPixelArt.setCrewFinished(crew.id, isFinished);
      }

      // ¿Le aparece el botón "¡LOCALIZAR SEÑAL!"?
      let showLocateBtn = false;
      let winMode = 'perfect';
      if (isFinished) {
        if (crew.totalError === 0) {
          showLocateBtn = true;
          winMode = 'perfect';
        } else if (canEvaluateClosest && crew.totalError === minError) {
          showLocateBtn = true;
          winMode = 'closest';
        }
      }

      // Mini historial compacto de los 5 tramos (siempre visible, sin scroll)
      const compactHistoryHtml = Array.from({ length: TOTAL_TRAMOS }, (_, i) => {
        const entry = crew.entries[i];
        if (entry) {
          const ok = entry.deviation === 0;
          return `
            <div title="Tramo ${i + 1}: ${formatSigned(entry.value)} m → Pos ${entry.posAfter} m (Desvío ${entry.deviation})"
              class="rounded-lg px-1 py-1 text-center border ${ok ? 'bg-emerald-950/60 border-emerald-500/50' : 'bg-rose-950/50 border-rose-500/50'}">
              <div class="font-hud text-[9px] font-bold text-stone-400 leading-none">T${i + 1}</div>
              <div class="font-hud text-xs font-black leading-tight mt-0.5 ${ok ? 'text-emerald-300' : 'text-rose-200'}">
                ${formatSigned(entry.value)}
              </div>
              <div class="font-hud text-[9px] font-bold leading-none ${ok ? 'text-emerald-400' : 'text-rose-400'}">
                ${ok ? '✓' : `±${entry.deviation}`}
              </div>
            </div>
          `;
        }
        const isCurrent = i === completed && !isFinished;
        return `
          <div class="rounded-lg px-1 py-1 text-center border ${isCurrent ? 'bg-cyan-950/40 border-cyan-500/60 animate-pulse' : 'bg-stone-900/60 border-stone-800'}">
            <div class="font-hud text-[9px] font-bold ${isCurrent ? 'text-cyan-300' : 'text-stone-500'} leading-none">T${i + 1}</div>
            <div class="font-hud text-xs font-bold text-stone-600 leading-tight mt-0.5">—</div>
            <div class="font-hud text-[9px] text-stone-700 leading-none">·</div>
          </div>
        `;
      }).join('');

      // Animación CSS adicional sobre el minero pixel-art
      const minerAnimClass = (animatedCrewId === crew.id && animType === 'exact')
        ? 'anim-exact'
        : (animatedCrewId === crew.id && animType === 'error')
          ? 'anim-error'
          : '';

      const lastDevHtml = crew.lastDeviation === null
        ? '<span class="text-stone-500">—</span>'
        : crew.lastDeviation === 0
          ? '<span class="text-emerald-400 font-black">0 ✓</span>'
          : `<span class="text-rose-400 font-black">±${crew.lastDeviation}</span>`;

      const totalErrColor = crew.totalError === 0
        ? 'text-emerald-400'
        : crew.totalError <= 10
          ? 'text-amber-400'
          : 'text-rose-400';

      // Panel táctil inferior: entrada manual clásica + botón "🎯 Reto Tramo"
      let actionHtml = '';
      if (!isFinished) {
        actionHtml = `
          <div class="space-y-1.5">
            <!-- Fila 1: Entrada manual clásica (ficha impresa / cálculo libre) -->
            <div class="flex items-center gap-1.5">
              <button type="button" onclick="toggleSign(${crew.id})" title="Cambiar signo (+/-)"
                class="w-10 h-10 shrink-0 rounded-xl bg-stone-800 hover:bg-stone-700 border-2 border-stone-600 text-cyan-300 font-black text-base flex items-center justify-center transition active:scale-90">
                +/−
              </button>
              <input id="input-crew-${crew.id}" type="number" inputmode="numeric" placeholder="Ej: -4"
                onkeydown="if(event.key==='Enter') applyTramo(${crew.id})"
                class="w-full min-w-0 h-10 px-2 rounded-xl bg-stone-900 border-2 border-stone-700 focus:border-cyan-400 text-center text-white font-black text-xl outline-none" />
              <button type="button" onclick="applyTramo(${crew.id})" title="Aplicar coordenada manual al Tramo ${currentTramo}"
                class="h-10 px-2.5 shrink-0 rounded-xl font-black text-xs sm:text-sm text-white shadow-lg transition active:scale-95 border border-white/15 whitespace-nowrap"
                style="background: linear-gradient(135deg, ${crew.accentHex}, #1c1917 175%);">
                Aplicar T${currentTramo}
              </button>
            </div>
            <!-- Fila 2: Reto del Banco de Ejercicios + Deshacer -->
            <div class="flex items-center gap-1.5">
              <button type="button" onclick="openRetoModal(${crew.id})"
                class="flex-1 h-10 px-2.5 rounded-xl reto-tramo-btn font-black text-xs sm:text-sm text-white flex items-center justify-center gap-1.5 transition active:scale-95 border border-cyan-300/40 whitespace-nowrap">
                <span>🎯</span>
                <span>Reto Tramo ${currentTramo}</span>
              </button>
              <button type="button" onclick="undoTramo(${crew.id})" ${completed === 0 ? 'disabled' : ''}
                title="Deshacer último tramo"
                class="h-10 px-2.5 shrink-0 rounded-xl bg-stone-800 hover:bg-stone-700 disabled:opacity-35 disabled:pointer-events-none border border-stone-600 text-stone-200 font-bold text-xs transition active:scale-95 whitespace-nowrap">
                ↶ Deshacer
              </button>
            </div>
          </div>
        `;
      } else if (showLocateBtn) {
        actionHtml = `
          <div class="space-y-1.5">
            <button type="button" onclick="openVictoryScreen(${crew.id}, '${winMode}')"
              class="w-full h-12 px-3 rounded-xl locate-signal-btn font-black text-sm sm:text-base tracking-wide uppercase flex items-center justify-center gap-2 transition active:scale-95 border-2 border-yellow-200">
              <span class="text-lg">📡</span>
              <span>¡LOCALIZAR SEÑAL!</span>
            </button>
            <div class="flex items-center justify-between">
              <span class="text-[11px] font-extrabold ${winMode === 'perfect' ? 'text-emerald-400' : 'text-amber-300'}">
                ${winMode === 'perfect' ? '✦ ¡5/5 exactos (0 errores)!' : '✦ Más cercana a la señal'}
              </span>
              <button type="button" onclick="undoTramo(${crew.id})"
                class="px-2.5 py-1 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 text-[11px] font-bold transition">
                ↶ Deshacer
              </button>
            </div>
          </div>
        `;
      } else {
        const waitMsg = (allFourFinished || state.forceResolved)
          ? 'Ruta completada (otra cuadrilla quedó más cerca)'
          : '5 tramos completados · Esperando al resto...';
        actionHtml = `
          <div class="space-y-1.5">
            <div class="w-full py-2.5 px-2.5 rounded-xl bg-stone-900/90 border border-stone-700 text-center">
              <p class="text-xs font-bold text-amber-200/90 leading-snug">${waitMsg}</p>
            </div>
            <div class="flex justify-end">
              <button type="button" onclick="undoTramo(${crew.id})"
                class="px-2.5 py-1 rounded-lg bg-stone-800 hover:bg-stone-700 border border-stone-700 text-stone-300 text-[11px] font-bold transition">
                ↶ Deshacer último tramo
              </button>
            </div>
          </div>
        `;
      }

      const minerCanvasHtml = root.RadarPixelArt
        ? root.RadarPixelArt.buildMinerCanvasMarkup(crew)
        : '';
      const crystalLeftHtml = root.RadarPixelArt
        ? root.RadarPixelArt.buildCrystalCanvasMarkup(crew.crystalColor, 'left', 26 + crew.id * 4, crew.id * 3)
        : '';
      const crystalRightHtml = root.RadarPixelArt
        ? root.RadarPixelArt.buildCrystalCanvasMarkup(crystalSecondary[crew.id], 'right', 64 - crew.id * 3, crew.id * 5 + 2)
        : '';
      const lavaCanvasHtml = root.RadarPixelArt
        ? root.RadarPixelArt.buildLavaCanvasMarkup(crew.id)
        : '';

      return `
        <article class="flex flex-col bg-stone-950/88 border-2 ${crew.borderClass} rounded-2xl overflow-hidden shadow-2xl backdrop-blur-sm min-w-0 min-h-0">

          <!-- Cabecera de la Cuadrilla -->
          <div class="h-[78px] shrink-0 px-3 py-1.5 border-b border-stone-800 flex flex-col justify-between"
               style="background: linear-gradient(180deg, ${crew.bgTint}, rgba(10,9,8,0.92));">
            <div class="flex items-center justify-between gap-2">
              <button type="button" onclick="openRenameModal(${crew.id})" title="Haz clic para editar el nombre"
                class="group flex items-center gap-1.5 text-left min-w-0 hover:opacity-90 transition">
                <span class="w-3 h-3 rounded-full shrink-0 border border-white/40" style="background-color: ${crew.accentHex}"></span>
                <h2 class="font-black text-base sm:text-lg text-white truncate group-hover:text-cyan-300 transition">${escapeHtml(crew.name)}</h2>
                <span class="text-xs text-stone-400 group-hover:text-cyan-300 shrink-0">✎</span>
              </button>
              <span class="font-hud px-2 py-0.5 rounded-lg text-xs font-black shrink-0 ${crew.badgeClass}">
                ${isFinished ? '5 / 5' : `Tramo ${currentTramo} / 5`}
              </span>
            </div>

            <!-- Posición Actual Grande -->
            <div class="flex items-baseline justify-between gap-2">
              <span class="text-[11px] font-bold uppercase tracking-wider text-stone-400">Posición actual:</span>
              <span class="font-hud text-2xl sm:text-3xl font-black tracking-tight ${crew.position === 0 ? 'text-amber-300' : crew.position < 0 ? 'text-white' : 'text-sky-300'}">
                ${formatSigned(crew.position)} m
              </span>
            </div>
          </div>

          <!-- Galería Subterránea Vertical -->
          <div class="shaft-container relative flex-1 min-h-[240px]">
            <div class="shaft-beam-left"></div>
            <div class="shaft-beam-right"></div>
            <div class="radar-scanline" style="animation-delay: ${crew.id * 1.4}s"></div>

            <!-- Estalactitas superiores -->
            <svg class="absolute top-0 left-0 right-0 w-full h-6 z-[3] pointer-events-none" viewBox="0 0 240 24" preserveAspectRatio="none">
              <polygon points="0,0 240,0 240,7 216,19 196,6 170,17 146,5 120,22 96,6 68,18 42,6 20,19 0,9" fill="#14100e" stroke="#2d221d" stroke-width="1"/>
            </svg>

            <!-- Cristales pixel-art brillantes en las paredes -->
            ${crystalLeftHtml}
            ${crystalRightHtml}

            <!-- Grietas de magma -->
            <svg class="magma-crack w-12 h-20 left-3 top-[42%]" viewBox="0 0 40 80">
              <path d="M5,5 L18,26 L10,45 L24,72" stroke="#ff5500" stroke-width="2" fill="none"/>
            </svg>
            <svg class="magma-crack w-12 h-20 right-3 top-[70%]" viewBox="0 0 40 80" style="animation-delay: 1.5s">
              <path d="M35,5 L20,30 L28,50 L14,75" stroke="#ea580c" stroke-width="2" fill="none"/>
            </svg>

            <!-- Zona de señal compacta anómala -->
            <div class="anomaly-zone" style="top: ${zoneTop}%; height: ${zoneHeight}%;"></div>

            <!-- Líneas de cota horizontales -->
            ${depthLines.map((m) => {
              const lineTop = depthToPercent(m);
              const isZero = m === 0;
              return `
                <div class="absolute left-3 right-3 border-t ${isZero ? 'border-amber-400/55 border-dashed' : 'border-stone-700/35 border-dotted'} pointer-events-none z-[2]" style="top: ${lineTop}%">
                  <span class="lg:hidden absolute right-1 -top-3.5 font-hud text-[9px] font-bold ${isZero ? 'text-amber-300' : 'text-stone-500'}">${m}m</span>
                </div>
              `;
            }).join('')}

            <!-- Minero 16-bit Pixel Art Animado -->
            <div id="miner-${crew.id}" class="miner-wrapper ${minerAnimClass}" style="top: ${topPct}%">
              <div class="relative flex flex-col items-center">
                ${minerCanvasHtml}
                <span class="mt-[-4px] font-hud px-2 py-0.5 rounded-full text-[11px] font-black bg-stone-950/92 border border-stone-600 text-amber-200 shadow-lg">
                  ${formatSigned(crew.position)} m ${outOfRange ? '⚠' : ''}
                </span>
              </div>
            </div>

            <!-- Suelo de lava pixel-art burbujeante -->
            <div class="lava-floor">
              ${lavaCanvasHtml}
            </div>
          </div>

          <!-- Panel de Controles, Errores e Historial Compacto -->
          <div class="h-[232px] shrink-0 p-2.5 bg-stone-950 border-t border-stone-800 flex flex-col justify-between gap-2">

            <!-- Entrada manual + Reto Tramo o botón "¡LOCALIZAR SEÑAL!" -->
            ${actionHtml}

            <!-- Indicadores de Error del último tramo y Error Acumulado -->
            <div class="grid grid-cols-2 gap-1.5">
              <div class="rounded-xl bg-stone-900/90 border border-stone-800 px-2 py-1.5 text-center">
                <p class="text-[9px] font-bold uppercase tracking-wider text-stone-400 leading-none">Error último tramo</p>
                <p class="font-hud text-lg font-black mt-0.5 leading-tight">${lastDevHtml}</p>
              </div>
              <div class="rounded-xl bg-stone-900/90 border border-stone-800 px-2 py-1.5 text-center">
                <p class="text-[9px] font-bold uppercase tracking-wider text-stone-400 leading-none">Error acumulado</p>
                <p class="font-hud text-lg font-black mt-0.5 leading-tight ${totalErrColor}">${crew.totalError}</p>
              </div>
            </div>

            <!-- Historial compacto de los 5 tramos -->
            <div class="grid grid-cols-5 gap-1">
              ${compactHistoryHtml}
            </div>

          </div>
        </article>
      `;
    }).join('');

    // Restaurar valores escritos en los demás inputs
    state.crews.forEach((c) => {
      if (c.id !== animatedCrewId && savedInputs[c.id] !== undefined) {
        const inp = document.getElementById(`input-crew-${c.id}`);
        if (inp) inp.value = savedInputs[c.id];
      }
    });

    // Sincronizar todos los lienzos 16-bit recién renderizados
    if (root.RadarPixelArt) {
      root.RadarPixelArt.syncCanvases(state.crews);
    }

    updateHeaderHud();
  }

  /* ============================================================================
     AVANCE DE TRAMOS (MANUAL Y POR RETO)
     ============================================================================ */
  function advanceCrewByValue(crewId, value, opts = {}) {
    const crew = state.crews[crewId];
    if (!crew || crew.entries.length >= TOTAL_TRAMOS) return;

    const tramoIdx = crew.entries.length;
    const expected = state.correctAnswers[tramoIdx];
    const deviation = Math.abs(value - expected);

    crew.position += value;
    crew.lastDeviation = deviation;
    crew.totalError += deviation;
    crew.entries.push({
      value,
      expected,
      deviation,
      posAfter: crew.position,
      viaReto: Boolean(opts.viaReto)
    });

    const animType = deviation === 0 ? 'exact' : 'error';

    if (root.RadarPixelArt) {
      root.RadarPixelArt.triggerMinerAnim(crewId, animType);
    }

    if (!opts.soundAlreadyPlayed && root.SoundEngine) {
      if (deviation === 0) {
        root.SoundEngine.playExactRadar();
      } else {
        root.SoundEngine.playErrorAlert();
      }
    }

    if (deviation === 0) {
      showToast(`${crew.name}: ¡Tramo ${tramoIdx + 1} exacto! (${formatSigned(value)} m · Desvío 0)`, 'success');
    } else {
      showToast(`${crew.name}: Tramo ${tramoIdx + 1} con desvío de ±${deviation} m`, 'error');
    }

    renderCrews(crewId, animType);

    if (!opts.viaReto) {
      const nextInp = document.getElementById(`input-crew-${crewId}`);
      if (nextInp) nextInp.focus();
    }
  }

  // Botón rápido "+/-"
  root.toggleSign = function (crewId) {
    const inp = document.getElementById(`input-crew-${crewId}`);
    if (!inp) return;
    const raw = inp.value.trim();
    if (raw === '' || raw === '-') {
      inp.value = raw === '-' ? '' : '-';
      inp.focus();
      return;
    }
    const num = parseInt(raw, 10);
    if (!Number.isNaN(num)) {
      inp.value = String(-num);
    }
    inp.focus();
  };

  // Aplicar desplazamiento manual de un tramo
  root.applyTramo = function (crewId) {
    const crew = state.crews[crewId];
    if (!crew || crew.entries.length >= TOTAL_TRAMOS) return;

    const inp = document.getElementById(`input-crew-${crewId}`);
    if (!inp) return;
    const raw = inp.value.trim();

    if (raw === '' || Number.isNaN(Number(raw)) || !Number.isInteger(Number(raw))) {
      showToast('Introduce un número entero válido (positivo o negativo).', 'error');
      inp.focus();
      return;
    }

    const value = parseInt(raw, 10);
    advanceCrewByValue(crewId, value, { viaReto: false });
  };

  // Deshacer último tramo
  root.undoTramo = function (crewId) {
    const crew = state.crews[crewId];
    if (!crew || crew.entries.length === 0) return;

    crew.entries.pop();
    recalculateCrew(crew);
    if (state.crews.every((c) => c.entries.length < TOTAL_TRAMOS)) {
      state.forceResolved = false;
    }
    if (root.SoundEngine) root.SoundEngine.playUndo();
    renderCrews();
  };

  function recalculateCrew(crew) {
    let pos = 0;
    let err = 0;
    let lastDev = null;

    crew.entries.forEach((entry, idx) => {
      const expected = state.correctAnswers[idx];
      const dev = Math.abs(entry.value - expected);
      pos += entry.value;
      err += dev;
      lastDev = dev;
      entry.expected = expected;
      entry.deviation = dev;
      entry.posAfter = pos;
    });

    crew.position = pos;
    crew.totalError = err;
    crew.lastDeviation = lastDev;
  }

  /* ============================================================================
     MODAL DE RETO DE TRAMO (CONECTADO A BANCO DE EJERCICIOS)
     ============================================================================ */
  function loadFreshRetoExercise() {
    if (!selectorEjercicios) {
      showToast('El Banco de Ejercicios no está disponible.', 'error');
      return false;
    }

    let ej;
    try {
      ej = selectorEjercicios.solicitarEjercicio();
    } catch (err) {
      showToast('No se pudo generar un ejercicio del Banco.', 'error');
      return false;
    }

    retoState.ejercicio = ej;
    retoState.answered = false;
    retoState.pendingValue = null;
    retoState.pendingWasCorrect = false;
    retoState.committed = false;

    const temaBadge = document.getElementById('retoTemaBadge');
    const nivelBadge = document.getElementById('retoNivelBadge');
    const tipoBadge = document.getElementById('retoTipoBadge');
    const enunciadoEl = document.getElementById('retoEnunciado');
    const optionsGrid = document.getElementById('retoOptionsGrid');
    const feedbackBox = document.getElementById('retoFeedbackBox');
    const footerActions = document.getElementById('retoFooterActions');

    if (temaBadge) temaBadge.textContent = ej.temaLabel || ej.tema;
    if (nivelBadge) nivelBadge.textContent = ej.nivelLabel || ej.nivel;
    if (tipoBadge) tipoBadge.textContent = ej.tipoLabel || ej.tipo;
    if (enunciadoEl) enunciadoEl.textContent = ej.enunciado;
    if (feedbackBox) feedbackBox.classList.add('hidden');
    if (footerActions) footerActions.classList.remove('hidden');

    const letters = ['A', 'B', 'C', 'D'];
    if (optionsGrid) {
      optionsGrid.innerHTML = ej.opciones.map((opt, idx) => `
        <button type="button" data-reto-opt="${idx}"
          class="reto-option-btn group flex items-center gap-3 w-full text-left px-4 py-3.5 rounded-2xl bg-stone-900/95 border-2 border-stone-700 text-stone-100 font-bold text-base sm:text-lg shadow-lg">
          <span class="w-9 h-9 shrink-0 rounded-xl bg-stone-800 group-hover:bg-cyan-500/20 border border-stone-600 group-hover:border-cyan-400/70 text-cyan-300 font-hud font-black text-base flex items-center justify-center">
            ${letters[idx]}
          </span>
          <span class="flex-1 leading-snug break-words">${escapeHtml(opt)}</span>
        </button>
      `).join('');

      optionsGrid.querySelectorAll('[data-reto-opt]').forEach((btn) => {
        btn.addEventListener('click', () => {
          handleRetoOptionClick(Number(btn.dataset.retoOpt));
        });
      });
    }

    return true;
  }

  root.openRetoModal = function (crewId) {
    const crew = state.crews[crewId];
    if (!crew || crew.entries.length >= TOTAL_TRAMOS) return;

    if (retoState.autoTimer) {
      clearTimeout(retoState.autoTimer);
      retoState.autoTimer = null;
    }

    retoState.crewId = crewId;
    retoState.open = true;

    const crewDot = document.getElementById('retoCrewDot');
    const crewName = document.getElementById('retoCrewName');
    const tramoBadge = document.getElementById('retoTramoBadge');
    const modal = document.getElementById('retoModal');

    if (crewDot) crewDot.style.backgroundColor = crew.accentHex;
    if (crewName) crewName.textContent = crew.name;
    if (tramoBadge) {
      tramoBadge.textContent = `Tramo ${crew.entries.length + 1} / ${TOTAL_TRAMOS}`;
      tramoBadge.className = `font-hud px-2.5 py-1 rounded-lg text-xs font-black ${crew.badgeClass}`;
    }

    if (!loadFreshRetoExercise()) {
      retoState.open = false;
      return;
    }

    if (root.SoundEngine) root.SoundEngine.playScanBeep();
    if (modal) modal.classList.remove('hidden');
  };

  function handleRetoOptionClick(chosenIdx) {
    if (!retoState.open || retoState.answered || !retoState.ejercicio) return;

    const crew = state.crews[retoState.crewId];
    if (!crew || crew.entries.length >= TOTAL_TRAMOS) return;

    retoState.answered = true;
    const ej = retoState.ejercicio;
    const isCorrect = chosenIdx === ej.indiceCorrecto;
    const tramoIdx = crew.entries.length;
    const expected = state.correctAnswers[tramoIdx];

    let appliedValue = expected;
    let deltaMag = 0;
    if (!isCorrect) {
      deltaMag = Math.random() < 0.5 ? 3 : 4;
      const sign = Math.random() < 0.5 ? 1 : -1;
      appliedValue = expected + sign * deltaMag;
    }

    retoState.pendingValue = appliedValue;
    retoState.pendingWasCorrect = isCorrect;

    // Estilizar las 4 opciones bloqueadas
    const buttons = document.querySelectorAll('#retoOptionsGrid [data-reto-opt]');
    buttons.forEach((btn) => {
      const idx = Number(btn.dataset.retoOpt);
      btn.disabled = true;
      btn.classList.remove('border-stone-700', 'bg-stone-900/95');
      if (idx === ej.indiceCorrecto) {
        btn.classList.add('border-emerald-400', 'bg-emerald-950/75', 'text-emerald-100', 'shadow-[0_0_20px_rgba(16,185,129,0.35)]');
      } else if (idx === chosenIdx && !isCorrect) {
        btn.classList.add('border-rose-500', 'bg-rose-950/75', 'text-rose-100');
      } else {
        btn.classList.add('border-stone-800', 'bg-stone-950/60', 'opacity-50');
      }
    });

    // Sonido inmediato
    if (root.SoundEngine) {
      if (isCorrect) {
        root.SoundEngine.playExactRadar();
      } else {
        root.SoundEngine.playErrorAlert();
      }
    }

    // Mostrar explicación y resultado
    const footerActions = document.getElementById('retoFooterActions');
    const feedbackBox = document.getElementById('retoFeedbackBox');
    const fbTitle = document.getElementById('retoFeedbackTitle');
    const fbDetail = document.getElementById('retoFeedbackDetail');
    const fbDelta = document.getElementById('retoFeedbackDelta');

    if (footerActions) footerActions.classList.add('hidden');
    if (feedbackBox) {
      feedbackBox.classList.remove('hidden');
      feedbackBox.className = isCorrect
        ? 'mt-4 p-4 rounded-2xl border-2 border-emerald-500/70 bg-emerald-950/45 space-y-2'
        : 'mt-4 p-4 rounded-2xl border-2 border-rose-500/70 bg-rose-950/45 space-y-2';
    }
    if (fbTitle) {
      fbTitle.className = isCorrect
        ? 'font-black text-base sm:text-lg text-emerald-300'
        : 'font-black text-base sm:text-lg text-rose-300';
      fbTitle.textContent = isCorrect
        ? `✓ ¡COORDINACIÓN EXACTA! Tramo ${tramoIdx + 1} superado`
        : `✕ DESVÍO DETECTADO · Respuesta correcta: ${ej.respuestaCorrecta}`;
    }
    if (fbDetail) {
      fbDetail.textContent = ej.explicacion || '';
    }
    if (fbDelta) {
      fbDelta.className = isCorrect
        ? 'inline-flex items-center gap-1.5 font-hud text-xs font-extrabold px-3 py-1 rounded-xl bg-emerald-500/20 text-emerald-200 border border-emerald-400/50'
        : 'inline-flex items-center gap-1.5 font-hud text-xs font-extrabold px-3 py-1 rounded-xl bg-rose-500/20 text-rose-200 border border-rose-400/50';
      fbDelta.textContent = isCorrect
        ? `📡 Avance exacto: ${formatSigned(appliedValue)} m (Desvío 0)`
        : `⚠ Desprendimiento: avance ${formatSigned(appliedValue)} m (Desvío ±${deltaMag} m)`;
    }

    // Avance automático tras mostrar brevemente la explicación (también puede pulsar "Continuar ahora")
    const delayMs = isCorrect ? 2200 : 3000;
    retoState.autoTimer = setTimeout(() => {
      commitPendingRetoAndClose();
    }, delayMs);
  }

  function commitPendingRetoAndClose() {
    if (retoState.autoTimer) {
      clearTimeout(retoState.autoTimer);
      retoState.autoTimer = null;
    }

    const modal = document.getElementById('retoModal');
    if (modal) modal.classList.add('hidden');

    const shouldAdvance = retoState.answered && !retoState.committed && retoState.crewId !== null && retoState.pendingValue !== null;
    const targetCrewId = retoState.crewId;
    const targetValue = retoState.pendingValue;

    retoState.committed = true;
    retoState.open = false;
    retoState.crewId = null;
    retoState.ejercicio = null;
    retoState.pendingValue = null;

    if (shouldAdvance) {
      advanceCrewByValue(targetCrewId, targetValue, {
        viaReto: true,
        soundAlreadyPlayed: true
      });
    }
  }

  function closeRetoModal() {
    if (retoState.answered && !retoState.committed) {
      commitPendingRetoAndClose();
      return;
    }
    if (retoState.autoTimer) {
      clearTimeout(retoState.autoTimer);
      retoState.autoTimer = null;
    }
    retoState.open = false;
    retoState.crewId = null;
    retoState.ejercicio = null;
    const modal = document.getElementById('retoModal');
    if (modal) modal.classList.add('hidden');
  }

  /* ============================================================================
     PANTALLA FINAL DEL COFRE EGIPCIO
     ============================================================================ */
  root.openVictoryScreen = function (crewId, winMode) {
    const clickedCrew = state.crews[crewId];
    if (!clickedCrew) return;

    const { finishedCrews, minError } = getSignalEligibility();

    let titleText = clickedCrew.name;
    let subText = '★ Coordenadas Exactas (0 errores)';
    let subClass = 'px-4 py-1 rounded-xl text-xs sm:text-base font-extrabold bg-emerald-500/20 text-emerald-300 border border-emerald-400/60';

    if (winMode === 'closest') {
      const tied = finishedCrews.filter((c) => c.totalError === minError);
      if (tied.length > 1) {
        titleText = tied.map((c) => c.name).join(' & ');
      }
      subText = `✦ Señal localizada por aproximación (Error acumulado: ${clickedCrew.totalError})`;
      subClass = 'px-4 py-1 rounded-xl text-xs sm:text-base font-extrabold bg-amber-500/20 text-amber-200 border border-amber-400/60';
    }

    document.getElementById('victoryCrewTitle').textContent = titleText;
    const subEl = document.getElementById('victoryCrewSubtitle');
    subEl.textContent = subText;
    subEl.className = subClass;

    document.getElementById('victoryScreen').classList.remove('hidden');
    if (root.RadarEffects) root.RadarEffects.VictoryFireCanvas.start();
    if (root.RadarPixelArt) root.RadarPixelArt.startChestReveal();
    if (root.SoundEngine) root.SoundEngine.playVictoryFanfare();
  };

  function closeVictoryScreen() {
    if (root.SoundEngine) root.SoundEngine.stopVictoryMusic();
    if (root.RadarEffects) root.RadarEffects.VictoryFireCanvas.stop();
    if (root.RadarPixelArt) root.RadarPixelArt.stopChestReveal();
    document.getElementById('victoryScreen').classList.add('hidden');
  }

  /* ============================================================================
     MODALES (DOCENTE Y RENOMBRAR)
     ============================================================================ */
  root.openRenameModal = function (crewId) {
    const crew = state.crews[crewId];
    if (!crew) return;
    state.editingCrewId = crewId;
    const modal = document.getElementById('renameModal');
    const input = document.getElementById('renameInput');
    input.value = crew.name;
    modal.classList.remove('hidden');
    setTimeout(() => {
      input.focus();
      input.select();
    }, 40);
  };

  function closeRenameModal() {
    document.getElementById('renameModal').classList.add('hidden');
    state.editingCrewId = null;
  }

  function confirmRename() {
    if (state.editingCrewId === null) return;
    const val = document.getElementById('renameInput').value.trim();
    if (val) {
      state.crews[state.editingCrewId].name = val;
      renderCrews();
    }
    closeRenameModal();
  }

  function updateSoundUI() {
    if (root.SoundEngine) {
      root.SoundEngine.setEnabled(state.soundEnabled);
    }
    const quickIcon = document.getElementById('quickSoundIcon');
    const modalBtn = document.getElementById('modalSoundBtn');
    if (quickIcon) quickIcon.textContent = state.soundEnabled ? '🔊' : '🔇';
    if (modalBtn) {
      modalBtn.textContent = state.soundEnabled ? '🔊 Activado' : '🔇 Silenciado';
      modalBtn.className = state.soundEnabled
        ? 'px-4 py-2 rounded-xl font-bold text-sm transition border bg-emerald-600/20 border-emerald-500/60 text-emerald-300'
        : 'px-4 py-2 rounded-xl font-bold text-sm transition border bg-stone-800 border-stone-600 text-stone-400';
    }
  }

  function renderAnswersEditor() {
    const grid = document.getElementById('answersInputsGrid');
    if (!grid) return;
    grid.innerHTML = state.correctAnswers.map((val, idx) => `
      <div class="bg-stone-950 border border-stone-700 rounded-xl p-2 text-center">
        <label for="ans-t-${idx}" class="block text-[11px] font-bold text-stone-400 mb-1">Tramo ${idx + 1}</label>
        <input id="ans-t-${idx}" type="number" value="${val}"
          class="w-full py-1.5 px-1 rounded-lg bg-stone-900 border border-stone-700 focus:border-cyan-400 text-center text-white font-black text-base outline-none" />
      </div>
    `).join('');

    const sum = state.correctAnswers.reduce((a, b) => a + b, 0);
    document.getElementById('answersFinalPreview').textContent = `Posición final exacta: ${formatSigned(sum)} m`;
  }

  function renderResetButton() {
    const zone = document.getElementById('resetActionZone');
    if (!zone) return;
    zone.innerHTML = `
      <button id="askResetBtn" type="button"
        class="px-4 py-2 rounded-xl bg-red-700 hover:bg-red-600 text-white font-bold text-xs sm:text-sm transition active:scale-95">
        Reiniciar partida
      </button>
    `;
    document.getElementById('askResetBtn').addEventListener('click', () => {
      zone.innerHTML = `
        <div class="flex items-center gap-2">
          <button id="cancelResetBtn" type="button"
            class="px-3 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 font-bold text-xs transition">
            Cancelar
          </button>
          <button id="confirmResetBtn" type="button"
            class="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-black text-xs transition shadow-lg">
            Sí, reiniciar todo
          </button>
        </div>
      `;
      document.getElementById('cancelResetBtn').addEventListener('click', renderResetButton);
      document.getElementById('confirmResetBtn').addEventListener('click', () => {
        state.forceResolved = false;
        state.crews.forEach((c) => {
          c.entries = [];
          c.position = 0;
          c.lastDeviation = null;
          c.totalError = 0;
          if (root.RadarPixelArt) {
            root.RadarPixelArt.triggerMinerAnim(c.id, 'idle');
            root.RadarPixelArt.setCrewFinished(c.id, false);
          }
        });
        renderCrews();
        renderResetButton();
        document.getElementById('teacherModal').classList.add('hidden');
        showToast('Partida reiniciada. Todas las cuadrillas vuelven a 0 m.', 'info');
      });
    });
  }

  /* ============================================================================
     PANTALLA COMPLETA (VÍA BancoUI.bindFullscreenButton CON RESPALDO)
     ============================================================================ */
  function initFullscreenControls() {
    if (root.BancoUI && typeof root.BancoUI.bindFullscreenButton === 'function') {
      root.BancoUI.bindFullscreenButton('#btnFullscreen', {
        enterText: '⛶ Pantalla',
        exitText: '🗗 Salir'
      });
      root.BancoUI.bindFullscreenButton('#btnFullscreenVictory', {
        enterText: '⛶ Pantalla completa',
        exitText: '🗗 Salir pantalla'
      });
      return;
    }

    // Respaldo limpio si BancoUI no estuviera presente
    const pairs = [
      { id: 'btnFullscreen', enter: '⛶ Pantalla', exit: '🗗 Salir' },
      { id: 'btnFullscreenVictory', enter: '⛶ Pantalla completa', exit: '🗗 Salir pantalla' }
    ];

    function sync() {
      const isFs = Boolean(document.fullscreenElement || document.webkitFullscreenElement);
      pairs.forEach(({ id, enter, exit }) => {
        const btn = document.getElementById(id);
        if (!btn) return;
        btn.textContent = isFs ? exit : enter;
        btn.setAttribute('aria-pressed', String(isFs));
      });
    }

    function toggle() {
      const el = document.documentElement;
      if (!document.fullscreenElement && !document.webkitFullscreenElement) {
        const fn = el.requestFullscreen || el.webkitRequestFullscreen;
        if (fn) Promise.resolve(fn.call(el)).catch(() => {});
      } else {
        const fn = document.exitFullscreen || document.webkitExitFullscreen;
        if (fn) Promise.resolve(fn.call(document)).catch(() => {});
      }
    }

    pairs.forEach(({ id }) => {
      const btn = document.getElementById(id);
      if (btn) btn.addEventListener('click', toggle);
    });
    document.addEventListener('fullscreenchange', sync);
    document.addEventListener('webkitfullscreenchange', sync);
    sync();
  }

  /* ============================================================================
     CONEXIÓN CON BANCO DE EJERCICIOS (SELECTOR)
     ============================================================================ */
  function initBancoEjercicios() {
    if (!root.BancoUI || typeof root.BancoUI.crearSelector !== 'function') {
      updateHeaderSubtitle();
      return;
    }

    selectorEjercicios = root.BancoUI.crearSelector({
      gameId: 'radar',
      defaultTemas: ['enteros'],
      defaultNivel: '1eso',
      defaultTipo: 'mixto',
      notaModalidad: 'Se aplicará a todos los botones "🎯 Reto Tramo" de las 4 cuadrillas. La entrada manual sigue siempre disponible.',
      onChange: () => {
        updateHeaderSubtitle();
        showToast(`Banco actualizado: ${selectorEjercicios.getResumenDetallado()}`, 'info');
      }
    });

    const btnSelector = document.getElementById('btnSelectorEjercicios');
    if (btnSelector) {
      selectorEjercicios.bindButton(btnSelector);
    }

    updateHeaderSubtitle();
  }

  /* ============================================================================
     INICIALIZACIÓN Y EVENTOS
     ============================================================================ */
  root.addEventListener('DOMContentLoaded', () => {
    if (root.SoundEngine) {
      root.SoundEngine.setOnEnableCallback((enabled) => {
        state.soundEnabled = enabled;
        updateSoundUI();
      });
    }

    initBancoEjercicios();
    initFullscreenControls();
    renderDepthRuler();
    renderCrews();
    updateSoundUI();

    if (root.RadarEffects) {
      root.RadarEffects.initMineParticles();
    }

    // Sonido rápido
    document.getElementById('quickSoundBtn').addEventListener('click', () => {
      state.soundEnabled = !state.soundEnabled;
      updateSoundUI();
      showToast(state.soundEnabled ? 'Sonido activado' : 'Sonido silenciado', 'info');
    });

    // Modal de Reto Tramo
    const retoModal = document.getElementById('retoModal');
    document.getElementById('retoCloseBtn').addEventListener('click', closeRetoModal);
    document.getElementById('retoCancelBtn').addEventListener('click', closeRetoModal);
    document.getElementById('retoContinueBtn').addEventListener('click', commitPendingRetoAndClose);
    document.getElementById('retoRerollBtn').addEventListener('click', () => {
      if (retoState.answered) return;
      loadFreshRetoExercise();
      if (root.SoundEngine) root.SoundEngine.playScanBeep();
    });
    retoModal.addEventListener('click', (e) => {
      if (e.target === retoModal) closeRetoModal();
    });

    // Modal Docente
    const teacherModal = document.getElementById('teacherModal');
    document.getElementById('openTeacherBtn').addEventListener('click', () => {
      renderAnswersEditor();
      renderResetButton();
      document.getElementById('answersEditorBox').classList.add('hidden');
      document.getElementById('forceResolveStatus').classList.add('hidden');
      teacherModal.classList.remove('hidden');
    });

    document.getElementById('closeTeacherBtn').addEventListener('click', () => {
      teacherModal.classList.add('hidden');
    });

    teacherModal.addEventListener('click', (e) => {
      if (e.target === teacherModal) teacherModal.classList.add('hidden');
    });

    // Botón "Resolver con equipos terminados"
    document.getElementById('forceResolveBtn').addEventListener('click', () => {
      const finished = state.crews.filter((c) => c.entries.length === TOTAL_TRAMOS);
      const statusEl = document.getElementById('forceResolveStatus');
      if (finished.length === 0) {
        statusEl.textContent = 'Todavía ninguna cuadrilla ha completado los 5 tramos.';
        statusEl.classList.remove('hidden');
        return;
      }
      state.forceResolved = true;
      renderCrews();
      teacherModal.classList.add('hidden');
      showToast('Resolución activada: el botón del cofre aparece en la cuadrilla más cercana.', 'success');
    });

    // Sonido desde el modal docente
    document.getElementById('modalSoundBtn').addEventListener('click', () => {
      state.soundEnabled = !state.soundEnabled;
      updateSoundUI();
    });

    // Mostrar / ocultar soluciones
    document.getElementById('toggleAnswersBtn').addEventListener('click', () => {
      document.getElementById('answersEditorBox').classList.toggle('hidden');
    });

    // Restaurar soluciones originales
    document.getElementById('restoreDefaultsBtn').addEventListener('click', () => {
      state.correctAnswers = [...DEFAULT_ANSWERS];
      state.crews.forEach(recalculateCrew);
      renderAnswersEditor();
      renderCrews();
      showToast('Se han restaurado las 5 coordenadas originales.', 'info');
    });

    // Guardar soluciones editadas
    document.getElementById('saveAnswersBtn').addEventListener('click', () => {
      const updated = [];
      for (let i = 0; i < TOTAL_TRAMOS; i++) {
        const inp = document.getElementById(`ans-t-${i}`);
        const val = parseInt(inp.value, 10);
        if (Number.isNaN(val)) {
          showToast(`El Tramo ${i + 1} debe ser un número entero válido.`, 'error');
          return;
        }
        updated.push(val);
      }
      state.correctAnswers = updated;
      state.crews.forEach(recalculateCrew);
      renderAnswersEditor();
      renderCrews();
      showToast('Coordenadas actualizadas y errores recalculados.', 'success');
    });

    // Modal Renombrar
    document.getElementById('cancelRenameBtn').addEventListener('click', closeRenameModal);
    document.getElementById('confirmRenameBtn').addEventListener('click', confirmRename);
    document.getElementById('renameInput').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') confirmRename();
      if (e.key === 'Escape') closeRenameModal();
    });

    // Tecla Escape global para cerrar modal de reto o docente
    document.addEventListener('keydown', (e) => {
      if (e.key !== 'Escape') return;
      if (retoState.open) {
        closeRetoModal();
      } else if (!teacherModal.classList.contains('hidden')) {
        teacherModal.classList.add('hidden');
      }
    });

    // Controles pantalla final del cofre
    document.getElementById('backToBoardBtn').addEventListener('click', closeVictoryScreen);
    document.getElementById('replayFanfareBtn').addEventListener('click', () => {
      state.soundEnabled = true;
      updateSoundUI();
      if (root.SoundEngine) root.SoundEngine.playVictoryFanfare();
      if (root.RadarPixelArt) root.RadarPixelArt.startChestReveal();
    });
    document.getElementById('muteVictoryBtn').addEventListener('click', () => {
      if (root.SoundEngine) root.SoundEngine.toggleVictoryMute();
    });
  });
})(typeof window !== 'undefined' ? window : globalThis);
