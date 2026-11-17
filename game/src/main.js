// main.js — the game itself: state machine, loop, sling physics glue, stages, draft,
// scoring, grade, staged screenshot scenes, and the window.__game test handle.
// One file, one job: running the game.

import { BOARD, COMBO_WINDOW, ENEMY_TYPES, ESSENCE_MAX, HOTBAR, PUCK_DAMAGE, PUCK_R, RELICS, STAGES, VIEW, ZONES } from './config.js';
import { mulberry32, range } from './random.js';
import { Sfx } from './audio.js';
import { createInput } from './input.js';
import { makeEnemy, updateEnemy } from './enemies.js';
import { makePuck, launchPuck, updatePuck } from './puck.js';
import { addCallout, addDecal, addFlash, addFloater, burst, cauldronPositions, defaultWalls, updateCallouts, updateDecals, updateFlashes, updateFloaters, updateParticles } from './zones.js';
import { drawRelicOptions, hasRelic } from './relics.js';
import { drawGame } from './render.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const sfx = new Sfx();

function freshState() {
  const cauldrons = cauldronPositions();
  return {
    screen: 'title',
    paused: false,
    muted: false,
    time: 0,
    elapsed: 0,
    stage: 1,
    stageName: STAGES[0].name,
    score: 0,
    gold: 40,
    essence: ESSENCE_MAX,
    maxEssence: ESSENCE_MAX,
    combo: 0,
    comboTimer: 0,
    maxCombo: 0,
    damageDealt: 0,
    relicsUsed: 0,
    relicsHeld: [],
    relicFlags: {},
    draftOptions: [],
    hotbarCd: [0, 0, 0, 0, 0, 0],
    frostArmed: false,
    bombArmed: false,
    shakeT: 0,
    puck: null,
    extraPucks: [],
    enemies: [],
    spawnQueue: [],
    spawnNames: [],
    spawnHp: [],
    spawnTimer: 0,
    particles: [],
    callouts: [],
    floaters: [],
    decals: [],
    flashes: [],
    walls: defaultWalls(),
    cauldrons,
    aim: { active: false, sx: 0, sy: 0, cx: 0, cy: 0 },
    hover: { x: -1, y: -1 },
    boss: null,
    spawnMinion: false,
    puckResetTimer: 0,
    grade: 'C',
    rank: 'C',
    stats: { damageDealt: 0, maxCombo: 0, relicsUsed: 0, timeSec: 0 },
    fps: 0,
    ui: { buttons: [] },
    rng: mulberry32((Math.random() * 1e9) >>> 0),
  };
}

let S = freshState();
let frameCount = 0;
let fpsTimer = 0;

function launcherPos() {
  return { x: BOARD.x + BOARD.w / 2, y: BOARD.y + BOARD.h * 0.62 };
}

// Keep-out circle around the boss so callouts and damage numbers never print
// over the Tyrant's face: they are pushed to the ring outside it instead.
function bossAvoid() {
  return S.boss ? { x: S.boss.x, y: S.boss.y, r: S.boss.r + 52 } : null;
}

function recomputeRelicFlags() {
  S.relicFlags = {};
  for (const r of S.relicsHeld) S.relicFlags[r.id] = true;
}

function gradeFor(score, maxCombo) {
  if (score >= 2500 && maxCombo >= 10) return 'S';
  if (score >= 1500 || maxCombo >= 8) return 'A';
  if (score >= 700 || maxCombo >= 4) return 'B';
  return 'C';
}

function startRun() {
  S = freshState();
  S.screen = 'play';
  startStage(1);
  sfx.ensure();
  sfx.chime();
}

function startStage(n) {
  S.stage = n;
  S.stageName = STAGES[n - 1].name;
  S.spawnQueue = STAGES[n - 1].queue.slice();
  S.spawnNames = S.spawnQueue.map((t) => ENEMY_TYPES[t].name);
  S.spawnHp = S.spawnQueue.map((t) => ENEMY_TYPES[t].hp);
  S.spawnTimer = 0.6;
  S.boss = null;
  const lp = launcherPos();
  S.puck = makePuck(lp.x, lp.y);
  S.extraPucks = [];
  S.enemies = [];
  S.bombArmed = false;
  S.frostArmed = false;
  S.puckResetTimer = 0;
}

