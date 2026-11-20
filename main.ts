// GTA 6 trophy guide — the entrypoint (Node 22, standard library only).
//
// The guide itself is plain static files in app/: an index page, three small
// JavaScript modules, a stylesheet and the trophy data, with no build step and
// nothing loaded over the network. The pictures are in screenshots/.
//
// This program hands the entry in. It copies app/ and screenshots/ from beside
// itself into the output directory, checks the entry against the scorer's
// limits, and writes dossier.json there with the vendored make.fun library, so
// the scorer can check the entry and the judge can read it. It only creates
// the output directory and copies into it: it never deletes the directory or
// anything inside it. The output directory comes from MAKEFUN_OUTPUT_DIR when
// it is set and defaults to /output.
//
// Leave vendor/makefun-frontend.ts exactly as it is: the scorer rebuilds the
// dossier with its own copy of that library and requires the two to match
// byte for byte.
//
// Run it locally with:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-frontend.ts';

// The scorer's caps (from the competition's gate).
const SCREENSHOT_MAX = 4;
const SCREENSHOT_MAX_BYTES = 262144; // 256 KiB
const APP_MAX_FILES = 993;
const APP_MAX_BYTES = 50331648; // 48 MiB
const TEXT_MAX_BYTES = 163840;

const repoRoot = fileURLToPath(new URL('.', import.meta.url));
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
const appSource = join(repoRoot, 'app');
const shotsSource = join(repoRoot, 'screenshots');

// The screenshots the entry hands in: 3 or 4 images, each a whole PNG or
// JPEG within the size limit, the first by name the cover.
function listScreenshots(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((name) => !name.startsWith('.') && /\.(png|jpe?g)$/i.test(name))
    .sort();
}

function checkScreenshots(dir) {
  const shots = listScreenshots(dir);
  if (shots.length === 0) throw new Error('screenshots/ holds no image: the first is the cover');
  if (shots.length > SCREENSHOT_MAX) throw new Error(`screenshots/ holds ${shots.length} images, at most ${SCREENSHOT_MAX}`);
  const checked = shots.map((name) => {
    const size = statSync(join(dir, name)).size;
    if (size > SCREENSHOT_MAX_BYTES) throw new Error(`screenshots/${name} is ${size} bytes, over the ${SCREENSHOT_MAX_BYTES} byte limit`);
    return { name, size };
  });
  return checked;
}

// The whole app tree: every file and directory under app/, with its bytes.
function walkApp(dir) {
  let files = 0;
  let bytes = 0;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    files += 1;
    if (entry.isDirectory()) {
      const sub = walkApp(path);
      files += sub.files;
      bytes += sub.bytes;
    } else if (entry.isFile()) {
      bytes += statSync(path).size;
    }
  }
  return { files, bytes };
}

function checkApp(dir) {
  const { files, bytes } = walkApp(dir);
  if (files > APP_MAX_FILES) throw new Error(`app/ holds ${files} files and directories, over the ${APP_MAX_FILES} limit`);
  if (bytes > APP_MAX_BYTES) throw new Error(`app/ is ${bytes} bytes, over the ${APP_MAX_BYTES} byte limit`);
  return { files, bytes };
}

const shots = checkScreenshots(shotsSource);
const app = checkApp(appSource);

mkdirSync(outputDir, { recursive: true });
cpSync(appSource, join(outputDir, 'app'), { recursive: true });
mkdirSync(join(outputDir, 'screenshots'), { recursive: true });
cpSync(shotsSource, join(outputDir, 'screenshots'), { recursive: true });

writeFileSync(
  join(outputDir, 'dossier.json'),
  buildDossier(outputDir, {
    text_max_bytes: TEXT_MAX_BYTES,
    screenshots: { max: SCREENSHOT_MAX, max_bytes: SCREENSHOT_MAX_BYTES },
    app_max_files: APP_MAX_FILES,
    app_max_bytes: APP_MAX_BYTES,
  }),
);

// A short summary of what was handed in, so a run's log says what it did.
const dossierBytes = statSync(join(outputDir, 'dossier.json')).size;
const trophyCount = JSON.parse(readFileSync(join(appSource, 'data', 'trophies.json'), 'utf-8')).trophies.length;
console.log(`Leonida Trophy Guide: ${trophyCount} trophies, app/ ${app.files} files, ${app.bytes} bytes; ` +
  `screenshots ${shots.map((s) => `${s.name} (${s.size} bytes)`).join(', ')}; ` +
  `dossier.json ${dossierBytes} bytes -> ${outputDir}`);
