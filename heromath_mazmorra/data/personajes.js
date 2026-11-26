/**
 * data/personajes.js
 * Catálogo de clases de héroes, colores, emblemas y sprites SVG detallados.
 * Puedes añadir nuevas clases o modificar colores fácilmente aquí.
 */
window.HeroMath = window.HeroMath || {};

window.HeroMath.COLORES = [
  { id: 'rojo',     nombre: 'Carmesí',   hex: '#e74c3c', oscuro: '#96281b' },
  { id: 'azul',     nombre: 'Zafiro',    hex: '#3498db', oscuro: '#1f618d' },
  { id: 'verde',    nombre: 'Esmeralda', hex: '#2ecc71', oscuro: '#1e8449' },
  { id: 'morado',   nombre: 'Amatista',  hex: '#9b59b6', oscuro: '#6c3483' },
  { id: 'dorado',   nombre: 'Ámbar',     hex: '#f39c12', oscuro: '#b9770e' },
  { id: 'turquesa', nombre: 'Turquesa',  hex: '#1abc9c', oscuro: '#117864' }
];

window.HeroMath.EMBLEMAS = ['⚔️', '🔥', '🛡️', '⚡', '🐉', '🌟', '🏹', '💎'];

window.HeroMath.CLASES = [
  { id: 'guerrero', nombre: 'Guerrero', desc: 'Maestro de la espada y el escudo' },
  { id: 'mago',     nombre: 'Mago',     desc: 'Domina la magia de los números' },
  { id: 'ladron',   nombre: 'Ladrón',   desc: 'Ágil explorador de mazmorras' },
  { id: 'arquero',  nombre: 'Arquero',  desc: 'Puntería letal en los pasillos' },
  { id: 'clerigo',  nombre: 'Clérigo',  desc: 'Protector de luz y sabiduría' },
  { id: 'paladin',  nombre: 'Paladín',  desc: 'Caballero de armadura dorada' }
];