function spawnNext() {
  const type = S.spawnQueue.shift();
  if (!type) return;
  S.spawnNames.shift();
  S.spawnHp.shift();
  const edge = Math.floor(S.rng() * 4);
  let x;
  let y;
  const m = 70;
  if (edge === 0) { x = BOARD.x + m + S.rng() * (BOARD.w - 2 * m); y = BOARD.y + m; }
  else if (edge === 1) { x = BOARD.x + m + S.rng() * (BOARD.w - 2 * m); y = BOARD.y + BOARD.h - m; }
  else if (edge === 2) { x = BOARD.x + m; y = BOARD.y + m + S.rng() * (BOARD.h - 2 * m); }
  else { x = BOARD.x + BOARD.w - m; y = BOARD.y + m + S.rng() * (BOARD.h - 2 * m); }
  const e = makeEnemy(type, x, y, S.rng);
  S.enemies.push(e);
  if (type === 'tyrant') {
    S.boss = e;
    sfx.sting();
    addCallout(S.callouts, BOARD.x + BOARD.w / 2, BOARD.y + 120, 'THE TYRANT ARRIVES!', '#c0392b');
  }
}

function damageEnemy(e, dmg, kx, ky) {
  if (e.dead || e.hitCd > 0) return;
  e.hitCd = 0.22;
  e.hp -= dmg;
  e.squash = 0.22;
  e.flash = 0.15;
  S.damageDealt += dmg;
  S.stats.damageDealt += dmg;
  const mult = 1 + Math.min(S.combo, 16) * 0.25;
  const gained = Math.round(dmg * mult);
  S.score += gained;
  addFloater(S.floaters, e.x, e.y - e.r - 6, '-' + dmg, '#c0392b', bossAvoid());
  burst(S.particles, e.x, e.y, '#d4a017', 6, 120);
  addFlash(S.flashes, e.x, e.y, false);
  const kb = 70;
  e.x += kx * kb * 0.016;
  e.y += ky * kb * 0.016;
  if (S.puck && S.puck.frost) {
    e.freeze = 3;
    addFloater(S.floaters, e.x, e.y - e.r - 24, 'FROZEN!', '#7fb8c9', bossAvoid());
  }
  registerHit();
  sfx.thud();
  if (e.hp <= 0) killEnemy(e);
}

function registerHit() {
  S.combo += 1;
  S.maxCombo = Math.max(S.maxCombo, S.combo);
  S.stats.maxCombo = S.maxCombo;
  S.comboTimer = S.relicFlags.stirrer ? COMBO_WINDOW * 1.6 : COMBO_WINDOW;
  S.grade = gradeFor(S.score, S.maxCombo);
}

function killEnemy(e) {
  e.dead = true;
  const wasBoss = S.boss === e;
  if (wasBoss) S.boss = null;
  const goldGain = Math.round(e.def.gold * (S.relicFlags.ladle ? 1.25 : 1));
  S.gold += goldGain;
  S.score += Math.round(100 * (1 + Math.min(S.combo, 16) * 0.25));
  burst(S.particles, e.x, e.y, e.def.color, 16, 200);
  burst(S.particles, e.x, e.y, '#f2c94c', 8, 140);
  addFlash(S.flashes, e.x, e.y, true);
  if (wasBoss) {
    addCallout(S.callouts, e.x, e.y - e.r - 90, 'KETTLE CRACKED! -42', '#c0392b', { x: e.x, y: e.y, r: e.r + 52 });
  } else {
    addCallout(S.callouts, e.x, e.y - 30, e.def.short + ' DOWN!', '#3f8f7a', bossAvoid());
  }
  sfx.bubble();
}

