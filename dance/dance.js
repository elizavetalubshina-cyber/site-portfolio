import rough from 'roughjs';
import stripUrl from './img/strip.webp';

// The drawing lives in scene units: the ground runs along y = GROUND, the
// heel and the house sit around x = 330..800. The viewBox is fitted to the
// window so the drawing keeps a sensible size on a phone and on a monitor
// and the ground stays at the bottom of the screen.
const GROUND = 882;
const CENTER_X = 560;
// Middle of the platform when the heel stands on the ground.
const IMPACT_X = 545;

const NS = 'http://www.w3.org/2000/svg';
const svg = document.querySelector('.scene');
const again = document.querySelector('.again');
const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const rc = rough.svg(svg);
const INK = '#262428';
const WINE = '#7b1730';
const WINE_DEEP = '#5a0f22';

const pencil = (extra = {}) => ({
  stroke: INK,
  strokeWidth: 2.2,
  roughness: 1.5,
  bowing: 1.3,
  ...extra,
});
const hatch = (extra = {}) =>
  pencil({ fill: INK, fillStyle: 'hachure', hachureGap: 8, fillWeight: 1.1, ...extra });

const el = (name, attrs = {}, parent) => {
  const node = document.createElementNS(NS, name);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
  if (parent) parent.appendChild(node);
  return node;
};
const group = (parent, attrs) => el('g', attrs, parent);
const add = (parent, ...nodes) => nodes.forEach((n) => parent.appendChild(n));

function fit() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  const s = Math.min(w / 480, h / 820, 1.25);
  const vw = w / s;
  const vh = h / s;
  svg.setAttribute('viewBox', `${CENTER_X - vw / 2} ${GROUND + 62 - vh} ${vw} ${vh}`);
}
fit();
window.addEventListener('resize', fit);

// ---------- The drawing ----------

const world = group(svg, { class: 'world' });

// Ground: one long wobbly pencil line with a few hills.
add(
  world,
  rc.curve(
    [
      [-1800, GROUND + 4], [-900, GROUND - 6], [-300, GROUND + 5], [100, GROUND - 4],
      [420, GROUND + 3], [700, GROUND - 3], [1000, GROUND + 5], [1400, GROUND - 5],
      [2000, GROUND + 3], [2900, GROUND - 2],
    ],
    pencil({ strokeWidth: 2.6, roughness: 1.2 })
  )
);

// Sun and cloud, up in the sky on wide screens.
const sun = group(world, { transform: 'translate(1010 230)' });
add(sun, rc.circle(0, 0, 90, hatch({ hachureGap: 10 })));
for (let i = 0; i < 10; i++) {
  const a = (i / 10) * Math.PI * 2;
  add(sun, rc.line(Math.cos(a) * 62, Math.sin(a) * 62, Math.cos(a) * 92, Math.sin(a) * 92, pencil()));
}
const cloud = group(world, { transform: 'translate(40 300)' });
add(
  cloud,
  rc.path('M0 30 C-10 0 30 -12 42 4 C52 -22 96 -18 100 8 C124 0 140 24 124 38 C120 50 10 52 0 30 Z', pencil())
);

// Trees at the sides.
function tree(x, size) {
  // The wobble animates the inner group: a CSS transform on the outer one
  // would replace its translate and throw the tree to the corner.
  const g = group(group(world, { transform: `translate(${x} ${GROUND})` }), { class: 'tree' });
  add(
    g,
    rc.line(-7, 0, -6, -size * 0.9, pencil()),
    rc.line(7, 0, 6, -size * 0.9, pencil()),
    rc.circle(0, -size * 1.25, size * 0.95, hatch({ hachureGap: 11, hachureAngle: 60 }))
  );
  return g;
}
const trees = [tree(160, 110), tree(1010, 130)];

// The house: jumps when the heel lands, and stays where it was.
// Drawn at x = 300..440 and moved right of the heel. The jump animates the
// inner group so it keeps this offset.
const house = group(group(world, { transform: 'translate(350 0)' }), { class: 'house' });
add(
  house,
  rc.rectangle(300, 745, 140, 137, pencil()),
  rc.polygon([[284, 748], [370, 660], [456, 748]], hatch()),
  rc.rectangle(407, 672, 20, 38, pencil({ fill: '#fff', fillStyle: 'solid' })),
  rc.rectangle(386, 812, 34, 70, pencil()),
  rc.circle(413, 848, 5, pencil({ fill: INK, fillStyle: 'solid' })),
  rc.rectangle(318, 772, 44, 38, pencil()),
  rc.line(340, 772, 340, 810, pencil({ strokeWidth: 1.6 })),
  rc.line(318, 791, 362, 791, pencil({ strokeWidth: 1.6 })),
  rc.curve([[417, 664], [428, 642], [410, 622], [430, 600], [418, 578]], pencil({ strokeWidth: 1.6 }))
);

