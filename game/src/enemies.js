// enemies.js — quirky porcelain/origami monsters: factory, drift behavior, and
// hand-drawn ink-and-watercolor art with bold outlines and expressive faces.
// One file, one job: everything about the foes.

import { ENEMY_TYPES } from './config.js';
import { range } from './random.js';

export function makeEnemy(type, x, y, rng) {
  const def = ENEMY_TYPES[type];
  return {
    type,
    def,
    x,
    y,
    vx: 0,
    vy: 0,
    hp: def.hp,
    maxHp: def.hp,
    r: def.r,
    wobble: rng() * Math.PI * 2,
    wobbleSpeed: range(rng, 1.2, 2.2),
    squash: 0,
    flash: 0,
    freeze: 0,
    slow: 0,
    magnet: 0,
    faceSeed: rng(),
    spawnT: 0,
    minionTimer: 0,
    dead: false,
  };
}

// Drift toward the nearest cauldron, wobbling like a drunk ink blot. Wyverns slither
// in a sine wave; the Tyrant lumbers and spawns gremlins.
export function updateEnemy(e, dt, state) {
  e.spawnT += dt;
  if (e.flash > 0) e.flash -= dt;
  if (e.squash > 0) e.squash -= dt;
  if (e.freeze > 0) { e.freeze -= dt; return; }
  const slowMul = (e.slow > 0 ? 0.8 : 1) * (state.relicFlags.honey ? 0.8 : 1);
  e.wobble += dt * e.wobbleSpeed;
  let tx = 0;
  let ty = 0;
  if (e.magnet > 0) {
    e.magnet -= dt;
    const c = nearestCauldron(state, e.x, e.y);
    tx = c.x - e.x;
    ty = c.y - e.y;
  } else {
    const c = nearestCauldron(state, e.x, e.y);
    tx = c.x - e.x;
    ty = c.y - e.y;
  }
  const d = Math.hypot(tx, ty) || 1;
  const sp = e.def.speed * slowMul;
  let mx = (tx / d) * sp;
  let my = (ty / d) * sp;
  if (e.type === 'wyvern') {
    const perp = Math.sin(e.wobble * 2.2) * 34;
    mx += (-ty / d) * perp * 0.6;
    my += (tx / d) * perp * 0.6;
  } else {
    mx += Math.sin(e.wobble) * 9;
    my += Math.cos(e.wobble * 0.8) * 9;
  }
  e.x += mx * dt;
  e.y += my * dt;
  if (e.type === 'tyrant') {
    e.minionTimer -= dt;
    if (e.minionTimer <= 0 && state.enemies.length < 10) {
      e.minionTimer = 6;
      state.spawnMinion = true;
    }
  }
}

export function nearestCauldron(state, x, y) {
  let best = state.cauldrons[0];
  let bd = Infinity;
  for (const c of state.cauldrons) {
    const d = (c.x - x) * (c.x - x) + (c.y - y) * (c.y - y);
    if (d < bd) { bd = d; best = c; }
  }
  return best;
}

function shadow(ctx, x, y, r) {
  ctx.fillStyle = 'rgba(43,38,32,0.18)';
  ctx.beginPath();
  ctx.ellipse(x, y + r * 0.85, r * 0.95, r * 0.32, 0, 0, Math.PI * 2);
  ctx.fill();
}

