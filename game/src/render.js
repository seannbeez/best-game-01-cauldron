// render.js — every pixel of the game: parchment board, navy tactical HUD, threat
// queue, hotbar, title comic, relic draft cards, victory table. One file, one job:
// drawing. It never changes game state except registering this frame's buttons.

import { BOARD, BOTTOM, COLORS, HOTBAR, SIDE, TOP, VIEW } from './config.js';
import { drawEnemy, drawPortrait } from './enemies.js';
import { drawRelicIcon } from './relics.js';
import { drawCallouts, drawCauldrons, drawDecals, drawFloaters, drawParticles, drawWalls, drawZones } from './zones.js';
import { drawPuck } from './puck.js';

let parchmentCache = null;

function font(size, bold) {
  return (bold ? 'bold ' : '') + size + "px Georgia, 'Times New Roman', serif";
}

function parchmentTexture() {
  if (parchmentCache) return parchmentCache;
  const c = document.createElement('canvas');
  c.width = BOARD.w;
  c.height = BOARD.h;
  const g = c.getContext('2d');
  g.fillStyle = COLORS.parchment;
  g.fillRect(0, 0, BOARD.w, BOARD.h);
  // Watercolor stains.
  let seed = 42;
  const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
  for (let i = 0; i < 26; i++) {
    const x = rnd() * BOARD.w;
    const y = rnd() * BOARD.h;
    const r = 30 + rnd() * 90;
    const grad = g.createRadialGradient(x, y, 4, x, y, r);
    const col = rnd() > 0.5 ? '214,190,140' : '190,170,120';
    grad.addColorStop(0, `rgba(${col},0.10)`);
    grad.addColorStop(1, `rgba(${col},0)`);
    g.fillStyle = grad;
    g.beginPath();
    g.arc(x, y, r, 0, Math.PI * 2);
    g.fill();
  }
  // Fibers and speckles.
  for (let i = 0; i < 900; i++) {
    g.fillStyle = `rgba(120,100,60,${0.03 + rnd() * 0.05})`;
    g.fillRect(rnd() * BOARD.w, rnd() * BOARD.h, 1 + rnd() * 2, 1);
  }
  for (let i = 0; i < 60; i++) {
    g.strokeStyle = `rgba(120,100,60,${0.05 + rnd() * 0.05})`;
    g.lineWidth = 0.8;
    const x = rnd() * BOARD.w;
    const y = rnd() * BOARD.h;
    g.beginPath();
    g.moveTo(x, y);
    g.lineTo(x + 20 + rnd() * 40, y + (rnd() - 0.5) * 8);
    g.stroke();
  }
  parchmentCache = c;
  return c;
}

function wobblyRect(ctx, x, y, w, h, r, seed) {
  ctx.beginPath();
  const steps = 26;
  const pts = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    pts.push({ x: x + t * w, y: y + Math.sin(t * 9 + seed) * 1.2 });
  }
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    pts.push({ x: x + w + Math.sin(t * 9 + seed + 2) * 1.2, y: y + t * h });
  }
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    pts.push({ x: x + w - t * w, y: y + h + Math.sin(t * 9 + seed + 4) * 1.2 });
  }
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    pts.push({ x: x + Math.sin(t * 9 + seed + 6) * 1.2, y: y + h - t * h });
  }
  ctx.moveTo(pts[0].x, pts[0].y);
  for (const p of pts) ctx.lineTo(p.x, p.y);
  ctx.closePath();
}

function button(ctx, S, id, x, y, w, h, label, opts) {
  const o = opts || {};
  S.ui.buttons.push({ id, x, y, w, h });
  const hover = S.hover && S.hover.x >= x && S.hover.x <= x + w && S.hover.y >= y && S.hover.y <= y + h;
  ctx.save();
  if (o.gold) {
    const grad = ctx.createLinearGradient(x, y, x, y + h);
    grad.addColorStop(0, '#f2c94c');
    grad.addColorStop(0.5, '#d4a017');
    grad.addColorStop(1, '#a67c10');
    ctx.fillStyle = grad;
  } else if (o.red) {
    const grad = ctx.createLinearGradient(x, y, x, y + h);
    grad.addColorStop(0, '#d95b4a');
    grad.addColorStop(0.5, '#c0392b');
    grad.addColorStop(1, '#8e2a20');
    ctx.fillStyle = grad;
  } else {
    ctx.fillStyle = o.fill || COLORS.navyLight;
  }
  wobblyRect(ctx, x, y, w, h, 6, 1.7);
  ctx.fill();
  ctx.strokeStyle = o.gold || o.red ? '#2b2620' : '#f2c94c';
  ctx.lineWidth = hover ? 3.5 : 2.5;
  ctx.stroke();
  ctx.fillStyle = o.dark ? '#2b2620' : '#fdf6e3';
  ctx.font = font(o.fontSize || 18, true);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, x + w / 2, y + h / 2 + 1);
  ctx.restore();
}

