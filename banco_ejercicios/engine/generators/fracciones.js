/**
 * engine/generators/fracciones.js
 * Generadores de operaciones y problemas de Fracciones (1º ESO – 2º Bachillerato).
 */
(function (root) {
  'use strict';

  const NS = (root.BancoMatematicas = root.BancoMatematicas || {});
  const U = NS.utils || (typeof require === 'function' ? require('../utils') : null);
  NS.generators = NS.generators || {};

  const op = {
    '1eso': [
      () => {
        const d1 = U.pick([2, 3, 4, 5, 6]);
        const d2 = U.pick([2, 3, 4, 5, 6]);
        const f1 = { n: U.randInt(1, d1 - 1), d: d1 };
        const f2 = { n: U.randInt(1, d2 - 1), d: d2 };
        const isSum = Math.random() < 0.6;
        const res = isSum ? U.addFrac(f1, f2) : U.subFrac(f1, f2);
        const wrong1 = { n: isSum ? f1.n + f2.n : f1.n - f2.n, d: f1.d + f2.d };
        const wrong2 = isSum ? U.subFrac(f1, f2) : U.addFrac(f1, f2);
        const wrong3 = { n: res.n + 1, d: res.d };
        return {
          enunciado: `Calcula y simplifica: ${U.fmtFrac(f1)} ${isSum ? '+' : '−'} ${U.fmtFrac(f2)}`,
          ...U.buildFractionChoices(res, [wrong1, wrong2, wrong3]),
          explicacion: `Reducimos a denominador común ${U.lcm(f1.d, f2.d)} y operamos numeradores para obtener la fracción irreducible ${U.fmtFrac(res)}.`,
          etiquetas: ['suma-resta-fracciones']
        };
      },
      () => {
        const f1 = { n: U.randInt(1, 5), d: U.pick([2, 3, 4, 5, 6]) };
        const f2 = { n: U.randInt(1, 5), d: U.pick([2, 3, 4, 5, 6]) };
        const isMul = Math.random() < 0.5;
        const res = isMul ? U.mulFrac(f1, f2) : U.divFrac(f1, f2);
        const wrong1 = isMul ? U.divFrac(f1, f2) : U.mulFrac(f1, f2);
        const wrong2 = { n: res.d, d: res.n || 1 };
        const wrong3 = U.addFrac(f1, f2);
        return {
          enunciado: `Calcula y simplifica: ${U.fmtFrac(f1)} ${isMul ? '·' : ':'} ${U.fmtFrac(f2)}`,
          ...U.buildFractionChoices(res, [wrong1, wrong2, wrong3]),
          explicacion: isMul
            ? `Multiplicamos en línea (${f1.n}·${f2.n})/(${f1.d}·${f2.d}) y simplificamos: ${U.fmtFrac(res)}.`
            : `Multiplicamos en cruz (${f1.n}·${f2.d})/(${f1.d}·${f2.n}) y simplificamos: ${U.fmtFrac(res)}.`,
          etiquetas: ['producto-cociente-fracciones']
        };
      }
    ],

    '2eso': [
      () => {
        const f1 = { n: U.nonZero(-4, 5), d: U.pick([2, 3, 4]) };
        const f2 = { n: U.nonZero(-3, 4), d: U.pick([2, 3, 5]) };
        const f3 = { n: U.randInt(1, 4), d: U.pick([2, 3, 4]) };
        const prod = U.mulFrac(f2, f3);
        const res = U.addFrac(f1, prod);
        const wrong1 = U.mulFrac(U.addFrac(f1, f2), f3);
        const wrong2 = U.subFrac(f1, prod);
        const wrong3 = { n: -res.n, d: res.d };
        return {
          enunciado: `Resuelve la operación combinada: ${U.fmtFrac(f1)} + ${U.fmtFracParen(f2)} · ${U.fmtFrac(f3)}`,
          ...U.buildFractionChoices(res, [wrong1, wrong2, wrong3]),
          explicacion: `Primero el producto: ${U.fmtFracParen(f2)} · ${U.fmtFrac(f3)} = ${U.fmtFrac(prod)}. Luego sumamos ${U.fmtFrac(f1)} y obtenemos ${U.fmtFrac(res)}.`,
          etiquetas: ['combinadas-fracciones', 'jerarquia']
        };
      },
      () => {
        const p = U.pick([1, 2, 4, 5, 7, 8]);
        const res = U.simplifyFraction(p, 9);
        return {
          enunciado: `¿Cuál es la fracción generatriz irreducible del número decimal periódico puro 0,${p}${p}${p}… (0,${p}̂)?`,
          ...U.buildFractionChoices(res, [{ n: p, d: 10 }, { n: p, d: 99 }, { n: p + 1, d: 9 }]),
          explicacion: `Para un decimal periódico puro de una cifra 0,${p}̂, dividimos el período entre 9: ${p}/9 = ${U.fmtFrac(res)}.`,
          etiquetas: ['fraccion-generatriz']
        };
      }
    ],

    '3eso': [
      () => {
        const da = U.pick([2, 3, 4]);
        const db = U.pick([2, 3, 5]);
        const dc = U.pick([2, 3, 4]);
        const a = { n: U.randInt(1, da - 1), d: da };
        const b = { n: U.randInt(1, db - 1), d: db };
        const c = { n: U.randInt(1, dc - 1), d: dc };
        const num = U.addFrac(a, b);
        const res = U.divFrac(num, c);
        const wrong1 = U.mulFrac(num, c);
        const wrong2 = U.addFrac(a, U.divFrac(b, c));
        const wrong3 = { n: res.d, d: res.n || 1 };
        return {
          enunciado: `Simplifica la fracción compuesta: (${U.fmtFrac(a)} + ${U.fmtFrac(b)}) / (${U.fmtFrac(c)})`,
          ...U.buildFractionChoices(res, [wrong1, wrong2, wrong3]),
          explicacion: `Numerador: ${U.fmtFrac(a)} + ${U.fmtFrac(b)} = ${U.fmtFrac(num)}. Dividiendo entre ${U.fmtFrac(c)} resulta ${U.fmtFrac(res)}.`,
          etiquetas: ['castillo-fracciones']
        };
      },
      () => {
        const entero = U.randInt(1, 3);
        const ante = U.randInt(1, 5);
        const per = U.pick([2, 3, 4, 6, 7]);
        const num = entero * 100 + ante * 10 + per - (entero * 10 + ante);
        const res = U.simplifyFraction(num, 90);
        return {
          enunciado: `Halla la fracción generatriz irreducible del decimal periódico mixto ${entero},${ante}${per}̂ (${entero},${ante}${per}${per}${per}…).`,
          ...U.buildFractionChoices(res, [
            U.simplifyFraction(entero * 100 + ante * 10 + per, 100),
            U.simplifyFraction(num, 99),
            U.simplifyFraction(num + 9, 90)
          ]),
          explicacion: `Restamos la parte no periódica (${entero}${ante}) al número completo (${entero}${ante}${per}) y dividimos entre 90: ${num}/90 = ${U.fmtFrac(res)}.`,
          etiquetas: ['periodico-mixto', 'fraccion-generatriz']
        };
      }
    ],

    '4eso': [
      () => {
        const a = U.randInt(2, 6);
        const xVal = U.randInt(a + 1, a + 6);
        const ans = xVal + a;
        return {
          enunciado: `Simplifica la fracción algebraica (x² − ${a * a}) / (x − ${a}) y evalúa el resultado para x = ${xVal}.`,
          ...U.buildNumericChoices(ans, [xVal - a, xVal * xVal - a * a, xVal + a * a, ans + 2]),
          explicacion: `Factorizamos la diferencia de cuadrados: (x − ${a})(x + ${a}) / (x − ${a}) = x + ${a}. Para x = ${xVal}: ${xVal} + ${a} = ${ans}.`,
          etiquetas: ['fracciones-algebraicas', 'identidades-notables']
        };
      },
      () => {
        const k = U.pick([2, 3, 4, 5, 6]);
        const r = U.pick([2, 3, 5, 7]);
        const num = k * r;
        const correct = `${k}√${r}`;
        return {
          enunciado: `Racionaliza y simplifica la fracción: ${num} / √${r}`,
          ...U.buildChoices(correct, [`${num}√${r}`, `${k}/${r}`, `√${num}`, `${r}√${k}`]),
          explicacion: `Multiplicamos numerador y denominador por √${r}: (${num}√${r})/${r} = ${k}√${r}.`,
          etiquetas: ['racionalizacion']
        };
      }
    ],

    '1bach': [
      () => {
        const a1 = U.randInt(2, 8);
        const d = U.pick([2, 3, 4, 5]);
        // S = a1 / (1 - 1/d) = a1 * d / (d - 1)
        const res = U.simplifyFraction(a1 * d, d - 1);
        return {
          enunciado: `Calcula la suma de todos los términos de la progresión geométrica infinita con a₁ = ${a1} y razón r = 1/${d}.`,
          ...U.buildFractionChoices(res, [
            U.simplifyFraction(a1, d - 1),
            U.simplifyFraction(a1 * d, d + 1),
            U.simplifyFraction(a1 * (d - 1), d)
          ]),
          explicacion: `Como |r| < 1, S∞ = a₁ / (1 − r) = ${a1} / (1 − 1/${d}) = ${a1} / (${d - 1}/${d}) = ${U.fmtFrac(res)}.`,
          etiquetas: ['serie-geometrica', 'fracciones']
        };
      },
      () => {
        const a = U.randInt(1, 5);
        const b = U.randInt(1, 5);
        const res = U.simplifyFraction(a, a + b);
        const den = a + b;
        return {
          enunciado: `Al descomponer (${a}x + ${a * b}) / [x(x + ${b})] en fracciones simples A/x + B/(x + ${b}), ¿cuál es el valor de A?`,
          ...U.buildNumericChoices(a, [b, a + b, -a, a * b]),
          explicacion: `Igualando numeradores: ${a}x + ${a * b} = A(x + ${b}) + Bx. Para x = 0: ${a * b} = A·${b} ⇒ A = ${a}.`,
          etiquetas: ['fracciones-simples', 'algebra']
        };
      }
    ],

    '2bach': [
      () => {
        const a = U.nonZero(-6, 8);
        const b = U.nonZero(-5, 5);
        const c = U.pick([2, 3, 4, 5, 6]);
        const d = U.nonZero(-7, 7);
        const res = U.simplifyFraction(a, c);
        return {
          enunciado: `Calcula el límite racional: lim(x → ∞) (${U.fmtNum(a)}x² ${U.fmtSignedTerm(b)}x) / (${c}x² ${U.fmtSignedTerm(d)})`,
          ...U.buildFractionChoices(res, [
            U.simplifyFraction(b, d || 1),
            U.simplifyFraction(a + b, c + d || 1),
            { n: 0, d: 1 }
          ]),
          explicacion: `Al tener el mismo grado en numerador y denominador (grado 2), el límite es el cociente de coeficientes líderes: ${U.fmtFrac(res)}.`,
          etiquetas: ['limites-racionales', 'calculo']
        };
      },
      () => {
        const a = U.randInt(1, 4);
        const n = U.pick([2, 3]);
        // Integral de 0 a a de x^n dx = a^(n+1) / (n+1)
        const res = U.simplifyFraction(Math.pow(a, n + 1), n + 1);
        return {
          enunciado: `Calcula como fracción irreducible la integral definida: ∫₀${U.sup(a)} x${U.sup(n)} dx`,
          ...U.buildFractionChoices(res, [
            U.simplifyFraction(Math.pow(a, n), n),
            U.simplifyFraction(Math.pow(a, n + 1), n),
            U.simplifyFraction(n * Math.pow(a, n - 1), 1)
          ]),
          explicacion: `Primitiva: x${U.sup(n + 1)}/${n + 1}. Evaluando entre 0 y ${a}: ${a}${U.sup(n + 1)}/${n + 1} = ${U.fmtFrac(res)}.`,
          etiquetas: ['integrales-definidas', 'fracciones']
        };
      }
    ]
  };

  const prob = {
    '1eso': [
      () => {
        const d1 = U.pick([3, 4, 5, 6]);
        const d2 = U.pick([4, 5, 6, 8]);
        const f1 = { n: 1, d: d1 };
        const f2 = { n: 1, d: d2 };
        const gastado = U.addFrac(f1, f2);
        const queda = U.subFrac({ n: 1, d: 1 }, gastado);
        return {
          enunciado: `De un depósito de agua lleno, se consume ${U.fmtFrac(f1)} por la mañana y ${U.fmtFrac(f2)} por la tarde. ¿Qué fracción del depósito queda llena?`,
          ...U.buildFractionChoices(queda, [gastado, U.subFrac(f1, f2), { n: 1, d: d1 + d2 }]),
          explicacion: `Se consume ${U.fmtFrac(f1)} + ${U.fmtFrac(f2)} = ${U.fmtFrac(gastado)}. Queda 1 − ${U.fmtFrac(gastado)} = ${U.fmtFrac(queda)}.`,
          etiquetas: ['problema-deposito', 'fracciones']
        };
      },
      () => {
        const pair = U.pick([[2, 3], [3, 4], [2, 5], [3, 5], [4, 5], [5, 6], [3, 8], [5, 8]]);
        const [num, den] = pair;
        const mult = U.randInt(5, 14);
        const total = den * mult;
        const ans = num * mult;
        return {
          enunciado: `Un libro tiene ${total} páginas. Si Marta ya ha leído ${num}/${den} del libro, ¿cuántas páginas lleva leídas?`,
          ...U.buildNumericChoices(ans, [total - ans, Math.round(total / den), ans + mult, ans - mult], 'páginas'),
          explicacion: `Calculamos (${num}/${den}) de ${total} = (${total} : ${den}) · ${num} = ${mult} · ${num} = ${ans} páginas.`,
          etiquetas: ['fraccion-de-cantidad']
        };
      }
    ],

    '2eso': [
      () => {
        const d1 = U.pick([3, 4, 5]);
        const d2 = U.pick([2, 3, 4]);
        const resto1 = { n: d1 - 1, d: d1 };
        const gasto2 = U.mulFrac({ n: 1, d: d2 }, resto1);
        const queda = U.subFrac(resto1, gasto2);
        return {
          enunciado: `Un excursionista recorre 1/${d1} de una ruta el primer día y 1/${d2} de lo que le quedaba el segundo día. ¿Qué fracción de la ruta le falta por recorrer?`,
          ...U.buildFractionChoices(queda, [
            U.subFrac({ n: 1, d: 1 }, U.addFrac({ n: 1, d: d1 }, { n: 1, d: d2 })),
            gasto2,
            resto1
          ]),
          explicacion: `Tras el primer día queda ${U.fmtFrac(resto1)}. El segundo día recorre (1/${d2})·(${U.fmtFrac(resto1)}) = ${U.fmtFrac(gasto2)}. Falta ${U.fmtFrac(resto1)} − ${U.fmtFrac(gasto2)} = ${U.fmtFrac(queda)}.`,
          etiquetas: ['fraccion-del-resto']
        };
      }
    ],

    '3eso': [
      () => {
        const pairs = [[3, 6], [4, 12], [6, 12], [2, 6], [4, 4], [6, 3], [5, 20]];
        const [a, b] = U.pick(pairs);
        const tasa = U.addFrac({ n: 1, d: a }, { n: 1, d: b });
        const tiempo = U.simplifyFraction(tasa.d, tasa.n);
        return {
          enunciado: `Un grifo llena un tanque en ${a} horas y otro grifo lo llena en ${b} horas. ¿Cuánto tiempo tardarán en llenarlo abriendo los dos a la vez?`,
          ...U.buildFractionChoices(tiempo, [
            { n: a + b, d: 2 },
            { n: a + b, d: 1 },
            tasa
          ], 'h'),
          explicacion: `En 1 hora llenan 1/${a} + 1/${b} = ${U.fmtFrac(tasa)} del tanque. Por tanto, tardan la inversa: ${U.fmtFrac(tiempo)} h.`,
          etiquetas: ['problema-grifos', 'trabajo-conjunto']
        };
      }
    ],

    '4eso': [
      () => {
        const pairs = [[40, 60], [60, 120], [30, 60], [20, 60], [30, 90]];
        const [v1, v2] = U.pick(pairs);
        const media = U.simplifyFraction(2 * v1 * v2, v1 + v2);
        return {
          enunciado: `Un coche recorre un trayecto de ida a ${v1} km/h y vuelve por la misma carretera a ${v2} km/h. ¿Cuál es su velocidad media en el recorrido total?`,
          ...U.buildFractionChoices(media, [
            U.simplifyFraction(v1 + v2, 2),
            U.simplifyFraction(v1 * v2, v1 + v2),
            U.simplifyFraction(v1 + v2, 1)
          ], 'km/h'),
          explicacion: `La velocidad media es la media armónica: 2·v₁·v₂ / (v₁ + v₂) = ${2 * v1 * v2} / ${v1 + v2} = ${U.fmtFrac(media)} km/h.`,
          etiquetas: ['media-armonica', 'velocidad-media']
        };
      }
    ],

    '1bach': [
      () => {
        const rojas = U.randInt(3, 6);
        const azules = U.randInt(3, 6);
        const total = rojas + azules;
        const prob2Rojas = U.simplifyFraction(rojas * (rojas - 1), total * (total - 1));
        return {
          enunciado: `Una urna contiene ${rojas} bolas rojas y ${azules} azules. Si se extraen 2 bolas sin reemplazamiento, ¿cuál es la probabilidad de que ambas sean rojas?`,
          ...U.buildFractionChoices(prob2Rojas, [
            U.simplifyFraction(rojas * rojas, total * total),
            U.simplifyFraction(rojas, total),
            U.simplifyFraction(rojas * azules, total * (total - 1))
          ]),
          explicacion: `P(R₁ ∩ R₂) = (${rojas}/${total}) · (${rojas - 1}/${total - 1}) = ${U.fmtFrac(prob2Rojas)}.`,
          etiquetas: ['probabilidad-condicionada', 'urnas']
        };
      }
    ],

    '2bach': [
      () => {
        // Fábrica A produce 60% (3/5) con 1/10 defectuosas; B produce 40% (2/5) con 1/20 defectuosas
        const configs = [
          { pA: { n: 3, d: 5 }, dA: { n: 1, d: 10 }, pB: { n: 2, d: 5 }, dB: { n: 1, d: 20 }, tA: '60%', tdA: '10%', tB: '40%', tdB: '5%' },
          { pA: { n: 1, d: 2 }, dA: { n: 1, d: 25 }, pB: { n: 1, d: 2 }, dB: { n: 1, d: 50 }, tA: '50%', tdA: '4%', tB: '50%', tdB: '2%' },
          { pA: { n: 2, d: 3 }, dA: { n: 1, d: 20 }, pB: { n: 1, d: 3 }, dB: { n: 1, d: 10 }, tA: '2/3', tdA: '5%', tB: '1/3', tdB: '10%' }
        ];
        const cfg = U.pick(configs);
        const numA = U.mulFrac(cfg.pA, cfg.dA);
        const numB = U.mulFrac(cfg.pB, cfg.dB);
        const pDef = U.addFrac(numA, numB);
        const bayesA = U.divFrac(numA, pDef);
        return {
          enunciado: `La máquina A fabrica el ${cfg.tA} de las piezas (con ${cfg.tdA} defectuosas) y la máquina B el ${cfg.tB} (con ${cfg.tdB} defectuosas). Si elegimos una pieza al azar y resulta defectuosa, ¿cuál es la probabilidad de que proceda de la máquina A?`,
          ...U.buildFractionChoices(bayesA, [
            U.divFrac(numB, pDef),
            pDef,
            numA
          ]),
          explicacion: `Por el Teorema de Bayes: P(A|D) = P(A∩D)/P(D) = ${U.fmtFrac(numA)} / (${U.fmtFrac(numA)} + ${U.fmtFrac(numB)}) = ${U.fmtFrac(bayesA)}.`,
          etiquetas: ['teorema-bayes', 'probabilidad']
        };
      }
    ]
  };

  NS.generators.fracciones = { operacion: op, problema: prob };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = NS.generators.fracciones;
  }
})(typeof window !== 'undefined' ? window : globalThis);
