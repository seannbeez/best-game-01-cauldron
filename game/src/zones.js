// zones.js — the board's living furniture: bubbling corner cauldrons, colored combo
// zones, ink walls, particles, floating damage numbers, callouts and scorch decals.
// One file, one job: everything that decorates and reacts on the board.

import { BOARD, CAULDRON_R, ZONES } from './config.js';

export function cauldronPositions() {
  const inset = 58;
  return [
    { x: BOARD.x + inset, y: BOARD.y + inset, side: 'NW' },
    { x: BOARD.x + BOARD.w - inset, y: BOARD.y + inset, side: 'NE' },
    { x: BOARD.x + inset, y: BOARD.y + BOARD.h - inset, side: 'SW' },
    { x: BOARD.x + BOARD.w - inset, y: BOARD.y + BOARD.h - inset, side: 'SE' },
  ];
}

export function defaultWalls() {
  // Two curved ink-wall segments the puck ricochets off (as polylines of segments).
  const segs = [];
  const arc1 = wallArc(BOARD.x + 300, BOARD.y + 210, 90, -0.4, 1.9);
  const arc2 = wallArc(BOARD.x + 620, BOARD.y + 380, 95, Math.PI + 0.5, Math.PI + 2.6);
  for (let i = 0; i < arc1.length - 1; i++) segs.push({ x1: arc1[i].x, y1: arc1[i].y, x2: arc1[i + 1].x, y2: arc1[i + 1].y });
  for (let i = 0; i < arc2.length - 1; i++) segs.push({ x1: arc2[i].x, y1: arc2[i].y, x2: arc2[i + 1].x, y2: arc2[i + 1].y });
  return segs;
}

function wallArc(cx, cy, r, a0, a1) {
  const pts = [];
  const n = 9;
  for (let i = 0; i <= n; i++) {
    const a = a0 + ((a1 - a0) * i) / n;
    pts.push({ x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r * 0.55 });
  }
  return pts;
}

export function drawZones(ctx, time) {
  for (const z of ZONES) {
    const cx = BOARD.x + z.cx * BOARD.w;
    const cy = BOARD.y + z.cy * BOARD.h;
    ctx.fillStyle = z.color;
    ctx.beginPath();
    ctx.arc(cx, cy, z.r, 0, Math.PI * 2);
    ctx.fill();
    // Rotating dashed ring: the zones feel alive even when nothing moves.
    ctx.setLineDash([8, 7]);
    ctx.lineDashOffset = -((time || 0) * 12);
    ctx.strokeStyle = z.ring;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, cy, z.r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.lineDashOffset = 0;
    ctx.fillStyle = z.ring;
    ctx.font = 'bold 13px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.fillText(z.label, cx, cy - z.r - 8);
  }
}

