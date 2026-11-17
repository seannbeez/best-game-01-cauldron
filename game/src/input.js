// input.js — mouse, touch and keyboard input, translated into game coordinates.
// One file, one job: raw events in, game handlers called. The game owns the meaning
// of every press (buttons, sling drag, hotbar keys); this file only delivers events.

export function createInput(canvas, game) {
  function toLogical(e) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const cx = (e.clientX - rect.left) * scaleX;
    const cy = (e.clientY - rect.top) * scaleY;
    return { x: cx, y: cy };
  }

  canvas.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    const p = toLogical(e);
    game.onPointerDown(p.x, p.y, e.pointerId);
  });
  canvas.addEventListener('pointermove', (e) => {
    const p = toLogical(e);
    game.onPointerMove(p.x, p.y, e.pointerId);
  });
  canvas.addEventListener('pointerup', (e) => {
    const p = toLogical(e);
    game.onPointerUp(p.x, p.y, e.pointerId);
  });
  canvas.addEventListener('pointercancel', (e) => {
    game.onPointerCancel(e.pointerId);
  });
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());

  window.addEventListener('keydown', (e) => {
    if (e.repeat) return;
    game.onKey(e.key);
  });
}
