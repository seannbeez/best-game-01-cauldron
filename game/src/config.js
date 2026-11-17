// config.js — every constant, color, enemy, relic, hotbar slot and stage of the game.
// One file, one job: the numbers and names the rest of the game reads.

export const VIEW = { w: 1280, h: 720 };
export const TOP = { x: 0, y: 0, w: 1280, h: 60 };
export const BOARD = { x: 16, y: 70, w: 920, h: 570 };
export const SIDE = { x: 948, y: 70, w: 316, h: 570 };
export const BOTTOM = { x: 0, y: 650, w: 1280, h: 62 };

export const COLORS = {
  parchment: '#f6ecd7',
  parchmentDark: '#eadfc2',
  parchmentLine: '#d9c9a3',
  ink: '#2b2620',
  inkSoft: '#5c5344',
  navy: '#1d2b4a',
  navyLight: '#2c3f63',
  navyEdge: '#141f38',
  gold: '#d4a017',
  goldLight: '#f2c94c',
  red: '#c0392b',
  redDark: '#8e2a20',
  cream: '#fdf6e3',
  teal: '#3f8f7a',
  purple: '#5b4a8a',
  blue: '#7fa3b8',
  green: '#3f6d4e',
  amber: '#d4a017',
  crimson: '#a03a2c',
  cyan: '#3f8f7a',
};

export const CAULDRON_R = 36;

// Enemy types: name, hit points, drift speed, radius, gold bounty, body + belly colors.
export const ENEMY_TYPES = {
  gremlin: { name: 'Ink Gremlin', short: 'GREMLIN', hp: 20, speed: 44, r: 20, gold: 12, color: '#5b4a8a', belly: '#8f7cc0' },
  scroll: { name: 'Soggy Scroll', short: 'SCROLL', hp: 40, speed: 27, r: 24, gold: 20, color: '#b98a3e', belly: '#e8cf9a' },
  teacup: { name: 'Cracked Teacup', short: 'TEACUP', hp: 70, speed: 17, r: 26, gold: 30, color: '#7fa3b8', belly: '#dcebf2' },
  wyvern: { name: 'Void Wyvern', short: 'WYVERN', hp: 50, speed: 60, r: 22, gold: 35, color: '#3f6d4e', belly: '#9fd0a8' },
  tyrant: { name: 'The Tea-Kettle Tyrant', short: 'TYRANT', hp: 420, speed: 13, r: 52, gold: 200, color: '#a03a2c', belly: '#e8b04b' },
};

// Five stages; the fifth is the boss. queue lists enemy types in spawn order.
export const STAGES = [
  { name: 'Stage 1 · First Stir', queue: ['gremlin', 'gremlin', 'scroll', 'gremlin', 'scroll'] },
  { name: 'Stage 2 · Porcelain Parade', queue: ['gremlin', 'scroll', 'teacup', 'gremlin', 'wyvern', 'scroll'] },
  { name: 'Stage 3 · Ink Flood', queue: ['wyvern', 'scroll', 'teacup', 'wyvern', 'gremlin', 'teacup', 'scroll'] },
  { name: 'Stage 4 · Cracked Brigade', queue: ['teacup', 'wyvern', 'teacup', 'scroll', 'wyvern', 'gremlin', 'teacup'] },
  { name: 'Stage 5 · THE TEA-KETTLE TYRANT', queue: ['tyrant', 'gremlin', 'gremlin'], boss: true },
];

export const RELICS = [
  { id: 'ladle', name: 'Golden Ladle', color: '#d4a017', tag: '+25% gold', desc: 'Every coin shines brighter.' },
  { id: 'bounce', name: 'Bouncy Ink', color: '#3f8f7a', tag: '+1 bounce dmg', desc: 'The puck bites harder on every ricochet.' },
  { id: 'cauldron', name: 'Big Cauldron', color: '#a03a2c', tag: 'Capture +50%', desc: 'Cauldron dunks pay half again.' },
  { id: 'stirrer', name: 'Lucky Stirrer', color: '#5b4a8a', tag: 'Combo lasts longer', desc: 'The combo clock ticks slower.' },
  { id: 'shield', name: 'Porcelain Shield', color: '#7fa3b8', tag: 'Drain -50%', desc: 'Cauldron sips hurt half as much.' },
  { id: 'twin', name: 'Twin Puck', color: '#c0392b', tag: 'Sling 2 pucks', desc: 'Every sling launches a spare puck.' },
  { id: 'quill', name: 'Sharp Quill', color: '#2b2620', tag: '+30% puck damage', desc: 'A keener edge on every hit.' },
  { id: 'honey', name: 'Sweet Honey', color: '#b98a3e', tag: 'Foes 20% slower', desc: 'The whole board moves like treacle.' },
];

export const HOTBAR = [
  { id: 'frost', name: 'Frost Puck', key: '1', cd: 9, desc: 'Next sling freezes foes 3s' },
  { id: 'triple', name: 'Triple Shot', key: '2', cd: 12, desc: 'Launch 3 pucks at once' },
  { id: 'bomb', name: 'Splash Bomb', key: '3', cd: 14, desc: 'Shockwave where the puck stops' },
  { id: 'magnet', name: 'Magnet Brew', key: '4', cd: 16, desc: 'Pull foes to cauldrons 2s' },
  { id: 'wall', name: 'Ink Wall', key: '5', cd: 11, desc: 'Raise a bouncy ink wall' },
  { id: 'tea', name: 'Tea Time', key: '6', cd: 20, desc: 'Restore 20 essence' },
];

// Translucent combo zones on the board (positions as fractions of the board).
export const ZONES = [
  { id: 'amber', label: '3X BOUNCE!', color: 'rgba(212,160,23,0.20)', ring: '#d4a017', cx: 0.30, cy: 0.30, r: 105 },
  { id: 'cyan', label: 'SPLASH -42!', color: 'rgba(63,143,122,0.20)', ring: '#3f8f7a', cx: 0.70, cy: 0.58, r: 115 },
  { id: 'crimson', label: 'OVERBOIL!', color: 'rgba(160,58,44,0.18)', ring: '#a03a2c', cx: 0.50, cy: 0.78, r: 95 },
];

export const PUCK_R = 14;
export const PUCK_DAMAGE = 12;
export const ESSENCE_MAX = 100;
export const COMBO_WINDOW = 2.5;
