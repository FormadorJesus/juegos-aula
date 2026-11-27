/**
 * data/enemigos.js
 * Catálogo de enemigos con sprites SVG detallados, vida (50 HP), daño (25 HP) y recompensa (25 oro).
 * Puedes añadir nuevos monstruos al array ENEMIGOS y aparecerán automáticamente en la mazmorra.
 */
window.HeroMath = window.HeroMath || {};

window.HeroMath.ENEMIGOS = [
  {
    id: 'goblin',
    nombre: 'Goblin Saqueador',
    maxHp: 50,
    danio: 25,
    oro: 25,
    esJefe: false,
    frase: '¡Tus monedas serán mías si fallas el cálculo!'
  },
  {
    id: 'esqueleto',
    nombre: 'Esqueleto Guerrero',
    maxHp: 50,
    danio: 25,
    oro: 25,
    esJefe: false,
    frase: '¡Ningún alumno pasará por este pasillo!'
  },
  {
    id: 'orco',
    nombre: 'Orco de la Cripta',
    maxHp: 50,
    danio: 25,
    oro: 25,
    esJefe: false,
    frase: '¡Aplastaré tu puntuación con mi hacha!'
  },
  {
    id: 'arana',
    nombre: 'Araña Abisal',
    maxHp: 50,
    danio: 25,
    oro: 25,
    esJefe: false,
    frase: '¡Te quedarás atrapado en mi red de signos!'
  },
  {
    id: 'momia',
    nombre: 'Momia Maldita',
    maxHp: 50,
    danio: 25,
    oro: 25,
    esJefe: false,
    frase: '¡Resuelve el reto o sufre la maldición!'
  },
  {
    id: 'gargola',
    nombre: 'Gárgola Guardiana',
    maxHp: 50,
    danio: 25,
    oro: 25,
    esJefe: true,
    frase: '¡Solo los maestros de las matemáticas abrirán el Gran Cofre!'
  }
];