function puckHitsEnemy(p, e) {
  if (e.dead || e.hitCd > 0) return;
  const dx = e.x - p.x;
  const dy = e.y - p.y;
  const d = Math.hypot(dx, dy) || 1;
  const nx = dx / d;
  const ny = dy / d;
  let dmg = PUCK_DAMAGE;
  if (S.relicFlags.quill) dmg = Math.round(dmg * 1.3);
  if (p.bounceMul > 1) dmg = Math.round(dmg * p.bounceMul);
  // Puck bounces off the enemy.
  const dot = p.vx * nx + p.vy * ny;
  if (dot > 0) {
    p.vx -= 2 * dot * nx * 0.9;
    p.vy -= 2 * dot * ny * 0.9;
    p.x -= nx * 2;
    p.y -= ny * 2;
  }
  damageEnemy(e, dmg, nx, ny);
}

function checkCauldrons() {
  for (const e of S.enemies) {
    if (e.dead) continue;
    for (const c of S.cauldrons) {
      const d = Math.hypot(e.x - c.x, e.y - c.y);
      if (d < 36 + e.r * 0.5) {
        e.dead = true;
        // Stage-scaled drain: gentle in Stage 1 so a new player can sling freely
        // and learn, full bite from Stage 4 on. Porcelain Shield halves it (min 2).
        const baseDrain = [0, 4, 6, 8, 10, 10][S.stage] || 10;
        const drain = S.relicFlags.shield ? Math.max(2, Math.round(baseDrain / 2)) : baseDrain;
        S.essence -= drain;
        addCallout(S.callouts, c.x, c.y - 52, 'ESSENCE -' + drain + '!', '#a03a2c');
        burst(S.particles, c.x, c.y - 6, '#7fb069', 10, 120);
        S.combo = 0;
        if (S.essence <= 0) {
          S.essence = 0;
          defeat();
        }
        break;
      }
    }
  }
  S.enemies = S.enemies.filter((e) => !e.dead);
}

function checkPuckCauldron(p) {
  for (const c of S.cauldrons) {
    const d = Math.hypot(p.x - c.x, p.y - c.y);
    if (d < 36) {
      const mult = 1 + Math.min(S.combo, 16) * 0.25;
      const bonus = Math.round(100 * mult * (S.relicFlags.cauldron ? 1.5 : 1));
      S.score += bonus;
      S.gold += 25;
      addCallout(S.callouts, c.x, c.y - 52, 'DUNK! +' + bonus, '#3f8f7a');
      burst(S.particles, c.x, c.y - 6, '#7fb069', 18, 180);
      addFlash(S.flashes, c.x, c.y - 6, true);
      sfx.bubble();
      p.vx = 0;
      p.vy = 0;
      p.resting = true;
      resetPuckSoon();
      return true;
    }
  }
  return false;
}

function resetPuckSoon() {
  S.puckResetTimer = 0.45;
}

function resetPuck() {
  const lp = launcherPos();
  S.puck = makePuck(lp.x, lp.y);
  S.puck.frost = S.frostArmed;
  S.frostArmed = false;
}

function stageClear() {
  S.score += 150 * S.stage;
  if (S.stage >= 5) {
    victory();
    return;
  }
  S.draftOptions = drawRelicOptions(S.rng, S.relicsHeld, 3);
  S.screen = 'draft';
  sfx.chime();
}

function victory() {
  S.screen = 'victory';
  S.rank = gradeFor(S.score, S.maxCombo);
  S.stats.timeSec = Math.round(S.elapsed);
  sfx.chime();
}

function defeat() {
  S.screen = 'defeat';
  S.stats.timeSec = Math.round(S.elapsed);
  sfx.sting();
}

function pickRelic(i) {
  const r = S.draftOptions[i];
  if (!r) return;
  if (S.relicsHeld.length >= 5) S.relicsHeld.shift();
  S.relicsHeld.push(r);
  S.relicsUsed += 1;
  S.stats.relicsUsed += 1;
  recomputeRelicFlags();
  sfx.chime();
  startStage(S.stage + 1);
  S.screen = 'play';
}

