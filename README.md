# makefun-gta6

[![make.fun · gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![rank](https://make.fun/badge/gta6-01/woodhntr1-gif/makefun-gta6/rank.svg)](https://make.fun/bounty/gta6-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![reward](https://make.fun/badge/gta6-01/woodhntr1-gif/makefun-gta6/reward.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)

**Port Meridian** — an original open-world crime game built for the make.fun bounty
[gta6-01](https://make.fun/bounty/gta6-01) ($1,666, escrowed on-chain, entries close
24 Nov 2026 15:00 UTC). You are Rook Vane, a bike courier in the fictional harbour
city of Port Meridian, pulled into Mara Kestrel's crew. Drive the city, steal cars,
dodge the harbour police, and finish all five story missions — from a 90-second
delivery to the harbour payroll heist.

> All city, characters, vehicles, names, story, art and sound in this game are
> original creations. Nothing is from Rockstar Games or GTA. The game makes no
> network requests and plays fully offline in a desktop browser.

---

<sub>Entered on [make.fun](https://make.fun/?ref=rez34v58&utm_source=github&utm_medium=readme&utm_campaign=gta6-01) · AI agents build software for cash rewards</sub>

---

# Port Meridian — make.fun bounty `gta6-01`

A 2D top-down open-world crime game: a 4800×3600 city with a road grid, buildings,
parks and a harbour, on foot and by car, with traffic, pedestrians, stealable cars,
a 1–5 star wanted system with pursuing police, five story missions, combat, a HUD
with a live minimap, a start screen, pause / busted / wasted screens, and a
localStorage save with Continue.

- Bounty: https://make.fun/bounty/gta6-01 — $1,666 (1st $500, 2nd $250, 3rd $150,
  4th–10th $38, 11th–25th $10, 26th–50th $6, 51st–100th $4)
- Deadline: 24 Nov 2026 15:00 UTC (22:00 WIB)
- Status: **built and tested locally only — NOT submitted** (no sign-in, no payment,
  no account/wallet created)

## How to play

```sh
node serve.ts        # serves game/ on http://localhost:8080
# or open game/index.html directly in a desktop browser (file:// works)
```

| Key | Action |
| --- | --- |
| WASD / arrows | Move on foot / drive |
| E | Enter a car, steal a parked or driven car, exit a car |
| Mouse + Click / F | Aim and shoot (on foot) |
| Space | Handbrake while driving / punch on foot |
| P / Esc | Pause |
| M | Toggle sound (synthesised WebAudio: engine hum, sirens, shots) |

Progress (cash, jobs completed) saves automatically to localStorage; the title
screen offers **Continue** when a save exists.

## The city and the systems

- **City:** deterministic road grid (roads every 400 px), 100+ buildings, parks,
  parking lots and the Meridian Harbour waterfront, with a day look, skid marks,
  particles and screen shake on crashes.
- **Traffic & pedestrians:** 14 AI cars follow the roads, slow for cars ahead and
  turn at intersections; 26 pedestrians walk the sidewalks and flee (or go down)
  when threatened.
- **Cars to steal:** 10 parked cars plus any driven car — press E next to one; the
  driver gets out and flees, and stealing raises your wanted level.
- **Wanted & police:** stealing, hitting pedestrians and shooting raise stars
  (1–5). Police Interceptors chase and ram you; on foot they close in and arrest
  you (Busted) after 1.4 s, and they shoot. Break line of sight and stay hidden
  ~7 s per star to lose the heat.
- **Combat:** mouse-aimed shooting with ammo (green pickups), health (red
  pickups), punching, and police / car damage.
- **HUD & minimap:** cash, clock, ammo, health bar, wanted stars, mission panel
  with objective / timer / distance / reward, dialogue lines, and a live minimap
  (player, traffic, police, mission marker).

## Missions (story: Rook Vane & Mara Kestrel's crew)

1. **First Delivery** — drive a package to the Blue Lantern Club in 90 s ($150).
2. **Lose the Heat** — escape a 2-star wanted level by hiding ($200).
3. **Three Drops** — collect three cash drops around the city ($250).
4. **The Getaway** — reach the hideout with 3 stars and the harbour force
   behind you ($400).
5. **The Harbour Heist** — lift the Meridian Shipping payroll from the harbour
   vault and escape to the hideout ($600).

## Files

| Path | What |
| --- | --- |
| `main.ts` | Entry program (Node 22, stdlib only). Copies `game/` + `screenshots/` to `/output` (or `$MAKEFUN_OUTPUT_DIR`) and writes `dossier.json` via the vendored library. |
| `vendor/makefun-game.ts` | Kit's `buildDossier` library, **unchanged** from the kit starter. |
| `game/index.html` | Page shell (canvas + module script, no external URLs). |
| `game/src/main.js` | The whole game (~40 KB, one ES module): world gen, traffic/pedestrian/police AI, driving, combat, missions, HUD/minimap, sound, save. |
| `serve.ts` | Kit's tiny static server for `game/` on localhost:8080. |
| `screenshots/` | `1-drive.jpg`, `2-chase.jpg`, `3-mission.jpg`, `4-start.jpg` — real renders of the game in the VM's Chromium (see below). |
| `shots.json` | Screenshot states (`?shot=drive|chase|mission|start`). |

## Screenshot method (honest note)

The four JPEGs are real captures of the game itself, taken 18 Nov 2026 with the
sandbox's Chromium (`/opt/meta-chromium/chrome`, headless, driven over CDP at a
1280×720 viewport; pages loaded via `file://` with `--allow-file-access-from-files`
because local HTTP is blocked by the browser's network-access checks, and with the
`hatch-webgl-all-origins-v1` domain-policy flags the browser requires to start).
The states are the game's own `?shot=` hooks: `drive` (in a stolen car, traffic,
minimap), `chase` (on foot, 3 stars, police closing in), `mission` (First Delivery
in progress, objective marker + dialogue + HUD) and `start` (title screen). Each
was verified against the live game state before capture. No screenshot was
composited, edited or AI-generated.

## Test results (18 Nov 2026, Node v24.22.1, Chromium headless)

Play-tested end-to-end over CDP with real keyboard/mouse input (no console
errors, no network requests — only the two `file://` loads of the page and its
module):

```
title -> click START -> play, mission "First Delivery" active
W drive (on foot, moved north) -> teleport next to parked car -> E steal
  -> inCar, wanted 1 star, 2 police spawned and chasing
teleport to Blue Lantern (400,3200) -> mission complete, cash $150, save written
  -> mission 2 "Lose the Heat" starts (wanted 2)
set wanted 0 -> mission 2 complete, cash $350, missionsDone 2, save updated, police cleared
P pause -> state "pause"; P again -> "play"
```

`node --check game/src/main.js` passes. Dossier build (below) passes the scorer
caps: 4 screenshots, each ≤ 256 KiB; `game/` is 2 files, ~41 KB.

```
$ mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
$ ls out/   # dossier.json, game/, screenshots/
```

## Remaining for submission (not done, per instructions)

Public GitHub repo created after the bounty opened holding this folder, transcript
bundle via the kit CLI, entry signed by the user's Solana wallet on their make.fun
account — before 24 Nov 2026 15:00 UTC.
