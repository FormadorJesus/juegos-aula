/* ==========================================================================
   SINTETIZADOR DE AUDIO (WEB AUDIO API - SIN ARCHIVOS EXTERNOS)
   ========================================================================== */

const SoundFX = (() => {
  let ctx = null;
  let muted = false;

  function ensureCtx() {
    if (muted) return null;
    if (!ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) ctx = new AudioCtx();
    }
    if (ctx && ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
    return ctx;
  }

  function tone(freq, duration, type = 'sine', gainVal = 0.14, freqEnd = null, delay = 0) {
    const c = ensureCtx();
    if (!c) return;
    const now = c.currentTime + delay;
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    if (freqEnd !== null) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(20, freqEnd), now + duration);
    }
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(gainVal, now + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    osc.connect(gain);
    gain.connect(c.destination);
    osc.start(now);
    osc.stop(now + duration + 0.02);
  }

  return {
    toggleMute() {
      muted = !muted;
      return muted;
    },
    click() {
      tone(680, 0.055, 'triangle', 0.09, 420);
    },
    launch() {
      tone(160, 0.45, 'sawtooth', 0.12, 620);
      tone(90, 0.45, 'triangle', 0.14, 240);
    },
    success() {
      tone(523.25, 0.14, 'triangle', 0.16, null, 0);
      tone(659.25, 0.14, 'triangle', 0.16, null, 0.1);
      tone(783.99, 0.16, 'triangle', 0.16, null, 0.2);
      tone(1046.5, 0.32, 'sine', 0.18, null, 0.3);
    },
    impact() {
      tone(170, 0.32, 'sawtooth', 0.22, 42);
      tone(110, 0.38, 'square', 0.14, 30, 0.04);
    },
    warp() {
      tone(220, 0.65, 'sine', 0.16, 1760);
      tone(330, 0.65, 'triangle', 0.12, 1320, 0.05);
      tone(880, 0.35, 'sine', 0.14, 1760, 0.42);
    },
    reveal() {
      tone(440, 0.18, 'sine', 0.1, 880);
    }
  };
})();
