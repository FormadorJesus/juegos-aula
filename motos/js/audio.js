/**
 * motos/js/audio.js
 * Sintetizador de efectos arcade 16-bit de carreras de motos con Web Audio API.
 */
(function (root) {
  'use strict';

  let audioCtx = null;
  let enabled = true;

  function ensureAudio() {
    if (!audioCtx) {
      const AC = root.AudioContext || root.webkitAudioContext;
      if (AC) {
        try {
          audioCtx = new AC();
        } catch (_) {
          audioCtx = null;
        }
      }
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume().catch(() => {});
    }
    return audioCtx;
  }

  function createNoiseBuffer(ctx, durationSec) {
    const length = Math.max(1, Math.floor(ctx.sampleRate * durationSec));
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    return buffer;
  }

  function play(type) {
    if (!enabled) return;
    const ctx = ensureAudio();
    if (!ctx) return;

    const now = ctx.currentTime;

    if (type === 'click') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(620, now);
      osc.frequency.exponentialRampToValueAtTime(980, now + 0.04);
      gain.gain.setValueAtTime(0.07, now);
      gain.gain.exponentialRampToValueAtTime(0.004, now + 0.05);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.055);
    } else if (type === 'rev') {
      // Acelerón breve de moto de 2 tiempos / MotoGP
      const osc = ctx.createOscillator();
      const sub = ctx.createOscillator();
      const filter = ctx.createBiquadFilter();
      const gain = ctx.createGain();

      osc.type = 'sawtooth';
      sub.type = 'square';
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(520, now);
      filter.frequency.exponentialRampToValueAtTime(1450, now + 0.14);
      filter.frequency.exponentialRampToValueAtTime(420, now + 0.28);

      osc.frequency.setValueAtTime(110, now);
      osc.frequency.exponentialRampToValueAtTime(295, now + 0.14);
      osc.frequency.exponentialRampToValueAtTime(130, now + 0.28);

      sub.frequency.setValueAtTime(55, now);
      sub.frequency.exponentialRampToValueAtTime(148, now + 0.14);
      sub.frequency.exponentialRampToValueAtTime(65, now + 0.28);

      gain.gain.setValueAtTime(0.01, now);
      gain.gain.linearRampToValueAtTime(0.14, now + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.006, now + 0.29);

      osc.connect(filter);
      sub.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      sub.start(now);
      osc.stop(now + 0.3);
      sub.stop(now + 0.3);
    } else if (type === 'light') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(440, now);
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.005, now + 0.12);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.13);
    } else if (type === 'go') {
      // Semáforo verde + salida acelerando
      const beep = ctx.createOscillator();
      const bGain = ctx.createGain();
      beep.type = 'square';
      beep.frequency.setValueAtTime(880, now);
      bGain.gain.setValueAtTime(0.13, now);
      bGain.gain.exponentialRampToValueAtTime(0.006, now + 0.22);
      beep.connect(bGain);
      bGain.connect(ctx.destination);
      beep.start(now);
      beep.stop(now + 0.23);

      const eng = ctx.createOscillator();
      const filter = ctx.createBiquadFilter();
      const eGain = ctx.createGain();
      eng.type = 'sawtooth';
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(700, now + 0.04);
      filter.frequency.exponentialRampToValueAtTime(1900, now + 0.35);
      eng.frequency.setValueAtTime(135, now + 0.04);
      eng.frequency.exponentialRampToValueAtTime(380, now + 0.35);
      eGain.gain.setValueAtTime(0.09, now + 0.04);
      eGain.gain.exponentialRampToValueAtTime(0.006, now + 0.38);
      eng.connect(filter);
      filter.connect(eGain);
      eGain.connect(ctx.destination);
      eng.start(now + 0.04);
      eng.stop(now + 0.39);
    } else if (type === 'boost') {
      // Acierto: cambio de marcha + campanilla de sector completado
      const notes = [523.25, 659.25, 783.99, 1046.5];
      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = i === 3 ? 'square' : 'triangle';
        const t = now + i * 0.055;
        osc.frequency.setValueAtTime(freq, t);
        gain.gain.setValueAtTime(0.13, t);
        gain.gain.exponentialRampToValueAtTime(0.006, t + 0.18);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(t);
        osc.stop(t + 0.19);
      });

      // Zumbido turbo breve
      const eng = ctx.createOscillator();
      const eGain = ctx.createGain();
      eng.type = 'sawtooth';
      eng.frequency.setValueAtTime(180, now);
      eng.frequency.exponentialRampToValueAtTime(420, now + 0.24);
      eGain.gain.setValueAtTime(0.06, now);
      eGain.gain.exponentialRampToValueAtTime(0.004, now + 0.26);
      eng.connect(eGain);
      eGain.connect(ctx.destination);
      eng.start(now);
      eng.stop(now + 0.27);
    } else if (type === 'skid') {
      // Fallo: derrape + frenazo de motor
      const noise = ctx.createBufferSource();
      noise.buffer = createNoiseBuffer(ctx, 0.32);
      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(2100, now);
      filter.frequency.exponentialRampToValueAtTime(920, now + 0.3);
      filter.Q.value = 3.2;
      const nGain = ctx.createGain();
      nGain.gain.setValueAtTime(0.16, now);
      nGain.gain.exponentialRampToValueAtTime(0.005, now + 0.32);
      noise.connect(filter);
      filter.connect(nGain);
      nGain.connect(ctx.destination);
      noise.start(now);
      noise.stop(now + 0.33);

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(260, now);
      osc.frequency.exponentialRampToValueAtTime(92, now + 0.34);
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.006, now + 0.36);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.37);
    } else if (type === 'victory') {
      const notes = [523.25, 659.25, 783.99, 1046.5, 783.99, 1046.5, 1318.5];
      const times = [0, 0.1, 0.2, 0.32, 0.48, 0.58, 0.72];
      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = i >= 5 ? 'square' : 'triangle';
        const start = now + times[i];
        const dur = i === notes.length - 1 ? 0.55 : 0.22;
        osc.frequency.setValueAtTime(freq, start);
        gain.gain.setValueAtTime(0.15, start);
        gain.gain.exponentialRampToValueAtTime(0.006, start + dur);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(start);
        osc.stop(start + dur + 0.02);
      });
    }
  }

  function isEnabled() {
    return enabled;
  }

  function toggle() {
    enabled = !enabled;
    if (enabled) play('click');
    return enabled;
  }

  root.MotosAudio = {
    play,
    isEnabled,
    toggle
  };
})(typeof window !== 'undefined' ? window : globalThis);
