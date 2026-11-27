/**
 * engine/generators/enteros.js
 * Generadores de operaciones y problemas de Números Enteros (1º ESO – 2º Bachillerato).
 */
(function (root) {
  'use strict';

  const NS = (root.BancoMatematicas = root.BancoMatematicas || {});
  const U = NS.utils || (typeof require === 'function' ? require('../utils') : null);
  NS.generators = NS.generators || {};

  const op = {
    '1eso': [
      () => {
        const a = U.nonZero(-15, 15);
        const b = U.nonZero(-15, 15);
        const isSum = Math.random() < 0.5;
        const ans = isSum ? a + b : a - b;
        return {
          enunciado: `Calcula: ${U.fmtNum(a)} ${isSum ? '+' : '−'} ${U.fmtParen(b)}`,
          ...U.buildNumericChoices(ans, [-ans, isSum ? a - b : a + b, ans + 2, ans - 2]),
          explicacion: isSum
            ? `Sumamos ${U.fmtNum(a)} y ${U.fmtNum(b)}, obteniendo ${U.fmtNum(ans)}.`
            : `Restar ${U.fmtNum(b)} equivale a sumar su opuesto (${U.fmtNum(-b)}): ${U.fmtNum(a)} + ${U.fmtParen(-b)} = ${U.fmtNum(ans)}.`,
          etiquetas: ['suma-resta-enteros', 'regla-signos']
        };
      },
      () => {
        const a = U.nonZero(-9, 9);
        const b = U.nonZero(-9, 9);
        const a2 = (a > 0 && b > 0) ? -a : a;
        const ans = a2 * b;
        return {
          enunciado: `Calcula el producto: ${U.fmtParen(a2)} · ${U.fmtParen(b)}`,
          ...U.buildNumericChoices(ans, [-ans, a2 + b, ans + Math.abs(b), ans - Math.abs(a2)]),
          explicacion: `Aplicando la regla de signos y multiplicando valores absolutos: ${U.fmtParen(a2)} · ${U.fmtParen(b)} = ${U.fmtNum(ans)}.`,
          etiquetas: ['producto-enteros', 'regla-signos']
        };
      },
      () => {
        const a = U.nonZero(-10, 10);
        const b = U.nonZero(-6, 6);
        const c = U.nonZero(-5, 5);
        const ans = a + b * c;
        return {
          enunciado: `Resuelve respetando la jerarquía: ${U.fmtNum(a)} + ${U.fmtParen(b)} · ${U.fmtParen(c)}`,
          ...U.buildNumericChoices(ans, [(a + b) * c, a - b * c, -ans, ans + 3]),
          explicacion: `Primero el producto: ${U.fmtParen(b)} · ${U.fmtParen(c)} = ${U.fmtNum(b * c)}. Luego ${U.fmtNum(a)} + ${U.fmtParen(b * c)} = ${U.fmtNum(ans)}.`,
          etiquetas: ['jerarquia-operaciones']
        };
      }
    ],

    '2eso': [
      () => {
        const a = U.nonZero(-8, 8);
        const b = U.nonZero(-7, 7);
        const c = U.nonZero(-6, 6);
        const d = U.nonZero(-5, 5);
        const ans = a - b * (c + d);
        return {
          enunciado: `Calcula: ${U.fmtNum(a)} − ${U.fmtParen(b)} · [${U.fmtNum(c)} ${U.fmtSignedTerm(d)}]`,
          ...U.buildNumericChoices(ans, [(a - b) * (c + d), a + b * (c + d), a - b * c + d, -ans]),
          explicacion: `Dentro del corchete: ${U.fmtNum(c)} ${U.fmtSignedTerm(d)} = ${U.fmtNum(c + d)}. Multiplicamos: ${U.fmtParen(b)} · ${U.fmtParen(c + d)} = ${U.fmtNum(b * (c + d))}. Finalmente: ${U.fmtNum(a)} − ${U.fmtParen(b * (c + d))} = ${U.fmtNum(ans)}.`,
          etiquetas: ['operaciones-combinadas', 'corchetes']
        };
      },
      () => {
        const a = U.nonZero(-14, 14);
        const b = U.nonZero(-14, 14);
        const c = U.nonZero(-12, 12);
        const ans = Math.abs(a - b) - Math.abs(c);
        return {
          enunciado: `Calcula el resultado con valor absoluto: |${U.fmtNum(a)} − ${U.fmtParen(b)}| − |${U.fmtNum(c)}|`,
          ...U.buildNumericChoices(ans, [Math.abs(a - b) + Math.abs(c), (a - b) - c, Math.abs(a) - Math.abs(b) - Math.abs(c), -ans]),
          explicacion: `|${U.fmtNum(a - b)}| = ${Math.abs(a - b)} y |${U.fmtNum(c)}| = ${Math.abs(c)}. Por tanto, ${Math.abs(a - b)} − ${Math.abs(c)} = ${U.fmtNum(ans)}.`,
          etiquetas: ['valor-absoluto']
        };
      },
      () => {
        const g = U.pick([4, 6, 8, 9, 12, 15]);
        const p = U.pick([2, 3, 5]);
        const q = U.pick([3, 4, 7].filter(x => U.gcd(x, p) === 1));
        const a = g * p;
        const b = g * q;
        const askMcm = Math.random() < 0.5;
        const ans = askMcm ? U.lcm(a, b) : U.gcd(a, b);
        return {
          enunciado: askMcm
            ? `¿Cuál es el mínimo común múltiplo, m.c.m.(${a}, ${b})?`
            : `¿Cuál es el máximo común divisor, M.C.D.(${a}, ${b})?`,
          ...U.buildNumericChoices(ans, [askMcm ? a * b : g * 2, askMcm ? U.gcd(a, b) : Math.max(1, Math.floor(g / 2)), ans + g, Math.abs(a - b)]),
          explicacion: askMcm
            ? `Como M.C.D.(${a}, ${b}) = ${U.gcd(a, b)}, se cumple m.c.m.(${a}, ${b}) = (${a} · ${b}) / ${U.gcd(a, b)} = ${ans}.`
            : `El mayor entero que divide exactamente a ${a} y a ${b} es ${ans}.`,
          etiquetas: ['divisibilidad', askMcm ? 'mcm' : 'mcd']
        };
      }
    ],

    '3eso': [
      () => {
        const a = U.pick([-4, -3, -2, 2, 3, 4]);
        const b = U.pick([-5, -3, -2, 2, 3]);
        const c = U.nonZero(-8, 8);
        const ans = a * a - b * b * b + c;
        return {
          enunciado: `Evalúa la expresión entera: ${U.fmtParen(a)}² − ${U.fmtParen(b)}³ ${U.fmtSignedTerm(c)}`,
          ...U.buildNumericChoices(ans, [-a * a - b * b * b + c, a * a + b * b * b + c, 2 * a - 3 * b + c, ans + 4]),
          explicacion: `${U.fmtParen(a)}² = ${a * a} y ${U.fmtParen(b)}³ = ${U.fmtNum(b * b * b)}. Así: ${a * a} − ${U.fmtParen(b * b * b)} ${U.fmtSignedTerm(c)} = ${U.fmtNum(ans)}.`,
          etiquetas: ['jerarquia-potencias-enteras']
        };
      },
      () => {
        const p1 = U.pick([2, 3]);
        const p2 = p1 === 2 ? U.pick([3, 5]) : 5;
        const e1 = U.randInt(2, 4);
        const e2 = U.randInt(1, 3);
        const n = Math.pow(p1, e1) * Math.pow(p2, e2);
        const ans = (e1 + 1) * (e2 + 1);
        return {
          enunciado: `¿Cuántos divisores positivos tiene el número ${n}?`,
          ...U.buildNumericChoices(ans, [e1 * e2, e1 + e2 + 1, ans + 2, ans - 2]),
          explicacion: `Factorizamos: ${n} = ${p1}${U.sup(e1)} · ${p2}${U.sup(e2)}. El número de divisores positivos es (${e1} + 1)(${e2} + 1) = ${ans}.`,
          etiquetas: ['factorizacion', 'numero-divisores']
        };
      }
    ],

    '4eso': [
      () => {
        const a1 = U.nonZero(-10, 12);
        const d = U.nonZero(-5, 6);
        const n = U.randInt(8, 15);
        const an = a1 + (n - 1) * d;
        const ans = Math.round(((a1 + an) * n) / 2);
        return {
          enunciado: `Calcula la suma de los ${n} primeros términos de la progresión aritmética de enteros con a₁ = ${U.fmtNum(a1)} y diferencia d = ${U.fmtNum(d)}.`,
          ...U.buildNumericChoices(ans, [an, Math.round(((a1 + a1 + n * d) * n) / 2), ans - an, ans + d * n]),
          explicacion: `El término ${n}-ésimo es a${n} = ${U.fmtNum(a1)} + ${n - 1}·${U.fmtParen(d)} = ${U.fmtNum(an)}. Suma S = (${U.fmtNum(a1)} + ${U.fmtNum(an)}) · ${n} / 2 = ${U.fmtNum(ans)}.`,
          etiquetas: ['progresion-aritmetica', 'suma-enteros']
        };
      },
      () => {
        const m = U.pick([5, 6, 7, 8, 9]);
        const q = U.randInt(12, 35);
        const r = U.randInt(1, m - 1);
        const n = m * q + r;
        const a = U.randInt(2, 5);
        const ans = (a * r) % m;
        return {
          enunciado: `¿Cuál es el resto de dividir ${a} · ${n} entre ${m}?`,
          ...U.buildNumericChoices(ans, [r, (r + a) % m, (ans + 1) % m, (ans + m - 1) % m]),
          explicacion: `Como ${n} = ${m} · ${q} + ${r}, el resto de ${n} módulo ${m} es ${r}. Por tanto, ${a} · ${r} = ${a * r}, cuyo resto al dividir entre ${m} es ${ans}.`,
          etiquetas: ['aritmetica-modular', 'restos']
        };
      }
    ],

    '1bach': [
      () => {
        const n = U.randInt(6, 10);
        const k = U.randInt(2, 4);
        const ans = U.comb(n, k);
        return {
          enunciado: `Calcula el número combinatorio C(${n}, ${k}) = ${n}! / (${k}! · ${n - k}!)`,
          ...U.buildNumericChoices(ans, [ans * k, Math.round(ans / 2), U.comb(n, k - 1), n * k]),
          explicacion: `C(${n}, ${k}) = ${n}! / (${k}! · ${n - k}!) = ${ans}.`,
          etiquetas: ['combinatoria', 'numeros-combinatorios']
        };
      },
      () => {
        const a = U.randInt(2, 5);
        const b = U.nonZero(-4, 6);
        const n = U.randInt(5, 10);
        const ans = a * ((n * (n + 1)) / 2) + b * n;
        return {
          enunciado: `Calcula el valor del sumatorio: ∑(k = 1 hasta ${n}) de (${a}k ${U.fmtSignedTerm(b)})`,
          ...U.buildNumericChoices(ans, [a * ((n * (n + 1)) / 2) + b, a * n + b * n, ans - (a * n + b), ans + b]),
          explicacion: `Usamos ∑k = ${n}(${n}+1)/2 = ${(n * (n + 1)) / 2}. Entonces ${a}·${(n * (n + 1)) / 2} ${b >= 0 ? '+ ' + b * n : '− ' + Math.abs(b * n)} = ${U.fmtNum(ans)}.`,
          etiquetas: ['sumatorios', 'series-finitas']
        };
      }
    ],

    '2bach': [
      () => {
        const a = U.nonZero(-6, 6);
        const b = U.nonZero(-6, 6);
        const c = U.nonZero(-6, 6);
        const d = U.nonZero(-6, 6);
        const ans = a * d - b * c;
        return {
          enunciado: `Calcula el determinante de la matriz entera A = [[${U.fmtNum(a)}, ${U.fmtNum(b)}], [${U.fmtNum(c)}, ${U.fmtNum(d)}]]`,
          ...U.buildNumericChoices(ans, [a * d + b * c, b * c - a * d, a * c - b * d, a + d]),
          explicacion: `det(A) = (${U.fmtNum(a)})·(${U.fmtNum(d)}) − (${U.fmtNum(b)})·(${U.fmtNum(c)}) = ${U.fmtNum(a * d)} − ${U.fmtParen(b * c)} = ${U.fmtNum(ans)}.`,
          etiquetas: ['determinantes', 'matrices-enteras']
        };
      },
      () => {
        const a = U.nonZero(-4, 4);
        const b = U.nonZero(-3, 3);
        const c = U.nonZero(-3, 3);
        const d = U.nonZero(-4, 4);
        const e = U.nonZero(-4, 4);
        const f = U.nonZero(-3, 3);
        // Matriz triangular o con ceros estratégicos para cálculo limpio en aula
        const ans = a * (d * e - c * f);
        return {
          enunciado: `Calcula el determinante 3×3 de M = [[${U.fmtNum(a)}, 0, 0], [${U.fmtNum(b)}, ${U.fmtNum(d)}, ${U.fmtNum(c)}], [2, ${U.fmtNum(f)}, ${U.fmtNum(e)}]]`,
          ...U.buildNumericChoices(ans, [a * (d * e + c * f), -ans, d * e - c * f, a * d * e]),
          explicacion: `Desarrollando por la primera fila: det(M) = ${U.fmtNum(a)} · (${U.fmtNum(d)}·${U.fmtNum(e)} − ${U.fmtNum(c)}·${U.fmtNum(f)}) = ${U.fmtNum(a)} · ${U.fmtNum(d * e - c * f)} = ${U.fmtNum(ans)}.`,
          etiquetas: ['determinantes-3x3', 'algebra-lineal']
        };
      }
    ]
  };

  const prob = {
    '1eso': [
      () => {
        const inicio = -U.randInt(1, 5);
        const sube = U.randInt(6, 12);
        const baja = U.randInt(3, 9);
        const ans = inicio + sube - baja;
        return {
          enunciado: `Un ascensor parte de la planta ${U.fmtNum(inicio)} (sótano), sube ${sube} pisos y después baja ${baja} pisos. ¿En qué planta se detiene?`,
          ...U.buildNumericChoices(ans, [inicio + sube + baja, Math.abs(inicio) + sube - baja, ans + 1, ans - 1]),
          explicacion: `Operación con enteros: ${U.fmtNum(inicio)} + ${sube} − ${baja} = ${U.fmtNum(ans)}.`,
          etiquetas: ['problema-ascensor', 'enteros']
        };
      },
      () => {
        const t0 = -U.randInt(3, 12);
        const sube = U.randInt(7, 18);
        const baja = U.randInt(4, 11);
        const ans = t0 + sube - baja;
        return {
          enunciado: `A las 7:00 el termómetro marcaba ${U.fmtNum(t0)} °C. Al mediodía la temperatura subió ${sube} °C y al anochecer bajó ${baja} °C. ¿Qué temperatura marcaba al anochecer?`,
          ...U.buildNumericChoices(ans, [Math.abs(t0) + sube - baja, t0 + sube + baja, -ans, ans + 2], '°C'),
          explicacion: `${U.fmtNum(t0)} + ${sube} − ${baja} = ${U.fmtNum(ans)} °C.`,
          etiquetas: ['problema-temperatura', 'enteros']
        };
      }
    ],

    '2eso': [
      () => {
        const t1 = U.pick([6, 8, 9, 10, 12]);
        const t2 = U.pick([10, 12, 15, 16, 18].filter(x => x !== t1));
        const ans = U.lcm(t1, t2);
        return {
          enunciado: `Dos líneas de autobús coinciden en una parada a las 8:00. La línea A pasa cada ${t1} minutos y la línea B cada ${t2} minutos. ¿Dentro de cuántos minutos volverán a coincidir por primera vez?`,
          ...U.buildNumericChoices(ans, [t1 + t2, U.gcd(t1, t2), t1 * t2, ans * 2], 'min'),
          explicacion: `Coinciden cada m.c.m.(${t1}, ${t2}) = ${ans} minutos.`,
          etiquetas: ['problema-mcm', 'divisibilidad']
        };
      },
      () => {
        const g = U.pick([6, 8, 9, 12, 15]);
        const p = U.pick([3, 4, 5]);
        const q = U.pick([5, 7, 8].filter(x => U.gcd(x, p) === 1));
        const a = g * p;
        const b = g * q;
        return {
          enunciado: `Un profesor quiere repartir ${a} bolígrafos azules y ${b} rojos en estuches idénticos con el mayor número posible de bolígrafos del mismo color, sin que sobre ninguno. ¿Cuántos bolígrafos habrá en cada estuche?`,
          ...U.buildNumericChoices(g, [p + q, Math.max(1, Math.floor(g / 2)), g * 2, U.gcd(a, b) + 3], 'bolígrafos'),
          explicacion: `El tamaño máximo de cada estuche es M.C.D.(${a}, ${b}) = ${g} bolígrafos.`,
          etiquetas: ['problema-mcd', 'reparto-exacto']
        };
      }
    ],

    '3eso': [
      () => {
        const saldo = U.randInt(120, 450);
        const cuota = U.randInt(35, 85);
        const meses = U.randInt(4, 7);
        const ingreso = U.randInt(100, 260);
        const ans = saldo - cuota * meses + ingreso;
        return {
          enunciado: `Una cuenta bancaria tiene un saldo inicial de ${saldo} €. Durante ${meses} meses se cobra una cuota fija de ${cuota} € al mes y al final se recibe un abono de ${ingreso} €. ¿Cuál es el saldo final?`,
          ...U.buildNumericChoices(ans, [saldo + cuota * meses - ingreso, saldo - cuota * meses - ingreso, ans + cuota, -ans], '€'),
          explicacion: `Saldo = ${saldo} − ${meses}·${cuota} + ${ingreso} = ${saldo} − ${meses * cuota} + ${ingreso} = ${U.fmtNum(ans)} €.`,
          etiquetas: ['problema-finanzas', 'enteros']
        };
      },
      () => {
        const g = U.pick([4, 6, 8, 10]);
        const a = g * 3;
        const b = g * 4;
        const c = g * 5;
        const totalLotes = 3 + 4 + 5;
        return {
          enunciado: `En un almacén hay ${a} kg de arroz, ${b} kg de lentejas y ${c} kg de garbanzos. Se envasan en sacos iguales del mayor peso entero posible sin mezclar legumbres. ¿Cuántos sacos se obtienen en total?`,
          ...U.buildNumericChoices(totalLotes, [g, totalLotes + 2, totalLotes - 3, a + b + c], 'sacos'),
          explicacion: `Peso de cada saco = M.C.D.(${a}, ${b}, ${c}) = ${g} kg. Número de sacos: ${a}/${g} + ${b}/${g} + ${c}/${g} = 3 + 4 + 5 = ${totalLotes} sacos.`,
          etiquetas: ['problema-mcd-triple']
        };
      }
    ],

    '4eso': [
      () => {
        const dias = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo'];
        const hoyIdx = U.randInt(0, 6);
        const salto = U.randInt(45, 160);
        const ansIdx = (hoyIdx + salto) % 7;
        const distractores = [
          dias[(ansIdx + 1) % 7],
          dias[(ansIdx + 6) % 7],
          dias[(ansIdx + 2) % 7]
        ];
        return {
          enunciado: `Si hoy es ${dias[hoyIdx]}, ¿qué día de la semana será dentro de exactamente ${salto} días?`,
          ...U.buildChoices(dias[ansIdx], distractores),
          explicacion: `Dividimos ${salto} entre 7: resto = ${salto % 7}. Avanzando ${salto % 7} días desde ${dias[hoyIdx]} llegamos a ${dias[ansIdx]}.`,
          etiquetas: ['problema-calendario', 'modulo-7']
        };
      },
      () => {
        const fila1 = U.randInt(12, 20);
        const inc = U.randInt(2, 4);
        const filas = U.randInt(8, 12);
        const ultima = fila1 + (filas - 1) * inc;
        const ans = Math.round(((fila1 + ultima) * filas) / 2);
        return {
          enunciado: `Un auditorio tiene ${filas} filas de butacas. La primera fila tiene ${fila1} butacas y cada fila siguiente añade ${inc} butacas más que la anterior. ¿Cuál es el aforo total?`,
          ...U.buildNumericChoices(ans, [ultima, fila1 * filas, ans - ultima, ans + filas * inc], 'butacas'),
          explicacion: `Progresión aritmética: última fila = ${fila1} + ${filas - 1}·${inc} = ${ultima}. Total = (${fila1} + ${ultima})·${filas}/2 = ${ans} butacas.`,
          etiquetas: ['problema-progresion-aritmetica']
        };
      }
    ],

    '1bach': [
      () => {
        const n = U.randInt(7, 11);
        const k = U.pick([2, 3]);
        const ans = U.comb(n, k);
        return {
          enunciado: `En una clase hay ${n} estudiantes voluntarios y se debe elegir una comisión de ${k} representantes sin distinción de cargos. ¿Cuántas comisiones distintas se pueden formar?`,
          ...U.buildNumericChoices(ans, [ans * U.factorial(k), n * k, U.comb(n - 1, k), ans + n], 'comisiones'),
          explicacion: `Como no importa el orden, son combinaciones: C(${n}, ${k}) = ${ans} comisiones.`,
          etiquetas: ['problema-combinatoria']
        };
      },
      () => {
        const equipos = U.randInt(6, 12);
        const ans = (equipos * (equipos - 1)) / 2;
        return {
          enunciado: `En un torneo escolar participan ${equipos} equipos y todos juegan una única vez contra todos los demás. ¿Cuántos partidos se disputan en total?`,
          ...U.buildNumericChoices(ans, [equipos * (equipos - 1), equipos * equipos, ans + equipos, ans - 2], 'partidos'),
          explicacion: `Cada partido es una pareja de equipos: C(${equipos}, 2) = ${equipos}·${equipos - 1}/2 = ${ans} partidos.`,
          etiquetas: ['problema-torneo', 'combinatoria']
        };
      }
    ],

    '2bach': [
      () => {
        const u1 = U.randInt(2, 6);
        const u2 = U.randInt(-4, 5);
        const v1 = U.randInt(-3, 4);
        const v2 = U.randInt(2, 6);
        const det = u1 * v2 - u2 * v1;
        const ans = Math.abs(det) || 1;
        // Evitar área 0
        const v2Safe = det === 0 ? v2 + 1 : v2;
        const realAns = Math.abs(u1 * v2Safe - u2 * v1);
        return {
          enunciado: `Un paralelogramo en el plano está determinado por los vectores enteros u = (${U.fmtNum(u1)}, ${U.fmtNum(u2)}) y v = (${U.fmtNum(v1)}, ${U.fmtNum(v2Safe)}). ¿Cuál es su área?`,
          ...U.buildNumericChoices(realAns, [Math.abs(u1 * v1 + u2 * v2Safe), Math.abs(u1 * v2Safe + u2 * v1), realAns * 2, Math.max(1, realAns - 2)], 'u²'),
          explicacion: `El área es |det(u, v)| = |${U.fmtNum(u1)}·${U.fmtNum(v2Safe)} − ${U.fmtNum(u2)}·${U.fmtNum(v1)}| = |${U.fmtNum(u1 * v2Safe - u2 * v1)}| = ${realAns} u².`,
          etiquetas: ['problema-determinante-area', 'vectores']
        };
      },
      () => {
        const pA = U.randInt(4, 9);
        const pB = U.randInt(3, 8);
        const pC = U.randInt(2, 7);
        const cA = U.randInt(2, 6);
        const cB = U.randInt(2, 6);
        const cC = U.randInt(2, 6);
        const ans = pA * cA + pB * cB + pC * cC;
        return {
          enunciado: `Un pedido escolar consta del vector de cantidades Q = (${cA}, ${cB}, ${cC}) para tres materiales cuyos precios enteros son P = (${pA} €, ${pB} €, ${pC} €). Calcula el coste total mediante el producto matricial Q · Pᵀ.`,
          ...U.buildNumericChoices(ans, [ans + pA, ans - pC, (cA + cB + cC) * (pA + pB + pC), pA * cC + pB * cB + pC * cA], '€'),
          explicacion: `Q · Pᵀ = ${cA}·${pA} + ${cB}·${pB} + ${cC}·${pC} = ${cA * pA} + ${cB * pB} + ${cC * pC} = ${ans} €.`,
          etiquetas: ['problema-matrices', 'producto-escalar']
        };
      }
    ]
  };

  NS.generators.enteros = { operacion: op, problema: prob };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = NS.generators.enteros;
  }
})(typeof window !== 'undefined' ? window : globalThis);
