/**
 * engine/generators/ecuaciones.js
 * Generadores de operaciones y problemas de Ecuaciones (1º ESO – 2º Bachillerato).
 */
(function (root) {
  'use strict';

  const NS = (root.BancoMatematicas = root.BancoMatematicas || {});
  const U = NS.utils || (typeof require === 'function' ? require('../utils') : null);
  NS.generators = NS.generators || {};

  const op = {
    '1eso': [
      () => {
        const x = U.nonZero(-9, 12);
        const a = U.randInt(2, 6);
        const b = U.nonZero(-12, 12);
        const c = a * x + b;
        return {
          enunciado: `Resuelve la ecuación de primer grado: ${U.fmtLinear(a, b)} = ${U.fmtNum(c)}`,
          ...U.buildNumericChoices(x, [-x, x + 2, x - 2, Math.round((c + b) / a) === x ? x + 1 : Math.round((c + b) / a)]),
          explicacion: `Despejamos: ${a}x = ${U.fmtNum(c)} ${U.fmtSignedTerm(-b)} = ${U.fmtNum(c - b)} ⇒ x = ${U.fmtNum(c - b)} / ${a} = ${U.fmtNum(x)}.`,
          etiquetas: ['ecuacion-primer-grado']
        };
      },
      () => {
        const x = U.nonZero(-8, 10);
        const a = U.randInt(3, 7);
        const c = U.randInt(1, a - 1);
        const b = U.nonZero(-10, 10);
        const d = (a - c) * x + b;
        return {
          enunciado: `Halla el valor de x: ${U.fmtLinear(a, b)} = ${U.fmtLinear(c, d)}`,
          ...U.buildNumericChoices(x, [-x, x + 1, x - 1, x + 3]),
          explicacion: `Agrupamos términos: (${a} − ${c})x = ${U.fmtNum(d)} ${U.fmtSignedTerm(-b)} ⇒ ${a - c}x = ${U.fmtNum(d - b)} ⇒ x = ${U.fmtNum(x)}.`,
          etiquetas: ['ecuacion-primer-grado', 'transposicion']
        };
      }
    ],

    '2eso': [
      () => {
        const r1 = U.nonZero(-6, 6);
        let r2 = U.nonZero(-6, 6);
        while (r2 === r1) r2 = U.nonZero(-6, 6);
        const b = -(r1 + r2);
        const c = r1 * r2;
        const mayor = Math.max(r1, r2);
        const menor = Math.min(r1, r2);
        return {
          enunciado: `¿Cuál es la mayor solución de la ecuación de segundo grado ${U.fmtQuadratic(1, b, c)} = 0?`,
          ...U.buildNumericChoices(mayor, [menor, -mayor, -menor, r1 + r2]),
          explicacion: `Factorizamos (x ${U.fmtSignedTerm(-r1)})(x ${U.fmtSignedTerm(-r2)}) = 0. Las soluciones son ${U.fmtNum(menor)} y ${U.fmtNum(mayor)}; la mayor es ${U.fmtNum(mayor)}.`,
          etiquetas: ['ecuacion-segundo-grado']
        };
      },
      () => {
        const x = U.nonZero(-5, 7);
        const y = U.nonZero(-5, 7);
        const s1 = x + y;
        const s2 = 2 * x - y;
        return {
          enunciado: `Resuelve el sistema lineal { x + y = ${U.fmtNum(s1)} ; 2x − y = ${U.fmtNum(s2)} }. ¿Cuánto vale x?`,
          ...U.buildNumericChoices(x, [y, -x, x + 1, s1 - x]),
          explicacion: `Sumando ambas ecuaciones eliminamos y: 3x = ${U.fmtNum(s1 + s2)} ⇒ x = ${U.fmtNum(x)}.`,
          etiquetas: ['sistema-lineal-2x2']
        };
      }
    ],

    '3eso': [
      () => {
        const r1 = U.randInt(1, 5);
        const r2 = U.randInt(r1 + 1, 7);
        // Ecuación bicuadrada: (x^2 - r1^2)(x^2 - r2^2) = 0 -> x^4 - (r1^2+r2^2)x^2 + r1^2*r2^2 = 0
        const b = -(r1 * r1 + r2 * r2);
        const c = r1 * r1 * r2 * r2;
        return {
          enunciado: `Halla la mayor solución real de la ecuación bicuadrada: x⁴ − ${Math.abs(b)}x² + ${c} = 0`,
          ...U.buildNumericChoices(r2, [r1, r2 * r2, r1 * r1, r1 + r2]),
          explicacion: `Con t = x², obtenemos t² − ${Math.abs(b)}t + ${c} = 0 ⇒ t = ${r1 * r1} o t = ${r2 * r2}. Las soluciones reales son ±${r1} y ±${r2}; la mayor es ${r2}.`,
          etiquetas: ['ecuacion-bicuadrada']
        };
      },
      () => {
        const x = U.randInt(2, 7);
        const y = U.randInt(-4, 5);
        const e1 = 3 * x + 2 * y;
        const e2 = 2 * x - 2 * y;
        return {
          enunciado: `En el sistema { 3x + 2y = ${U.fmtNum(e1)} ; 2x − 2y = ${U.fmtNum(e2)} }, ¿cuál es el valor de x?`,
          ...U.buildNumericChoices(x, [y, x + 2, -x, Math.round((e1 - e2) / 5) === x ? x - 1 : Math.round((e1 - e2) / 5)]),
          explicacion: `Por reducción, sumando las dos ecuaciones: 5x = ${U.fmtNum(e1 + e2)} ⇒ x = ${U.fmtNum(x)}.`,
          etiquetas: ['sistemas-reduccion']
        };
      }
    ],

    '4eso': [
      () => {
        const x = U.randInt(3, 12);
        const a = U.randInt(2, 4);
        const b = U.randInt(1, 6);
        const rhs = a * x + b;
        // Hacer que rhs sea cuadrado perfecto
        const raiz = U.randInt(3, 7);
        const a2 = U.pick([2, 3, 4]);
        const x2 = U.randInt(2, 9);
        const b2 = raiz * raiz - a2 * x2;
        return {
          enunciado: `Resuelve la ecuación irracional: √(${U.fmtLinear(a2, b2)}) = ${raiz}`,
          ...U.buildNumericChoices(x2, [raiz, x2 + 2, Math.abs(b2), -x2]),
          explicacion: `Elevamos al cuadrado: ${U.fmtLinear(a2, b2)} = ${raiz * raiz} ⇒ ${a2}x = ${a2 * x2} ⇒ x = ${x2} (comprobada válida).`,
          etiquetas: ['ecuacion-irracional']
        };
      },
      () => {
        const b = U.pick([2, 3, 5]);
        const c = U.randInt(2, 3);
        const k = U.randInt(1, 9);
        const x = Math.pow(b, c) + k;
        return {
          enunciado: `Resuelve la ecuación logarítmica: log_${b}(x − ${k}) = ${c}`,
          ...U.buildNumericChoices(x, [b * c + k, Math.pow(b, c) - k, Math.pow(c, b) + k, x + 2]),
          explicacion: `Por definición de logaritmo: x − ${k} = ${b}${U.sup(c)} = ${Math.pow(b, c)} ⇒ x = ${x}.`,
          etiquetas: ['ecuacion-logaritmica']
        };
      }
    ],

    '1bach': [
      () => {
        const trig = [
          { eq: 'sen(x) = 1/2', ans: '30°', dist: ['60°', '45°', '90°'], exp: 'En el primer cuadrante, sen(30°) = 1/2.' },
          { eq: 'cos(x) = 1/2', ans: '60°', dist: ['30°', '45°', '0°'], exp: 'En el primer cuadrante, cos(60°) = 1/2.' },
          { eq: 'tg(x) = 1', ans: '45°', dist: ['30°', '60°', '90°'], exp: 'sen(45°) = cos(45°), por tanto tg(45°) = 1.' },
          { eq: 'sen(x) = √3/2', ans: '60°', dist: ['30°', '45°', '90°'], exp: 'En [0°, 90°], sen(60°) = √3/2.' },
          { eq: 'cos(x) = √2/2', ans: '45°', dist: ['30°', '60°', '90°'], exp: 'En [0°, 90°], cos(45°) = √2/2.' }
        ];
        const t = U.pick(trig);
        return {
          enunciado: `Resuelve la ecuación trigonométrica en el intervalo [0°, 90°]: ${t.eq}`,
          ...U.buildChoices(t.ans, t.dist),
          explicacion: t.exp,
          etiquetas: ['ecuacion-trigonometrica']
        };
      },
      () => {
        // 2^(2x) - (2^a + 2^b)*2^x + 2^(a+b) = 0
        const a = U.pick([1, 2]);
        const b = a + U.pick([1, 2]);
        const sum = Math.pow(2, a) + Math.pow(2, b);
        const prod = Math.pow(2, a + b);
        return {
          enunciado: `¿Cuál es la mayor solución de la ecuación exponencial 4ˣ − ${sum}·2ˣ + ${prod} = 0?`,
          ...U.buildNumericChoices(b, [a, Math.pow(2, b), a + b, b + 1]),
          explicacion: `Con t = 2ˣ: t² − ${sum}t + ${prod} = 0 ⇒ t = ${Math.pow(2, a)} o t = ${Math.pow(2, b)}. Luego x = ${a} o x = ${b}; la mayor es ${b}.`,
          etiquetas: ['ecuacion-exponencial-cuadratica']
        };
      }
    ],

    '2bach': [
      () => {
        // Discusión de parámetro k para que det(A) = 0: [[k, a], [b, c]] -> k*c - a*b = 0
        const c = U.pick([2, 3, 4]);
        const k = U.nonZero(-6, 6);
        const b = U.pick([2, 3, 4]);
        const a = (k * c) / b;
        // Garantizar a entero
        const aInt = U.nonZero(-5, 5);
        const kAns = aInt * b;
        // det([[k, aInt*c], [b, c]]) = k*c - aInt*b*c = c*(k - aInt*b) = 0 -> k = aInt*b
        return {
          enunciado: `¿Para qué valor del parámetro k la matriz A = [[k, ${U.fmtNum(aInt * c)}], [${b}, ${c}]] NO tiene inversa (det(A) = 0)?`,
          ...U.buildNumericChoices(kAns, [-kAns, aInt * c, kAns + b, Math.round(kAns / 2)]),
          explicacion: `det(A) = ${c}k − (${U.fmtNum(aInt * c)})·${b} = ${c}k − ${U.fmtNum(aInt * b * c)} = 0 ⇒ k = ${U.fmtNum(kAns)}.`,
          etiquetas: ['ecuacion-determinante', 'parametro-k']
        };
      },
      () => {
        const x = U.randInt(1, 5);
        const y = U.randInt(1, 5);
        const z = U.randInt(1, 5);
        const s1 = x + y + z;
        const s2 = x - y + z;
        const s3 = 2 * z;
        return {
          enunciado: `Resuelve el sistema 3×3: { x + y + z = ${s1} ; x − y + z = ${s2} ; 2z = ${s3} }. ¿Cuál es el valor de y?`,
          ...U.buildNumericChoices(y, [x, z, y + 1, -y]),
          explicacion: `Restando la 2ª ecuación a la 1ª: 2y = ${s1} − ${s2} = ${2 * y} ⇒ y = ${y}.`,
          etiquetas: ['sistema-3x3', 'gauss']
        };
      }
    ]
  };

  const prob = {
    '1eso': [
      () => {
        const x = U.randInt(6, 22);
        const k = U.randInt(3, 12);
        const total = 2 * x + k;
        return {
          enunciado: `El doble de un número aumentado en ${k} es igual a ${total}. ¿Cuál es ese número?`,
          ...U.buildNumericChoices(x, [total - k, x + k, Math.round((total + k) / 2), x - 2]),
          explicacion: `Planteamos 2x + ${k} = ${total} ⇒ 2x = ${total - k} ⇒ x = ${x}.`,
          etiquetas: ['lenguaje-algebraico', 'ecuaciones']
        };
      },
      () => {
        const ancho = U.randInt(5, 14);
        const diff = U.randInt(3, 8);
        const largo = ancho + diff;
        const perimetro = 2 * (ancho + largo);
        return {
          enunciado: `El largo de una pista rectangular mide ${diff} m más que su ancho. Si el perímetro total es ${perimetro} m, ¿cuánto mide el ancho?`,
          ...U.buildNumericChoices(ancho, [largo, Math.round(perimetro / 4), ancho + 2, ancho - 2], 'm'),
          explicacion: `2(x + x + ${diff}) = ${perimetro} ⇒ 4x + ${2 * diff} = ${perimetro} ⇒ 4x = ${4 * ancho} ⇒ x = ${ancho} m.`,
          etiquetas: ['problema-geometria', 'perimetro']
        };
      }
    ],

    '2eso': [
      () => {
        const hijo = U.randInt(8, 15);
        const padre = 3 * hijo;
        const suma = hijo + padre;
        return {
          enunciado: `Un padre tiene el triple de edad que su hijo y entre los dos suman ${suma} años. ¿Cuántos años tiene el hijo?`,
          ...U.buildNumericChoices(hijo, [padre, Math.round(suma / 3), hijo + 3, hijo - 2], 'años'),
          explicacion: `x + 3x = ${suma} ⇒ 4x = ${suma} ⇒ x = ${hijo} años.`,
          etiquetas: ['problema-edades']
        };
      }
    ],

    '3eso': [
      () => {
        const a = U.randInt(3, 9);
        const b = U.randInt(a + 1, 12);
        const suma = a + b;
        const prod = a * b;
        return {
          enunciado: `Dos números naturales suman ${suma} y su producto es ${prod}. ¿Cuál es el mayor de los dos números?`,
          ...U.buildNumericChoices(b, [a, suma - 1, b + 2, b - 1]),
          explicacion: `Resolvemos x² − ${suma}x + ${prod} = 0 ⇒ soluciones ${a} y ${b}. El mayor es ${b}.`,
          etiquetas: ['problema-cuadratica', 'suma-producto']
        };
      }
    ],

    '4eso': [
      () => {
        const ancho = U.randInt(4, 9);
        const extra = U.randInt(2, 5);
        const largo = ancho + extra;
        const area = ancho * largo;
        return {
          enunciado: `Una parcela rectangular tiene ${extra} m más de largo que de ancho y una superficie de ${area} m². ¿Cuántos metros mide el ancho?`,
          ...U.buildNumericChoices(ancho, [largo, ancho + 1, Math.max(1, ancho - 2), Math.round(area / 2)], 'm'),
          explicacion: `x(x + ${extra}) = ${area} ⇒ x² + ${extra}x − ${area} = 0 ⇒ solución positiva x = ${ancho} m.`,
          etiquetas: ['problema-area-cuadratica']
        };
      }
    ],

    '1bach': [
      () => {
        const dist = U.pick([10, 15, 20, 30, 40]);
        const ans = dist; // tan(45°) = 1 -> altura = dist
        const alt = U.pick([
          { ang: '45°', d: dist, h: `${dist} m`, d1: `${dist * 2} m`, d2: `${Math.round(dist / 2)} m`, d3: `${dist}√3 m`, exp: `tg(45°) = h/${dist} ⇒ 1 = h/${dist} ⇒ h = ${dist} m.` },
          { ang: '60°', d: dist, h: `${dist}√3 m`, d1: `${dist} m`, d2: `${dist * 2} m`, d3: `${dist}/√3 m`, exp: `tg(60°) = h/${dist} ⇒ √3 = h/${dist} ⇒ h = ${dist}√3 m.` }
        ]);
        return {
          enunciado: `Desde un punto del suelo situado a ${alt.d} m de la base de una torre, se observa su extremo superior bajo un ángulo de elevación de ${alt.ang}. ¿Cuál es la altura de la torre?`,
          ...U.buildChoices(alt.h, [alt.d1, alt.d2, alt.d3]),
          explicacion: alt.exp,
          etiquetas: ['problema-trigonometria', 'alturas']
        };
      }
    ],

    '2bach': [
      () => {
        const a = U.randInt(3, 8);
        const b = U.randInt(4, 9);
        const vertices = [
          { x: 0, y: 0 },
          { x: 6, y: 0 },
          { x: 4, y: 5 },
          { x: 0, y: 6 }
        ];
        const vals = vertices.map(v => a * v.x + b * v.y);
        const maxVal = Math.max(...vals);
        const others = vals.filter(v => v !== maxVal);
        return {
          enunciado: `En un problema de programación lineal, la función de beneficio es Z(x, y) = ${a}x + ${b}y sobre la región factible de vértices (0,0), (6,0), (4,5) y (0,6). ¿Cuál es el beneficio máximo?`,
          ...U.buildNumericChoices(maxVal, [...others, maxVal + a], '€'),
          explicacion: `Evaluamos Z en los vértices: (0,0)→0, (6,0)→${6 * a}, (4,5)→${4 * a + 5 * b}, (0,6)→${6 * b}. El máximo es ${maxVal} €.`,
          etiquetas: ['programacion-lineal', 'optimizacion']
        };
      }
    ]
  };

  NS.generators.ecuaciones = { operacion: op, problema: prob };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = NS.generators.ecuaciones;
  }
})(typeof window !== 'undefined' ? window : globalThis);
