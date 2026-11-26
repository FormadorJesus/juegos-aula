/**
 * js/audio.js
 * Sintetizador de efectos de sonido con Web Audio API (100% offline, sin archivos MP3).
 */
window.HeroMath = window.HeroMath || {};

window.HeroMath.Audio = (function() {
  let ctx = null;
  let enabled = true;

  function getCtx() {
    if (!ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) ctx = new AudioCtx();
    }
    if (ctx && ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  function tone(freq, duration, type = 'sine', vol = 0.14, delay = 0) {
    if (!enabled) return;
    const c = getCtx();
    if (!c) return;
    const now = c.currentTime + delay;
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(vol, now + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    osc.connect(gain);
    gain.connect(c.destination);
    osc.start(now);
    osc.stop(now + duration + 0.02);
  }

  return {
    toggle() { enabled = !enabled; return enabled; },
    isEnabled() { return enabled; },
    dice() {
      for (let i = 0; i < 5; i++) tone(240 + Math.random() * 260, 0.05, 'triangle', 0.1, i * 0.055);
    },
    step() { tone(190, 0.06, 'triangle', 0.1); },
    door() {
      tone(140, 0.16, 'sawtooth', 0.09, 0);
      tone(195, 0.2, 'triangle', 0.1, 0.1);
    },
    hit() {
      tone(130, 0.14, 'sawtooth', 0.18, 0);
      tone(85, 0.18, 'square', 0.14, 0.06);
    },
    shield() {
      tone(520, 0.1, 'triangle', 0.14, 0);
      tone(780, 0.16, 'sine', 0.14, 0.08);
    },
    coin() {
      tone(880, 0.09, 'sine', 0.14, 0);
      tone(1320, 0.18, 'sine', 0.14, 0.08);
    },
    fail() {
      tone(220, 0.18, 'sawtooth', 0.14, 0);
      tone(155, 0.28, 'sawtooth', 0.14, 0.15);
    },
    tick() { tone(660, 0.04, 'square', 0.06); },
    victory() {
      const notes = [523, 659, 784, 1046];
      notes.forEach((n, i) => tone(n, 0.24, 'triangle', 0.16, i * 0.12));
    }
  };
})();
