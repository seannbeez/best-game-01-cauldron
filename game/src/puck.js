// puck.js — the enchanted ink-puck: sling physics, wall ricochets, trails, capture.
// One file, one job: the puck and how it flies.

import { BOARD, PUCK_R } from './config.js';

export function makePuck(x, y) {
  return {
    x, y, vx: 0, vy: 0, r: PUCK_R,
    resting: true, trail: [], spin: 0,
    frost: false, overboil: 0, bounceMul: 1, zoneId: null,
  };
}

export function launchPuck(p, dx, dy, power) {
  const d = Math.hypot(dx, dy) || 1;
  const speed = Math.min(power, 920);
  p.vx = (dx / d) * speed;
  p.vy = (dy / d) * speed;
  p.resting = false;
  p.trail.length = 0;
}

function bounceOffSegment(p, seg) {
  // Reflect velocity across a wall segment; returns true on a hit.
  const dx = seg.x2 - seg.x1;
  const dy = seg.y2 - seg.y1;
  const len2 = dx * dx + dy * dy || 1;
  let t = ((p.x - seg.x1) * dx + (p.y - seg.y1) * dy) / len2;
  t = Math.max(0, Math.min(1, t));
  const cx = seg.x1 + dx * t;
  const cy = seg.y1 + dy * t;
  const ex = p.x - cx;
  const ey = p.y - cy;
  const dist = Math.hypot(ex, ey);
  if (dist >= p.r || dist === 0) return false;
  const nx = ex / dist;
  const ny = ey / dist;
  const dot = p.vx * nx + p.vy * ny;
  if (dot >= 0) return false;
  p.vx -= 2 * dot * nx;
  p.vy -= 2 * dot * ny;
  p.vx *= 0.94;
  p.vy *= 0.94;
  p.x = cx + nx * (p.r + 0.5);
  p.y = cy + ny * (p.r + 0.5);
  return true;
}

export function updatePuck(p, dt, state, onBounce) {
  if (p.resting) return;
  p.x += p.vx * dt;
  p.y += p.vy * dt;
  const fr = p.overboil > 0 ? 0.999 : 0.995;
  p.vx *= fr;
  p.vy *= fr;
  if (p.overboil > 0) p.overboil -= dt;
  p.spin += dt * (Math.hypot(p.vx, p.vy) / p.r);
  p.trail.push({ x: p.x, y: p.y });
  if (p.trail.length > 14) p.trail.shift();
  let bounced = false;
  const m = 6;
  if (p.x - p.r < BOARD.x + m) { p.x = BOARD.x + m + p.r; p.vx = Math.abs(p.vx) * 0.92; bounced = true; }
  if (p.x + p.r > BOARD.x + BOARD.w - m) { p.x = BOARD.x + BOARD.w - m - p.r; p.vx = -Math.abs(p.vx) * 0.92; bounced = true; }
  if (p.y - p.r < BOARD.y + m) { p.y = BOARD.y + m + p.r; p.vy = Math.abs(p.vy) * 0.92; bounced = true; }
  if (p.y + p.r > BOARD.y + BOARD.h - m) { p.y = BOARD.y + BOARD.h - m - p.r; p.vy = -Math.abs(p.vy) * 0.92; bounced = true; }
  for (const seg of state.walls) {
    if (bounceOffSegment(p, seg)) bounced = true;
  }
  if (bounced) onBounce(p);
  if (Math.hypot(p.vx, p.vy) < 9) {
    p.vx = 0;
    p.vy = 0;
    p.resting = true;
    if (state.onPuckRest) state.onPuckRest(p);
  }
}

export function drawPuck(ctx, p, time) {
  // Glowing fire-streak motion trail: additive orange-gold ghosts of the puck.
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < p.trail.length; i++) {
    const t = p.trail[i];
    const f = (i + 1) / p.trail.length;
    const a = f * 0.45;
    ctx.fillStyle = p.overboil > 0 ? `rgba(255,80,30,${a})` : p.frost ? `rgba(140,220,255,${a})` : `rgba(255,165,0,${a})`;
    ctx.beginPath();
    ctx.arc(t.x, t.y, p.r * (0.35 + 0.5 * f), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
  ctx.save();
  ctx.translate(p.x, p.y);
  // Soft shadow.
  ctx.fillStyle = 'rgba(43,38,32,0.20)';
  ctx.beginPath();
  ctx.ellipse(0, p.r * 0.8, p.r * 0.9, p.r * 0.3, 0, 0, Math.PI * 2);
  ctx.fill();
  // Body: glossy ink puck with a gold rim, a spinning rune, and a glowing aura.
  ctx.shadowColor = p.overboil > 0 ? '#ff5a1a' : p.frost ? '#5ec8ff' : '#f2c94c';
  ctx.shadowBlur = 16;
  const grad = ctx.createRadialGradient(-p.r * 0.3, -p.r * 0.35, p.r * 0.15, 0, 0, p.r);
  grad.addColorStop(0, p.frost ? '#bfe3ea' : '#4a4458');
  grad.addColorStop(0.7, p.frost ? '#7fb8c9' : '#2b2620');
  grad.addColorStop(1, '#14100c');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(0, 0, p.r, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = p.frost ? '#dcebf2' : '#d4a017';
  ctx.lineWidth = 2.5;
  ctx.stroke();
  ctx.save();
  ctx.rotate(p.spin);
  ctx.strokeStyle = 'rgba(242,201,76,0.9)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-p.r * 0.55, 0);
  ctx.lineTo(p.r * 0.55, 0);
  ctx.moveTo(0, -p.r * 0.55);
  ctx.lineTo(0, p.r * 0.55);
  ctx.stroke();
  ctx.restore();
  ctx.fillStyle = p.frost ? '#7fb8c9' : '#f2c94c';
  ctx.beginPath();
  ctx.arc(0, 0, p.r * 0.22, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}
