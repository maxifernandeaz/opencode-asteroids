# AGENTS.md

## Project

Asteroids clone — single-file vanilla JS (`game.js`) rendered on an 800×600 HTML5 Canvas. No frameworks, no bundler, no dependencies.

## Run

```bash
npx serve .
# or open index.html directly in a browser
```

No build step. No tests. No linter.

## Code structure

All logic lives in `game.js` (~420 lines). Sections are marked with comment headers:

- **Input** — keyboard state via `keys`/`justPressed` maps; `pressed(code)` for single-fire events
- **Bullet / Asteroid / Ship / Particle** — ES6 classes with `update(dt)` and `draw()` methods
- **Game state** — module-level variables (`ship`, `bullets`, `asteroids`, `score`, `lives`, `state`)
- **Game loop** — `requestAnimationFrame` with dt capped at 50 ms

## Conventions

- `'use strict'` at top of file.
- Canvas dimensions are constants `W = 800`, `H = 600`.
- All positions wrap via `wrap(value, max)` — the world is toroidal.
- Ship has 3 lives; invincibility on respawn is time-based (3 s, visual blink).
- Asteroid sizes: 3 (large) → 2 → 1 (small). Arrays `RADII`, `SPEEDS`, `POINTS` are 1-indexed (index 0 unused).
- UI text is in Spanish (e.g. "NIVEL", "GAME OVER" overlay).