function rerollDraft() {
  if (S.gold < 25) return;
  S.gold -= 25;
  S.draftOptions = drawRelicOptions(S.rng, S.relicsHeld, 3);
  sfx.click();
}

function castHotbar(i) {
  if (S.screen !== 'play' || S.paused) return;
  if (S.hotbarCd[i] > 0) return;
  const h = HOTBAR[i];
  S.hotbarCd[i] = h.cd;
  if (h.id === 'frost') {
    S.frostArmed = true;
    if (S.puck && S.puck.resting) S.puck.frost = true;
    addCallout(S.callouts, BOARD.x + BOARD.w / 2, BOARD.y + 100, 'FROST PUCK ARMED!', '#7fb8c9');
  } else if (h.id === 'triple') {
    firePucks(3);
  } else if (h.id === 'bomb') {
    S.bombArmed = true;
    addCallout(S.callouts, BOARD.x + BOARD.w / 2, BOARD.y + 100, 'SPLASH BOMB ARMED!', '#c0392b');
  } else if (h.id === 'magnet') {
    for (const e of S.enemies) e.magnet = 2;
    addCallout(S.callouts, BOARD.x + BOARD.w / 2, BOARD.y + 100, 'MAGNET BREW!', '#5b4a8a');
  } else if (h.id === 'wall') {
    const cx = BOARD.x + BOARD.w / 2;
    const cy = BOARD.y + BOARD.h / 2;
    S.walls.push({ x1: cx - 80, y1: cy, x2: cx + 80, y2: cy, life: 5 });
    addCallout(S.callouts, cx, cy - 40, 'INK WALL UP!', '#2b2620');
  } else if (h.id === 'tea') {
    S.essence = Math.min(S.maxEssence, S.essence + 20);
    addCallout(S.callouts, BOARD.x + BOARD.w / 2, BOARD.y + 100, 'TEA TIME! +20 ESSENCE', '#7fb069');
  }
  sfx.splash();
}

function firePucks(count) {
  if (!S.puck || !S.puck.resting) return;
  const base = -Math.PI / 2;
  const angles = count === 1 ? [base] : [base - 0.45, base, base + 0.45];
  const power = 720;
  const lp = launcherPos();
  S.puck = makePuck(lp.x, lp.y);
  launchPuck(S.puck, Math.cos(angles[0]), Math.sin(angles[0]), power);
  S.puck.frost = S.frostArmed;
  S.frostArmed = false;
  for (let i = 1; i < count; i++) {
    const p = makePuck(lp.x, lp.y);
    launchPuck(p, Math.cos(angles[i]), Math.sin(angles[i]), power * 0.95);
    S.extraPucks.push(p);
  }
  if (S.relicFlags.twin && count === 1) {
    const p = makePuck(lp.x, lp.y);
    launchPuck(p, Math.cos(base + 0.3), Math.sin(base + 0.3), power * 0.9);
    S.extraPucks.push(p);
  }
  sfx.pluck();
}

function slingTowardNearest() {
  if (!S.puck || !S.puck.resting || S.screen !== 'play' || S.paused) return;
  let best = null;
  let bd = Infinity;
  for (const e of S.enemies) {
    const d = Math.hypot(e.x - S.puck.x, e.y - S.puck.y);
    if (d < bd) { bd = d; best = e; }
  }
  if (!best) return;
  const dx = best.x - S.puck.x;
  const dy = best.y - S.puck.y;
  launchPuck(S.puck, dx, dy, 720);
  S.puck.frost = S.frostArmed;
  S.frostArmed = false;
  if (S.relicFlags.twin) {
    const p = makePuck(S.puck.x, S.puck.y);
    launchPuck(p, dx * 0.94 - dy * 0.34, dy * 0.94 + dx * 0.34, 680);
    S.extraPucks.push(p);
  }
  sfx.pluck();
}

