/**
 * banco_ejercicios/api.js
 * Servicio unificado de generación de ejercicios y puente de conexión para juegos
 * (JS directo, iframe + postMessage y BroadcastChannel + configuración activa del aula).
 */
(function (root) {
  'use strict';

  const NS = (root.BancoMatematicas = root.BancoMatematicas || {});

  // Carga automática en entorno Node.js para pruebas y tooling
  if (typeof require === 'function' && !NS.utils) {
    require('./engine/utils');
    require('./engine/generators/enteros');
    require('./engine/generators/fracciones');
    require('./engine/generators/potencias');
    require('./engine/generators/ecuaciones');
    require('./engine/generators/funciones');
  }

  const STORAGE_KEY = 'banco_ejercicios_aula_config_v1';
  const CHANNEL_NAME = 'banco_ejercicios_math_v1';

  const TEMAS = {
    enteros: { id: 'enteros', label: 'Números Enteros', corto: 'Enteros' },
    fracciones: { id: 'fracciones', label: 'Fracciones', corto: 'Fracciones' },
    potencias: { id: 'potencias', label: 'Potencias', corto: 'Potencias' },
    ecuaciones: { id: 'ecuaciones', label: 'Ecuaciones', corto: 'Ecuaciones' },
    funciones: { id: 'funciones', label: 'Funciones', corto: 'Funciones' }
  };

  const NIVELES = {
    '1eso': { id: '1eso', label: '1.º ESO', etapa: 'ESO', orden: 1 },
    '2eso': { id: '2eso', label: '2.º ESO', etapa: 'ESO', orden: 2 },
    '3eso': { id: '3eso', label: '3.º ESO', etapa: 'ESO', orden: 3 },
    '4eso': { id: '4eso', label: '4.º ESO', etapa: 'ESO', orden: 4 },
    '1bach': { id: '1bach', label: '1.º Bachillerato', etapa: 'Bachillerato', orden: 5 },
    '2bach': { id: '2bach', label: '2.º Bachillerato', etapa: 'Bachillerato', orden: 6 }
  };

  const TIPOS = {
    operacion: { id: 'operacion', label: 'Operación' },
    problema: { id: 'problema', label: 'Problema' },
    mixto: { id: 'mixto', label: 'Operaciones y Problemas' }
  };

  const DEFAULT_CONFIG = {
    temas: ['enteros'],
    nivel: '1eso',
    tipo: 'mixto',
    actualizadoEn: null
  };

  const TEMA_IDS = Object.keys(TEMAS);
  const NIVEL_IDS = Object.keys(NIVELES);

  let requestSeq = 1;
  const listeners = new Set();

  function normalizarTema(valor) {
    if (Array.isArray(valor)) {
      const limpios = valor.map(normalizarTemaUnico).filter(Boolean);
      return limpios.length ? limpios : ['enteros'];
    }
    if (!valor || String(valor).toLowerCase() === 'mixto' || String(valor).toLowerCase() === 'todos') {
      return TEMA_IDS.slice();
    }
    const unico = normalizarTemaUnico(valor);
    return unico ? [unico] : ['enteros'];
  }

  function normalizarTemaUnico(v) {
    const k = String(v || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();
    if (TEMAS[k]) return k;
    if (k.includes('enter') || k === 'entros') return 'enteros';
    if (k.includes('fracc')) return 'fracciones';
    if (k.includes('poten')) return 'potencias';
    if (k.includes('ecuac')) return 'ecuaciones';
    if (k.includes('funci')) return 'funciones';
    return null;
  }

  function normalizarNivel(v) {
    const k = String(v || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]/g, '');
    if (NIVELES[k]) return k;
    if (k === '1' || k === '1oeso' || k === 'primeroeso') return '1eso';
    if (k === '2' || k === '2oeso' || k === 'segundoeso') return '2eso';
    if (k === '3' || k === '3oeso' || k === 'terceroeso') return '3eso';
    if (k === '4' || k === '4oeso' || k === 'cuartoeso') return '4eso';
    if (k === '5' || k === '1obach' || k === '1bachillerato' || k === '1obachillerato') return '1bach';
    if (k === '6' || k === '2obach' || k === '2bachillerato' || k === '2obachillerato') return '2bach';
    return '1eso';
  }

  function normalizarTipo(v) {
    const k = String(v || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();
    if (k === 'operacion' || k === 'operaciones') return 'operacion';
    if (k === 'problema' || k === 'problemas') return 'problema';
    return 'mixto';
  }

  function obtenerConfiguracionActiva() {
    try {
      if (typeof localStorage !== 'undefined') {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          return {
            temas: normalizarTema(parsed.temas),
            nivel: normalizarNivel(parsed.nivel),
            tipo: normalizarTipo(parsed.tipo),
            actualizadoEn: parsed.actualizadoEn || null
          };
        }
      }
    } catch (_) {}
    return { ...DEFAULT_CONFIG };
  }

  function guardarConfiguracionActiva(cfg) {
    const normalized = {
      temas: normalizarTema(cfg.temas || cfg.tema),
      nivel: normalizarNivel(cfg.nivel),
      tipo: normalizarTipo(cfg.tipo),
      actualizadoEn: new Date().toISOString()
    };
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
      }
    } catch (_) {}
    try {
      if (broadcastChannel) {
        broadcastChannel.postMessage({
          type: 'BANCO_MATH_CONFIG_UPDATED',
          config: normalized
        });
      }
    } catch (_) {}
    return normalized;
  }

  function calcularTiempoSugerido(nivel, tipo) {
    const base = tipo === 'problema' ? 35 : 18;
    const extra = (NIVELES[nivel]?.orden || 1) * 3;
    return base + extra;
  }

  function resolverParametros(params) {
    const p = params || {};
    if (p.usarConfiguracionAula) {
      const aula = obtenerConfiguracionActiva();
      return {
        temas: aula.temas,
        nivel: aula.nivel,
        tipo: aula.tipo,
        origen: p.origen || 'juego-conectado'
      };
    }
    return {
      temas: normalizarTema(p.temas !== undefined ? p.temas : p.tema),
      nivel: normalizarNivel(p.nivel),
      tipo: normalizarTipo(p.tipo),
      origen: p.origen || 'directo'
    };
  }

  function generarUno(temaId, nivelId, tipoElegido) {
    const U = NS.utils;
    const genTema = NS.generators && NS.generators[temaId];
    if (!genTema) {
      throw new Error(`No existe generador para el tema "${temaId}"`);
    }
    const tipoFinal = tipoElegido === 'mixto'
      ? (Math.random() < 0.5 ? 'operacion' : 'problema')
      : tipoElegido;

    const bucket = genTema[tipoFinal] && genTema[tipoFinal][nivelId];
    if (!bucket || bucket.length === 0) {
      throw new Error(`No hay generadores para ${temaId} / ${nivelId} / ${tipoFinal}`);
    }

    const fn = U.pick(bucket);
    const raw = fn();

    if (!Array.isArray(raw.opciones) || raw.opciones.length !== 4) {
      throw new Error(`Ejercicio inválido (no tiene 4 opciones) en ${temaId}/${nivelId}/${tipoFinal}`);
    }

    const id = `${temaId}-${nivelId}-${tipoFinal}-${Date.now().toString(36)}-${requestSeq++}`;
    return {
      id,
      tema: temaId,
      temaLabel: TEMAS[temaId].label,
      nivel: nivelId,
      nivelLabel: NIVELES[nivelId].label,
      tipo: tipoFinal,
      tipoLabel: TIPOS[tipoFinal].label,
      enunciado: raw.enunciado,
      opciones: raw.opciones,
      respuestaCorrecta: raw.respuestaCorrecta,
      indiceCorrecto: raw.indiceCorrecto,
      explicacion: raw.explicacion,
      tiempoSugerido: calcularTiempoSugerido(nivelId, tipoFinal),
      etiquetas: raw.etiquetas || []
    };
  }

  function solicitarEjercicio(params) {
    const U = NS.utils;
    const resolved = resolverParametros(params);
    const temaElegido = U.pick(resolved.temas);
    return generarUno(temaElegido, resolved.nivel, resolved.tipo);
  }

  function solicitarLote(params) {
    const U = NS.utils;
    const p = params || {};
    const cantidad = Math.max(1, Math.min(50, Number(p.cantidad) || 5));
    const resolved = resolverParametros(p);
    const ejercicios = [];
    const vistos = new Set();

    let intentos = 0;
    while (ejercicios.length < cantidad && intentos < cantidad * 6) {
      intentos++;
      const temaElegido = resolved.temas[ejercicios.length % resolved.temas.length];
      // Si es mixto, alterna equilibradamente operaciones y problemas
      const tipoParaEste = resolved.tipo === 'mixto'
        ? (ejercicios.length % 2 === 0 ? 'operacion' : 'problema')
        : resolved.tipo;
      const ej = generarUno(temaElegido, resolved.nivel, tipoParaEste);
      if (!vistos.has(ej.enunciado) || intentos > cantidad * 4) {
        vistos.add(ej.enunciado);
        ejercicios.push(ej);
      }
    }

    return resolved.temas.length > 1 || resolved.tipo === 'mixto'
      ? U.shuffle(ejercicios)
      : ejercicios;
  }

  function obtenerCatalogo() {
    return {
      version: '1.0.0',
      temas: Object.values(TEMAS),
      niveles: Object.values(NIVELES),
      tipos: Object.values(TIPOS),
      configuracionActiva: obtenerConfiguracionActiva()
    };
  }

  function notificarEvento(evento) {
    listeners.forEach((fn) => {
      try { fn(evento); } catch (_) {}
    });
  }

  function onSolicitudExterna(callback) {
    if (typeof callback === 'function') {
      listeners.add(callback);
      return () => listeners.delete(callback);
    }
    return () => {};
  }

  function procesarMensajePeticion(data, canal) {
    const reqId = data.requestId || `req-${Date.now()}`;
    const accion = data.action || 'solicitarLote';
    const params = data.params || {};

    try {
      let payload;
      if (accion === 'catalogo') {
        payload = { catalogo: obtenerCatalogo() };
      } else if (accion === 'configuracion') {
        payload = { configuracion: obtenerConfiguracionActiva() };
      } else if (accion === 'solicitarEjercicio') {
        const ejercicio = solicitarEjercicio(params);
        payload = { ejercicio, ejercicios: [ejercicio] };
      } else {
        const ejercicios = solicitarLote(params);
        payload = { ejercicios, ejercicio: ejercicios[0] };
      }

      notificarEvento({
        timestamp: new Date().toISOString(),
        canal,
        origen: params.origen || data.origen || 'juego-externo',
        accion,
        params,
        cantidad: payload.ejercicios ? payload.ejercicios.length : 0,
        ok: true
      });

      return {
        type: 'BANCO_MATH_RESPONSE',
        requestId: reqId,
        ok: true,
        ...payload
      };
    } catch (err) {
      notificarEvento({
        timestamp: new Date().toISOString(),
        canal,
        origen: params.origen || data.origen || 'juego-externo',
        accion,
        params,
        ok: false,
        error: err.message
      });
      return {
        type: 'BANCO_MATH_RESPONSE',
        requestId: reqId,
        ok: false,
        error: err.message
      };
    }
  }

  // Puente 1: window.postMessage (para juegos que embeben esta app en un iframe o ventana)
  let broadcastChannel = null;
  if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
    window.addEventListener('message', (event) => {
      const data = event.data;
      if (!data || data.type !== 'BANCO_MATH_REQUEST') return;
      const respuesta = procesarMensajePeticion(data, 'postMessage');
      if (event.source && typeof event.source.postMessage === 'function') {
        event.source.postMessage(respuesta, event.origin === 'null' ? '*' : event.origin || '*');
      }
    });

    // Avisar al padre cuando se carga en iframe
    if (window.parent && window.parent !== window) {
      try {
        window.parent.postMessage({
          type: 'BANCO_MATH_READY',
          version: '1.0.0'
        }, '*');
      } catch (_) {}
    }

    // Puente 2: BroadcastChannel (comunicación entre pestañas del mismo origen)
    if (typeof BroadcastChannel !== 'undefined') {
      try {
        broadcastChannel = new BroadcastChannel(CHANNEL_NAME);
        broadcastChannel.onmessage = (ev) => {
          const data = ev.data;
          if (!data || data.type !== 'BANCO_MATH_REQUEST') return;
          const respuesta = procesarMensajePeticion(data, 'BroadcastChannel');
          broadcastChannel.postMessage(respuesta);
        };
      } catch (_) {}
    }
  }

  Object.assign(NS, {
    VERSION: '1.0.0',
    TEMAS,
    NIVELES,
    TIPOS,
    CHANNEL_NAME,
    STORAGE_KEY,
    solicitarEjercicio,
    solicitarLote,
    obtenerCatalogo,
    obtenerConfiguracionActiva,
    guardarConfiguracionActiva,
    onSolicitudExterna
  });

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = NS;
  }
})(typeof window !== 'undefined' ? window : globalThis);
