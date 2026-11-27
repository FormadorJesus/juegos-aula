/**
 * engine/generators/funciones.js
 * Generadores de operaciones y problemas de Funciones (1º ESO – 2º Bachillerato).
 */
(function (root) {
  'use strict';

  const NS = (root.BancoMatematicas = root.BancoMatematicas || {});
  const U = NS.utils || (typeof require === 'function' ? require('../utils') : null);
  NS.generators = NS.generators || {};

  const op = {
    '1eso': [
      () => {
        const m = U.nonZero(-5, 6);
        const n = U.nonZero(-8, 9);
        const x = U.nonZero(-5, 6);
        const ans = m * x + n;
        return {
          enunciado: `Dada la función f(x) = ${U.fmtLinear(m, n)}, calcula el valor de f(${U.fmtNum(x)}).`,
          ...U.buildNumericChoices(ans, [m * x - n, -ans, m + x + n, m * (-x) + n]),
          explicacion: `Sustituimos x = ${U.fmtNum(x)}: f(${U.fmtNum(x)}) = ${U.fmtNum(m)}·${U.fmtParen(x)} ${U.fmtSignedTerm(n)} = ${U.fmtNum(ans)}.`,
          etiquetas: ['evaluacion-funciones']
        };
      },
      () => {
        const x = U.nonZero(-8, 8);
        const y = U.nonZero(-8, 8);
        const quad = x > 0 && y > 0 ? '1.º cuadrante'
          : x < 0 && y > 0 ? '2.º cuadrante'
          : x < 0 && y < 0 ? '3.º cuadrante'
          : '4.º cuadrante';
        return {
          enunciado: `¿En qué cuadrante del plano cartesiano se encuentra el punto P(${U.fmtNum(x)}, ${U.fmtNum(y)})?`,
          ...U.buildChoices(quad, ['1.º cuadrante', '2.º cuadrante', '3.º cuadrante', '4.º cuadrante']),
          explicacion: `Como x es ${x > 0 ? 'positiva' : 'negativa'} e y es ${y > 0 ? 'positiva' : 'negativa'}, el punto pertenece al ${quad}.`,
          etiquetas: ['coordenadas-cartesianas', 'cuadrantes']
        };
      }
    ],

    '2eso': [
      () => {
        const m = U.nonZero(-5, 5);
        const x1 = U.randInt(-3, 3);
        const dx = U.randInt(2, 5);
        const x2 = x1 + dx;
        const y1 = U.randInt(-5, 5);
        const y2 = y1 + m * dx;
        return {
          enunciado: `Calcula la pendiente m de la recta que pasa por los puntos A(${U.fmtNum(x1)}, ${U.fmtNum(y1)}) y B(${U.fmtNum(x2)}, ${U.fmtNum(y2)}).`,
          ...U.buildNumericChoices(m, [-m, m + 1, m - 1, y2 - y1]),
          explicacion: `m = (y₂ − y₁) / (x₂ − x₁) = (${U.fmtNum(y2)} − ${U.fmtParen(y1)}) / (${U.fmtNum(x2)} − ${U.fmtParen(x1)}) = ${U.fmtNum(y2 - y1)} / ${dx} = ${U.fmtNum(m)}.`,
          etiquetas: ['pendiente-recta', 'funcion-afin']
        };
      },
      () => {
        const m = U.pick([-4, -3, -2, 2, 3, 4]);
        const xCut = U.nonZero(-6, 6);
        const n = -m * xCut;
        return {
          enunciado: `¿En qué valor de x corta al eje horizontal (eje X) la función f(x) = ${U.fmtLinear(m, n)}?`,
          ...U.buildNumericChoices(xCut, [-xCut, n, m, xCut + 1]),
          explicacion: `Igualamos f(x) = 0: ${U.fmtLinear(m, n)} = 0 ⇒ x = ${U.fmtNum(xCut)}.`,
          etiquetas: ['cortes-ejes', 'funcion-lineal']
        };
      }
    ],

    '3eso': [
      () => {
        const a = U.pick([-2, -1, 1, 2]);
        const xv = U.nonZero(-5, 5);
        const b = -2 * a * xv;
        const c = U.nonZero(-6, 6);
        return {
          enunciado: `Calcula la coordenada x del vértice de la parábola f(x) = ${U.fmtQuadratic(a, b, c)}.`,
          ...U.buildNumericChoices(xv, [-xv, b, Math.round(-b / a), xv + 1]),
          explicacion: `La abscisa del vértice es x_v = −b / (2a) = ${U.fmtNum(-b)} / (${2 * a}) = ${U.fmtNum(xv)}.`,
          etiquetas: ['vertice-parabola', 'funcion-cuadratica']
        };
      },
      () => {
        const a = U.nonZero(-4, 5);
        const b = U.nonZero(-6, 6);
        const c = U.nonZero(-7, 7);
        return {
          enunciado: `¿Cuál es la ordenada en el origen (corte con el eje Y) de f(x) = ${U.fmtQuadratic(a, b, c)}?`,
          ...U.buildNumericChoices(c, [-c, a, b, a + b + c]),
          explicacion: `Evaluando en x = 0: f(0) = ${U.fmtNum(c)}.`,
          etiquetas: ['funcion-cuadratica', 'corte-eje-y']
        };
      }
    ],

    '4eso': [
      () => {
        const a = U.nonZero(-7, 8);
        const correct = `ℝ − {${U.fmtNum(a)}}`;
        return {
          enunciado: `¿Cuál es el dominio de la función racional f(x) = 3 / (x ${U.fmtSignedTerm(-a)})?`,
          ...U.buildChoices(correct, [
            `ℝ − {${U.fmtNum(-a)}}`,
            `[${U.fmtNum(a)}, +∞)`,
            `(${U.fmtNum(a)}, +∞)`,
            'ℝ'
          ]),
          explicacion: `El denominador no puede anularse: x ${U.fmtSignedTerm(-a)} ≠ 0 ⇒ x ≠ ${U.fmtNum(a)}. Dominio = ${correct}.`,
          etiquetas: ['dominio-racional']
        };
      },
      () => {
        const a = U.randInt(-3, 2);
        const b = a + U.randInt(2, 4);
        const k = U.pick([1, 2, 3]);
        // f(x) = k*x^2 -> TVM[a, b] = k*(b^2 - a^2)/(b - a) = k*(a + b)
        const tvm = k * (a + b);
        return {
          enunciado: `Calcula la Tasa de Variación Media TVM[${U.fmtNum(a)}, ${U.fmtNum(b)}] de la función f(x) = ${k === 1 ? '' : k}x².`,
          ...U.buildNumericChoices(tvm, [k * (b * b - a * a), k * (b - a), -tvm, tvm + k]),
          explicacion: `TVM = [f(${U.fmtNum(b)}) − f(${U.fmtNum(a)})] / (${U.fmtNum(b)} − ${U.fmtParen(a)}) = (${k * b * b} − ${k * a * a}) / ${b - a} = ${U.fmtNum(tvm)}.`,
          etiquetas: ['tasa-variacion-media']
        };
      }
    ],

    '1bach': [
      () => {
        const a = U.randInt(1, 6);
        const ans = 2 * a;
        return {
          enunciado: `Calcula el límite con indeterminación 0/0: lim(x → ${a}) (x² − ${a * a}) / (x − ${a})`,
          ...U.buildNumericChoices(ans, [0, a, a * a, 1]),
          explicacion: `Factorizamos (x − ${a})(x + ${a}) / (x − ${a}) = x + ${a}. Al sustituir x = ${a}, obtenemos ${ans}.`,
          etiquetas: ['limites-indeterminacion-0-0']
        };
      },
      () => {
        const a = U.nonZero(-4, 5);
        const b = U.nonZero(-6, 6);
        const c = U.nonZero(-5, 5);
        const x0 = U.randInt(-2, 3);
        const ans = 2 * a * x0 + b;
        return {
          enunciado: `Calcula la pendiente de la recta tangente a f(x) = ${U.fmtQuadratic(a, b, c)} en el punto de abscisa x = ${U.fmtNum(x0)}.`,
          ...U.buildNumericChoices(ans, [a * x0 * x0 + b * x0 + c, 2 * a * x0 - b, a * x0 + b, ans + 2]),
          explicacion: `La pendiente es f'(${U.fmtNum(x0)}). Como f'(x) = ${U.fmtLinear(2 * a, b)}, resulta f'(${U.fmtNum(x0)}) = ${U.fmtNum(ans)}.`,
          etiquetas: ['derivada-punto', 'recta-tangente']
        };
      }
    ],

    '2bach': [
      () => {
        const r = U.nonZero(-5, 5);
        // f(x) = x^2 - 2*r*x + 5 -> f'(x) = 2x - 2r = 0 -> x = r
        const b = -2 * r;
        const c = U.randInt(1, 9);
        return {
          enunciado: `¿En qué valor de x alcanza su mínimo relativo la función f(x) = ${U.fmtQuadratic(1, b, c)}?`,
          ...U.buildNumericChoices(r, [-r, 2 * r, c, r + 1]),
          explicacion: `Derivamos e igualamos a 0: f'(x) = ${U.fmtLinear(2, b)} = 0 ⇒ x = ${U.fmtNum(r)}. Como f''(x) = 2 > 0, es mínimo.`,
          etiquetas: ['extremos-relativos', 'derivadas']
        };
      },
      () => {
        const xInfl = U.nonZero(-4, 4);
        // f(x) = x^3 - 3*xInfl*x^2 + 2 -> f''(x) = 6x - 6*xInfl = 0 -> x = xInfl
        const b = -3 * xInfl;
        return {
          enunciado: `Halla la abscisa x del punto de inflexión de f(x) = x³ ${b > 0 ? '+ ' + b : '− ' + Math.abs(b)}x² + 4.`,
          ...U.buildNumericChoices(xInfl, [-xInfl, 2 * xInfl, 0, xInfl + 1]),
          explicacion: `f'(x) = 3x² ${2 * b > 0 ? '+ ' + 2 * b : '− ' + Math.abs(2 * b)}x ⇒ f''(x) = 6x ${2 * b > 0 ? '+ ' + 2 * b : '− ' + Math.abs(2 * b)} = 0 ⇒ x = ${U.fmtNum(xInfl)}.`,
          etiquetas: ['punto-inflexion', 'segunda-derivada']
        };
      }
    ]
  };

  const prob = {
    '1eso': [
      () => {
        const bajada = U.randInt(2, 5);
        const precioKm = U.randInt(2, 4);
        const km = U.randInt(4, 12);
        const total = bajada + precioKm * km;
        return {
          enunciado: `La tarifa de un taxi viene dada por la función C(x) = ${precioKm}x + ${bajada}, donde x son los kilómetros recorridos y C(x) el precio en euros. ¿Cuánto cuesta un trayecto de ${km} km?`,
          ...U.buildNumericChoices(total, [precioKm * km, bajada * km + precioKm, total + bajada, total - bajada], '€'),
          explicacion: `C(${km}) = ${precioKm}·${km} + ${bajada} = ${precioKm * km} + ${bajada} = ${total} €.`,
          etiquetas: ['problema-tarifa', 'funcion-afin']
        };
      }
    ],

    '2eso': [
      () => {
        const fijoA = U.pick([10, 12, 15, 20]);
        const precioA = U.pick([2, 3]);
        const precioB = precioA + U.pick([2, 3, 5]);
        // fijoA + precioA*x = precioB*x -> x = fijoA / (precioB - precioA)
        const diff = precioB - precioA;
        const xEq = U.randInt(3, 8);
        const fijoSafe = diff * xEq;
        return {
          enunciado: `El gimnasio A cobra ${fijoSafe} € de matrícula más ${precioA} € por clase. El gimnasio B no cobra matrícula, pero cobra ${precioB} € por clase. ¿Con cuántas clases cuestan exactamente lo mismo?`,
          ...U.buildNumericChoices(xEq, [xEq + 2, Math.max(1, xEq - 2), fijoSafe, xEq * precioB], 'clases'),
          explicacion: `Igualamos ${fijoSafe} + ${precioA}x = ${precioB}x ⇒ ${fijoSafe} = ${diff}x ⇒ x = ${xEq} clases.`,
          etiquetas: ['comparacion-tarifas', 'interseccion-rectas']
        };
      }
    ],

    '3eso': [
      () => {
        const tMax = U.randInt(2, 5);
        // h(t) = -5t^2 + 10*tMax*t -> altura max en t = tMax, valor = 5*tMax^2
        const b = 10 * tMax;
        const hMax = 5 * tMax * tMax;
        return {
          enunciado: `La altura (en metros) de un balón lanzado hacia arriba sigue la función h(t) = −5t² + ${b}t, con t en segundos. ¿Cuál es la altura máxima que alcanza el balón?`,
          ...U.buildNumericChoices(hMax, [tMax, b, hMax + 10, Math.round(hMax / 2)], 'm'),
          explicacion: `El máximo está en el vértice t = −${b}/(−10) = ${tMax} s. Sustituyendo: h(${tMax}) = −5(${tMax}²) + ${b}(${tMax}) = ${hMax} m.`,
          etiquetas: ['problema-parabola', 'altura-maxima']
        };
      }
    ],

    '4eso': [
      () => {
        const cf = U.pick([200, 400, 500, 600]);
        const cv = U.randInt(4, 15);
        return {
          enunciado: `El coste medio por unidad al fabricar x artículos es C_m(x) = (${cv}x + ${cf}) / x euros. Cuando la producción crece indefinidamente (x → ∞), ¿a qué valor tiende el coste por unidad (asíntota horizontal)?`,
          ...U.buildNumericChoices(cv, [cf, cv + cf, 0, cv + 1], '€'),
          explicacion: `lim(x→∞) (${cv}x + ${cf})/x = ${cv} €. La asíntota horizontal es y = ${cv}.`,
          etiquetas: ['asintota-horizontal', 'coste-medio']
        };
      }
    ],

    '1bach': [
      () => {
        const a = U.randInt(2, 5);
        const b = U.randInt(3, 10);
        const t0 = U.randInt(2, 4);
        const vel = 2 * a * t0 + b;
        return {
          enunciado: `La posición de un vehículo (en metros) viene dada por s(t) = ${a}t² + ${b}t, donde t se mide en segundos. ¿Cuál es su velocidad instantánea a los ${t0} segundos?`,
          ...U.buildNumericChoices(vel, [a * t0 * t0 + b * t0, a * t0 + b, 2 * a * t0, vel + b], 'm/s'),
          explicacion: `La velocidad instantánea es la derivada v(t) = s'(t) = ${2 * a}t + ${b}. Para t = ${t0}: v(${t0}) = ${vel} m/s.`,
          etiquetas: ['velocidad-instantanea', 'derivadas']
        };
      }
    ],

    '2bach': [
      () => {
        const perimetro = U.pick([40, 60, 80, 100, 120]);
        const lado = perimetro / 4;
        const areaMax = lado * lado;
        return {
          enunciado: `Se dispone de ${perimetro} m de valla para cercar un terreno rectangular. Usando optimización con derivadas, ¿cuál es el área máxima posible que se puede encerrar?`,
          ...U.buildNumericChoices(areaMax, [lado, perimetro * perimetro / 4, areaMax - 25, Math.round(areaMax / 2)], 'm²'),
          explicacion: `Perímetro 2x + 2y = ${perimetro} ⇒ y = ${perimetro / 2} − x. A(x) = x(${perimetro / 2} − x) ⇒ A'(x) = ${perimetro / 2} − 2x = 0 ⇒ x = ${lado} m, y = ${lado} m ⇒ Área máxima = ${areaMax} m².`,
          etiquetas: ['optimizacion-derivadas', 'area-maxima']
        };
      }
    ]
  };

  NS.generators.funciones = { operacion: op, problema: prob };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = NS.generators.funciones;
  }
})(typeof window !== 'undefined' ? window : globalThis);
