// relics.js — relic draft picks and the little emblem illustrations for each relic.
// One file, one job: relics, their effects and their icons.

import { RELICS } from './config.js';
import { shuffle } from './random.js';

export function drawRelicOptions(rng, held, count) {
  const pool = RELICS.filter((r) => !held.some((h) => h.id === r.id));
  return shuffle(rng, pool).slice(0, count);
}

export function hasRelic(state, id) {
  return state.relicsHeld.some((r) => r.id === id);
}

// Draw a relic emblem inside a box centered at (cx, cy) with the given size.
export function drawRelicIcon(ctx, id, cx, cy, size) {
  const s = size / 2;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.lineWidth = Math.max(2, size * 0.06);
  ctx.strokeStyle = '#2b2620';
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  if (id === 'ladle') {
    ctx.fillStyle = '#d4a017';
    ctx.beginPath();
    ctx.arc(0, -s * 0.25, s * 0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, s * 0.2);
    ctx.lineTo(0, s * 0.85);
    ctx.stroke();
    ctx.fillStyle = '#f2c94c';
    ctx.beginPath();
    ctx.arc(0, -s * 0.25, s * 0.26, 0, Math.PI * 2);
    ctx.fill();
  } else if (id === 'bounce') {
    ctx.fillStyle = '#3f8f7a';
    ctx.beginPath();
    ctx.arc(0, 0, s * 0.62, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = '#f2c94c';
    ctx.beginPath();
    ctx.moveTo(-s * 0.4, 0);
    ctx.lineTo(s * 0.4, 0);
    ctx.moveTo(0, -s * 0.4);
    ctx.lineTo(0, s * 0.4);
    ctx.stroke();
  } else if (id === 'cauldron') {
    ctx.fillStyle = '#8a6d3b';
    ctx.beginPath();
    ctx.ellipse(0, s * 0.15, s * 0.62, s * 0.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#7fb069';
    ctx.beginPath();
    ctx.ellipse(0, -s * 0.15, s * 0.5, s * 0.28, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  } else if (id === 'stirrer') {
    ctx.strokeStyle = '#5b4a8a';
    ctx.lineWidth = size * 0.09;
    ctx.beginPath();
    ctx.arc(0, 0, s * 0.55, 0.6, Math.PI * 2 - 0.6);
    ctx.stroke();
    ctx.fillStyle = '#5b4a8a';
    ctx.beginPath();
    ctx.arc(s * 0.5, -s * 0.28, s * 0.14, 0, Math.PI * 2);
    ctx.fill();
  } else if (id === 'shield') {
    ctx.fillStyle = '#7fa3b8';
    ctx.beginPath();
    ctx.moveTo(0, -s * 0.7);
    ctx.lineTo(s * 0.55, -s * 0.35);
    ctx.lineTo(s * 0.55, s * 0.1);
    ctx.quadraticCurveTo(s * 0.55, s * 0.7, 0, s * 0.85);
    ctx.quadraticCurveTo(-s * 0.55, s * 0.7, -s * 0.55, s * 0.1);
    ctx.lineTo(-s * 0.55, -s * 0.35);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#2b2620';
    ctx.lineWidth = Math.max(2, size * 0.06);
    ctx.stroke();
  } else if (id === 'twin') {
    ctx.fillStyle = '#2b2620';
    ctx.beginPath();
    ctx.arc(-s * 0.32, 0, s * 0.36, 0, Math.PI * 2);
    ctx.arc(s * 0.32, 0, s * 0.36, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#d4a017';
    ctx.beginPath();
    ctx.arc(-s * 0.32, 0, s * 0.36, 0, Math.PI * 2);
    ctx.arc(s * 0.32, 0, s * 0.36, 0, Math.PI * 2);
    ctx.stroke();
  } else if (id === 'quill') {
    ctx.fillStyle = '#fdf6e3';
    ctx.beginPath();
    ctx.moveTo(0, -s * 0.8);
    ctx.quadraticCurveTo(s * 0.6, -s * 0.1, 0, s * 0.7);
    ctx.quadraticCurveTo(-s * 0.6, -s * 0.1, 0, -s * 0.8);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, -s * 0.6);
    ctx.lineTo(0, s * 0.6);
    ctx.stroke();
  } else {
    // honey
    ctx.fillStyle = '#b98a3e';
    ctx.beginPath();
    ctx.ellipse(0, s * 0.1, s * 0.55, s * 0.6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#e8cf9a';
    ctx.beginPath();
    ctx.arc(0, -s * 0.55, s * 0.22, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
  ctx.restore();
}
