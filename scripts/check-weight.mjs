// Page weight budget.
//
// The case pages once shipped 24 MB each — full-size PNGs straight from
// Figma. The build pipeline fixed that (543 KB now), but nothing stops it
// coming back: one screenshot dropped in without going through the pipeline,
// one `loading="lazy"` removed, one autoplaying video, and the page is heavy
// again with no visible sign of it. This fails the build instead.
//
// What it counts: everything a built page pulls before the visitor scrolls —
// the HTML, its stylesheets, its scripts, images that are not lazy, and any
// video the browser will start fetching on its own. Lazy images are counted
// separately as "on scroll", because they cost nothing on arrival.
//
// What it does not count: the fonts. They are the same 30-odd KB of subsets on
// every page, cached after the first one, and identical across pages — so
// including them would move every number by the same amount and hide nothing.
// Their total is printed for information.
//
// Not a substitute for a real measurement in a browser: it reads file sizes off
// disk, so it sees uncompressed bytes and cannot know what the CDN gzips. It is
// a regression guard, and for that it only has to be consistent.

import { readFileSync, statSync, readdirSync, existsSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';

const DIST = resolve('dist');

// Bytes a page may pull on open. Set roughly 40% above where the pages sit
// today, so ordinary additions pass and a return to unprocessed images does not.
const BUDGET_EAGER = 900 * 1024;
// A page may lazy-load a lot more, but not without limit either.
const BUDGET_TOTAL = 6 * 1024 * 1024;

// Pages that do not meet the budget yet, each with the reason and the number
// they are held at. The point of listing them is that they cannot grow: the
// allowance is just above where the page sits today, so the guard still bites.
// Delete an entry once the underlying thing is fixed.
const ALLOWANCES = {
  // cat-video.mp4 sits in the laptop in the hero, above the fold, playing
  // on arrival — deferring it would change what the first screen looks
  // like, which is a design decision, not a build one. Re-encoded down to
  // ~1.5 MB (was 3.7 MB); the allowance is just above where that leaves the
  // page. Whoever reworks the hero should take the video with it and drop
  // this line.
  'index.html': { eager: 2100 * 1024 },
};

const kb = (n) => (n / 1024).toFixed(0).padStart(5) + ' KB';

function walk(dir, out = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else out.push(full);
  }
  return out;
}

function sizeOf(url, htmlFile) {
  if (!url || /^(https?:|data:|mailto:|tel:|#)/.test(url)) return 0;
  const clean = url.split(/[?#]/)[0];
  const path = clean.startsWith('/')
    ? join(DIST, clean)
    : resolve(dirname(htmlFile), clean);
  return existsSync(path) ? statSync(path).size : 0;
}

const attr = (tag, name) => {
  const m = tag.match(new RegExp(`\\s${name}\\s*=\\s*["']([^"']*)["']`, 'i'));
  return m ? m[1] : null;
};
const hasAttr = (tag, name) => new RegExp(`\\s${name}(\\s|=|>|$)`, 'i').test(tag);

const pages = walk(DIST).filter((f) => f.endsWith('.html'));
if (!pages.length) {
  console.error('check-weight: no HTML in dist/ — run the build first.');
  process.exit(1);
}

const fontBytes = existsSync(join(DIST, 'fonts'))
  ? walk(join(DIST, 'fonts')).reduce((n, f) => n + statSync(f).size, 0)
  : 0;

let failed = false;
console.log('\nPage weight (uncompressed bytes on disk)\n');
console.log('  eager    on scroll   total    page');

for (const file of pages.sort()) {
  const html = readFileSync(file, 'utf8');
  let eager = statSync(file).size;
  let lazy = 0;

  for (const tag of html.match(/<link\b[^>]*>/gi) || []) {
    if (/rel\s*=\s*["']?(stylesheet|modulepreload|preload)/i.test(tag)) {
      eager += sizeOf(attr(tag, 'href'), file);
    }
  }
  for (const tag of html.match(/<script\b[^>]*>/gi) || []) {
    eager += sizeOf(attr(tag, 'src'), file);
  }
  for (const tag of html.match(/<img\b[^>]*>/gi) || []) {
    const bytes = sizeOf(attr(tag, 'src'), file);
    if (/loading\s*=\s*["']?lazy/i.test(tag)) lazy += bytes;
    else eager += bytes;
  }
  for (const tag of html.match(/<(video|source)\b[^>]*>/gi) || []) {
    const bytes = sizeOf(attr(tag, 'src'), file);
    // autoplay overrides preload: the browser fetches the file regardless.
    const deferred = !hasAttr(tag, 'autoplay') && attr(tag, 'preload') === 'none';
    if (deferred) lazy += bytes;
    else eager += bytes;
    eager += sizeOf(attr(tag, 'poster'), file);
  }

  const name = file.slice(DIST.length + 1);
  const allowed = ALLOWANCES[name] || {};
  const eagerCap = allowed.eager || BUDGET_EAGER;
  const totalCap = allowed.total || BUDGET_TOTAL;
  const over = eager > eagerCap || eager + lazy > totalCap;
  if (over) failed = true;
  const flag = over ? 'FAIL ' : allowed.eager || allowed.total ? 'held ' : '';
  console.log(`${kb(eager)}  ${kb(lazy)}  ${kb(eager + lazy)}    ${flag}${name}`);
}

console.log(`\n  budget: ${kb(BUDGET_EAGER)} eager, ${kb(BUDGET_TOTAL)} total`);
console.log(`  fonts (shared, cached across pages, not counted): ${kb(fontBytes)}\n`);

if (failed) {
  console.error('check-weight: a page is over budget. Run the images through');
  console.error('the build pipeline (npm run images) or mark them loading="lazy".');
  process.exit(1);
}
console.log('check-weight: all pages within budget.\n');
