/**
 * Espacial/js/audio.js
 * Sintetizador de efectos retro sci-fi 16-bit con Web Audio API (sin archivos externos).
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
      osc.frequency.setValueAtTime(660, now);
      osc.frequency.exponentialRampToValueAtTime(1040, now + 0.045);
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.004, now + 0.055);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.06);
    } else if (type === 'laser') {
      [0, 0.06].forEach((offset) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(1480, now + offset);
        osc.frequency.exponentialRampToValueAtTime(240, now + offset + 0.19);
        gain.gain.setValueAtTime(0.18, now + offset);
        gain.gain.exponentialRampToValueAtTime(0.008, now + offset + 0.2);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + offset);
        osc.stop(now + offset + 0.21);
      });
    } else if (type === 'plasma') {
      const osc = ctx.createOscillator();
      const sub = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'square';
      sub.type = 'triangle';
      osc.frequency.setValueAtTime(480, now);
      osc.frequency.exponentialRampToValueAtTime(92, now + 0.28);
      sub.frequency.setValueAtTime(240, now);
      sub.frequency.exponentialRampToValueAtTime(52, now + 0.28);
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.008, now + 0.3);
      osc.connect(gain);
      sub.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      sub.start(now);
      osc.stop(now + 0.31);
      sub.stop(now + 0.31);
    } else if (type === 'missile') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(300, now);
      osc.frequency.exponentialRampToValueAtTime(55, now + 0.34);
      gain.gain.setValueAtTime(0.32, now);
      gain.gain.exponentialRampToValueAtTime(0.008, now + 0.36);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.37);

      const noise = ctx.createBufferSource();
      noise.buffer = createNoiseBuffer(ctx, 0.32);
      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(900, now);
      filter.frequency.exponentialRampToValueAtTime(280, now + 0.3);
      const nGain = ctx.createGain();
      nGain.gain.setValueAtTime(0.16, now);
      nGain.gain.exponentialRampToValueAtTime(0.006, now + 0.32);
      noise.connect(filter);
      filter.connect(nGain);
      nGain.connect(ctx.destination);
      noise.start(now);
      noise.stop(now + 0.32);
    } else if (type === 'explosion' || type === 'hit') {
      const noise = ctx.createBufferSource();
      noise.buffer = createNoiseBuffer(ctx, 0.38);
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(1400, now);
      filter.frequency.exponentialRampToValueAtTime(140, now + 0.36);
      const nGain = ctx.createGain();
      nGain.gain.setValueAtTime(0.28, now);
      nGain.gain.exponentialRampToValueAtTime(0.008, now + 0.38);
      noise.connect(filter);
      filter.connect(nGain);
      nGain.connect(ctx.destination);
      noise.start(now);
      noise.stop(now + 0.38);

      const thud = ctx.createOscillator();
      const tGain = ctx.createGain();
      thud.type = 'sine';
      thud.frequency.setValueAtTime(150, now);
      thud.frequency.exponentialRampToValueAtTime(38, now + 0.24);
      tGain.gain.setValueAtTime(0.32, now);
      tGain.gain.exponentialRampToValueAtTime(0.008, now + 0.26);
      thud.connect(tGain);
      tGain.connect(ctx.destination);
      thud.start(now);
      thud.stop(now + 0.27);
    } else if (type === 'miss') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(360, now);
      osc.frequency.linearRampToValueAtTime(135, now + 0.28);
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.008, now + 0.3);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.31);
    } else if (type === 'tick') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(980, now);
      gain.gain.setValueAtTime(0.09, now);
      gain.gain.exponentialRampToValueAtTime(0.004, now + 0.055);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.06);
    } else if (type === 'timeout') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(220, now);
      osc.frequency.exponentialRampToValueAtTime(72, now + 0.48);
      gain.gain.setValueAtTime(0.22, now);
      gain.gain.exponentialRampToValueAtTime(0.008, now + 0.5);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.52);
    } else if (type === 'victory') {
      const notes = [523.25, 659.25, 783.99, 1046.5, 1318.5];
      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = i === notes.length - 1 ? 'square' : 'triangle';
        const start = now + i * 0.11;
        const dur = i === notes.length - 1 ? 0.55 : 0.32;
        osc.frequency.setValueAtTime(freq, start);
        gain.gain.setValueAtTime(0.18, start);
        gain.gain.exponentialRampToValueAtTime(0.008, start + dur);
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

  function setEnabled(val) {
    enabled = Boolean(val);
    return enabled;
  }

  function toggle() {
    enabled = !enabled;
    if (enabled) play('click');
    return enabled;
  }

  root.EspacialAudio = {
    play,
    isEnabled,
    setEnabled,
    toggle
  };
})(typeof window !== 'undefined' ? window : globalThis);