function face(ctx, x, y, r, seed, mood) {
  // Two expressive eyes + a mouth that changes with mood ('idle' | 'hurt' | 'dizzy').
  const ex = r * 0.36;
  const ey = -r * 0.12;
  const er = Math.max(2.5, r * 0.13);
  ctx.fillStyle = '#fdf6e3';
  ctx.beginPath(); ctx.arc(x - ex, y + ey, er * 1.5, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(x + ex, y + ey, er * 1.5, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#2b2620';
  if (mood === 'dizzy') {
    ctx.strokeStyle = '#2b2620';
    ctx.lineWidth = 1.6;
    for (const s of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(x + s * ex - er, y + ey - er * 0.5);
      ctx.lineTo(x + s * ex + er, y + ey + er * 0.5);
      ctx.moveTo(x + s * ex + er, y + ey - er * 0.5);
      ctx.lineTo(x + s * ex - er, y + ey + er * 0.5);
      ctx.stroke();
    }
  } else {
    ctx.beginPath(); ctx.arc(x - ex + er * 0.3, y + ey, er * 0.55, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(x + ex - er * 0.3, y + ey, er * 0.55, 0, Math.PI * 2); ctx.fill();
  }
  // Mouth.
  ctx.strokeStyle = '#2b2620';
  ctx.lineWidth = Math.max(1.6, r * 0.07);
  ctx.lineCap = 'round';
  ctx.beginPath();
  if (mood === 'hurt') {
    ctx.arc(x, y + r * 0.52, r * 0.28, Math.PI * 1.15, Math.PI * 1.85);
  } else if (mood === 'dizzy') {
    ctx.moveTo(x - r * 0.2, y + r * 0.42);
    ctx.lineTo(x + r * 0.2, y + r * 0.42);
  } else {
    ctx.arc(x, y + r * 0.28, r * 0.3, Math.PI * 0.15, Math.PI * 0.85);
  }
  ctx.stroke();
  // Eyebrows.
  ctx.beginPath();
  ctx.moveTo(x - ex - er, y + ey - er * 1.9);
  ctx.lineTo(x - ex + er, y + ey - er * (mood === 'hurt' ? 1.1 : 1.9));
  ctx.moveTo(x + ex - er, y + ey - er * 1.9);
  ctx.lineTo(x + ex + er, y + ey - er * (mood === 'hurt' ? 1.1 : 1.9));
  ctx.stroke();
}

// Draw one enemy with squash-and-stretch. ctx is already translated to (e.x, e.y).
export function drawEnemy(ctx, e, time) {
  const r = e.r;
  const sq = e.squash > 0 ? Math.sin((e.squash / 0.22) * Math.PI) * 0.22 : 0;
  const bob = Math.sin(time * 2 + e.wobble) * r * 0.04;
  shadow(ctx, 0, -bob, r);
  ctx.save();
  ctx.translate(0, -bob);
  ctx.scale(1 + sq, 1 - sq);
  ctx.lineWidth = Math.max(2.5, r * 0.11);
  ctx.lineJoin = 'round';
  ctx.strokeStyle = '#2b2620';
  const mood = e.flash > 0 ? 'hurt' : (e.freeze > 0 ? 'dizzy' : 'idle');
  if (e.type === 'gremlin') drawGremlin(ctx, e, r, mood);
  else if (e.type === 'scroll') drawScroll(ctx, e, r, mood);
  else if (e.type === 'teacup') drawTeacup(ctx, e, r, mood);
  else if (e.type === 'wyvern') drawWyvern(ctx, e, r, mood);
  else drawTyrant(ctx, e, r, mood);
  ctx.restore();
  // Health bar above (not for full-HP small fry).
  if (e.hp < e.maxHp) {
    const w = r * 1.7;
    const y = -r - 12 - bob;
    ctx.fillStyle = 'rgba(29,43,74,0.75)';
    ctx.fillRect(-w / 2, y, w, 6);
    ctx.fillStyle = e.type === 'tyrant' ? '#c0392b' : '#3f8f7a';
    ctx.fillRect(-w / 2, y, (w * e.hp) / e.maxHp, 6);
    ctx.strokeStyle = '#2b2620';
    ctx.lineWidth = 1;
    ctx.strokeRect(-w / 2, y, w, 6);
  }
}

function drawGremlin(ctx, e, r, mood) {
  // Round purple ink blob with pointy ears and a cheeky grin.
  ctx.fillStyle = e.def.color;
  ctx.beginPath();
  ctx.moveTo(-r * 0.7, -r * 0.55);
  ctx.lineTo(-r * 0.95, -r * 1.25);
  ctx.lineTo(-r * 0.25, -r * 0.85);
  ctx.moveTo(r * 0.7, -r * 0.55);
  ctx.lineTo(r * 0.95, -r * 1.25);
  ctx.lineTo(r * 0.25, -r * 0.85);
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = e.def.belly;
  ctx.beginPath();
  ctx.ellipse(0, r * 0.42, r * 0.55, r * 0.38, 0, 0, Math.PI * 2);
  ctx.fill();
  // Ink drips.
  ctx.fillStyle = '#2b2620';
  ctx.beginPath();
  ctx.arc(-r * 0.5, r * 0.75, r * 0.09, 0, Math.PI * 2);
  ctx.arc(r * 0.45, r * 0.8, r * 0.07, 0, Math.PI * 2);
  ctx.fill();
  face(ctx, 0, -r * 0.08, r, e.faceSeed, mood);
}

function drawScroll(ctx, e, r, mood) {
  // A rolled parchment scroll, unravelling, with sleepy eyes.
  ctx.fillStyle = '#e8cf9a';
  ctx.beginPath();
  ctx.ellipse(0, 0, r * 1.05, r * 0.72, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = '#8a6d3b';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(-r * 0.8, -r * 0.25);
  ctx.lineTo(r * 0.8, -r * 0.25);
  ctx.moveTo(-r * 0.8, 0);
  ctx.lineTo(r * 0.8, 0);
  ctx.moveTo(-r * 0.8, r * 0.25);
  ctx.lineTo(r * 0.8, r * 0.25);
  ctx.stroke();
  ctx.fillStyle = '#b98a3e';
  ctx.beginPath();
  ctx.arc(-r * 0.95, 0, r * 0.28, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#2b2620';
  ctx.lineWidth = Math.max(2.5, r * 0.11);
  ctx.beginPath();
  ctx.arc(r * 0.95, 0, r * 0.28, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  face(ctx, 0, -r * 0.05, r * 0.9, e.faceSeed, mood);
}

function drawTeacup(ctx, e, r, mood) {
  // A cracked porcelain teacup, sloshing tea, handle on the right.
  ctx.fillStyle = e.def.color;
  ctx.beginPath();
  ctx.moveTo(-r * 0.85, -r * 0.45);
  ctx.lineTo(r * 0.85, -r * 0.45);
  ctx.lineTo(r * 0.6, r * 0.75);
  ctx.quadraticCurveTo(0, r * 0.95, -r * 0.6, r * 0.75);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#dcebf2';
  ctx.beginPath();
  ctx.ellipse(0, -r * 0.45, r * 0.85, r * 0.22, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  // Handle.
  ctx.beginPath();
  ctx.arc(r * 1.02, r * 0.05, r * 0.34, -Math.PI * 0.6, Math.PI * 0.6);
  ctx.stroke();
  // Crack.
  ctx.strokeStyle = '#2b2620';
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(-r * 0.2, -r * 0.45);
  ctx.lineTo(-r * 0.35, -r * 0.05);
  ctx.lineTo(-r * 0.15, r * 0.3);
  ctx.lineTo(-r * 0.3, r * 0.6);
  ctx.stroke();
  face(ctx, 0, r * 0.05, r * 0.85, e.faceSeed, mood);
}

function drawWyvern(ctx, e, r, mood) {
  // A long green void wyvern: serpent body, bat wings, horns.
  ctx.fillStyle = e.def.color;
  ctx.beginPath();
  ctx.ellipse(0, r * 0.35, r * 0.9, r * 0.5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  // Wings.
  ctx.fillStyle = '#2c4a34';
  ctx.beginPath();
  ctx.moveTo(-r * 0.4, -r * 0.2);
  ctx.quadraticCurveTo(-r * 1.5, -r * 1.1, -r * 1.35, -r * 0.1);
  ctx.quadraticCurveTo(-r * 0.9, -r * 0.35, -r * 0.4, r * 0.1);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(r * 0.4, -r * 0.2);
  ctx.quadraticCurveTo(r * 1.5, -r * 1.1, r * 1.35, -r * 0.1);
  ctx.quadraticCurveTo(r * 0.9, -r * 0.35, r * 0.4, r * 0.1);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // Head.
  ctx.fillStyle = e.def.color;
  ctx.beginPath();
  ctx.arc(0, -r * 0.45, r * 0.55, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  // Horns.
  ctx.beginPath();
  ctx.moveTo(-r * 0.35, -r * 0.85);
  ctx.lineTo(-r * 0.55, -r * 1.25);
  ctx.lineTo(-r * 0.15, -r * 0.9);
  ctx.moveTo(r * 0.35, -r * 0.85);
  ctx.lineTo(r * 0.55, -r * 1.25);
  ctx.lineTo(r * 0.15, -r * 0.9);
  ctx.fill();
  ctx.stroke();
  face(ctx, 0, -r * 0.5, r * 0.8, e.faceSeed, mood);
}

function drawTyrant(ctx, e, r, mood) {
  // The Tea-Kettle Tyrant: a huge brass kettle with a furious face, spout and lid.
  ctx.fillStyle = '#8e2a20';
  ctx.beginPath();
  ctx.ellipse(0, -r * 0.55, r * 0.5, r * 0.28, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#d4a017';
  ctx.beginPath();
  ctx.arc(0, -r * 0.8, r * 0.16, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  // Spout.
  ctx.fillStyle = e.def.color;
  ctx.beginPath();
  ctx.moveTo(r * 0.75, -r * 0.3);
  ctx.quadraticCurveTo(r * 1.35, -r * 0.55, r * 1.25, -r * 1.0);
  ctx.quadraticCurveTo(r * 1.05, -r * 0.7, r * 0.6, -r * 0.55);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // Body.
  ctx.fillStyle = e.def.color;
  ctx.beginPath();
  ctx.ellipse(0, r * 0.1, r * 0.92, r * 0.72, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = e.def.belly;
  ctx.beginPath();
  ctx.ellipse(0, r * 0.35, r * 0.55, r * 0.4, 0, 0, Math.PI * 2);
  ctx.fill();
  // Steam puffs.
  ctx.fillStyle = 'rgba(253,246,227,0.75)';
  ctx.beginPath();
  ctx.arc(-r * 0.25, -r * 1.05, r * 0.14, 0, Math.PI * 2);
  ctx.arc(r * 0.15, -r * 1.15, r * 0.18, 0, Math.PI * 2);
  ctx.fill();
  face(ctx, 0, -r * 0.05, r * 0.9, e.faceSeed, mood);
}

// Small portrait for the Threat Queue: draws the enemy type centered in a box.
export function drawPortrait(ctx, type, cx, cy, size) {
  const def = ENEMY_TYPES[type];
  const fake = { type, def, r: size * 0.42, faceSeed: 0.5, flash: 0, squash: 0, freeze: 0 };
  ctx.save();
  ctx.translate(cx, cy);
  const scale = size / (def.r * 2.4);
  ctx.scale(scale, scale);
  // Reuse the body drawings without the shadow/health bar.
  ctx.lineWidth = Math.max(2.5, fake.r * 0.11);
  ctx.lineJoin = 'round';
  ctx.strokeStyle = '#2b2620';
  if (type === 'gremlin') drawGremlin(ctx, fake, fake.r, 'idle');
  else if (type === 'scroll') drawScroll(ctx, fake, fake.r, 'idle');
  else if (type === 'teacup') drawTeacup(ctx, fake, fake.r, 'idle');
  else if (type === 'wyvern') drawWyvern(ctx, fake, fake.r, 'idle');
  else drawTyrant(ctx, fake, fake.r, 'idle');
  ctx.restore();
}
