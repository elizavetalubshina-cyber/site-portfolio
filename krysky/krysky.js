import rough from 'roughjs';
import { challenge, team } from './team.js';

const NS = 'http://www.w3.org/2000/svg';
const INK = '#262428';
const INK_SOFT = '#625d66';
const WINE = '#7b1730';
const WINE_TINT = '#f7ebee';

const svg = document.querySelector('.road');
const board = document.querySelector('.board');
const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const TOTAL = challenge.weeks * challenge.perWeek;
const clampDone = (n) => Math.max(0, Math.min(TOTAL, Math.round(Number(n) || 0)));
const rats = team.map((m, i) => ({ ...m, id: i, done: clampDone(m.done) }));

const rc = rough.svg(svg);
const pencil = (extra = {}) => ({ stroke: INK, strokeWidth: 2.2, roughness: 1.4, bowing: 1.2, ...extra });
const hatch = (extra = {}) => pencil({ fill: INK, fillStyle: 'hachure', hachureGap: 6, fillWeight: 1, ...extra });

const el = (name, attrs = {}, parent) => {
  const node = document.createElementNS(NS, name);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
  if (parent) parent.appendChild(node);
  return node;
};
const group = (parent, attrs) => el('g', attrs, parent);
const add = (parent, ...nodes) => nodes.forEach((n) => parent.appendChild(n));

// ---------- Dates under the title ----------

const dates = document.querySelector('.head__dates');
if (challenge.start && challenge.finish) {
  dates.textContent = `${challenge.start} - ${challenge.finish}`;
  dates.hidden = false;
}
const note = document.querySelector('.card__note');
if (challenge.updated) {
  note.textContent = `Обновлено ${challenge.updated}`;
  note.hidden = false;
}

// ---------- The road ----------

// The road is a snake: straight rows joined by half-circle turns. On a wide
// card two rows, two weeks each; on a phone one row per week. A point on the
// road is given by its distance from the start line, so every rat, tick and
// label is placed with the same function.
function layoutFor(width) {
  const wide = width >= 600;
  const spr = wide ? challenge.perWeek * 2 : challenge.perWeek;
  const rows = Math.ceil(TOTAL / spr);
  const W = wide ? 1000 : 380;
  const r = wide ? 100 : 80;
  const m = wide ? 140 : 100;
  const top = wide ? 130 : 120;
  const bottom = wide ? 90 : 80;
  const L = W - 2 * m;
  return {
    wide, spr, rows, W, r, m, top, L,
    H: top + (rows - 1) * 2 * r + bottom,
    seg: L + Math.PI * r,
    stepLen: L / spr,
    half: wide ? 22 : 18,
    ratK: wide ? 1 : 0.78,
  };
}

// Distance along the road to step s: rows hold spr steps each, the turns
// between them take no steps.
function lenOf(s, lay) {
  if (s <= 0) return s * lay.stepLen;
  const row = Math.min(lay.rows - 1, Math.ceil(s / lay.spr) - 1);
  return row * lay.seg + (s - row * lay.spr) * lay.stepLen;
}

// Point and direction of travel at distance d. Before the start and after
// the last row the road just goes on straight.
function pointAt(d, lay) {
  const { m, W, r, L, top, seg, rows } = lay;
  if (d < 0) return { x: m + d, y: top, tx: 1, ty: 0 };
  const row = Math.min(rows - 1, Math.floor(d / seg));
  const u = d - row * seg;
  const dir = row % 2 === 0 ? 1 : -1;
  const y = top + row * 2 * r;
  if (u <= L || row === rows - 1) {
    return { x: dir > 0 ? m + u : W - m - u, y, tx: dir, ty: 0 };
  }
  const a = (u - L) / r;
  if (dir > 0) {
    const t = -Math.PI / 2 + a;
    return { x: W - m + r * Math.cos(t), y: y + r + r * Math.sin(t), tx: -Math.sin(t), ty: Math.cos(t) };
  }
  const t = -Math.PI / 2 - a;
  return { x: m + r * Math.cos(t), y: y + r + r * Math.sin(t), tx: Math.sin(t), ty: -Math.cos(t) };
}

// One edge of the road, d units to the side of the middle line.
function edge(from, to, side, lay) {
  const pts = [];
  for (let d = from; d < to; d += 18) pts.push(d);
  pts.push(to);
  return pts.map((d) => {
    const p = pointAt(d, lay);
    return [p.x - p.ty * side, p.y + p.tx * side];
  });
}