function pill(ctx, x, y, text, fg, bg) {
  ctx.font = font(13, true);
  const w = ctx.measureText(text).width + 18;
  ctx.fillStyle = bg;
  ctx.beginPath();
  ctx.arc(x + 10, y + 11, 11, Math.PI / 2, Math.PI * 1.5);
  ctx.arc(x + w - 10, y + 11, 11, -Math.PI / 2, Math.PI / 2);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = fg;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, x + w / 2, y + 12);
  return w;
}

export function drawGame(ctx, S) {
  ctx.clearRect(0, 0, VIEW.w, VIEW.h);
  ctx.save();
  if (S.shakeT > 0) {
    ctx.translate((Math.random() - 0.5) * S.shakeT * 14, (Math.random() - 0.5) * S.shakeT * 14);
  }
  // Navy backdrop.
  ctx.fillStyle = COLORS.navy;
  ctx.fillRect(0, 0, VIEW.w, VIEW.h);
  // Subtle navy pattern.
  ctx.fillStyle = 'rgba(253,246,227,0.04)';
  for (let x = 24; x < VIEW.w; x += 72) {
    for (let y = 24; y < VIEW.h; y += 72) {
      ctx.beginPath();
      ctx.arc(x + ((y / 72) % 2) * 36, y, 2, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  drawTopBar(ctx, S);
  drawBoard(ctx, S);
  drawSidebar(ctx, S);
  drawBottomBar(ctx, S);
  if (S.screen === 'title') drawTitle(ctx, S);
  else if (S.screen === 'draft') drawDraft(ctx, S);
  else if (S.screen === 'victory') drawVictory(ctx, S);
  else if (S.screen === 'defeat') drawDefeat(ctx, S);
  if (S.paused && S.screen === 'play') drawPaused(ctx, S);
  ctx.restore();
}

function drawTopBar(ctx, S) {
  ctx.fillStyle = COLORS.navyEdge;
  ctx.fillRect(TOP.x, TOP.y, TOP.w, TOP.h);
  ctx.fillStyle = 'rgba(242,201,76,0.25)';
  ctx.fillRect(0, TOP.h - 3, VIEW.w, 3);
  // Stage pill.
  ctx.fillStyle = COLORS.gold;
  ctx.font = font(15, true);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(S.stageName, 18, 30);
  // Score.
  ctx.fillStyle = '#fdf6e3';
  ctx.font = font(22, true);
  ctx.textAlign = 'center';
  ctx.fillText('SCORE ' + S.score.toLocaleString('en-US'), 470, 30);
  // Gold + essence.
  ctx.textAlign = 'left';
  ctx.font = font(16, true);
  ctx.fillStyle = '#f2c94c';
  ctx.beginPath();
  ctx.arc(648, 30, 9, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#2b2620';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = '#fdf6e3';
  ctx.fillText(String(S.gold), 662, 31);
  ctx.fillStyle = '#7fb069';
  ctx.beginPath();
  ctx.ellipse(742, 30, 8, 10, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#fdf6e3';
  ctx.fillText(Math.max(0, Math.round(S.essence)) + ' / ' + S.maxEssence, 756, 31);
  // Objective pills.
  let px = 880;
  px += pill(ctx, px, 19, 'CLEAR ALL FIENDS', '#fdf6e3', '#3f8f7a') + 8;
  pill(ctx, px, 19, 'ESSENCE > 0', '#fdf6e3', '#a03a2c');
  // Sound + pause buttons (icons drawn with paths — font glyphs are unreliable).
  iconButton(ctx, S, 'sound', 1152, 12, (g) => drawSpeaker(g, S.muted));
  iconButton(ctx, S, 'pause', 1196, 12, (g) => drawPausePlay(g, S.paused));
}

function iconButton(ctx, S, id, x, y, drawFn) {
  S.ui.buttons.push({ id, x, y, w: 36, h: 36 });
  const hover = S.hover && S.hover.x >= x && S.hover.x <= x + 36 && S.hover.y >= y && S.hover.y <= y + 36;
  ctx.save();
  ctx.fillStyle = COLORS.navyLight;
  wobblyRect(ctx, x, y, 36, 36, 6, 1.7);
  ctx.fill();
  ctx.strokeStyle = '#f2c94c';
  ctx.lineWidth = hover ? 3.5 : 2.5;
  ctx.stroke();
  ctx.translate(x + 18, y + 18);
  drawFn(ctx);
  ctx.restore();
}

function drawSpeaker(ctx, muted) {
  ctx.fillStyle = '#fdf6e3';
  ctx.beginPath();
  ctx.moveTo(-9, -3);
  ctx.lineTo(-4, -3);
  ctx.lineTo(2, -9);
  ctx.lineTo(2, 9);
  ctx.lineTo(-4, 3);
  ctx.lineTo(-9, 3);
  ctx.closePath();
  ctx.fill();
  if (muted) {
    ctx.strokeStyle = '#c0392b';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(5, -6);
    ctx.lineTo(12, 6);
    ctx.moveTo(12, -6);
    ctx.lineTo(5, 6);
    ctx.stroke();
  } else {
    ctx.strokeStyle = '#fdf6e3';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(2, 0, 7, -0.9, 0.9);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(2, 0, 11, -0.9, 0.9);
    ctx.stroke();
  }
}

function drawPausePlay(ctx, paused) {
  ctx.fillStyle = '#fdf6e3';
  if (paused) {
    ctx.beginPath();
    ctx.moveTo(-5, -8);
    ctx.lineTo(9, 0);
    ctx.lineTo(-5, 8);
    ctx.closePath();
    ctx.fill();
  } else {
    ctx.fillRect(-7, -8, 5, 16);
    ctx.fillRect(2, -8, 5, 16);
  }
}

function drawBoard(ctx, S) {
  // Parchment + ink frame.
  ctx.save();
  ctx.drawImage(parchmentTexture(), BOARD.x, BOARD.y);
  ctx.strokeStyle = COLORS.ink;
  ctx.lineWidth = 4;
  wobblyRect(ctx, BOARD.x, BOARD.y, BOARD.w, BOARD.h, 6, 3.1);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(43,38,32,0.35)';
  ctx.lineWidth = 1.5;
  wobblyRect(ctx, BOARD.x + 8, BOARD.y + 8, BOARD.w - 16, BOARD.h - 16, 4, 7.7);
  ctx.stroke();
  // Grid dots.
  ctx.fillStyle = 'rgba(43,38,32,0.14)';
  for (let x = BOARD.x + 40; x < BOARD.x + BOARD.w - 20; x += 46) {
    for (let y = BOARD.y + 40; y < BOARD.y + BOARD.h - 20; y += 46) {
      ctx.beginPath();
      ctx.arc(x, y, 1.6, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  drawDecals(ctx, S.decals);
  drawZones(ctx);
  drawWalls(ctx, S.walls);
  drawCauldrons(ctx, S.cauldrons, S.time);
  // Enemies, pucks, particles, callouts.
  for (const e of S.enemies) {
    ctx.save();
    ctx.translate(e.x, e.y);
    drawEnemy(ctx, e, S.time);
    ctx.restore();
  }
  for (const p of S.extraPucks) drawPuck(ctx, p, S.time);
  if (S.puck) drawPuck(ctx, S.puck, S.time);
  drawParticles(ctx, S.particles);
  drawFloaters(ctx, S.floaters);
  drawCallouts(ctx, S.callouts);
  // Sling aim arrow.
  if (S.aim && S.aim.active && S.puck && S.puck.resting) {
    const dx = S.aim.cx - S.aim.sx;
    const dy = S.aim.cy - S.aim.sy;
    const len = Math.hypot(dx, dy);
    if (len > 12) {
      const ax = S.puck.x - (dx / len) * Math.min(len * 1.4, 150);
      const ay = S.puck.y - (dy / len) * Math.min(len * 1.4, 150);
      ctx.strokeStyle = 'rgba(192,57,43,0.9)';
      ctx.lineWidth = 4;
      ctx.setLineDash([10, 8]);
      ctx.beginPath();
      ctx.moveTo(S.puck.x, S.puck.y);
      ctx.lineTo(ax, ay);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = '#c0392b';
      const ang = Math.atan2(ay - S.puck.y, ax - S.puck.x);
      ctx.beginPath();
      ctx.moveTo(ax + Math.cos(ang) * 14, ay + Math.sin(ang) * 14);
      ctx.lineTo(ax + Math.cos(ang + 2.6) * 12, ay + Math.sin(ang + 2.6) * 12);
      ctx.lineTo(ax + Math.cos(ang - 2.6) * 12, ay + Math.sin(ang - 2.6) * 12);
      ctx.closePath();
      ctx.fill();
      ctx.font = font(13, true);
      ctx.fillStyle = '#c0392b';
      ctx.textAlign = 'center';
      ctx.fillText('POWER ' + Math.round(Math.min(100, (len / 160) * 100)) + '%', S.puck.x, S.puck.y - 30);
    }
  }
  // Boss HP bar.
  if (S.boss) {
    const bw = 420;
    const bx = BOARD.x + (BOARD.w - bw) / 2;
    const by = BOARD.y + 10;
    ctx.fillStyle = 'rgba(29,43,74,0.8)';
    ctx.fillRect(bx - 4, by - 4, bw + 8, 26);
    ctx.fillStyle = '#8e2a20';
    ctx.fillRect(bx, by, bw, 18);
    ctx.fillStyle = '#c0392b';
    ctx.fillRect(bx, by, (bw * Math.max(0, S.boss.hp)) / S.boss.maxHp, 18);
    ctx.strokeStyle = '#f2c94c';
    ctx.lineWidth = 2;
    ctx.strokeRect(bx, by, bw, 18);
    ctx.fillStyle = '#fdf6e3';
    ctx.font = font(13, true);
    ctx.textAlign = 'center';
    ctx.fillText('THE TEA-KETTLE TYRANT  ·  ' + Math.max(0, S.boss.hp) + ' HP', bx + bw / 2, by + 9);
  }
  ctx.restore();
}

function drawSidebar(ctx, S) {
  ctx.fillStyle = COLORS.navyLight;
  wobblyRect(ctx, SIDE.x, SIDE.y, SIDE.w, SIDE.h, 6, 5.3);
  ctx.fill();
  ctx.strokeStyle = '#f2c94c';
  ctx.lineWidth = 2;
  ctx.stroke();
  // Threat queue.
  ctx.fillStyle = '#f2c94c';
  ctx.font = font(15, true);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText('THREAT QUEUE', SIDE.x + 14, SIDE.y + 24);
  ctx.fillStyle = 'rgba(253,246,227,0.55)';
  ctx.font = font(11, false);
  ctx.fillText(S.enemies.length + ' on the board', SIDE.x + 14, SIDE.y + 44);
  // Queue rows: upcoming fiends first, then fiends already on the board.
  const rows = [];
  for (let i = 0; i < S.spawnQueue.length && rows.length < 5; i++) {
    rows.push({ type: S.spawnQueue[i], name: S.spawnNames[i], hp: S.spawnHp[i], max: S.spawnHp[i] });
  }
  for (const e of S.enemies) {
    if (rows.length >= 5) break;
    rows.push({ type: e.type, name: e.def.name, hp: Math.max(0, Math.round(e.hp)), max: e.maxHp });
  }
  for (let i = 0; i < 5; i++) {
    const ry = SIDE.y + 62 + i * 56;
    ctx.fillStyle = 'rgba(20,31,56,0.55)';
    ctx.fillRect(SIDE.x + 12, ry, SIDE.w - 24, 48);
    ctx.strokeStyle = 'rgba(242,201,76,0.35)';
    ctx.lineWidth = 1;
    ctx.strokeRect(SIDE.x + 12, ry, SIDE.w - 24, 48);
    const row = rows[i];
    if (!row) {
      ctx.fillStyle = 'rgba(253,246,227,0.4)';
      ctx.font = font(12, false);
      ctx.fillText('— clear —', SIDE.x + 66, ry + 24);
      continue;
    }
    drawPortrait(ctx, row.type, SIDE.x + 38, ry + 24, 40);
    ctx.fillStyle = '#fdf6e3';
    ctx.font = font(13, true);
    ctx.textAlign = 'left';
    ctx.fillText(row.name, SIDE.x + 66, ry + 16);
    ctx.fillStyle = 'rgba(253,246,227,0.25)';
    ctx.fillRect(SIDE.x + 66, ry + 30, 150, 8);
    ctx.fillStyle = '#3f8f7a';
    ctx.fillRect(SIDE.x + 66, ry + 30, 150 * Math.max(0, row.hp / row.max), 8);
    ctx.fillStyle = 'rgba(253,246,227,0.7)';
    ctx.font = font(11, false);
    ctx.fillText(row.hp + ' HP', SIDE.x + 224, ry + 34);
  }
  // Relics held.
  const ry = SIDE.y + 62 + 5 * 56 + 14;
  ctx.fillStyle = '#f2c94c';
  ctx.font = font(15, true);
  ctx.fillText('RELICS HELD (' + S.relicsHeld.length + '/5)', SIDE.x + 14, ry);
  for (let i = 0; i < 5; i++) {
    const sx = SIDE.x + 14 + i * 58;
    const sy = ry + 16;
    ctx.fillStyle = 'rgba(20,31,56,0.55)';
    ctx.fillRect(sx, sy, 50, 50);
    ctx.strokeStyle = S.relicsHeld[i] ? '#f2c94c' : 'rgba(253,246,227,0.3)';
    ctx.setLineDash(S.relicsHeld[i] ? [] : [4, 4]);
    ctx.lineWidth = 1.5;
    ctx.strokeRect(sx, sy, 50, 50);
    ctx.setLineDash([]);
    if (S.relicsHeld[i]) drawRelicIcon(ctx, S.relicsHeld[i].id, sx + 25, sy + 25, 36);
    else {
      ctx.fillStyle = 'rgba(253,246,227,0.35)';
      ctx.font = font(16, true);
      ctx.textAlign = 'center';
      ctx.fillText('?', sx + 25, sy + 26);
    }
  }
  // Held relic names.
  ctx.textAlign = 'left';
  ctx.font = font(11, false);
  ctx.fillStyle = 'rgba(253,246,227,0.75)';
  let ny = ry + 84;
  for (const r of S.relicsHeld) {
    ctx.fillText('· ' + r.name + '  —  ' + r.tag, SIDE.x + 14, ny);
    ny += 16;
  }
  if (S.relicsHeld.length === 0) ctx.fillText('No relics yet — clear a stage!', SIDE.x + 14, ny);
}

function drawBottomBar(ctx, S) {
  ctx.fillStyle = COLORS.navyEdge;
  ctx.fillRect(BOTTOM.x, BOTTOM.y, BOTTOM.w, BOTTOM.h);
  ctx.fillStyle = 'rgba(242,201,76,0.25)';
  ctx.fillRect(0, BOTTOM.y, VIEW.w, 3);
  // Dual meters.
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#fdf6e3';
  ctx.font = font(12, true);
  ctx.fillText('ESSENCE', 18, BOTTOM.y + 14);
  ctx.fillText('GOLD', 18, BOTTOM.y + 40);
  bar(ctx, 92, BOTTOM.y + 6, 190, 16, S.essence / S.maxEssence, '#7fb069');
  bar(ctx, 92, BOTTOM.y + 32, 190, 16, Math.min(1, S.gold / 300), '#d4a017');
  ctx.fillStyle = '#fdf6e3';
  ctx.font = font(12, false);
  ctx.fillText(Math.max(0, Math.round(S.essence)) + '', 288, BOTTOM.y + 14);
  ctx.fillText(String(S.gold), 288, BOTTOM.y + 40);
  // Hotbar.
  const hx = 340;
  for (let i = 0; i < HOTBAR.length; i++) {
    const h = HOTBAR[i];
    const x = hx + i * 62;
    const y = BOTTOM.y + 7;
    const cd = S.hotbarCd[i] || 0;
    const ready = cd <= 0;
    ctx.fillStyle = ready ? 'rgba(253,246,227,0.14)' : 'rgba(20,31,56,0.7)';
    ctx.fillRect(x, y, 54, 48);
    ctx.strokeStyle = ready ? '#f2c94c' : 'rgba(253,246,227,0.3)';
    ctx.lineWidth = ready ? 2 : 1;
    ctx.strokeRect(x, y, 54, 48);
    drawHotbarIcon(ctx, h.id, x + 27, y + 24, 30);
    // Keybind badge.
    ctx.fillStyle = '#c0392b';
    ctx.beginPath();
    ctx.arc(x + 47, y + 7, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fdf6e3';
    ctx.font = font(11, true);
    ctx.textAlign = 'center';
    ctx.fillText(h.key, x + 47, y + 8);
    if (!ready) {
      ctx.fillStyle = 'rgba(20,31,56,0.65)';
      ctx.fillRect(x, y, 54, 48 * Math.min(1, cd / h.cd));
      ctx.fillStyle = '#fdf6e3';
      ctx.font = font(14, true);
      ctx.fillText(Math.ceil(cd), x + 27, y + 26);
    }
    S.ui.buttons.push({ id: 'hotbar' + i, x, y, w: 54, h: 48 });
  }
  // Combo + grade.
  const combo = S.combo;
  const mult = (1 + Math.min(combo, 16) * 0.25).toFixed(2);
  ctx.textAlign = 'right';
  ctx.fillStyle = '#f2c94c';
  ctx.font = font(24, true);
  ctx.fillText('COMBO x' + mult, 1150, BOTTOM.y + 24);
  ctx.fillStyle = 'rgba(253,246,227,0.7)';
  ctx.font = font(12, false);
  ctx.fillText(combo + ' hits in a row', 1150, BOTTOM.y + 46);
  // Grade badge.
  const gx = 1218;
  const gy = BOTTOM.y + 31;
  ctx.fillStyle = gradeColor(S.grade);
  ctx.beginPath();
  ctx.arc(gx, gy, 24, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#fdf6e3';
  ctx.lineWidth = 2.5;
  ctx.stroke();
  ctx.fillStyle = '#fdf6e3';
  ctx.font = font(24, true);
  ctx.textAlign = 'center';
  ctx.fillText(S.grade, gx, gy + 1);
}

function bar(ctx, x, y, w, h, frac, color) {
  ctx.fillStyle = 'rgba(253,246,227,0.2)';
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w * Math.max(0, Math.min(1, frac)), h);
  ctx.strokeStyle = '#2b2620';
  ctx.lineWidth = 1;
  ctx.strokeRect(x, y, w, h);
}

function gradeColor(g) {
  if (g === 'S') return '#d4a017';
  if (g === 'A') return '#3f8f7a';
  if (g === 'B') return '#7fa3b8';
  return '#5c5344';
}

function drawHotbarIcon(ctx, id, cx, cy, size) {
  const s = size / 2;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.lineWidth = 2;
  ctx.strokeStyle = '#fdf6e3';
  ctx.fillStyle = '#fdf6e3';
  if (id === 'frost') {
    for (let i = 0; i < 3; i++) {
      ctx.save();
      ctx.rotate((i * Math.PI) / 3);
      ctx.beginPath();
      ctx.moveTo(-s * 0.7, 0);
      ctx.lineTo(s * 0.7, 0);
      ctx.stroke();
      ctx.restore();
    }
  } else if (id === 'triple') {
    ctx.beginPath();
    ctx.arc(-s * 0.5, s * 0.2, s * 0.28, 0, Math.PI * 2);
    ctx.arc(0, -s * 0.3, s * 0.28, 0, Math.PI * 2);
    ctx.arc(s * 0.5, s * 0.2, s * 0.28, 0, Math.PI * 2);
    ctx.fill();
  } else if (id === 'bomb') {
    ctx.beginPath();
    ctx.arc(0, s * 0.15, s * 0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(0, -s * 0.35);
    ctx.quadraticCurveTo(s * 0.3, -s * 0.8, s * 0.55, -s * 0.6);
    ctx.stroke();
  } else if (id === 'magnet') {
    ctx.beginPath();
    ctx.arc(0, -s * 0.1, s * 0.55, Math.PI, 0);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-s * 0.55, -s * 0.1);
    ctx.lineTo(-s * 0.55, s * 0.45);
    ctx.moveTo(s * 0.55, -s * 0.1);
    ctx.lineTo(s * 0.55, s * 0.45);
    ctx.stroke();
  } else if (id === 'wall') {
    ctx.strokeRect(-s * 0.6, -s * 0.5, s * 1.2, s);
    ctx.beginPath();
    ctx.moveTo(-s * 0.6, 0);
    ctx.lineTo(s * 0.6, 0);
    ctx.moveTo(0, -s * 0.5);
    ctx.lineTo(0, 0);
    ctx.stroke();
  } else {
    // tea cup
    ctx.beginPath();
    ctx.arc(0, s * 0.1, s * 0.5, 0, Math.PI);
    ctx.closePath();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-s * 0.5, -s * 0.4);
    ctx.lineTo(s * 0.5, -s * 0.4);
    ctx.stroke();
  }
  ctx.restore();
}

function dimBoard(ctx) {
  ctx.fillStyle = 'rgba(29,43,74,0.45)';
  ctx.fillRect(0, 0, VIEW.w, VIEW.h);
}

function drawTitle(ctx, S) {
  dimBoard(ctx);
  const cx = BOARD.x + BOARD.w / 2;
  const card = { x: cx - 420, y: 84, w: 840, h: 540 };
  ctx.fillStyle = COLORS.parchment;
  wobblyRect(ctx, card.x, card.y, card.w, card.h, 8, 9.1);
  ctx.fill();
  ctx.strokeStyle = COLORS.ink;
  ctx.lineWidth = 4;
  ctx.stroke();
  ctx.strokeStyle = '#d4a017';
  ctx.lineWidth = 2;
  wobblyRect(ctx, card.x + 10, card.y + 10, card.w - 20, card.h - 20, 6, 2.2);
  ctx.stroke();
  ctx.textAlign = 'center';
  ctx.fillStyle = COLORS.ink;
  ctx.font = font(44, true);
  ctx.fillText("ALCHEMIST'S PINBALL", cx, card.y + 64);
  ctx.fillStyle = COLORS.red;
  ctx.font = font(26, true);
  ctx.fillText('· CAULDRON BOUNCE ·', cx, card.y + 100);
  ctx.fillStyle = COLORS.inkSoft;
  ctx.font = font(14, false);
  ctx.fillText('Sling enchanted ink-pucks. Slice the porcelain fiends. Dunk them in the brew.', cx, card.y + 128);
  // HOW TO PLAY comic: 3 panels.
  ctx.fillStyle = COLORS.navy;
  ctx.font = font(15, true);
  ctx.fillText('HOW TO PLAY', cx, card.y + 162);
  const panels = [
    { title: '1 · DRAG TO SLING', sub: 'Pull back, let go —\nthe puck flies!' },
    { title: '2 · BOUNCE & SLICE', sub: 'Ricochet off ink walls\nto slice every fiend.' },
    { title: '3 · DUNK THE CAULDRON', sub: 'Knock fiends into the\nbrew for big bonuses!' },
  ];
  const pw = 240;
  const gap = 18;
  const px0 = cx - (pw * 3 + gap * 2) / 2;
  const py = card.y + 178;
  for (let i = 0; i < 3; i++) {
    const x = px0 + i * (pw + gap);
    ctx.fillStyle = COLORS.cream;
    ctx.fillRect(x, py, pw, 182);
    ctx.strokeStyle = COLORS.ink;
    ctx.lineWidth = 2.5;
    ctx.strokeRect(x, py, pw, 182);
    drawComicPanel(ctx, i, x + pw / 2, py + 72);
    ctx.fillStyle = COLORS.navy;
    ctx.font = font(13, true);
    ctx.fillText(panels[i].title, x + pw / 2, py + 136);
    ctx.fillStyle = COLORS.inkSoft;
    ctx.font = font(12, false);
    const lines = panels[i].sub.split('\n');
    ctx.fillText(lines[0], x + pw / 2, py + 152);
    ctx.fillText(lines[1], x + pw / 2, py + 168);
  }
  button(ctx, S, 'play', cx - 130, card.y + 402, 260, 56, '▶  PLAY', { red: true, fontSize: 24 });
  ctx.fillStyle = COLORS.inkSoft;
  ctx.font = font(12, false);
  ctx.fillText('Drag / touch to sling · Keys 1–6 abilities · P pause · M mute · R restart', cx, card.y + 492);
  ctx.fillText('Clear all 5 stages — the Tea-Kettle Tyrant waits at the end!', cx, card.y + 514);
}

function drawComicPanel(ctx, i, cx, cy) {
  ctx.save();
  ctx.translate(cx, cy);
  if (i === 0) {
    // Puck + drag arrow.
    ctx.fillStyle = '#2b2620';
    ctx.beginPath();
    ctx.arc(-30, 10, 16, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#c0392b';
    ctx.lineWidth = 4;
    ctx.setLineDash([7, 6]);
    ctx.beginPath();
    ctx.moveTo(-30, 10);
    ctx.lineTo(34, -18);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = '#c0392b';
    ctx.beginPath();
    ctx.moveTo(44, -22);
    ctx.lineTo(28, -28);
    ctx.lineTo(30, -12);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#5b4a8a';
    ctx.beginPath();
    ctx.arc(52, -26, 8, 0, Math.PI * 2);
    ctx.fill();
  } else if (i === 1) {
    // Puck slicing a gremlin.
    ctx.fillStyle = '#2b2620';
    ctx.beginPath();
    ctx.arc(-34, 6, 14, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#5b4a8a';
    ctx.beginPath();
    ctx.arc(30, 0, 22, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#2b2620';
    ctx.lineWidth = 2.5;
    ctx.stroke();
    ctx.strokeStyle = '#c0392b';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(6, -14);
    ctx.lineTo(52, 14);
    ctx.stroke();
    ctx.fillStyle = '#c0392b';
    ctx.font = font(16, true);
    ctx.fillText('SLICE!', 30, -30);
  } else {
    // Gremlin flying into a cauldron.
    ctx.fillStyle = '#8a6d3b';
    ctx.beginPath();
    ctx.ellipse(28, 18, 34, 22, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#2b2620';
    ctx.lineWidth = 2.5;
    ctx.stroke();
    ctx.fillStyle = '#7fb069';
    ctx.beginPath();
    ctx.ellipse(28, 8, 26, 10, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#5b4a8a';
    ctx.beginPath();
    ctx.arc(-32, -18, 18, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#c0392b';
    ctx.lineWidth = 3;
    ctx.setLineDash([6, 5]);
    ctx.beginPath();
    ctx.moveTo(-14, -10);
    ctx.lineTo(14, 4);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = '#c0392b';
    ctx.font = font(16, true);
    ctx.fillText('+100', 40, -28);
  }
  ctx.restore();
}

function drawDraft(ctx, S) {
  dimBoard(ctx);
  const cx = BOARD.x + BOARD.w / 2;
  ctx.textAlign = 'center';
  ctx.fillStyle = '#fdf6e3';
  ctx.font = font(30, true);
  ctx.fillText('CHOOSE A RELIC — PICK 1 OF 3', cx, 128);
  ctx.fillStyle = '#f2c94c';
  ctx.font = font(15, false);
  ctx.fillText('Stage ' + (S.stage - 1) + ' cleared!  The brew rewards you.  ·  Relics held: ' + S.relicsHeld.length + '/5', cx, 156);
  const cw = 250;
  const ch = 330;
  const gap = 26;
  const x0 = cx - (cw * 3 + gap * 2) / 2;
  const y0 = 190;
  for (let i = 0; i < 3; i++) {
    const r = S.draftOptions[i];
    const x = x0 + i * (cw + gap);
    if (!r) continue;
    ctx.fillStyle = COLORS.parchment;
    wobblyRect(ctx, x, y0, cw, ch, 8, 4.4 + i);
    ctx.fill();
    ctx.strokeStyle = COLORS.ink;
    ctx.lineWidth = 3;
    ctx.stroke();
    // Colored header banner.
    ctx.fillStyle = r.color;
    ctx.fillRect(x + 4, y0 + 4, cw - 8, 52);
    ctx.fillStyle = '#fdf6e3';
    ctx.font = font(17, true);
    ctx.fillText(r.name.toUpperCase(), x + cw / 2, y0 + 36);
    drawRelicIcon(ctx, r.id, x + cw / 2, y0 + 128, 84);
    ctx.fillStyle = COLORS.navy;
    ctx.font = font(16, true);
    ctx.fillText(r.tag, x + cw / 2, y0 + 200);
    ctx.fillStyle = COLORS.inkSoft;
    ctx.font = font(13, false);
    wrapText(ctx, r.desc, x + cw / 2, y0 + 226, cw - 36, 18);
    S.ui.buttons.push({ id: 'relic' + i, x, y: y0, w: cw, h: ch });
  }
  button(ctx, S, 'reroll', cx - 110, y0 + ch + 24, 220, 44, 'REROLL — 25 GOLD', { fontSize: 15 });
  ctx.fillStyle = 'rgba(253,246,227,0.8)';
  ctx.font = font(13, false);
  ctx.fillText('Gold: ' + S.gold + (S.gold < 25 ? '  (not enough to reroll)' : ''), cx, y0 + ch + 92);
}

function wrapText(ctx, text, cx, y, maxW, lh) {
  const words = text.split(' ');
  let line = '';
  let yy = y;
  for (const w of words) {
    const test = line ? line + ' ' + w : w;
    if (ctx.measureText(test).width > maxW && line) {
      ctx.fillText(line, cx, yy);
      line = w;
      yy += lh;
    } else {
      line = test;
    }
  }
  if (line) ctx.fillText(line, cx, yy);
}

function drawVictory(ctx, S) {
  dimBoard(ctx);
  const cx = BOARD.x + BOARD.w / 2;
  const card = { x: cx - 360, y: 96, w: 720, h: 520 };
  ctx.fillStyle = COLORS.parchment;
  wobblyRect(ctx, card.x, card.y, card.w, card.h, 8, 6.6);
  ctx.fill();
  ctx.strokeStyle = COLORS.ink;
  ctx.lineWidth = 4;
  ctx.stroke();
  ctx.strokeStyle = '#d4a017';
  ctx.lineWidth = 2;
  wobblyRect(ctx, card.x + 10, card.y + 10, card.w - 20, card.h - 20, 6, 8.8);
  ctx.stroke();
  // Big rank badge.
  ctx.fillStyle = gradeColor(S.rank);
  ctx.beginPath();
  ctx.arc(cx, card.y + 92, 58, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#fdf6e3';
  ctx.lineWidth = 4;
  ctx.stroke();
  ctx.fillStyle = '#fdf6e3';
  ctx.font = font(64, true);
  ctx.textAlign = 'center';
  ctx.fillText(S.rank, cx, card.y + 116);
  ctx.fillStyle = COLORS.ink;
  ctx.font = font(30, true);
  ctx.fillText(S.rank === 'S' ? 'CAULDRON MASTER!' : 'THE BREW IS SAVED!', cx, card.y + 200);
  ctx.fillStyle = COLORS.inkSoft;
  ctx.font = font(15, false);
  ctx.fillText('The Tea-Kettle Tyrant is dunked. The alchemists sing your name.', cx, card.y + 228);
  // Breakdown table.
  const rows = [
    ['Final Score', S.score.toLocaleString('en-US')],
    ['Damage Dealt', String(S.stats.damageDealt)],
    ['Max Combo', 'x' + (1 + Math.min(S.stats.maxCombo, 16) * 0.25).toFixed(2) + '  (' + S.stats.maxCombo + ' hits)'],
    ['Relics Used', String(S.stats.relicsUsed)],
    ['Time', fmtTime(S.stats.timeSec)],
  ];
  ctx.textAlign = 'left';
  let yy = card.y + 268;
  for (const [k, v] of rows) {
    ctx.fillStyle = COLORS.inkSoft;
    ctx.font = font(15, false);
    ctx.fillText(k, card.x + 90, yy);
    ctx.fillStyle = COLORS.ink;
    ctx.font = font(15, true);
    ctx.textAlign = 'right';
    ctx.fillText(v, card.x + card.w - 90, yy);
    ctx.textAlign = 'left';
    ctx.strokeStyle = 'rgba(43,38,32,0.25)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(card.x + 90, yy + 10);
    ctx.lineTo(card.x + card.w - 90, yy + 10);
    ctx.stroke();
    yy += 32;
  }
  button(ctx, S, 'replay', cx - 120, card.y + 448, 240, 50, 'PLAY AGAIN', { red: true, fontSize: 20 });
}

function drawDefeat(ctx, S) {
  dimBoard(ctx);
  const cx = BOARD.x + BOARD.w / 2;
  const card = { x: cx - 330, y: 150, w: 660, h: 380 };
  ctx.fillStyle = COLORS.parchment;
  wobblyRect(ctx, card.x, card.y, card.w, card.h, 8, 3.3);
  ctx.fill();
  ctx.strokeStyle = COLORS.ink;
  ctx.lineWidth = 4;
  ctx.stroke();
  ctx.textAlign = 'center';
  ctx.fillStyle = COLORS.red;
  ctx.font = font(32, true);
  ctx.fillText('THE CAULDRON RUNS DRY', cx, card.y + 70);
  ctx.fillStyle = COLORS.inkSoft;
  ctx.font = font(15, false);
  ctx.fillText('The fiends drank every drop of essence.', cx, card.y + 102);
  ctx.fillStyle = COLORS.ink;
  ctx.font = font(16, true);
  ctx.fillText('Score ' + S.score.toLocaleString('en-US') + '  ·  Reached Stage ' + S.stage, cx, card.y + 150);
  ctx.fillText('Damage Dealt ' + S.stats.damageDealt + '  ·  Max Combo ' + S.stats.maxCombo, cx, card.y + 180);
  button(ctx, S, 'retry', cx - 120, card.y + 240, 240, 52, 'TRY AGAIN', { red: true, fontSize: 20 });
}

function drawPaused(ctx, S) {
  ctx.fillStyle = 'rgba(29,43,74,0.55)';
  ctx.fillRect(0, 0, VIEW.w, VIEW.h);
  ctx.fillStyle = '#fdf6e3';
  ctx.font = font(36, true);
  ctx.textAlign = 'center';
  ctx.fillText('PAUSED', VIEW.w / 2, 330);
  ctx.font = font(15, false);
  ctx.fillText('Press P or tap Resume to keep brewing.', VIEW.w / 2, 362);
  button(ctx, S, 'resume', VIEW.w / 2 - 110, 392, 220, 48, '▶  RESUME', { red: true, fontSize: 18 });
}

function fmtTime(sec) {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return m + ':' + String(s).padStart(2, '0');
}