// Luminous tension web: a translucent triangle joining the three combo zones,
// cobalt web lines from each zone to its two nearest cauldrons, and crisp
// technical micro-labels. Drawn under the pieces, above the parchment.
export function drawWeb(ctx, S) {
  const pts = ZONES.map((z) => ({ x: BOARD.x + z.cx * BOARD.w, y: BOARD.y + z.cy * BOARD.h }));
  ctx.save();
  // Triangle field.
  ctx.fillStyle = 'rgba(212,160,23,0.07)';
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  ctx.lineTo(pts[1].x, pts[1].y);
  ctx.lineTo(pts[2].x, pts[2].y);
  ctx.closePath();
  ctx.fill();
  ctx.setLineDash([6, 6]);
  ctx.strokeStyle = 'rgba(212,160,23,0.55)';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.setLineDash([]);
  // Web lines: each zone to its two nearest cauldrons, with node dots.
  for (const p of pts) {
    const near = S.cauldrons
      .map((c) => ({ c, d: Math.hypot(c.x - p.x, c.y - p.y) }))
      .sort((a, b) => a.d - b.d)
      .slice(0, 2);
    for (const { c } of near) {
      ctx.strokeStyle = 'rgba(70,110,180,0.45)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(c.x, c.y);
      ctx.stroke();
      const mx = (p.x + c.x) / 2;
      const my = (p.y + c.y) / 2;
      ctx.fillStyle = 'rgba(70,110,180,0.8)';
      ctx.beginPath();
      ctx.arc(mx, my, 3, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  // Micro-labels, placed clear of the board centre where the boss fights.
  ctx.font = 'bold 10px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(212,160,23,0.95)';
  ctx.fillText('3X AMPLIFY', (pts[0].x + pts[1].x + pts[2].x) / 3, (pts[0].y + pts[1].y + pts[2].y) / 3 - 58);
  ctx.fillStyle = 'rgba(70,110,180,0.95)';
  ctx.fillText('95% TAUT', (pts[0].x + S.cauldrons[1].x) / 2 + 8, (pts[0].y + S.cauldrons[1].y) / 2 - 10);
  ctx.fillStyle = 'rgba(160,58,44,0.95)';
  ctx.fillText('BOIL ZONE', pts[2].x + 128, pts[2].y + 4);
  ctx.restore();
}

export function drawWalls(ctx, walls) {
  ctx.strokeStyle = '#2b2620';
  ctx.lineWidth = 7;
  ctx.lineCap = 'round';
  ctx.beginPath();
  for (const s of walls) {
    ctx.moveTo(s.x1, s.y1);
    ctx.lineTo(s.x2, s.y2);
  }
  ctx.stroke();
  ctx.strokeStyle = 'rgba(212,160,23,0.85)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (const s of walls) {
    ctx.moveTo(s.x1, s.y1);
    ctx.lineTo(s.x2, s.y2);
  }
  ctx.stroke();
}

export function drawCauldrons(ctx, cauldrons, time) {
  for (const c of cauldrons) {
    // Shadow + brass pot.
    ctx.fillStyle = 'rgba(43,38,32,0.18)';
    ctx.beginPath();
    ctx.ellipse(c.x, c.y + CAULDRON_R * 0.8, CAULDRON_R * 1.05, CAULDRON_R * 0.35, 0, 0, Math.PI * 2);
    ctx.fill();
    const grad = ctx.createRadialGradient(c.x - 10, c.y - 12, 6, c.x, c.y, CAULDRON_R + 8);
    grad.addColorStop(0, '#e8b04b');
    grad.addColorStop(0.6, '#8a6d3b');
    grad.addColorStop(1, '#5c4a26');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.ellipse(c.x, c.y, CAULDRON_R + 6, CAULDRON_R * 0.82, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#2b2620';
    ctx.lineWidth = 3;
    ctx.stroke();
    // Bubbling brew.
    const brew = ctx.createRadialGradient(c.x, c.y - 4, 4, c.x, c.y, CAULDRON_R - 4);
    brew.addColorStop(0, '#7fb069');
    brew.addColorStop(0.7, '#4a7a4f');
    brew.addColorStop(1, '#2c4a34');
    ctx.fillStyle = brew;
    ctx.beginPath();
    ctx.ellipse(c.x, c.y - 3, CAULDRON_R - 4, (CAULDRON_R - 4) * 0.72, 0, 0, Math.PI * 2);
    ctx.fill();
    // Bubbles.
    for (let i = 0; i < 4; i++) {
      const ph = time * 1.6 + i * 1.7 + c.x;
      const bx = c.x + Math.sin(ph * 1.3) * (CAULDRON_R - 16);
      const by = c.y - 6 - ((ph * 9) % 16);
      ctx.fillStyle = 'rgba(253,246,227,0.75)';
      ctx.beginPath();
      ctx.arc(bx, by, 2.5 + (i % 2), 0, Math.PI * 2);
      ctx.fill();
    }
    // Steam: rising rings that expand and fade.
    for (let i = 0; i < 2; i++) {
      const frac = ((time * 0.45 + i * 0.5 + c.x * 0.01) % 1 + 1) % 1;
      ctx.strokeStyle = `rgba(253,246,227,${0.35 * (1 - frac)})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(c.x, c.y - CAULDRON_R - 8 - frac * 26, 6 + frac * 16, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.fillStyle = 'rgba(253,246,227,0.35)';
    ctx.beginPath();
    ctx.arc(c.x - 8, c.y - CAULDRON_R - 6 - Math.sin(time + c.x) * 2, 5, 0, Math.PI * 2);
    ctx.arc(c.x + 10, c.y - CAULDRON_R - 12 - Math.cos(time * 1.2 + c.x) * 2, 6, 0, Math.PI * 2);
    ctx.fill();
  }
}

// --- Particles, floaters, callouts, decals (plain arrays on state) ---
export function burst(particles, x, y, color, n, speed) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2;
    const s = (speed || 160) * (0.4 + Math.random() * 0.8);
    particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 0.55 + Math.random() * 0.4, max: 0.95, color, r: 2 + Math.random() * 3.5 });
  }
}

export function updateParticles(particles, dt) {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.life -= dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vx *= 0.98;
    p.vy *= 0.98;
    if (p.life <= 0) particles.splice(i, 1);
  }
}

export function drawParticles(ctx, particles) {
  for (const p of particles) {
    ctx.globalAlpha = Math.max(0, p.life / p.max);
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

// Push a point out of a keep-out circle (the boss's face), if it lies inside.
function pushOutOf(x, y, avoid) {
  if (!avoid) return { x, y };
  const dx = x - avoid.x;
  const dy = y - avoid.y;
  const d = Math.hypot(dx, dy);
  if (d >= avoid.r) return { x, y };
  const ang = d < 1 ? -Math.PI / 2 : Math.atan2(dy, dx);
  return { x: avoid.x + Math.cos(ang) * (avoid.r + 10), y: avoid.y + Math.sin(ang) * (avoid.r + 10) };
}

export function addCallout(callouts, x, y, text, color, avoid) {
  // Stack overlapping callouts upward so they never print on top of each other.
  let yy = y;
  for (let tries = 0; tries < 4; tries++) {
    const clash = callouts.some((c) => Math.abs(c.x - x) < 160 && Math.abs(c.y - yy) < 36);
    if (!clash) break;
    yy -= 34;
  }
  // Then push clear of the boss's face, and clamp inside the board.
  const p = pushOutOf(x, yy, avoid);
  const cx = Math.max(BOARD.x + 90, Math.min(BOARD.x + BOARD.w - 90, p.x));
  const cy = Math.max(BOARD.y + 34, Math.min(BOARD.y + BOARD.h - 16, p.y));
  callouts.push({ x: cx, y: cy, text, color: color || '#c0392b', life: 1.1, max: 1.1 });
  if (callouts.length > 8) callouts.shift();
}

export function updateCallouts(callouts, dt) {
  for (let i = callouts.length - 1; i >= 0; i--) {
    callouts[i].life -= dt;
    callouts[i].y -= 26 * dt;
    if (callouts[i].life <= 0) callouts.splice(i, 1);
  }
}

export function drawCallouts(ctx, callouts) {
  ctx.textAlign = 'center';
  for (const c of callouts) {
    const a = Math.max(0, c.life / c.max);
    const pop = 1 + (1 - a) * 0.15;
    // Keep callouts inside the board so they never spill over the sidebar.
    const cx = Math.max(BOARD.x + 80, Math.min(BOARD.x + BOARD.w - 80, c.x));
    ctx.save();
    ctx.translate(cx, c.y);
    ctx.scale(pop, pop);
    ctx.globalAlpha = a;
    ctx.font = 'bold 18px Georgia, serif';
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#fdf6e3';
    ctx.strokeText(c.text, 0, 0);
    ctx.fillStyle = c.color;
    ctx.fillText(c.text, 0, 0);
    ctx.restore();
  }
  ctx.globalAlpha = 1;
}

export function addFloater(floaters, x, y, text, color, avoid) {
  const p = pushOutOf(x, y, avoid);
  floaters.push({ x: p.x, y: p.y, text, color: color || '#2b2620', life: 0.9, max: 0.9 });
  if (floaters.length > 24) floaters.shift();
}

export function updateFloaters(floaters, dt) {
  for (let i = floaters.length - 1; i >= 0; i--) {
    floaters[i].life -= dt;
    floaters[i].y -= 34 * dt;
    if (floaters[i].life <= 0) floaters.splice(i, 1);
  }
}

export function drawFloaters(ctx, floaters) {
  ctx.textAlign = 'center';
  for (const f of floaters) {
    ctx.globalAlpha = Math.max(0, f.life / f.max);
    ctx.font = 'bold 15px Georgia, serif';
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#fdf6e3';
    ctx.strokeText(f.text, f.x, f.y);
    ctx.fillStyle = f.color;
    ctx.fillText(f.text, f.x, f.y);
  }
  ctx.globalAlpha = 1;
}

export function addDecal(decals, x, y, r) {
  decals.push({ x, y, r, life: 6, max: 6 });
  if (decals.length > 10) decals.shift();
}

export function updateDecals(decals, dt) {
  for (let i = decals.length - 1; i >= 0; i--) {
    decals[i].life -= dt;
    if (decals[i].life <= 0) decals.splice(i, 1);
  }
}

export function drawDecals(ctx, decals) {
  for (const d of decals) {
    ctx.globalAlpha = 0.28 * Math.max(0, d.life / d.max);
    ctx.fillStyle = '#2b2620';
    ctx.beginPath();
    ctx.ellipse(d.x, d.y, d.r, d.r * 0.55, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}
