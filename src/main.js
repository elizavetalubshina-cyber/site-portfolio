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
//      orbiting in it;
//   2. scrolling while the hero is pinned turns the ring into a black hole:
//      it spins faster, the dark centre grows, the name is pulled in, and the
//      screen goes black;
//   3. out of the dark comes a stream that runs down the page through each
//      case cover in turn, so the particles lead from one case to the next;
//   4. by "Обо мне" the dust settles into a faint scatter.
// Stars sit behind all of it. The cursor pushes the dust aside. Only on
// windows wider than the phone layout; with reduced motion it holds still.
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const particleCanvas = document.getElementById('particles');
const wideScreen = window.matchMedia('(min-width: 901px)');

const journeyCases = document.querySelectorAll('.journey__case');
if (journeyCases.length && 'IntersectionObserver' in window) {
  const reveal = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        reveal.unobserve(entry.target);
      }
    });
  }, { threshold: 0.25 });
  journeyCases.forEach((el) => reveal.observe(el));
} else {
  journeyCases.forEach((el) => el.classList.add('is-visible'));
}

if (particleCanvas && wideScreen.matches) {
  const ctx = particleCanvas.getContext('2d');
  const intro = document.getElementById('intro');
  const hero = document.querySelector('.home-page .hero');
  const head = document.querySelector('.home-page .hero__head');
  const orbit = document.getElementById('heroOrbit');
  const tags = orbit ? [...orbit.children] : [];
  const journey = document.getElementById('journey');
  const covers = journey ? [...journey.querySelectorAll('.journey__cover')] : [];
  const about = document.getElementById('about');
  const still = reducedMotion.matches;

  const COUNT = 4200;
  const REPEL = 110;
  const STREAM_WIDTH = 85;
  const gauss = () => (Math.random() + Math.random() + Math.random() - 1.5) / 1.5;
  const clamp01 = (n) => Math.min(1, Math.max(0, n));
  const ease = (n) => n * n * (3 - 2 * n);

  const pts = Array.from({ length: COUNT }, () => ({
    a: Math.random() * Math.PI * 2,
    band: gauss(),
    inner: Math.random() < 0.16,
    star: Math.random() < 0.1,
    fall: 0.5 + Math.random(),
    s: Math.random(),
    speed: 0.000012 + Math.random() * 0.00002,
    u: Math.random(),
    v: Math.random(),
    size: Math.random() < 0.8 ? 1.4 : 2.2,
    accent: Math.random() < 0.07,
    phase: Math.random() * Math.PI * 2,
    ox: 0,
    oy: 0,
  }));

  let w = 0, h = 0, diag = 0;
  let introTop = 0, introH = 1, aboutTop = 1;
  let path = { x: [], y: [], len: [], total: 1 };

  // The stream's course: from just above the cases, through the centre of
  // every cover, and on past the last one. A Catmull-Rom curve through
  // those points, sampled densely with the running length at each sample.
  const buildPath = () => {
    if (!journey || !covers.length) return;
    const top = journey.getBoundingClientRect().top + window.scrollY;
    const bottom = top + journey.offsetHeight;
    const pts2 = [{ x: w / 2, y: top - h * 1.8 }, { x: w / 2, y: top - h * 0.1 }];
    covers.forEach((c) => {
      const r = c.getBoundingClientRect();
      pts2.push({ x: r.left + r.width / 2, y: r.top + window.scrollY + r.height / 2 });
    });
    pts2.push({ x: w / 2, y: bottom + h * 0.2 }, { x: w / 2, y: bottom + h * 0.8 });

    const x = [], y = [], len = [];
    let total = 0;
    for (let i = 0; i < pts2.length - 1; i++) {
      const p0 = pts2[Math.max(0, i - 1)], p1 = pts2[i], p2 = pts2[i + 1], p3 = pts2[Math.min(pts2.length - 1, i + 2)];
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

  // Point on the stream at a given distance along it, plus the unit normal
  // there, so a particle can sit to one side of the centre line.
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

  const layout = () => {
    w = window.innerWidth;
    h = window.innerHeight;
    diag = Math.hypot(w, h);
    // Safari gives up on canvases past ~16.7M pixels and draws nothing.
    const dpr = Math.min(window.devicePixelRatio || 1, 2, Math.sqrt(12e6 / (w * h)));
    particleCanvas.width = w * dpr;
    particleCanvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    introTop = intro.getBoundingClientRect().top + window.scrollY;
    introH = intro.offsetHeight;
    aboutTop = about.getBoundingClientRect().top + window.scrollY;
    buildPath();
  };

  const mouse = { x: -9999, y: -9999 };
  window.addEventListener('pointermove', (e) => { mouse.x = e.clientX; mouse.y = e.clientY; }, { passive: true });
  document.documentElement.addEventListener('mouseleave', () => { mouse.x = -9999; mouse.y = -9999; });

  let last = 0;
  let spin = 0;
  // While a topic is hovered the orbit eases to a stop, so the tag and its
  // preview hold still under the cursor.
  let hovering = false;
  let pace = 1;
  tags.forEach((tag) => {
    tag.addEventListener('pointerenter', () => { hovering = true; });
    tag.addEventListener('pointerleave', () => { hovering = false; });
  });

  const draw = (time) => {
    const dt = still ? 0 : Math.min(50, time - last || 16);
    last = time;
    const sy = window.scrollY;

    // k: how far into the fall, 0 at rest, 1 when the screen has gone black.
    const k = ease(clamp01((sy - introTop) / (introH - h)));
    // j: the stream taking over as the pinned hero lets go.
    const j = ease(clamp01((sy - (introTop + introH - h * 1.45)) / (h * 0.75)));
    const settle = ease(clamp01((sy - (aboutTop - h)) / (h * 0.8)));

    pace += ((hovering && k === 0 ? 0 : 1) - pace) * 0.12;
    const spinSpeed = (0.00006 + k * k * 0.0016) * pace;
    spin += dt * spinSpeed;

    const hb = head.getBoundingClientRect();
    const cx = hb.left + hb.width / 2;
    const cy = hb.top + hb.height / 2;
    // A circle at any window shape: one radius for both axes.
    const rx = Math.min(w * 0.3, h * 0.42);
    const ry = rx;
    const grow = 1 + 2.4 * k * k;
    const flat = 1;
    const holeR = Math.pow(k, 2.2) * diag * 0.75;

    // The name is pulled into the centre, turning as it goes.
    head.style.transform = k > 0 ? `scale(${1 - 0.92 * k}) rotate(${-30 * k}deg)` : '';
    head.style.opacity = String(1 - clamp01(k * 1.3));

    // Topics ride the ring, outside the name.
    if (tags.length) {
      const hr = hero.getBoundingClientRect();
      tags.forEach((tag, i) => {
        const a = (i / tags.length) * Math.PI * 2 + spin * 0.9 + 0.35;
        const x = cx + Math.cos(a) * rx * 1.04 * grow;
        const oy = Math.sin(a) * ry * 1.04 * grow * flat;
        tag.style.transform = `translate(${x - hr.left}px, ${cy + oy - hr.top}px) translate(-50%, -50%)`;
        const shown = 1 - clamp01(k * 1.6);
        tag.style.opacity = String(shown);
        tag.style.pointerEvents = shown > 0.4 ? 'auto' : 'none';
        // Preview opens toward the room: down from tags in the upper half,
        // up from tags in the lower half, so it never leaves the screen.
        tag.classList.toggle('is-below', cy + oy < h / 2);
      });
    }

    ctx.clearRect(0, 0, w, h);
    const drift = still ? 0 : time * 0.001;
    const stars = [];
    const accent = [];
    ctx.globalAlpha = 1 - settle * 0.6;
    ctx.fillStyle = 'rgba(236, 233, 255, 0.78)';

    for (const p of pts) {
      if (p.star) {
        const y = (((p.v * h * 1.4 - sy * 0.06) % h) + h) % h;
        stars.push(p.u * w, y, p.size * 0.8);
        continue;
      }

      // Ring, spinning faster and falling inward as k grows.
      p.a += dt * spinSpeed * (1 + p.fall * k * 2.5);
      const r0 = p.inner ? Math.sqrt(p.u) * 0.85 : 1 + p.band * 0.09;
      const r = r0 * grow * (1 - k * 0.35 * p.fall);
      let x = cx + Math.cos(p.a) * rx * r;
      let y = cy + Math.sin(p.a) * ry * r * flat;

      // Stream through the cases.
      if (j > 0) {
        const d = (((p.s + (still ? 0 : time * p.speed)) % 1) * path.total);
        const q = onPath(d);
        const wobble = Math.sin(d * 0.01 + drift + p.phase) * 10;
        const sx = q.x + q.nx * (p.band * STREAM_WIDTH + wobble);
        const syy = q.y + q.ny * (p.band * STREAM_WIDTH + wobble) - sy;
        x += (sx - x) * j;
        y += (syy - y) * j;
      }

      // Faint scatter by "Обо мне".
      if (settle > 0) {
        x += (p.u * w - x) * settle;
        y += (p.v * h - y) * settle;
      }

      if (!still) {
        x += Math.sin(drift + p.phase) * 1.5;
        y += Math.cos(drift * 0.8 + p.phase) * 1.5;
      }

      const dx = x - mouse.x, dy = y - mouse.y;
      const dm = Math.hypot(dx, dy);
      let tx = 0, ty = 0;
      if (dm < REPEL && dm > 0.1 && !still) {
        const f = (1 - dm / REPEL) * 40;
        tx = (dx / dm) * f;
        ty = (dy / dm) * f;
      }
      p.ox += (tx - p.ox) * 0.12;
      p.oy += (ty - p.oy) * 0.12;
      x += p.ox;
      y += p.oy;

      if (x < -4 || x > w + 4 || y < -4 || y > h + 4) continue;
      if (p.accent) accent.push(x, y, p.size + 0.6);
      else ctx.fillRect(x, y, p.size, p.size);
    }

    ctx.fillStyle = 'rgba(214, 107, 208, 0.95)';
    for (let i = 0; i < accent.length; i += 3) ctx.fillRect(accent[i], accent[i + 1], accent[i + 2], accent[i + 2]);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
    for (let i = 0; i < stars.length; i += 3) ctx.fillRect(stars[i], stars[i + 1], stars[i + 2], stars[i + 2]);

    // The hole: a disc of night with a thin glowing rim, drawn over the dust
    // it swallows. It fades once the stream has taken over.
    const holeAlpha = 1 - j;
    if (holeR > 2 && holeAlpha > 0) {
      ctx.globalAlpha = holeAlpha;
      const g = ctx.createRadialGradient(cx, cy, holeR * 0.7, cx, cy, holeR * 1.12);
      g.addColorStop(0, 'rgba(7, 7, 11, 1)');
      g.addColorStop(0.72, 'rgba(7, 7, 11, 1)');
      g.addColorStop(0.8, 'rgba(214, 107, 208, 0.55)');
      g.addColorStop(0.86, 'rgba(236, 233, 255, 0.25)');
      g.addColorStop(1, 'rgba(7, 7, 11, 0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(cx, cy, holeR * 1.12, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
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