// A short pencil stroke across the road at distance d.
function across(d, lay, reach, opts) {
  const p = pointAt(d, lay);
  return rc.line(p.x - p.ty * reach, p.y + p.tx * reach, p.x + p.ty * reach, p.y - p.tx * reach, opts);
}

function text(parent, x, y, str, attrs = {}) {
  const t = el('text', { x, y, 'text-anchor': 'middle', fill: INK_SOFT, 'font-size': 22, 'font-weight': 700, ...attrs }, parent);
  t.textContent = str;
  return t;
}

function drawRoad(lay) {
  const g = group(svg, { class: 'track', 'aria-hidden': 'true' });
  const finish = lenOf(TOTAL, lay);
  const from = -(lay.m - 24);
  const to = finish + 34;

  add(
    g,
    rc.curve(edge(from, to, -lay.half, lay), pencil({ roughness: 0.9, bowing: 0.6 })),
    rc.curve(edge(from, to, lay.half, lay), pencil({ roughness: 0.9, bowing: 0.6 }))
  );
  // Dashes down the middle.
  for (let d = from + 8; d < finish - 8; d += 26) {
    const a = pointAt(d, lay);
    const b = pointAt(d + 11, lay);
    add(g, rc.line(a.x, a.y, b.x, b.y, pencil({ stroke: INK_SOFT, strokeWidth: 1.4, roughness: 0.8 })));
  }

  // A tick across the road for every routine, a bolder one for each week.
  for (let s = 1; s < TOTAL; s++) {
    const weekEnd = s % challenge.perWeek === 0;
    add(g, across(lenOf(s, lay), lay, lay.half + (weekEnd ? 8 : 0), pencil({ strokeWidth: weekEnd ? 2.2 : 1.4, stroke: weekEnd ? INK : INK_SOFT })));
  }

  // Week names under the road, in the middle of each week.
  for (let w = 0; w < challenge.weeks; w++) {
    const p = pointAt((lenOf(w * challenge.perWeek, lay) + lenOf((w + 1) * challenge.perWeek, lay)) / 2, lay);
    text(g, p.x, p.y + lay.half + 26, `${w + 1} неделя`, { 'font-size': lay.wide ? 22 : 20 });
  }

  // Start line and its word.
  add(g, across(0, lay, lay.half + 4, pencil({ strokeWidth: 3 })));
  const s0 = pointAt(0, lay);
  text(g, s0.x - 10, s0.y + lay.half + 26, 'старт', { fill: INK, 'text-anchor': 'end' });

  drawFinish(g, finish, lay);
}

// A chequered finish line and the prize past it.
function drawFinish(g, finish, lay) {
  const p = pointAt(finish, lay);
  const cell = 8;
  const n = Math.round((2 * lay.half) / cell);
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < 2; j++) {
      if ((i + j) % 2) continue;
      const y = p.y - lay.half + i * cell;
      const x = p.x + p.tx * j * cell - (p.tx < 0 ? cell : 0);
      el('rect', { x, y, width: cell, height: cell, fill: INK }, g);
    }
  }
  add(g, across(finish, lay, lay.half + 2, pencil({ strokeWidth: 1.6 })));

  // The prize: a box with a bow, sitting on the road just past the line.
  const q = pointAt(finish + (lay.wide ? 72 : 60), lay);
  const k = lay.wide ? 1 : 0.85;
  const prize = group(g, { transform: `translate(${q.x} ${q.y + lay.half - 4}) scale(${k})` });
  el('rect', { x: -28, y: -48, width: 56, height: 48, fill: '#fff' }, prize);
  add(
    prize,
    rc.rectangle(-28, -48, 56, 48, pencil({ stroke: WINE, fill: WINE, fillStyle: 'hachure', hachureGap: 7, hachureAngle: 60 })),
    rc.rectangle(-32, -60, 64, 14, pencil({ fill: '#fff', fillStyle: 'solid' })),
    rc.line(0, -60, 0, 0, pencil({ strokeWidth: 3 })),
    rc.ellipse(-12, -68, 24, 14, pencil({ strokeWidth: 2 })),
    rc.ellipse(12, -68, 24, 14, pencil({ strokeWidth: 2 }))
  );
  text(prize, 0, -84, 'приз', { fill: WINE, 'font-size': 26 });
}

// ---------- The rats ----------

