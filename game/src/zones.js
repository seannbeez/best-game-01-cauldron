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

const INK = '#2b2620';

// A crisp high-contrast pill badge pinned onto a line or zone: dark navy chip,
// gold rim, bold white/gold text. Returns its width.
function pillBadge(ctx, x, y, text, fg) {
  ctx.font = 'bold 12px Georgia, serif';
  const w = ctx.measureText(text).width + 22;
  const h = 22;
  const bx = x - w / 2;
  const by = y - h / 2;
  ctx.save();
  ctx.fillStyle = '#1e293b';
  ctx.beginPath();
  ctx.moveTo(bx + 11, by);
  ctx.lineTo(bx + w - 11, by);
  ctx.arc(bx + w - 11, by + 11, 11, -Math.PI / 2, Math.PI / 2);
  ctx.lineTo(bx + 11, by + h);
  ctx.arc(bx + 11, by + 11, 11, Math.PI / 2, Math.PI * 1.5);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#f2c94c';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.fillStyle = fg || '#f2c94c';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, x, y + 1);
  ctx.restore();
  return w;
}

// Push a point out of the boss keep-out circle, then clamp it inside the board.
function badgeSpot(x, y, avoid) {
  let px = x;
  let py = y;
  if (avoid) {
    const dx = px - avoid.x;
    const dy = py - avoid.y;
    const d = Math.hypot(dx, dy);
    const rr = avoid.r + 46;
    if (d < rr) {
      const ang = d < 1 ? -Math.PI / 2 : Math.atan2(dy, dx);
      px = avoid.x + Math.cos(ang) * rr;
      py = avoid.y + Math.sin(ang) * rr;
    }
  }
  px = Math.max(BOARD.x + 72, Math.min(BOARD.x + BOARD.w - 72, px));
  py = Math.max(BOARD.y + 30, Math.min(BOARD.y + BOARD.h - 26, py));
  return { x: px, y: py };
}

