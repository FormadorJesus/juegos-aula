/**
 * data/preguntas.js
 * - Combates y esquivas (10 s): SOLO operaciones aritméticas de enteros con 4 opciones (1 correcta, 3 distractores).
 * - Puertas y cofres (20 s): Problemas sencillos de números enteros de 1º de la ESO.
 */
window.HeroMath = window.HeroMath || {};

(function() {
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

  function fmtSigned(n) {
    return n < 0 ? `−${Math.abs(n)}` : `+${n}`;
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
    const set = new Set([correct]);
    for (const c of candidates) {
      if (Number.isInteger(c) && !set.has(c)) set.add(c);
      if (set.size === 4) break;
    }
    let spread = 1;
    while (set.size < 4) {
      const delta = randInt(1, 4 + spread) * (Math.random() < 0.5 ? 1 : -1);
      set.add(correct + delta);
      spread++;
    }
    return shuffle(Array.from(set));
  }

  /**
   * Genera una operación aritmética de números enteros con 4 opciones para combates (10 s).
   * @param {'basico'|'intermedio'|'completo'} nivel
   */
  window.HeroMath.generarOperacionCombate = function(nivel) {
    const tipoMax = nivel === 'basico' ? 2 : (nivel === 'intermedio' ? 5 : 7);
    const tipo = randInt(1, tipoMax);

    let enunciado = '';
    let respuesta = 0;
    let explicacion = '';
    let distractores = [];

    if (tipo === 1) {
      // Suma o resta directa: -7 + 12  o  4 - 11
      const a = nonZero(-12, 12);
      const b = nonZero(-12, 12);
      const op = Math.random() < 0.5 ? '+' : '-';
      respuesta = op === '+' ? a + b : a - b;
      const bStr = b < 0 ? `(${b})` : `${b}`;
      enunciado = `${a} ${op === '-' ? '−' : '+'} ${bStr}`;
      explicacion = op === '+'
        ? `Al sumar ${a} y ${b}, obtenemos ${respuesta}.`
        : `Restar ${b} equivale a sumar su opuesto (${-b}): ${a} + (${-b}) = ${respuesta}.`;
      distractores = [-respuesta, op === '+' ? a - b : a + b, respuesta + 2, respuesta - 2];
    } else if (tipo === 2) {
      // Suma/resta sin paréntesis de tres enteros cortos
      const a = nonZero(-9, 9);
      const b = nonZero(-9, 9);
      const c = nonZero(-8, 8);
      respuesta = a + b + c;
      enunciado = `${a} ${b >= 0 ? '+ ' + b : '− ' + Math.abs(b)} ${c >= 0 ? '+ ' + c : '− ' + Math.abs(c)}`;
      explicacion = `Agrupamos positivos y negativos paso a paso: (${a + b}) ${c >= 0 ? '+ ' + c : '− ' + Math.abs(c)} = ${respuesta}.`;
      distractores = [-respuesta, a + b - c, a - b + c, respuesta + 1];
    } else if (tipo === 3) {
      // Multiplicación de enteros
      const a = nonZero(-9, 9);
      const b = nonZero(-9, 9);
      // Asegurar al menos un negativo para practicar regla de signos
      const a2 = (a > 0 && b > 0) ? -a : a;
      respuesta = a2 * b;
      enunciado = `${fmt(a2)} · ${fmt(b)}`;
      explicacion = `Regla de signos: ${a2 < 0 ? '−' : '+'} por ${b < 0 ? '−' : '+'} es ${respuesta < 0 ? '−' : '+'}. Valor: ${Math.abs(a2)} · ${Math.abs(b)} = ${Math.abs(respuesta)} → ${respuesta}.`;
      distractores = [-respuesta, a2 + b, respuesta + Math.abs(b), respuesta - Math.abs(a2)];
    } else if (tipo === 4) {
      // División exacta de enteros
      const b = nonZero(-8, 8);
      const q = nonZero(-9, 9);
      const b2 = (b > 0 && q > 0) ? -b : b;
      const a = b2 * q;
      respuesta = q;
      enunciado = `${fmt(a)} : ${fmt(b2)}`;
      explicacion = `Regla de signos: ${a < 0 ? '−' : '+'} entre ${b2 < 0 ? '−' : '+'} es ${q < 0 ? '−' : '+'}. Cociente: ${Math.abs(a)} : ${Math.abs(b2)} = ${Math.abs(q)} → ${q}.`;
      distractores = [-q, q + 1, q - 1, q + 2];
    } else if (tipo === 5) {
      // Operación combinada: a + b · c
      const a = nonZero(-10, 10);
      const b = nonZero(-6, 6);
      const c = nonZero(-5, 5);
      respuesta = a + b * c;
      enunciado = `${a} + ${fmt(b)} · ${fmt(c)}`;
      explicacion = `Primero la multiplicación: ${fmt(b)} · ${fmt(c)} = ${b * c}. Luego: ${a} + (${b * c}) = ${respuesta}.`;
      distractores = [(a + b) * c, a - b * c, -respuesta, respuesta + 2];
    } else if (tipo === 6) {
      // Operación con paréntesis: a · (b + c)
      const a = nonZero(-6, 6);
      const b = nonZero(-8, 8);
      const c = nonZero(-8, 8);
      respuesta = a * (b + c);
      enunciado = `${fmt(a)} · (${b} ${c >= 0 ? '+ ' + c : '− ' + Math.abs(c)})`;
      explicacion = `Primero el paréntesis: ${b} ${c >= 0 ? '+ ' + c : '− ' + Math.abs(c)} = ${b + c}. Después: ${fmt(a)} · ${fmt(b + c)} = ${respuesta}.`;
      distractores = [a * b + c, -respuesta, a * (b - c), respuesta + a];
    } else {
      // Operación combinada con resta y multiplicación: a - b · c
      const a = nonZero(-10, 10);
      const b = nonZero(-5, 5);
      const c = nonZero(-5, 5);
      respuesta = a - b * c;
      enunciado = `${a} − ${fmt(b)} · ${fmt(c)}`;
      explicacion = `Primero el producto: ${fmt(b)} · ${fmt(c)} = ${b * c}. Luego restamos: ${a} − (${b * c}) = ${respuesta}.`;
      distractores = [a + b * c, (a - b) * c, -respuesta, respuesta - 2];
    }

    return {
      enunciado: enunciado + ' = ?',
      respuesta,
      opciones: buildChoices(respuesta, distractores),
      explicacion
    };
  };

  /**
   * Genera un problema sencillo de números enteros para puertas y cofres (20 s).
   * @param {'basico'|'intermedio'|'completo'} nivel
   */
  window.HeroMath.generarProblemaPuertaCofre = function(nivel) {
    const plantillas = [
      () => {
        const inicio = randInt(-3, 6);
        const baja = randInt(4, 10);
        const res = inicio - baja;
        return {
          tema: '🛗 Ascensor',
          enunciado: `Un ascensor está en la planta ${inicio} y baja ${baja} plantas. ¿En qué planta termina?`,
          respuesta: res,
          explicacion: `${inicio} − ${baja} = ${res}. Termina en la planta ${res}.`
        };
      },
      () => {
        const inicio = randInt(-6, -1);
        const sube = randInt(4, 12);
        const res = inicio + sube;
        return {
          tema: '🛗 Ascensor',
          enunciado: `Desde el sótano ${inicio}, subes ${sube} pisos en ascensor. ¿A qué piso llegas?`,
          respuesta: res,
          explicacion: `${inicio} + ${sube} = ${res}. Llegas al piso ${res}.`
        };
      },
      () => {
        const temp = randInt(-8, 4);
        const sube = randInt(5, 14);
        const res = temp + sube;
        return {
          tema: '🌡️ Temperatura',
          enunciado: `Al amanecer hace ${temp} °C. Al mediodía la temperatura sube ${sube} °C. ¿Qué temperatura hace ahora?`,
          respuesta: res,
          explicacion: `${temp} + ${sube} = ${res} °C.`
        };
      },
      () => {
        const temp = randInt(1, 9);
        const baja = randInt(6, 15);
        const res = temp - baja;
        return {
          tema: '🌡️ Temperatura',
          enunciado: `Por la tarde el termómetro marca ${temp} °C y por la noche baja ${baja} °C. ¿Qué temperatura marca por la noche?`,
          respuesta: res,
          explicacion: `${temp} − ${baja} = ${res} °C.`
        };
      },
      () => {
        const prof = -randInt(15, 45);
        const baja = randInt(10, 25);
        const res = prof - baja;
        return {
          tema: '🌊 Submarino',
          enunciado: `Un submarino está a ${prof} m de profundidad y desciende ${baja} m más. ¿A qué cota (en metros) se encuentra?`,
          respuesta: res,
          explicacion: `${prof} − ${baja} = ${res} m.`
        };
      },
      () => {
        const prof = -randInt(25, 60);
        const sube = randInt(10, 22);
        const res = prof + sube;
        return {
          tema: '🌊 Submarino',
          enunciado: `Un buzo se encuentra a ${prof} m bajo el nivel del mar y asciende ${sube} m. ¿A qué profundidad está ahora?`,
          respuesta: res,
          explicacion: `${prof} + ${sube} = ${res} m.`
        };
      },
      () => {
        const saldo = randInt(10, 35);
        const gasto = saldo + randInt(5, 25);
        const res = saldo - gasto;
        return {
          tema: '🪙 Tesoro y deudas',
          enunciado: `Tienes ${saldo} monedas en tu bolsa y debes pagar una cuenta de ${gasto} monedas. ¿Cuál es tu saldo final?`,
          respuesta: res,
          explicacion: `${saldo} − ${gasto} = ${res} monedas (saldo negativo / deuda).`
        };
      },
      () => {
        const deuda = -randInt(12, 30);
        const gana = randInt(15, 45);
        const res = deuda + gana;
        return {
          tema: '🪙 Tesoro y deudas',
          enunciado: `Tu equipo tiene un saldo de ${deuda} monedas y encuentra un saco con ${gana} monedas. ¿Cuál es vuestro nuevo saldo?`,
          respuesta: res,
          explicacion: `${deuda} + ${gana} = ${res} monedas.`
        };
      },
      () => {
        const t1 = randInt(4, 14);
        const t2 = -randInt(2, 9);
        const res = t1 - t2;
        return {
          tema: '❄️ Diferencia térmica',
          enunciado: `En la mazmorra hay ${t1} °C en la entrada y ${t2} °C en la cripta helada. ¿Cuántos grados de diferencia hay?`,
          respuesta: res,
          explicacion: `Diferencia = ${t1} − (${t2}) = ${t1} + ${Math.abs(t2)} = ${res} °C.`
        };
      },
      () => {
        const nacio = -randInt(40, 80);
        const vivio = randInt(45, 75);
        const res = nacio + vivio;
        return {
          tema: '📜 Historia',
          enunciado: `Un sabio nació en el año ${Math.abs(nacio)} a. C. (${nacio}) y vivió ${vivio} años. ¿En qué año murió?`,
          respuesta: res,
          explicacion: `${nacio} + ${vivio} = ${res} (${res >= 0 ? res + ' d. C.' : Math.abs(res) + ' a. C.'}).`
        };
      },
      () => {
        const bajaPorHora = randInt(2, 4);
        const horas = randInt(3, 5);
        const inicio = randInt(2, 8);
        const res = inicio - bajaPorHora * horas;
        return {
          tema: '❄️ Cámara frigorífica',
          enunciado: `Una sala está a ${inicio} °C y su temperatura baja ${bajaPorHora} °C cada hora durante ${horas} horas. ¿Qué temperatura alcanza?`,
          respuesta: res,
          explicacion: `${inicio} − (${bajaPorHora} · ${horas}) = ${inicio} − ${bajaPorHora * horas} = ${res} °C.`
        };
      },
      () => {
        const pisos = randInt(2, 4);
        const metros = randInt(3, 4);
        const res = -(pisos * metros);
        return {
          tema: '🏰 Mazmorra subterránea',
          enunciado: `Cada nivel subterráneo de la mazmorra mide ${metros} m de altura. Si bajas ${pisos} niveles desde el suelo (0 m), ¿a qué cota estás?`,
          respuesta: res,
          explicacion: `${pisos} · (−${metros}) = ${res} m.`
        };
      }
    ];

    const limite = nivel === 'basico' ? 8 : plantillas.length;
    const idx = randInt(0, limite - 1);
    const prob = plantillas[idx]();
    const distractores = [
      -prob.respuesta,
      prob.respuesta + randInt(2, 5),
      prob.respuesta - randInt(2, 5),
      prob.respuesta + (prob.respuesta >= 0 ? -10 : 10)
    ];
    prob.opciones = buildChoices(prob.respuesta, distractores);
    return prob;
  };
})();