function explodeBomb(p) {
  addDecal(S.decals, p.x, p.y, 70);
  burst(S.particles, p.x, p.y, '#c0392b', 22, 260);
  burst(S.particles, p.x, p.y, '#f2c94c', 12, 180);
  addFlash(S.flashes, p.x, p.y, true);
  S.shakeT = 0.45;
  for (const e of S.enemies) {
    const d = Math.hypot(e.x - p.x, e.y - p.y);
    if (d < 160) damageEnemy(e, 60, (e.x - p.x) / (d || 1), (e.y - p.y) / (d || 1));
  }
  sfx.splash();
  S.bombArmed = false;
}

// --- Pointer + keyboard handlers (wired by input.js) ---
const game = {
  onPointerDown(x, y) {
    sfx.ensure();
    // Buttons first (from the last rendered frame).
    for (const b of S.ui.buttons) {
      if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) {
        handleButton(b.id);
        return;
      }
    }
    if (S.screen === 'play' && !S.paused && S.puck && S.puck.resting) {
      if (x > BOARD.x && x < BOARD.x + BOARD.w && y > BOARD.y && y < BOARD.y + BOARD.h) {
        S.aim.active = true;
        S.aim.sx = x;
        S.aim.sy = y;
        S.aim.cx = x;
        S.aim.cy = y;
      }
    }
  },
  onPointerMove(x, y) {
    S.hover.x = x;
    S.hover.y = y;
    if (S.aim.active) {
      S.aim.cx = x;
      S.aim.cy = y;
    }
  },
  onPointerUp(x, y) {
    if (S.aim.active) {
      S.aim.active = false;
      const dx = S.aim.sx - x;
      const dy = S.aim.sy - y;
      const len = Math.hypot(dx, dy);
      if (len > 14 && S.puck && S.puck.resting) {
        const power = Math.min(len, 240) * 3.4;
        launchPuck(S.puck, dx, dy, power);
        S.puck.frost = S.frostArmed;
        S.frostArmed = false;
        if (S.relicFlags.twin) {
          const p = makePuck(S.puck.x, S.puck.y);
          launchPuck(p, dx * 0.94 - dy * 0.34, dy * 0.94 + dx * 0.34, power * 0.9);
          S.extraPucks.push(p);
        }
        sfx.pluck();
      }
    }
  },
  onPointerCancel() {
    S.aim.active = false;
  },
  onKey(key) {
    const k = key.toLowerCase();
    if (k >= '1' && k <= '6') {
      castHotbar(Number(k) - 1);
      return;
    }
    if (k === 'p') {
      if (S.screen === 'play') {
        S.paused = !S.paused;
        sfx.click();
      }
    } else if (k === 'm') {
      S.muted = !S.muted;
      sfx.setMuted(S.muted);
    } else if (k === 'r') {
      if (S.screen === 'play' || S.screen === 'defeat' || S.screen === 'victory') startRun();
    } else if (key === ' ') {
      if (S.screen === 'play') slingTowardNearest();
      else if (S.screen === 'title') startRun();
    } else if (key === 'Enter') {
      if (S.screen === 'title') startRun();
      else if (S.screen === 'victory' || S.screen === 'defeat') startRun();
    }
  },
};

function handleButton(id) {
  sfx.click();
  if (id === 'play') startRun();
  else if (id === 'sound') {
    S.muted = !S.muted;
    sfx.setMuted(S.muted);
  } else if (id === 'pause' || id === 'resume') {
    if (S.screen === 'play') S.paused = !S.paused;
  } else if (id.startsWith('relic')) {
    pickRelic(Number(id.slice(5)));
  } else if (id === 'reroll') {
    rerollDraft();
  } else if (id === 'replay' || id === 'retry') {
    startRun();
  } else if (id.startsWith('hotbar')) {
    castHotbar(Number(id.slice(6)));
  }
}

