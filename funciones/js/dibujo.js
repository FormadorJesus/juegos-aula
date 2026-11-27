/* ==========================================================================
   HERRAMIENTA INTEGRADA DE PIZARRA (MODO LÁPIZ SOBRE TODA LA PANTALLA)
   ========================================================================== */

const WhiteboardTool = (() => {
  let drawCanvas = null;
  let drawCtx = null;
  let drawToolbar = null;
  let btnQuickClearInk = null;
  let btnPencil = null;

  const drawState = {
    active: false,
    drawing: false,
    color: '#ffd000',
    eraser: false,
    hasInk: false,
    lastX: 0,
    lastY: 0
  };

  function resize() {
    if (!drawCanvas || !drawCtx) return;
    // Preservamos el dibujo actual al redimensionar si existe
    const temp = document.createElement('canvas');
    temp.width = drawCanvas.width;
    temp.height = drawCanvas.height;
    if (temp.width > 0 && temp.height > 0) {
      temp.getContext('2d').drawImage(drawCanvas, 0, 0);
    }
    drawCanvas.width = window.innerWidth;
    drawCanvas.height = window.innerHeight;
    if (temp.width > 0 && temp.height > 0) {
      drawCtx.drawImage(temp, 0, 0);
    }
  }

  function setPencilMode(active) {
    drawState.active = active;
    drawCanvas.classList.toggle('active', active);
    drawToolbar.classList.toggle('show', active);
    if (btnPencil) {
      btnPencil.textContent = active ? '✅ Cerrar Lápiz' : '✏️ Modo Lápiz';
    }
    btnQuickClearInk.classList.toggle('show', !active && drawState.hasInk);
  }

  function clearDrawing() {
    if (!drawCtx || !drawCanvas) return;
    drawCtx.clearRect(0, 0, drawCanvas.width, drawCanvas.height);
    drawState.hasInk = false;
    btnQuickClearInk.classList.remove('show');
  }

  function isActive() {
    return drawState.active;
  }

  function init(pencilButtonEl) {
    drawCanvas = document.getElementById('drawCanvas');
    drawCtx = drawCanvas.getContext('2d');
    drawToolbar = document.getElementById('drawToolbar');
    btnQuickClearInk = document.getElementById('btnQuickClearInk');
    btnPencil = pencilButtonEl || document.getElementById('btnPencil');

    resize();

    drawCanvas.addEventListener('pointerdown', (e) => {
      if (!drawState.active) return;
      drawState.drawing = true;
      drawState.hasInk = true;
      drawState.lastX = e.clientX;
      drawState.lastY = e.clientY;
      drawCanvas.setPointerCapture(e.pointerId);
    });

    drawCanvas.addEventListener('pointermove', (e) => {
      if (!drawState.drawing || !drawState.active) return;
      drawCtx.save();
      drawCtx.lineCap = 'round';
      drawCtx.lineJoin = 'round';
      if (drawState.eraser) {
        drawCtx.globalCompositeOperation = 'destination-out';
        drawCtx.lineWidth = 30;
      } else {
        drawCtx.globalCompositeOperation = 'source-over';
        drawCtx.strokeStyle = drawState.color;
        drawCtx.lineWidth = 5;
        drawCtx.shadowColor = drawState.color;
        drawCtx.shadowBlur = 4;
      }
      drawCtx.beginPath();
      drawCtx.moveTo(drawState.lastX, drawState.lastY);
      drawCtx.lineTo(e.clientX, e.clientY);
      drawCtx.stroke();
      drawCtx.restore();

      drawState.lastX = e.clientX;
      drawState.lastY = e.clientY;
    });

    drawCanvas.addEventListener('pointerup', () => { drawState.drawing = false; });
    drawCanvas.addEventListener('pointercancel', () => { drawState.drawing = false; });

    document.querySelectorAll('.color-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        drawState.eraser = false;
        drawState.color = btn.dataset.color;
        document.querySelectorAll('.color-btn').forEach((b) => b.classList.remove('selected'));
        btn.classList.add('selected');
        document.getElementById('btnEraser').classList.remove('selected');
      });
    });

    document.getElementById('btnEraser').addEventListener('click', (e) => {
      drawState.eraser = !drawState.eraser;
      e.currentTarget.classList.toggle('selected', drawState.eraser);
    });

    document.getElementById('btnClearDraw').addEventListener('click', clearDrawing);
    document.getElementById('btnCloseDraw').addEventListener('click', () => setPencilMode(false));
    btnQuickClearInk.addEventListener('click', clearDrawing);
    if (btnPencil) {
      btnPencil.addEventListener('click', () => setPencilMode(!drawState.active));
    }
  }

  return {
    init,
    resize,
    setPencilMode,
    clearDrawing,
    isActive
  };
})();