window.HeroMath.getHeroSVG = function(claseId, colorHex, colorOscuro) {
  const c = colorHex || '#3498db';
  const d = colorOscuro || '#1f618d';
  let body = '';

  switch (claseId) {
    case 'mago':
      body = `
        <!-- Túnica -->
        <path d="M24 94 L32 54 L68 54 L76 94 Z" fill="${c}" stroke="#1a1a2e" stroke-width="2.5"/>
        <path d="M44 54 L56 54 L53 94 L47 94 Z" fill="#f1c40f" opacity="0.85"/>
        <!-- Capa y hombros -->
        <ellipse cx="50" cy="56" rx="22" ry="7" fill="${d}" stroke="#1a1a2e" stroke-width="2"/>
        <!-- Cabeza y barba -->
        <circle cx="50" cy="40" r="14" fill="#f5cba7" stroke="#1a1a2e" stroke-width="2.2"/>
        <path d="M38 46 Q50 62 62 46 Q58 55 50 57 Q42 55 38 46 Z" fill="#ecf0f1" stroke="#bdc3c7" stroke-width="1.2"/>
        <circle cx="45" cy="39" r="2.2" fill="#1a1a2e"/><circle cx="55" cy="39" r="2.2" fill="#1a1a2e"/>
        <!-- Sombrero puntiagudo -->
        <path d="M22 33 Q50 24 78 33 Q50 38 22 33 Z" fill="${d}" stroke="#1a1a2e" stroke-width="2"/>
        <path d="M33 31 L50 4 L67 31 Z" fill="${c}" stroke="#1a1a2e" stroke-width="2.2"/>
        <circle cx="50" cy="20" r="3.5" fill="#f1c40f"/>
        <!-- Bastón mágico -->
        <line x1="82" y1="26" x2="82" y2="94" stroke="#784212" stroke-width="4.5" stroke-linecap="round"/>
        <circle cx="82" cy="22" r="7.5" fill="#5dade2" stroke="#f1c40f" stroke-width="2.5"/>
        <circle cx="80" cy="20" r="2.5" fill="#ffffff" opacity="0.8"/>
      `;
      break;

    case 'ladron':
      body = `
        <!-- Capa oscura -->
        <path d="M25 94 L30 52 L70 52 L75 94 Z" fill="${d}" stroke="#1a1a2e" stroke-width="2.5"/>
        <path d="M35 54 L65 54 L62 94 L38 94 Z" fill="${c}" stroke="#1a1a2e" stroke-width="2"/>
        <!-- Cinturón -->
        <rect x="34" y="72" width="32" height="6" rx="2" fill="#5d4037" stroke="#1a1a2e" stroke-width="1.5"/>
        <rect x="46" y="71" width="8" height="8" rx="1.5" fill="#f1c40f"/>
        <!-- Capucha -->
        <path d="M29 48 C29 18 71 18 71 48 L64 56 L36 56 Z" fill="${c}" stroke="#1a1a2e" stroke-width="2.5"/>
        <!-- Rostro con antifaz -->
        <circle cx="50" cy="40" r="12" fill="#f5cba7"/>
        <rect x="38" y="34" width="24" height="8" rx="4" fill="#1a1a2e"/>
        <circle cx="44.5" cy="38" r="2" fill="#ffffff"/><circle cx="55.5" cy="38" r="2" fill="#ffffff"/>
        <!-- Dagas gemelas -->
        <path d="M18 52 L24 68 L14 68 Z" fill="#d5d8dc" stroke="#1a1a2e" stroke-width="1.8"/>
        <rect x="17" y="68" width="4" height="8" fill="#5d4037"/>
        <path d="M82 52 L86 68 L76 68 Z" fill="#d5d8dc" stroke="#1a1a2e" stroke-width="1.8"/>
        <rect x="79" y="68" width="4" height="8" fill="#5d4037"/>
      `;
      break;

    case 'arquero':
      body = `
        <!-- Túnica de explorador -->
        <path d="M28 94 L34 54 L66 54 L72 94 Z" fill="${c}" stroke="#1a1a2e" stroke-width="2.5"/>
        <line x1="36" y1="54" x2="64" y2="86" stroke="#6e2c00" stroke-width="4"/>
        <!-- Cabeza -->
        <circle cx="50" cy="40" r="14" fill="#f5cba7" stroke="#1a1a2e" stroke-width="2.2"/>
        <circle cx="45" cy="40" r="2.2" fill="#1a1a2e"/><circle cx="55" cy="40" r="2.2" fill="#1a1a2e"/>
        <path d="M46 46 Q50 49 54 46" fill="none" stroke="#1a1a2e" stroke-width="1.8" stroke-linecap="round"/>
        <!-- Gorro con pluma -->
        <path d="M32 34 Q50 18 68 34 L64 26 Q50 16 36 26 Z" fill="${d}" stroke="#1a1a2e" stroke-width="2"/>
        <path d="M62 24 Q76 10 72 28 Z" fill="#e74c3c" stroke="#1a1a2e" stroke-width="1.5"/>
        <!-- Arco -->
        <path d="M80 22 Q96 54 80 86" fill="none" stroke="#873600" stroke-width="4.5" stroke-linecap="round"/>
        <line x1="80" y1="22" x2="80" y2="86" stroke="#ecf0f1" stroke-width="1.5"/>
        <!-- Flecha -->
        <line x1="68" y1="54" x2="92" y2="54" stroke="#d5d8dc" stroke-width="2.5"/>
        <polygon points="95,54 88,50 88,58" fill="#f1c40f"/>
      `;
      break;

    case 'clerigo':
      body = `
        <!-- Vestidura sagrada -->
        <path d="M26 94 L32 52 L68 52 L74 94 Z" fill="#ecf0f1" stroke="#1a1a2e" stroke-width="2.5"/>
        <path d="M44 52 L56 52 L56 94 L44 94 Z" fill="${c}"/>
        <rect x="36" y="64" width="28" height="7" fill="${c}" opacity="0.9"/>
        <!-- Cabeza con halo -->
        <circle cx="50" cy="24" r="14" fill="none" stroke="#f1c40f" stroke-width="3" opacity="0.85"/>
        <circle cx="50" cy="40" r="14" fill="#f5cba7" stroke="#1a1a2e" stroke-width="2.2"/>
        <path d="M36 36 Q50 22 64 36" fill="${d}" stroke="#1a1a2e" stroke-width="2"/>
        <circle cx="45" cy="41" r="2.2" fill="#1a1a2e"/><circle cx="55" cy="41" r="2.2" fill="#1a1a2e"/>
        <!-- Maza dorada -->
        <line x1="82" y1="36" x2="82" y2="92" stroke="#6e2c00" stroke-width="4" stroke-linecap="round"/>
        <circle cx="82" cy="30" r="9" fill="#f1c40f" stroke="#1a1a2e" stroke-width="2"/>
        <circle cx="82" cy="30" r="3" fill="#ffffff"/>
      `;
      break;

    case 'paladin':
      body = `
        <!-- Armadura dorada y capa -->
        <path d="M20 94 L28 50 L72 50 L80 94 Z" fill="${c}" stroke="#1a1a2e" stroke-width="2.5"/>
        <rect x="34" y="54" width="32" height="38" rx="6" fill="#f4d03f" stroke="#1a1a2e" stroke-width="2.2"/>
        <path d="M46 60 L54 60 L54 84 L46 84 Z" fill="${c}"/>
        <path d="M39 68 L61 68 L61 75 L39 75 Z" fill="${c}"/>
        <!-- Yelmo alado -->
        <rect x="36" y="24" width="28" height="28" rx="10" fill="#f7dc6f" stroke="#1a1a2e" stroke-width="2.2"/>
        <rect x="41" y="35" width="18" height="5" rx="2" fill="#1a1a2e"/>
        <path d="M36 32 L24 22 L32 38 Z" fill="#ecf0f1" stroke="#1a1a2e" stroke-width="1.5"/>
        <path d="M64 32 L76 22 L68 38 Z" fill="#ecf0f1" stroke="#1a1a2e" stroke-width="1.5"/>
        <!-- Escudo -->
        <path d="M12 56 L30 56 L30 74 Q21 86 12 74 Z" fill="${d}" stroke="#f1c40f" stroke-width="2.5"/>
        <!-- Espada -->
        <rect x="80" y="24" width="6" height="44" rx="2" fill="#ecf0f1" stroke="#1a1a2e" stroke-width="1.8"/>
        <rect x="74" y="66" width="18" height="5" rx="2" fill="#f1c40f" stroke="#1a1a2e" stroke-width="1.5"/>
        <rect x="81" y="71" width="4" height="12" fill="#6e2c00"/>
      `;
      break;

    case 'guerrero':
    default:
      body = `
        <!-- Armadura -->
        <path d="M26 94 L32 52 L68 52 L74 94 Z" fill="#95a5a6" stroke="#1a1a2e" stroke-width="2.5"/>
        <path d="M34 54 L66 54 L62 88 L38 88 Z" fill="${c}" stroke="#1a1a2e" stroke-width="2"/>
        <!-- Hombreras -->
        <circle cx="30" cy="56" r="8" fill="#bdc3c7" stroke="#1a1a2e" stroke-width="2"/>
        <circle cx="70" cy="56" r="8" fill="#bdc3c7" stroke="#1a1a2e" stroke-width="2"/>
        <!-- Yelmo con penacho -->
        <path d="M44 10 Q54 6 62 18 L48 22 Z" fill="${c}" stroke="#1a1a2e" stroke-width="1.8"/>
        <rect x="35" y="22" width="30" height="28" rx="11" fill="#bdc3c7" stroke="#1a1a2e" stroke-width="2.2"/>
        <rect x="40" y="34" width="20" height="6" rx="2" fill="#1a1a2e"/>
        <circle cx="46" cy="37" r="1.8" fill="#f1c40f"/><circle cx="54" cy="37" r="1.8" fill="#f1c40f"/>
        <!-- Escudo -->
        <path d="M12 56 L30 56 L30 75 Q21 86 12 75 Z" fill="${d}" stroke="#bdc3c7" stroke-width="2.5"/>
        <circle cx="21" cy="68" r="4" fill="#f1c40f"/>
        <!-- Espada ancha -->
        <polygon points="83,16 88,26 86,66 80,66 78,26" fill="#ecf0f1" stroke="#1a1a2e" stroke-width="1.8"/>
        <rect x="74" y="65" width="18" height="5" rx="2" fill="#f1c40f" stroke="#1a1a2e" stroke-width="1.5"/>
        <rect x="81" y="70" width="4" height="12" fill="#6e2c00"/>
      `;
      break;
  }

  return `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" class="sprite-svg">${body}</svg>`;
};
