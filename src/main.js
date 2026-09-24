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
