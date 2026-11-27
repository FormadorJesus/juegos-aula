/**
 * banco_ejercicios/app.js
 * Controlador de interfaz para el Banco de Ejercicios Matemáticos.
 */
(function () {
  'use strict';

  const API = window.BancoMatematicas;
  const LETTERS = ['A', 'B', 'C', 'D'];

  // Detectar modo API ligero cuando un juego carga esta página en un iframe oculto
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('modo') === 'api') {
    document.body.classList.add('api-only-mode');
    return;
  }

  const savedAula = API.obtenerConfiguracionActiva();
  const state = {
    temas: urlParams.get('tema') ? [urlParams.get('tema')] : savedAula.temas.slice(),
    nivel: urlParams.get('nivel') || savedAula.nivel || '1eso',
    tipo: urlParams.get('tipo') || savedAula.tipo || 'mixto',
    ejercicioActual: null,
    respondido: false,
    aciertos: 0,
    intentos: 0,
    loteActual: [],
    mostrarSolucionesLote: false,
    logConexiones: []
  };

  // Referencias DOM
  const $ = (id) => document.getElementById(id);

  const elTabs = document.querySelectorAll('.nav-tab');
  const elPanels = {
    generador: $('panel-generador'),
    conectar: $('panel-conectar')
  };

  const elTopicGrid = $('topic-grid');
  const elToggleAllTopics = $('btn-toggle-all-topics');
  const elLevelBtns = document.querySelectorAll('[data-nivel]');
  const elTypeBtns = document.querySelectorAll('[data-tipo]');
  const elQtyInput = $('input-batch-qty');
  const elAulaStatus = $('aula-status-text');

  const elMetaCrumbs = $('meta-crumbs');
  const elStatement = $('exercise-statement');
  const elChoicesGrid = $('choices-grid');
  const elFeedbackBox = $('feedback-box');
  const elFeedbackTitle = $('feedback-title');
  const elFeedbackText = $('feedback-text');
  const elScoreCorrect = $('score-correct');
  const elScoreTotal = $('score-total');

  const elBatchPanel = $('batch-panel');
  const elBatchTitle = $('batch-title');
  const elBatchList = $('batch-list');
  const elToggleBatchSolutions = $('btn-toggle-batch-solutions');

  const elSimTema = $('sim-tema');
  const elSimNivel = $('sim-nivel');
  const elSimTipo = $('sim-tipo');
  const elSimCantidad = $('sim-cantidad');
  const elSimUsarAula = $('sim-usar-aula');
  const elSimOutput = $('sim-output');
  const elLogList = $('connection-log');
  const elToast = $('toast');

  let toastTimer = null;
  function mostrarToast(msg) {
    elToast.textContent = msg;
    elToast.classList.add('visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => elToast.classList.remove('visible'), 2400);
  }

  function copiarTexto(texto, mensaje) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(texto).then(
        () => mostrarToast(mensaje || 'Copiado al portapapeles'),
        () => fallbackCopiar(texto, mensaje)
      );
    } else {
      fallbackCopiar(texto, mensaje);
    }
  }

  function fallbackCopiar(texto, mensaje) {
    const ta = document.createElement('textarea');
    ta.value = texto;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); } catch (_) {}
    document.body.removeChild(ta);
    mostrarToast(mensaje || 'Copiado al portapapeles');
  }

  function escaparHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  // ================= NAVEGACIÓN DE PESTAÑAS =================
  elTabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      const target = tab.dataset.tab;
      elTabs.forEach((t) => t.setAttribute('aria-selected', String(t === tab)));
      Object.keys(elPanels).forEach((k) => {
        elPanels[k].hidden = k !== target;
      });
    });
  });

  // ================= CONTROLES DE FILTRO =================
  function renderTemas() {
    const lista = Object.values(API.TEMAS);
    elTopicGrid.innerHTML = lista.map((t) => {
      const active = state.temas.includes(t.id);
      return `
        <button type="button" class="topic-chip" data-tema="${t.id}" aria-pressed="${active}">
          <span>${escaparHtml(t.corto)}</span>
          <span class="check-dot" aria-hidden="true">${active ? '✓' : ''}</span>
        </button>
      `;
    }).join('');

    const todosActivos = state.temas.length === lista.length;
    elToggleAllTopics.textContent = todosActivos ? 'Solo Enteros' : 'Seleccionar todos';

    elTopicGrid.querySelectorAll('.topic-chip').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.tema;
        if (state.temas.includes(id)) {
          if (state.temas.length > 1) {
            state.temas = state.temas.filter((x) => x !== id);
          } else {
            mostrarToast('Debe haber al menos un tema seleccionado.');
            return;
          }
        } else {
          state.temas.push(id);
        }
        renderTemas();
        generarNuevoEjercicio();
      });
    });
  }

  elToggleAllTopics.addEventListener('click', () => {
    const todos = Object.keys(API.TEMAS);
    state.temas = state.temas.length === todos.length ? ['enteros'] : todos;
    renderTemas();
    generarNuevoEjercicio();
  });

  function syncBotonesNivelYTipo() {
    elLevelBtns.forEach((b) => {
      b.setAttribute('aria-pressed', String(b.dataset.nivel === state.nivel));
    });
    elTypeBtns.forEach((b) => {
      b.setAttribute('aria-pressed', String(b.dataset.tipo === state.tipo));
    });
  }

  elLevelBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      state.nivel = btn.dataset.nivel;
      syncBotonesNivelYTipo();
      generarNuevoEjercicio();
    });
  });

  elTypeBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      state.tipo = btn.dataset.tipo;
      syncBotonesNivelYTipo();
      generarNuevoEjercicio();
    });
  });

  function renderEstadoAula() {
    const cfg = API.obtenerConfiguracionActiva();
    const temasTexto = cfg.temas.length === Object.keys(API.TEMAS).length
      ? 'Todos los temas'
      : cfg.temas.map((id) => API.TEMAS[id].corto).join(', ');
    const nivelTexto = API.NIVELES[cfg.nivel].label;
    const tipoTexto = API.TIPOS[cfg.tipo].label;
    elAulaStatus.innerHTML = `<strong>Configuración activa para juegos:</strong> ${escaparHtml(nivelTexto)} · ${escaparHtml(temasTexto)} · ${escaparHtml(tipoTexto)}`;
  }

  $('btn-sync-aula').addEventListener('click', () => {
    API.guardarConfiguracionActiva({
      temas: state.temas,
      nivel: state.nivel,
      tipo: state.tipo
    });
    renderEstadoAula();
    mostrarToast('Configuración fijada para todos los juegos conectados');
  });

  // ================= EJERCICIO INTERACTIVO =================
  function generarNuevoEjercicio() {
    state.ejercicioActual = API.solicitarEjercicio({
      temas: state.temas,
      nivel: state.nivel,
      tipo: state.tipo,
      origen: 'panel-prueba'
    });
    state.respondido = false;
    renderEjercicioActual();
  }

  function renderEjercicioActual() {
    const ej = state.ejercicioActual;
    if (!ej) return;

    elMetaCrumbs.innerHTML = `
      <span class="meta-tag level">${escaparHtml(ej.nivelLabel)}</span>
      <span class="meta-tag">${escaparHtml(ej.temaLabel)}</span>
      <span class="meta-tag ${ej.tipo === 'problema' ? 'type-problema' : ''}">${escaparHtml(ej.tipoLabel)}</span>
      <span class="meta-tag">⏱ ${ej.tiempoSugerido} s</span>
    `;

    elStatement.textContent = ej.enunciado;
    elFeedbackBox.hidden = true;
    elFeedbackBox.className = 'feedback-box';

    elChoicesGrid.innerHTML = ej.opciones.map((opText, idx) => `
      <button type="button" class="choice-btn" data-index="${idx}" id="choice-${idx}">
        <span class="choice-key">${LETTERS[idx]}</span>
        <span>${escaparHtml(opText)}</span>
      </button>
    `).join('');

    elChoicesGrid.querySelectorAll('.choice-btn').forEach((btn) => {
      btn.addEventListener('click', () => responderOpcion(Number(btn.dataset.index)));
    });
  }

  function responderOpcion(idx) {
    if (state.respondido || !state.ejercicioActual) return;
    state.respondido = true;
    state.intentos++;

    const ej = state.ejercicioActual;
    const esCorrecta = idx === ej.indiceCorrecto;
    if (esCorrecta) state.aciertos++;

    elScoreCorrect.textContent = String(state.aciertos);
    elScoreTotal.textContent = String(state.intentos);

    const buttons = elChoicesGrid.querySelectorAll('.choice-btn');
    buttons.forEach((btn, i) => {
      btn.disabled = true;
      if (i === ej.indiceCorrecto) {
        btn.classList.add('is-correct');
      } else if (i === idx) {
        btn.classList.add('is-wrong');
      } else {
        btn.classList.add('is-dimmed');
      }
    });

    elFeedbackBox.hidden = false;
    elFeedbackBox.className = `feedback-box ${esCorrecta ? 'ok' : 'err'}`;
    elFeedbackTitle.textContent = esCorrecta
      ? `¡Correcto! La respuesta es ${LETTERS[ej.indiceCorrecto]} (${ej.respuestaCorrecta}).`
      : `Incorrecto. La opción correcta era ${LETTERS[ej.indiceCorrecto]} (${ej.respuestaCorrecta}).`;
    elFeedbackText.textContent = ej.explicacion;
  }

  $('btn-generate-one').addEventListener('click', generarNuevoEjercicio);
  $('btn-next-exercise').addEventListener('click', generarNuevoEjercicio);
  $('btn-copy-single-json').addEventListener('click', () => {
    if (!state.ejercicioActual) return;
    copiarTexto(JSON.stringify(state.ejercicioActual, null, 2), 'JSON del ejercicio copiado');
  });

  // Atajos de teclado (1-4 / A-D para responder, Enter para siguiente)
  document.addEventListener('keydown', (e) => {
    if (elPanels.generador.hidden) return;
    const tag = (e.target && e.target.tagName) || '';
    if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;

    const k = e.key.toUpperCase();
    const map = { '1': 0, '2': 1, '3': 2, '4': 3, A: 0, B: 1, C: 2, D: 3 };
    if (map[k] !== undefined && !state.respondido) {
      responderOpcion(map[k]);
    } else if (e.key === 'Enter' && state.respondido) {
      generarNuevoEjercicio();
    }
  });

  // ================= GENERADOR DE LOTES =================
  function generarLoteUI() {
    const qty = Math.max(2, Math.min(30, Number(elQtyInput.value) || 8));
    elQtyInput.value = String(qty);
    state.loteActual = API.solicitarLote({
      temas: state.temas,
      nivel: state.nivel,
      tipo: state.tipo,
      cantidad: qty,
      origen: 'lote-ui'
    });
    state.mostrarSolucionesLote = false;
    elBatchPanel.hidden = false;
    renderLote();
    elBatchPanel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  function renderLote() {
    elBatchTitle.textContent = `Lote generado (${state.loteActual.length} ejercicios)`;
    elToggleBatchSolutions.textContent = state.mostrarSolucionesLote
      ? 'Ocultar soluciones'
      : 'Mostrar soluciones';

    elBatchList.innerHTML = state.loteActual.map((ej, idx) => `
      <article class="batch-item">
        <div class="batch-item-head">
          <span>#${idx + 1} · ${escaparHtml(ej.nivelLabel)} · ${escaparHtml(ej.temaLabel)}</span>
          <span>${escaparHtml(ej.tipoLabel)}</span>
        </div>
        <div class="batch-item-q">${escaparHtml(ej.enunciado)}</div>
        <div class="batch-opts">
          ${ej.opciones.map((o, oi) => `
            <div class="batch-opt ${state.mostrarSolucionesLote && oi === ej.indiceCorrecto ? 'revealed-ok' : ''}">
              <strong>${LETTERS[oi]}.</strong> ${escaparHtml(o)}
            </div>
          `).join('')}
        </div>
        ${state.mostrarSolucionesLote ? `<div class="batch-exp"><strong>Solución:</strong> ${escaparHtml(ej.explicacion)}</div>` : ''}
      </article>
    `).join('');
  }

  $('btn-generate-batch').addEventListener('click', generarLoteUI);
  elToggleBatchSolutions.addEventListener('click', () => {
    state.mostrarSolucionesLote = !state.mostrarSolucionesLote;
    renderLote();
  });

  $('btn-copy-batch-json').addEventListener('click', () => {
    if (!state.loteActual.length) return;
    copiarTexto(JSON.stringify(state.loteActual, null, 2), 'Lote JSON copiado al portapapeles');
  });

  $('btn-download-batch-json').addEventListener('click', () => {
    if (!state.loteActual.length) return;
    const blob = new Blob([JSON.stringify(state.loteActual, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ejercicios-${state.nivel}-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    mostrarToast('Archivo JSON descargado');
  });

  // ================= PESTAÑA CONECTAR JUEGOS (SIMULADOR Y LOG) =================
  function ejecutarSimulador() {
    const params = elSimUsarAula.checked
      ? { usarConfiguracionAula: true, cantidad: Number(elSimCantidad.value) || 2, origen: 'simulador-juego' }
      : {
          tema: elSimTema.value,
          nivel: elSimNivel.value,
          tipo: elSimTipo.value,
          cantidad: Number(elSimCantidad.value) || 2,
          origen: 'simulador-juego'
        };

    const ejercicios = API.solicitarLote(params);
    const respuesta = {
      type: 'BANCO_MATH_RESPONSE',
      ok: true,
      total: ejercicios.length,
      ejercicios
    };
    elSimOutput.textContent = JSON.stringify(respuesta, null, 2);
  }

  $('btn-run-sim').addEventListener('click', ejecutarSimulador);
  elSimUsarAula.addEventListener('change', () => {
    const dis = elSimUsarAula.checked;
    elSimTema.disabled = dis;
    elSimNivel.disabled = dis;
    elSimTipo.disabled = dis;
  });

  function renderLogConexiones() {
    if (!state.logConexiones.length) {
      elLogList.innerHTML = '<div class="log-entry">Aún no se han recibido peticiones externas en esta sesión. Cuando un juego conectado solicite ejercicios aparecerá aquí.</div>';
      return;
    }
    elLogList.innerHTML = state.logConexiones.slice(0, 20).map((ev) => {
      const hora = new Date(ev.timestamp).toLocaleTimeString('es-ES');
      const resumen = ev.params && ev.params.usarConfiguracionAula
        ? 'configuración activa del aula'
        : `${ev.params.tema || (ev.params.temas && ev.params.temas.join(',')) || 'mixto'} · ${ev.params.nivel || '1eso'} · ${ev.params.tipo || 'mixto'}`;
      return `
        <div class="log-entry">
          <strong>[${hora}]</strong> ${escaparHtml(ev.origen)} (${escaparHtml(ev.canal)}) → ${escaparHtml(ev.accion)} (${ev.cantidad || 0} ej. · ${escaparHtml(resumen)})
        </div>
      `;
    }).join('');
  }

  API.onSolicitudExterna((ev) => {
    state.logConexiones.unshift(ev);
    renderLogConexiones();
  });

  // Botones de copiar código de integración
  document.querySelectorAll('[data-copy-target]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const codeEl = $(btn.dataset.copyTarget);
      if (codeEl) copiarTexto(codeEl.textContent, 'Código de integración copiado');
    });
  });

  // Inicialización
  if (window.BancoUI && window.BancoUI.bindFullscreenButton) {
    window.BancoUI.bindFullscreenButton('#btn-fullscreen-banco', {
      enterText: '⛶ Pantalla',
      exitText: '🗗 Salir'
    });
  }
  renderTemas();
  syncBotonesNivelYTipo();
  renderEstadoAula();
  generarNuevoEjercicio();
  ejecutarSimulador();
  renderLogConexiones();
})();
