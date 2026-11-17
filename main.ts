// Emberlight — the entry program for make.fun's best-game-01 bounty.
// Runs on Node 22 with the standard library only, in a sandbox with no
// network. It hands the game in: the static files under game/ and the
// screenshots/ the maker took go to /output (or MAKEFUN_OUTPUT_DIR
// outside the grader), and /output/dossier.json is written with the
// vendored make.fun dossier builder, which the gate rebuilds and compares
// byte for byte. The program runs twice and must write identical bytes
// both times, so it copies files as-is and never stamps a time or a
// random value into anything it writes.
//
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const repoRoot = fileURLToPath(new URL('.', import.meta.url));
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// The gate's own limits, from the bounty rules: game/ is plain files
// only, at most 993 entries and 48 MiB; screenshots/ holds 3 or 4 images
// of at most 256 KiB each; the whole of /output stays under 1,000
// entries and 64 MiB. Refuse loudly here rather than hand in an entry
// the gate would refuse.
const GAME_MAX_ENTRIES = 993;
const GAME_MAX_BYTES = 48 * 1024 * 1024;
const SHOT_MAX = 4;
const SHOT_MAX_BYTES = 256 * 1024;

function countTree(dir) {
  let entries = 0;
  let bytes = 0;
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    const info = statSync(path);
    entries += 1;
    if (info.isDirectory()) {
      const sub = countTree(path);
      entries += sub.entries;
      bytes += sub.bytes;
    } else if (info.isFile()) {
      bytes += info.size;
    } else {
      throw new Error(`not a plain file or directory: ${path}`);
    }
  }
  return { entries, bytes };
}

const gameDir = join(repoRoot, 'game');
const shotsDir = join(repoRoot, 'screenshots');
if (!existsSync(gameDir)) throw new Error('game/ is missing from the repository');
if (!existsSync(join(gameDir, 'index.html'))) throw new Error('game/index.html is missing');

const gameSize = countTree(gameDir);
if (gameSize.entries > GAME_MAX_ENTRIES) {
  throw new Error(`game/ holds ${gameSize.entries} entries, over the ${GAME_MAX_ENTRIES} cap`);
}
if (gameSize.bytes > GAME_MAX_BYTES) {
  throw new Error(`game/ is ${gameSize.bytes} bytes, over the ${GAME_MAX_BYTES} cap`);
}

const shots = existsSync(shotsDir)
  ? readdirSync(shotsDir).filter((name) => !name.startsWith('.'))
  : [];
if (shots.length < 3 || shots.length > SHOT_MAX) {
  throw new Error(`screenshots/ holds ${shots.length} images, need 3 or 4`);
}
for (const name of shots) {
  const size = statSync(join(shotsDir, name)).size;
  if (size > SHOT_MAX_BYTES) throw new Error(`screenshot ${name} is ${size} bytes, over the cap`);
}

// Copy first, dossier second: the dossier is built from the files as
// they land in /output, so what the gate reads is what was copied.
mkdirSync(outputDir, { recursive: true });
cpSync(gameDir, join(outputDir, 'game'), { recursive: true });
mkdirSync(join(outputDir, 'screenshots'), { recursive: true });
cpSync(shotsDir, join(outputDir, 'screenshots'), { recursive: true });

const dossier = buildDossier(outputDir, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
});
writeFileSync(join(outputDir, 'dossier.json'), dossier);

console.log(
  `Emberlight handed in: ${gameSize.entries} game entries, `
  + `${gameSize.bytes} bytes, ${shots.length} screenshots, `
  + `dossier ${dossier.length} bytes -> ${outputDir}`,
);
