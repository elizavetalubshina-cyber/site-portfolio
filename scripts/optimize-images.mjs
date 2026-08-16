/**
 * Turns whatever you exported from Figma into web-ready images, and updates
 * the markup to match. Runs automatically before `npm run dev` and
 * `npm run build`, so adding a picture is: drop the file in, keep working.
 *
 * For every PNG/JPG under src/assets it will:
 *   1. shrink it to MAX_WIDTH if it is wider (a 3840px export is four times
 *      more pixels than this site can ever display, even on a retina screen)
 *   2. re-encode it as WebP, which on this site's screenshots came out around
 *      11x smaller than the PNG with no visible difference
 *   3. move the original into src/assets/_originals/ — nothing is deleted,
 *      that folder just stays out of git so the repository does not carry
 *      hundred-megabyte files in its history forever
 *   4. repoint every <img src> in the HTML at the new .webp
 *   5. fill in width/height so the page cannot jump around while images
 *      load, and add loading="lazy" to everything below the first image
 *
 * Already-converted files are skipped, so re-running costs nothing.
 * Videos are left alone: they need different treatment and there are two.
 */

import { readdir, readFile, writeFile, mkdir, rename, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const ROOT = path.resolve(import.meta.dirname, '..');
const ASSETS = path.join(ROOT, 'src/assets');
const ORIGINALS = path.join(ASSETS, '_originals');
const HTML = ['index.html', 'cases/design-system.html', 'cases/satellite.html',
  'cases/tracktice.html', 'cases/vs-ecosystem.html', 'cases/vs-subtitles.html'];

const MAX_WIDTH = 2304;   // 1152px layout column at 2x pixel density
const QUALITY = 85;       // measured on this site's screenshots: no visible loss
const SOURCES = new Set(['.png', '.jpg', '.jpeg']);

const kb = (n) => `${Math.round(n / 1024)} KB`;

async function* walk(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    if (entry.name === '_originals') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(full);
    else yield full;
  }
}

async function convert() {
  const converted = [];
  let before = 0, after = 0;

  for await (const file of walk(ASSETS)) {
    if (!SOURCES.has(path.extname(file).toLowerCase())) continue;

    const webp = file.replace(/\.[^.]+$/, '.webp');
    if (existsSync(webp)) continue;

    const src = sharp(file);
    const meta = await src.metadata();
    const size = (await stat(file)).size;

    const out = await src
      .resize({ width: Math.min(meta.width, MAX_WIDTH), withoutEnlargement: true })
      .webp({ quality: QUALITY, effort: 6 })
      .toBuffer({ resolveWithObject: true });

    await writeFile(webp, out.data);

    const rel = path.relative(ASSETS, file);
    const parked = path.join(ORIGINALS, rel);
    await mkdir(path.dirname(parked), { recursive: true });
    await rename(file, parked);

    before += size;
    after += out.data.length;
    converted.push({
      from: '/' + path.relative(ROOT, file).split(path.sep).join('/'),
      to: '/' + path.relative(ROOT, webp).split(path.sep).join('/'),
      width: out.info.width,
      height: out.info.height,
    });

    console.log(`  ${rel}`);
    console.log(`    ${meta.width}x${meta.height} ${kb(size)}  ->  ` +
      `${out.info.width}x${out.info.height} ${kb(out.data.length)}  ` +
      `(${(size / out.data.length).toFixed(0)}x smaller)`);
  }

  return { converted, before, after };
}

/**
 * Rewrites the markup for the files just converted, and — for every <img> on
 * the page, converted or not — makes sure the loading attributes are right.
 * The first image of a page is what the visitor waits for, so it is fetched
 * eagerly at high priority; everything after it is lazy.
 */
async function updateMarkup(converted) {
  const map = new Map(converted.map((c) => [c.from, c]));
  let touched = 0;

  for (const page of HTML) {
    const file = path.join(ROOT, page);
    let html = await readFile(file, 'utf8');
    const original = html;
    let seenFirstImage = false;

    html = html.replace(/<img\b[^>]*>/g, (tag) => {
      const srcMatch = tag.match(/\bsrc="([^"]+)"/);
      if (!srcMatch) return tag;

      const isFirst = !seenFirstImage;
      seenFirstImage = true;

      const hit = map.get(srcMatch[1]);
      if (hit) tag = tag.replace(srcMatch[1], hit.to);

      // Reserve the space the image will occupy, so text never shifts.
      if (hit && !/\bwidth=/.test(tag)) {
        tag = tag.replace(/\s*\/?>$/, ` width="${hit.width}" height="${hit.height}"$&`);
      }
      if (!/\bloading=/.test(tag) && !/\bfetchpriority=/.test(tag)) {
        const attrs = isFirst ? ' fetchpriority="high"' : ' loading="lazy" decoding="async"';
        tag = tag.replace(/\s*\/?>$/, `${attrs}$&`);
      }
      return tag.replace(/\s+(\/?)>$/, ' $1>');
    });

    if (html !== original) {
      await writeFile(file, html);
      touched++;
      console.log(`  updated ${page}`);
    }
  }
  return touched;
}

const { converted, before, after } = await convert();

if (!converted.length) {
  console.log('images: nothing new to convert');
} else {
  console.log(`\nimages: ${converted.length} converted, ` +
    `${kb(before)} -> ${kb(after)} (${(before / after).toFixed(0)}x smaller)`);
  const touched = await updateMarkup(converted);
  console.log(`images: ${touched} page(s) updated, originals kept in src/assets/_originals/`);
}