window.HeroMath.getEnemySVG = function(enemyId, opts) {
  if (window.HeroMath.PixelArt && typeof window.HeroMath.PixelArt.createEnemyCanvasHTML === 'function') {
    return window.HeroMath.PixelArt.createEnemyCanvasHTML(enemyId, opts);
  }
  let body = '';
  switch (enemyId) {
    case 'goblin':
      body = `
        <!-- Orejas puntiagudas -->
        <polygon points="16,38 36,34 32,48" fill="#58b947" stroke="#1a1a2e" stroke-width="2.2"/>
        <polygon points="84,38 64,34 68,48" fill="#58b947" stroke="#1a1a2e" stroke-width="2.2"/>
        <!-- Cuerpo y chaleco -->
        <path d="M30 92 L35 56 L65 56 L70 92 Z" fill="#6e2c00" stroke="#1a1a2e" stroke-width="2.5"/>
        <rect x="42" y="64" width="16" height="18" rx="3" fill="#a04000"/>
        <!-- Cabeza -->
        <ellipse cx="50" cy="40" rx="18" ry="16" fill="#58b947" stroke="#1a1a2e" stroke-width="2.5"/>
        <!-- Ojos rojos furiosos -->
        <polygon points="38,34 48,38 38,42" fill="#f1c40f" stroke="#1a1a2e" stroke-width="1.5"/>
        <polygon points="62,34 52,38 62,42" fill="#f1c40f" stroke="#1a1a2e" stroke-width="1.5"/>
        <circle cx="43" cy="38" r="2" fill="#c0392b"/><circle cx="57" cy="38" r="2" fill="#c0392b"/>
        <!-- Boca con colmillos -->
        <path d="M40 48 Q50 54 60 48" fill="#1a1a2e"/>
        <polygon points="43,48 46,53 48,48" fill="#fff"/><polygon points="52,48 54,53 57,48" fill="#fff"/>
        <!-- Daga dentada -->
        <path d="M78 36 L88 52 L76 62 L74 44 Z" fill="#bdc3c7" stroke="#1a1a2e" stroke-width="2"/>
        <rect x="76" y="62" width="6" height="12" fill="#4a235a"/>
      `;
      break;

    case 'esqueleto':
      body = `
        <!-- Costillas y capa hecha jirones -->
        <path d="M26 94 L34 54 L66 54 L74 94 Z" fill="#2c3e50" stroke="#1a1a2e" stroke-width="2.5"/>
        <line x1="50" y1="54" x2="50" y2="88" stroke="#ecf0f1" stroke-width="5"/>
        <line x1="38" y1="62" x2="62" y2="62" stroke="#ecf0f1" stroke-width="3.5" stroke-linecap="round"/>
        <line x1="39" y1="70" x2="61" y2="70" stroke="#ecf0f1" stroke-width="3.5" stroke-linecap="round"/>
        <line x1="41" y1="78" x2="59" y2="78" stroke="#ecf0f1" stroke-width="3.5" stroke-linecap="round"/>
        <!-- Cráneo -->
        <ellipse cx="50" cy="34" rx="17" ry="16" fill="#f8f9f9" stroke="#1a1a2e" stroke-width="2.5"/>
        <rect x="40" y="45" width="20" height="10" rx="3" fill="#f8f9f9" stroke="#1a1a2e" stroke-width="2.2"/>
        <!-- Cuencas -->
        <circle cx="43" cy="34" r="5" fill="#1a1a2e"/><circle cx="57" cy="34" r="5" fill="#1a1a2e"/>
        <circle cx="43" cy="34" r="2" fill="#00e5ff"/><circle cx="57" cy="34" r="2" fill="#00e5ff"/>
        <polygon points="50,39 47,44 53,44" fill="#1a1a2e"/>
        <!-- Dientes -->
        <line x1="45" y1="47" x2="45" y2="54" stroke="#1a1a2e" stroke-width="1.5"/>
        <line x1="50" y1="47" x2="50" y2="54" stroke="#1a1a2e" stroke-width="1.5"/>
        <line x1="55" y1="47" x2="55" y2="54" stroke="#1a1a2e" stroke-width="1.5"/>
        <!-- Espada oxidada -->
        <path d="M78 20 L84 26 L82 68 L76 68 Z" fill="#95a5a6" stroke="#1a1a2e" stroke-width="2"/>
        <rect x="72" y="66" width="14" height="4" fill="#5d4037"/>
      `;
      break;

    case 'orco':
      body = `
        <!-- Torso ancho -->
        <path d="M18 94 L26 50 L74 50 L82 94 Z" fill="#3d6b35" stroke="#1a1a2e" stroke-width="2.5"/>
        <path d="M28 54 L72 54 L66 86 L34 86 Z" fill="#5d4037" stroke="#1a1a2e" stroke-width="2"/>
        <circle cx="24" cy="56" r="10" fill="#7f8c8d" stroke="#1a1a2e" stroke-width="2"/>
        <!-- Cabeza -->
        <rect x="33" y="20" width="34" height="32" rx="12" fill="#4a8040" stroke="#1a1a2e" stroke-width="2.5"/>
        <!-- Cejas y ojos -->
        <line x1="38" y1="30" x2="48" y2="34" stroke="#1a1a2e" stroke-width="3.5" stroke-linecap="round"/>
        <line x1="62" y1="30" x2="52" y2="34" stroke="#1a1a2e" stroke-width="3.5" stroke-linecap="round"/>
        <circle cx="43" cy="36" r="2.8" fill="#e74c3c"/><circle cx="57" cy="36" r="2.8" fill="#e74c3c"/>
        <!-- Colmillos inferiores -->
        <path d="M38 46 Q50 42 62 46" fill="none" stroke="#1a1a2e" stroke-width="2.5"/>
        <polygon points="40,46 43,39 46,46" fill="#fef9e7" stroke="#1a1a2e" stroke-width="1.2"/>
        <polygon points="54,46 57,39 60,46" fill="#fef9e7" stroke="#1a1a2e" stroke-width="1.2"/>
        <!-- Gran Hacha -->
        <line x1="84" y1="18" x2="84" y2="90" stroke="#6e2c00" stroke-width="5" stroke-linecap="round"/>
        <path d="M84 22 C98 20 98 48 84 46 Z" fill="#bdc3c7" stroke="#1a1a2e" stroke-width="2.2"/>
        <path d="M84 26 C74 26 74 42 84 42 Z" fill="#95a5a6" stroke="#1a1a2e" stroke-width="2"/>
      `;
      break;

    case 'arana':
      body = `
        <!-- Patas -->
        <path d="M34 52 L14 34 L8 54" fill="none" stroke="#1a1a2e" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M32 60 L10 56 L8 78" fill="none" stroke="#1a1a2e" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M34 68 L16 78 L18 92" fill="none" stroke="#1a1a2e" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M66 52 L86 34 L92 54" fill="none" stroke="#1a1a2e" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M68 60 L90 56 L92 78" fill="none" stroke="#1a1a2e" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M66 68 L84 78 L82 92" fill="none" stroke="#1a1a2e" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round"/>
        <!-- Abdomen -->
        <ellipse cx="50" cy="40" rx="22" ry="20" fill="#2c2038" stroke="#1a1a2e" stroke-width="2.5"/>
        <polygon points="50,28 56,40 50,50 44,40" fill="#e74c3c"/>
        <!-- Cabeza -->
        <circle cx="50" cy="64" r="15" fill="#3d2b4f" stroke="#1a1a2e" stroke-width="2.5"/>
        <!-- Ojos múltiples -->
        <circle cx="43" cy="62" r="3.5" fill="#ff3b3b"/><circle cx="57" cy="62" r="3.5" fill="#ff3b3b"/>
        <circle cx="48" cy="57" r="2" fill="#ff9f43"/><circle cx="52" cy="57" r="2" fill="#ff9f43"/>
        <!-- Quelíceros -->
        <path d="M43 74 L46 84 L50 76" fill="#ecf0f1" stroke="#1a1a2e" stroke-width="1.5"/>
        <path d="M57 74 L54 84 L50 76" fill="#ecf0f1" stroke="#1a1a2e" stroke-width="1.5"/>
      `;
      break;

    case 'momia':
      body = `
        <!-- Cuerpo vendado -->
        <path d="M28 94 L33 52 L67 52 L72 94 Z" fill="#e5d9b6" stroke="#1a1a2e" stroke-width="2.5"/>
        <line x1="32" y1="62" x2="68" y2="58" stroke="#a89972" stroke-width="3"/>
        <line x1="30" y1="74" x2="70" y2="70" stroke="#a89972" stroke-width="3"/>
        <line x1="29" y1="84" x2="71" y2="86" stroke="#a89972" stroke-width="3"/>
        <!-- Brazos extendidos -->
        <rect x="14" y="54" width="20" height="10" rx="4" fill="#e5d9b6" stroke="#1a1a2e" stroke-width="2"/>
        <rect x="66" y="54" width="20" height="10" rx="4" fill="#e5d9b6" stroke="#1a1a2e" stroke-width="2"/>
        <!-- Cabeza vendada -->
        <ellipse cx="50" cy="34" rx="16" ry="18" fill="#e5d9b6" stroke="#1a1a2e" stroke-width="2.5"/>
        <path d="M35 28 L65 24" stroke="#a89972" stroke-width="3"/>
        <path d="M35 42 L65 46" stroke="#a89972" stroke-width="3"/>
        <!-- Ranura de ojos brillantes -->
        <rect x="37" y="31" width="26" height="8" rx="3" fill="#1a1a2e"/>
        <circle cx="44" cy="35" r="2.8" fill="#2ecc71"/><circle cx="56" cy="35" r="2.8" fill="#2ecc71"/>
        <!-- Amuleto dorado -->
        <polygon points="50,58 55,66 50,74 45,66" fill="#f1c40f" stroke="#1a1a2e" stroke-width="1.5"/>
      `;
      break;

    case 'gargola':
    default:
      body = `
        <!-- Alas de piedra -->
        <path d="M40 50 L6 16 L12 56 L26 62 Z" fill="#566573" stroke="#1a1a2e" stroke-width="2.5"/>
        <path d="M60 50 L94 16 L88 56 L74 62 Z" fill="#566573" stroke="#1a1a2e" stroke-width="2.5"/>
        <!-- Cuerpo musculoso de piedra -->
        <path d="M28 94 L32 48 L68 48 L72 94 Z" fill="#707b7c" stroke="#1a1a2e" stroke-width="2.5"/>
        <path d="M38 56 L62 56 L58 76 L42 76 Z" fill="#566573"/>
        <!-- Cuernos -->
        <path d="M38 26 Q28 10 34 8 Q42 14 44 24 Z" fill="#2c3e50" stroke="#1a1a2e" stroke-width="2"/>
        <path d="M62 26 Q72 10 66 8 Q58 14 56 24 Z" fill="#2c3e50" stroke="#1a1a2e" stroke-width="2"/>
        <!-- Cabeza -->
        <ellipse cx="50" cy="36" rx="16" ry="15" fill="#7f8c8d" stroke="#1a1a2e" stroke-width="2.5"/>
        <!-- Ojos ardientes -->
        <polygon points="38,32 47,36 39,38" fill="#ff5722"/>
        <polygon points="62,32 53,36 61,38" fill="#ff5722"/>
        <!-- Colmillos -->
        <path d="M40 44 L60 44" stroke="#1a1a2e" stroke-width="2.5"/>
        <polygon points="43,44 45,49 47,44" fill="#fff"/>
        <polygon points="53,44 55,49 57,44" fill="#fff"/>
        <!-- Corona de jefe -->
        <polygon points="42,20 46,12 50,18 54,12 58,20" fill="#f1c40f" stroke="#1a1a2e" stroke-width="1.5"/>
      `;
      break;
  }

  return `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" class="sprite-svg">${body}</svg>`;
};
