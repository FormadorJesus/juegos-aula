/**
 * data/preguntas.js
 * Conecta HeroMath con el Banco de Ejercicios compartido (../banco_ejercicios/):
 * - Combates y esquivas (10 s): usa operaciones rápidas (o la modalidad elegida por el docente).
 * - Puertas y cofres (20 s): usa problemas contextualizados (o la modalidad elegida por el docente).
 * Soporta todos los temas (Enteros, Fracciones, Potencias, Ecuaciones, Funciones)
 * y cursos desde 1.º ESO hasta 2.º Bachillerato, con generador local de respaldo.
 */
window.HeroMath = window.HeroMath || {};

(function () {
  'use strict';

  const TEMA_ICONOS = {
    enteros: '➕',
    fracciones: '🍕',
    potencias: '⚡',
    ecuaciones: '⚖️',
    funciones: '📈'
  };

  function randInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  function nonZero(min, max) {
    let n = 0;
    while (n === 0) n = randInt(min, max);
    return n;
  }

  function fmt(n) {
    return n < 0 ? `(${n})` : `${n}`;
  }

  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function buildChoices(correct, candidates) {
    const set = new Set([String(correct)]);
    for (const c of candidates) {
      if (Number.isInteger(c)) set.add(String(c));
      if (set.size === 4) break;
    }
    let spread = 1;
    while (set.size < 4) {
      const delta = randInt(1, 4 + spread) * (Math.random() < 0.5 ? 1 : -1);
      set.add(String(correct + delta));
      spread++;
    }
    const opciones = shuffle(Array.from(set));
    const respuestaCorrecta = String(correct);
    return {
      opciones,
      respuestaCorrecta,
      indiceCorrecto: opciones.indexOf(respuestaCorrecta)
    };
  }

  function normalizeConfig(input) {
    if (!input) {
      return { temas: ['enteros'], nivel: '1eso', tipo: 'mixto' };
    }
    if (typeof input === 'string') {
      // Compatibilidad con llamadas antiguas ('basico' | 'intermedio' | 'completo')
      const nivelMap = { basico: '1eso', intermedio: '1eso', completo: '2eso' };
      return {
        temas: ['enteros'],
        nivel: nivelMap[input] || input || '1eso',
        tipo: 'mixto'
      };
    }
    return {
      temas: Array.isArray(input.temas) && input.temas.length ? input.temas.slice() : ['enteros'],
      nivel: input.nivel || '1eso',
      tipo: input.tipo || 'mixto'
    };
  }

  function adaptarEjercicioBanco(ej) {
    const opciones = (ej.opciones || []).map(o => String(o));
    const respuestaCorrecta = String(ej.respuestaCorrecta);
    let indiceCorrecto = Number.isInteger(ej.indiceCorrecto)
      ? ej.indiceCorrecto
      : opciones.indexOf(respuestaCorrecta);
    if (indiceCorrecto < 0 || indiceCorrecto >= opciones.length) {
      indiceCorrecto = Math.max(0, opciones.findIndex(o => o === respuestaCorrecta));
    }
    const ico = TEMA_ICONOS[ej.tema] || '📚';
    return {
      id: ej.id || '',
      temaId: ej.tema || 'enteros',
      temaLabel: ej.temaLabel || 'Matemáticas',
      nivel: ej.nivel || '1eso',
      nivelLabel: ej.nivelLabel || '1.º ESO',
      tipo: ej.tipo || 'operacion',
      tipoLabel: ej.tipoLabel || 'Ejercicio',
      tema: `${ico} ${ej.temaLabel || 'Matemáticas'} · ${ej.nivelLabel || '1.º ESO'}`,
      enunciado: String(ej.enunciado || ''),
      opciones,
      respuestaCorrecta,
      respuesta: respuestaCorrecta,
      indiceCorrecto,
      explicacion: String(ej.explicacion || '')
    };
  }

  // --- Generadores locales de respaldo si BancoMatematicas no estuviera disponible ---
  function fallbackOperacion() {
    const a = nonZero(-12, 12);
    const b = nonZero(-12, 12);
    const op = Math.random() < 0.5 ? '+' : '-';
    const res = op === '+' ? a + b : a - b;
    const ch = buildChoices(res, [-res, op === '+' ? a - b : a + b, res + 2, res - 2]);
    return {
      temaId: 'enteros',
      temaLabel: 'Números Enteros',
      nivel: '1eso',
      nivelLabel: '1.º ESO',
      tipo: 'operacion',
      tipoLabel: 'Operación',
      tema: '➕ Números Enteros · 1.º ESO',
      enunciado: `${a} ${op === '-' ? '−' : '+'} ${fmt(b)} = ?`,
      opciones: ch.opciones,
      respuestaCorrecta: ch.respuestaCorrecta,
      respuesta: ch.respuestaCorrecta,
      indiceCorrecto: ch.indiceCorrecto,
      explicacion: op === '+'
        ? `Al sumar ${a} y ${b}, obtenemos ${res}.`
        : `Restar ${b} equivale a sumar ${-b}: ${a} + (${-b}) = ${res}.`
    };
  }

  function fallbackProblema() {
    const inicio = randInt(-3, 6);
    const baja = randInt(4, 10);
    const res = inicio - baja;
    const ch = buildChoices(res, [-res, res + 2, res - 2, inicio + baja]);
    return {
      temaId: 'enteros',
      temaLabel: 'Números Enteros',
      nivel: '1eso',
      nivelLabel: '1.º ESO',
      tipo: 'problema',
      tipoLabel: 'Problema',
      tema: '➕ Números Enteros · 1.º ESO',
      enunciado: `Un ascensor está en la planta ${inicio} y baja ${baja} plantas. ¿En qué planta termina?`,
      opciones: ch.opciones,
      respuestaCorrecta: ch.respuestaCorrecta,
      respuesta: ch.respuestaCorrecta,
      indiceCorrecto: ch.indiceCorrecto,
      explicacion: `${inicio} − ${baja} = ${res}. Termina en la planta ${res}.`
    };
  }

  /**
   * Genera un ejercicio para combates y esquivas (10 s).
   * En modo 'mixto' usa operaciones rápidas; si el docente eligió 'operacion' o 'problema', respeta esa modalidad.
   */
  window.HeroMath.generarOperacionCombate = function (config) {
    const cfg = normalizeConfig(config);
    const tipoFinal = cfg.tipo === 'mixto' ? 'operacion' : cfg.tipo;

    if (window.BancoMatematicas && typeof window.BancoMatematicas.solicitarEjercicio === 'function') {
      try {
        const ej = window.BancoMatematicas.solicitarEjercicio({
          temas: cfg.temas,
          nivel: cfg.nivel,
          tipo: tipoFinal,
          origen: 'heromath_mazmorra'
        });
        return adaptarEjercicioBanco(ej);
      } catch (err) {
        console.warn('[HeroMath] Error en BancoMatematicas (combate), usando respaldo:', err);
      }
    }
    return fallbackOperacion();
  };

  /**
   * Genera un ejercicio para puertas y cofres (20 s).
   * En modo 'mixto' usa problemas contextualizados; si el docente eligió 'operacion' o 'problema', respeta esa modalidad.
   */
  window.HeroMath.generarProblemaCofre = function (config) {
    const cfg = normalizeConfig(config);
    const tipoFinal = cfg.tipo === 'mixto' ? 'problema' : cfg.tipo;

    if (window.BancoMatematicas && typeof window.BancoMatematicas.solicitarEjercicio === 'function') {
      try {
        const ej = window.BancoMatematicas.solicitarEjercicio({
          temas: cfg.temas,
          nivel: cfg.nivel,
          tipo: tipoFinal,
          origen: 'heromath_mazmorra'
        });
        return adaptarEjercicioBanco(ej);
      } catch (err) {
        console.warn('[HeroMath] Error en BancoMatematicas (cofre/puerta), usando respaldo:', err);
      }
    }
    return fallbackProblema();
  };

  // Alias de compatibilidad con versiones anteriores
  window.HeroMath.generarProblemaPuertaCofre = window.HeroMath.generarProblemaCofre;
})();
