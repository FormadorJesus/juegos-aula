/**
 * Gladiadores/js/audio.js
 * Sistema de audio sintetizado retro (Web Audio API) para el Coliseo Matemático.
 */
(function (root) {
    'use strict';

    let audioCtx = null;
    let enabled = true;

    function ensureAudio() {
        if (!audioCtx) {
            const AC = root.AudioContext || root.webkitAudioContext;
            if (AC) audioCtx = new AC();
        }
        if (audioCtx && audioCtx.state === 'suspended') {
            audioCtx.resume().catch(() => {});
        }
        return audioCtx;
    }

    function setSoundEnabled(flag) {
        enabled = Boolean(flag);
    }

    function isSoundEnabled() {
        return enabled;
    }

    function playSfx(type) {
        if (!enabled) return;
        const ctx = ensureAudio();
        if (!ctx) return;

        const now = ctx.currentTime;

        if (type === 'click') {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(620, now);
            gain.gain.setValueAtTime(0.12, now);
            gain.gain.exponentialRampToValueAtTime(0.005, now + 0.06);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now);
            osc.stop(now + 0.06);
        } else if (type === 'sword') {
            // Tajo metálico + chispa aguda
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(820, now);
            osc.frequency.exponentialRampToValueAtTime(190, now + 0.22);
            gain.gain.setValueAtTime(0.26, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.24);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now);
            osc.stop(now + 0.24);

            const ring = ctx.createOscillator();
            const rGain = ctx.createGain();
            ring.type = 'triangle';
            ring.frequency.setValueAtTime(1840, now + 0.03);
            ring.frequency.exponentialRampToValueAtTime(920, now + 0.18);
            rGain.gain.setValueAtTime(0.12, now + 0.03);
            rGain.gain.exponentialRampToValueAtTime(0.005, now + 0.19);
            ring.connect(rGain);
            rGain.connect(ctx.destination);
            ring.start(now + 0.03);
            ring.stop(now + 0.19);
        } else if (type === 'mace') {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(175, now);
            osc.frequency.exponentialRampToValueAtTime(36, now + 0.32);
            gain.gain.setValueAtTime(0.45, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.34);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now);
            osc.stop(now + 0.34);
        } else if (type === 'spear') {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(1040, now);
            osc.frequency.exponentialRampToValueAtTime(240, now + 0.18);
            gain.gain.setValueAtTime(0.3, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now);
            osc.stop(now + 0.2);
        } else if (type === 'miss') {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(310, now);
            osc.frequency.linearRampToValueAtTime(135, now + 0.32);
            gain.gain.setValueAtTime(0.24, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now);
            osc.stop(now + 0.35);
        } else if (type === 'tick') {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(880, now);
            gain.gain.setValueAtTime(0.15, now);
            gain.gain.exponentialRampToValueAtTime(0.005, now + 0.07);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now);
            osc.stop(now + 0.07);
        } else if (type === 'timeout') {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(185, now);
            osc.frequency.exponentialRampToValueAtTime(60, now + 0.55);
            gain.gain.setValueAtTime(0.38, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.58);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now);
            osc.stop(now + 0.58);
        } else if (type === 'victory') {
            [523.25, 659.25, 783.99, 1046.50].forEach((freq, i) => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(freq, now + i * 0.14);
                gain.gain.setValueAtTime(0.26, now + i * 0.14);
                gain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.14 + 0.42);
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.start(now + i * 0.14);
                osc.stop(now + i * 0.14 + 0.42);
            });
        }
    }

    root.GladiatorAudio = {
        ensureAudio,
        setSoundEnabled,
        isSoundEnabled,
        playSfx
    };
})(typeof window !== 'undefined' ? window : globalThis);
