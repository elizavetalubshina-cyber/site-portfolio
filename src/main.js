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
// Stars sit behind it all; the cursor pushes the ring's dust aside. Only on
// windows wider than the phone layout; with reduced motion it holds still.
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const particleCanvas = document.getElementById('particles');
const wideScreen = window.matchMedia('(min-width: 901px)');
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

// Started the first time the window is wide enough, not only at load: an
// embedded preview can load while its panel is still narrow or hidden and
// only widen afterwards, and the field has to come up when it does.
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

  const COUNT = 7500;
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
    w = window.innerWidth;
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
    const seg = p * cards.length;
    const i = Math.min(cards.length - 1, Math.floor(seg));
    const u = seg - i;
    return SPACING * (i + u + 0.15 * Math.sin(2 * Math.PI * u));
  };
  const caseDepth = (i) => SPACING * (i + 0.5) + FOCUS;

  let last = 0;
  let spin = 0;
  let flow = 0;

  const draw = (time) => {
    const dt = still ? 0 : Math.min(50, time - last || 16);
    last = time;
    const sy = window.scrollY;

    // k: the suction, 0 at rest, 1 when everything has gone into the point.
    const k = ease(clamp01((sy - introTop) / (introH - h)));
    // m: the point bursting into the tunnel walls.
    const m = ease(clamp01((sy - (tunnelTop - h * 0.9)) / (h * 0.8)));
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
    const R = Math.min(w * 0.3, h * 0.42);
    const pull = Math.pow(1 - k, 0.9);

    // The name shrinks into the point and fades, without turning.
    head.style.transform = k > 0 ? `scale(${Math.max(0.02, 1 - k)})` : '';
    head.style.opacity = String(1 - clamp01(k * 1.25));

    if (tags.length) {
      const hr = hero.getBoundingClientRect();
      tags.forEach((tag, i) => {
        const a = (i / tags.length) * Math.PI * 2 + spin * 0.9 + 0.35;
        const x = cx + Math.cos(a) * R * 1.04 * pull;
        const oy = Math.sin(a) * R * 1.04 * pull;
        tag.style.transform = `translate(${x - hr.left}px, ${cy + oy - hr.top}px) translate(-50%, -50%)`;
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
    const trail = still ? 0 : Math.max(k * (1 - m), m * (1 - e)) * 0.55;
    if (trail > 0.02) {
      ctx.globalAlpha = 1;
      ctx.fillStyle = `rgba(${BG}, ${1 - trail})`;
      ctx.fillRect(0, 0, w, h);
    } else {
      ctx.clearRect(0, 0, w, h);
    }

    const drift = still ? 0 : time * 0.001;
    const near = [], mid = [], far = [], accent = [], stars = [], streaks = [];
    const tcx = w / 2, tcy = h / 2;
    const halfDiag = Math.hypot(w, h) / 2 + 20;
    const wall = Math.max(w, h) * 0.55;
    // Vortex: the walls wind into a spiral down the tunnel and keep turning.
    const twist = cam * 0.0006 + (still ? 0 : time * 0.00035);

    for (const p of pts) {
      if (p.star) {
        // A whirlpool rather than a squeeze: stars turn round the centre,
        // those near it turning and sinking more, those at the rim barely,
        // so the edges of the screen stay full.
        const rn = p.sr;
        const swirl = k * k * (1.4 / (rn + 0.25));
        const rr = rn * halfDiag * (1 - 0.45 * k * k * (1 - rn));
        const a = p.sa + swirl + (still ? 0 : time * 0.000004);
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

      // Tunnel walls: a cylinder seen from inside, drawn in perspective.
      if (m > 0) {
        const z = ((((p.tz - cam - flow) % DEPTH) + DEPTH) % DEPTH) + 40;
        const s = FOCUS / z;
        const a = p.ta + twist + z * 0.0011;
        const txp = tcx + Math.cos(a) * wall * p.tr * s;
        const typ = tcy + Math.sin(a) * wall * p.tr * s;
        x += (txp - x) * m;
        y += (typ - y) * m;
        size = p.size * (1 - m) + Math.min(3.2, Math.max(0.7, 1.3 * s)) * m;
        bucket = z < DEPTH * 0.25 ? 0 : z < DEPTH * 0.6 ? 1 : 2;
        // Near the viewer the dust is drawn as short streaks pointing away
        // from the centre, the way things smear past at speed.
        streak = m * (1 - e) * Math.min(42, 10 * s);
        // Streaks follow the spiral: part outward, mostly round.
        dirX = Math.cos(a + 1.1);
        dirY = Math.sin(a + 1.1);
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
    paint(far, 'rgb(236, 233, 255)', 0.45 * fade);
    paint(mid, 'rgb(236, 233, 255)', 0.75 * fade);
    paint(near, 'rgb(236, 233, 255)', 0.85 * fade);
    paint(accent, 'rgb(214, 107, 208)', 0.95 * fade);
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

    // The point everything falls into: a small hot core that swells as the
    // dust piles in and is gone once the tunnel opens.
    const core = k * (1 - m);
    if (core > 0.01) {
      const cr = 8 + 70 * core;
      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, cr);
      g.addColorStop(0, 'rgba(255, 255, 255, 0.9)');
      g.addColorStop(0.25, 'rgba(236, 200, 255, 0.55)');
      g.addColorStop(0.6, 'rgba(214, 107, 208, 0.25)');
      g.addColorStop(1, 'rgba(214, 107, 208, 0)');
      ctx.globalAlpha = core;
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(cx, cy, cr, 0, Math.PI * 2);
      ctx.fill();
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
          op = clamp01((sc - 0.4) / 0.35) * (1 - clamp01((sc - 1.3) / 0.6)) * m;
        }
        card.style.opacity = String(op);
        card.style.transform = `translate(-50%, calc(-50% - ${lift}px)) scale(${Math.min(sc, 4)})`;
        card.style.pointerEvents = op > 0.85 ? 'auto' : 'none';
        card.style.zIndex = String(100 - i);
      });
    }
  };

  layout();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(layout);
  window.addEventListener('load', layout);
  window.addEventListener('resize', layout);

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

if (wideScreen.matches) {
  startSpace();
} else {
  wideScreen.addEventListener('change', (e) => { if (e.matches) startSpace(); });
}
