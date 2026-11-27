/**
 * Gladiadores/js/pixel-art.js
 * Motor de sprites Pixel Art 16-bit (56x64) y elementos animados del Coliseo
 * (braseros con fuego pixel art, estandartes ondeantes y choques de acero).
 * Fondo 100% transparente y compatible con exportación GIF89a.
 */
(function (root) {
    'use strict';

    const D = root.GladiatorData;
    const SPRITE_W = D.SPRITE_W;
    const SPRITE_H = D.SPRITE_H;
    const PAL = D.PAL;
    const getTeamPalette = D.getTeamPalette;

    function parseHex(hex) {
        if (!hex || typeof hex !== 'string') return null;
        if (hex[0] === '#' && hex.length === 7) {
            return [
                parseInt(hex.slice(1, 3), 16),
                parseInt(hex.slice(3, 5), 16),
                parseInt(hex.slice(5, 7), 16)
            ];
        }
        const m = hex.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/);
        if (m) {
            return [Number(m[1]), Number(m[2]), Number(m[3])];
        }
        return null;
    }

    /**
     * Buffer de píxeles 2D de precisión exacta (sin anti-aliasing)
     */
    class PixelGrid {
        constructor(w, h) {
            this.w = w;
            this.h = h;
            this.data = new Array(w * h).fill(null);
        }

        set(x, y, color) {
            const ix = Math.round(x);
            const iy = Math.round(y);
            if (ix < 0 || ix >= this.w || iy < 0 || iy >= this.h || !color) return;
            this.data[iy * this.w + ix] = color;
        }

        get(x, y) {
            if (x < 0 || x >= this.w || y < 0 || y >= this.h) return null;
            return this.data[y * this.w + x];
        }

        rect(x, y, w, h, color) {
            for (let j = 0; j < h; j++) {
                for (let i = 0; i < w; i++) {
                    this.set(x + i, y + j, color);
                }
            }
        }

        hline(x, y, len, color) {
            for (let i = 0; i < len; i++) this.set(x + i, y, color);
        }

        vline(x, y, len, color) {
            for (let j = 0; j < len; j++) this.set(x, y + j, color);
        }

        line(x0, y0, x1, y1, color) {
            let ix0 = Math.round(x0);
            let iy0 = Math.round(y0);
            const ix1 = Math.round(x1);
            const iy1 = Math.round(y1);
            const dx = Math.abs(ix1 - ix0);
            const dy = Math.abs(iy1 - iy0);
            const sx = ix0 < ix1 ? 1 : -1;
            const sy = iy0 < iy1 ? 1 : -1;
            let err = dx - dy;
            while (true) {
                this.set(ix0, iy0, color);
                if (ix0 === ix1 && iy0 === iy1) break;
                const e2 = 2 * err;
                if (e2 > -dy) { err -= dy; ix0 += sx; }
                if (e2 < dx) { err += dx; iy0 += sy; }
            }
        }

        ellipse(cx, cy, rx, ry, color) {
            for (let y = -ry; y <= ry; y++) {
                for (let x = -rx; x <= rx; x++) {
                    if ((x * x) / (rx * rx + 0.25) + (y * y) / (ry * ry + 0.25) <= 1) {
                        this.set(cx + x, cy + y, color);
                    }
                }
            }
        }

        pattern(ox, oy, rows, map) {
            for (let r = 0; r < rows.length; r++) {
                const row = rows[r];
                for (let c = 0; c < row.length; c++) {
                    const ch = row[c];
                    if (ch !== '.' && ch !== ' ' && map[ch]) {
                        this.set(ox + c, oy + r, map[ch]);
                    }
                }
            }
        }

        applyOutline(outlineColor = PAL.OUT) {
            const copy = this.data.slice();
            const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
            for (let y = 0; y < this.h; y++) {
                for (let x = 0; x < this.w; x++) {
                    if (copy[y * this.w + x] !== null) continue;
                    let touchesSolid = false;
                    for (let d = 0; d < 4; d++) {
                        const nx = x + dirs[d][0];
                        const ny = y + dirs[d][1];
                        if (nx >= 0 && nx < this.w && ny >= 0 && ny < this.h) {
                            const val = copy[ny * this.w + nx];
                            if (val !== null && val !== PAL.SHD) {
                                touchesSolid = true;
                                break;
                            }
                        }
                    }
                    if (touchesSolid) {
                        this.data[y * this.w + x] = outlineColor;
                    }
                }
            }
        }

        applyFlash(flashColor, mixRatio = 0.72) {
            const fc = parseHex(flashColor);
            if (!fc) return;
            for (let i = 0; i < this.data.length; i++) {
                const col = this.data[i];
                if (!col || col === PAL.SHD || col === PAL.OUT) continue;
                const c = parseHex(col);
                if (!c) continue;
                const r = Math.round(c[0] * (1 - mixRatio) + fc[0] * mixRatio);
                const g = Math.round(c[1] * (1 - mixRatio) + fc[1] * mixRatio);
                const b = Math.round(c[2] * (1 - mixRatio) + fc[2] * mixRatio);
                this.data[i] = `rgb(${r},${g},${b})`;
            }
        }

        flipX() {
            const flipped = new Array(this.w * this.h).fill(null);
            for (let y = 0; y < this.h; y++) {
                for (let x = 0; x < this.w; x++) {
                    flipped[y * this.w + (this.w - 1 - x)] = this.data[y * this.w + x];
                }
            }
            this.data = flipped;
        }

        renderTo(ctx, scale = 1) {
            ctx.imageSmoothingEnabled = false;
            ctx.clearRect(0, 0, this.w * scale, this.h * scale);
            for (let y = 0; y < this.h; y++) {
                for (let x = 0; x < this.w; x++) {
                    const col = this.data[y * this.w + x];
                    if (col) {
                        ctx.fillStyle = col;
                        ctx.fillRect(x * scale, y * scale, scale, scale);
                    }
                }
            }
        }
    }

    function mergeLayer(base, overlay) {
        for (let i = 0; i < overlay.data.length; i++) {
            if (overlay.data[i] !== null) {
                base.data[i] = overlay.data[i];
            }
        }
    }

    /**
     * Capa ondeante de hombro (paludamentum romano) detrás del gladiador.
     * Ondeo suave en reposo y despliegue heroico en ataque / victoria.
     */
    function drawCape(g, bx, by, animState, f, tm) {
        const anchorX = 18 + bx;
        const anchorY = 24 + by;
        const isAttack = animState === 'attack' && (f === 1 || f === 2);
        const isVictory = animState === 'victory';
        const isHit = animState === 'hit';

        const capeRows = isAttack ? 18 : isVictory ? 23 : 24;

        for (let r = 0; r < capeRows; r++) {
            const t = r / capeRows;
            let leftOff;
            let width;
            let yPos = anchorY + r;

            if (isAttack) {
                // Capa disparada hacia atrás por la embestida
                const billow = Math.round(Math.sin(t * 4.2 + f * 1.6) * 2);
                leftOff = Math.round(3 + t * 14) + (f === 1 ? 2 : 0) + billow;
                width = Math.max(4, Math.round(6 + t * 7));
                yPos = anchorY + Math.round(r * 0.72) - Math.round(t * 3);
            } else if (isVictory) {
                // Capa flameando heroicamente hacia arriba y atrás
                const wave = Math.round(Math.sin(t * 5.0 - f * 1.57) * 2.2);
                leftOff = Math.round(2 + t * 11) + wave;
                width = Math.round(6 + t * 6);
                yPos = anchorY + Math.round(r * 0.92);
            } else if (isHit) {
                // Sacudida hacia atrás al recibir impacto
                const wave = (f % 2 === 0) ? 2 : 0;
                leftOff = Math.round(4 + t * 10) + wave;
                width = Math.round(5 + t * 6);
            } else {
                // Ondeo continuo multi-fotograma con la brisa del Coliseo
                const phase = (f * Math.PI) / 2;
                const wind = Math.round(Math.sin(t * 4.5 - phase) * (1.2 + t * 1.6));
                leftOff = Math.round(2 + t * 7.5) + wind;
                width = Math.round(5 + t * 5.5);
            }

            const startX = anchorX - leftOff;
            const isHem = r >= capeRows - 2;

            for (let dx = 0; dx < width; dx++) {
                const px = startX + dx;
                let col;
                if (isHem) {
                    // Cenefa dorada inferior de la capa
                    col = (dx % 2 === 0) ? PAL.BR1 : PAL.BR2;
                    if (dx === 1 && r === capeRows - 2) col = PAL.BR0;
                } else if (dx <= 1) {
                    // Pliegue exterior iluminado
                    col = (r % 3 === 0) ? tm.TM0 : tm.TM1;
                } else if (dx < width - 2) {
                    // Tramado de pliegues 16-bit
                    const fold = ((dx + Math.floor(r / 3) + f) % 4 === 0);
                    col = fold ? tm.TM1 : tm.TM2;
                } else {
                    // Sombra profunda interior tras la espalda
                    col = tm.TM3;
                }
                g.set(px, yPos, col);
            }
        }

        // Fíbula dorada (broche del hombro)
        g.rect(anchorX - 2, anchorY, 3, 2, PAL.BR1);
        g.set(anchorX - 2, anchorY, PAL.BR0);
    }

    /**
     * Dibuja las 4 armaduras corporales con dithering metálico y brillo especular animado
     */
    function drawArmor(g, armorType, x, y, C, f) {
        if (armorType === 'bare') {
            // Torso desnudo musculoso con pectorales, abdominales y correaje cruzado
            const rows = [
                '.211001100112.',
                '21100012000112',
                '21111123111122',
                '.222322322322.',
                '.211012310112.',
                '.211112311112.',
                '..2212232122..',
                '..2111231112..',
                '..2211231122..',
                '...22233222...',
                '...21122112...',
                '...22222222...'
            ];
            g.pattern(x, y, rows, C);
            // Correaje cruzado de cuero con remaches dorados
            g.line(x + 1, y + 1, x + 11, y + 11, PAL.LT1);
            g.line(x + 2, y + 1, x + 12, y + 11, PAL.LT0);
            g.set(x + 3, y + 3, PAL.BR1);
            g.set(x + 9, y + 9, PAL.BR1);
            // Medallón pectoral de bronce con brillo pulsante
            g.rect(x + 6, y + 5, 3, 3, PAL.BR1);
            g.set(x + 6, y + 5, (f % 2 === 0) ? PAL.BR0 : PAL.WHT);
            g.set(x + 8, y + 7, PAL.BR3);
        } else if (armorType === 'hamata') {
            // Lorica Hamata: cota de malla con dithering metálico y hombreras de bronce
            const rows = [
                'abbtstststtbba',
                'bccststststccb',
                'cdctstststscdc',
                '.ustststststu.',
                '.utststststtu.',
                '.ustststststu.',
                '.utststststtu.',
                '.ustststststu.',
                '..utstststtu..',
                '..uststststu..',
                '..utstststtu..',
                '..uuuuuuuuuu..'
            ];
            g.pattern(x, y, rows, C);
            // Brillos especulares de anillas recorriendo la cota de malla
            const shift = f % 4;
            g.set(x + 4 + (shift % 2), y + 3 + shift, PAL.ST0);
            g.set(x + 9 - (shift % 2), y + 4 + ((shift + 2) % 4), PAL.ST0);
            g.set(x + 6, y + 8 - (shift % 2), PAL.ST0);
            // Remaches dorados en hombreras
            g.set(x + 1, y + 1, PAL.BR0);
            g.set(x + 12, y + 1, PAL.BR0);
        } else if (armorType === 'bronze') {
            // Coraza Anatómica de Bronce esculpida con dithering y reflejo diagonal
            const rows = [
                '.cbaaabbbaabc.',
                'cbaaaabccaaabc',
                'cbbbbbbddbbbbc',
                '.cbccdcddccbc.',
                '.cbabbcdcbabc.',
                '.cbbbbcddbbbc.',
                '..ccbbcdbbcc..',
                '..cbbbcddbbc..',
                '..ccbbcdbbcc..',
                '...cbbcddbc...',
                '...ccccddcc...',
                '...dddddddd...'
            ];
            g.pattern(x, y, rows, C);
            // Barrido especular metálico sobre el bronce
            const gleamY = y + 1 + f * 2;
            g.set(x + 3 + f, gleamY, PAL.WHT);
            g.set(x + 4 + f, gleamY, PAL.BR0);
            g.set(x + 9, y + 2, PAL.BR0);
        } else {
            // Lorica Segmentata: placas articuladas de acero con bisagras de bronce
            const rows = [
                'wwssttbbttssww',
                'ssttuubbuutssu',
                'uuuuuubbuuuuuu',
                '.wwsssbbssttu.',
                '.sstttbbttuuu.',
                '.uuuuubbuuuuu.',
                '.wwsssbbssttu.',
                '.sstttbbttuuu.',
                '..uuuubbuuuu..',
                '..wsssbbsstu..',
                '..stttbbttuu..',
                '..uuuuuuuuuu..'
            ];
            g.pattern(x, y, rows, C);
            // Destello móvil recorriendo las láminas de acero
            const plateRow = [0, 3, 6, 9][f % 4];
            g.hline(x + 2, y + plateRow, 3, PAL.ST0);
            g.set(x + 6, y + plateRow, PAL.BR0);
            g.set(x + 7, y + plateRow, PAL.BR0);
        }
    }

    /**
     * Dibuja cabeza, rostro expresivo y los 4 cascos romanos con penachos animados
     */
    function drawHeadAndHelmet(g, helmetType, x, y, C, f) {
        // Cuello musculoso
        g.rect(x + 4, y + 10, 4, 3, PAL.SK2);
        g.vline(x + 6, y + 10, 3, PAL.SK1);

        // Base facial heroica mirando a la derecha
        const faceRows = [
            '..21111112..',
            '.2110000112.',
            '.21100ee112.',
            '.21100ei112.',
            '.2110000111.',
            '..21111112..',
            '..22113322..',
            '...222222...'
        ];
        g.pattern(x, y + 3, faceRows, C);
        // Ceja firme
        g.hline(x + 6, y + 4, 3, PAL.HR2);

        const swayX = [0, -1, -1, 0][f % 4];
        const swayY = [0, 0, 1, 0][f % 4];

        if (helmetType === 'none') {
            // Cabello puntiagudo heroico + doble cinta ondeante de 4 fotogramas
            const hairRows = [
                '..k..h.k....',
                '.khhkhhkk...',
                'kkhhkhhkkk..',
                'jkqqqqqqqqk.',
                'jkrppppppqk.'
            ];
            g.pattern(x, y - 1, hairRows, C);
            // Dos colas de cinta ondeando suavemente atrás
            const w1 = [0, 1, 1, 0][f % 4];
            const w2 = [1, 0, -1, 0][f % 4];
            g.hline(x - 4, y + 3 + w1, 4, C.q);
            g.set(x - 5, y + 3 + w2, C.p);
            g.hline(x - 3, y + 4 + w1, 3, C.r);
            g.hline(x - 6, y + 5 + w2, 5, C.r);
            g.set(x - 6, y + 5 + w2, C.z);
        } else if (helmetType === 'murmillo') {
            // Casco Murmillo con cresta alta fluida y visera perforada
            const crestRows = [
                '..pppqqqq...',
                '.ppqqqqqqr..',
                'pqqqqrrrrr..',
                '.pqqrrrrz...'
            ];
            g.pattern(x - 1 + swayX, y - 4 + swayY, crestRows, C);
            // Cola trasera del penacho ondeando con el viento
            const tailY = y - 1 + ((f === 1 || f === 2) ? 1 : 0);
            g.hline(x - 3 + swayX, tailY, 3, C.q);
            g.hline(x - 4 + swayX, tailY + 1, 3, C.r);
            g.set(x - 4 + swayX, tailY + 2, C.z);

            const helmRows = [
                '..cbaaaabc..',
                '.cbbaaaabbc.',
                'ccbbbbbbbbcc',
                '.cwsususuwc.',
                '.cwsususuwc.',
                '.csuuuuuusc.',
                '..ccsssscc..'
            ];
            g.pattern(x, y + 1, helmRows, C);
            // Reflejo móvil en la cúpula de bronce y visera de acero
            g.set(x + 4 + (f % 3), y + 2, PAL.WHT);
            g.set(x + 7, y + 4, PAL.ST0);
        } else if (helmetType === 'thraex') {
            // Casco Tracio con cimera curva de grifo y penacho ondeante
            const griffinRows = [
                '...pppqq....',
                '..ppqqqqr...',
                '.cbbaaaqqr..',
                '.cbbbaaaqr..'
            ];
            g.pattern(x + 1, y - 4 + swayY, griffinRows, C);
            // Pluma trasera del grifo ondeando
            g.hline(x - 2 + swayX, y - 2 + swayY, 3, C.q);
            g.hline(x - 3 + swayX, y - 1 + swayY, 3, C.r);
            // Ojo brillante del grifo
            g.set(x + 7, y - 2 + swayY, PAL.BR0);

            const helmRows = [
                '..cbaaaabc..',
                '.cbbaaaabbc.',
                'dcbbaaaabbcd',
                '.ccbbiiibbc.',
                '.ccbbbbbbcc.',
                '..ccbbbbcc..',
                '...cccccc...'
            ];
            g.pattern(x, y + 1, helmRows, C);
            // Ojos firmes visibles tras las rendijas del casco tracio
            g.set(x + 7, y + 4, PAL.WHT);
            g.set(x + 8, y + 4, PAL.EYE);
            g.set(x + 4 + (f % 2), y + 2, PAL.WHT);
        } else {
            // Galea de Centurión con gran penacho transversal ondeante en 4 fotogramas
            const plumeRows = [
                '.ppqqqqqqpp.',
                'ppqqqqqqqqpp',
                'pqqrrrrrrqqp',
                '.qrrrrrrrrq.'
            ];
            g.pattern(x + swayX, y - 4 + swayY, plumeRows, C);
            // Ondulación superior del penacho
            const crestWaveX = x + 2 + f * 2;
            g.hline(crestWaveX, y - 5 + swayY, 3, C.p);

            const helmRows = [
                '..uwwsswwu..',
                '.uwwsssswwu.',
                'bbbbbbbbbbbb',
                '.ussu..ussu.',
                '.ust100ei1u.',
                '.ust100001u.',
                '..uu113322..'
            ];
            g.pattern(x, y + 1, helmRows, C);
            // Visera frontal de bronce + brillo móvil en cúpula de acero
            g.hline(x + 9, y + 3, 4, PAL.BR1);
            g.hline(x + 10, y + 2, 3, PAL.BR0);
            g.set(x + 3 + (f % 4), y + 1, PAL.ST0);
        }
    }

    /**
     * Dibuja las 3 armas con barrido especular continuo y estelas épicas de ataque
     */
    function drawWeapon(g, fx, weaponType, hx, hy, animState, f, tm) {
        if (weaponType === 'sword') {
            // GLADIUS ROMANA
            if (animState === 'attack' && (f === 1 || f === 2)) {
                // Tajo frontal horizontal con hoja reluciente
                g.rect(hx, hy - 2, 2, 5, PAL.BR1);
                g.set(hx, hy - 2, PAL.BR0);
                g.rect(hx + 2, hy - 1, 14, 3, PAL.ST1);
                g.hline(hx + 2, hy - 1, 15, PAL.ST0);
                g.hline(hx + 2, hy + 1, 13, PAL.ST2);
                g.set(hx + 16, hy, PAL.WHT);

                // Doble estela curva de tajo pixel art (oro + blanco + destello frío)
                const arcCore = f === 1 ? PAL.WHT : PAL.AU1;
                const arcMid = f === 1 ? PAL.AU1 : PAL.AU2;
                const arcOut = f === 1 ? PAL.AU2 : PAL.AU3;
                fx.line(hx + 2, hy - 16, hx + 15, hy - 10, arcOut);
                fx.line(hx + 15, hy - 10, hx + 20, hy, arcMid);
                fx.line(hx + 20, hy, hx + 15, hy + 11, arcOut);

                fx.line(hx + 5, hy - 13, hx + 16, hy - 7, arcMid);
                fx.line(hx + 16, hy - 7, hx + 19, hy + 1, arcCore);
                fx.line(hx + 19, hy + 1, hx + 13, hy + 9, arcMid);

                fx.line(hx + 13, hy - 6, hx + 17, hy + 1, PAL.SW0);
                fx.set(hx + 21, hy - 4, PAL.WHT);
                fx.set(hx + 20, hy + 5, PAL.AU1);
                fx.set(hx + 11, hy - 14, PAL.WHT);
            } else {
                const tilt = animState === 'victory' ? 0 : 1;
                // Pomo dorado y empuñadura de cuero
                g.rect(hx - 1, hy + 2, 2, 2, PAL.BR1);
                g.set(hx - 1, hy + 2, PAL.BR0);
                g.rect(hx, hy, 2, 2, PAL.LT1);
                // Guarda de bronce esculpida
                g.hline(hx - 2, hy - 1, 6, PAL.BR1);
                g.hline(hx - 1, hy - 1, 4, PAL.BR0);
                // Hoja de doble filo con nervio central
                for (let i = 0; i < 14; i++) {
                    const bx = hx + Math.floor(i * (tilt ? 0.35 : 0));
                    const by = hy - 2 - i;
                    g.set(bx, by, PAL.ST2);
                    g.set(bx + 1, by, PAL.ST1);
                    g.set(bx + 2, by, PAL.ST0);
                }
                const tipX = hx + Math.floor(14 * (tilt ? 0.35 : 0));
                const tipY = hy - 16;
                g.set(tipX + 1, tipY, PAL.ST0);
                g.set(tipX + 1, tipY - 1, PAL.WHT);

                // Barrido especular metálico continuo en reposo y victoria
                if (animState === 'idle' || animState === 'victory') {
                    const glintPos = 2 + f * 3;
                    const gx = hx + Math.floor(glintPos * (tilt ? 0.35 : 0)) + 1;
                    const gy = hy - 2 - glintPos;
                    fx.set(gx, gy, PAL.WHT);
                    fx.set(gx + 1, gy, PAL.WHT);
                    fx.set(gx + 1, gy - 1, PAL.SW0);
                }
                // Destello de impulso al cargar el golpe (attack f=0)
                if (animState === 'attack' && f === 0) {
                    fx.set(tipX + 1, tipY - 2, PAL.WHT);
                    fx.set(tipX, tipY - 1, PAL.AU1);
                    fx.set(tipX + 2, tipY - 1, PAL.AU1);
                }
            }
        } else if (weaponType === 'mace') {
            // MAZA CON PÚAS
            if (animState === 'attack' && (f === 1 || f === 2)) {
                g.line(hx - 1, hy, hx + 12, hy + 2, PAL.LT1);
                g.line(hx - 1, hy - 1, hx + 12, hy + 1, PAL.LT0);
                const mx = hx + 14;
                const my = hy + 1;
                g.ellipse(mx, my, 4, 4, PAL.ST2);
                g.ellipse(mx - 1, my - 1, 2, 2, PAL.ST1);
                g.set(mx - 1, my - 2, PAL.ST0);
                // Púas
                g.hline(mx + 4, my, 3, PAL.ST0);
                g.vline(mx, my - 6, 3, PAL.ST0);
                g.vline(mx, my + 4, 3, PAL.ST1);
                g.set(mx + 3, my - 3, PAL.ST0);
                g.set(mx + 3, my + 3, PAL.ST0);

                // Onda expansiva y líneas cinéticas de aplastamiento
                fx.line(mx + 4, my - 10, mx + 9, my - 3, PAL.AU2);
                fx.line(mx + 9, my - 3, mx + 8, my + 8, PAL.AU3);
                fx.line(mx + 5, my - 7, mx + 8, my - 1, PAL.WHT);
                fx.line(mx + 8, my - 1, mx + 6, my + 6, PAL.AU1);
                fx.hline(hx + 2, my - 6, 8, PAL.AU1);
                fx.set(mx + 10, my + 1, PAL.WHT);
                fx.set(mx + 9, my - 6, PAL.WHT);
            } else {
                const topX = hx + (animState === 'victory' ? 1 : 4);
                const topY = hy - 14;
                g.line(hx - 1, hy + 3, topX, topY, PAL.LT2);
                g.line(hx, hy + 3, topX + 1, topY, PAL.LT0);
                // Aro metálico del mango
                g.rect(hx - 1, hy + 2, 2, 2, PAL.BR1);
                // Cabeza de acero con sombreado esférico
                g.ellipse(topX + 1, topY - 1, 4, 4, PAL.ST2);
                g.ellipse(topX, topY - 2, 2, 2, PAL.ST1);
                g.set(topX, topY - 3, PAL.ST0);
                // Púas metálicas
                g.vline(topX + 1, topY - 7, 3, PAL.ST0);
                g.hline(topX - 5, topY - 1, 3, PAL.ST1);
                g.hline(topX + 5, topY - 1, 3, PAL.ST0);
                g.set(topX - 3, topY - 5, PAL.ST0);
                g.set(topX + 5, topY - 5, PAL.ST0);
                g.set(topX + 5, topY + 3, PAL.ST1);

                // Destello rotatorio recorriendo las púas
                if (animState === 'idle' || animState === 'victory') {
                    const sparkPts = [
                        [topX + 1, topY - 7],
                        [topX + 5, topY - 5],
                        [topX + 7, topY - 1],
                        [topX - 3, topY - 5]
                    ];
                    const sp = sparkPts[f % 4];
                    fx.set(sp[0], sp[1], PAL.WHT);
                    fx.set(sp[0], sp[1] - 1, PAL.SW0);
                }
            }
        } else {
            // LANZA ROMANA HASTA
            if (animState === 'attack' && (f === 1 || f === 2)) {
                g.hline(hx - 14, hy, 28, PAL.LT1);
                g.hline(hx - 14, hy - 1, 28, PAL.LT0);
                // Casquillo de bronce y gallardete ondeando
                g.rect(hx + 13, hy - 2, 2, 3, PAL.BR1);
                g.hline(hx + 8, hy + 1, 5, tm.TM1);
                g.hline(hx + 7, hy + 2, 4, tm.TM2);
                // Punta de lanza
                g.rect(hx + 15, hy - 2, 4, 3, PAL.ST1);
                g.hline(hx + 15, hy - 2, 6, PAL.ST0);
                g.hline(hx + 18, hy - 1, 4, PAL.WHT);

                // Cono sónico y líneas de velocidad pixeladas
                fx.hline(hx + 1, hy - 5, 17, PAL.WHT);
                fx.hline(hx + 5, hy + 4, 15, PAL.AU1);
                fx.hline(hx + 17, hy - 1, 7, PAL.WHT);
                fx.line(hx + 16, hy - 6, hx + 22, hy - 1, PAL.SW0);
                fx.line(hx + 16, hy + 4, hx + 22, hy - 1, PAL.AU1);
            } else {
                const x0 = hx - 9;
                const y0 = hy + 11;
                const x1 = hx + (animState === 'victory' ? 2 : 11);
                const y1 = hy - (animState === 'victory' ? 16 : 14);
                g.line(x0, y0, x1, y1, PAL.LT2);
                g.line(x0 + 1, y0, x1 + 1, y1, PAL.LT0);
                // Casquillo de bronce + gallardete del equipo ondeando
                g.rect(x1 - 1, y1 - 1, 3, 3, PAL.BR1);
                const flagWave = (f === 1 || f === 2) ? 1 : 0;
                g.hline(x1 - 5, y1 + 1 + flagWave, 4, tm.TM1);
                g.hline(x1 - 6, y1 + 2 + flagWave, 4, tm.TM2);
                g.set(x1 - 4, y1 + 1 + flagWave, tm.TM0);

                // Punta de hoja de acero
                g.line(x1 + 1, y1 - 1, x1 + 5, y1 - 6, PAL.ST1);
                g.line(x1 + 2, y1 - 1, x1 + 6, y1 - 6, PAL.ST0);
                g.set(x1 + 6, y1 - 7, PAL.WHT);

                // Barrido de brillo metálico en la punta de lanza
                if (animState === 'idle' || animState === 'victory') {
                    const step = f % 4;
                    fx.set(x1 + 2 + step, y1 - 2 - step, PAL.WHT);
                    if (step >= 2) fx.set(x1 + 3 + step, y1 - 3 - step, PAL.SW0);
                }
            }
        }
    }

    /**
     * Nubes pixeladas de polvo de arena levantadas por las sandalias al embestir o tropezar
     */
    function drawSandDust(fx, bx, animState, f) {
        if (animState === 'attack' && f >= 1) {
            const drift = (f - 1) * 3;
            const puffY = 54 - (f === 2 ? 1 : 0);
            // Nube trasera principal
            fx.ellipse(11 + bx - drift, puffY, 3, 2, PAL.DUST1);
            fx.ellipse(10 + bx - drift, puffY - 1, 2, 1, PAL.DUST0);
            fx.set(8 + bx - drift, puffY - 2, PAL.DUST0);
            // Granos de arena secundarios volando atrás
            fx.ellipse(17 + bx - Math.floor(drift * 0.7), 55, 2, 1, PAL.DUST2);
            fx.set(6 + bx - drift, puffY, PAL.DUST1);
            fx.set(13 + bx - drift, puffY - 3, PAL.DUST0);
        } else if (animState === 'miss' && (f === 1 || f === 2)) {
            fx.ellipse(14 + bx - f, 55, 2, 1, PAL.DUST1);
            fx.set(12 + bx - f, 54, PAL.DUST0);
            fx.ellipse(34 + bx + f, 55, 2, 1, PAL.DUST0);
        } else if (animState === 'hit' && f <= 2) {
            fx.ellipse(32 + bx + f * 2, 55, 3, 1, PAL.DUST1);
            fx.set(34 + bx + f * 2, 54, PAL.DUST0);
        }
    }

    /**
     * Chispas y estrellas de impacto dramáticas en estado HIT
     */
    function drawHitSparks(fx, cx, cy, f) {
        const spread = 5 + f * 3;
        // Cruz de destello de impacto en el pecho (f=0, 1)
        if (f <= 1) {
            const arm = f === 0 ? 5 : 3;
            fx.hline(cx - arm, cy, arm * 2 + 1, PAL.WHT);
            fx.vline(cx, cy - arm, arm * 2 + 1, PAL.WHT);
            fx.set(cx - 2, cy - 2, PAL.AU1);
            fx.set(cx + 2, cy - 2, PAL.AU1);
            fx.set(cx - 2, cy + 2, PAL.AU1);
            fx.set(cx + 2, cy + 2, PAL.AU1);
        }

        // Chispas y estrellas pixeladas saliendo despedidas
        const pts = [
            [cx - spread, cy - spread + 2],
            [cx + spread, cy - spread],
            [cx - spread + 2, cy + spread - 2],
            [cx + spread - 1, cy + spread - 3],
            [cx + spread + 2, cy - 1]
        ];
        pts.forEach(([px, py], idx) => {
            fx.set(px, py, idx % 2 === 0 ? PAL.WHT : PAL.AU1);
            fx.set(px + 1, py, PAL.AU2);
            if (idx < 2) fx.set(px, py - 1, PAL.AU1);
        });

        // Estrellitas de aturdimiento junto a la cabeza
        const sx = cx - 4 + (f * 2);
        const sy = cy - 13 - (f % 2);
        fx.set(sx, sy, PAL.AU1);
        fx.set(sx + 1, sy, PAL.WHT);
        fx.set(sx - 4, sy + 2, PAL.AU2);
    }

    /**
     * Aura dorada pixel art de victoria detrás del campeón
     */
    function drawVictoryAuraBack(fx, cx, cy, f) {
        const pulse = (f % 2 === 0) ? 1 : 0;
        for (let y = 10; y <= 56; y++) {
            const dy = (y - cy) / 24;
            const halfW = Math.round((13 + pulse * 2) * Math.max(0.2, 1 - dy * dy * 0.55));
            const flicker = ((y + f * 3) % 4 === 0) ? 2 : 0;
            fx.set(cx - halfW - flicker, y, PAL.AU2);
            fx.set(cx - halfW - flicker + 1, y, PAL.AU1);
            fx.set(cx + halfW + flicker, y, PAL.AU2);
            fx.set(cx + halfW + flicker - 1, y, PAL.AU1);
        }
        fx.vline(cx - 8, 9 - pulse, 5, PAL.AU1);
        fx.vline(cx + 9, 10 - pulse, 5, PAL.AU1);
        fx.vline(cx, 5 - pulse, 4, PAL.AU0);
    }

    /**
     * Corona de laurel dorada flotante + confeti pixel art ascendente en VICTORY
     */
    function drawVictoryLaurelAndConfetti(fx, cx, cy, f, tm) {
        // 1. Corona de laurel romana flotando sobre la cabeza del campeón
        const bob = (f === 1 || f === 2) ? -1 : 0;
        const wy = 4 + bob;
        // Arco izquierdo y derecho de hojas doradas y verdes
        fx.set(cx - 5, wy + 2, PAL.BR1);
        fx.set(cx - 4, wy + 1, PAL.LR1);
        fx.set(cx - 3, wy, PAL.BR0);
        fx.set(cx - 2, wy, PAL.BR1);
        fx.set(cx - 5, wy + 3, PAL.LR2);
        fx.set(cx - 4, wy + 3, PAL.BR1);

        fx.set(cx + 5, wy + 2, PAL.BR1);
        fx.set(cx + 4, wy + 1, PAL.LR1);
        fx.set(cx + 3, wy, PAL.BR0);
        fx.set(cx + 2, wy, PAL.BR1);
        fx.set(cx + 5, wy + 3, PAL.LR2);
        fx.set(cx + 4, wy + 3, PAL.BR1);

        // Destello en la corona de laurel
        fx.set(cx, wy - 1, (f % 2 === 0) ? PAL.WHT : PAL.AU1);
        fx.set(cx - 1, wy + 4, PAL.BR2);
        fx.set(cx, wy + 4, PAL.BR1);
        fx.set(cx + 1, wy + 4, PAL.BR2);

        // 2. Confeti pixel art ascendente y destellos alrededor
        const confetti = [
            { x: cx - 16, y: 48 - f * 9, col: PAL.AU1, alt: PAL.WHT },
            { x: cx + 17, y: 44 - f * 8, col: tm.TM0, alt: tm.TM1 },
            { x: cx - 12, y: 32 - f * 7, col: PAL.LR1, alt: PAL.AU1 },
            { x: cx + 13, y: 52 - f * 9, col: PAL.WHT, alt: PAL.AU2 },
            { x: cx - 18, y: 24 - f * 5, col: tm.TM1, alt: PAL.AU1 },
            { x: cx + 19, y: 26 - f * 6, col: PAL.AU1, alt: PAL.LR1 }
        ];

        confetti.forEach((c, idx) => {
            const driftX = ((f + idx) % 2 === 0) ? 1 : -1;
            const px = c.x + driftX;
            const py = c.y;
            fx.set(px, py, (f % 2 === 0) ? c.col : c.alt);
            fx.set(px + 1, py + ((f + idx) % 2), c.alt);
        });
    }

    /**
     * Sprite derrotado caído en la arena con capa extendida, arma caída y estrellas KO
     */
    function drawDefeatedGladiator(g, fx, config, C, f, tm) {
        const baseY = 48;
        // Sombra alargada
        g.ellipse(27, 56, 19, 3, PAL.SHD);

        // Capa extendida en la arena detrás del torso
        g.rect(12, baseY + 4, 18, 4, tm.TM2);
        g.hline(13, baseY + 4, 16, tm.TM1);
        g.hline(12, baseY + 7, 17, PAL.BR2);

        // Piernas tendidas hacia la derecha
        g.rect(31, baseY + 2, 12, 4, PAL.SK2);
        g.rect(35, baseY + 1, 7, 4, PAL.BR1);
        g.hline(35, baseY + 1, 6, PAL.BR0);
        g.rect(42, baseY + 1, 4, 5, PAL.LT1);

        // Torso tumbado (según armadura)
        const torsoCol = config.armor === 'bare' ? PAL.SK1 :
                         config.armor === 'bronze' ? PAL.BR1 : PAL.ST1;
        const torsoShd = config.armor === 'bare' ? PAL.SK2 :
                         config.armor === 'bronze' ? PAL.BR2 : PAL.ST2;
        g.rect(18, baseY, 13, 6, torsoCol);
        g.hline(18, baseY + 5, 13, torsoShd);
        g.rect(28, baseY, 3, 6, C.q);
        g.rect(27, baseY, 2, 6, PAL.LT1);

        // Cabeza / Casco apoyado a la izquierda
        g.rect(10, baseY + 1, 8, 6, PAL.SK1);
        if (config.helmet === 'murmillo' || config.helmet === 'thraex') {
            g.rect(9, baseY, 7, 6, PAL.BR1);
            g.hline(9, baseY, 6, PAL.BR0);
            g.rect(7, baseY + 1, 3, 4, C.q);
        } else if (config.helmet === 'centurion') {
            g.rect(9, baseY, 7, 6, PAL.ST1);
            g.rect(6, baseY, 3, 6, C.q);
        } else {
            g.rect(9, baseY, 5, 5, PAL.HR1);
            g.vline(13, baseY, 6, C.q);
        }

        // Arma caída acorde al equipamiento
        if (config.weapon === 'mace') {
            g.hline(18, baseY + 8, 10, PAL.LT1);
            g.ellipse(29, baseY + 8, 2, 2, PAL.ST1);
            g.set(31, baseY + 7, PAL.ST0);
        } else if (config.weapon === 'spear') {
            g.hline(15, baseY + 8, 17, PAL.LT0);
            g.hline(32, baseY + 8, 5, PAL.ST0);
        } else {
            g.hline(20, baseY + 8, 13, PAL.ST1);
            g.hline(20, baseY + 7, 12, PAL.ST0);
            g.rect(18, baseY + 7, 2, 3, PAL.BR1);
        }

        // Nubecillas de polvo pixelado y estrellas de KO girando
        const dustY = baseY - 3 - (f % 2);
        fx.ellipse(14 + f, dustY, 3, 2, PAL.DUST0);
        fx.ellipse(35 - f, dustY + 1, 3, 2, PAL.DUST1);
        const starX = 12 + (f === 0 ? -2 : f === 1 ? 0 : f === 2 ? 2 : 0);
        fx.set(starX, baseY - 5, PAL.AU1);
        fx.set(starX + 4, baseY - 6, PAL.WHT);
        fx.set(starX + 2, baseY - 4, PAL.AU2);
    }

    /**
     * Compone el sprite completo del Gladiador (56x64) según equipo, estado y fotograma
     */
    function composeGladiatorPixelGrid(config, playerNum, animState = 'idle', frame = 0, includeShadow = true) {
        const g = new PixelGrid(SPRITE_W, SPRITE_H);
        const fx = new PixelGrid(SPRITE_W, SPRITE_H);
        const tm = getTeamPalette(playerNum);
        const f = frame % 4;

        const C = {
            'o': PAL.OUT,
            '0': PAL.SK0, '1': PAL.SK1, '2': PAL.SK2, '3': PAL.SK3,
            'a': PAL.BR0, 'b': PAL.BR1, 'c': PAL.BR2, 'd': PAL.BR3,
            'w': PAL.ST0, 's': PAL.ST1, 't': PAL.ST2, 'u': PAL.ST3,
            'l': PAL.LT0, 'm': PAL.LT1, 'n': PAL.LT2,
            'h': PAL.HR0, 'k': PAL.HR1, 'j': PAL.HR2,
            'p': tm.TM0,  'q': tm.TM1,  'r': tm.TM2,  'z': tm.TM3,
            'e': PAL.WHT, 'i': PAL.EYE
        };

        if (animState === 'defeat') {
            drawDefeatedGladiator(g, fx, config, C, f, tm);
            g.applyOutline(PAL.OUT);
            mergeLayer(g, fx);
            if (playerNum === 2) g.flipX();
            return g;
        }

        // Offsets cinemáticos por estado y fotograma
        let bx = 0;
        let by = 0;
        let headY = 0;
        let armOffX = 0;
        let armOffY = 0;
        let legSpread = 0;

        if (animState === 'idle') {
            by = (f === 1 || f === 2) ? 1 : 0;
            headY = (f === 2) ? 1 : 0;
            armOffY = (f === 1 || f === 2) ? 1 : 0;
        } else if (animState === 'attack') {
            if (f === 0) { bx = -2; by = 0; armOffX = -3; armOffY = -3; }
            else if (f === 1) { bx = 4; by = 1; armOffX = 5; armOffY = 0; legSpread = 2; }
            else if (f === 2) { bx = 3; by = 1; armOffX = 4; armOffY = 1; legSpread = 1; }
            else { bx = 1; by = 0; armOffX = 1; armOffY = 0; }
        } else if (animState === 'hit') {
            if (f === 0) { bx = -3; by = -1; headY = -1; armOffX = -2; }
            else if (f === 1) { bx = -4; by = 0; headY = 0; armOffX = -3; }
            else if (f === 2) { bx = -2; by = 0; armOffX = -1; }
            else { bx = -1; by = 0; }
        } else if (animState === 'miss') {
            if (f === 0) { bx = 3; by = 1; armOffX = 4; }
            else if (f === 1) { bx = 4; by = 2; headY = 1; armOffX = 5; armOffY = 2; }
            else if (f === 2) { bx = 2; by = 1; armOffX = 2; }
            else { bx = 0; by = 0; }
        } else if (animState === 'victory') {
            by = (f === 1 || f === 3) ? -2 : 0;
            armOffY = -9;
            armOffX = 1;
        }

        // 1. Aura dorada trasera de victoria
        if (animState === 'victory') {
            drawVictoryAuraBack(fx, 24 + bx, 36 + by, f);
        }

        // 2. Capa ondeante detrás del gladiador
        drawCape(g, bx, by, animState, f, tm);

        // 3. Piernas, grebas de bronce con reflejo y sandalias
        const hipY = 39 + by;
        const blX = 15 + bx - legSpread;
        g.rect(blX + 1, hipY, 5, 7, PAL.SK2);
        g.rect(blX + 2, hipY, 2, 6, PAL.SK1);
        g.vline(blX + 1, hipY, 7, PAL.SK3);
        g.rect(blX, 46, 5, 7, PAL.BR2);
        g.vline(blX + 1, 46, 7, PAL.BR1);
        g.set(blX + 2, 47 + (f % 2), PAL.BR0);
        g.vline(blX + 4, 46, 7, PAL.BR3);
        g.rect(blX - 1, 53, 7, 3, PAL.LT1);
        g.hline(blX - 1, 55, 7, PAL.LT2);
        g.hline(blX, 53, 5, PAL.LT0);

        const flX = 26 + bx + legSpread;
        g.rect(flX, hipY, 5, 7, PAL.SK1);
        g.vline(flX + 1, hipY, 6, PAL.SK0);
        g.vline(flX + 4, hipY, 7, PAL.SK2);
        g.rect(flX + 1, 46, 5, 7, PAL.BR1);
        g.vline(flX + 2, 46, 7, PAL.BR0);
        g.vline(flX + 4, 46, 7, PAL.BR2);
        g.vline(flX + 5, 46, 7, PAL.BR3);
        g.rect(flX + 1, 53, 7, 3, PAL.LT1);
        g.hline(flX + 1, 55, 7, PAL.LT2);
        g.hline(flX + 2, 53, 5, PAL.LT0);

        // 4. Escudo Buckler y brazo trasero
        const shX = 13 + bx;
        const shY = 30 + by + (f === 1 || f === 2 ? 1 : 0);
        g.rect(14 + bx, 26 + by, 4, 6, PAL.SK2);
        g.ellipse(shX, shY, 4, 6, PAL.BR2);
        g.ellipse(shX, shY, 3, 5, tm.TM2);
        g.ellipse(shX + 1, shY - 1, 2, 3, tm.TM1);
        g.set(shX, shY - 5, PAL.BR0);
        g.set(shX + 1, shY - 4, PAL.BR1);
        g.rect(shX, shY - 1, 2, 2, PAL.BR1);
        g.set(shX, shY - 1, PAL.WHT);

        // 5. Faldellín (subligaculum) y pteruges animados
        const skirtWave = (f === 1 || f === 2) ? 1 : 0;
        g.rect(17 + bx, 37 + by, 14, 5, tm.TM2);
        g.rect(19 + bx, 37 + by, 10, 4, tm.TM1);
        for (let i = 0; i < 4; i++) {
            const sx = 17 + bx + i * 3 + (i === 0 ? -skirtWave : 0);
            g.rect(sx, 40 + by, 2, 4, i % 2 === 0 ? tm.TM1 : tm.TM2);
            g.set(sx, 43 + by, PAL.BR1);
        }

        // 6. Torso y armadura corporal
        drawArmor(g, config.armor, 17 + bx, 24 + by, C, f);

        // Cinturón Balteus con hebilla de bronce
        g.rect(17 + bx, 36 + by, 14, 3, PAL.LT1);
        g.hline(17 + bx, 38 + by, 14, PAL.LT2);
        g.rect(23 + bx, 35 + by, 4, 4, PAL.BR1);
        g.set(24 + bx, 36 + by, PAL.BR0);
        g.vline(26 + bx, 35 + by, 4, PAL.BR3);

        // 7. Cabeza, rostro y casco romano
        drawHeadAndHelmet(g, config.helmet, 18 + bx, 12 + by + headY, C, f);

        // 8. Arma y brazo delantero con manica
        const handX = 32 + bx + armOffX;
        const handY = 30 + by + armOffY;
        drawWeapon(g, fx, config.weapon, handX, handY, animState, f, tm);

        const shldX = 28 + bx;
        const shldY = 25 + by;
        g.line(shldX, shldY, handX - 1, handY - 1, PAL.SK1);
        g.line(shldX, shldY + 1, handX - 1, handY, PAL.SK2);
        g.line(shldX + 1, shldY, handX, handY - 1, PAL.SK0);
        // Hombrera protectora (galerus de bronce si lleva armadura)
        if (config.armor !== 'bare') {
            g.rect(shldX - 1, shldY - 1, 5, 4, PAL.BR2);
            g.hline(shldX - 1, shldY - 1, 4, PAL.BR1);
            g.set(shldX, shldY - 1, PAL.BR0);
        } else {
            g.rect(shldX - 1, shldY, 4, 4, PAL.SK1);
            g.set(shldX, shldY, PAL.SK0);
        }
        // Manica (brazalete segmentado de cuero y bronce)
        g.rect(handX - 3, handY - 2, 3, 3, PAL.LT1);
        g.set(handX - 3, handY - 2, PAL.BR1);
        g.set(handX - 2, handY - 1, PAL.BR0);
        // Puño
        g.rect(handX - 1, handY - 1, 3, 3, PAL.SK1);
        g.set(handX, handY - 1, PAL.SK0);

        // 9. Contorno oscuro nítido 16-bit
        g.applyOutline(PAL.OUT);

        // 10. Polvo de arena en las sandalias
        drawSandDust(fx, bx, animState, f);

        // 11. Efectos de estado (HIT / MISS / VICTORY)
        if (animState === 'hit') {
            if (f === 0 || f === 2) g.applyFlash('#ffffff', 0.72);
            else if (f === 1) g.applyFlash('#ef4444', 0.55);
            drawHitSparks(fx, 26 + bx, 26 + by, f);
        }

        if (animState === 'miss' && (f === 1 || f === 2)) {
            const swY = 14 + by + f;
            fx.set(15 + bx, swY, PAL.SW0);
            fx.rect(14 + bx, swY + 1, 2, 2, PAL.SW1);
            fx.set(14 + bx, swY + 1, PAL.SW0);
        }

        if (animState === 'victory') {
            drawVictoryLaurelAndConfetti(fx, 24 + bx, 28 + by, f, tm);
        }

        mergeLayer(g, fx);

        // 12. Sombra en la arena (omitida al exportar GIF transparente)
        if (includeShadow) {
            for (let sy = 56; sy <= 60; sy++) {
                for (let sx = 12; sx <= 37; sx++) {
                    const dx = (sx - 24.5) / 12.5;
                    const dy = (sy - 58) / 2.2;
                    if (dx * dx + dy * dy <= 1 && !g.get(sx, sy)) {
                        g.set(sx, sy, PAL.SHD);
                    }
                }
            }
        }

        if (playerNum === 2) {
            g.flipX();
        }

        return g;
    }

    /**
     * Efecto de choque metálico central en Pixel Art 16-bit (40x40)
     */
    function renderPixelClash(frame) {
        const canvas = document.getElementById('clash-canvas');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const g = new PixelGrid(40, 40);
        const cx = 20;
        const cy = 20;
        const f = frame % 4;
        const r = 7 + (f % 3) * 4;

        // Rayos exteriores de impacto ardiente
        for (let a = 0; a < 8; a++) {
            const ang = (a * Math.PI) / 4 + (f * 0.22);
            const lenOut = r + (a % 2 === 0 ? 8 : 5);
            const x1 = cx + Math.round(Math.cos(ang) * lenOut);
            const y1 = cy + Math.round(Math.sin(ang) * lenOut);
            g.line(cx, cy, x1, y1, PAL.AU3);

            const x2 = cx + Math.round(Math.cos(ang) * (lenOut - 3));
            const y2 = cy + Math.round(Math.sin(ang) * (lenOut - 3));
            g.line(cx, cy, x2, y2, PAL.AU1);
        }

        // Destello cruzado de choque de acero
        const crossR = r + 6;
        g.line(cx - crossR, cy - crossR + 4, cx + crossR, cy + crossR - 4, PAL.SW0);
        g.line(cx - crossR + 4, cy + crossR, cx + crossR - 4, cy - crossR, PAL.WHT);

        // Núcleo incandescente
        g.ellipse(cx, cy, Math.max(3, r - 2), Math.max(3, r - 2), PAL.AU2);
        g.ellipse(cx, cy, Math.max(2, r - 4), Math.max(2, r - 4), PAL.AU1);
        g.ellipse(cx, cy, Math.max(2, r - 6), Math.max(2, r - 6), PAL.WHT);

        // Chispas exteriores volando
        const sparks = [
            [cx - r - 3, cy - r + 1],
            [cx + r + 3, cy - r + 2],
            [cx - r + 1, cy + r + 3],
            [cx + r + 2, cy + r - 2],
            [cx, cy - r - 4],
            [cx, cy + r + 4]
        ];
        sparks.forEach(([sx, sy], i) => {
            g.set(sx, sy, i % 2 === 0 ? PAL.WHT : PAL.AU1);
            g.set(sx + 1, sy, PAL.AU2);
        });

        g.renderTo(ctx, 1);
    }

    /**
     * Brasero / Antorcha romana animada en Pixel Art 16-bit (24x40)
     */
    function renderPixelTorch(canvas, frame, phaseOffset = 0) {
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const g = new PixelGrid(24, 40);
        const f = (frame + phaseOffset) % 4;
        const cx = 12;

        // Trípode / Pedestal de bronce romano
        g.rect(cx - 2, 24, 4, 13, PAL.BR2);
        g.vline(cx - 1, 24, 13, PAL.BR1);
        g.vline(cx + 1, 24, 13, PAL.BR3);
        // Patas del trípode
        g.line(cx - 2, 32, cx - 6, 38, PAL.BR2);
        g.line(cx - 1, 32, cx - 5, 38, PAL.BR1);
        g.line(cx + 2, 32, cx + 6, 38, PAL.BR3);
        g.line(cx + 1, 32, cx + 5, 38, PAL.BR2);
        g.hline(cx - 7, 38, 15, PAL.BR3);
        g.hline(cx - 6, 37, 13, PAL.BR2);

        // Cuenco del brasero con reflejo cálido del fuego
        g.hline(cx - 7, 19, 15, PAL.BR0);
        g.hline(cx - 7, 20, 15, PAL.BR1);
        g.hline(cx - 6, 21, 13, PAL.BR2);
        g.hline(cx - 5, 22, 11, PAL.BR2);
        g.hline(cx - 4, 23, 9, PAL.BR3);
        // Remaches del cuenco
        g.set(cx - 4, 21, PAL.BR0);
        g.set(cx, 21, PAL.BR0);
        g.set(cx + 4, 21, PAL.BR0);

        g.applyOutline(PAL.OUT);

        // Brasas ardientes y llamas multi-fotograma (capa luminosa sin contorno negro)
        const fx = new PixelGrid(24, 40);
        // Brasas base
        fx.hline(cx - 5, 18, 11, PAL.FL3);
        fx.hline(cx - 4, 18, 9, PAL.FL2);

        const sway = [0, 1, 0, -1][f];
        const tall = [12, 14, 11, 13][f];

        // Llama exterior (rojo/naranja)
        for (let dy = 0; dy < tall; dy++) {
            const t = dy / tall;
            const halfW = Math.max(1, Math.round((1 - t) * 5.2));
            const ox = Math.round(Math.sin(t * 4.5 + f * 1.5) * 1.4) + Math.round(sway * t);
            const y = 18 - dy;
            fx.hline(cx - halfW + ox, y, halfW * 2 + 1, dy > tall - 4 ? PAL.FL3 : PAL.FL2);
        }

        // Llama media (amarilla)
        const midH = tall - 3;
        for (let dy = 0; dy < midH; dy++) {
            const t = dy / midH;
            const halfW = Math.max(1, Math.round((1 - t) * 3.4));
            const ox = Math.round(Math.sin(t * 4.0 + f * 1.6) * 1.1);
            fx.hline(cx - halfW + ox, 18 - dy, halfW * 2 + 1, PAL.FL1);
        }

        // Núcleo incandescente (blanco-amarillo)
        fx.ellipse(cx, 16, 2, 2, PAL.FL0);
        fx.set(cx + sway, 13, PAL.FL0);

        // Chispas / pavesas ascendentes
        const emberY1 = 7 - f * 2;
        const emberY2 = 10 - ((f + 2) % 4) * 2;
        fx.set(cx - 3 + sway, emberY1, PAL.FL1);
        fx.set(cx + 4 - sway, emberY2, PAL.FL2);
        fx.set(cx + sway, Math.max(1, 5 - f), PAL.FL0);

        mergeLayer(g, fx);
        g.renderTo(ctx, 1);
    }

    /**
     * Estandarte romano (Vexillum) en Pixel Art 16-bit ondeando (20x36)
     */
    function renderPixelBanner(canvas, playerNum, frame) {
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const g = new PixelGrid(20, 36);
        const tm = getTeamPalette(playerNum);
        const f = frame % 4;

        // Travesaño dorado con remates de lanza
        g.hline(2, 4, 16, PAL.BR1);
        g.hline(3, 3, 14, PAL.BR0);
        g.hline(2, 5, 16, PAL.BR3);
        g.rect(1, 3, 2, 3, PAL.BR0);
        g.rect(17, 3, 2, 3, PAL.BR0);
        // Águila/remate central superior
        g.rect(9, 1, 2, 3, PAL.BR1);
        g.set(9, 1, PAL.BR0);
        g.hline(7, 2, 6, PAL.BR1);

        // Paño del estandarte ondeando en 4 fotogramas
        for (let y = 6; y <= 29; y++) {
            const t = (y - 6) / 23;
            const wave = Math.round(Math.sin(t * 4.5 - f * 1.57) * (0.8 + t * 1.1));
            const trimBottom = y >= 25;
            const notch = trimBottom ? Math.max(0, y - 24) : 0;

            for (let x = 4; x <= 15; x++) {
                // Punta triangular inferior clásica romana
                if (trimBottom && (x - 4 < notch - 1 || 15 - x < notch - 1)) continue;
                const px = x + wave;
                let col;
                if (x === 4 || x === 15 || y === 6 || (trimBottom && (x - 4 === notch - 1 || 15 - x === notch - 1))) {
                    col = (y % 2 === 0) ? PAL.BR1 : PAL.BR2;
                } else if (x <= 6) {
                    col = ((y + f) % 4 === 0) ? tm.TM0 : tm.TM1;
                } else if (x >= 13) {
                    col = tm.TM3;
                } else {
                    col = ((x + y + f) % 5 === 0) ? tm.TM1 : tm.TM2;
                }
                g.set(px, y, col);
            }
        }

        // Emblema dorado pixel art en el centro (corona/escudo SPQR)
        const ew = Math.round(Math.sin(0.45 * 4.5 - f * 1.57) * 1.1);
        const ex = 10 + ew;
        g.hline(ex - 2, 13, 5, PAL.BR0);
        g.rect(ex - 1, 14, 3, 4, PAL.BR1);
        g.set(ex, 15, PAL.BR0);
        g.hline(ex - 3, 15, 7, PAL.BR1);
        g.set(ex - 2, 19, PAL.BR0);
        g.set(ex + 2, 19, PAL.BR0);
        g.hline(ex - 1, 20, 3, PAL.BR1);

        // Borlas doradas inferiores balanceándose
        const tasselSwing = [0, 1, 0, -1][f];
        g.vline(5 + tasselSwing, 28, 4, PAL.BR1);
        g.set(5 + tasselSwing, 32, PAL.BR0);
        g.vline(10 + tasselSwing, 30, 4, PAL.BR1);
        g.set(10 + tasselSwing, 34, PAL.BR0);
        g.vline(14 + tasselSwing, 28, 4, PAL.BR1);
        g.set(14 + tasselSwing, 32, PAL.BR0);

        g.applyOutline(PAL.OUT);
        g.renderTo(ctx, 1);
    }

    root.GladiatorPixelArt = {
        PixelGrid,
        parseHex,
        mergeLayer,
        composeGladiatorPixelGrid,
        renderPixelClash,
        renderPixelTorch,
        renderPixelBanner
    };
})(typeof window !== 'undefined' ? window : globalThis);
