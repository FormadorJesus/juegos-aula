/**
 * engine/utils.js
 * Utilidades matemáticas, formateo tipográfico y construcción de opciones múltiples.
 */
(function (root) {
  'use strict';

  const NS = (root.BancoMatematicas = root.BancoMatematicas || {});

  function randInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  function nonZero(min, max) {
    let v = 0;
    let guard = 0;
    while (v === 0 && guard < 100) {
      v = randInt(min, max);
      guard++;
    }
    return v === 0 ? 1 : v;
  }

  function pick(arr) {
    return arr[randInt(0, arr.length - 1)];
  }

  function shuffle(arr) {
    const copy = arr.slice();
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const tmp = copy[i];
      copy[i] = copy[j];
      copy[j] = tmp;
    }
    return copy;
  }

  function gcd(a, b) {
    let x = Math.abs(Math.round(a));
    let y = Math.abs(Math.round(b));
    while (y !== 0) {
      const t = x % y;
      x = y;
      y = t;
    }
    return x || 1;
  }

  function lcm(a, b) {
    if (a === 0 || b === 0) return 0;
    return Math.abs(Math.round(a * b)) / gcd(a, b);
  }

  function simplifyFraction(num, den) {
    if (den === 0) throw new Error('Denominador cero');
    if (num === 0) return { n: 0, d: 1 };
    const sign = (num < 0) !== (den < 0) ? -1 : 1;
    const an = Math.abs(num);
    const ad = Math.abs(den);
    const g = gcd(an, ad);
    return { n: sign * (an / g), d: ad / g };
  }

  function addFrac(a, b) {
    return simplifyFraction(a.n * b.d + b.n * a.d, a.d * b.d);
  }

  function subFrac(a, b) {
    return simplifyFraction(a.n * b.d - b.n * a.d, a.d * b.d);
  }

  function mulFrac(a, b) {
    return simplifyFraction(a.n * b.n, a.d * b.d);
  }

  function divFrac(a, b) {
    return simplifyFraction(a.n * b.d, a.d * b.n);
  }

  function fmtFrac(f) {
    const s = simplifyFraction(f.n, f.d);
    if (s.d === 1) return fmtNum(s.n);
    return s.n < 0 ? `−${Math.abs(s.n)}/${s.d}` : `${s.n}/${s.d}`;
  }

  function fmtFracParen(f) {
    const s = simplifyFraction(f.n, f.d);
    const str = fmtFrac(s);
    return s.n < 0 ? `(${str})` : str;
  }

  function fmtNum(n) {
    if (Object.is(n, -0) || n === 0) return '0';
    return n < 0 ? `−${Math.abs(n)}` : `${n}`;
  }

  function fmtParen(n) {
    return n < 0 ? `(−${Math.abs(n)})` : `${n}`;
  }

  function fmtSignedTerm(n) {
    return n < 0 ? `− ${Math.abs(n)}` : `+ ${n}`;
  }

  const SUPER_MAP = {
    '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴',
    '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹',
    '-': '⁻', '−': '⁻', '+': '⁺', 'n': 'ⁿ', 'x': 'ˣ'
  };

  function sup(val) {
    return String(val)
      .split('')
      .map(ch => SUPER_MAP[ch] || ch)
      .join('');
  }

  function fmtLinear(a, b, v) {
    const variable = v || 'x';
    const parts = [];
    if (a !== 0) {
      if (a === 1) parts.push(variable);
      else if (a === -1) parts.push(`−${variable}`);
      else parts.push(`${fmtNum(a)}${variable}`);
    }
    if (b !== 0) {
      if (parts.length === 0) parts.push(fmtNum(b));
      else parts.push(b > 0 ? `+ ${b}` : `− ${Math.abs(b)}`);
    }
    return parts.length ? parts.join(' ') : '0';
  }

  function fmtQuadratic(a, b, c, v) {
    const variable = v || 'x';
    const parts = [];
    if (a !== 0) {
      if (a === 1) parts.push(`${variable}²`);
      else if (a === -1) parts.push(`−${variable}²`);
      else parts.push(`${fmtNum(a)}${variable}²`);
    }
    if (b !== 0) {
      if (parts.length === 0) {
        if (b === 1) parts.push(variable);
        else if (b === -1) parts.push(`−${variable}`);
        else parts.push(`${fmtNum(b)}${variable}`);
      } else {
        const absB = Math.abs(b);
        const coeff = absB === 1 ? '' : `${absB}`;
        parts.push(b > 0 ? `+ ${coeff}${variable}` : `− ${coeff}${variable}`);
      }
    }
    if (c !== 0) {
      if (parts.length === 0) parts.push(fmtNum(c));
      else parts.push(c > 0 ? `+ ${c}` : `− ${Math.abs(c)}`);
    }
    return parts.length ? parts.join(' ') : '0';
  }

  function fmtDecimal(n, maxDecimals) {
    const dec = typeof maxDecimals === 'number' ? maxDecimals : 2;
    const rounded = Number(n.toFixed(dec));
    const str = String(rounded).replace('.', ',');
    return rounded < 0 ? `−${str.slice(1)}` : str;
  }

  function normalizeOptionText(s) {
    return String(s).trim().replace(/\s+/g, ' ');
  }

  /**
   * Construye exactamente 4 opciones únicas (1 correcta + 3 distractores) y devuelve
   * { opciones, respuestaCorrecta, indiceCorrecto }.
   */
  function buildChoices(correct, candidates, fallbackFn) {
    const correctStr = normalizeOptionText(correct);
    const seen = new Set([correctStr]);
    const list = [correctStr];

    const pool = Array.isArray(candidates) ? candidates : [];
    for (let i = 0; i < pool.length && list.length < 4; i++) {
      if (pool[i] === null || pool[i] === undefined) continue;
      const cand = normalizeOptionText(pool[i]);
      if (cand && cand !== 'NaN' && cand !== 'undefined' && !seen.has(cand)) {
        seen.add(cand);
        list.push(cand);
      }
    }

    let step = 1;
    while (list.length < 4 && step < 80) {
      let extra;
      if (typeof fallbackFn === 'function') {
        extra = fallbackFn(step);
      } else {
        const numVal = Number(String(correct).replace('−', '-').replace(',', '.'));
        if (Number.isFinite(numVal) && Number.isInteger(numVal)) {
          const delta = (step % 2 === 0 ? 1 : -1) * Math.ceil(step / 2);
          extra = fmtNum(numVal + delta);
        } else {
          extra = `${correctStr} (${step})`;
        }
      }
      const cand = normalizeOptionText(extra);
      if (cand && !seen.has(cand)) {
        seen.add(cand);
        list.push(cand);
      }
      step++;
    }

    const mixed = shuffle(list);
    return {
      opciones: mixed,
      respuestaCorrecta: correctStr,
      indiceCorrecto: mixed.indexOf(correctStr)
    };
  }

  function buildNumericChoices(correctInt, candidates, unit) {
    const suffix = unit ? ` ${unit}` : '';
    const format = (v) => `${fmtNum(v)}${suffix}`;
    const strCands = (candidates || [])
      .filter((v) => typeof v === 'number' && Number.isFinite(v) && Number.isInteger(v))
      .map(format);
    return buildChoices(format(correctInt), strCands, (step) => {
      const mag = Math.max(1, Math.ceil(Math.abs(correctInt) * 0.12));
      const delta = (step % 2 === 0 ? 1 : -1) * (Math.ceil(step / 2) * (step > 4 ? mag : 1));
      return format(correctInt + delta);
    });
  }

  function buildFractionChoices(correctFrac, candidates, unit) {
    const suffix = unit ? ` ${unit}` : '';
    const simple = simplifyFraction(correctFrac.n, correctFrac.d);
    const format = (f) => `${fmtFrac(f)}${suffix}`;
    const strCands = (candidates || [])
      .filter((f) => f && Number.isFinite(f.n) && Number.isFinite(f.d) && f.d !== 0)
      .map(format);
    return buildChoices(format(simple), strCands, (step) => {
      const delta = (step % 2 === 0 ? 1 : -1) * Math.ceil(step / 2);
      return format({ n: simple.n + delta, d: simple.d });
    });
  }

  function factorial(n) {
    let r = 1;
    for (let i = 2; i <= n; i++) r *= i;
    return r;
  }

  function comb(n, k) {
    if (k < 0 || k > n) return 0;
    return Math.round(factorial(n) / (factorial(k) * factorial(n - k)));
  }

  NS.utils = {
    randInt,
    nonZero,
    pick,
    shuffle,
    gcd,
    lcm,
    simplifyFraction,
    addFrac,
    subFrac,
    mulFrac,
    divFrac,
    fmtFrac,
    fmtFracParen,
    fmtNum,
    fmtParen,
    fmtSignedTerm,
    sup,
    fmtLinear,
    fmtQuadratic,
    fmtDecimal,
    buildChoices,
    buildNumericChoices,
    buildFractionChoices,
    factorial,
    comb
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = NS.utils;
  }
})(typeof window !== 'undefined' ? window : globalThis);