function rivet(ctx, x, y) {
  ctx.save();
  ctx.fillStyle = '#d4a017';
  ctx.beginPath();
  ctx.arc(x, y, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.fillStyle = '#fdf6e3';
  ctx.beginPath();
  ctx.arc(x - 1.5, y - 1.5, 1.6, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

export function drawZones(ctx, S) {
  for (let zi = 0; zi < ZONES.length; zi++) {
    const z = ZONES[zi];
    const cx = BOARD.x + z.cx * BOARD.w;
    const cy = BOARD.y + z.cy * BOARD.h;
    // Vivid angular polygon field (hexagon, seeded rotation) instead of the
    // old pale dashed circle: saturated translucent fill + thick glowing border.
    const fill = z.id === 'amber' ? 'rgba(255,165,0,0.32)' : z.id === 'cyan' ? 'rgba(40,140,255,0.28)' : 'rgba(220,60,40,0.30)';
    const edge = z.id === 'amber' ? '#ff9d00' : z.id === 'cyan' ? '#2f8cff' : '#e04028';
    const rot = zi * 0.5;
    const verts = [];
    for (let i = 0; i < 6; i++) {
      const a = rot + (i / 6) * Math.PI * 2;
      verts.push({ x: cx + Math.cos(a) * z.r, y: cy + Math.sin(a) * z.r * 0.92 });
    }
    ctx.save();
    ctx.fillStyle = fill;
    ctx.beginPath();
    ctx.moveTo(verts[0].x, verts[0].y);
    for (const v of verts) ctx.lineTo(v.x, v.y);
    ctx.closePath();
    ctx.fill();
    ctx.shadowColor = edge;
    ctx.shadowBlur = 14;
    ctx.strokeStyle = edge;
    ctx.lineWidth = 3.5;
    ctx.stroke();
    ctx.restore();
    for (const v of verts) rivet(ctx, v.x, v.y);
  }
}

// Pill badges, drawn LAST among board-layer elements — after enemies, pucks,
// particles, flashes, floaters and callouts — so no sprite or effect can ever
// overlap or clip a badge's text. Positions are identical to before; only the
// draw order changed. Called from render.js drawBoard, never from drawZones
// or drawWeb.
export function drawBadges(ctx, S) {
  const avoid = S.boss ? { x: S.boss.x, y: S.boss.y, r: S.boss.r + 52 } : null;
  // Zone labels above each polygon (e.g. '3X BOUNCE!' on the amber zone).
  for (let zi = 0; zi < ZONES.length; zi++) {
    const z = ZONES[zi];
    const cx = BOARD.x + z.cx * BOARD.w;
    const cy = BOARD.y + z.cy * BOARD.h;
    const lp = badgeSpot(cx, cy - z.r - 16, avoid);
    pillBadge(ctx, lp.x, lp.y, z.label, z.id === 'cyan' ? '#8fc4ff' : '#f2c94c');
  }
  // Web badges pinned onto the lines and edges.
  // TRI-TRAP READY! sits on the amber zone's quiet left edge, where live
  // hit callouts almost never land, so the two texts cannot print over each other.
  const pts = ZONES.map((z) => ({ x: BOARD.x + z.cx * BOARD.w, y: BOARD.y + z.cy * BOARD.h }));
  const mid = (a, b) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
  const eAB = badgeSpot(pts[0].x - 118, pts[0].y, avoid);
  pillBadge(ctx, eAB.x, eAB.y, 'TRI-TRAP READY!', '#f2c94c');
  const eBC = badgeSpot(mid(pts[1], pts[2]).x, mid(pts[1], pts[2]).y, avoid);
  pillBadge(ctx, eBC.x, eBC.y, '3X RICOCHET', '#f2c94c');
  const webMid = badgeSpot((pts[1].x + S.cauldrons[1].x) / 2, (pts[1].y + S.cauldrons[1].y) / 2, avoid);
  pillBadge(ctx, webMid.x, webMid.y, '95% TAUT', '#8fc4ff');
}

// Luminous tether fields: a saturated amber triangle joining the three combo
// zones, thick glowing cobalt tension beams from each zone to its two nearest
// cauldrons, anchor rivets at every vertex. The pill badges pinned onto the
// lines are drawn separately by drawBadges, after all pieces, so no enemy
// can ever overlap a badge. Drawn under the pieces, above the parchment.
export function drawWeb(ctx, S) {
  const pts = ZONES.map((z) => ({ x: BOARD.x + z.cx * BOARD.w, y: BOARD.y + z.cy * BOARD.h }));
  ctx.save();
  // Amber triangle field: rich saturated fill, thick glowing border, rivets.
  ctx.fillStyle = 'rgba(255,165,0,0.32)';
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  ctx.lineTo(pts[1].x, pts[1].y);
  ctx.lineTo(pts[2].x, pts[2].y);
  ctx.closePath();
  ctx.fill();
  ctx.shadowColor = '#ffb020';
  ctx.shadowBlur = 16;
  ctx.strokeStyle = '#ff9d00';
  ctx.lineWidth = 3.5;
  ctx.stroke();
  ctx.restore();
  for (const p of pts) rivet(ctx, p.x, p.y);
  // Cobalt tension beams: wide translucent band + bright 3px glowing core line.
  for (const p of pts) {
    const near = S.cauldrons
      .map((c) => ({ c, d: Math.hypot(c.x - p.x, c.y - p.y) }))
      .sort((a, b) => a.d - b.d)
      .slice(0, 2);
    for (const { c } of near) {
      ctx.save();
      ctx.strokeStyle = 'rgba(40,140,255,0.28)';
      ctx.lineWidth = 11;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(c.x, c.y);
      ctx.stroke();
      ctx.shadowColor = '#2f8cff';
      ctx.shadowBlur = 10;
      ctx.strokeStyle = 'rgba(120,190,255,0.95)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(c.x, c.y);
      ctx.stroke();
      ctx.restore();
      const mx = (p.x + c.x) / 2;
      const my = (p.y + c.y) / 2;
      rivet(ctx, mx, my);
    }
  }
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
  // The type is much bigger now, so the clash box is wider and taller.
  let yy = y;
  for (let tries = 0; tries < 4; tries++) {
    const clash = callouts.some((c) => Math.abs(c.x - x) < 260 && Math.abs(c.y - yy) < 48);
    if (!clash) break;
    yy -= 48;
  }
  // Then push clear of the boss's face, and clamp inside the board.
  const p = pushOutOf(x, yy, avoid);
  const cx = Math.max(BOARD.x + 130, Math.min(BOARD.x + BOARD.w - 130, p.x));
  const cy = Math.max(BOARD.y + 40, Math.min(BOARD.y + BOARD.h - 16, p.y));
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
    const pop = 1 + (1 - a) * 0.12;
    // Keep callouts inside the board so they never spill over the sidebar.
    const cx = Math.max(BOARD.x + 130, Math.min(BOARD.x + BOARD.w - 130, c.x));
    ctx.save();
    ctx.translate(cx, c.y);
    ctx.scale(pop, pop);
    ctx.globalAlpha = a;
    // Huge punchy comic type: white drop-shadow, thick dark outline, color fill.
    ctx.font = 'bold 26px Georgia, serif';
    const w = ctx.measureText(c.text).width;
    ctx.lineWidth = 6;
    ctx.strokeStyle = INK;
    ctx.lineJoin = 'round';
    ctx.fillStyle = '#fdf6e3';
    ctx.fillText(c.text, 3, 4);
    ctx.strokeText(c.text, 0, 0);
    ctx.fillStyle = c.color;
    ctx.fillText(c.text, 0, 0);
    // Radiating impact lines around the text block.
    ctx.strokeStyle = c.color;
    ctx.lineWidth = 3;
    const hw = w / 2 + 12;
    const hh = 20;
    for (let i = 0; i < 8; i++) {
      const ang = (i / 8) * Math.PI * 2 + 0.35;
      const ex = Math.cos(ang);
      const ey = Math.sin(ang);
      const r0 = Math.max(Math.abs(hw / (ex || 0.001)), Math.abs(hh / (ey || 0.001)));
      const r1 = Math.min(r0, 90) + 4;
      ctx.beginPath();
      ctx.moveTo(ex * r1, ey * r1);
      ctx.lineTo(ex * (r1 + 13), ey * (r1 + 13));
      ctx.stroke();
    }
    ctx.restore();
  }
  ctx.globalAlpha = 1;
}

// Starburst impact flashes: a glowing core + radiating rays, additive, fading.
export function addFlash(flashes, x, y, big) {
  flashes.push({ x, y, life: 0.35, max: 0.35, big: !!big });
  if (flashes.length > 12) flashes.shift();
}

export function updateFlashes(flashes, dt) {
  for (let i = flashes.length - 1; i >= 0; i--) {
    flashes[i].life -= dt;
    if (flashes[i].life <= 0) flashes.splice(i, 1);
  }
}

export function drawFlashes(ctx, flashes) {
  for (const f of flashes) {
    const a = Math.max(0, f.life / f.max);
    const R = (f.big ? 52 : 34) * (1 + (1 - a) * 0.7);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = a;
    const grad = ctx.createRadialGradient(f.x, f.y, 2, f.x, f.y, R);
    grad.addColorStop(0, 'rgba(255,240,180,0.95)');
    grad.addColorStop(0.4, 'rgba(255,165,0,0.55)');
    grad.addColorStop(1, 'rgba(255,165,0,0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(f.x, f.y, R, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ffd970';
    ctx.lineWidth = 3;
    for (let i = 0; i < 8; i++) {
      const ang = (i / 8) * Math.PI * 2 + 0.4;
      ctx.beginPath();
      ctx.moveTo(f.x + Math.cos(ang) * R * 0.4, f.y + Math.sin(ang) * R * 0.4);
      ctx.lineTo(f.x + Math.cos(ang) * R, f.y + Math.sin(ang) * R);
      ctx.stroke();
    }
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
    const a = Math.max(0, d.life / d.max);
    // Scorched crater: dark charred heart + glowing ember rim, fading with life.
    ctx.save();
    ctx.globalAlpha = 0.5 * a;
    ctx.fillStyle = '#2b2620';
    ctx.beginPath();
    ctx.ellipse(d.x, d.y, d.r, d.r * 0.55, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 0.55 * a;
    ctx.strokeStyle = '#ff7a1a';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.ellipse(d.x, d.y, d.r * 0.92, d.r * 0.5, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 0.35 * a;
    ctx.fillStyle = '#c0392b';
    ctx.beginPath();
    ctx.ellipse(d.x, d.y, d.r * 0.55, d.r * 0.3, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  ctx.globalAlpha = 1;
}
