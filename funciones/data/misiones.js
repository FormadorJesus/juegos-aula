/* ==========================================================================
   BANCO DE MISIONES (1.º DE BACHILLERATO - DOMINIO DE FUNCIONES)
   ========================================================================== */

const HTML_HELPERS = {
  frac: (n, d) => `<span class="frac"><span class="num">${n}</span><span class="den">${d}</span></span>`,
  rad: (inner) => `<span class="rad"><span class="rad-sign">√</span><span class="rad-body">${inner}</span></span>`,
  fn: (body) => `<span class="fn-name">f(x)</span><span class="eq">=</span>${body}`
};

function formatNum(n) {
  if (!Number.isFinite(n)) return '∞';
  const rounded = Math.round(n * 100) / 100;
  return Object.is(rounded, -0) ? '0' : String(rounded);
}

const MISSION_BANK = {
  racionales: [
    {
      id: 'rat1',
      category: 'Función Racional',
      formulaHTML: HTML_HELPERS.fn(HTML_HELPERS.frac('1', 'x − 3')),
      evalFn: (x) => Math.abs(x - 3) < 1e-6 ? NaN : 1 / (x - 3),
      isOutsideDomain: (x) => Math.abs(x - 3) < 0.06,
      asymptotes: [3],
      voidIntervals: [],
      closedDots: [],
      openDots: [],
      isAllReals: false,
      domainText: 'Dom(f) = ℝ − {3}',
      hint: 'En una función racional no podemos dividir entre cero. Plantea la ecuación del denominador igual a cero: x − 3 = 0.',
      explainPoint: (x) => `Al sustituir x = ${formatNum(x)}, el denominador vale ${formatNum(x)} − 3 = 0. Como no se puede dividir por cero, la función no existe ahí y se abre una brecha segura (asíntota vertical).`
    },
    {
      id: 'rat2',
      category: 'Función Racional',
      formulaHTML: HTML_HELPERS.fn(HTML_HELPERS.frac('2x + 1', 'x + 4')),
      evalFn: (x) => Math.abs(x + 4) < 1e-6 ? NaN : (2 * x + 1) / (x + 4),
      isOutsideDomain: (x) => Math.abs(x + 4) < 0.06,
      asymptotes: [-4],
      voidIntervals: [],
      closedDots: [],
      openDots: [],
      isAllReals: false,
      domainText: 'Dom(f) = ℝ − {−4}',
      hint: 'Busca qué valor de x anula el denominador: x + 4 = 0. ¡Cuidado con el signo negativo!',
      explainPoint: (x) => `En x = ${formatNum(x)}, el denominador se anula (${formatNum(x)} + 4 = 0). No existe división entre cero.`
    },
    {
      id: 'rat3',
      category: 'Función Racional',
      formulaHTML: HTML_HELPERS.fn(HTML_HELPERS.frac('5', 'x<sup>2</sup> − 9')),
      evalFn: (x) => Math.abs(x * x - 9) < 1e-6 ? NaN : 5 / (x * x - 9),
      isOutsideDomain: (x) => Math.abs(x - 3) < 0.06 || Math.abs(x + 3) < 0.06,
      asymptotes: [-3, 3],
      voidIntervals: [],
      closedDots: [],
      openDots: [],
      isAllReals: false,
      domainText: 'Dom(f) = ℝ − {−3, 3}',
      hint: 'Iguala el denominador a cero: x² − 9 = 0. Recuerda que una ecuación de segundo grado incompleta tiene dos soluciones opuestas.',
      explainPoint: (x) => `En x = ${formatNum(x)}, tenemos (${formatNum(x)})² − 9 = 0. Hay dos portales seguros: x = −3 y x = 3.`
    },
    {
      id: 'rat4',
      category: 'Función Racional',
      formulaHTML: HTML_HELPERS.fn(HTML_HELPERS.frac('x + 2', 'x<sup>2</sup> − 5x + 6')),
      evalFn: (x) => {
        const d = x * x - 5 * x + 6;
        return Math.abs(d) < 1e-6 ? NaN : (x + 2) / d;
      },
      isOutsideDomain: (x) => Math.abs(x - 2) < 0.06 || Math.abs(x - 3) < 0.06,
      asymptotes: [2, 3],
      voidIntervals: [],
      closedDots: [],
      openDots: [],
      isAllReals: false,
      domainText: 'Dom(f) = ℝ − {2, 3}',
      hint: 'Resuelve la ecuación de segundo grado del denominador: x² − 5x + 6 = 0 (puedes usar la fórmula cuadrática o factorizar).',
      explainPoint: (x) => `Como x² − 5x + 6 = (x − 2)(x − 3), el denominador se anula en x = 2 y en x = 3. ¡Cruce perfecto en x = ${formatNum(x)}!`
    },
    {
      id: 'rat5',
      category: 'Función Racional',
      formulaHTML: HTML_HELPERS.fn(HTML_HELPERS.frac('3x', 'x<sup>2</sup> + 4x')),
      evalFn: (x) => {
        const d = x * x + 4 * x;
        return Math.abs(d) < 1e-6 ? NaN : (3 * x) / d;
      },
      isOutsideDomain: (x) => Math.abs(x) < 0.06 || Math.abs(x + 4) < 0.06,
      asymptotes: [-4, 0],
      voidIntervals: [],
      closedDots: [],
      openDots: [[0, 0.75]],
      isAllReals: false,
      domainText: 'Dom(f) = ℝ − {−4, 0}',
      hint: 'Saca factor común en el denominador: x² + 4x = x(x + 4) = 0. Atención: aunque la x aparezca arriba y abajo, en la función original x = 0 tampoco pertenece al dominio.',
      explainPoint: (x) => `Al factorizar el denominador x(x + 4) = 0, obtenemos dos puntos fuera del dominio: x = 0 (discontinuidad evitable) y x = −4 (asíntota vertical).`
    },
    {
      id: 'rat6',
      category: 'Función Racional (Decimal)',
      formulaHTML: HTML_HELPERS.fn(HTML_HELPERS.frac('x − 1', '2x − 5')),
      evalFn: (x) => Math.abs(2 * x - 5) < 1e-6 ? NaN : (x - 1) / (2 * x - 5),
      isOutsideDomain: (x) => Math.abs(x - 2.5) < 0.06,
      asymptotes: [2.5],
      voidIntervals: [],
      closedDots: [],
      openDots: [],
      isAllReals: false,
      domainText: 'Dom(f) = ℝ − {5/2} = ℝ − {2.5}',
      hint: 'Resuelve 2x − 5 = 0. ¡Atención! La solución es una fracción / número decimal exacto.',
      explainPoint: (x) => `De 2x − 5 = 0 se obtiene x = 5/2 = 2.5. En x = 2.5 el denominador se hace cero y la nave cruza sin peligro.`
    }
  ],

  radicales: [
    {
      id: 'rad1',
      category: 'Función Radical (Índice par)',
      formulaHTML: HTML_HELPERS.fn(HTML_HELPERS.rad('x − 3')),
      evalFn: (x) => (x - 3 < -1e-9) ? NaN : Math.sqrt(Math.max(0, x - 3)),
      isOutsideDomain: (x) => x < 3 - 1e-6,
      asymptotes: [],
      voidIntervals: [[-10, 3]],
      closedDots: [[3, 0]],
      openDots: [],
      isAllReals: false,
      domainText: 'Dom(f) = [3, +∞)',
      hint: 'Una raíz cuadrada solo existe en ℝ si el radicando es ≥ 0. Por tanto, NO existe cuando x − 3 < 0.',
      explainPoint: (x) => `En x = ${formatNum(x)}, el radicando vale ${formatNum(x)} − 3 = ${formatNum(x - 3)} < 0. No existe la raíz cuadrada real de un número negativo.`
    },
    {
      id: 'rad2',
      category: 'Función Radical (Índice par)',
      formulaHTML: HTML_HELPERS.fn(HTML_HELPERS.rad('4 − x')),
      evalFn: (x) => (4 - x < -1e-9) ? NaN : Math.sqrt(Math.max(0, 4 - x)),
      isOutsideDomain: (x) => x > 4 + 1e-6,
      asymptotes: [],
      voidIntervals: [[4, 10]],
      closedDots: [[4, 0]],
      openDots: [],
      isAllReals: false,
      domainText: 'Dom(f) = (−∞, 4]',
      hint: 'La función NO existe si el radicando es negativo: 4 − x < 0. ¡Cuidado al despejar la x negativa!',
      explainPoint: (x) => `Para x = ${formatNum(x)}, el radicando es 4 − (${formatNum(x)}) = ${formatNum(4 - x)} < 0, así que la onda desaparece para todo x > 4.`
    },
    {
      id: 'rad3',
      category: 'Función Radical (Índice par)',
      formulaHTML: HTML_HELPERS.fn(HTML_HELPERS.rad('2x + 6')),
      evalFn: (x) => (2 * x + 6 < -1e-9) ? NaN : Math.sqrt(Math.max(0, 2 * x + 6)),
      isOutsideDomain: (x) => x < -3 - 1e-6,
      asymptotes: [],
      voidIntervals: [[-10, -3]],
      closedDots: [[-3, 0]],
      openDots: [],
      isAllReals: false,
      domainText: 'Dom(f) = [−3, +∞)',
      hint: 'Plantea la inecuación de existencia 2x + 6 ≥ 0. La zona segura es la contraria: 2x + 6 < 0.',
      explainPoint: (x) => `En x = ${formatNum(x)}, el radicando es 2(${formatNum(x)}) + 6 = ${formatNum(2 * x + 6)} < 0. Cualquier valor estrictamente menor que −3 es seguro.`
    },
    {
      id: 'rad4',
      category: 'Función Radical (2º grado)',
      formulaHTML: HTML_HELPERS.fn(HTML_HELPERS.rad('x<sup>2</sup> − 4')),
      evalFn: (x) => (x * x - 4 < -1e-9) ? NaN : Math.sqrt(Math.max(0, x * x - 4)),
      isOutsideDomain: (x) => x > -2 + 1e-6 && x < 2 - 1e-6,
      asymptotes: [],
      voidIntervals: [[-2, 2]],
      closedDots: [[-2, 0], [2, 0]],
      openDots: [],
      isAllReals: false,
      domainText: 'Dom(f) = (−∞, −2] ∪ [2, +∞)',
      hint: 'Estudia el signo de x² − 4. Sus raíces son −2 y 2. ¿En qué intervalo resulta negativo?',
      explainPoint: (x) => `En x = ${formatNum(x)}, el radicando vale (${formatNum(x)})² − 4 = ${formatNum(x * x - 4)} < 0. Toda la franja abierta (−2, 2) es un vacío seguro.`
    },
    {
      id: 'rad5',
      category: 'Función Radical (2º grado)',
      formulaHTML: HTML_HELPERS.fn(HTML_HELPERS.rad('9 − x<sup>2</sup>')),
      evalFn: (x) => (9 - x * x < -1e-9) ? NaN : Math.sqrt(Math.max(0, 9 - x * x)),
      isOutsideDomain: (x) => x < -3 - 1e-6 || x > 3 + 1e-6,
      asymptotes: [],
      voidIntervals: [[-10, -3], [3, 10]],
      closedDots: [[-3, 0], [3, 0]],
      openDots: [],
      isAllReals: false,
      domainText: 'Dom(f) = [−3, 3]',
      hint: 'El radicando 9 − x² es positivo entre −3 y 3. Por fuera de ese intervalo es negativo y la función no existe.',
      explainPoint: (x) => `Para x = ${formatNum(x)}, 9 − (${formatNum(x)})² = ${formatNum(9 - x * x)} < 0. Fuera del intervalo [−3, 3] no hay onda.`
    }
  ],

  logaritmicas: [
    {
      id: 'log1',
      category: 'Función Logarítmica',
      formulaHTML: HTML_HELPERS.fn('ln(x − 2)'),
      evalFn: (x) => (x - 2 <= 1e-9) ? NaN : Math.log(x - 2),
      isOutsideDomain: (x) => x <= 2 + 1e-6,
      asymptotes: [2],
      voidIntervals: [[-10, 2]],
      closedDots: [],
      openDots: [],
      isAllReals: false,
      domainText: 'Dom(f) = (2, +∞)',
      hint: 'El logaritmo solo existe si su argumento es estrictamente mayor que cero (x − 2 > 0). Por tanto, NO existe si x − 2 ≤ 0 (¡x = 2 también es seguro!).',
      explainPoint: (x) => `En x = ${formatNum(x)}, el argumento es ${formatNum(x)} − 2 = ${formatNum(x - 2)} ≤ 0. No existe el logaritmo de cero ni de números negativos.`
    },
    {
      id: 'log2',
      category: 'Función Logarítmica',
      formulaHTML: HTML_HELPERS.fn('log(5 − x)'),
      evalFn: (x) => (5 - x <= 1e-9) ? NaN : Math.log10(5 - x),
      isOutsideDomain: (x) => x >= 5 - 1e-6,
      asymptotes: [5],
      voidIntervals: [[5, 10]],
      closedDots: [],
      openDots: [],
      isAllReals: false,
      domainText: 'Dom(f) = (−∞, 5)',
      hint: 'Plantea 5 − x > 0 para ver dónde existe. La nave puede pasar donde 5 − x ≤ 0.',
      explainPoint: (x) => `En x = ${formatNum(x)}, el argumento vale 5 − (${formatNum(x)}) = ${formatNum(5 - x)} ≤ 0, fuera del dominio del logaritmo.`
    },
    {
      id: 'log3',
      category: 'Función Logarítmica',
      formulaHTML: HTML_HELPERS.fn('ln(x + 4)'),
      evalFn: (x) => (x + 4 <= 1e-9) ? NaN : Math.log(x + 4),
      isOutsideDomain: (x) => x <= -4 + 1e-6,
      asymptotes: [-4],
      voidIntervals: [[-10, -4]],
      closedDots: [],
      openDots: [],
      isAllReals: false,
      domainText: 'Dom(f) = (−4, +∞)',
      hint: 'El logaritmo neperiano exige x + 4 > 0. Busca un valor donde x + 4 ≤ 0.',
      explainPoint: (x) => `Con x = ${formatNum(x)}, tenemos ${formatNum(x)} + 4 = ${formatNum(x + 4)} ≤ 0. La función no existe para x ≤ −4.`
    },
    {
      id: 'log4',
      category: 'Función Logarítmica (2º grado)',
      formulaHTML: HTML_HELPERS.fn('ln(x<sup>2</sup> − 1)'),
      evalFn: (x) => (x * x - 1 <= 1e-9) ? NaN : Math.log(x * x - 1),
      isOutsideDomain: (x) => x >= -1 - 1e-6 && x <= 1 + 1e-6,
      asymptotes: [-1, 1],
      voidIntervals: [[-1, 1]],
      closedDots: [],
      openDots: [],
      isAllReals: false,
      domainText: 'Dom(f) = (−∞, −1) ∪ (1, +∞)',
      hint: 'Necesitamos que el argumento x² − 1 sea ≤ 0 para cruzar. Estudia el signo entre −1 y 1.',
      explainPoint: (x) => `En x = ${formatNum(x)}, el argumento es (${formatNum(x)})² − 1 = ${formatNum(x * x - 1)} ≤ 0. Todo el intervalo cerrado [−1, 1] está libre de onda.`
    },
    {
      id: 'log5',
      category: 'Función Logarítmica (2º grado)',
      formulaHTML: HTML_HELPERS.fn('log(4 − x<sup>2</sup>)'),
      evalFn: (x) => (4 - x * x <= 1e-9) ? NaN : Math.log10(4 - x * x),
      isOutsideDomain: (x) => x <= -2 + 1e-6 || x >= 2 - 1e-6,
      asymptotes: [-2, 2],
      voidIntervals: [[-10, -2], [2, 10]],
      closedDots: [],
      openDots: [],
      isAllReals: false,
      domainText: 'Dom(f) = (−2, 2)',
      hint: '4 − x² solo es estrictamente positivo entre −2 y 2. En los extremos (±2) y fuera de ellos el logaritmo no existe.',
      explainPoint: (x) => `En x = ${formatNum(x)}, 4 − (${formatNum(x)})² = ${formatNum(4 - x * x)} ≤ 0. El dominio es únicamente el intervalo abierto (−2, 2).`
    }
  ],

  pro: [
    {
      id: 'pro1',
      category: 'Nivel Pro · Combinada',
      formulaHTML: HTML_HELPERS.fn(HTML_HELPERS.frac('1', HTML_HELPERS.rad('x − 2'))),
      evalFn: (x) => (x - 2 <= 1e-9) ? NaN : 1 / Math.sqrt(x - 2),
      isOutsideDomain: (x) => x <= 2 + 1e-6,
      asymptotes: [2],
      voidIntervals: [[-10, 2]],
      closedDots: [],
      openDots: [],
      isAllReals: false,
      domainText: 'Dom(f) = (2, +∞)',
      hint: 'Hay una raíz cuadrada en el denominador: el radicando no puede ser negativo NI tampoco cero (división entre 0). Exige x − 2 > 0.',
      explainPoint: (x) => `En x = ${formatNum(x)}, el radicando vale ${formatNum(x - 2)} ≤ 0. Si es negativo falla la raíz, y si es 0 (x = 2) se anula el denominador.`
    },
    {
      id: 'pro2',
      category: 'Nivel Pro · Combinada',
      formulaHTML: HTML_HELPERS.fn(HTML_HELPERS.frac(HTML_HELPERS.rad('x + 3'), 'x − 1')),
      evalFn: (x) => {
        if (x + 3 < -1e-9 || Math.abs(x - 1) < 1e-6) return NaN;
        return Math.sqrt(Math.max(0, x + 3)) / (x - 1);
      },
      isOutsideDomain: (x) => x < -3 - 1e-6 || Math.abs(x - 1) < 0.06,
      asymptotes: [1],
      voidIntervals: [[-10, -3]],
      closedDots: [[-3, 0]],
      openDots: [],
      isAllReals: false,
      domainText: 'Dom(f) = [−3, +∞) − {1}',
      hint: 'Doble condición: el radicando del numerador debe ser ≥ 0 (x ≥ −3) Y el denominador no puede ser 0 (x ≠ 1). Puedes cruzar por x < −3 o justo por x = 1.',
      explainPoint: (x) => Math.abs(x - 1) < 0.06
        ? `¡Precisión quirúrgica! Aunque √(1+3) = 2 existe, en x = 1 el denominador se anula (1 − 1 = 0).`
        : `En x = ${formatNum(x)}, el radicando x + 3 = ${formatNum(x + 3)} < 0, así que la raíz cuadrada no existe.`
    },
    {
      id: 'pro3',
      category: 'Nivel Pro · ¡Posible Trampa!',
      formulaHTML: HTML_HELPERS.fn(HTML_HELPERS.frac('4', 'x<sup>2</sup> + 4')),
      evalFn: (x) => 4 / (x * x + 4),
      isOutsideDomain: () => false,
      asymptotes: [],
      voidIntervals: [],
      closedDots: [],
      openDots: [],
      isAllReals: true,
      domainText: 'Dom(f) = ℝ',
      hint: 'Intenta resolver x² + 4 = 0 en los números reales. ¿Existe algún número real cuyo cuadrado sea −4?',
      explainPoint: () => 'Como x² ≥ 0 para todo x ∈ ℝ, entonces x² + 4 ≥ 4 > 0 siempre. ¡El denominador nunca se anula! No hay brechas: la única salida es el Salto Hiperespacial.'
    },
    {
      id: 'pro4',
      category: 'Nivel Pro · ¡Posible Trampa!',
      formulaHTML: HTML_HELPERS.fn(HTML_HELPERS.rad('x<sup>2</sup> + 1')),
      evalFn: (x) => Math.sqrt(x * x + 1),
      isOutsideDomain: () => false,
      asymptotes: [],
      voidIntervals: [],
      closedDots: [],
      openDots: [],
      isAllReals: true,
      domainText: 'Dom(f) = ℝ',
      hint: 'Analiza el signo de x² + 1. ¿Puede llegar a ser negativo para algún número real x?',
      explainPoint: () => 'Para cualquier número real x, x² ≥ 0, por lo que x² + 1 ≥ 1 > 0. La raíz siempre existe y el dominio es todo ℝ.'
    },
    {
      id: 'pro5',
      category: 'Nivel Pro · ¡Posible Trampa!',
      formulaHTML: HTML_HELPERS.fn('ln(x<sup>2</sup> + 2)'),
      evalFn: (x) => Math.log(x * x + 2),
      isOutsideDomain: () => false,
      asymptotes: [],
      voidIntervals: [],
      closedDots: [],
      openDots: [],
      isAllReals: true,
      domainText: 'Dom(f) = ℝ',
      hint: 'El logaritmo exige que el argumento sea estrictamente positivo. Comprueba si x² + 2 puede ser ≤ 0.',
      explainPoint: () => 'Como x² ≥ 0, el argumento cumple x² + 2 ≥ 2 > 0 siempre. El logaritmo existe para todo x ∈ ℝ: ¡Salto Hiperespacial obligatorio!'
    },
    {
      id: 'pro6',
      category: 'Nivel Pro · Cuadrado perfecto',
      formulaHTML: HTML_HELPERS.fn(HTML_HELPERS.frac('1', 'x<sup>2</sup> − 4x + 4')),
      evalFn: (x) => {
        const d = x * x - 4 * x + 4;
        return Math.abs(d) < 1e-6 ? NaN : 1 / d;
      },
      isOutsideDomain: (x) => Math.abs(x - 2) < 0.06,
      asymptotes: [2],
      voidIntervals: [],
      closedDots: [],
      openDots: [],
      isAllReals: false,
      domainText: 'Dom(f) = ℝ − {2}',
      hint: 'Fíjate en el denominador: x² − 4x + 4 es una identidad notable (x − 2)². ¿Dónde se anula?',
      explainPoint: (x) => `El denominador es (x − 2)², que tiene una raíz doble en x = 2. Ahí es el único punto donde la función no existe.`
    }
  ]
};
