/**
 * js/pixel-art.js
 * Motor de sprites Pixel-Art 16-bit animados (32x32) para HeroMath.
 * - 6 clases de héroes con teñido dinámico por color de equipo (idle, attack, hit)
 * - 6 enemigos de mazmorra con animaciones multiframe (ojos, armas, patas, vendas, alas)
 * - Props de tablero: cofres, Gran Cofre Real, puertas, antorchas parpadeantes, escaleras y lápida
 * - Texturas pixel-art procedurales para muros y losas de piedra del tablero
 * - Bucle de animación centralizado (~7 FPS) que solo renderiza lienzos visibles
 */
window.HeroMath = window.HeroMath || {};

window.HeroMath.PixelArt = (function () {
  'use strict';

  const SIZE = 32;
  const FRAME_MS = 145; // ~6.9 FPS estilo RPG 16-bit
  let globalFrame = 0;
  let lastTick = 0;
  let rafId = null;

  // Paleta base compartida (inspirada en SNES / GBA fantasy RPG)
  const BASE = {
    'O': '#130e1f', // Contorno oscuro profundo
    'B': '#221a33', // Sombra muy oscura
    // Acero / plata
    'S': '#f1f5f9', // Brillo acero
    's': '#cbd5e1', // Acero medio
    't': '#8b9bb4', // Acero sombra
    'T': '#515e78', // Acero oscuro
    // Oro / latón
    'G': '#fff6a8', // Brillo oro
    'g': '#f5c82e', // Oro medio
    'h': '#c98612', // Oro sombra
    'H': '#7c4809', // Oro oscuro
    // Piel
    'K': '#ffe2c2', // Piel luz
    'k': '#f2b885', // Piel medio
    'j': '#c78356', // Piel sombra
    // Madera / cuero
    'W': '#b87439', // Madera luz
    'w': '#854c22', // Madera medio
    'm': '#522c12', // Madera oscuro
    // Blanco / hueso / nieve
    'F': '#ffffff', // Blanco puro
    'f': '#dce4ef', // Blanco sombra
    'v': '#a6b3c7', // Gris claro
    // Magia cian
    'Q': '#e2fcff',
    'q': '#5ae0ff',
    'u': '#1c8fe8',
    // Rojo / rubí / fuego
    'R': '#ff6b6b',
    'r': '#e03131',
    'n': '#8f1919',
    // Verde / veneno / esmeralda
    'E': '#9dff7a',
    'e': '#4cc936',
    'z': '#287a22',
    'Z': '#184718',
    // Morado / araña / sombra
    'P': '#8a5fd1',
    'p': '#51327d',
    'x': '#2d1a47',
    // Piedra / gárgola
    'A': '#a3b1bf',
    'a': '#717f8e',
    'i': '#4b5563',
    'I': '#2c333d',
    // Vendas / pergamino
    'L': '#fbf3d5',
    'l': '#e1d1a3',
    'y': '#b09d6e',
    'Y': '#7a6946',
    // Fuego / naranja
    'N': '#ff922b',
    'X': '#ffd43b'
  };

  // --- Utilidades de color para teñir armaduras y túnicas dinámicamente ---
  function hexToRgb(hex) {
    const clean = String(hex || '#3498db').replace('#', '');
    const full = clean.length === 3
      ? clean.split('').map(ch => ch + ch).join('')
      : clean.padEnd(6, '0').slice(0, 6);
    const num = parseInt(full, 16);
    return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 };
  }

  function rgbToHex(r, g, b) {
    const clamp = v => Math.max(0, Math.min(255, Math.round(v)));
    return '#' + [clamp(r), clamp(g), clamp(b)]
      .map(v => v.toString(16).padStart(2, '0'))
      .join('');
  }

  function mixHex(hexA, hexB, t) {
    const a = hexToRgb(hexA);
    const b = hexToRgb(hexB);
    return rgbToHex(
      a.r + (b.r - a.r) * t,
      a.g + (b.g - a.g) * t,
      a.b + (b.b - a.b) * t
    );
  }

  function buildTeamPalette(colorHex, colorOscuro) {
    const main = colorHex || '#3498db';
    const dark = colorOscuro || mixHex(main, '#120e1f', 0.38);
    return Object.assign({}, BASE, {
      'C': mixHex(main, '#ffffff', 0.36), // Brillo color equipo
      'c': main,                          // Color principal equipo
      'd': dark,                          // Sombra color equipo
      'D': mixHex(dark, '#0e0a18', 0.42)  // Sombra profunda equipo
    });
  }

  // --- Primitivas de dibujo píxel a píxel ---
  function px(ctx, x, y, color) {
    if (!color) return;
    ctx.fillStyle = color;
    ctx.fillRect(Math.round(x), Math.round(y), 1, 1);
  }

  function rect(ctx, x, y, w, h, color) {
    if (!color || w <= 0 || h <= 0) return;
    ctx.fillStyle = color;
    ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
  }

  function blit(ctx, ox, oy, rows, pal) {
    for (let y = 0; y < rows.length; y++) {
      const row = rows[y];
      for (let x = 0; x < row.length; x++) {
        const ch = row[x];
        if (ch === '.' || ch === ' ') continue;
        const col = pal[ch];
        if (!col) continue;
        ctx.fillStyle = col;
        ctx.fillRect(ox + x, oy + y, 1, 1);
      }
    }
  }

  function drawShadow(ctx, cx, y, rx) {
    ctx.fillStyle = 'rgba(10, 7, 18, 0.45)';
    ctx.fillRect(cx - rx, y, rx * 2, 2);
    ctx.fillRect(cx - rx + 2, y - 1, (rx - 2) * 2, 4);
  }

  // =========================================================================
  //  SPRITES DE HÉROES (32x32) — 6 CLASES CON COLOR DINÁMICO + ANIMACIÓN
  // =========================================================================

  function drawGuerrero(ctx, pal, frame, pose) {
    const bob = (frame === 1 || frame === 3) ? 1 : 0;
    const dx = pose === 'attack' ? 2 : (pose === 'hit' ? -2 : 0);
    drawShadow(ctx, 16, 29, 9);

    // Penacho del yelmo (ondea según frame)
    const plumeShift = frame % 2 === 0 ? 0 : 1;
    blit(ctx, 11 + dx + plumeShift, 1 + bob, [
      '..OOO...',
      '.OCCcO..',
      '.OcccDO.',
      '..OcdO..'
    ], pal);

    // Cuerpo + yelmo + armadura + escudo
    blit(ctx, 3 + dx, 4 + bob, [
      '........OOOOOO..........',
      '.......OSSSSssO.........',
      '......OSssssstTO........',
      '......OStOOOOtTO........',
      '......OSOGOGOtTO........',
      '......OStOOOOtTO........',
      '.......OsttttTO.........',
      '....OOOOOccccOOOOO......',
      '...OSssOCCCCCCcOssO.....',
      '..OSstOccccccccdOstO....',
      '..OStOdcCcccccdcdOtO....',
      '.OOOOOddccccccddOOtO....',
      '.OgsGOOmmGggGmmOO..O....',
      '.OgcdGOOccccccOO........',
      '.OgcGGOOcdccddOO........',
      '.OgcdGOOcdccddOO........',
      '.OgdDGOOStOOtSOO........',
      '..OggOO.OtOOtO..........',
      '...OO...OtOOtO..........',
      '.......OmmOOmmO.........',
      '.......OmmOOmmO.........',
      '.......OOOOOOOO.........'
    ], pal);

    // Espada ancha a la derecha (se eleva o golpea según pose/frame)
    const swY = pose === 'attack' ? 1 : (frame === 2 ? 3 : 4 + bob);
    const swX = pose === 'attack' ? 24 : 23 + dx;
    blit(ctx, swX, swY, [
      '..O..',
      '.OSO.',
      '.OSsO',
      '.OSsO',
      '.OSsO',
      '.OStO',
      '.OStO',
      '.OStO',
      '.OStO',
      '.OStO',
      'OgggO',
      'OhghO',
      '.OmO.',
      '.OmO.',
      '.OgO.'
    ], pal);

    // Destello animado recorriendo la hoja de la espada
    const glintY = swY + 2 + ((frame * 2) % 7);
    px(ctx, swX + 2, glintY, pal.F);
    px(ctx, swX + 3, glintY + 1, pal.S);

    if (pose === 'attack') {
      blit(ctx, 25, 4, [
        '..F.',
        '...F',
        '..SF',
        '.SGF',
        '..SF',
        '...F',
        '..F.'
      ], pal);
    }
  }

  function drawMago(ctx, pal, frame, pose) {
    const bob = (frame === 1 || frame === 3) ? 1 : 0;
    const dx = pose === 'attack' ? 2 : (pose === 'hit' ? -2 : 0);
    drawShadow(ctx, 15, 29, 9);

    // Punta del sombrero oscilando
    const tipX = frame % 2 === 0 ? 0 : 1;
    blit(ctx, 11 + dx + tipX, 1 + bob, [
      '...OO...',
      '..OCcO..',
      '.OCccO..'
    ], pal);

    // Sombrero, rostro, barba blanca y túnica
    blit(ctx, 4 + dx, 4 + bob, [
      '.......OOcccO...........',
      '......OCccccdO..........',
      '.....OCccGgcdDO.........',
      '..OOOOddddddddOOOO......',
      '.OdddccccccccdddddO.....',
      '..OOOOOKKKKKKOOOOO......',
      '......OKOkKOkkO.........',
      '......OKkkkkkkO.........',
      '.....OFfffffffFO........',
      '....OOdFFfffFFdOO.......',
      '...OCcdOFFfFFOddcO......',
      '..OCccddOFfFOddccDO.....',
      '..OcccddOgggOddccDO.....',
      '..OcdOcdOgGgdOdcOdO.....',
      '...OO.OcdgGgdcO..O......',
      '......OcdgggdcO.........',
      '.....OCcdgGgdcDO........',
      '.....OCcdgggdcDO........',
      '.....OcddgGgddDO........',
      '....OCcddgggddcDO.......',
      '....OddddgggddddO.......',
      '.....OOmmOOOmmOO........'
    ], pal);

    // Dobladillo de la túnica ondeando sutilmente
    if (frame === 1 || frame === 2) {
      px(ctx, 7 + dx, 24 + bob, pal.d);
      px(ctx, 20 + dx, 24 + bob, pal.D);
    }

    // Bastón mágico con orbe pulsante
    const stX = 23 + dx;
    const orbPulse = frame % 2;
    blit(ctx, stX, 4 + bob, [
      '..OOO..',
      '.OQqQO.',
      'OQqqquO',
      'OquuuqO',
      '.OghgO.',
      '..OHO..',
      '..OWO..',
      '..OwO..',
      '..OwO..',
      '..OmO..',
      '..OWO..',
      '..OwO..',
      '..OwO..',
      '..OmO..',
      '..OWO..',
      '..OwO..',
      '..OmO..',
      '..OmO..',
      '..OOO..'
    ], pal);

    // Destellos orbitales alrededor del orbe mágico
    const sparkles = [
      [stX, 3 + bob],
      [stX + 6, 4 + bob],
      [stX + 5, 8 + bob],
      [stX + 1, 2 + bob]
    ];
    const sp = sparkles[frame % 4];
    px(ctx, sp[0], sp[1], pal.Q);
    if (orbPulse === 1) {
      px(ctx, stX + 3, 6 + bob, pal.F);
    }

    if (pose === 'attack') {
      blit(ctx, 26, 5, [
        '.Q..',
        'QFq.',
        '.qQ.',
        'Q.qF'
      ], pal);
    }
  }

  function drawLadron(ctx, pal, frame, pose) {
    const bob = (frame === 1 || frame === 3) ? 1 : 0;
    const dx = pose === 'attack' ? 2 : (pose === 'hit' ? -2 : 0);
    drawShadow(ctx, 16, 29, 8);

    // Capa trasera ondeando
    const capeSway = frame === 1 || frame === 2 ? 1 : 0;
    rect(ctx, 6 + dx - capeSway, 14 + bob, 3, 10, pal.D);
    rect(ctx, 23 + dx + capeSway, 14 + bob, 3, 9, pal.D);

    // Capucha, antifaz con ojos blancos, túnica y cinturón
    blit(ctx, 6 + dx, 4 + bob, [
      '......OOOOOO........',
      '....OOCCccccOO......',
      '...OCCccccccddO.....',
      '..OCccOOOOOOcddO....',
      '..OcOOkkkkkkOOdO....',
      '..OcOOBBBBBBOOdO....',
      '..OcOOBFOOFBOOdO....',
      '..OcOOBBBBBBOOdO....',
      '...OcdOkkkkOdcO.....',
      '..OOddOOOOOOddOO....',
      '.ODddCCCCCCCCddDO...',
      '.ODdCccccccccddDO...',
      '..OOdccccccccdOO....',
      '...OOmWWggWWmOO.....',
      '...OOmmGggGmmOO.....',
      '...OddccccccddO.....',
      '...OddccOOccddO.....',
      '....OdcO..OcdO......',
      '....OdcO..OcdO......',
      '....OmmO..OmmO......',
      '....OmmO..OmmO......',
      '....OOOO..OOOO......'
    ], pal);

    // Dagas gemelas con vaivén ágil
    const d1Y = frame % 2 === 0 ? 13 : 12;
    const d2Y = frame % 2 === 0 ? 12 : 13;
    blit(ctx, 2 + dx, d1Y + bob, [
      '.O..',
      'OSO.',
      'OSsO',
      '.OSt',
      '.OgO',
      '.OmO',
      '.OO.'
    ], pal);
    blit(ctx, 26 + dx, d2Y + bob, [
      '..O.',
      '.OSO',
      'OsSO',
      'tSO.',
      '.OgO',
      '.OmO',
      '.OO.'
    ], pal);

    // Brillo alterno en las dagas
    if (frame % 2 === 0) px(ctx, 3 + dx, d1Y + 1 + bob, pal.F);
    else px(ctx, 28 + dx, d2Y + 1 + bob, pal.F);

    if (pose === 'attack') {
      px(ctx, 29, 10, pal.F);
      px(ctx, 28, 11, pal.S);
      px(ctx, 29, 13, pal.F);
      px(ctx, 28, 14, pal.S);
    }
  }

  function drawArquero(ctx, pal, frame, pose) {
    const bob = (frame === 1 || frame === 3) ? 1 : 0;
    const dx = pose === 'attack' ? 2 : (pose === 'hit' ? -2 : 0);
    drawShadow(ctx, 15, 29, 8);

    // Pluma roja del gorro oscilando
    const fShift = frame % 2 === 0 ? 0 : 1;
    blit(ctx, 16 + dx + fShift, 1 + bob, [
      '...OO',
      '..ORO',
      '.ORrO',
      'ORrO.'
    ], pal);

    // Carcaj con flechas a la espalda (izquierda)
    blit(ctx, 4 + dx, 10 + bob, [
      'OFO..',
      'OFfO.',
      '.OWO.',
      '.OwO.',
      '..OwO'
    ], pal);

    // Gorro de explorador, rostro, túnica con correa y botas
    blit(ctx, 6 + dx, 4 + bob, [
      '.....OOOOOOO........',
      '...OOdccccccOO......',
      '..OddCCCCCCCCdO.....',
      '..OdddddddddddO.....',
      '...OOKKKKKKKOO......',
      '...OKkOkKkOkKO......',
      '...OKkkkkkkkkO......',
      '....OKkjjjjkO.......',
      '...OOccccccccOO.....',
      '..OCcWWcccccccDO....',
      '..OccmWWccccccDO....',
      '..OcdcmWWccccdDO....',
      '...OOccmWWccdOO.....',
      '....OmmGggGmmO......',
      '....OcdccccddO......',
      '....OcdccccddO......',
      '....OdcO..OcdO......',
      '....OmmO..OmmO......',
      '....OWwO..OWwO......',
      '....OmmO..OmmO......',
      '....OOOO..OOOO......'
    ], pal);

    // Arco largo recurvado + flecha con tensión animada
    const drawBack = (frame === 2 || pose === 'attack') ? -1 : 0;
    blit(ctx, 22 + dx, 6 + bob, [
      '.OO...',
      'OWwO..',
      '.OwWO.',
      '..OWwO',
      '...OwO',
      '...OWO',
      '...OWO',
      '...OWO',
      '...OWO',
      '...OwO',
      '..OWwO',
      '.OwWO.',
      'OWwO..',
      '.OO...'
    ], pal);
    // Cuerda del arco
    rect(ctx, 23 + dx + drawBack, 8 + bob, 1, 10, pal.f);
    // Flecha con punta dorada
    rect(ctx, 20 + dx + drawBack, 13 + bob, 9, 1, pal.W);
    px(ctx, 20 + dx + drawBack, 12 + bob, pal.F);
    px(ctx, 20 + dx + drawBack, 14 + bob, pal.F);
    px(ctx, 29 + dx + drawBack, 13 + bob, pal.G);
    px(ctx, 28 + dx + drawBack, 12 + bob, pal.g);
    px(ctx, 28 + dx + drawBack, 14 + bob, pal.g);

    if (pose === 'attack') {
      rect(ctx, 27, 13, 5, 1, pal.G);
      px(ctx, 31, 12, pal.F);
      px(ctx, 31, 14, pal.F);
    }
  }

  function drawClerigo(ctx, pal, frame, pose) {
    const bob = (frame === 1 || frame === 3) ? 1 : 0;
    const dx = pose === 'attack' ? 2 : (pose === 'hit' ? -2 : 0);
    drawShadow(ctx, 15, 29, 8);

    // Halo sagrado flotante
    const haloY = (frame === 0 || frame === 3) ? 1 : 2;
    const haloCol = frame % 2 === 0 ? pal.G : pal.g;
    rect(ctx, 11 + dx, haloY, 8, 1, haloCol);
    px(ctx, 10 + dx, haloY + 1, pal.g);
    px(ctx, 19 + dx, haloY + 1, pal.g);
    rect(ctx, 11 + dx, haloY + 2, 8, 1, pal.h);
    if (frame % 2 === 0) px(ctx, 14 + dx, haloY, pal.F);

    // Túnica blanca sagrada con cruz del color del equipo
    blit(ctx, 5 + dx, 5 + bob, [
      '......OOOOOO........',
      '....OOdccccdOO......',
      '...OdccCCCCccdO.....',
      '...OdOKKKKKKOdO.....',
      '...OdOkOkKkOkdO.....',
      '...OdOkkkkkkOdO.....',
      '....OOOkjjkOOO......',
      '...OOFFccccFFOO.....',
      '..OFFfFCccCFfFFO....',
      '..OFffFCccCFffFO....',
      '..OFfCCCCCCCCfFO....',
      '..OFfccccccccfFO....',
      '..OvfFFccccFFfvO....',
      '...OOFFccccFFOO.....',
      '....OFFccccFFO......',
      '....OFfccccfFO......',
      '....OFfgGggfFO......',
      '....OFfccccfFO......',
      '...OFFfccccfFFO.....',
      '...OvvfddddfvvO.....',
      '....OOmmOOmmOO......'
    ], pal);

    // Maza solar dorada
    const mX = 23 + dx;
    const mY = (frame === 2 ? 7 : 8) + bob;
    blit(ctx, mX, mY, [
      '..OgO..',
      '.OgGgO.',
      'OgGFGgO',
      '.OgGgO.',
      '..OhO..',
      '..OWO..',
      '..OwO..',
      '..OwO..',
      '..OmO..',
      '..OWO..',
      '..OwO..',
      '..OmO..',
      '..OO...'
    ], pal);

    // Rayos de luz pulsantes alrededor de la maza
    if (frame % 2 === 0 || pose === 'attack') {
      px(ctx, mX + 3, mY - 1, pal.G);
      px(ctx, mX + 7, mY + 2, pal.G);
      px(ctx, mX - 1, mY + 2, pal.G);
    }
  }

  function drawPaladin(ctx, pal, frame, pose) {
    const bob = (frame === 1 || frame === 3) ? 1 : 0;
    const dx = pose === 'attack' ? 2 : (pose === 'hit' ? -2 : 0);
    drawShadow(ctx, 16, 29, 9);

    // Capa heroica del color del equipo ondeando
    const cSway = frame % 2 === 0 ? 0 : 1;
    rect(ctx, 5 + dx - cSway, 13 + bob, 4, 13, pal.d);
    rect(ctx, 6 + dx - cSway, 14 + bob, 2, 11, pal.c);

    // Yelmo dorado alado + armadura de oro + cruz del equipo + escudo real
    const wingY = frame === 1 || frame === 2 ? -1 : 0;
    blit(ctx, 6 + dx, 4 + bob + wingY, [
      'OO..........OO',
      'OFO........OFO',
      'OFfO......OfFO',
      '.OvvO....OvvO.'
    ], pal);

    blit(ctx, 3 + dx, 4 + bob, [
      '........OOOOOO..........',
      '.......OGGGGggO.........',
      '......OGggggghHO........',
      '......OGhOOOOgHO........',
      '......OGhOQQOhHO........',
      '......OGhOOOOgHO........',
      '.......OghhhhHO.........',
      '....OOOOOGGGGOOOOO......',
      '...OGggOGGccGGOGgGO.....',
      '..OGghOGggccggOGghO.....',
      '..OGhOGccccccccOGhO.....',
      '.OOOOOOGggccggGOOO......',
      '.OgGGGOOGgccggGO........',
      '.OgccGOOGgccggGO........',
      '.OgcCGOOGGhhGGGO........',
      '.OgccGOOggOOggOO........',
      '.OgddGOOghOOghOO........',
      '..OggOO.OhOOhO..........',
      '...OO...OhOOhO..........',
      '.......OggOOggO.........',
      '.......OhhOOhhO.........',
      '.......OOOOOOOO.........'
    ], pal);

    // Espada sagrada dorada/acero
    const swX = pose === 'attack' ? 25 : 24 + dx;
    const swY = pose === 'attack' ? 2 : 4 + bob;
    blit(ctx, swX, swY, [
      '..O..',
      '.OSO.',
      '.OSFO',
      '.OSsO',
      '.OSsO',
      '.OSsO',
      '.OStO',
      '.OStO',
      '.OStO',
      'OGgGO',
      'OhghO',
      '.OmO.',
      '.OmO.',
      '.OgO.'
    ], pal);

    const gY = swY + 1 + ((frame * 2) % 7);
    px(ctx, swX + 2, gY, pal.G);

    if (pose === 'attack') {
      blit(ctx, 26, 4, [
        '.G..',
        '..GF',
        '.GGF',
        '..GF',
        '.G..'
      ], pal);
    }
  }

  // =========================================================================
  //  SPRITES DE ENEMIGOS (32x32) — 6 MONSTRUOS DE MAZMORRA ANIMADOS
  // =========================================================================

  function drawGoblin(ctx, pal, frame, pose) {
    const bob = (frame === 1 || frame === 3) ? 1 : 0;
    const dx = pose === 'attack' ? -2 : (pose === 'hit' ? 2 : 0);
    drawShadow(ctx, 16, 29, 8);

    // Orejas puntiagudas (ligero movimiento en frame 2)
    const earY = frame === 2 ? -1 : 0;
    blit(ctx, 2 + dx, 9 + bob + earY, [
      'OO..............OO',
      'OEeOO........OOeEO',
      '.OeeEO......OEeeO.',
      '..OzzO......OzzO..'
    ], pal);

    // Cabeza verde, ojos furiosos, colmillos y chaleco de cuero
    blit(ctx, 7 + dx, 6 + bob, [
      '....OOOOOOOO....',
      '..OOEEeeeezzOO..',
      '.OEeeeeeeeezzzO.',
      '.OeOOXeeeeXOOzO.',
      '.OeOXrOeeOrXOzO.',
      '.OeeOOeeeeOOzzO.',
      '.OeeeOFFFFOzzzO.',
      '..OeeOFOOFOzzO..',
      '...OOeOOOOzOO...',
      '..OOWWwwwwWWOO..',
      '.OWwmmWggWmmwWO.',
      '.OwmWWwGGwWWmwO.',
      '..OOmmwwwwmmOO..',
      '...OmmgWWgmmO...',
      '...OzzmWWmzzO...',
      '...OzzO..OzzO...',
      '...OmmO..OmmO...',
      '...OOOO..OOOO...'
    ], pal);

    // Daga dentada que sube y baja
    const dagY = (frame % 2 === 0 ? 11 : 9) + bob;
    blit(ctx, 24 + dx, dagY, [
      '..O..',
      '.OSO.',
      'OSsO.',
      '.OSsO',
      'OStO.',
      '.OpO.',
      '.OmO.',
      '.OO..'
    ], pal);

    // Brillo ojos rojos
    if (frame % 2 === 1) {
      px(ctx, 12 + dx, 10 + bob, pal.R);
      px(ctx, 17 + dx, 10 + bob, pal.R);
    }
  }

  function drawEsqueleto(ctx, pal, frame, pose) {
    const bob = (frame === 1 || frame === 3) ? 1 : 0;
    const dx = pose === 'attack' ? -2 : (pose === 'hit' ? 2 : 0);
    drawShadow(ctx, 16, 29, 8);

    // Cráneo con cuencas oscuras y fuego cian + capa raída + costillas
    blit(ctx, 6 + dx, 4 + bob, [
      '.....OOOOOO.........',
      '...OOFFffffOO.......',
      '..OFFffffffvvO......',
      '..OFfOOOfOOOfO......',
      '..OFfOQqOQqOfO......',
      '..OFfOOOfOOOfO......',
      '...OfvvOOfvvO.......',
      '....OFOfOFOO........',
      '....OFOFOFOO........',
      '...OOxOOOOxOO.......',
      '..OxxOFFFFOxxO......',
      '.OxpxOFvvFOxpxO.....',
      '.OxpxOFFFFOxpxO.....',
      '.OxpOOFvvFOOpxO.....',
      '..OO.OFFFFO.OO......',
      '.....OOFFOO.........',
      '....OFvOOvFO........',
      '....OvO..OvO........',
      '....OFv..vFO........',
      '....OvO..OvO........',
      '...OFFO..OFFO.......',
      '...OOOO..OOOO.......'
    ], pal);

    // Fuego cian pulsante en los ojos
    const eyeCol = frame % 2 === 0 ? pal.Q : pal.q;
    px(ctx, 12 + dx, 8 + bob, eyeCol);
    px(ctx, 15 + dx, 8 + bob, eyeCol);

    // Espada oxidada a la derecha (se mueve al respirar/atacar)
    const swY = (pose === 'attack' ? 3 : (frame === 2 ? 6 : 7)) + bob;
    blit(ctx, 24 + dx, swY, [
      '.O..',
      'OsO.',
      'OstO',
      'OtTO',
      'OsTO',
      'OstO',
      'OtTO',
      'OmmO',
      '.OmO',
      '.OO.'
    ], pal);

    // Escudo roto a la izquierda
    blit(ctx, 2 + dx, 14 + bob, [
      '.OOO.',
      'OWwWO',
      'OwTOw',
      'OWwWO',
      '.OOO.'
    ], pal);
  }

  function drawOrco(ctx, pal, frame, pose) {
    const bob = (frame === 1 || frame === 3) ? 1 : 0;
    const dx = pose === 'attack' ? -2 : (pose === 'hit' ? 2 : 0);
    drawShadow(ctx, 15, 29, 10);

    // Gran cuerpo musculoso de orco, hombrera metálica, colmillos inferiores
    blit(ctx, 3 + dx, 4 + bob, [
      '......OOOOOOOO..........',
      '.....OeezzzzzzO.........',
      '....OezzOOOOzzZO........',
      '....OzOOrzzrOOzO........',
      '....OzzzzzzzzzzO........',
      '....OzOFzzzzFOzO........',
      '....OzOFOOOFOzZO........',
      '...OOOOOzzzzOOOOO.......',
      '..OSssOzzzzzzOeeZO......',
      '.OSttOOmwwwwmOOezZO.....',
      '.OStOOmWWmmWWmOOzZO.....',
      '..OOOOmwWggWwmOOzZO.....',
      '...OzzmwwGGwwmOzzO......',
      '...OzzmwwwwwwmOzzO......',
      '...OzzOmmOOmmOzzO.......',
      '....OO.OzOOzO.OO........',
      '......OzzOOzzO..........',
      '......OmmOOmmO..........',
      '.....OmmmOOmmmO.........',
      '.....OOOOOOOOOO.........'
    ], pal);

    // Gran hacha de batalla doble (se levanta ligeramente en frame 2 / attack)
    const axeY = (pose === 'attack' ? 1 : (frame === 2 ? 2 : 4)) + bob;
    blit(ctx, 22 + dx, axeY, [
      '....OO...',
      '..OOSsOO.',
      '.OSssstTO',
      'OSttOWstO',
      'OSttOwstO',
      '.OStOWtTO',
      '..OOOwOO.',
      '....OWO..',
      '....OwO..',
      '....OwO..',
      '....OmO..',
      '....OWO..',
      '....OwO..',
      '....OmO..',
      '....OmO..',
      '....OO...'
    ], pal);

    // Destello del hacha y ojos ardientes
    if (frame % 2 === 0) {
      px(ctx, 27 + dx, axeY + 2, pal.F);
      px(ctx, 11 + dx, 7 + bob, pal.R);
      px(ctx, 14 + dx, 7 + bob, pal.R);
    }
  }

  function drawArana(ctx, pal, frame, pose) {
    const bob = (frame === 1 || frame === 3) ? 1 : 0;
    const dx = pose === 'attack' ? -2 : (pose === 'hit' ? 2 : 0);
    drawShadow(ctx, 16, 28, 11);

    // Patas animadas (alternan posición para efecto "skittering")
    const legAlt = frame % 2;
    const legColor = pal.O;
    const legHi = pal.p;
    const drawLeg = (pts) => {
      for (let i = 0; i < pts.length; i++) {
        px(ctx, pts[i][0] + dx, pts[i][1] + bob, legColor);
        if (i % 2 === 0) px(ctx, pts[i][0] + dx, pts[i][1] - 1 + bob, legHi);
      }
    };

    // Izquierda (3 patas)
    const ly1 = legAlt ? 11 : 13;
    const ly2 = legAlt ? 18 : 16;
    const ly3 = legAlt ? 23 : 25;
    drawLeg([[9,14],[7,12],[5,ly1],[3,ly1+3],[2,ly1+6]]);
    drawLeg([[9,17],[6,16],[4,ly2],[2,ly2+3],[2,ly2+6]]);
    drawLeg([[10,20],[7,21],[5,ly3],[4,ly3+3]]);

    // Derecha (3 patas, desfasadas)
    const ry1 = legAlt ? 13 : 11;
    const ry2 = legAlt ? 16 : 18;
    const ry3 = legAlt ? 25 : 23;
    drawLeg([[22,14],[24,12],[26,ry1],[28,ry1+3],[29,ry1+6]]);
    drawLeg([[22,17],[25,16],[27,ry2],[29,ry2+3],[29,ry2+6]]);
    drawLeg([[21,20],[24,21],[26,ry3],[27,ry3+3]]);

    // Abdomen con marca carmesí + cefalotórax + múltiples ojos + quelíceros
    blit(ctx, 8 + dx, 6 + bob, [
      '....OOOOOOOO....',
      '..OOPPpppppxOO..',
      '.OPpppRRpppppxO.',
      '.OpppRrrRppppxO.',
      '.OppppRRpppppxO.',
      '.OppxpppppppxxO.',
      '..OxxpppppppxO..',
      '...OOppPPppOO...',
      '..OOppPPPPppOO..',
      '.OpppRRppRRpppO.',
      '.OppRXpNNpXRppO.',
      '.OpppppxxpppppO.',
      '..OpxOFOOFOxpO..',
      '...OOOF..FOOO...',
      '.....O....O.....'
    ], pal);

    // Parpadeo de ojos múltiples
    if (frame % 2 === 0) {
      px(ctx, 13 + dx, 15 + bob, pal.F);
      px(ctx, 18 + dx, 15 + bob, pal.F);
    }
  }

  function drawMomia(ctx, pal, frame, pose) {
    const bob = (frame === 1 || frame === 3) ? 1 : 0;
    const dx = pose === 'attack' ? -2 : (pose === 'hit' ? 2 : 0);
    drawShadow(ctx, 16, 29, 8);

    // Cuerpo vendado + cabeza + ranura ojos verdes + amuleto dorado
    blit(ctx, 5 + dx, 4 + bob, [
      '......OOOOOO..........',
      '....OOLLlllYOO........',
      '...OLlllyyyllLO.......',
      '...OllOOOOOOllO.......',
      '...OlOOBBBBOOlO.......',
      '...OlOBEOBEBOlO.......',
      '...OlOOBBBBOOlO.......',
      '...OlyylllllyyO.......',
      '....OOlllyylOO........',
      '.OOOOOllggllOOOOO.....',
      'OLlylllyGGylllyLLO....',
      'OlllyOllggllOylllO....',
      '.OOOOOlylllyOOOOO.....',
      '....OlllyylllO........',
      '....OyylllyyyO........',
      '....OlllyylllO........',
      '....OlllyylllO........',
      '....OllO..OllO........',
      '....OyyO..OyyO........',
      '....OllO..OllO........',
      '....OyyO..OyyO........',
      '....OOOO..OOOO........'
    ], pal);

    // Ojos verdes fantasmales pulsantes
    const eyeC = frame % 2 === 0 ? pal.E : pal.e;
    px(ctx, 12 + dx, 9 + bob, eyeC);
    px(ctx, 15 + dx, 9 + bob, eyeC);

    // Vendas sueltas ondeando desde los brazos
    const wv = frame % 2;
    px(ctx, 6 + dx, 17 + bob, pal.L);
    px(ctx, 5 + dx + wv, 18 + bob, pal.l);
    px(ctx, 6 + dx - wv, 19 + bob, pal.y);

    px(ctx, 21 + dx, 17 + bob, pal.L);
    px(ctx, 22 + dx - wv, 18 + bob, pal.l);
    px(ctx, 21 + dx + wv, 19 + bob, pal.y);
  }

  function drawGargola(ctx, pal, frame, pose) {
    const hover = (frame === 1 || frame === 2) ? -1 : 0;
    const dx = pose === 'attack' ? -2 : (pose === 'hit' ? 2 : 0);
    drawShadow(ctx, 16, 29, 10);

    // Alas de piedra que baten activamente (3 posiciones)
    if (frame === 0 || frame === 2) {
      // Alas abiertas extendidas
      blit(ctx, 1 + dx, 6 + hover, [
        'OO........................OO',
        'OAiO....................OiAO',
        'OAaiOO................OOiaAO',
        '.OaiIIOO............OOIIiaO.',
        '.OaiIIIiO..........OiIIIiaO.',
        '..OaiiIIO..........OIIiiaO..',
        '...OOiiIO..........OiiIOO...',
        '.....OOOO..........OOOO.....'
      ], pal);
    } else if (frame === 1) {
      // Alas elevadas arriba
      blit(ctx, 2 + dx, 3 + hover, [
        'OO......................OO',
        'OAiO..................OiAO',
        'OAaiO................OiaAO',
        'OaiIIO..............OIIiaO',
        '.OaiIIO............OIIiaO.',
        '..OaiiIO..........OIiiaO..',
        '...OiiiO..........OiiiO...',
        '....OOOO..........OOOO....'
      ], pal);
    } else {
      // Alas replegadas hacia abajo
      blit(ctx, 2 + dx, 9 + hover, [
        '..OO..................OO..',
        '.OAaiOO............OOiaAO.',
        'OAaiIIIO..........OIIIiaAO',
        'OaiIIIIO..........OIIIIiaO',
        '.OiiIIO............OIIiiO.',
        '..OOOO..............OOOO..'
      ], pal);
    }

    // Corona de jefe + cuernos + cuerpo de piedra + ojos ardientes
    blit(ctx, 8 + dx, 2 + hover, [
      '....OgOgOgO.....',
      '...O.gGgGg.O....',
      '..OIIgggggIIO...',
      '.OIiiOAAAOOiiO..',
      '..OOAAaaaAAOO...',
      '...OAaaaaaAO....',
      '...OaNRaRNaO....',
      '...OaaaiiaaO....',
      '...OaOFOFOaO....',
      '..OOaaOOOaaOO...',
      '.OAaaaAAAaaaAO..',
      '.OaaAAiiiAAaaO..',
      '.OaAAiiIiiAAaO..',
      '..OOaaiIiaaOO...',
      '...OaaaiiaaO....',
      '...OaaO..OaaO...',
      '...OiiO..OiiO...',
      '..OaaIO..OIaaO..',
      '..OOOOO..OOOOO..'
    ], pal);

    // Brillo de corona y ojos de fuego
    if (frame % 2 === 0) {
      px(ctx, 15 + dx, 3 + hover, pal.F);
      px(ctx, 13 + dx, 8 + hover, pal.X);
      px(ctx, 17 + dx, 8 + hover, pal.X);
    }
  }

  // =========================================================================
  //  PROPS DE MAZMORRA (COFRES, PUERTAS, ANTORCHAS, ESCALERAS, LÁPIDA)
  // =========================================================================

  function drawChest(ctx, pal, frame, isGrand) {
    drawShadow(ctx, 16, 27, 11);

    if (isGrand) {
      // Gran Cofre Real con corona, oro brillante y gemas rubí/zafiro
      blit(ctx, 4, 5, [
        '.......OgOgOgO..........',
        '......OgGGRGGgO.........',
        '.......OOOOOOO..........',
        '....OOOOOOOOOOOOOO......',
        '..OOgGGGGGGGGGGGGgOO....',
        '.OgGggGGgRRgGGggGGgO....',
        '.OgghhGggRRggGhhggHO....',
        'OghhGGGGGggGGGGGGhhgO...',
        'OGGGGGGGgOOgGGGGGGGGO...',
        'OhhhhhhGgGGgGhhhhhhhO...',
        'OghWggWggOOggWggWghgO...',
        'OgqWggWggGGggWggWqggO...',
        'OghWggWggggggWggWghgO...',
        'OgGggggggggggggggGGgO...',
        'OhhhhhhhhhhhhhhhhhhhO...',
        '.OOOOOOOOOOOOOOOOOOO....'
      ], pal);
      // Destellos reales animados
      const stars = [[6, 6], [24, 7], [15, 3], [26, 15]];
      const s1 = stars[frame % 4];
      const s2 = stars[(frame + 2) % 4];
      px(ctx, s1[0], s1[1], pal.F);
      px(ctx, s1[0] - 1, s1[1], pal.G);
      px(ctx, s1[0] + 1, s1[1], pal.G);
      px(ctx, s1[0], s1[1] - 1, pal.G);
      px(ctx, s1[0], s1[1] + 1, pal.G);
      px(ctx, s2[0], s2[1], pal.Q);
    } else {
      // Cofre del tesoro clásico (madera robusta + bandas doradas + cerradura)
      blit(ctx, 5, 9, [
        '...OOOOOOOOOOOOOOOO...',
        '.OOgWwwwwwwwwwwwwWgOO.',
        'OgWWwwwwwwwwwwwwwwWWgO',
        'OgWmmmmmmmmmmmmmmmmWgO',
        'OgggggggggOOgggggggggO',
        'OhhhhhhhhOGGOhhhhhhhhO',
        'OgWwwwwwwOGGOwwwwwwWgO',
        'OgWmmmmmmOggOmmmmmmWgO',
        'OgWwwwwwwwwwwwwwwwwWgO',
        'OgWwwwwwwwwwwwwwwwwWgO',
        'OgWmmmmmmmmmmmmmmmmWgO',
        'OhhhhhhhhhhhhhhhhhhhhO',
        '.OOOOOOOOOOOOOOOOOOOO.'
      ], pal);
      // Brillo dorado animado
      const gx = 8 + ((frame * 4) % 14);
      px(ctx, gx, 11, pal.G);
      px(ctx, gx + 1, 10, pal.F);
      if (frame % 2 === 0) px(ctx, 15, 14, pal.F);
    }
  }

  function drawChestOpen(ctx, pal) {
    drawShadow(ctx, 16, 27, 10);
    blit(ctx, 5, 8, [
      '...OOOOOOOOOOOOOOOO...',
      '..OgWwwwwwwwwwwwwWgO..',
      '.OgWmmmmmmmmmmmmmmWgO.',
      '.OggggggggggggggggggO.',
      '.OOBBBBBBBBBBBBBBBBOO.',
      'OgOBBBBBBBBBBBBBBBBOgO',
      'OgOBBBBgGBBBBBgGBBOgO.',
      'OgWmmmmmmmmmmmmmmmmWgO',
      'OgWwwwwwwOggOwwwwwwWgO',
      'OgWwwwwwwwwwwwwwwwwWgO',
      'OgWmmmmmmmmmmmmmmmmWgO',
      'OhhhhhhhhhhhhhhhhhhhhO',
      '.OOOOOOOOOOOOOOOOOOOO.'
    ], pal);
  }

  function drawDoor(ctx, pal, frame, isOpen) {
    if (isOpen) {
      // Arco de piedra abierto
      blit(ctx, 3, 2, [
        '....OOOOOOOOOOOOOOOOOO....',
        '..OOAAaaaaaaaaaaaaaaAAOO..',
        '.OAaaOOIIIIIIIIIIIIOOaaAO.',
        'OAaaOII............IIOaaAO',
        'OAaOI................IOaAO',
        'OAaO..................OaAO',
        'OAaO..................OaAO',
        'OAaO..................OaAO',
        'OAaO..................OaAO',
        'OAaO..................OaAO',
        'OAaO..................OaAO',
        'OAaO..................OaAO',
        'OAaO..................OaAO',
        'OAaO..................OaAO',
        'OAaO..................OaAO',
        'OAaO..................OaAO',
        'OAaO..................OaAO',
        'OAaO..................OaAO',
        'OAaO..................OaAO',
        'OAaO..................OaAO',
        'OAaO..................OaAO',
        'OAaO..................OaAO',
        'OAaO..................OaAO',
        'OAaO..................OaAO',
        'OAaO..................OaAO',
        'OAaO..................OaAO',
        'OiiO..................OiiO',
        'OOOO..................OOOO'
      ], pal);
      return;
    }

    // Puerta pesada de roble con herrajes, tachuelas y cerradura brillante
    blit(ctx, 3, 2, [
      '....OOOOOOOOOOOOOOOOOO....',
      '..OOAAaaaaaaaaaaaaaaAAOO..',
      '.OAaaOOmmmmmmmmmmmmOOaaAO.',
      'OAaaOmWwwmWwwmWwwmWwmOaaAO',
      'OAaOmWwwmWwwmWwwmWwwmOaAO.',
      'OAaOTTsTTTTTTTTTTTsTTOaAO.',
      'OAaOmWwwmWwwmWwwmWwwmOaAO.',
      'OAaOmWwwmWwwmWwwmWwwmOaAO.',
      'OAaOmWwwmWwwmWwwmWwwmOaAO.',
      'OAaOmWwwmWwwmWwwmWwwmOaAO.',
      'OAaOmWwwmWwwmWwwmWwwmOaAO.',
      'OAaOTTsTTTTTTTTTTTsTTOaAO.',
      'OAaOmWwwmWwwmWwwmWwwmOaAO.',
      'OAaOmWwwmWwwmWwwgGWwmOaAO.',
      'OAaOmWwwmWwwmWwgOGgWmOaAO.',
      'OAaOmWwwmWwwmWwwgGWwmOaAO.',
      'OAaOmWwwmWwwmWwwmWwwmOaAO.',
      'OAaOmWwwmWwwmWwwmWwwmOaAO.',
      'OAaOmWwwmWwwmWwwmWwwmOaAO.',
      'OAaOmWwwmWwwmWwwmWwwmOaAO.',
      'OAaOTTsTTTTTTTTTTTsTTOaAO.',
      'OAaOmWwwmWwwmWwwmWwwmOaAO.',
      'OAaOmWwwmWwwmWwwmWwwmOaAO.',
      'OAaOmWwwmWwwmWwwmWwwmOaAO.',
      'OAaOmWwwmWwwmWwwmWwwmOaAO.',
      'OAaOmmmmmmmmmmmmmmmmmOaAO.',
      'OiiOOOOOOOOOOOOOOOOOOOOiiO',
      'OOOOOOOOOOOOOOOOOOOOOOOOOO'
    ], pal);

    // Destello dorado pulsante en la cerradura
    const keyCol = frame % 2 === 0 ? pal.F : pal.G;
    px(ctx, 20, 16, keyCol);
  }

  function drawTorch(ctx, pal, frame) {
    // Halo cálido sutil de antorcha
    const glowR = frame % 2 === 0 ? 11 : 10;
    ctx.fillStyle = frame % 2 === 0 ? 'rgba(255, 160, 40, 0.22)' : 'rgba(255, 130, 30, 0.16)';
    ctx.fillRect(16 - glowR, 4, glowR * 2, glowR * 2 - 2);
    ctx.fillStyle = 'rgba(255, 220, 90, 0.18)';
    ctx.fillRect(10, 6, 12, 11);

    // Llama parpadeante de 4 frames
    const flames = [
      [
        '...r....',
        '..rNr...',
        '.rNXNr..',
        '.NXFXN..',
        '.NXXFN..',
        '..rXXr..',
        '...NN...'
      ],
      [
        '....r...',
        '..rNr...',
        '.rNXNr..',
        'rNXXXNr.',
        '.NXFXN..',
        '..NXXN..',
        '...rr...'
      ],
      [
        '..r.....',
        '...Nr...',
        '.rNXNr..',
        '.NXXXN..',
        '.NFXFN..',
        '..rXXr..',
        '...NN...'
      ],
      [
        '...r.r..',
        '..rNr...',
        '.rNXNr..',
        '.NXFXNr.',
        '.NXXXN..',
        '..NXXr..',
        '...NN...'
      ]
    ];
    blit(ctx, 12, 5, flames[frame % 4], pal);

    // Chispas ascendentes
    if (frame === 0) px(ctx, 14, 3, pal.X);
    if (frame === 1) px(ctx, 18, 2, pal.N);
    if (frame === 2) px(ctx, 15, 2, pal.G);
    if (frame === 3) px(ctx, 13, 3, pal.r);

    // Soporte de hierro + mango de madera
    blit(ctx, 12, 12, [
      '.OOOOOO.',
      'OTssTTTO',
      '.OOTTOO.',
      '..OWwO..',
      '..OwmO..',
      '..OwmO..',
      '.OTssTO.',
      '..OTTO..',
      '..OwmO..',
      '..OmmO..',
      '...OO...'
    ], pal);
  }

  function drawStairs(ctx, pal) {
    blit(ctx, 4, 4, [
      'OOOOOOOOOOOOOOOOOOOOOOOO',
      'OAAaaaaaaaaaaaaaaaaaaAAO',
      'OaaIIIIIIIIIIIIIIIIIIaaO',
      'OaaOOOOOOOOOOOOOOOOOOaaO',
      'OaaOAAAaaaaaaaaaaAAAOaaO',
      'OaaOiiiIIIIIIIIIIiiiOaaO',
      'OaaOAAAAAAAAAAAAAAAAOaaO',
      'OaaOiiiiIIIIIIIIiiiiOaaO',
      'OaaOaaaaaaaaaaaaaaaaOaaO',
      'OaaOIIIIIIIIIIIIIIIIOaaO',
      'OaaOiiiiiiiiiiiiiiiiOaaO',
      'OaaOIIIIIIIIIIIIIIIIOaaO',
      'OaaOBBBBBBBBBBBBBBBBOaaO',
      'OaaOBBBBBBBBBBBBBBBBOaaO',
      'OaaOiiiiiiiiiiiiiiiiOaaO',
      'OaaOaaaaaaaaaaaaaaaaOaaO',
      'OaaOIIIIIIIIIIIIIIIIOaaO',
      'OaaOAAAAAAAAAAAAAAAAOaaO',
      'OaaOiiiiIIIIIIIIiiiiOaaO',
      'OaaOAAAaaaaaaaaaaAAAOaaO',
      'OaaOOOOOOOOOOOOOOOOOOaaO',
      'OiiIIIIIIIIIIIIIIIIIIiiO',
      'OOOOOOOOOOOOOOOOOOOOOOOO'
    ], pal);
  }

  function drawTomb(ctx, pal) {
    drawShadow(ctx, 16, 27, 9);
    blit(ctx, 7, 6, [
      '....OOOOOOOOOO....',
      '..OOAAaaaaaaAAOO..',
      '.OAaaaaaaaaaaaaAO.',
      '.OaaAAiiiiiiAAaaO.',
      'OAaaaaiiiiiiaaaaAO',
      'OAaaaaaiiiiaaaaaAO',
      'OAaaaaiiiiiiaaaaAO',
      'OAaaaaaiiiiaaaaaAO',
      'OAaaaaaiiiiaaaaaAO',
      'OAaaaaaaaaaaaaaaAO',
      'OAaaAaaaaaaaaAaaAO',
      'OiaaaaaaaaaaaaaaiO',
      'OiiiiiiaaaaiiiiiiO',
      'OiiiiiiiiiiiiiiiiO',
      'OOOOOOOOOOOOOOOOOO'
    ], pal);
  }

  // =========================================================================
  //  MOTOR DE RENDERIZADO DE LIENZOS Y BUCLE DE ANIMACIÓN
  // =========================================================================

  function renderCanvas(canvas, frameOverride) {
    if (!canvas || !canvas.getContext) return;
    if (canvas.width !== SIZE) canvas.width = SIZE;
    if (canvas.height !== SIZE) canvas.height = SIZE;

    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, SIZE, SIZE);

    const kind = canvas.dataset.pxKind;
    const id = canvas.dataset.pxId || '';
    const phase = Number(canvas.dataset.pxPhase || 0);
    const pose = canvas.dataset.pxPose || 'idle';
    const frame = ((typeof frameOverride === 'number' ? frameOverride : globalFrame) + phase) % 4;

    if (kind === 'hero') {
      const pal = buildTeamPalette(canvas.dataset.pxColor, canvas.dataset.pxDark);
      switch (id) {
        case 'mago':     drawMago(ctx, pal, frame, pose); break;
        case 'ladron':   drawLadron(ctx, pal, frame, pose); break;
        case 'arquero':  drawArquero(ctx, pal, frame, pose); break;
        case 'clerigo':  drawClerigo(ctx, pal, frame, pose); break;
        case 'paladin':  drawPaladin(ctx, pal, frame, pose); break;
        case 'guerrero':
        default:         drawGuerrero(ctx, pal, frame, pose); break;
      }
    } else if (kind === 'enemy') {
      switch (id) {
        case 'goblin':    drawGoblin(ctx, BASE, frame, pose); break;
        case 'esqueleto': drawEsqueleto(ctx, BASE, frame, pose); break;
        case 'orco':      drawOrco(ctx, BASE, frame, pose); break;
        case 'arana':     drawArana(ctx, BASE, frame, pose); break;
        case 'momia':     drawMomia(ctx, BASE, frame, pose); break;
        case 'gargola':
        default:          drawGargola(ctx, BASE, frame, pose); break;
      }
    } else if (kind === 'prop') {
      switch (id) {
        case 'chest':       drawChest(ctx, BASE, frame, false); break;
        case 'grand_chest': drawChest(ctx, BASE, frame, true); break;
        case 'chest_open':  drawChestOpen(ctx, BASE); break;
        case 'door':        drawDoor(ctx, BASE, frame, false); break;
        case 'door_open':   drawDoor(ctx, BASE, frame, true); break;
        case 'torch':       drawTorch(ctx, BASE, frame); break;
        case 'stairs':      drawStairs(ctx, BASE); break;
        case 'tomb':        drawTomb(ctx, BASE); break;
        default:            break;
      }
    }

    // Destello de impacto para pose 'hit'
    if (pose === 'hit') {
      ctx.save();
      ctx.globalCompositeOperation = 'source-atop';
      ctx.fillStyle = frame % 2 === 0 ? 'rgba(255, 70, 70, 0.55)' : 'rgba(255, 255, 255, 0.55)';
      ctx.fillRect(0, 0, SIZE, SIZE);
      ctx.restore();
    }
  }

  function isElementVisible(el) {
    return !!(el && el.offsetParent !== null);
  }

  function paintAll() {
    const nodes = document.querySelectorAll('canvas.pixel-sprite');
    for (let i = 0; i < nodes.length; i++) {
      if (isElementVisible(nodes[i])) {
        renderCanvas(nodes[i]);
      }
    }
  }

  function loop(ts) {
    if (!lastTick) lastTick = ts;
    if (ts - lastTick >= FRAME_MS) {
      lastTick = ts;
      globalFrame = (globalFrame + 1) % 4;
      paintAll();
    }
    rafId = window.requestAnimationFrame(loop);
  }

  function startLoop() {
    if (rafId !== null || typeof window === 'undefined') return;
    rafId = window.requestAnimationFrame(loop);
  }

  // --- Texturas pixel-art 16-bit procedurales para losas y muros ---
  function makeTileDataUrl(drawFn) {
    if (typeof document === 'undefined') return '';
    const c = document.createElement('canvas');
    c.width = 32;
    c.height = 32;
    const ctx = c.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    drawFn(ctx);
    return `url("${c.toDataURL()}")`;
  }

  function installBoardTextures() {
    if (typeof document === 'undefined') return;
    const rootStyle = document.documentElement.style;

    // Losa de muro de piedra oscura con ladrillos biselados y musgo sutil
    const wallUrl = makeTileDataUrl(ctx => {
      rect(ctx, 0, 0, 32, 32, '#171324');
      const bricks = [
        [1, 1, 14, 9], [17, 1, 14, 9],
        [1, 12, 6, 8], [9, 12, 14, 8], [25, 12, 6, 8],
        [1, 22, 14, 9], [17, 22, 14, 9]
      ];
      bricks.forEach(([x, y, w, h]) => {
        rect(ctx, x, y, w, h, '#27213b');
        rect(ctx, x, y, w, 1, '#3b3357');
        rect(ctx, x, y, 1, h, '#342c4d');
        rect(ctx, x, y + h - 1, w, 1, '#1c172b');
        rect(ctx, x + w - 1, y, 1, h, '#1c172b');
      });
      // Detalles de piedra y grietas sutiles
      px(ctx, 5, 5, '#3b3357');
      px(ctx, 21, 6, '#1c172b');
      px(ctx, 14, 15, '#3b3357');
      px(ctx, 18, 25, '#2b4a33'); // brizna de musgo
      px(ctx, 19, 26, '#2b4a33');
    });

    // Losa de pasillo (piedra gris-violácea clásica de mazmorra)
    const corridorUrl = makeTileDataUrl(ctx => {
      rect(ctx, 0, 0, 32, 32, '#2d2740');
      const tiles = [[1, 1, 14, 14], [17, 1, 14, 14], [1, 17, 14, 14], [17, 17, 14, 14]];
      tiles.forEach(([x, y, w, h], idx) => {
        rect(ctx, x, y, w, h, idx % 2 === 0 ? '#403857' : '#3b3452');
        rect(ctx, x, y, w, 1, '#52486e');
        rect(ctx, x, y, 1, h, '#4c4366');
        rect(ctx, x, y + h - 1, w, 1, '#312b45');
      });
      px(ctx, 6, 6, '#564c73');
      px(ctx, 24, 9, '#312b45');
      px(ctx, 10, 23, '#312b45');
      px(ctx, 22, 24, '#52486e');
    });

    // Losa de habitación (piedra cálida pulida estilo HeroQuest)
    const roomUrl = makeTileDataUrl(ctx => {
      rect(ctx, 0, 0, 32, 32, '#362d4d');
      rect(ctx, 1, 1, 30, 30, '#50446b');
      rect(ctx, 1, 1, 30, 2, '#655785');
      rect(ctx, 1, 1, 2, 30, '#5d507a');
      rect(ctx, 1, 29, 30, 2, '#3e3454');
      rect(ctx, 29, 1, 2, 30, '#3e3454');
      // Líneas interiores de baldosa
      rect(ctx, 15, 2, 1, 28, '#44395c');
      rect(ctx, 2, 15, 28, 1, '#44395c');
      px(ctx, 7, 8, '#6a5c8a');
      px(ctx, 22, 21, '#6a5c8a');
      px(ctx, 20, 7, '#413757');
    });

    rootStyle.setProperty('--tex-wall', wallUrl);
    rootStyle.setProperty('--tex-corridor', corridorUrl);
    rootStyle.setProperty('--tex-room', roomUrl);
  }

  // --- Helpers HTML para insertar sprites fácilmente en cualquier parte ---
  function escAttr(v) {
    return String(v || '').replace(/"/g, '&quot;');
  }

  function createHeroCanvasHTML(claseId, colorHex, colorOscuro, opts) {
    const o = opts || {};
    const cls = o.className ? `pixel-sprite ${o.className}` : 'pixel-sprite';
    const phase = typeof o.phase === 'number' ? o.phase : ((claseId || '').length % 4);
    const pose = o.pose || 'idle';
    return `<canvas class="${escAttr(cls)}" width="32" height="32" data-px-kind="hero" data-px-id="${escAttr(claseId || 'guerrero')}" data-px-color="${escAttr(colorHex || '#3498db')}" data-px-dark="${escAttr(colorOscuro || '#1f618d')}" data-px-phase="${phase}" data-px-pose="${escAttr(pose)}"></canvas>`;
  }

  function createEnemyCanvasHTML(enemyId, opts) {
    const o = opts || {};
    const cls = o.className ? `pixel-sprite ${o.className}` : 'pixel-sprite';
    const phase = typeof o.phase === 'number' ? o.phase : ((enemyId || '').length % 4);
    const pose = o.pose || 'idle';
    return `<canvas class="${escAttr(cls)}" width="32" height="32" data-px-kind="enemy" data-px-id="${escAttr(enemyId || 'goblin')}" data-px-phase="${phase}" data-px-pose="${escAttr(pose)}"></canvas>`;
  }

  function createPropCanvasHTML(propId, opts) {
    const o = opts || {};
    const cls = o.className ? `pixel-sprite ${o.className}` : 'pixel-sprite';
    const phase = typeof o.phase === 'number' ? o.phase : 0;
    return `<canvas class="${escAttr(cls)}" width="32" height="32" data-px-kind="prop" data-px-id="${escAttr(propId)}" data-px-phase="${phase}"></canvas>`;
  }

  function setPose(target, pose, durationMs) {
    const canvas = target && target.tagName === 'CANVAS'
      ? target
      : (target ? target.querySelector('canvas.pixel-sprite') : null);
    if (!canvas) return;
    canvas.dataset.pxPose = pose || 'idle';
    renderCanvas(canvas);
    if (durationMs && pose !== 'idle') {
      setTimeout(() => {
        if (canvas.dataset.pxPose === pose) {
          canvas.dataset.pxPose = 'idle';
          renderCanvas(canvas);
        }
      }, durationMs);
    }
  }

  function init() {
    installBoardTextures();
    paintAll();
    startLoop();
  }

  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', init);
    } else {
      init();
    }
  }

  return {
    init,
    paintAll,
    renderCanvas,
    setPose,
    createHeroCanvasHTML,
    createEnemyCanvasHTML,
    createPropCanvasHTML
  };
})();
