/**
 * radar/js/audio.js
 * Motor de sonido sintetizado (Web Audio API):
 * pings de radar, alertas de desvío, pulso de escáner y fanfarria egipcia épica.
 */
(function (root) {
  'use strict';

  const SoundEngine = (() => {
    let ctx = null;
    let masterGain = null;
    let victoryTimers = [];
    let isVictoryPlaying = false;
    let isVictoryMuted = false;
    let soundEnabled = true;
    let onSoundEnableCallback = null;

    function isEnabled() {
      return soundEnabled;
    }

    function setEnabled(val) {
      soundEnabled = Boolean(val);
    }

    function setOnEnableCallback(fn) {
      onSoundEnableCallback = typeof fn === 'function' ? fn : null;
    }

    function ensureCtx() {
      if (!ctx) {
        const AudioCtx = root.AudioContext || root.webkitAudioContext;
        if (!AudioCtx) return null;
        ctx = new AudioCtx();
        masterGain = ctx.createGain();
        masterGain.gain.value = 0.72;
        masterGain.connect(ctx.destination);
      }
      if (ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
      }
      return ctx;
    }

    function playTone(freq, startTime, duration, type = 'sine', volume = 0.18) {
      const audio = ensureCtx();
      if (!audio || !masterGain) return;
      const osc = audio.createOscillator();
      const gain = audio.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, startTime);

      gain.gain.setValueAtTime(0.0001, startTime);
      gain.gain.linearRampToValueAtTime(volume, startTime + 0.018);
      gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

      osc.connect(gain);
      gain.connect(masterGain);
      osc.start(startTime);
      osc.stop(startTime + duration + 0.03);
    }

    // Pulso breve de escáner al abrir un reto de tramo
    function playScanBeep() {
      if (!soundEnabled) return;
      const audio = ensureCtx();
      if (!audio) return;
      const t = audio.currentTime;
      playTone(660, t, 0.09, 'sine', 0.12);
      playTone(990, t + 0.06, 0.12, 'triangle', 0.11);
    }

    // Ping de radar verde + acorde limpio al acertar exacto
    function playExactRadar() {
      if (!soundEnabled) return;
      const audio = ensureCtx();
      if (!audio) return;
      const t = audio.currentTime;
      playTone(880, t, 0.16, 'sine', 0.2);
      playTone(1318.5, t + 0.09, 0.28, 'sine', 0.22);
      playTone(1760, t + 0.18, 0.35, 'triangle', 0.14);
    }

    // Alerta grave de desvío / desprendimiento
    function playErrorAlert() {
      if (!soundEnabled) return;
      const audio = ensureCtx();
      if (!audio) return;
      const t = audio.currentTime;
      playTone(175, t, 0.22, 'sawtooth', 0.14);
      playTone(130.8, t + 0.12, 0.30, 'sawtooth', 0.15);
    }

    // Sonido suave de deshacer
    function playUndo() {
      if (!soundEnabled) return;
      const audio = ensureCtx();
      if (!audio) return;
      const t = audio.currentTime;
      playTone(440, t, 0.1, 'sine', 0.11);
      playTone(330, t + 0.06, 0.14, 'sine', 0.10);
    }

    // Metales sintetizados para la fanfarria épica
    function playBrass(freq, startTime, duration, volume = 0.14) {
      const audio = ensureCtx();
      if (!audio || !masterGain || isVictoryMuted) return;

      const osc1 = audio.createOscillator();
      const osc2 = audio.createOscillator();
      const filter = audio.createBiquadFilter();
      const gain = audio.createGain();

      osc1.type = 'sawtooth';
      osc2.type = 'triangle';
      osc1.frequency.setValueAtTime(freq, startTime);
      osc2.frequency.setValueAtTime(freq * 1.004, startTime);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(600, startTime);
      filter.frequency.exponentialRampToValueAtTime(2500, startTime + 0.08);
      filter.frequency.exponentialRampToValueAtTime(1150, startTime + duration);

      gain.gain.setValueAtTime(0.0001, startTime);
      gain.gain.linearRampToValueAtTime(volume, startTime + 0.045);
      gain.gain.setValueAtTime(volume * 0.85, startTime + Math.max(0.06, duration - 0.1));
      gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

      osc1.connect(filter);
      osc2.connect(filter);
      filter.connect(gain);
      gain.connect(masterGain);

      osc1.start(startTime);
      osc2.start(startTime);
      osc1.stop(startTime + duration + 0.05);
      osc2.stop(startTime + duration + 0.05);
    }

    // Timbal épico
    function playTimpani(freq, startTime, volume = 0.28) {
      const audio = ensureCtx();
      if (!audio || !masterGain || isVictoryMuted) return;
      const osc = audio.createOscillator();
      const gain = audio.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq * 1.38, startTime);
      osc.frequency.exponentialRampToValueAtTime(freq, startTime + 0.08);

      gain.gain.setValueAtTime(0.001, startTime);
      gain.gain.linearRampToValueAtTime(volume, startTime + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.55);

      osc.connect(gain);
      gain.connect(masterGain);
      osc.start(startTime);
      osc.stop(startTime + 0.6);
    }

    // Destello de arpa / coro brillante
    function playChoirSparkle(freq, startTime, volume = 0.1) {
      const audio = ensureCtx();
      if (!audio || !masterGain || isVictoryMuted) return;
      playTone(freq, startTime, 0.55, 'sine', volume);
      playTone(freq * 2, startTime, 0.28, 'triangle', volume * 0.35);
    }

    // Fanfarria triunfal con toque egipcio resolviendo a acorde mayor majestuoso
    function playVictoryFanfare() {
      stopVictoryMusic();
      if (!soundEnabled) {
        isVictoryMuted = true;
        updateVictoryMuteUI();
        return;
      }
      const audio = ensureCtx();
      if (!audio) return;

      isVictoryMuted = false;
      isVictoryPlaying = true;
      updateVictoryMuteUI();

      const melody = [
        { f: 293.66, t: 0.00, d: 0.26, v: 0.16 }, // D4
        { f: 440.00, t: 0.28, d: 0.26, v: 0.17 }, // A4
        { f: 466.16, t: 0.56, d: 0.22, v: 0.17 }, // Bb4 (matiz egipcio)
        { f: 440.00, t: 0.80, d: 0.44, v: 0.18 }, // A4

        { f: 369.99, t: 1.32, d: 0.24, v: 0.16 }, // F#4
        { f: 392.00, t: 1.58, d: 0.24, v: 0.16 }, // G4
        { f: 440.00, t: 1.84, d: 0.24, v: 0.18 }, // A4
        { f: 587.33, t: 2.10, d: 0.65, v: 0.21 }, // D5

        { f: 554.37, t: 2.82, d: 0.24, v: 0.17 }, // C#5
        { f: 587.33, t: 3.08, d: 0.24, v: 0.18 }, // D5
        { f: 659.25, t: 3.34, d: 0.30, v: 0.19 }, // E5
        { f: 739.99, t: 3.68, d: 0.50, v: 0.21 }, // F#5

        { f: 587.33, t: 4.26, d: 0.20, v: 0.18 }, // D5
        { f: 739.99, t: 4.48, d: 0.20, v: 0.19 }, // F#5
        { f: 880.00, t: 4.70, d: 0.85, v: 0.22 }, // A5
        { f: 739.99, t: 5.62, d: 0.24, v: 0.18 }, // F#5
        { f: 880.00, t: 5.88, d: 0.24, v: 0.19 }, // A5
        { f: 1174.66, t: 6.16, d: 1.50, v: 0.22 } // D6
      ];

      const chords = [
        { notes: [146.83, 220.00], t: 0.00, d: 1.25 },
        { notes: [146.83, 185.00, 220.00], t: 1.32, d: 1.40 },
        { notes: [196.00, 246.94, 293.66], t: 2.82, d: 1.35 },
        { notes: [110.00, 220.00, 277.18], t: 4.26, d: 1.30 },
        { notes: [146.83, 220.00, 293.66, 369.99], t: 5.62, d: 2.10 }
      ];

      const drums = [
        { f: 73.42, t: 0.00 }, { f: 73.42, t: 0.28 }, { f: 110.0, t: 0.80 },
        { f: 73.42, t: 1.32 }, { f: 110.0, t: 2.10 },
        { f: 98.00, t: 2.82 }, { f: 110.0, t: 3.68 },
        { f: 73.42, t: 4.26 }, { f: 110.0, t: 4.70 },
        { f: 73.42, t: 5.62 }, { f: 73.42, t: 5.88 }, { f: 73.42, t: 6.16 }
      ];

      const harp = [587.33, 739.99, 880.00, 1174.66, 1479.98, 1760.00];

      melody.forEach(n => {
        victoryTimers.push(setTimeout(() => {
          if (isVictoryPlaying && !isVictoryMuted) playBrass(n.f, audio.currentTime, n.d, n.v);
        }, n.t * 1000));
      });

      chords.forEach(ch => {
        victoryTimers.push(setTimeout(() => {
          if (isVictoryPlaying && !isVictoryMuted) {
            ch.notes.forEach(f => playBrass(f, audio.currentTime, ch.d, 0.075));
          }
        }, ch.t * 1000));
      });

      drums.forEach(d => {
        victoryTimers.push(setTimeout(() => {
          if (isVictoryPlaying && !isVictoryMuted) playTimpani(d.f, audio.currentTime, 0.25);
        }, d.t * 1000));
      });

      [2.10, 4.70, 6.16].forEach(baseT => {
        harp.forEach((f, idx) => {
          victoryTimers.push(setTimeout(() => {
            if (isVictoryPlaying && !isVictoryMuted) playChoirSparkle(f, audio.currentTime, 0.085);
          }, (baseT + idx * 0.085) * 1000));
        });
      });

      victoryTimers.push(setTimeout(() => {
        isVictoryPlaying = false;
      }, 8200));
    }

    function stopVictoryMusic() {
      isVictoryPlaying = false;
      victoryTimers.forEach(id => clearTimeout(id));
      victoryTimers = [];
    }

    function toggleVictoryMute() {
      isVictoryMuted = !isVictoryMuted;
      if (isVictoryMuted) {
        stopVictoryMusic();
      } else {
        soundEnabled = true;
        if (onSoundEnableCallback) onSoundEnableCallback(true);
        playVictoryFanfare();
      }
      updateVictoryMuteUI();
    }

    function updateVictoryMuteUI() {
      const icon = document.getElementById('victoryMuteIcon');
      const label = document.getElementById('victoryMuteLabel');
      if (!icon || !label) return;
      icon.textContent = isVictoryMuted ? '🔇' : '🔊';
      label.textContent = isVictoryMuted ? 'Activar música' : 'Silenciar';
    }

    return {
      isEnabled,
      setEnabled,
      setOnEnableCallback,
      playScanBeep,
      playExactRadar,
      playErrorAlert,
      playUndo,
      playVictoryFanfare,
      stopVictoryMusic,
      toggleVictoryMute
    };
  })();

  root.SoundEngine = SoundEngine;
})(typeof window !== 'undefined' ? window : globalThis);
