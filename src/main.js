const navHeader = document.querySelector('.nav');
const navToggle = document.querySelector('.nav__toggle');
const navMenu = document.querySelector('.nav__menu');

if (navHeader && navToggle && navMenu) {
  const closeNavMenu = () => {
    navHeader.classList.remove('is-open');
    navToggle.setAttribute('aria-expanded', 'false');
  };

  navToggle.addEventListener('click', () => {
    const isOpen = navHeader.classList.toggle('is-open');
    navToggle.setAttribute('aria-expanded', String(isOpen));
  });

  navMenu.addEventListener('click', (e) => {
    if (e.target.closest('a')) closeNavMenu();
  });

  document.addEventListener('click', (e) => {
    if (navHeader.classList.contains('is-open') && !navHeader.contains(e.target)) {
      closeNavMenu();
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeNavMenu();
  });

  window.addEventListener('resize', () => {
    if (window.innerWidth > 640) closeNavMenu();
  });
}

document.querySelectorAll('.nav__links a, .nav__menu a, .logo, .case-toc a').forEach((link) => {
  link.addEventListener('click', (e) => {
    const id = link.getAttribute('href');
    if (!id || id === '#' || !id.startsWith('#')) return;
    const target = document.querySelector(id);
    if (!target) return;
    e.preventDefault();
    // The homepage hero is pinned inside the fall animation, so its own
    // position is wherever the fall has got to; the top means the page top.
    if (id === '#top') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
});

const heroTitle = document.querySelector('.hero__title, .case-hero__title');
if (navHeader && heroTitle) {
  // The name pill only appears once the header's bottom edge actually
  // reaches the top of the big hero title — not at a fixed scroll amount —
  // so it stays correct across viewport sizes and if the hero layout changes.
  const updateNavScrolled = () => {
    const headerBottom = navHeader.getBoundingClientRect().bottom;
    const titleTop = heroTitle.getBoundingClientRect().top;
    navHeader.classList.toggle('is-scrolled', titleTop <= headerBottom);
  };
  updateNavScrolled();
  let ticking = false;
  const onScroll = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      updateNavScrolled();
      ticking = false;
    });
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
}

const galleryPhotos = document.querySelectorAll('#aboutPhotoGallery img');
const galleryDots = document.querySelectorAll('#aboutPhotoGallery .photo-dot');

// The gallery only ever moves when the visitor asks it to. It used to advance
// itself every 5 seconds, which meant something kept moving in the corner of
// the eye while the text beside it was being read, and there was no way to stop
// it short of clicking a dot.
if (galleryPhotos.length > 1) {
  const showGalleryPhoto = (index) => {
    galleryPhotos.forEach((img, i) => img.classList.toggle('is-active', i === index));
    galleryDots.forEach((dot, i) => {
      dot.classList.toggle('is-active', i === index);
      if (i === index) {
        dot.setAttribute('aria-current', 'true');
      } else {
        dot.removeAttribute('aria-current');
      }
    });
  };

  galleryDots.forEach((dot, i) => {
    dot.addEventListener('click', () => showGalleryPhoto(i));
  });
}

// Videos that wait their turn. `autoplay` makes the browser fetch the whole
// file the moment the page opens, whatever `preload` says — on the Satellite
// case that was 1434 KB of a 1.5 MB page, downloaded long before the visitor
// had scrolled anywhere near it. With `preload="none"` and no `autoplay`
// nothing is fetched until play() is called here, and the poster (the video's
// own first frame) holds the space in the meantime, so the layout and the
// picture look the same as before. Playback also stops on the way out of view.
const deferredVideos = document.querySelectorAll('video[data-play-in-view]');

if (deferredVideos.length) {
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  // `controls` is in the markup, not added here, so that with scripting off the
  // video is still watchable instead of a frozen poster. Once this code is
  // running it takes over starting and stopping, and the bar goes away — the
  // block is far below the fold, so it is never on screen while that happens.
  deferredVideos.forEach((v) => v.removeAttribute('controls'));

  if (reducedMotion.matches) {
    // Nothing starts moving on its own here: the poster stays and the controls
    // go back, so the video is still watchable for anyone who wants it.
    deferredVideos.forEach((v) => v.setAttribute('controls', ''));
  } else if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const video = entry.target;
          if (entry.isIntersecting) {
            video.play().catch(() => {
              // Autoplay refused (a browser setting, or a decode failure):
              // hand the visitor the controls rather than a dead frame.
              video.setAttribute('controls', '');
            });
          } else if (!video.paused) {
            video.pause();
          }
        });
      },
      { rootMargin: '200px 0px' },
    );
    deferredVideos.forEach((v) => observer.observe(v));
  } else {
    deferredVideos.forEach((v) => v.play().catch(() => v.setAttribute('controls', '')));
  }
}