// A rat faces right with its feet on y = 0; the avatar floats above it.
function drawRat(parent, rat, k, idx) {
  const outer = group(parent, { class: 'rat', 'data-id': rat.id });
  const title = el('title', {}, outer);
  title.textContent = `${rat.name}: ${rat.done} из ${TOTAL}`;
  const hop = group(outer, { class: 'rat__hop' });
  hop.style.setProperty('--hop-delay', `${(idx % 4) * 0.18}s`);
  const dir = group(hop);
  const bob = group(dir, { class: 'rat__bob' });

  const legsA = group(bob, { class: 'legs-a' });
  const legsB = group(bob, { class: 'legs-b' });
  const leg = { strokeWidth: 2, roughness: 0.6 };
  add(legsA, rc.line(-12, -6, -19, 0, pencil(leg)), rc.line(12, -6, 19, 0, pencil(leg)));
  add(legsB, rc.line(-12, -6, -5, 0, pencil(leg)), rc.line(12, -6, 5, 0, pencil(leg)));

  add(bob, rc.curve([[-24, -12], [-38, -4], [-50, -16], [-64, -10]], pencil({ stroke: WINE, strokeWidth: 2, roughness: 0.8 })));
  el('ellipse', { cx: 0, cy: -17, rx: 26, ry: 13, fill: '#fff' }, bob);
  el('path', { d: 'M16 -26 C30 -28 40 -18 46 -13 C38 -8 28 -6 16 -9 Z', fill: '#fff' }, bob);
  add(
    bob,
    rc.ellipse(0, -17, 52, 26, hatch({ hachureGap: 6, fillWeight: 0.8 })),
    rc.path('M16 -26 C30 -28 40 -18 46 -13 C38 -8 28 -6 16 -9 Z', pencil({ strokeWidth: 2 })),
    rc.circle(20, -29, 15, pencil({ fill: WINE_TINT, fillStyle: 'solid', strokeWidth: 1.8 })),
    rc.circle(33, -18, 4, pencil({ fill: INK, fillStyle: 'solid', strokeWidth: 1 })),
    rc.circle(46, -13, 6, pencil({ stroke: WINE, fill: WINE, fillStyle: 'solid', strokeWidth: 1 })),
    rc.line(44, -12, 58, -19, pencil({ strokeWidth: 1, roughness: 0.6 })),
    rc.line(44, -12, 58, -8, pencil({ strokeWidth: 1, roughness: 0.6 }))
  );

  const pos = group(hop, { transform: `translate(0 ${rat.slot % 2 ? -86 : -58})` });
  const ava = group(pos, { class: 'rat__avatar' });
  const R = 20;
  el('line', { x1: 0, y1: R, x2: 0, y2: rat.slot % 2 ? 52 : 24, stroke: INK_SOFT, 'stroke-width': 1.4, 'stroke-dasharray': '3 3' }, ava);
  el('circle', { cx: 0, cy: 0, r: R, fill: WINE_TINT }, ava);
  if (rat.avatar) {
    const clip = el('clipPath', { id: `ava-${rat.id}` }, ava);
    el('circle', { cx: 0, cy: 0, r: R }, clip);
    el('image', { href: rat.avatar, x: -R, y: -R, width: 2 * R, height: 2 * R, preserveAspectRatio: 'xMidYMid slice', 'clip-path': `url(#ava-${rat.id})` }, ava);
  } else {
    text(ava, 0, 8, [...rat.name.trim()][0] || '?', { fill: WINE, 'font-size': 26 });
  }
  add(ava, rc.circle(0, 0, 2 * R + 2, pencil({ stroke: WINE, strokeWidth: 2.4, roughness: 0.9 })));

  return { outer, dir, k };
}

// Puts a rat at distance d, turned the way the road goes there.
function placeRat(view, d, lay) {
  const p = pointAt(d, lay);
  view.outer.setAttribute('transform', `translate(${p.x.toFixed(1)} ${p.y.toFixed(1)}) scale(${view.k})`);
  if (p.tx < -0.001) {
    const a = (Math.atan2(p.ty, -p.tx) * 180) / Math.PI;
    view.dir.setAttribute('transform', `scale(-1 1) rotate(${a.toFixed(1)})`);
  } else {
    const a = (Math.atan2(p.ty, p.tx) * 180) / Math.PI;
    view.dir.setAttribute('transform', `rotate(${a.toFixed(1)})`);
  }
}

// Rats on the same step queue up behind each other.
function targets(lay) {
  const byStep = new Map();
  for (const r of rats) {
    if (!byStep.has(r.done)) byStep.set(r.done, []);
    byStep.get(r.done).push(r);
  }
  const out = new Map();
  for (const [step, list] of byStep) {
    const gap = Math.max(lay.wide ? 30 : 24, Math.min(64 * lay.ratK, (lay.stepLen * 0.8) / list.length));
    list.forEach((r, k) => {
      r.slot = k;
      out.set(r.id, lenOf(step, lay) - k * gap);
    });
  }
  return out;
}