// --- Update ---
function update(dt) {
  S.time += dt;
  if (S.shakeT > 0) S.shakeT -= dt;
  updateParticles(S.particles, dt);
  updateFlashes(S.flashes, dt);
  updateCallouts(S.callouts, dt);
  updateFloaters(S.floaters, dt);
  updateDecals(S.decals, dt);
  if (S.screen === 'title') {
    // Attract mode: three demo fiends wander the board.
    if (S.enemies.length === 0) {
      const rng = mulberry32(777);
      S.enemies = [
        makeEnemy('gremlin', BOARD.x + 260, BOARD.y + 200, rng),
        makeEnemy('scroll', BOARD.x + 620, BOARD.y + 320, rng),
        makeEnemy('teacup', BOARD.x + 420, BOARD.y + 430, rng),
      ];
      S.puck = makePuck(BOARD.x + BOARD.w / 2, BOARD.y + BOARD.h * 0.62);
    }
    for (const e of S.enemies) {
      updateEnemy(e, dt, S);
      // Attract mode: keep the demo fiends wandering, never parked on a cauldron.
      for (const c of S.cauldrons) {
        if (Math.hypot(e.x - c.x, e.y - c.y) < 90) {
          e.x = BOARD.x + 200 + S.rng() * (BOARD.w - 400);
          e.y = BOARD.y + 150 + S.rng() * (BOARD.h - 300);
        }
      }
    }
    return;
  }
  if (S.screen !== 'play' || S.paused) return;
  S.elapsed += dt;
  if (S.comboTimer > 0) {
    S.comboTimer -= dt;
    if (S.comboTimer <= 0) S.combo = 0;
  }
  for (let i = 0; i < 6; i++) if (S.hotbarCd[i] > 0) S.hotbarCd[i] -= dt;
  // Spawn.
  if (S.spawnQueue.length > 0) {
    S.spawnTimer -= dt;
    if (S.spawnTimer <= 0) {
      spawnNext();
      S.spawnTimer = 0.8;
    }
  }
  if (S.spawnMinion) {
    S.spawnMinion = false;
    if (S.boss) {
      const e = makeEnemy('gremlin', S.boss.x + 60, S.boss.y + 40, S.rng);
      S.enemies.push(e);
    }
  }
  for (const e of S.enemies) {
    if (e.hitCd > 0) e.hitCd -= dt;
    updateEnemy(e, dt, S);
  }
  // Pucks.
  const pucks = S.puck ? [S.puck, ...S.extraPucks] : [...S.extraPucks];
  for (const p of pucks) {
    const wasResting = p.resting;
    updatePuck(p, dt, S, (bp) => {
      sfx.boing();
      addFlash(S.flashes, bp.x, bp.y, false);
    });
    if (!wasResting && p.resting) {
      if (S.bombArmed) explodeBomb(p);
      else resetPuckSoon();
    }
    if (!p.resting) {
      checkPuckCauldron(p);
      // Zone triggers.
      let inZone = null;
      for (const z of ZONES) {
        const cx = BOARD.x + z.cx * BOARD.w;
        const cy = BOARD.y + z.cy * BOARD.h;
        if (Math.hypot(p.x - cx, p.y - cy) < z.r) { inZone = z; break; }
      }
      if (inZone && p.zoneId !== inZone.id) {
        p.zoneId = inZone.id;
        triggerZone(p, inZone);
      } else if (!inZone) {
        p.zoneId = null;
      }
      for (const e of S.enemies) {
        if (e.dead) continue;
        const d = Math.hypot(e.x - p.x, e.y - p.y);
        if (d < e.r + p.r) puckHitsEnemy(p, e);
      }
    }
  }
  S.extraPucks = S.extraPucks.filter((p) => !p.resting);
  if (S.puckResetTimer > 0) {
    S.puckResetTimer -= dt;
    if (S.puckResetTimer <= 0 && S.puck && S.puck.resting) resetPuck();
  }
  // Temporary walls expire.
  S.walls = S.walls.filter((w) => w.life === undefined || (w.life -= dt) > 0);
  checkCauldrons();
  // Stage clear?
  if (S.spawnQueue.length === 0 && S.enemies.length === 0 && S.screen === 'play') {
    stageClear();
  }
}

