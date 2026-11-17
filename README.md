# Alchemist's Pinball: Cauldron Bounce

[![make.fun · best-game-01](https://make.fun/badge/best-game-01.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![rank](https://make.fun/badge/best-game-01/seannbeez/best-game-01-cauldron/rank.svg)](https://make.fun/bounty/best-game-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![reward](https://make.fun/badge/best-game-01/seannbeez/best-game-01-cauldron/reward.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)

**Alchemist's Pinball: Cauldron Bounce** is a whimsical tactical arena roguelite.
You sling enchanted ink-pucks across a warm parchment board, ricochet them off
drawn elastic ink-walls, slice quirky porcelain monsters — Ink Gremlins, Soggy
Scrolls, Cracked Teacups, Void Wyverns — and dunk them into bubbling alchemy
cauldrons for big bonuses. Five stages, a relic draft after each one, and a final
showdown with **The Tea-Kettle Tyrant**.

Built for the [make.fun "Make the best game" bounty](https://make.fun/bounty/best-game-01).
Play it free: [make.fun/?ref=ebv85brk](https://make.fun/?ref=ebv85brk&utm_source=github&utm_medium=readme&utm_campaign=best-game-01)

## How to play

| Control | Action |
|---|---|
| Drag (mouse / touch) | Pull back and release to sling the puck |
| Space | Auto-sling at the nearest fiend |
| 1–6 | Hotbar abilities: Frost Puck, Triple Shot, Splash Bomb, Magnet Brew, Ink Wall, Tea Time |
| P | Pause |
| M | Mute |
| R | Restart |

## The loop

- **Sling & ricochet** — the puck bounces off the board edges and ink walls; every
  bounce keeps your combo alive.
- **Slice & dunk** — hitting a fiend damages it; knocking one into a cauldron
  captures it for a big score and gold bonus. Watch out: fiends that reach a
  cauldron on their own drink your essence.
- **Combo zones** — amber (3X BOUNCE!), cyan (SPLASH -42!), and crimson (OVERBOIL!)
  fields change what the puck does.
- **Relics** — after every cleared stage, pick 1 of 3 relics (up to 5 held).
- **Win / lose** — clear all 5 stages and dunk the Tyrant for a Rank S victory.
  If your essence hits zero, the cauldron runs dry.

## HUD

Top bar: stage, score, gold, essence, objectives, sound/pause. Right sidebar:
THREAT QUEUE (upcoming fiends with portraits and HP) and RELICS HELD. Bottom bar:
essence/gold meters, 6-slot hotbar with keybinds and cooldowns, live combo
multiplier, and a live Style Grade badge (S / A / B / C).

## Tech

- Pure static files under `game/` — Canvas 2D, procedural ink-and-watercolor art,
  synthesized Web Audio (no audio files), no network, no external assets, no
  build step. Open `game/index.html` and play.
- Serve locally: `node serve.ts` → http://localhost:8080
- Screenshots in `screenshots/` (title with How-To-Play comic, boss battle,
  relic draft, Rank S victory).