// ---------- Small things that fly off ----------

const shapes = {
  flower(g, h) {
    add(
      g,
      rc.line(0, 0, 2, -h, pencil()),
      rc.ellipse(-8, -h * 0.45, 16, 7, pencil({ strokeWidth: 1.6 })),
      rc.circle(2, -h - 9, 10, hatch({ hachureGap: 3 }))
    );
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      add(g, rc.circle(2 + Math.cos(a) * 10, -h - 9 + Math.sin(a) * 10, 11, pencil({ strokeWidth: 1.5 })));
    }
  },
  tulip(g, h) {
    add(
      g,
      rc.line(0, 0, 0, -h, pencil()),
      rc.path(`M-10 ${-h} L-11 ${-h - 22} L-4 ${-h - 13} L0 ${-h - 24} L4 ${-h - 13} L11 ${-h - 22} L10 ${-h} Z`, hatch({ hachureGap: 4 }))
    );
  },
  grass(g) {
    add(g, rc.linearPath([[-12, 0], [-8, -15], [-4, 0], [0, -19], [4, 0], [8, -14], [12, 0]], pencil({ strokeWidth: 1.8 })));
  },
  stone(g) {
    add(g, rc.ellipse(0, -7, 26, 14, hatch({ hachureGap: 4 })));
  },
  ball(g) {
    add(
      g,
      rc.circle(0, -14, 28, pencil()),
      rc.arc(0, -14, 28, 14, -Math.PI / 2, Math.PI / 2, false, pencil({ strokeWidth: 1.5 }))
    );
  },
  mushroom(g) {
    add(
      g,
      rc.rectangle(-5, -16, 10, 16, pencil({ strokeWidth: 1.8 })),
      rc.path('M-18 -16 C-18 -36 18 -36 18 -16 Z', hatch({ hachureGap: 4 }))
    );
  },
  heart(g) {
    add(g, rc.path('M0 -4 C-14 -12 -14 -26 -4 -26 C0 -26 0 -22 0 -20 C0 -22 0 -26 4 -26 C14 -26 14 -12 0 -4 Z', pencil({ stroke: WINE, strokeWidth: 1.8 })));
  },
};

// [x, kind, height, lies down when it lands]
const layout = [
  [-60, 'flower', 42, true], [30, 'mushroom', 0, true], [80, 'grass'], [120, 'heart'],
  [215, 'flower', 40, true], [250, 'stone'], [290, 'grass'], [335, 'flower', 38, true],
  [440, 'grass'], [462, 'flower', 34, true], [622, 'tulip', 38, true], [640, 'grass'],
  [830, 'stone'], [852, 'flower', 50, true], [884, 'ball'], [925, 'grass'],
  [960, 'mushroom', 0, true], [1060, 'tulip', 44, true], [1100, 'heart'], [1150, 'grass'],
  [1190, 'flower', 44, true],
];

const bits = layout.map(([x, kind, h, lies]) => {
  const outer = group(world, { transform: `translate(${x} ${GROUND})` });
  const inner = group(outer);
  shapes[kind](inner, h);
  return { x, lies: !!lies, outer, inner, dx: 0, dy: 0, r: 0, vx: 0, vy: 0, vr: 0, hits: 0, done: true, target: 0 };
});

function place(b) {
  b.outer.setAttribute('transform', `translate(${b.x + b.dx} ${GROUND + b.dy})`);
  b.inner.setAttribute('transform', `rotate(${b.r})`);
}

function launch() {
  for (const b of bits) {
    const dist = Math.abs(b.x - IMPACT_X);
    const power = Math.max(0.25, 1 - dist / 750);
    const side = Math.sign(b.x - IMPACT_X) || 1;
    b.dx = 0; b.dy = 0; b.r = 0; b.hits = 0; b.done = false;
    b.vy = -(220 + 440 * power) * (0.8 + Math.random() * 0.4);
    b.vx = side * (50 + 200 * power) * (0.6 + Math.random() * 0.6);
    b.vr = side * (200 + Math.random() * 400);
    b.target = b.lies ? side * (75 + Math.random() * 15) : 0;
    b.delay = dist / 2600; // the shock reaches far things a moment later
  }
}

