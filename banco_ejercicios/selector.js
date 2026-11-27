/**
 * banco_ejercicios/selector.js
 * Componente reutilizable de botón + modal para que cualquier juego permita elegir
 * uno o más temas (enteros, fracciones, potencias, ecuaciones, funciones),
 * curso (1.º–4.º ESO y 1.º–2.º Bachillerato) y modalidad (operaciones/problemas/ambos),
 * conectado directamente a BancoMatematicas.
 */
(function (root) {
  'use strict';

  const API = root.BancoMatematicas;
  const UI = (root.BancoUI = root.BancoUI || {});

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  /**
   * Vincula uno o varios botones para alternar pantalla completa de forma segura.
   */
  UI.bindFullscreenButton = function (buttonOrSelector, labels) {
    const opts = Object.assign({
      enterText: '⛶ Pantalla completa',
      exitText: '🗗 Salir pantalla',
      compact: false
    }, labels || {});

    const buttons = typeof buttonOrSelector === 'string'
      ? Array.from(document.querySelectorAll(buttonOrSelector))
      : (Array.isArray(buttonOrSelector) ? buttonOrSelector : [buttonOrSelector]).filter(Boolean);

    if (!buttons.length) return;

    function sync() {
      const isFs = Boolean(document.fullscreenElement || document.webkitFullscreenElement);
      buttons.forEach((btn) => {
        btn.setAttribute('aria-pressed', String(isFs));
        if (!opts.keepCustomContent) {
          btn.textContent = isFs ? opts.exitText : opts.enterText;
        }
        btn.title = isFs ? 'Salir de pantalla completa' : 'Ver a pantalla completa';
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

    buttons.forEach((btn) => btn.addEventListener('click', toggle));
    document.addEventListener('fullscreenchange', sync);
    document.addEventListener('webkitfullscreenchange', sync);
    sync();
  };

  /**
   * Crea una instancia de selector de ejercicios conectado al Banco de Ejercicios.
   * @param {Object} options
   * @param {string} options.gameId - Identificador único del juego (para guardar preferencias)
   * @param {string[]} [options.defaultTemas=['enteros']]
   * @param {string} [options.defaultNivel='1eso']
   * @param {string} [options.defaultTipo='mixto']
   * @param {boolean} [options.mostrarModalidad=true]
   * @param {string} [options.notaModalidad]
   * @param {Function} [options.onChange]
   */
  UI.crearSelector = function (options) {
    const opts = Object.assign({
      gameId: 'juego',
      defaultTemas: ['enteros'],
      defaultNivel: '1eso',
      defaultTipo: 'mixto',
      mostrarModalidad: true,
      notaModalidad: '',
      onChange: null
    }, options || {});

    const storageKey = `bm_selector_cfg_${opts.gameId}`;
    let config = loadSaved();
    const triggerButtons = [];

    function loadSaved() {
      try {
        const raw = localStorage.getItem(storageKey);
        if (raw) {
          const p = JSON.parse(raw);
          if (Array.isArray(p.temas) && p.temas.length && p.nivel) {
            return {
              temas: p.temas.filter((t) => API && API.TEMAS[t]),
              nivel: (API && API.NIVELES[p.nivel]) ? p.nivel : opts.defaultNivel,
              tipo: p.tipo || opts.defaultTipo
            };
          }
        }
      } catch (_) {}
      return {
        temas: opts.defaultTemas.slice(),
        nivel: opts.defaultNivel,
        tipo: opts.defaultTipo
      };
    }

    function save() {
      try {
        localStorage.setItem(storageKey, JSON.stringify(config));
      } catch (_) {}
    }

    function getResumen() {
      if (!API) return `${config.nivel}`;
      const nivelTxt = API.NIVELES[config.nivel] ? API.NIVELES[config.nivel].label : config.nivel;
      const totalTemas = Object.keys(API.TEMAS).length;
      let temasTxt;
      if (config.temas.length === totalTemas) {
        temasTxt = 'Todos';
      } else if (config.temas.length <= 2) {
        temasTxt = config.temas.map((t) => API.TEMAS[t].corto).join(' + ');
      } else {
        temasTxt = `${config.temas.length} temas`;
      }
      return `${nivelTxt} · ${temasTxt}`;
    }

    function getResumenDetallado() {
      if (!API) return getResumen();
      const nivelTxt = API.NIVELES[config.nivel].label;
      const temasTxt = config.temas.map((t) => API.TEMAS[t].corto).join(', ');
      const tipoTxt = API.TIPOS[config.tipo] ? API.TIPOS[config.tipo].label : config.tipo;
      return `${nivelTxt} · ${temasTxt} (${tipoTxt})`;
    }

    function refreshTriggers() {
      const resumen = getResumen();
      triggerButtons.forEach((btn) => {
        const badge = btn.querySelector('.bm-trigger-badge');
        if (badge) badge.textContent = resumen;
        btn.title = `Configurar ejercicios (${getResumenDetallado()})`;
      });
    }

    // Construir modal una vez en el body
    const backdrop = document.createElement('div');
    backdrop.className = 'bm-modal-backdrop';
    backdrop.hidden = true;
    backdrop.setAttribute('role', 'dialog');
    backdrop.setAttribute('aria-modal', 'true');
    backdrop.setAttribute('aria-label', 'Selector de ejercicios y curso');

    let draft = { temas: config.temas.slice(), nivel: config.nivel, tipo: config.tipo };

    function renderModal() {
      const temasList = API ? Object.values(API.TEMAS) : [];
      const todosActivos = draft.temas.length === temasList.length;

      backdrop.innerHTML = `
        <div class="bm-modal-dialog">
          <div class="bm-modal-header">
            <h2 class="bm-modal-title">📚 Selector de Ejercicios y Curso</h2>
            <button type="button" class="bm-modal-close" data-bm-close aria-label="Cerrar">✕</button>
          </div>
          <div class="bm-modal-body">
            <div>
              <div class="bm-group-head">
                <span class="bm-group-label">1. Temas (elige uno o varios)</span>
                <button type="button" class="bm-link-action" data-bm-all>
                  ${todosActivos ? 'Dejar solo Enteros' : 'Seleccionar todos'}
                </button>
              </div>
              <div class="bm-topics-grid">
                ${temasList.map((t) => {
                  const on = draft.temas.includes(t.id);
                  return `
                    <button type="button" class="bm-chip" data-bm-tema="${t.id}" aria-pressed="${on}">
                      <span>${escapeHtml(t.corto)}</span>
                      <span class="bm-chip-mark">${on ? '✓' : ''}</span>
                    </button>
                  `;
                }).join('')}
              </div>
            </div>

            <div>
              <div class="bm-group-head">
                <span class="bm-group-label">2. Curso / Nivel de dificultad</span>
              </div>
              <p class="bm-stage-sub">ESO</p>
              <div class="bm-levels-eso">
                ${['1eso', '2eso', '3eso', '4eso'].map((id) => `
                  <button type="button" class="bm-seg" data-bm-nivel="${id}" aria-pressed="${draft.nivel === id}">
                    ${escapeHtml(API.NIVELES[id].label)}
                  </button>
                `).join('')}
              </div>
              <p class="bm-stage-sub">Bachillerato</p>
              <div class="bm-levels-bach">
                ${['1bach', '2bach'].map((id) => `
                  <button type="button" class="bm-seg" data-bm-nivel="${id}" aria-pressed="${draft.nivel === id}">
                    ${escapeHtml(API.NIVELES[id].label)}
                  </button>
                `).join('')}
              </div>
            </div>

            ${opts.mostrarModalidad ? `
              <div>
                <div class="bm-group-head">
                  <span class="bm-group-label">3. Tipo de ejercicio</span>
                </div>
                <div class="bm-types-grid">
                  <button type="button" class="bm-seg" data-bm-tipo="operacion" aria-pressed="${draft.tipo === 'operacion'}">Operaciones</button>
                  <button type="button" class="bm-seg" data-bm-tipo="problema" aria-pressed="${draft.tipo === 'problema'}">Problemas</button>
                  <button type="button" class="bm-seg" data-bm-tipo="mixto" aria-pressed="${draft.tipo === 'mixto'}">Ambos</button>
                </div>
                ${opts.notaModalidad ? `<p class="bm-note" style="margin-top:8px">${escapeHtml(opts.notaModalidad)}</p>` : ''}
              </div>
            ` : (opts.notaModalidad ? `<p class="bm-note">${escapeHtml(opts.notaModalidad)}</p>` : '')}
          </div>

          <div class="bm-modal-footer">
            <button type="button" class="bm-btn-sync" data-bm-sync>🔄 Usar config. del Banco del Aula</button>
            <button type="button" class="bm-btn-apply" data-bm-apply>✓ Aplicar al juego</button>
          </div>
        </div>
      `;

      backdrop.querySelector('[data-bm-close]').addEventListener('click', close);
      backdrop.querySelector('[data-bm-all]').addEventListener('click', () => {
        const all = Object.keys(API.TEMAS);
        draft.temas = draft.temas.length === all.length ? ['enteros'] : all;
        renderModal();
      });

      backdrop.querySelectorAll('[data-bm-tema]').forEach((btn) => {
        btn.addEventListener('click', () => {
          const id = btn.dataset.bmTema;
          if (draft.temas.includes(id)) {
            if (draft.temas.length > 1) {
              draft.temas = draft.temas.filter((x) => x !== id);
            }
          } else {
            draft.temas.push(id);
          }
          renderModal();
        });
      });

      backdrop.querySelectorAll('[data-bm-nivel]').forEach((btn) => {
        btn.addEventListener('click', () => {
          draft.nivel = btn.dataset.bmNivel;
          renderModal();
        });
      });

      backdrop.querySelectorAll('[data-bm-tipo]').forEach((btn) => {
        btn.addEventListener('click', () => {
          draft.tipo = btn.dataset.bmTipo;
          renderModal();
        });
      });

      backdrop.querySelector('[data-bm-sync]').addEventListener('click', () => {
        if (API && typeof API.obtenerConfiguracionActiva === 'function') {
          const aula = API.obtenerConfiguracionActiva();
          draft = {
            temas: aula.temas.slice(),
            nivel: aula.nivel,
            tipo: aula.tipo
          };
          renderModal();
        }
      });

      backdrop.querySelector('[data-bm-apply]').addEventListener('click', () => {
        config = {
          temas: draft.temas.slice(),
          nivel: draft.nivel,
          tipo: draft.tipo
        };
        save();
        refreshTriggers();
        close();
        if (typeof opts.onChange === 'function') {
          opts.onChange(getConfig());
        }
      });
    }

    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop) close();
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !backdrop.hidden) close();
    });

    function open() {
      if (!backdrop.parentNode) {
        document.body.appendChild(backdrop);
      }
      draft = { temas: config.temas.slice(), nivel: config.nivel, tipo: config.tipo };
      renderModal();
      backdrop.hidden = false;
    }

    function close() {
      backdrop.hidden = true;
    }

    function getConfig() {
      return {
        temas: config.temas.slice(),
        nivel: config.nivel,
        tipo: config.tipo
      };
    }

    function bindButton(btn) {
      if (!btn) return;
      btn.classList.add('bm-selector-trigger');
      if (!btn.querySelector('.bm-trigger-badge')) {
        const labelText = btn.dataset.label || '📚 Ejercicios';
        btn.innerHTML = `<span>${escapeHtml(labelText)}</span><span class="bm-trigger-badge"></span>`;
      }
      btn.addEventListener('click', open);
      triggerButtons.push(btn);
      refreshTriggers();
    }

    function solicitarEjercicio(overrides) {
      if (!API) throw new Error('BancoMatematicas no está cargado.');
      const params = Object.assign({
        temas: config.temas,
        nivel: config.nivel,
        tipo: config.tipo,
        origen: opts.gameId
      }, overrides || {});
      return API.solicitarEjercicio(params);
    }

    function solicitarLote(cantidad, overrides) {
      if (!API) throw new Error('BancoMatematicas no está cargado.');
      const params = Object.assign({
        temas: config.temas,
        nivel: config.nivel,
        tipo: config.tipo,
        cantidad: cantidad || 10,
        origen: opts.gameId
      }, overrides || {});
      return API.solicitarLote(params);
    }

    return {
      open,
      close,
      bindButton,
      getConfig,
      getResumen,
      getResumenDetallado,
      solicitarEjercicio,
      solicitarLote
    };
  };
})(typeof window !== 'undefined' ? window : globalThis);
