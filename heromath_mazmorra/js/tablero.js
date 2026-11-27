/**
 * js/tablero.js
 * Generador aleatorio de mazmorras estilo HeroQuest:
 * - Habitaciones rectangulares de tamaños variables
 * - Pasillos conectores
 * - Puertas cerradas que ocultan el contenido (niebla de guerra) hasta abrirse
 * - Cofres con oro, enemigos variados (50 HP) y Gran Cofre Real custodiado por la Gárgola
 */
window.HeroMath = window.HeroMath || {};

window.HeroMath.Tablero = (function() {
  const ROOM_NAMES = [
    'Sala de Armas', 'Cripta Antigua', 'Biblioteca Oscura', 'Almacén Real',
    'Sala del Caldero', 'Capilla Olvidada', 'Cámara de los Ecos', 'Bóveda de Piedra',
    'Galería de Sombras', 'Tesorería Secreta'
  ];

  function randInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function generar(tamano) {
    const dims = {
      pequeno: { cols: 11, rows: 7,  targetRooms: 5 },
      mediano: { cols: 13, rows: 9,  targetRooms: 7 },
      grande:  { cols: 15, rows: 9,  targetRooms: 8 }
    }[tamano] || { cols: 13, rows: 9, targetRooms: 7 };

    for (let attempt = 0; attempt < 30; attempt++) {
      const mapa = intentarGenerar(dims.cols, dims.rows, dims.targetRooms);
      if (mapa) return mapa;
    }
    return intentarGenerar(dims.cols, dims.rows, 4, true);
  }

  function intentarGenerar(cols, rows, targetRooms, fallback = false) {
    // Tipos de celda: 'wall', 'corridor', 'room', 'door'
    const grid = [];
    for (let r = 0; r < rows; r++) {
      const row = [];
      for (let c = 0; c < cols; c++) {
        row.push({
          r, c,
          type: 'wall',
          roomId: null,
          revealed: false,
          doorOpen: false,
          doorRooms: [],
          start: false,
          chest: null, // { id, oro, isGrand, opened, hasShield }
          enemyId: null
        });
      }
      grid.push(row);
    }

    // 1. Crear pasillo principal horizontal y un par de pasillos verticales estilo HeroQuest
    const midR = Math.floor(rows / 2);
    for (let c = 1; c < cols - 1; c++) {
      grid[midR][c].type = 'corridor';
      grid[midR][c].revealed = true;
    }

    // Pasillos verticales secundarios
    const vCols = cols >= 13 ? [Math.floor(cols / 3), Math.floor((cols * 2) / 3)] : [Math.floor(cols / 2)];
    vCols.forEach(vc => {
      for (let r = 1; r < rows - 1; r++) {
        grid[r][vc].type = 'corridor';
        grid[r][vc].revealed = true;
      }
    });

    // 2. Colocar habitaciones rectangulares de tamaños variables sin solaparse ni cortar pasillos principales
    const rooms = [];
    let nextRoomId = 1;
    const roomSizes = [
      [3, 3], [4, 3], [3, 2], [4, 2], [2, 3], [2, 2]
    ];

    for (let tries = 0; tries < 220 && rooms.length < targetRooms; tries++) {
      const [rw, rh] = roomSizes[randInt(0, roomSizes.length - 1)];
      const r0 = randInt(0, rows - rh);
      const c0 = randInt(0, cols - rw);

      // Verificar que no toque pasillos directamente por dentro ni se solape con otra habitación (dejando al menos 1 casilla de muro/pasillo)
      let ok = true;
      for (let r = r0 - 1; r <= r0 + rh; r++) {
        for (let c = c0 - 1; c <= c0 + rw; c++) {
          if (r < 0 || r >= rows || c < 0 || c >= cols) continue;
          const inside = r >= r0 && r < r0 + rh && c >= c0 && c < c0 + rw;
          if (inside) {
            if (grid[r][c].type !== 'wall') { ok = false; break; }
          } else {
            // No pegar dos habitaciones directamente sin pared
            if (grid[r][c].type === 'room') { ok = false; break; }
          }
        }
        if (!ok) break;
      }
      if (!ok) continue;

      // Buscar al menos una casilla de muro adyacente que toque un pasillo para poner la puerta
      const doorCandidates = [];
      for (let r = r0; r < r0 + rh; r++) {
        for (let c = c0; c < c0 + rw; c++) {
          const dirs = [[-1,0],[1,0],[0,-1],[0,1]];
          for (const [dr, dc] of dirs) {
            const mr = r + dr, mc = c + dc;
            const cr = r + dr * 2, cc = c + dc * 2;
            if (mr >= 0 && mr < rows && mc >= 0 && mc < cols &&
                cr >= 0 && cr < rows && cc >= 0 && cc < cols) {
              if (grid[mr][mc].type === 'wall' && grid[cr][cc].type === 'corridor') {
                doorCandidates.push({ r: mr, c: mc });
              }
            }
          }
        }
      }
      if (doorCandidates.length === 0) continue;

      const roomId = nextRoomId++;
      const roomCells = [];
      for (let r = r0; r < r0 + rh; r++) {
        for (let c = c0; c < c0 + rw; c++) {
          grid[r][c].type = 'room';
          grid[r][c].roomId = roomId;
          grid[r][c].revealed = false; // Oculta bajo niebla hasta abrir la puerta
          roomCells.push({ r, c });
        }
      }

      // Colocar 1 puerta cerrada conectando la habitación al pasillo
      const doorPos = doorCandidates[randInt(0, doorCandidates.length - 1)];
      grid[doorPos.r][doorPos.c].type = 'door';
      grid[doorPos.r][doorPos.c].doorOpen = false;
      grid[doorPos.r][doorPos.c].revealed = true;
      grid[doorPos.r][doorPos.c].doorRooms.push(roomId);

      rooms.push({
        id: roomId,
        nombre: ROOM_NAMES[(roomId - 1) % ROOM_NAMES.length],
        r0, c0, rw, rh,
        cells: roomCells,
        door: doorPos,
        revealed: false
      });
    }

    if (rooms.length < 3 && !fallback) return null;

    // 3. Punto de entrada (escaleras) en el extremo izquierdo del pasillo central
    const startPos = { r: midR, c: 1 };
    grid[startPos.r][startPos.c].start = true;

    // 4. Elegir la habitación más lejana a la entrada como Cámara del Gran Tesoro
    rooms.sort((a, b) => {
      const da = Math.abs(a.r0 - startPos.r) + Math.abs(a.c0 - startPos.c);
      const db = Math.abs(b.r0 - startPos.r) + Math.abs(b.c0 - startPos.c);
      return db - da;
    });
    const bossRoom = rooms[0];
    bossRoom.nombre = 'Cámara del Gran Tesoro';

    // 5. Colocar Gran Cofre Real y Gárgola Guardiana en bossRoom
    const enemies = [];
    let nextEnemyUid = 1;
    const baseEnemies = window.HeroMath.ENEMIGOS.filter(e => !e.esJefe);
    const bossTemplate = window.HeroMath.ENEMIGOS.find(e => e.esJefe) || window.HeroMath.ENEMIGOS[0];

    const bossCells = shuffle(bossRoom.cells);
    const grandChestCell = bossCells[0];
    grid[grandChestCell.r][grandChestCell.c].chest = {
      id: 'grand_chest',
      oro: 150,
      isGrand: true,
      opened: false,
      hasShield: false
    };

    if (bossCells.length > 1) {
      const gCell = bossCells[1];
      const bossObj = {
        uid: nextEnemyUid++,
        templateId: bossTemplate.id,
        nombre: bossTemplate.nombre,
        hp: bossTemplate.maxHp,
        maxHp: bossTemplate.maxHp,
        danio: bossTemplate.danio,
        oro: bossTemplate.oro,
        esJefe: true,
        frase: bossTemplate.frase,
        r: gCell.r,
        c: gCell.c,
        roomId: bossRoom.id,
        alive: true
      };
      enemies.push(bossObj);
      grid[gCell.r][gCell.c].enemyId = bossObj.uid;
    }

    // 6. Poblar el resto de habitaciones con cofres de oro y enemigos (ocultos hasta abrir puerta)
    let chestCounter = 1;
    for (let i = 1; i < rooms.length; i++) {
      const room = rooms[i];
      const cells = shuffle(room.cells);

      // Cofre en ~75% de las habitaciones
      if (cells.length >= 1 && (i <= 2 || Math.random() < 0.75)) {
        const cCell = cells.shift();
        grid[cCell.r][cCell.c].chest = {
          id: 'chest_' + (chestCounter++),
          oro: randInt(3, 8) * 10,
          isGrand: false,
          opened: false,
          hasShield: Math.random() < 0.35
        };
      }

      // Enemigo en casi todas las habitaciones
      if (cells.length >= 1 && Math.random() < 0.85) {
        const eCell = cells.shift();
        const tpl = baseEnemies[randInt(0, baseEnemies.length - 1)];
        const enemyObj = {
          uid: nextEnemyUid++,
          templateId: tpl.id,
          nombre: tpl.nombre,
          hp: tpl.maxHp,
          maxHp: tpl.maxHp,
          danio: tpl.danio,
          oro: tpl.oro,
          esJefe: false,
          frase: tpl.frase,
          r: eCell.r,
          c: eCell.c,
          roomId: room.id,
          alive: true
        };
        enemies.push(enemyObj);
        grid[eCell.r][eCell.c].enemyId = enemyObj.uid;
      }
    }

    // 7. Añadir 1 o 2 enemigos patrullando los pasillos (lejos de la entrada)
    const corridorCells = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (grid[r][c].type === 'corridor' && !grid[r][c].start) {
          const dist = Math.abs(r - startPos.r) + Math.abs(c - startPos.c);
          if (dist >= 4) corridorCells.push({ r, c });
        }
      }
    }
    const patrolCount = cols >= 13 ? 2 : 1;
    const chosenCorridor = shuffle(corridorCells).slice(0, patrolCount);
    chosenCorridor.forEach(pos => {
      const tpl = baseEnemies[randInt(0, baseEnemies.length - 1)];
      const enemyObj = {
        uid: nextEnemyUid++,
        templateId: tpl.id,
        nombre: tpl.nombre,
        hp: tpl.maxHp,
        maxHp: tpl.maxHp,
        danio: tpl.danio,
        oro: tpl.oro,
        esJefe: false,
        frase: tpl.frase,
        r: pos.r,
        c: pos.c,
        roomId: null,
        alive: true
      };
      enemies.push(enemyObj);
      grid[pos.r][pos.c].enemyId = enemyObj.uid;
    });

    // 8. Verificar accesibilidad total mediante BFS (atravesando puertas)
    if (!verificarConectividad(grid, rows, cols, startPos, grandChestCell)) {
      return null;
    }

    // 9. Colocar antorchas pixel-art en muros seleccionados junto a pasillos y puertas
    const torchCandidates = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        grid[r][c].hasTorch = false;
        if (grid[r][c].type !== 'wall') continue;
        // Preferir muros directamente encima de un pasillo o adyacentes a pasillo/puerta
        const below = grid[r + 1]?.[c];
        const touchesCorridor = (below && (below.type === 'corridor' || below.type === 'door')) ||
          [[-1, 0], [0, -1], [0, 1]].some(([dr, dc]) => {
            const nb = grid[r + dr]?.[c + dc];
            return nb && nb.type === 'corridor';
          });
        if (touchesCorridor) {
          torchCandidates.push({ r, c, priority: (below && below.type === 'corridor') ? 1 : 0 });
        }
      }
    }
    torchCandidates.sort((a, b) => b.priority - a.priority || (Math.random() - 0.5));
    const placedTorches = [];
    const maxTorches = cols >= 15 ? 10 : (cols >= 13 ? 8 : 6);
    for (const cand of torchCandidates) {
      if (placedTorches.length >= maxTorches) break;
      const tooClose = placedTorches.some(t => (Math.abs(t.r - cand.r) + Math.abs(t.c - cand.c)) < 3);
      if (tooClose) continue;
      grid[cand.r][cand.c].hasTorch = true;
      placedTorches.push(cand);
    }

    return { cols, rows, grid, rooms, enemies, startPos, grandChestCell };
  }

  function verificarConectividad(grid, rows, cols, start, target) {
    const visited = Array.from({ length: rows }, () => Array(cols).fill(false));
    const q = [start];
    visited[start.r][start.c] = true;
    const dirs = [[-1,0],[1,0],[0,-1],[0,1]];
    while (q.length) {
      const cur = q.shift();
      if (cur.r === target.r && cur.c === target.c) return true;
      for (const [dr, dc] of dirs) {
        const nr = cur.r + dr, nc = cur.c + dc;
        if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && !visited[nr][nc]) {
          if (grid[nr][nc].type !== 'wall') {
            visited[nr][nc] = true;
            q.push({ r: nr, c: nc });
          }
        }
      }
    }
    return false;
  }

  return { generar };
})();