const G = 1900;
function stepBits(dt) {
  let moving = false;
  for (const b of bits) {
    if (b.done) continue;
    moving = true;
    if (b.delay > 0) { b.delay -= dt; continue; }
    b.vy += G * dt;
    b.dx += b.vx * dt;
    b.dy += b.vy * dt;
    b.r += b.vr * dt;
    if (b.dy >= 0 && b.vy > 0) {
      b.dy = 0;
      b.hits += 1;
      if (b.hits >= 2 || Math.abs(b.vy) < 160) {
        b.done = true;
        b.vx = 0;
        settle(b);
      } else {
        b.vy *= -0.32;
        b.vx *= 0.5;
        b.vr *= 0.4;
      }
    }
    place(b);
  }
  return moving;
}

// Lands lying on its side (flowers, mushrooms) or upright (stones, grass).
function settle(b) {
  const from = b.r;
  const turns = Math.round((from - b.target) / 360) * 360;
  const to = b.target + turns;
  const t0 = performance.now();
  const tick = (now) => {
    const k = Math.min(1, (now - t0) / 260);
    const e = 1 - Math.pow(1 - k, 3);
    b.r = from + (to - from) * e;
    place(b);
    if (k < 1) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

// ---------- The heel ----------

// The photo of the shoe: the one thing on the page that is not a pencil
// drawing. strip.webp is 600 x 900 with the platform bottom on its last row
// and the heel tip at x = 82; scaled so the whole shoe is about 430 units
// tall and tilted a touch so the heel tip meets the ground as well.
const SHOE_K = 0.48;
const SHOE_X = IMPACT_X - 390 * SHOE_K;
const shoe = group(svg, { class: 'shoe' });
const shoeBody = group(shoe, {
  transform: `translate(${SHOE_X} ${GROUND + 6}) rotate(-2.2 ${390 * SHOE_K} 0) scale(${SHOE_K})`,
});
el('image', { href: stripUrl, x: 0, y: -900, width: 600, height: 900 }, shoeBody);

// Pencil dust and cracks around the platform.
const fx = group(svg, { class: 'fx' });

// ---------- The stomp ----------

const ease = {
  fall: 'cubic-bezier(0.55, 0, 1, 0.45)',
  lift: 'cubic-bezier(0.5, 0, 0.75, 0)',
  out: 'cubic-bezier(0.2, 0.8, 0.3, 1)',
};

function hide(node) { node.style.visibility = 'hidden'; }
function show(node) { node.style.visibility = 'visible'; }

function puff() {
  fx.replaceChildren();
  const spots = [[398, -1], [484, -1], [606, 1], [492, -1], [598, 1]];
  for (const [x, side] of spots) {
    const g = group(fx, { transform: `translate(${x} ${GROUND - 10})` });
    add(g, rc.circle(0, 0, 26 + Math.random() * 14, pencil({ strokeWidth: 1.4, roughness: 2.2 })));
    g.animate(
      [
        { transform: `translate(${x}px, ${GROUND - 10}px) scale(0.3)`, opacity: 1 },
        { transform: `translate(${x + side * 50}px, ${GROUND - 40}px) scale(1.4)`, opacity: 0 },
      ],
      { duration: 620, easing: ease.out, fill: 'forwards' }
    );
  }
  // Cracks under the platform stay as a mark of the stomp.
  const cracks = group(fx);
  add(
    cracks,
    rc.linearPath([[490, GROUND + 4], [472, GROUND + 18], [480, GROUND + 30]], pencil({ strokeWidth: 1.6 })),
    rc.linearPath([[602, GROUND + 4], [622, GROUND + 16], [616, GROUND + 32]], pencil({ strokeWidth: 1.6 })),
    rc.linearPath([[398, GROUND + 2], [392, GROUND + 18]], pencil({ strokeWidth: 1.6 }))
  );
}

function shake() {
  world.animate(
    [
      { transform: 'translate(0, 0)' },
      { transform: 'translate(-7px, 5px)' },
      { transform: 'translate(6px, -4px)' },
      { transform: 'translate(-4px, 3px)' },
      { transform: 'translate(2px, -1px)' },
      { transform: 'translate(0, 0)' },
    ],
    { duration: 340, easing: 'linear' }
  );
}

function jumpHouse() {
  house.style.transformBox = 'fill-box';
  house.style.transformOrigin = '50% 100%';
  house.animate(
    [
      { transform: 'translateY(0) scale(1, 1)', easing: 'cubic-bezier(0.2, 0.8, 0.4, 1)' },
      { transform: 'translateY(-70px) scale(0.97, 1.04) rotate(-3deg)', offset: 0.4, easing: 'cubic-bezier(0.6, 0, 0.9, 0.5)' },
      { transform: 'translateY(0) scale(1.07, 0.9)', offset: 0.75 },
      { transform: 'translateY(0) scale(0.98, 1.02)', offset: 0.88 },
      { transform: 'translateY(0) scale(1, 1)' },
    ],
    { duration: 720, delay: 40 }
  );
  for (const t of trees) {
    t.style.transformBox = 'fill-box';
    t.style.transformOrigin = '50% 100%';
    t.animate(
      [
        { transform: 'rotate(0)' },
        { transform: 'rotate(-5deg)' },
        { transform: 'rotate(3deg)' },
        { transform: 'rotate(-1deg)' },
        { transform: 'rotate(0)' },
      ],
      { duration: 800, delay: 120 }
    );
  }
}

let physicsRunning = false;
function runPhysics() {
  if (physicsRunning) return;
  physicsRunning = true;
  let last = performance.now();
  const loop = (now) => {
    const dt = Math.min(0.033, (now - last) / 1000);
    last = now;
    if (stepBits(dt)) requestAnimationFrame(loop);
    else physicsRunning = false;
  };
  requestAnimationFrame(loop);
}

function resetBits() {
  for (const b of bits) {
    b.dx = 0; b.dy = 0; b.r = 0; b.done = true;
    place(b);
    b.outer.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 300 });
  }
}

