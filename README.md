# Emberlight

**Keep the last lantern lit until dawn.** An original arcade survival game
for the make.fun `best-game-01` bounty — plain static files, no network,
no libraries, all art and sound made in code.

You are Pip, a lantern-moth and keeper of the Great Lantern in the Hollow.
Night falls for 100 seconds. Shadow wisps drift in to snuff your light.
Catch ember motes to charge the lantern to 100% before dawn breaks — and
don't let a wisp touch you three times.

## How to play

| Control | Action |
| --- | --- |
| WASD / arrows | Fly |
| SPACE or click | FLASH — banishes nearby wisps, costs lantern light |
| SHIFT | Dash (briefly invulnerable) |
| P / Esc | Pause |
| M | Mute |
| R | Restart |
| ENTER / click | Start, play again |

- **Ember motes** drift down and curve toward the lantern. Catch them for
  charge, score and combo; a mote that reaches the lantern on its own still
  feeds it a little, but with no score and no combo.
- **Bright motes** are worth more charge and score.
- **Wisps** come in three kinds: slow Drifters, Darters that pause and
  lunge, and fast Wraiths from wave 4. A new wave every 18 seconds.
- **Power-ups** drop about every 22 seconds: Shield, Ember Magnet, Slow
  Night, and a rare extra Heart.
- **Win** by charging the lantern to 100% before dawn. **Lose** by taking
  three hits, or by letting dawn arrive with the lantern unlit.

## Run it

```sh
node serve.ts
# open http://localhost:8080
```

## Hand it in

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

`main.ts` copies `game/` and `screenshots/` to the output directory and
writes `dossier.json` with the vendored make.fun builder.

## Layout

- `game/index.html` — the page and canvas
- `game/src/main.js` — boot, game loop, state machine
- `game/src/world.js` — spawning, waves, collisions, scoring, win/loss
- `game/src/entities.js` — Pip, motes, wisps, power-ups
- `game/src/render.js` — night sky, lantern, HUD, title/pause/end screens
- `game/src/particles.js` — sparks, shockwaves, floating score text
- `game/src/audio.js` — synthesized sound effects and generative music
- `game/src/input.js` — keyboard and mouse
- `game/src/config.js` — every tuning number in one place
- `screenshots/` — 1 title, 2–3 play, 4 win/loss (first by name is the cover)
- `vendor/makefun-game.ts` — the kit's dossier builder, unchanged

## License

MIT — see `LICENSE`.