function triggerZone(p, z) {
  if (z.id === 'amber') {
    p.bounceMul = 3;
    addCallout(S.callouts, p.x, p.y - 30, 'TRIPLE BANK! x4', '#d4a017', bossAvoid());
    addFlash(S.flashes, p.x, p.y, true);
    setTimeout(() => { p.bounceMul = 1; }, 3000);
  } else if (z.id === 'cyan') {
    for (const e of S.enemies) {
      const d = Math.hypot(e.x - p.x, e.y - p.y);
      if (d < 130) damageEnemy(e, 42, (e.x - p.x) / (d || 1), (e.y - p.y) / (d || 1));
    }
    addCallout(S.callouts, p.x, p.y - 30, 'SPLASH -42!', '#3f8f7a', bossAvoid());
    addFlash(S.flashes, p.x, p.y, true);
    sfx.splash();
  } else {
    p.overboil = 4;
    addCallout(S.callouts, p.x, p.y - 30, 'BOIL OVER!', '#a03a2c', bossAvoid());
    addFlash(S.flashes, p.x, p.y, true);
    burst(S.particles, p.x, p.y, '#c0392b', 10, 140);
  }
}

// --- Staged screenshot scenes (?shot=title|battle|draft|victory) ---
function setupStagedScene(shot) {
  const rng = mulberry32(1337);
  if (shot === 'title') {
    S.screen = 'title';
    S.enemies = [
      makeEnemy('gremlin', BOARD.x + 260, BOARD.y + 200, rng),
      makeEnemy('scroll', BOARD.x + 620, BOARD.y + 320, rng),
      makeEnemy('teacup', BOARD.x + 420, BOARD.y + 430, rng),
    ];
    S.puck = makePuck(BOARD.x + BOARD.w / 2, BOARD.y + BOARD.h * 0.62);
    return;
  }
  if (shot === 'battle') {
    S.screen = 'play';
    S.stage = 5;
    S.stageName = STAGES[4].name;
    S.score = 2600;
    S.gold = 145;
    S.essence = 68;
    S.combo = 12;
    S.maxCombo = 12;
    S.grade = 'S';
    S.hotbarCd = [0, 4, 0, 9, 0, 14];
    // Mid-game state: four illustrated Relics already equipped, so the
    // RELICS HELD panel reads full, not empty.
    S.relicsHeld = [RELICS[0], RELICS[6], RELICS[3], RELICS[4]];
    recomputeRelicFlags();
    const boss = makeEnemy('tyrant', BOARD.x + 560, BOARD.y + 250, rng);
    boss.hp = 260;
    S.boss = boss;
    // A packed battlefield: the Tyrant plus 10 minions in loose formations,
    // so the board reads dense and dramatic at a glance.
    S.enemies = [
      boss,
      makeEnemy('wyvern', BOARD.x + 300, BOARD.y + 200, rng),
      makeEnemy('teacup', BOARD.x + 700, BOARD.y + 380, rng),
      makeEnemy('gremlin', BOARD.x + 420, BOARD.y + 420, rng),
      makeEnemy('scroll', BOARD.x + 760, BOARD.y + 180, rng),
      makeEnemy('wyvern', BOARD.x + 200, BOARD.y + 430, rng),
      makeEnemy('gremlin', BOARD.x + 340, BOARD.y + 110, rng),
      makeEnemy('scroll', BOARD.x + 640, BOARD.y + 470, rng),
      makeEnemy('teacup', BOARD.x + 240, BOARD.y + 290, rng),
      makeEnemy('gremlin', BOARD.x + 800, BOARD.y + 350, rng),
      makeEnemy('wyvern', BOARD.x + 480, BOARD.y + 80, rng),
    ];
    S.spawnQueue = ['gremlin', 'scroll', 'wyvern', 'teacup', 'gremlin', 'scroll'];
    S.spawnNames = ['Ink Gremlin', 'Soggy Scroll', 'Void Wyvern', 'Cracked Teacup', 'Ink Gremlin', 'Soggy Scroll'];
    S.spawnHp = [20, 40, 50, 70, 20, 40];
    S.puck = makePuck(BOARD.x + 480, BOARD.y + 330);
    launchPuck(S.puck, 0.8, -0.6, 640);
    S.puck.trail = [
      { x: BOARD.x + 380, y: BOARD.y + 400 },
      { x: BOARD.x + 410, y: BOARD.y + 380 },
      { x: BOARD.x + 445, y: BOARD.y + 355 },
    ];
    const ex = makePuck(BOARD.x + 600, BOARD.y + 300);
    launchPuck(ex, -0.5, 0.8, 520);
    S.extraPucks = [ex];
    addDecal(S.decals, BOARD.x + 500, BOARD.y + 400, 60);
    addCallout(S.callouts, BOARD.x + 700, BOARD.y + 480, 'SPLASH -42!', '#3f8f7a');
    addCallout(S.callouts, BOARD.x + 560, BOARD.y + 120, 'KETTLE CRACKED! -42', '#c0392b', { x: boss.x, y: boss.y, r: boss.r + 52 });
    addCallout(S.callouts, BOARD.x + 330, BOARD.y + 470, 'TRIPLE BANK! x4', '#d4a017', { x: boss.x, y: boss.y, r: boss.r + 52 });
    addFlash(S.flashes, BOARD.x + 560, BOARD.y + 250, true);
    // Staged callouts live longer so they are still bold when the screenshot
    // is taken (~0.7s after setup), instead of fading to a ghost.
    for (const c of S.callouts) { c.life = 2.5; c.max = 2.5; }
    burst(S.particles, BOARD.x + 560, BOARD.y + 250, '#f2c94c', 14, 160);
    burst(S.particles, BOARD.x + 300, BOARD.y + 200, '#3f8f7a', 10, 140);
    return;
  }
  if (shot === 'draft') {
    S.screen = 'draft';
    S.stage = 2;
    S.gold = 120;
    S.relicsHeld = [RELICS[0]];
    recomputeRelicFlags();
    S.draftOptions = [RELICS[6], RELICS[4], RELICS[7]];
    return;
  }
  if (shot === 'victory') {
    S.screen = 'victory';
    S.stage = 5;
    S.stageName = STAGES[4].name;
    S.rank = 'S';
    S.grade = 'S';
    S.combo = 14;
    S.maxCombo = 14;
    S.score = 3250;
    S.stats = { damageDealt: 1240, maxCombo: 14, relicsUsed: 3, timeSec: 272 };
    S.relicsHeld = [RELICS[0], RELICS[6], RELICS[3]];
    recomputeRelicFlags();
  }
}

