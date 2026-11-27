/**
 * radar/js/efectos.js
 * Efectos visuales en canvas: cenizas/chispas ascendentes de la mina
 * y partículas pixeladas de fuego y polvo dorado para la pantalla del cofre egipcio.
 */
(function (root) {
  'use strict';

  function initMineParticles() {
    const canvas = document.getElementById('mineParticlesCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let w = 0;
    let h = 0;
    const particles = [];

    function resize() {
      w = canvas.width = root.innerWidth;
      h = canvas.height = root.innerHeight;
    }
    resize();
    root.addEventListener('resize', resize);

    for (let i = 0; i < 46; i++) {
      particles.push({
        x: Math.random() * root.innerWidth,
        y: Math.random() * root.innerHeight,
        size: Math.random() > 0.6 ? 3 : 2,
        vy: -(Math.random() * 0.55 + 0.18),
        vx: (Math.random() - 0.5) * 0.3,
        alpha: Math.random() * 0.55 + 0.22,
        kind: Math.random() > 0.35 ? 'ember' : (Math.random() > 0.45 ? 'radar' : 'ash')
      });
    }

    function tick() {
      ctx.clearRect(0, 0, w, h);
      for (const p of particles) {
        p.y += p.vy;
        p.x += p.vx + Math.sin(p.y * 0.015) * 0.18;
        if (p.y < -10) {
          p.y = h + 10;
          p.x = Math.random() * w;
        }
        if (p.kind === 'ember') {
          ctx.fillStyle = `rgba(255, 135, 30, ${p.alpha})`;
        } else if (p.kind === 'radar') {
          ctx.fillStyle = `rgba(34, 211, 238, ${p.alpha * 0.6})`;
        } else {
          ctx.fillStyle = `rgba(180, 170, 160, ${p.alpha * 0.42})`;
        }
        // Píxeles cuadrados nítidos acorde a la estética 16-bit
        ctx.fillRect(Math.round(p.x), Math.round(p.y), p.size, p.size);
      }
      root.requestAnimationFrame(tick);
    }
    tick();
  }

  const VictoryFireCanvas = (() => {
    let animId = null;
    let particles = [];
    let resizeHandler = null;

    function createSpark(w, h, randomY) {
      const isGold = Math.random() > 0.4;
      const colors = isGold
        ? ['#fef08a', '#fde047', '#fbbf24', '#ffffff']
        : ['#f97316', '#ef4444', '#fb923c', '#facc15'];
      return {
        x: Math.random() * w,
        y: randomY ? Math.random() * h : h + Math.random() * 40,
        vx: (Math.random() - 0.5) * 1.15,
        vy: -(Math.random() * 2.5 + 0.9),
        size: isGold ? (Math.random() > 0.55 ? 4 : 3) : (Math.random() > 0.5 ? 5 : 3),
        alpha: Math.random() * 0.78 + 0.22,
        decay: Math.random() * 0.0045 + 0.0022,
        life: Math.random() * 100,
        isGold,
        isStar: isGold && Math.random() > 0.68,
        color: colors[Math.floor(Math.random() * colors.length)]
      };
    }

    function start() {
      const canvas = document.getElementById('victoryFireCanvas');
      if (!canvas) return;
      const ctx = canvas.getContext('2d');

      function resize() {
        canvas.width = root.innerWidth;
        canvas.height = root.innerHeight;
      }
      resize();
      if (resizeHandler) root.removeEventListener('resize', resizeHandler);
      resizeHandler = resize;
      root.addEventListener('resize', resizeHandler);

      particles = Array.from({ length: 105 }, () => createSpark(canvas.width, canvas.height, true));

      function loop() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        const grad = ctx.createLinearGradient(0, canvas.height, 0, canvas.height * 0.55);
        grad.addColorStop(0, 'rgba(234, 88, 12, 0.40)');
        grad.addColorStop(0.5, 'rgba(180, 83, 9, 0.14)');
        grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, canvas.height * 0.55, canvas.width, canvas.height * 0.45);

        for (let i = 0; i < particles.length; i++) {
          const p = particles[i];
          p.x += p.vx + Math.sin(p.life * 0.05) * 0.6;
          p.y += p.vy;
          p.life++;
          p.alpha -= p.decay;

          if (p.alpha <= 0 || p.y < -20) {
            particles[i] = createSpark(canvas.width, canvas.height, false);
            continue;
          }

          ctx.save();
          ctx.globalAlpha = Math.max(0, p.alpha);
          ctx.fillStyle = p.color;
          ctx.shadowBlur = p.isGold ? 10 : 7;
          ctx.shadowColor = p.color;

          const rx = Math.round(p.x);
          const ry = Math.round(p.y);
          if (p.isStar) {
            // Destello pixel-art en cruz (+)
            const s = p.size;
            ctx.fillRect(rx - s, ry, s * 3, s);
            ctx.fillRect(rx, ry - s, s, s * 3);
          } else {
            ctx.fillRect(rx, ry, p.size, p.size);
          }
          ctx.restore();
        }

        animId = root.requestAnimationFrame(loop);
      }

      if (animId) root.cancelAnimationFrame(animId);
      loop();
    }

    function stop() {
      if (animId) {
        root.cancelAnimationFrame(animId);
        animId = null;
      }
      if (resizeHandler) {
        root.removeEventListener('resize', resizeHandler);
        resizeHandler = null;
      }
    }

    return { start, stop };
  })();

  root.RadarEffects = {
    initMineParticles,
    VictoryFireCanvas
  };
})(typeof window !== 'undefined' ? window : globalThis);
