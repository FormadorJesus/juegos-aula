/**
 * banco_ejercicios/client.js
 * Conector ligero de 1 solo archivo para que cualquier juego solicite ejercicios
 * y problemas a la aplicación Banco de Ejercicios Matemáticos.
 *
 * Uso rápido desde cualquier juego del repositorio:
 *   <script src="../banco_ejercicios/client.js"></script>
 *   <script>
 *     const ej = await BancoMathClient.solicitarEjercicio({
 *       tema: 'ecuaciones',
 *       nivel: '3eso',
 *       tipo: 'problema'
 *     });
 *   </script>
 */
(function (root) {
  'use strict';

  const DEFAULT_SCRIPTS = [
    'engine/utils.js',
    'engine/generators/enteros.js',
    'engine/generators/fracciones.js',
    'engine/generators/potencias.js',
    'engine/generators/ecuaciones.js',
    'api.js'
  ];

  // Detecta automáticamente la ruta base de banco_ejercicios desde la etiqueta <script>
  function detectarRutaBase() {
    if (typeof document === 'undefined') return './';
    const current = document.currentScript;
    if (current && current.src) {
      return current.src.replace(/client\.js(\?.*)?$/i, '');
    }
    const scripts = document.getElementsByTagName('script');
    for (let i = scripts.length - 1; i >= 0; i--) {
      if (scripts[i].src && /client\.js(\?.*)?$/i.test(scripts[i].src)) {
        return scripts[i].src.replace(/client\.js(\?.*)?$/i, '');
      }
    }
    return '../banco_ejercicios/';
  }

  const state = {
    baseUrl: detectarRutaBase(),
    modo: 'auto', // 'auto' | 'iframe' | 'local'
    iframe: null,
    iframeReady: null,
    localReady: null,
    pending: new Map(),
    seq: 1
  };

  function cargarScript(url) {
    return new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = url;
      s.async = false;
      s.onload = () => resolve();
      s.onerror = () => reject(new Error(`No se pudo cargar ${url}`));
      document.head.appendChild(s);
    });
  }

  function asegurarMotorLocal() {
    if (root.BancoMatematicas && typeof root.BancoMatematicas.solicitarLote === 'function') {
      return Promise.resolve(root.BancoMatematicas);
    }
    if (!state.localReady) {
      const base = state.baseUrl.endsWith('/') ? state.baseUrl : `${state.baseUrl}/`;
      state.localReady = DEFAULT_SCRIPTS.reduce(
        (chain, file) => chain.then(() => cargarScript(base + file)),
        Promise.resolve()
      ).then(() => root.BancoMatematicas);
    }
    return state.localReady;
  }

  function asegurarIframe(customUrl) {
    if (state.iframeReady) return state.iframeReady;

    state.iframeReady = new Promise((resolve, reject) => {
      const url = customUrl || `${state.baseUrl.replace(/\/$/, '')}/index.html?modo=api`;
      const frame = document.createElement('iframe');
      frame.src = url;
      frame.title = 'Conexión Banco de Ejercicios Matemáticos';
      frame.setAttribute('aria-hidden', 'true');
      frame.style.cssText = 'position:fixed;width:1px;height:1px;border:0;opacity:0;pointer-events:none;left:-9999px;';

      let resolved = false;
      const timer = setTimeout(() => {
        if (!resolved) {
          resolved = true;
          reject(new Error('Tiempo de espera agotado al conectar con Banco de Ejercicios vía iframe.'));
        }
      }, 4500);

      function onMsg(ev) {
        const d = ev.data;
        if (!d) return;
        if (d.type === 'BANCO_MATH_READY' && !resolved) {
          resolved = true;
          clearTimeout(timer);
          resolve(frame);
        } else if (d.type === 'BANCO_MATH_RESPONSE' && d.requestId && state.pending.has(d.requestId)) {
          const entry = state.pending.get(d.requestId);
          state.pending.delete(d.requestId);
          clearTimeout(entry.timer);
          if (d.ok) entry.resolve(d);
          else entry.reject(new Error(d.error || 'Error en Banco de Ejercicios'));
        }
      }

      root.addEventListener('message', onMsg);
      frame.onload = () => {
        // Algunos navegadores tardan un tick en lanzar BANCO_MATH_READY
        setTimeout(() => {
          if (!resolved) {
            resolved = true;
            clearTimeout(timer);
            resolve(frame);
          }
        }, 250);
      };
      frame.onerror = () => {
        if (!resolved) {
          resolved = true;
          clearTimeout(timer);
          reject(new Error('No se pudo cargar el iframe del Banco de Ejercicios.'));
        }
      };

      (document.body || document.documentElement).appendChild(frame);
      state.iframe = frame;
    });

    return state.iframeReady;
  }

  function enviarPorIframe(action, params) {
    return asegurarIframe().then((frame) => {
      return new Promise((resolve, reject) => {
        const requestId = `cli-${Date.now()}-${state.seq++}`;
        const timer = setTimeout(() => {
          state.pending.delete(requestId);
          reject(new Error('Sin respuesta del Banco de Ejercicios.'));
        }, 4000);

        state.pending.set(requestId, { resolve, reject, timer });
        frame.contentWindow.postMessage({
          type: 'BANCO_MATH_REQUEST',
          requestId,
          action,
          params: Object.assign({ origen: document.title || location.pathname }, params || {})
        }, '*');
      });
    });
  }

  function ejecutar(action, params) {
    const esRemoto = /^https?:\/\//i.test(state.baseUrl) &&
      typeof location !== 'undefined' &&
      location.origin !== 'null' &&
      !state.baseUrl.startsWith(location.origin);

    const usarIframe = state.modo === 'iframe' || (state.modo === 'auto' && esRemoto);

    if (usarIframe) {
      return enviarPorIframe(action, params).catch(() => {
        // Fallback automático a carga local si está disponible
        if (!esRemoto) return ejecutarLocal(action, params);
        throw new Error('No se pudo conectar con el servidor remoto de ejercicios.');
      });
    }

    return ejecutarLocal(action, params);
  }

  function ejecutarLocal(action, params) {
    return asegurarMotorLocal().then((api) => {
      if (action === 'catalogo') return { ok: true, catalogo: api.obtenerCatalogo() };
      if (action === 'configuracion') return { ok: true, configuracion: api.obtenerConfiguracionActiva() };
      if (action === 'solicitarEjercicio') {
        const ej = api.solicitarEjercicio(params);
        return { ok: true, ejercicio: ej, ejercicios: [ej] };
      }
      const lote = api.solicitarLote(params);
      return { ok: true, ejercicios: lote, ejercicio: lote[0] };
    });
  }

  const Client = {
    /**
     * Configura la URL de la aplicación Banco de Ejercicios y el modo de conexión.
     * @param {string|{baseUrl?: string, url?: string, modo?: 'auto'|'iframe'|'local'}} opts
     */
    conectar(opts) {
      if (typeof opts === 'string') {
        state.baseUrl = opts.replace(/index\.html(\?.*)?$/i, '');
      } else if (opts && typeof opts === 'object') {
        if (opts.url) state.baseUrl = opts.url.replace(/index\.html(\?.*)?$/i, '');
        if (opts.baseUrl) state.baseUrl = opts.baseUrl;
        if (opts.modo) state.modo = opts.modo;
      }
      state.iframeReady = null;
      return Client;
    },

    solicitarEjercicio(params) {
      return ejecutar('solicitarEjercicio', params).then((res) => res.ejercicio);
    },

    solicitarLote(params) {
      return ejecutar('solicitarLote', params).then((res) => res.ejercicios);
    },

    obtenerCatalogo() {
      return ejecutar('catalogo', {}).then((res) => res.catalogo);
    },

    obtenerConfiguracionAula() {
      return ejecutar('configuracion', {}).then((res) => res.configuracion);
    }
  };

  root.BancoMathClient = Client;

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = Client;
  }
})(typeof window !== 'undefined' ? window : globalThis);
