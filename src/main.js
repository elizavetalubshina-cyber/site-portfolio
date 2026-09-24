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

// Hero covers react to the cursor, each in its own way, so the stage reads
// as five objects rather than one layer sliding about:
//   follow  - leans toward the cursor and tilts to face it
//   inverse - drifts the opposite way, as if further back
//   spin    - turns with the cursor's horizontal position
//   magnet  - pulled in when the cursor comes close
//   repel   - pushed away when the cursor comes close
// Every value eases toward its target each frame instead of snapping, which
// is what makes the motion feel weighted. Only on a real pointer with motion
// allowed: on touch the covers are a static strip (the 900px rule in style.css).
const heroStage = document.getElementById('heroStage');
const canDrift = window.matchMedia('(hover: hover) and (pointer: fine) and (min-width: 901px)');
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

if (heroStage) {
  const behaviours = {
    subtitles: 'follow',
    satellite: 'inverse',
    'design-system': 'spin',
    tracktice: 'magnet',
    ecosystem: 'repel',
  };
  const RADIUS = 340;
  const keys = ['tx', 'ty', 'rx', 'ry', 'rz', 's'];
  const rest = { tx: 0, ty: 0, rx: 0, ry: 0, rz: 0, s: 1 };

  const tiles = [...heroStage.querySelectorAll('.hero__tile')].map((el) => {
    const name = [...el.classList].find((c) => c.startsWith('hero__tile--')).slice('hero__tile--'.length);
    return { el, mode: behaviours[name] || 'follow', cx: 0, cy: 0, cur: { ...rest }, target: { ...rest } };
  });

  // Centres are measured without the transforms applied, relative to the
  // stage, so scrolling and the covers' own movement do not skew them.
  const measure = () => {
    tiles.forEach((t) => {
      t.cx = t.el.offsetLeft + t.el.offsetWidth / 2;
      t.cy = t.el.offsetTop + t.el.offsetHeight / 2;
    });
  };
  measure();
  window.addEventListener('resize', measure);

  let frame = 0;

  const setTargets = (px, py, nx, ny) => {
    tiles.forEach((t) => {
      const g = t.target;
      Object.assign(g, rest);
      const dx = px - t.cx;
      const dy = py - t.cy;
      const dist = Math.hypot(dx, dy) || 1;
      const near = Math.max(0, 1 - dist / RADIUS);
      switch (t.mode) {
        case 'follow':
          g.tx = nx * 44; g.ty = ny * 32; g.ry = nx * 14; g.rx = -ny * 10;
          break;
        case 'inverse':
          g.tx = -nx * 40; g.ty = -ny * 28;
          break;
        case 'spin':
          g.rz = nx * 14; g.ty = ny * 10;
          break;
        case 'magnet':
          g.tx = dx * 0.3 * near; g.ty = dy * 0.3 * near; g.s = 1 + 0.06 * near;
          break;
        case 'repel':
          g.tx = (-dx / dist) * 70 * near; g.ty = (-dy / dist) * 70 * near; g.rz = (dx / dist) * -8 * near;
          break;
      }
    });
  };

  const render = () => {
    let moving = false;
    tiles.forEach((t) => {
      keys.forEach((k) => {
        const d = t.target[k] - t.cur[k];
        t.cur[k] += d * 0.08;
        if (Math.abs(d) > 0.01) moving = true;
      });
      const c = t.cur;
      t.el.style.transform = `perspective(900px) translate3d(${c.tx}px, ${c.ty}px, 0) rotateX(${c.rx}deg) rotateY(${c.ry}deg) rotate(${c.rz}deg) scale(${c.s})`;
    });
    frame = moving ? requestAnimationFrame(render) : 0;
  };
  const kick = () => { if (!frame) frame = requestAnimationFrame(render); };

  window.addEventListener('pointermove', (e) => {
    if (!canDrift.matches || reducedMotion.matches) return;
    const box = heroStage.getBoundingClientRect();
    setTargets(
      e.clientX - box.left,
      e.clientY - box.top,
      (e.clientX / window.innerWidth) * 2 - 1,
      (e.clientY / window.innerHeight) * 2 - 1,
    );
    kick();
  }, { passive: true });

  // Cursor left the window: everything settles back to where it started.
  document.documentElement.addEventListener('mouseleave', () => {
    tiles.forEach((t) => Object.assign(t.target, rest));
    kick();
  });
}

// Particle field (desktop). One set of points with three shapes it can take:
//   ring    - an ellipse of dust around the name on the first screen
//   stream  - a band that narrows to the right, flowing past the cases
//   scatter - sparse dust over the whole screen by "Обо мне"
// Every point has a home in each shape; the scroll position picks the mix,
// so scrolling down pours the ring into the stream and then lets it settle.
// The cursor pushes points aside. Nothing runs on touch screens, narrow
// windows or with reduced motion asked for.
const particleCanvas = document.getElementById('particles');
const heroMarks = document.getElementById('heroMarks');
const wideScreen = window.matchMedia('(min-width: 901px) and (hover: hover) and (pointer: fine)');