// Case TOC: highlights whichever heading the visitor has scrolled past
// most recently, so the sidebar reflects where they actually are, not just
// where they last clicked. Sub-items only show for that section — a long
// case would otherwise push the whole menu past the viewport — but a
// chevron next to each top-level item lets the visitor pin one more
// section open to browse it without leaving the current one.
//
// This tracks position directly (the last heading whose top has crossed
// the header line) rather than watching an IntersectionObserver band.
// A band leaves gaps: scroll past a heading before the next one reaches
// the band and nothing is "current" for that whole stretch, so the open
// group flickered shut mid-section. There's always exactly one current
// heading this way (or none, above the first).
const caseToc = document.querySelector('.case-toc');
if (caseToc) {
  const TOC_OFFSET = 100;
  const tocLinks = [...caseToc.querySelectorAll('a[href^="#"]')];
  const linkFor = (id) => tocLinks.find((link) => link.getAttribute('href') === `#${id}`);
  const headings = tocLinks
    .map((link) => document.getElementById(link.getAttribute('href').slice(1)))
    .filter(Boolean);

  let autoGroup = null;
  // Only one manually pinned section stays open alongside the current one —
  // opening a second would push the menu past the viewport on a long case,
  // so pinning a new section closes whichever was pinned before it.
  let pinnedGroup = null;

  const applyExpansion = () => {
    caseToc.querySelectorAll('.case-toc__group').forEach((group) => {
      const open = group === autoGroup || group === pinnedGroup;
      group.classList.toggle('is-expanded', open);
      const toggle = group.querySelector(':scope > .case-toc__row > .case-toc__toggle');
      if (toggle) toggle.setAttribute('aria-expanded', String(open));
    });
  };

  caseToc.querySelectorAll('.case-toc__toggle').forEach((toggle) => {
    toggle.addEventListener('click', () => {
      const group = toggle.closest('.case-toc__group');
      if (!group) return;
      pinnedGroup = pinnedGroup === group ? null : group;
      applyExpansion();
    });
  });

  const setActive = () => {
    // headings is in document order and so is page position, so the last
    // one that has scrolled past the line is the section being read now.
    let current = null;
    for (const h of headings) {
      if (h.getBoundingClientRect().top <= TOC_OFFSET) current = h;
      else break;
    }
    tocLinks.forEach((link) => link.classList.remove('is-active'));
    const activeLink = current && linkFor(current.id);
    activeLink?.classList.add('is-active');
    autoGroup = activeLink ? activeLink.closest('.case-toc__group') : null;
    applyExpansion();
  };

  setActive();
  let ticking = false;
  const onScroll = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      setActive();
      ticking = false;
    });
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
}

// Space homepage (desktop). One field of particles tells the whole story:
//   1. a ring of dust turning round the name, with the topics of the work
//      orbiting it;
//   2. scrolling while the hero is pinned sucks the ring in: the dust
//      spirals ever faster into one point and the name shrinks into it;
//   3. out of that point the dust flies apart into the walls of a tunnel,
//      and the cases are in the tunnel. Two ways to show them:
//        flight - the stage is pinned and the scroll flies down the tunnel,
//                 each case coming up out of its depth, pausing to be read,
//                 then passing by;
//        flow   - the cases scroll by as a list and the tunnel runs round
//                 them;
//   4. by "Обо мне" the dust settles into a faint scatter.
// Stars sit behind it all; the cursor pushes the ring's dust aside. On
// every screen size; with reduced motion it holds still.
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const particleCanvas = document.getElementById('particles');
const narrowScreen = window.matchMedia('(max-width: 900px)');
const tunnelEl = document.getElementById('tunnel');
const flight = !!tunnelEl && tunnelEl.classList.contains('tunnel--flight');

