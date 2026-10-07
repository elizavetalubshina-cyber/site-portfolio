/**
 * Display-size copies of the Gym Bro screens. `npm run screens` after
 * replacing a picture; it also runs before every dev and build.
 *
 * A two-phone picture is ~1884px wide and shows at 560px, so the browser
 * squeezes it 3.4 times on the fly and the screens' fine print goes soft.
 * Resizing here, with Lanczos and a light sharpen, keeps that text crisper;
 * the pages list these copies in srcset and the browser picks the 1x or the
 * 2x one. The full-size original stays for the click-to-zoom view.
 */

import { stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const DIR = path.resolve(import.meta.dirname, '../src/assets/cases/gym-bro');

// Width each picture takes on the page (CSS px): the 1x copy, then the 2x.
const SHOWN = {
  cover: 872,
  'bro-screen': 240,
  palette: 584,
  cats: 584,
  'flow-1': 560,
  'flow-2': 560,
  'flow-3': 560,
  'flow-4': 560,
  'flow-5': 560,
  'first-launch': 560,
  'exercise-picker': 560,
  'start-template': 560,
  'home-plan': 560,
  'bro-reactions': 560,
  kick: 560,
  'empty-and-exercise': 560,
};

for (const [name, shown] of Object.entries(SHOWN)) {
  const src = path.join(DIR, `${name}.webp`);
  const { width } = await sharp(src).metadata();
  const srcTime = (await stat(src)).mtimeMs;

  for (const w of [shown, shown * 2]) {
    if (w >= width) continue;            // the original already is this size
    const out = path.join(DIR, `${name}-${w}w.webp`);
    if (existsSync(out) && (await stat(out)).mtimeMs > srcTime) continue;
    await sharp(src)
      .resize({ width: w, kernel: 'lanczos3' })
      .sharpen({ sigma: 0.5 })
      .webp({ quality: 90, effort: 6 })
      .toFile(out);
    console.log(`  ${name}-${w}w.webp`);
  }
}