if (particleCanvas && wideScreen.matches) {
  const ctx = particleCanvas.getContext('2d');
  const hero = document.querySelector('.home-page .hero');
  const head = document.querySelector('.home-page .hero__head');
  const about = document.getElementById('about');
  const still = reducedMotion.matches;

  const COUNT = 2400;
  const REPEL = 110;
  const gauss = () => (Math.random() + Math.random() + Math.random() - 1.5) / 1.5;

  // Per-point constants: which part of each shape it belongs to, its size,
  // its wobble. Shapes are rebuilt on resize from these, so a point keeps
  // its place in every shape across resizes.
  const pts = Array.from({ length: COUNT }, () => ({
    angle: Math.random() * Math.PI * 2,
    band: gauss(),
    inner: Math.random() < 0.18,
    star: Math.random() < 0.14,
    t: Math.pow(Math.random(), 0.75),
    u: Math.random(),
    v: Math.random(),
    size: Math.random() < 0.85 ? 1.2 : 2,
    accent: Math.random() < 0.06,
    phase: Math.random() * Math.PI * 2,
    ox: 0, oy: 0,
  }));

  let w = 0, h = 0, ring = { cx: 0, cy: 0, rx: 0, ry: 0 };
  let heroH = 1, aboutTop = 1;

  const layout = () => {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = window.innerWidth;
    h = window.innerHeight;
    particleCanvas.width = w * dpr;
    particleCanvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const box = head.getBoundingClientRect();
    ring = {
      cx: box.left + box.width / 2,
      cy: box.top + window.scrollY + box.height / 2,
      rx: Math.min(w * 0.3, h * 0.62),
      ry: Math.min(h * 0.4, w * 0.3),
    };
    heroH = hero.offsetHeight;
    aboutTop = about.getBoundingClientRect().top + window.scrollY;

    placeMarks();
  };

  // Case names sit on the ring, clear of the name band across the middle.
  const markAngles = { subtitles: 205, 'design-system': 262, satellite: 322, tracktice: 142, ecosystem: 38 };
  function placeMarks() {
    if (!heroMarks) return;
    const heroTop = hero.getBoundingClientRect().top + window.scrollY;
    heroMarks.querySelectorAll('.hero__mark').forEach((el) => {
      const a = (markAngles[el.dataset.mark] * Math.PI) / 180;
      const x = ring.cx + Math.cos(a) * ring.rx;
      const y = ring.cy - heroTop + Math.sin(a) * ring.ry;
      el.style.transform = `translate(${x}px, ${y}px) translate(-50%, -50%)`;
      el.classList.toggle('is-below', Math.sin(a) > 0);
    });
    heroMarks.classList.add('is-ready');
  }

  const mouse = { x: -9999, y: -9999 };
  window.addEventListener('pointermove', (e) => { mouse.x = e.clientX; mouse.y = e.clientY; }, { passive: true });
  document.documentElement.addEventListener('mouseleave', () => { mouse.x = -9999; mouse.y = -9999; });

  const clamp01 = (n) => Math.min(1, Math.max(0, n));
  const ease = (n) => n * n * (3 - 2 * n);

  const draw = (time) => {
    const sy = window.scrollY;
    // 0 -> 1 while the hero scrolls away; 0 -> 1 as "Обо мне" comes up.
    const toStream = ease(clamp01(sy / (heroH * 0.85)));
    const toScatter = ease(clamp01((sy - (aboutTop - h)) / (h * 0.8)));
    const spin = still ? 0 : time * 0.00004;
    const drift = still ? 0 : time * 0.001;

    if (heroMarks) heroMarks.style.setProperty('--fade', String(1 - clamp01(toStream * 3)));

    ctx.clearRect(0, 0, w, h);
    // Settled into dust behind "Обо мне", the field fades well back so it
    // never competes with the text it sits under.
    ctx.globalAlpha = 1 - toScatter * 0.7;
    const accent = [];
    ctx.fillStyle = 'rgba(18, 20, 26, 0.55)';

    for (const p of pts) {
      // Ring: on the ellipse, a few inside it, some loose stars around.
      let rxp, ryp;
      if (p.star) {
        rxp = p.u * w;
        ryp = p.v * h - sy * 0.3;
      } else {
        const r = p.inner ? Math.sqrt(p.u) * 0.85 : 1 + p.band * 0.09;
        const a = p.angle + spin;
        rxp = ring.cx + Math.cos(a) * ring.rx * r;
        // The ring "dives": it sinks with the page as the hero leaves.
        ryp = ring.cy - sy * 0.55 + Math.sin(a) * ring.ry * r;
      }

      // Stream: wide cloud on the left narrowing into a band on the right.
      const spread = Math.pow(1 - p.t, 1.3) * h * 0.42 + h * 0.025;
      const sxp = -w * 0.05 + p.t * w * 1.12;
      const syp = h * 0.55 + p.band * spread + Math.sin(p.t * 6 + drift) * h * 0.04;

      // Scatter: loose even dust.
      const cxp = p.u * w;
      const cyp = p.v * h;

      let x = rxp + (sxp - rxp) * toStream;
      let y = ryp + (syp - ryp) * toStream;
      x += (cxp - x) * toScatter;
      y += (cyp - y) * toScatter;

      if (!still) {
        x += Math.sin(drift + p.phase) * 2;
        y += Math.cos(drift * 0.8 + p.phase) * 2;
      }

      // Cursor push, eased so the dust closes back in softly.
      const dx = x - mouse.x;
      const dy = y - mouse.y;
      const d = Math.hypot(dx, dy);
      let tx = 0, ty = 0;
      if (d < REPEL && d > 0.1 && !still) {
        const f = (1 - d / REPEL) * 42;
        tx = (dx / d) * f;
        ty = (dy / d) * f;
      }
      p.ox += (tx - p.ox) * 0.12;
      p.oy += (ty - p.oy) * 0.12;
      x += p.ox;
      y += p.oy;

      if (x < -4 || x > w + 4 || y < -4 || y > h + 4) continue;
      if (p.accent) accent.push(x, y, p.size);
      else ctx.fillRect(x, y, p.size, p.size);
    }

    ctx.fillStyle = 'rgba(172, 33, 162, 0.8)';
    for (let i = 0; i < accent.length; i += 3) ctx.fillRect(accent[i], accent[i + 1], accent[i + 2] + 0.6, accent[i + 2] + 0.6);
  };

  layout();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(layout);
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
