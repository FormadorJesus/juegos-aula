/**
 * Gladiadores/js/gif-export.js
 * Codificador GIF89a autocontenido con fondo 100% transparente.
 * Exporta los 4 fotogramas animados en guardia del gladiador personalizado
 * escalados nítidamente (4x = 224x256 px) sin suavizado.
 */
(function (root) {
    'use strict';

    /**
     * Compresor LZW estándar para GIF89a (empaquetado LSB-first)
     */
    function encodeGIFLZW(pixels, minCodeSize) {
        const clearCode = 1 << minCodeSize;
        const eoiCode = clearCode + 1;
        let codeSize = minCodeSize + 1;
        let nextCode = eoiCode + 1;

        const out = [];
        let bitBuf = 0;
        let bitCount = 0;

        function emit(code) {
            bitBuf |= (code << bitCount);
            bitCount += codeSize;
            while (bitCount >= 8) {
                out.push(bitBuf & 0xFF);
                bitBuf >>= 8;
                bitCount -= 8;
            }
        }

        let dict = new Map();
        emit(clearCode);

        if (pixels.length === 0) {
            emit(eoiCode);
            if (bitCount > 0) out.push(bitBuf & 0xFF);
            return out;
        }

        let prefix = pixels[0];
        for (let i = 1; i < pixels.length; i++) {
            const k = pixels[i];
            const key = (prefix << 8) | k;
            const found = dict.get(key);
            if (found !== undefined) {
                prefix = found;
            } else {
                emit(prefix);
                if (nextCode < 4096) {
                    dict.set(key, nextCode++);
                    if (nextCode > (1 << codeSize) && codeSize < 12) {
                        codeSize++;
                    }
                } else {
                    emit(clearCode);
                    dict = new Map();
                    codeSize = minCodeSize + 1;
                    nextCode = eoiCode + 1;
                }
                prefix = k;
            }
        }

        emit(prefix);
        emit(eoiCode);
        if (bitCount > 0) {
            out.push(bitBuf & 0xFF);
        }
        return out;
    }

    /**
     * Genera y descarga un GIF animado transparente con los 4 fotogramas idle del gladiador
     */
    function exportGladiatorTransparentGIF(playerNum, gladiatorConfig) {
        const D = root.GladiatorData;
        const PA = root.GladiatorPixelArt;
        const SPRITE_W = D.SPRITE_W;
        const SPRITE_H = D.SPRITE_H;

        const config = gladiatorConfig || (root.GladiatorGame && root.GladiatorGame.getGladiator(playerNum));
        if (!config) {
            throw new Error(`No se encontró configuración para el gladiador ${playerNum}`);
        }

        const scale = 4; // 56*4 = 224px, 64*4 = 256px
        const outW = SPRITE_W * scale;
        const outH = SPRITE_H * scale;
        const numFrames = 4;

        // 1. Generar los 4 fotogramas en reposo sin sombra semitransparente
        const frames = [];
        for (let f = 0; f < numFrames; f++) {
            frames.push(PA.composeGladiatorPixelGrid(config, playerNum, 'idle', f, false));
        }

        // 2. Construir paleta global exacta (índice 0 = transparente)
        const colorMap = new Map();
        const palette = [[0, 0, 0]];

        function getColorIndex(cssColor) {
            if (!cssColor) return 0;
            if (colorMap.has(cssColor)) return colorMap.get(cssColor);
            const rgb = PA.parseHex(cssColor);
            if (!rgb || palette.length >= 256) return 0;
            const idx = palette.length;
            palette.push(rgb);
            colorMap.set(cssColor, idx);
            return idx;
        }

        const indexedFrames = frames.map(grid => {
            const pixels = new Uint8Array(outW * outH);
            for (let y = 0; y < SPRITE_H; y++) {
                for (let x = 0; x < SPRITE_W; x++) {
                    const idx = getColorIndex(grid.get(x, y));
                    if (idx === 0) continue;
                    for (let sy = 0; sy < scale; sy++) {
                        const rowOff = (y * scale + sy) * outW + x * scale;
                        for (let sx = 0; sx < scale; sx++) {
                            pixels[rowOff + sx] = idx;
                        }
                    }
                }
            }
            return pixels;
        });

        // 3. Calcular tamaño de la Global Color Table (potencia de 2)
        let gctExp = 2;
        while ((1 << gctExp) < palette.length && gctExp < 8) gctExp++;
        const gctSize = 1 << gctExp;
        const minCodeSize = Math.max(2, gctExp);

        const bytes = [];
        const pushStr = (s) => { for (let i = 0; i < s.length; i++) bytes.push(s.charCodeAt(i)); };
        const pushU16 = (v) => { bytes.push(v & 0xFF, (v >> 8) & 0xFF); };

        // Cabecera GIF89a
        pushStr('GIF89a');

        // Logical Screen Descriptor
        pushU16(outW);
        pushU16(outH);
        bytes.push(0x80 | ((gctExp - 1) << 4) | (gctExp - 1));
        bytes.push(0);
        bytes.push(0);

        // Global Color Table
        for (let i = 0; i < gctSize; i++) {
            const rgb = palette[i] || [0, 0, 0];
            bytes.push(rgb[0], rgb[1], rgb[2]);
        }

        // Extensión NETSCAPE2.0 para bucle infinito
        bytes.push(0x21, 0xFF, 0x0B);
        pushStr('NETSCAPE2.0');
        bytes.push(0x03, 0x01, 0x00, 0x00, 0x00);

        // Escribir cada fotograma con transparencia (Disposal Method 2)
        for (let f = 0; f < indexedFrames.length; f++) {
            bytes.push(0x21, 0xF9, 0x04);
            bytes.push(0x09); // Disposal=2, TransparentFlag=1
            pushU16(13);      // 130ms por fotograma (~7.7 FPS)
            bytes.push(0x00); // Índice transparente = 0
            bytes.push(0x00);

            bytes.push(0x2C);
            pushU16(0);
            pushU16(0);
            pushU16(outW);
            pushU16(outH);
            bytes.push(0x00);

            bytes.push(minCodeSize);
            const lzwBytes = encodeGIFLZW(indexedFrames[f], minCodeSize);
            let pos = 0;
            while (pos < lzwBytes.length) {
                const chunkLen = Math.min(255, lzwBytes.length - pos);
                bytes.push(chunkLen);
                for (let k = 0; k < chunkLen; k++) {
                    bytes.push(lzwBytes[pos++]);
                }
            }
            bytes.push(0x00);
        }

        // Trailer GIF
        bytes.push(0x3B);

        // Descargar archivo .gif
        const blob = new Blob([new Uint8Array(bytes)], { type: 'image/gif' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        const safeName = (config.name || `gladiador_${playerNum}`)
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-z0-9]+/g, '_');
        a.href = url;
        a.download = `gladiador_${safeName}_pixelart.gif`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 1500);
    }

    root.exportGladiatorTransparentGIF = exportGladiatorTransparentGIF;
    root.GladiatorGifExport = {
        encodeGIFLZW,
        exportGladiatorTransparentGIF
    };
})(typeof window !== 'undefined' ? window : globalThis);