const flowCases = tunnelEl && !flight ? tunnelEl.querySelectorAll('.tunnel__case') : [];
if (flowCases.length && 'IntersectionObserver' in window) {
  const reveal = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        reveal.unobserve(entry.target);
      }
    });
  }, { threshold: 0.25 });
  flowCases.forEach((el) => reveal.observe(el));
} else {
  flowCases.forEach((el) => el.classList.add('is-visible'));
}

let spaceStarted = false;
function startSpace() {
  if (spaceStarted || !particleCanvas) return;
  spaceStarted = true;

  const ctx = particleCanvas.getContext('2d');
  const intro = document.getElementById('intro');
  const hero = document.querySelector('.home-page .hero');
  const head = document.querySelector('.home-page .hero__head');
  const orbit = document.getElementById('heroOrbit');
  const tags = orbit ? [...orbit.children] : [];
  const cards = tunnelEl ? [...tunnelEl.querySelectorAll('.tunnel__case')] : [];
  const about = document.getElementById('about');
  const still = reducedMotion.matches;

  // Fewer particles on a phone: the screen is smaller and so is the budget.
  const COUNT = narrowScreen.matches ? 5000 : 14000;
  const REPEL = 110;
  // Tunnel world: depth of the visible stretch, the distance at which
  // something is drawn at its real size, and the gap between cases.
  const DEPTH = 6000;
  const FOCUS = 600;
  const SPACING = 1600;
  const BG = '7, 7, 11';

  const gauss = () => (Math.random() + Math.random() + Math.random() - 1.5) / 1.5;
  const clamp01 = (n) => Math.min(1, Math.max(0, n));
  const ease = (n) => n * n * (3 - 2 * n);

  const pts = Array.from({ length: COUNT }, () => ({
    a: Math.random() * Math.PI * 2,
    band: gauss(),
    inner: Math.random() < 0.16,
    star: Math.random() < 0.13,
    // Stars fill a disc a little larger than the screen's diagonal, so they
    // can swirl round the centre without ever leaving a corner bare.
    sa: Math.random() * Math.PI * 2,
    sr: Math.sqrt(Math.random()),
    fall: Math.random(),
    ta: Math.random() * Math.PI * 2,
    // Walls are built of rings at even steps down the tunnel, so the
    // perspective reads as a tube rather than a cloud.
    tz: Math.floor(Math.random() * 44) * (DEPTH / 44) + Math.random() * 8,
    tr: 1 + gauss() * 0.03,
    s: Math.random(),
    speed: 0.000014 + Math.random() * 0.00002,
    u: Math.random(),
    v: Math.random(),
    size: Math.random() < 0.8 ? 1.4 : 2.2,
    accent: Math.random() < 0.07,
    phase: Math.random() * Math.PI * 2,
    ox: 0,
    oy: 0,
  }));

  let w = 0, h = 0;
  let introTop = 0, introH = 1, tunnelTop = 0, tunnelH = 1, aboutTop = 1;

  const layout = () => {
    // clientWidth, not innerWidth: on a phone anything poking past the edge
    // widens innerWidth and would push the ring off centre.
    w = document.documentElement.clientWidth;
    h = window.innerHeight;
    // Safari gives up on canvases past ~16.7M pixels and draws nothing.
    const dpr = Math.min(window.devicePixelRatio || 1, 2, Math.sqrt(12e6 / Math.max(1, w * h)));
    particleCanvas.width = w * dpr;
    particleCanvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    introTop = intro.getBoundingClientRect().top + window.scrollY;
    introH = intro.offsetHeight;
    tunnelTop = tunnelEl.getBoundingClientRect().top + window.scrollY;
    tunnelH = tunnelEl.offsetHeight;
    aboutTop = about.getBoundingClientRect().top + window.scrollY;
  };

  const mouse = { x: -9999, y: -9999 };
  window.addEventListener('pointermove', (e) => { mouse.x = e.clientX; mouse.y = e.clientY; }, { passive: true });
  document.documentElement.addEventListener('mouseleave', () => { mouse.x = -9999; mouse.y = -9999; });

  // While a topic is hovered the orbit eases to a stop, so the tag and its
  // preview hold still under the cursor.
  let hovering = false;
  let pace = 1;
  tags.forEach((tag) => {
    tag.addEventListener('pointerenter', () => { hovering = true; });
    tag.addEventListener('pointerleave', () => { hovering = false; });
  });

  // Flight: scroll through the tunnel maps to camera depth. Each case gets one
  // screen of scroll, and within it the camera slows almost to a stop at the
  // point where the case is at full size, so there is time to read it.
  const cameraAt = (p) => {
    // A short run-up before the first case, so it starts far down the
    // tunnel, a speck inside the ring, rather than already half grown.
    const LEAD = 1.6;
    const seg = p * (cards.length + LEAD) - LEAD;
    if (seg < 0) return SPACING * seg;
    const i = Math.min(cards.length - 1, Math.floor(seg));
    const u = seg - i;
    return SPACING * (i + u + 0.15 * Math.sin(2 * Math.PI * u));
  };
  const caseDepth = (i) => SPACING * (i + 0.5) + FOCUS;

  // Flow: the stream's course in page coordinates. It comes in from above
  // the screen, then runs down through the middle of every case cover and on past
  // the last one. A Catmull-Rom curve through those points, sampled with
  // the running length at each sample.
  let path = { x: [], y: [], len: [], total: 1 };
  const covers = cards.map((c) => c.querySelector('.tunnel__cover'));
  const buildPath = () => {
    if (flight || !covers.length) return;
    // Starts at the point the ring fell into (the middle of the screen at
    // the moment the hero lets go): the stream is what bursts out of it.
    const knots = [{ x: w / 2, y: introTop + introH - h / 2 }, { x: w / 2, y: tunnelTop + h * 0.15 }];
    covers.forEach((c) => {
      const r = c.getBoundingClientRect();
      knots.push({ x: r.left + r.width / 2, y: r.top + window.scrollY + r.height / 2 });
    });
    const endY = tunnelTop + tunnelH;
    knots.push({ x: w / 2, y: endY + h * 0.2 }, { x: w / 2, y: endY + h * 0.7 });
    const x = [], y = [], len = [];
    let total = 0;
    for (let i = 0; i < knots.length - 1; i++) {
      const p0 = knots[Math.max(0, i - 1)], p1 = knots[i], p2 = knots[i + 1], p3 = knots[Math.min(knots.length - 1, i + 2)];
      for (let j = 0; j < 80; j++) {
        const t = j / 80, t2 = t * t, t3 = t2 * t;
        const px = 0.5 * (2 * p1.x + (-p0.x + p2.x) * t + (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 + (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3);
        const py = 0.5 * (2 * p1.y + (-p0.y + p2.y) * t + (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 + (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3);
        if (x.length) total += Math.hypot(px - x[x.length - 1], py - y[y.length - 1]);
        x.push(px); y.push(py); len.push(total);
      }
    }
    path = { x, y, len, total: total || 1 };
  };
  const onPath = (d) => {
    const { x, y, len } = path;
    let lo = 0, hi = len.length - 1;
    while (lo < hi - 1) {
      const mid = (lo + hi) >> 1;
      if (len[mid] < d) lo = mid; else hi = mid;
    }
    const seg = len[hi] - len[lo] || 1;
    const f = (d - len[lo]) / seg;
    const dx = x[hi] - x[lo], dy = y[hi] - y[lo];
    const n = Math.hypot(dx, dy) || 1;
    return { x: x[lo] + dx * f, y: y[lo] + dy * f, nx: -dy / n, ny: dx / n };
  };

  let last = 0;
  let spin = 0;
  // Stream clock: runs slowly on its own and speeds up with scrolling, so
  // the stream seems to pull the viewer along; it eases back when they stop.
  let streamT = 0;
  let rush = 0;
  // The burst runs on its own clock once the fall reaches it: a quick snap
  // out rather than something the scroll has to drag along.
  let burst = 0;
  let lastSy = window.scrollY;
  let flow = 0;

  const draw = (time) => {
    const dt = still ? 0 : Math.min(50, time - last || 16);
    last = time;
    const sy = window.scrollY;
    const v = dt > 0 ? Math.abs(sy - lastSy) / dt : 0;
    lastSy = sy;
    rush += (Math.min(1, v / 2.5) - rush) * 0.08;
    streamT += dt * (1.8 + rush * 7);

    // k: the suction, 0 at rest, 1 when everything has gone into the point.
    const k = ease(clamp01((sy - introTop) / (introH - h)));
    // m: the point bursting into the tunnel walls.
    const m = flight
      ? ease(clamp01((sy - (tunnelTop - h * 0.9)) / (h * 0.8)))
      : clamp01((sy - (tunnelTop - h * 1.05)) / (h * 0.6));
    if (!flight) {
      if (m > 0.05) burst = still ? 1 : Math.min(1, burst + dt / 1100);
      else burst = still ? 0 : Math.max(0, burst - dt / 700);
    }
    // e: the tunnel letting go as "Обо мне" comes up.
    const e = ease(clamp01((sy - (aboutTop - h)) / (h * 0.8)));
    // Camera depth in the tunnel.
    const tp = clamp01((sy - tunnelTop) / (tunnelH - h));
    const cam = flight ? cameraAt(tp) : (sy - tunnelTop) * 1.4;
    flow += still ? 0 : dt * 0.05;

    pace += ((hovering && k === 0 ? 0 : 1) - pace) * 0.12;
    const spinSpeed = (0.00006 + k * k * 0.005) * pace;
    spin += dt * spinSpeed;

    const hb = head.getBoundingClientRect();
    // The centre of everything is the middle of the screen, where the pinned
    // name sits. Tying it to the name made the core ride up with the page
    // once the hero let go.
    const cx = w / 2;
    const cy = h / 2;
    // Same radius as --ring in style.css.
    const R = narrowScreen.matches ? Math.min(w * 0.42, h * 0.36) : Math.min(w * 0.3, h * 0.42);
    const pull = Math.pow(1 - k, 0.9);

    // The name shrinks into the point and fades, without turning.
    head.style.transform = k > 0 ? `scale(${Math.max(0.02, 1 - k)})` : '';
    head.style.opacity = String(1 - clamp01(k * 1.25));

    // Each project is a point flying in the ring's dust; its name sits
    // outside, on clear sky, joined to the point by a thin line.
    const marks = [];
    if (tags.length) {
      const hr = hero.getBoundingClientRect();
      tags.forEach((tag, i) => {
        const a = (i / tags.length) * Math.PI * 2 + spin * 0.9 + 0.35;
        // Just outside the ring, and anchored on the side facing it, so the
        // label reads against clear sky instead of over the dust: on the
        // right of the ring it starts at the point, on the left it ends there.
        const ca = Math.cos(a), sa = Math.sin(a);
        const r = R * pull * 1.04 + 10;
        const x = cx + ca * r;
        // Kept clear of the nav at the top and on screen at the bottom.
        // A phone has no room beside the ring but plenty above and below it,
        // so there the names ride a taller oval that clears the dust.
        const narrow = w - 2 * r < 300;
        const ry = narrow ? R * pull + 70 : r;
        let oy = Math.min(h / 2 - 28, Math.max(-(h / 2 - 96), sa * ry));
        // On a narrow screen there is no room beside the ring, so a label
        // would cross the name; it steps round the name's band instead.
        const band = hb.height / 2 + 14;
        if (narrow && Math.abs(oy) < band) oy = (sa < 0 ? -band - 12 : band);
        const tw = tag.offsetWidth;
        const th = tag.offsetHeight;
        const left = Math.min(w - tw - 8, Math.max(8, x - tw * (1 - ca) / 2));
        const ly = cy + oy - th * (1 - sa) / 2 + th / 2;
        const lx = Math.abs(left - (cx + ca * R * pull)) < Math.abs(left + tw - (cx + ca * R * pull)) ? left : left + tw;
        // The point shies away from the cursor like the dust around it.
        const px = cx + ca * R * pull, py = cy + sa * R * pull;
        const mdx = px - mouse.x, mdy = py - mouse.y;
        const md = Math.hypot(mdx, mdy);
        let mtx = 0, mty = 0;
        if (!still && k < 0.2 && md < REPEL * 1.3 && md > 0.1 && !tag.matches(':hover')) {
          const f = (1 - md / (REPEL * 1.3)) * 46;
          mtx = (mdx / md) * f;
          mty = (mdy / md) * f;
        }
        tag._ox = (tag._ox || 0) + (mtx - (tag._ox || 0)) * 0.12;
        tag._oy = (tag._oy || 0) + (mty - (tag._oy || 0)) * 0.12;
        marks.push({
          x: px + tag._ox, y: py + tag._oy, lx: lx + tag._ox, ly: ly + tag._oy,
          on: tag.matches(':hover'), alpha: 1 - clamp01(k * 1.6),
        });
        tag.style.transform = `translate(${left - hr.left + (tag._ox || 0)}px, ${cy + oy - hr.top + (tag._oy || 0)}px) translate(0, ${-50 * (1 - sa)}%)`;
        const shown = 1 - clamp01(k * 1.6);
        tag.style.opacity = String(shown);
        tag.style.pointerEvents = shown > 0.4 ? 'auto' : 'none';
        // Preview opens toward the room: down from tags in the upper half,
        // up from tags in the lower half, so it never leaves the screen.
        tag.classList.toggle('is-below', cy + oy < h / 2);
      });
    }

    // Short trails while things move fast (the fall, the tunnel), none at
    // rest, so the ring stays crisp.
    // Burst: short glowing tails while the grains are flying out.
    const flare = flight ? 0 : Math.sin(Math.PI * burst) * 1.1;
    const trail = still ? 0 : Math.max(k * Math.pow(1 - burst, 4), flight ? m * (1 - e) * 0.55 : 0, flare) * 0.55;
    if (trail > 0.02) {
      ctx.globalAlpha = 1;
      ctx.fillStyle = `rgba(${BG}, ${1 - trail})`;
      ctx.fillRect(0, 0, w, h);
    } else {
      ctx.clearRect(0, 0, w, h);
    }

    const drift = still ? 0 : time * 0.001;
    const near = [], mid = [], far = [], accent = [], stars = [], streaks = [];
    const flowDust = [], flowBack = [], flowAccent = [];
    const tcx = w / 2, tcy = h / 2;
    const halfDiag = Math.hypot(w, h) / 2 + 20;
    const wall = Math.max(w, h) * 0.55;
    // The walls do not turn: a rotating tunnel made people motion-sick.

    for (const p of pts) {
      if (p.star) {
        // A whirlpool rather than a squeeze: stars turn round the centre,
        // those near it turning and sinking more, those at the rim barely,
        // so the edges of the screen stay full.
        const rn = p.sr;
        const swirl = k * k * (1.4 / (rn + 0.25));
        const rr = rn * halfDiag * (1 - 0.45 * k * k * (1 - rn));
        const a = p.sa + swirl;
        stars.push(w / 2 + Math.cos(a) * rr, h / 2 + Math.sin(a) * rr, p.size * 0.8);
        continue;
      }

      // Ring, spiralling in faster the closer it gets.
      p.a += dt * spinSpeed * (1 + k * (2 + p.fall * 4));
      const r0 = p.inner ? Math.sqrt(p.u) * 0.85 : 1 + p.band * 0.09;
      const r = r0 * Math.pow(1 - k, 0.7 + p.fall * 0.7);
      let x = cx + Math.cos(p.a) * R * r;
      let y = cy + Math.sin(p.a) * R * r;
      let size = p.size;
      let bucket = 0;
      let streak = 0, dirX = 0, dirY = 0;

      // Flow: the stream does not grow out of the point. It fades in where it
      // belongs while the point fades out, its dust drawing in from wider to
      // its line as it comes. Inside, the dust winds round the line as a
      // helix: the near side of each turn is drawn larger, the far side
      // smaller, so it reads as a twisting rope pulling downward.
      if (burst > 0 && !flight) {
        // Each grain leaves the point at its own moment and flies out to its
        // place in the stream, overshooting outward on the way, so the point
        // bursts and the burst becomes the stream.
        const bt = clamp01((burst - p.fall * 0.25) / 0.75);
        const mp = 1 - Math.pow(1 - bt, 3);
        const d = ((p.s + streamT * p.speed) % 1) * path.total;
        const q = onPath(d);
        const wide = 120 + 60 * p.fall * p.fall;
        const turn = d * 0.009 + streamT * 0.0012 + (p.band > 0 ? 0 : Math.PI) + (p.phase - Math.PI) * 0.07;
        const off = Math.cos(turn) * wide + p.band * 14;
        const depth = Math.sin(turn);
        let fx = q.x + q.nx * off;
        let fy = q.y + q.ny * off - sy;
        if (e > 0) {
          fx += (p.u * w - fx) * e;
          fy += (p.v * h - fy) * e;
        }
        const blast = Math.sin(Math.PI * mp) * (90 + 420 * p.u);
        fx = x + (fx - x) * mp + Math.cos(p.a) * blast;
        fy = y + (fy - y) * mp + Math.sin(p.a) * blast;
        if (fx > -4 && fx < w + 4 && fy > -4 && fy < h + 4) {
          const sz = p.size * (1 + 0.2 * mp) * (1 + 0.55 * depth * mp) * (1 + rush * 0.35);
          (p.accent ? flowAccent : depth > 0 || mp < 0.5 ? flowDust : flowBack).push(fx, fy, sz);
        }
        continue;
      }

      // Tunnel walls: a cylinder seen from inside, drawn in perspective.
      if (m > 0 && flight) {
        const z = ((((p.tz - cam - flow) % DEPTH) + DEPTH) % DEPTH) + 40;
        const s = FOCUS / z;
        const a = p.ta;
        const txp = tcx + Math.cos(a) * wall * p.tr * s;
        const typ = tcy + Math.sin(a) * wall * p.tr * s;
        x += (txp - x) * m;
        y += (typ - y) * m;
        size = p.size * (1 - m) + Math.min(3.2, Math.max(0.7, 1.3 * s)) * m;
        bucket = z < DEPTH * 0.25 ? 0 : z < DEPTH * 0.6 ? 1 : 2;
        // Near the viewer the dust is drawn as short streaks pointing away
        // from the centre, the way things smear past at speed.
        streak = m * (1 - e) * Math.min(42, 10 * s);
        dirX = Math.cos(a);
        dirY = Math.sin(a);
      }

      // Faint scatter by "Обо мне".
      if (e > 0) {
        x += (p.u * w - x) * e;
        y += (p.v * h - y) * e;
        size += (p.size - size) * e;
      }

      if (!still && m < 1) {
        x += Math.sin(drift + p.phase) * 1.5 * (1 - m);
        y += Math.cos(drift * 0.8 + p.phase) * 1.5 * (1 - m);
      }

      if (k < 0.2 && m === 0 && !still) {
        const dx = x - mouse.x, dy = y - mouse.y;
        const dm = Math.hypot(dx, dy);
        let tx = 0, ty = 0;
        if (dm < REPEL && dm > 0.1) {
          const f = (1 - dm / REPEL) * 40;
          tx = (dx / dm) * f;
          ty = (dy / dm) * f;
        }
        p.ox += (tx - p.ox) * 0.12;
        p.oy += (ty - p.oy) * 0.12;
      } else {
        p.ox *= 0.9;
        p.oy *= 0.9;
      }
      x += p.ox;
      y += p.oy;

      if (x < -4 || x > w + 4 || y < -4 || y > h + 4) continue;
      if (streak > 3 && bucket === 0 && !still) {
        streaks.push(x, y, x + dirX * streak, y + dirY * streak);
        continue;
      }
      const list = p.accent ? accent : bucket === 0 ? near : bucket === 1 ? mid : far;
      list.push(x, y, size);
    }

    const paint = (list, colour, alpha) => {
      ctx.globalAlpha = alpha;
      ctx.fillStyle = colour;
      for (let i = 0; i < list.length; i += 3) ctx.fillRect(list[i], list[i + 1], list[i + 2], list[i + 2]);
    };
    const fade = 1 - e * 0.6;
    paint(stars, 'rgb(255, 255, 255)', 0.45 * (1 - m * (1 - e)) + 0.001);
    // In flow mode the ring's last dust fades out as the stream fades in.
    const ringFade = 1;
    paint(flowBack, 'rgb(236, 233, 255)', 0.45 * fade);
    paint(flowDust, 'rgb(236, 233, 255)', 0.95 * fade);
    paint(flowAccent, 'rgb(214, 107, 208)', 0.95 * fade);
    paint(far, 'rgb(236, 233, 255)', 0.45 * fade * ringFade);
    paint(mid, 'rgb(236, 233, 255)', 0.75 * fade * ringFade);
    paint(near, 'rgb(236, 233, 255)', 0.85 * fade * ringFade);
    paint(accent, 'rgb(214, 107, 208)', 0.95 * fade * ringFade);

    marks.forEach((mk) => {
      if (mk.alpha <= 0.01) return;
      ctx.globalAlpha = mk.alpha * (mk.on ? 0.9 : 0.35);
      ctx.strokeStyle = 'rgb(214, 107, 208)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(mk.x, mk.y);
      ctx.lineTo(mk.lx, mk.ly);
      ctx.stroke();
      const r = mk.on ? 9 : 6;
      const g = ctx.createRadialGradient(mk.x, mk.y, 0, mk.x, mk.y, r * 2.4);
      g.addColorStop(0, 'rgba(214, 107, 208, 0.55)');
      g.addColorStop(1, 'rgba(214, 107, 208, 0)');
      ctx.globalAlpha = mk.alpha;
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(mk.x, mk.y, r * 2.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#f7d9f5';
      ctx.beginPath();
      ctx.arc(mk.x, mk.y, r / 2, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.globalAlpha = 1;
    if (streaks.length) {
      ctx.globalAlpha = 0.75;
      ctx.strokeStyle = 'rgb(236, 233, 255)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      for (let i = 0; i < streaks.length; i += 4) {
        ctx.moveTo(streaks[i], streaks[i + 1]);
        ctx.lineTo(streaks[i + 2], streaks[i + 3]);
      }
      ctx.stroke();
    }

    ctx.globalAlpha = 1;

    // Flight: each case comes out of the depth, reads at full size, and
    // flies past the viewer.
    if (flight) {
      // Until the stage pins, it is still sliding up from below; this holds
      // the cases at the centre of the screen meanwhile, so they only ever
      // come out of the depth and never ride up with the page.
      const lift = Math.max(0, tunnelEl.getBoundingClientRect().top);
      cards.forEach((card, i) => {
        const z = caseDepth(i) - cam;
        let op = 0, sc = 0.1;
        if (z > 40) {
          sc = FOCUS / z;
          // Hidden until the tunnel has fully formed, then grows from a speck.
          op = clamp01((sc - 0.1) / 0.55) * (1 - clamp01((sc - 1.3) / 0.6)) * clamp01((m - 0.85) / 0.15);
        }
        card.style.opacity = String(op);
        card.style.transform = `translate(-50%, calc(-50% - ${lift}px)) scale(${Math.min(sc, 4)})`;
        card.style.pointerEvents = op > 0.85 ? 'auto' : 'none';
        card.style.zIndex = String(100 - i);
      });
    }
  };

  const relayout = () => { layout(); buildPath(); };
  relayout();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(relayout);
  window.addEventListener('load', relayout);
  window.addEventListener('resize', relayout);

  if (still) {
    draw(0);
    window.addEventListener('scroll', () => requestAnimationFrame(() => draw(0)), { passive: true });
  } else {
    const loop = (time) => {
      draw(time);
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }
}

startSpace();

// Case pages and the 404 share the homepage's night sky: a still field of
// stars behind the text, drawn once (and again on resize), nothing moving
// while the case is being read.
if (!particleCanvas) {
  const sky = document.createElement('canvas');
  sky.className = 'sky';
  sky.setAttribute('aria-hidden', 'true');
  document.body.prepend(sky);
  const stars = Array.from({ length: 420 }, () => ({
    x: Math.random(), y: Math.random(), s: Math.random() < 0.85 ? 1 : 1.8, a: 0.2 + Math.random() * 0.5,
  }));
  const paintSky = () => {
    const w = window.innerWidth, h = window.innerHeight;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    sky.width = w * dpr;
    sky.height = h * dpr;
    const c = sky.getContext('2d');
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    c.fillStyle = '#ece9ff';
    stars.forEach((st) => {
      c.globalAlpha = st.a;
      c.fillRect(st.x * w, st.y * h, st.s, st.s);
    });
  };
  paintSky();
  window.addEventListener('resize', paintSky);
}