let current = null;
let firstRun = true;

function render() {
  const width = svg.getBoundingClientRect().width || svg.parentElement.clientWidth;
  const lay = layoutFor(width);
  if (current && current.wide === lay.wide) return;
  current = lay;

  svg.replaceChildren();
  svg.setAttribute('viewBox', `0 0 ${lay.W} ${lay.H}`);
  drawRoad(lay);

  const goal = targets(lay);
  const layer = group(svg, { class: 'rats' });
  // Leaders are drawn last so they sit on top of the queue behind them.
  const order = [...rats].sort((a, b) => a.done - b.done || goal.get(a.id) - goal.get(b.id));
  const views = order.map((r, i) => ({ rat: r, view: drawRat(layer, r, lay.ratK, i), goal: goal.get(r.id) }));

  const animate = firstRun && !reduce;
  firstRun = false;
  for (const { rat, view, goal: d } of views) {
    const home = () => rat.done === TOTAL && view.outer.classList.add('is-home');
    if (!animate) {
      placeRat(view, d, lay);
      home();
      continue;
    }
    const startAt = Math.min(d, -((rat.id % 3) * 26));
    placeRat(view, startAt, lay);
    run(view, startAt, d, lay, 500 + rat.id * 140).then(home);
  }
  wireHighlight('.rat');
}

function run(view, from, to, lay, delay) {
  const dist = to - from;
  if (dist <= 0) return Promise.resolve();
  const duration = Math.min(3600, 500 + dist * 1.6);
  return new Promise((resolve) => {
    setTimeout(() => {
      view.outer.classList.add('is-running');
      const t0 = performance.now();
      const tick = (now) => {
        const t = Math.min(1, (now - t0) / duration);
        const e = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
        placeRat(view, from + dist * e, lay);
        if (t < 1) requestAnimationFrame(tick);
        else {
          view.outer.classList.remove('is-running');
          resolve();
        }
      };
      requestAnimationFrame(tick);
    }, delay);
  });
}

// ---------- Who is where ----------

function renderBoard() {
  const sorted = [...rats].sort((a, b) => b.done - a.done || a.name.localeCompare(b.name, 'ru'));
  for (const r of sorted) {
    const li = document.createElement('li');
    li.className = 'board__row';
    li.dataset.id = r.id;

    const ava = document.createElement('span');
    ava.className = 'board__ava';
    ava.setAttribute('aria-hidden', 'true');
    if (r.avatar) {
      const img = document.createElement('img');
      img.src = r.avatar;
      img.alt = '';
      img.loading = 'lazy';
      ava.appendChild(img);
    } else {
      ava.textContent = [...r.name.trim()][0] || '?';
    }

    const name = document.createElement('span');
    name.className = 'board__name';
    name.textContent = r.name;

    const steps = document.createElement('ul');
    steps.className = 'board__steps';
    steps.setAttribute('aria-hidden', 'true');
    for (let s = 1; s <= TOTAL; s++) {
      const box = document.createElement('li');
      box.className = 'board__step';
      if (s <= r.done) box.classList.add('is-done');
      if (s % challenge.perWeek === 0) box.classList.add('is-week-end');
      steps.appendChild(box);
    }

    const count = document.createElement('span');
    count.className = 'board__count';
    count.textContent = r.done === TOTAL ? 'финиш!' : `${r.done} из ${TOTAL}`;
    if (r.done === TOTAL) count.setAttribute('aria-label', `${TOTAL} из ${TOTAL}, финиш`);

    li.append(ava, name, steps, count);
    board.appendChild(li);
  }
}

// Pointing at a row lights up that rat on the road, and the other way round.
function wireHighlight(selector) {
  const light = (id, on) => {
    for (const n of document.querySelectorAll(`[data-id="${id}"]`)) n.classList.toggle('is-lit', on);
  };
  for (const n of document.querySelectorAll(selector)) {
    n.addEventListener('pointerenter', () => light(n.dataset.id, true));
    n.addEventListener('pointerleave', () => light(n.dataset.id, false));
  }
}

renderBoard();
wireHighlight('.board__row');
render();
if ('ResizeObserver' in window) new ResizeObserver(() => render()).observe(svg.parentElement);
else window.addEventListener('resize', render);
