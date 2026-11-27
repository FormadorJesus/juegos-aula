/**
 * engine/generators/potencias.js
 * Generadores de operaciones y problemas de Potencias (1º ESO – 2º Bachillerato).
 */
(function (root) {
  'use strict';

  const NS = (root.BancoMatematicas = root.BancoMatematicas || {});
  const U = NS.utils || (typeof require === 'function' ? require('../utils') : null);
  NS.generators = NS.generators || {};

  const op = {
    '1eso': [
      () => {
        const base = U.pick([-3, -2, 2, 3, 4, 5]);
        const exp = Math.abs(base) >= 4 ? U.randInt(2, 3) : U.randInt(2, 4);
        const withParens = base < 0 ? Math.random() < 0.6 : true;
        const ans = withParens ? Math.pow(base, exp) : -Math.pow(Math.abs(base), exp);
        const expr = base < 0
          ? (withParens ? `(${U.fmtNum(base)})${U.sup(exp)}` : `−${Math.abs(base)}${U.sup(exp)}`)
          : `${base}${U.sup(exp)}`;
        return {
          enunciado: `Calcula el valor de la potencia: ${expr}`,
          ...U.buildNumericChoices(ans, [-ans, base * exp, Math.pow(Math.abs(base), exp - 1), ans + Math.abs(base)]),
          explicacion: withParens
            ? `Multiplicamos la base ${U.fmtNum(base)} por sí misma ${exp} veces: ${expr} = ${U.fmtNum(ans)}.`
            : `Sin paréntesis, el exponente afecta solo al ${Math.abs(base)}: −(${Math.abs(base)}${U.sup(exp)}) = ${U.fmtNum(ans)}.`,
          etiquetas: ['calculo-potencias', 'signo-potencia']
        };
      },
      () => {
        const base = U.pick([2, 3, 5, 7]);
        const a = U.randInt(2, 6);
        const b = U.randInt(2, 5);
        const isMul = Math.random() < 0.5;
        const resExp = isMul ? a + b : a + 3 - b;
        const aUse = isMul ? a : a + 3;
        const correct = `${base}${U.sup(resExp)}`;
        return {
          enunciado: `Expresa como una única potencia: ${base}${U.sup(aUse)} ${isMul ? '·' : ':'} ${base}${U.sup(b)}`,
          ...U.buildChoices(correct, [
            `${base}${U.sup(isMul ? aUse * b : Math.max(1, Math.floor(aUse / b)))}`,
            `${isMul ? base * base : 1}${U.sup(resExp)}`,
            `${base}${U.sup(isMul ? Math.abs(aUse - b) : aUse + b)}`,
            `${base}${U.sup(resExp + 1)}`
          ]),
          explicacion: isMul
            ? `En el producto de potencias de igual base se suman los exponentes: ${aUse} + ${b} = ${resExp} ⇒ ${correct}.`
            : `En el cociente de potencias de igual base se restan los exponentes: ${aUse} − ${b} = ${resExp} ⇒ ${correct}.`,
          etiquetas: ['propiedades-potencias']
        };
      }
    ],

    '2eso': [
      () => {
        const base = U.pick([2, 3, 4, 5]);
        const exp = U.randInt(1, 3);
        const res = U.simplifyFraction(1, Math.pow(base, exp));
        return {
          enunciado: `Calcula el valor exacto de la potencia de exponente negativo: ${base}${U.sup(-exp)}`,
          ...U.buildFractionChoices(res, [
            { n: -Math.pow(base, exp), d: 1 },
            { n: -1, d: Math.pow(base, exp) },
            { n: 1, d: base * exp }
          ]),
          explicacion: `Un exponente negativo invierte la base: ${base}${U.sup(-exp)} = 1 / ${base}${U.sup(exp)} = ${U.fmtFrac(res)}.`,
          etiquetas: ['exponente-negativo']
        };
      },
      () => {
        const pairs = [
          { b1: 4, p: 2, k1: 2 },
          { b1: 8, p: 2, k1: 3 },
          { b1: 9, p: 3, k1: 2 },
          { b1: 25, p: 5, k1: 2 }
        ];
        const cfg = U.pick(pairs);
        const e1 = U.randInt(2, 4);
        const e2 = U.randInt(2, 5);
        const resExp = cfg.k1 * e1 + e2;
        const correct = `${cfg.p}${U.sup(resExp)}`;
        return {
          enunciado: `Reduce a una única potencia de base ${cfg.p}: ${cfg.b1}${U.sup(e1)} · ${cfg.p}${U.sup(e2)}`,
          ...U.buildChoices(correct, [
            `${cfg.p}${U.sup(e1 + e2)}`,
            `${cfg.p}${U.sup(cfg.k1 * e1 * e2)}`,
            `${cfg.p}${U.sup(resExp - 1)}`,
            `${cfg.b1}${U.sup(e1 + e2)}`
          ]),
          explicacion: `Escribimos ${cfg.b1} = ${cfg.p}${U.sup(cfg.k1)}, luego (${cfg.p}${U.sup(cfg.k1)})${U.sup(e1)} · ${cfg.p}${U.sup(e2)} = ${cfg.p}${U.sup(cfg.k1 * e1)} · ${cfg.p}${U.sup(e2)} = ${correct}.`,
          etiquetas: ['cambio-de-base', 'potencias']
        };
      }
    ],

    '3eso': [
      () => {
        const a = U.pick([2, 3, 4]);
        const b = U.pick([2, 3]);
        const e1 = U.randInt(3, 7);
        const e2 = U.randInt(-4, 5);
        const coef = a * b;
        let finalCoef = coef;
        let finalExp = e1 + e2;
        if (finalCoef >= 10) {
          finalCoef = Number((finalCoef / 10).toFixed(1));
          finalExp += 1;
        }
        const correct = `${U.fmtDecimal(finalCoef, 1)} · 10${U.sup(finalExp)}`;
        return {
          enunciado: `Calcula en notación científica: (${a} · 10${U.sup(e1)}) · (${b} · 10${U.sup(e2)})`,
          ...U.buildChoices(correct, [
            `${U.fmtDecimal(finalCoef, 1)} · 10${U.sup(finalExp - 1)}`,
            `${U.fmtDecimal(finalCoef, 1)} · 10${U.sup(e1 * e2)}`,
            `${U.fmtDecimal(a + b, 1)} · 10${U.sup(finalExp)}`,
            `${U.fmtDecimal(finalCoef, 1)} · 10${U.sup(finalExp + 1)}`
          ]),
          explicacion: `Multiplicamos mantisas (${a}·${b} = ${coef}) y sumamos exponentes (${e1} + ${U.fmtParen(e2)} = ${e1 + e2}). Ajustando a notación científica: ${correct}.`,
          etiquetas: ['notacion-cientifica']
        };
      },
      () => {
        const cases = [
          { base: 8, num: 2, den: 3, ans: 4 },
          { base: 16, num: 3, den: 4, ans: 8 },
          { base: 27, num: 2, den: 3, ans: 9 },
          { base: 9, num: 3, den: 2, ans: 27 },
          { base: 32, num: 2, den: 5, ans: 4 },
          { base: 25, num: 3, den: 2, ans: 125 }
        ];
        const c = U.pick(cases);
        return {
          enunciado: `Calcula el valor exacto de la potencia de exponente fraccionario: ${c.base}^(${c.num}/${c.den})`,
          ...U.buildNumericChoices(c.ans, [Math.round(c.base * c.num / c.den), c.ans * 2, Math.max(1, Math.round(c.base / c.den)), c.ans + c.den]),
          explicacion: `${c.base}^(${c.num}/${c.den}) = (${c.den}√${c.base})${U.sup(c.num)} = ${Math.round(Math.pow(c.base, 1 / c.den))}${U.sup(c.num)} = ${c.ans}.`,
          etiquetas: ['exponente-fraccionario', 'radicales']
        };
      }
    ],

    '4eso': [
      () => {
        const cases = [
          { b: 2, val: '1/8', ans: -3, exp: '2⁻³ = 1/8' },
          { b: 2, val: '1/16', ans: -4, exp: '2⁻⁴ = 1/16' },
          { b: 3, val: '1/9', ans: -2, exp: '3⁻² = 1/9' },
          { b: 3, val: '81', ans: 4, exp: '3⁴ = 81' },
          { b: 5, val: '125', ans: 3, exp: '5³ = 125' },
          { b: 2, val: '√8', ans: '3/2', exp: '√8 = (2³)^(1/2) = 2^(3/2)', isFrac: true, frac: { n: 3, d: 2 } },
          { b: 3, val: '√27', ans: '3/2', exp: '√27 = (3³)^(1/2) = 3^(3/2)', isFrac: true, frac: { n: 3, d: 2 } }
        ];
        const c = U.pick(cases);
        if (c.isFrac) {
          return {
            enunciado: `Calcula usando potencias el valor exacto de: log_${c.b}(${c.val})`,
            ...U.buildFractionChoices(c.frac, [{ n: 2, d: 3 }, { n: 3, d: 1 }, { n: -3, d: 2 }]),
            explicacion: `Como ${c.exp}, entonces log_${c.b}(${c.val}) = ${c.ans}.`,
            etiquetas: ['logaritmos-potencias']
          };
        }
        return {
          enunciado: `Calcula aplicando la definición de potencia y logaritmo: log_${c.b}(${c.val})`,
          ...U.buildNumericChoices(c.ans, [-c.ans, c.ans + 1, c.ans - 1, c.b]),
          explicacion: `Buscamos el exponente al que elevar ${c.b}: ${c.exp}, luego el resultado es ${U.fmtNum(c.ans)}.`,
          etiquetas: ['logaritmos-potencias']
        };
      }
    ],

    '1bach': [
      () => {
        const b = U.pick([2, 3, 5]);
        const x = U.randInt(1, 5);
        const m = U.pick([2, 3]);
        const k = U.nonZero(-3, 4);
        const rhsExp = m * x + k;
        const rhsVal = Math.pow(b, rhsExp);
        if (rhsVal > 3125) {
          const x2 = 2;
          const ans2 = x2;
          return {
            enunciado: `Resuelve la ecuación exponencial: 2^(3x − 1) = 32`,
            ...U.buildNumericChoices(ans2, [1, 3, -2, 4]),
            explicacion: `Como 32 = 2⁵, igualamos exponentes: 3x − 1 = 5 ⇒ 3x = 6 ⇒ x = 2.`,
            etiquetas: ['ecuacion-exponencial']
          };
        }
        return {
          enunciado: `Halla el valor de x en la ecuación exponencial: ${b}^(${U.fmtLinear(m, k)}) = ${rhsVal}`,
          ...U.buildNumericChoices(x, [rhsExp, x + 1, x - 1, -x]),
          explicacion: `Como ${rhsVal} = ${b}${U.sup(rhsExp)}, igualamos exponentes: ${U.fmtLinear(m, k)} = ${rhsExp} ⇒ x = ${x}.`,
          etiquetas: ['ecuacion-exponencial', 'cambio-base']
        };
      }
    ],

    '2bach': [
      () => {
        const k = U.nonZero(-5, 6);
        const correct = `e${U.sup(k)}`;
        return {
          enunciado: `Calcula el límite exponencial (indeterminación 1^∞): lim(x → ∞) (1 + ${U.fmtNum(k)}/x)ˣ`,
          ...U.buildChoices(correct, [`e${U.sup(-k)}`, `${U.fmtNum(k)}e`, '1', `e${U.sup(k + 1)}`]),
          explicacion: `Por el límite notable lim(x→∞)(1 + k/x)ˣ = eᵏ, el resultado es ${correct}.`,
          etiquetas: ['limite-numero-e', 'potencias']
        };
      },
      () => {
        const a = U.randInt(2, 5);
        const n = U.randInt(3, 5);
        const x0 = U.pick([1, 2]);
        const ans = a * n * Math.pow(x0, n - 1);
        return {
          enunciado: `Dada la función potencial f(x) = ${a}x${U.sup(n)}, calcula el valor de su derivada en x = ${x0}, es decir, f'(${x0}).`,
          ...U.buildNumericChoices(ans, [a * Math.pow(x0, n), a * (n - 1) * Math.pow(x0, n - 1), n * Math.pow(x0, n - 1), ans + a]),
          explicacion: `Derivamos: f'(x) = ${a}·${n}x${U.sup(n - 1)} = ${a * n}x${U.sup(n - 1)}. En x = ${x0}: f'(${x0}) = ${ans}.`,
          etiquetas: ['derivada-potencial']
        };
      }
    ]
  };

  const prob = {
    '1eso': [
      () => {
        const horas = U.randInt(4, 7);
        const inicial = U.pick([1, 3, 5]);
        const ans = inicial * Math.pow(2, horas);
        return {
          enunciado: `En un laboratorio hay ${inicial} ${inicial === 1 ? 'bacteria' : 'bacterias'} que se duplican cada hora. ¿Cuántas bacterias habrá al cabo de ${horas} horas?`,
          ...U.buildNumericChoices(ans, [inicial * 2 * horas, Math.pow(2, horas - 1) * inicial, ans * 2, inicial + Math.pow(2, horas)], 'bacterias'),
          explicacion: `Tras ${horas} duplicaciones: ${inicial} · 2${U.sup(horas)} = ${inicial} · ${Math.pow(2, horas)} = ${ans} bacterias.`,
          etiquetas: ['crecimiento-duplicacion', 'potencias']
        };
      }
    ],

    '2eso': [
      () => {
        const gb = U.pick([2, 4, 8, 16]);
        const expGb = Math.round(Math.log2(gb));
        // 1 GB = 2^10 MB -> gb GB = 2^(expGb + 10) MB
        const totalExp = expGb + 10;
        const correct = `2${U.sup(totalExp)} MB`;
        return {
          enunciado: `Sabiendo que 1 GB equivale a 2¹⁰ MB, expresa la capacidad de una memoria USB de ${gb} GB en megabytes como potencia de base 2.`,
          ...U.buildChoices(correct, [`2${U.sup(expGb * 10)} MB`, `2${U.sup(totalExp - 1)} MB`, `${gb}¹⁰ MB`, `2${U.sup(totalExp + 2)} MB`]),
          explicacion: `${gb} = 2${U.sup(expGb)}, por tanto ${gb} GB = 2${U.sup(expGb)} · 2¹⁰ MB = 2${U.sup(totalExp)} MB.`,
          etiquetas: ['problema-informatica', 'potencias-de-2']
        };
      }
    ],

    '3eso': [
      () => {
        const capital = U.pick([1000, 2000, 5000]);
        const tasa = U.pick([10, 20]);
        const anios = 2;
        const factor = 1 + tasa / 100;
        const ans = Math.round(capital * Math.pow(factor, anios));
        const simple = Math.round(capital * (1 + (tasa / 100) * anios));
        return {
          enunciado: `Se invierten ${capital} € a un interés compuesto anual del ${tasa}% durante ${anios} años. ¿Cuál será el capital final?`,
          ...U.buildNumericChoices(ans, [simple, capital + tasa * anios, Math.round(capital * factor), ans + 100], '€'),
          explicacion: `C_f = ${capital} · (1 + ${tasa / 100})² = ${capital} · ${U.fmtDecimal(factor * factor, 2)} = ${ans} €.`,
          etiquetas: ['interes-compuesto', 'potencias']
        };
      }
    ],

    '4eso': [
      () => {
        const n0 = U.pick([160, 320, 400, 640, 800]);
        const periodo = U.pick([5, 6, 8, 10]);
        const ciclos = U.randInt(3, 4);
        const tiempo = periodo * ciclos;
        const ans = Math.round(n0 / Math.pow(2, ciclos));
        return {
          enunciado: `Una muestra radiactiva de ${n0} g reduce su masa a la mitad cada ${periodo} años. ¿Cuántos gramos quedarán al cabo de ${tiempo} años?`,
          ...U.buildNumericChoices(ans, [Math.round(n0 / ciclos), ans * 2, Math.max(1, Math.round(ans / 2)), n0 - ciclos * periodo], 'g'),
          explicacion: `En ${tiempo} años pasan ${tiempo}/${periodo} = ${ciclos} periodos de semidesintegración: ${n0} · (1/2)${U.sup(ciclos)} = ${ans} g.`,
          etiquetas: ['semidesintegracion', 'potencias']
        };
      }
    ],

    '1bach': [
      () => {
        const periodo = U.pick([3, 4, 5, 6]);
        const k = U.pick([3, 4, 5]);
        const mult = Math.pow(2, k);
        const ans = periodo * k;
        return {
          enunciado: `Un cultivo de microalgas duplica su biomasa cada ${periodo} días según B(t) = B₀ · 2^(t/${periodo}). ¿Cuántos días deben pasar para que la biomasa sea ${mult} veces la inicial?`,
          ...U.buildNumericChoices(ans, [periodo * mult, Math.round(mult / 2), ans + periodo, ans - periodo], 'días'),
          explicacion: `2^(t/${periodo}) = ${mult} = 2${U.sup(k)} ⇒ t/${periodo} = ${k} ⇒ t = ${ans} días.`,
          etiquetas: ['crecimiento-exponencial', 'problema-tiempo']
        };
      }
    ],

    '2bach': [
      () => {
        const k = U.pick([2, 3, 4]);
        const n0 = U.pick([50, 100, 200]);
        const ans = n0 * k;
        return {
          enunciado: `La población de un cultivo evoluciona según P(t) = ${n0} · e^(${k}t), con t en horas. ¿Cuál es la tasa instantánea de crecimiento en el instante inicial t = 0?`,
          ...U.buildNumericChoices(ans, [n0, k, n0 * k * k, n0 + k], 'ind./h'),
          explicacion: `Derivamos: P'(t) = ${n0}·${k}·e^(${k}t). Evaluando en t = 0 (e⁰ = 1): P'(0) = ${ans} ind./h.`,
          etiquetas: ['tasa-instantanea', 'derivada-exponencial']
        };
      }
    ]
  };

  NS.generators.potencias = { operacion: op, problema: prob };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = NS.generators.potencias;
  }
})(typeof window !== 'undefined' ? window : globalThis);