// --- Loop ---
let shotReady = false;
let shotFrames = 0;

let lastTs = 0;
function frame(ts) {
  const dt = lastTs === 0 ? 0.016 : Math.min(0.05, Math.max(0.001, (ts - lastTs) / 1000));
  lastTs = ts;
  frameCount += 1;
  fpsTimer += dt;
  if (fpsTimer >= 0.5) {
    S.fps = Math.round(frameCount / fpsTimer);
    frameCount = 0;
    fpsTimer = 0;
  }
  S.ui.buttons.length = 0;
  update(dt);
  drawGame(ctx, S);
  if (window.__shot) {
    shotFrames += 1;
    if (shotFrames >= 2) shotReady = true;
  }
  requestAnimationFrame(frame);
}

createInput(canvas, game);

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
if (shot) {
  window.__shot = shot;
  setupStagedScene(shot);
} else {
  // Title attract mode starts with demo fiends.
  S.enemies = [];
}

window.__game = {
  get state() { return S; },
  start: () => startRun(),
  sling: (angleDeg, power) => {
    if (!S.puck || !S.puck.resting) return false;
    const a = (angleDeg * Math.PI) / 180;
    launchPuck(S.puck, Math.cos(a), Math.sin(a), power || 720);
    return true;
  },
  cast: (i) => castHotbar(i),
  pickRelic: (i) => pickRelic(i),
  reroll: () => rerollDraft(),
  restart: () => startRun(),
  // Debug helper for headless verification: jump to a stage (used by tests only).
  warp: (n) => { startStage(n); S.screen = 'play'; },
  shotReady: () => shotReady,
};

requestAnimationFrame(frame);