let busy = false;
async function stomp({ first }) {
  if (busy) return;
  busy = true;
  again.hidden = true;
  if (!first) {
    fx.replaceChildren();
    resetBits();
    await wait(350);
  }
  show(shoe);
  shoe.style.transformBox = 'fill-box';
  shoe.style.transformOrigin = '60% 100%';
  // Flies in from the left along an arc and comes down on the platform.
  const fall = shoe.animate(
    [
      { transform: 'translate(-1300px, -700px) rotate(-38deg)', easing: 'cubic-bezier(0.3, 0.2, 0.6, 1)' },
      { transform: 'translate(-420px, -430px) rotate(-16deg)', offset: 0.55, easing: 'cubic-bezier(0.55, 0, 1, 0.5)' },
      { transform: 'translate(0, 0) rotate(0)' },
    ],
    { duration: 760, fill: 'forwards' }
  );
  await fall.finished;

  shake();
  puff();
  jumpHouse();
  launch();
  runPhysics();
  if (navigator.vibrate) {
    try { navigator.vibrate(30); } catch (e) { /* not allowed here */ }
  }

  await wait(620);
  const lift = shoe.animate(
    [
      { transform: 'translate(0, 0) rotate(0)' },
      { transform: 'translate(-10px, -30px) rotate(-3deg)', offset: 0.25 },
      { transform: 'translate(1100px, -1300px) rotate(24deg)' },
    ],
    { duration: 620, easing: ease.lift, fill: 'forwards' }
  );
  await lift.finished;
  hide(shoe);
  busy = false;
  again.hidden = false;
}

function wait(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

// Pencil draws itself before the heel arrives.
function sketchIn() {
  const paths = world.querySelectorAll('path');
  paths.forEach((p, i) => {
    let len = 0;
    try { len = p.getTotalLength(); } catch (e) { return; }
    if (!len) return;
    p.style.strokeDasharray = `${len}`;
    p.animate(
      [{ strokeDashoffset: len }, { strokeDashoffset: 0 }],
      { duration: 520, delay: (i % 40) * 8, easing: 'ease-out', fill: 'backwards' }
    );
  });
}

if (reduce) {
  hide(shoe);
  again.hidden = true;
  // The card comes in without waiting for the stomp.
  document.documentElement.style.setProperty('--card-delay', '0s');
} else {
  hide(shoe);
  sketchIn();
  setTimeout(() => stomp({ first: true }), 700);
  again.addEventListener('click', () => stomp({ first: false }));
}
