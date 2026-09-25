// Case links opened from script carry the same origin mark as clicked
// links (see markCaseUrl at the end of this file).
const withFrom = (href) => markCaseUrl(href);

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
    // On the homepage the cases are handled by the tunnel (startSpace).
    if (id === '#cases' && window.spaceFlight) return;
    const target = document.querySelector(id);
    if (!target) return;
    e.preventDefault();
    // The homepage hero is pinned inside the fall animation, so its own
    // position is wherever the fall has got to; the top means the page top.
    if (id === '#top') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    // "Обо мне" and its contacts only show once grown in; land past that.
    const outro = document.getElementById('outro');
    if (outro && (id === '#about' || id === '#contacts') && getComputedStyle(document.getElementById('about')).position === 'sticky') {
      let top = 0;
      for (let el = outro; el; el = el.offsetParent) top += el.offsetTop;
      const held = parseFloat(getComputedStyle(document.getElementById('about')).top) || 96;
      window.scrollTo({ top: top - held + window.innerHeight * 0.22, behavior: 'smooth' });
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

// Email: a click copies the address and says so in a notice at the bottom,
// rather than opening a mail app the visitor may not use. If copying is
// not possible, the link works as an ordinary mailto.
const toast = document.getElementById('toast');
let toastTimer = 0;
const showToast = (text) => {
  if (!toast) return;
  toast.textContent = text;
  toast.classList.add('is-shown');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('is-shown'), 2200);
};
const copyText = async (text) => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (e) {
    // Older browsers and some embedded views: the pre-Clipboard-API way.
    const area = document.createElement('textarea');
    area.value = text;
    area.setAttribute('readonly', '');
    area.style.position = 'fixed';
    area.style.opacity = '0';
    document.body.appendChild(area);
    area.select();
    let ok = false;
    try { ok = document.execCommand('copy'); } catch (err) { ok = false; }
    area.remove();
    return ok;
  }
};
if (toast) {
  document.querySelectorAll('a[href^="mailto:"]').forEach((link) => {
    link.addEventListener('click', async (ev) => {
      ev.preventDefault();
      const address = link.getAttribute('href').slice(7).split('?')[0];
      if (await copyText(address)) showToast('Почта скопирована');
      else window.location.href = link.href;
    });
  });
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
//   3. out of that point the dust opens into the walls of a tunnel; the
//      stage is pinned and the scroll flies down it, each case coming up
//      out of its depth, pausing to be read, then passing by;
//   4. out of the tunnel's mouth "Обо мне" grows in the same way.
// Stars sit behind it all; the cursor pushes the ring's dust aside. On
// every screen size; with reduced motion it holds still.
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const particleCanvas = document.getElementById('particles');
const narrowScreen = window.matchMedia('(max-width: 900px)');
const tunnelEl = document.getElementById('tunnel');
const flight = !!tunnelEl && tunnelEl.classList.contains('tunnel--flight');
// The second way to show the cases: they scroll by as a list and a stream
// of dust winds down through them. Switched on in index.html instead of
// the flight.
const flowMode = !!tunnelEl && tunnelEl.classList.contains('tunnel--flow');
const flowCases = flowMode ? tunnelEl.querySelectorAll('.tunnel__case') : [];
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
  if (spaceStarted || !particleCanvas || !(flight || flowMode)) return;
  spaceStarted = true;
  // Tells the fallback in index.html the animated layout is running.
  window.spaceStarted = true;
  window.spaceFlight = flight;

  const ctx = particleCanvas.getContext('2d');
  const intro = document.getElementById('intro');
  const hero = document.querySelector('.home-page .hero');
  const head = document.querySelector('.home-page .hero__head');
  const orbit = document.getElementById('heroOrbit');
  const tags = orbit ? [...orbit.children] : [];
  const cards = tunnelEl ? [...tunnelEl.querySelectorAll('.tunnel__case')] : [];
  const about = document.getElementById('about');
  const footer = document.querySelector('.home-page .footer');
  const still = reducedMotion.matches;

  // Fewer particles on a phone: the screen is smaller and so is the budget.
  // The flow spreads its dust along the whole page, so it needs more of it
  // to read as one dense stream.
  const COUNT = flowMode
    ? (narrowScreen.matches ? 9000 : 16000)
    : (narrowScreen.matches ? 5000 : 9000);
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
  let introTop = 0, introH = 1, tunnelTop = 0, tunnelH = 1, aboutTop = 1, aboutHeld = 96;

  const layout = () => {
    // clientWidth, not innerWidth: on a phone anything poking past the edge
    // widens innerWidth and would push the ring off centre.
    w = document.documentElement.clientWidth;
    h = window.innerHeight;
    // "Обо мне" is held in the middle of the room between the nav and the
    // bottom of the screen while it grows in, and stays there to the end of the page. If
    // it is taller than that room it is held just under the nav instead.
    // The empty room after it is exactly what the end of the page needs to
    // keep it there, plus the scroll the grow-in takes (0.2 of a screen).
    // When it is too tall to be held whole, only a small margin follows
    // it, so the page ends just under the contacts.
    const outroRoom = document.querySelector('.outro__room');
    if (flight && about && outroRoom) {
      const navB = document.querySelector('.nav__shell').getBoundingClientRect().bottom;
      // Room kept under it at the bottom of the screen (and under the
      // footer, where a page shows one).
      const footH = (footer ? footer.offsetHeight : 0) + 32;
      const aboutH = about.offsetHeight;
      const held = Math.round(Math.max(navB + 16, navB + (h - footH - navB - aboutH) / 2));
      document.body.style.setProperty('--about-top', `${held}px`);
      const fits = h - footH - held - aboutH >= 0;
      outroRoom.style.height = `${Math.round(fits ? h - footH - held - aboutH + h * 0.2 : 32)}px`;
    }
    // Safari gives up on canvases past ~16.7M pixels and draws nothing.
    const dpr = Math.min(window.devicePixelRatio || 1, 2, Math.sqrt(12e6 / Math.max(1, w * h)));
    particleCanvas.width = w * dpr;
    particleCanvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    introTop = intro.getBoundingClientRect().top + window.scrollY;
    introH = intro.offsetHeight;
    tunnelTop = tunnelEl.getBoundingClientRect().top + window.scrollY;
    tunnelH = tunnelEl.offsetHeight;
    // Measured without the grow-in transform "Обо мне" carries, which would
    // otherwise shift its box and skew every position derived from it.
    // The outro wrapper, not the section: the section is sticky, and its
    // box moves while it is held.
    let top = 0;
    for (let el = document.getElementById('outro') || about; el; el = el.offsetParent) top += el.offsetTop;
    aboutTop = top;
    // How far below the screen's top "Обо мне" is held (sticky, style.css).
    aboutHeld = about ? parseFloat(getComputedStyle(about).top) || 96 : 96;
  };

  // The cursor, or a finger while it is on the glass, pushes the dust aside.
  // `on` is what the pointer asks for and `force` eases after it, so the
  // dust parts and closes again softly instead of snapping. The position is
  // kept after a finger lifts, so the dent heals in place rather than
  // sliding off.
  const mouse = { x: -9999, y: -9999, on: 0, force: 0 };
  const aim = (e) => { mouse.x = e.clientX; mouse.y = e.clientY; mouse.on = 1; };
  window.addEventListener('pointermove', aim, { passive: true });
  window.addEventListener('pointerdown', aim, { passive: true });
  const release = (e) => { if (e.pointerType !== 'mouse') mouse.on = 0; };
  window.addEventListener('pointerup', release, { passive: true });
  window.addEventListener('pointercancel', release, { passive: true });
  document.documentElement.addEventListener('mouseleave', () => { mouse.on = 0; });

  // While a topic is hovered the orbit eases to a stop, so the tag and its
  // preview hold still under the cursor.
  let hovering = false;
  let pace = 1;

  // The project points on the ring are links too: a tap or click near one
  // opens its case. On a phone its name fades out while it passes the name,
  // so the point is then the only way in.
  let lastMarks = [];
  let hotPoint = -1;
  const HIT = 24;
  const pointAt = (x, y) => {
    let best = -1, bestD = HIT;
    lastMarks.forEach((mk, i) => {
      if (mk.alpha < 0.4) return;
      const d = Math.hypot(mk.x - x, mk.y - y);
      if (d < bestD) { bestD = d; best = i; }
    });
    return best;
  };
  // Phone: a tap on a project, name or point, opens a preview card with a
  // button into the case, instead of leaving the page at once.
  const sheet = document.getElementById('caseSheet');
  let sheetOpen = false;
  const sheetCard = sheet ? sheet.querySelector('.case-sheet__card') : null;
  const sheetBackdrop = sheet ? sheet.querySelector('.case-sheet__backdrop') : null;
  const openSheet = (tag) => {
    if (!sheet) { window.location.href = withFrom(tag.href); return; }
    const img = tag.querySelector('img');
    sheet.querySelector('.case-sheet__img').src = img.currentSrc || img.src;
    sheet.querySelector('.case-sheet__title').textContent = tag.querySelector('.hero__orbit-title').textContent;
    sheet.querySelector('.case-sheet__desc').textContent = tag.querySelector('.hero__orbit-desc').textContent;
    sheet.querySelector('.case-sheet__go').href = tag.href;
    // Tag chips and company, taken from the same case in the tunnel below.
    const same = [...document.querySelectorAll('.tunnel__case')]
      .find((c) => c.querySelector('.tunnel__title a').href === tag.href);
    const tagsEl = same && same.querySelector('.tunnel__tags');
    const companyEl = same && same.querySelector('.tunnel__company');
    sheet.querySelector('.case-sheet__tags').innerHTML = tagsEl ? tagsEl.innerHTML : '';
    sheet.querySelector('.case-sheet__company').textContent = companyEl ? companyEl.textContent : '';
    sheet.hidden = false;
    document.documentElement.classList.add('sheet-lock');
    sheetOpen = true;
    // Next frame, so the slide up from the bottom edge actually plays.
    requestAnimationFrame(() => requestAnimationFrame(() => sheet.classList.add('is-open')));
  };
  const closeSheet = () => {
    if (!sheet || !sheetOpen) return;
    sheetOpen = false;
    sheet.classList.remove('is-open', 'is-dragging');
    sheetCard.style.transform = '';
    sheetBackdrop.style.opacity = '';
    document.documentElement.classList.remove('sheet-lock');
    const done = () => { if (!sheetOpen) sheet.hidden = true; };
    if (reducedMotion.matches) done();
    else sheetCard.addEventListener('transitionend', done, { once: true });
  };
  if (sheet) {
    sheet.querySelectorAll('[data-close]').forEach((b) => b.addEventListener('click', closeSheet));
    document.addEventListener('keydown', (ev) => { if (ev.key === 'Escape' && sheetOpen) closeSheet(); });

    // Swipe down to dismiss: the card follows the finger, and past a third of
    // its height or on a quick flick it closes, otherwise it springs back.
    let startY = 0, lastY = 0, lastT = 0, speed = 0, dragging = false;
    sheetCard.addEventListener('touchstart', (ev) => {
      if (sheetCard.scrollTop > 0) return;
      dragging = true;
      startY = lastY = ev.touches[0].clientY;
      lastT = performance.now();
      speed = 0;
      sheet.classList.add('is-dragging');
    }, { passive: true });
    sheetCard.addEventListener('touchmove', (ev) => {
      if (!dragging) return;
      const y = ev.touches[0].clientY;
      const now = performance.now();
      speed = (y - lastY) / Math.max(1, now - lastT);
      lastY = y;
      lastT = now;
      const dy = Math.max(0, y - startY);
      sheetCard.style.transform = `translateY(${dy}px)`;
      sheetBackdrop.style.opacity = String(1 - Math.min(1, dy / sheetCard.offsetHeight));
    }, { passive: true });
    const endDrag = () => {
      if (!dragging) return;
      dragging = false;
      const dy = Math.max(0, lastY - startY);
      sheet.classList.remove('is-dragging');
      if (dy > sheetCard.offsetHeight / 3 || speed > 0.6) {
        closeSheet();
      } else {
        sheetCard.style.transform = '';
        sheetBackdrop.style.opacity = '';
      }
    };
    sheetCard.addEventListener('touchend', endDrag);
    sheetCard.addEventListener('touchcancel', endDrag);
  }
  tags.forEach((tag) => {
    tag.addEventListener('click', (ev) => {
      if (!narrowScreen.matches) return;
      ev.preventDefault();
      openSheet(tag);
    });
  });
  document.addEventListener('click', (ev) => {
    if (ev.target.closest('a, button')) return;
    const i = pointAt(ev.clientX, ev.clientY);
    if (i < 0) return;
    if (narrowScreen.matches) openSheet(tags[i]);
    else window.location.href = withFrom(lastMarks[i].href);
  });
  window.addEventListener('pointermove', (ev) => {
    if (ev.pointerType !== 'mouse') return;
    const i = pointAt(ev.clientX, ev.clientY);
    if (i !== hotPoint) {
      hotPoint = i;
      document.body.style.cursor = i >= 0 ? 'pointer' : '';
      hovering = i >= 0;
    }
  }, { passive: true });
  tags.forEach((tag) => {
    tag.addEventListener('pointerenter', () => { hovering = true; });
    tag.addEventListener('pointerleave', () => { hovering = false; });
  });

  // Flight: scroll through the tunnel maps to camera depth. Each case gets one
  // screen of scroll, and within it the camera slows almost to a stop at the
  // point where the case is at full size, so there is time to read it.
  // A short run-up before the first case, so it starts far down the
  // tunnel, a speck inside the ring, rather than already half grown.
  const LEAD = 0.7;
  const cameraAt = (p) => {
    const seg = p * (cards.length + LEAD) - LEAD;
    if (seg < 0) return SPACING * seg;
    const i = Math.min(cards.length - 1, Math.floor(seg));
    const u = seg - i;
    return SPACING * (i + u + 0.15 * Math.sin(2 * Math.PI * u));
  };
  const caseDepth = (i) => SPACING * (i + 0.5) + FOCUS;

  // Where on the page the tunnel opens, where it ends, and the stretch of
  // scroll that flies down it.
  const marks0 = () => {
    const mStart = introTop + (introH - h) * 0.5;
    const tunnelEnd = tunnelTop + tunnelH;
    const from = mStart + h * 0.25;
    return { mStart, tunnelEnd, from, span: tunnelEnd - h * 0.8 - from };
  };
  const depthAt = (sy) => {
    const { from, span } = marks0();
    return clamp01((sy - from) / span);
  };
  // The scroll position at which case i is at full size, in the middle of
  // its pause (cameraAt's slow point).
  const scrollForCase = (i) => {
    const { from, span } = marks0();
    return Math.round(from + span * ((i + 0.5 + LEAD) / (cards.length + LEAD)));
  };
  // Keyboard: the cases are only visible while the camera is at them, so a
  // link inside one that takes focus flies the camera there first.
  if (flight) cards.forEach((card, i) => {
    card.addEventListener('focusin', () => {
      window.scrollTo({ top: scrollForCase(i), left: 0, behavior: 'instant' });
    });
  });
  // "Кейсы" in the menu and the hint under the name go to the first case
  // at full size, not to the top of the tunnel block, where nothing is
  // on screen yet.
  if (flight) document.querySelectorAll('a[href="#cases"]').forEach((link) => {
    link.addEventListener('click', (ev) => {
      ev.preventDefault();
      window.scrollTo({ top: scrollForCase(0), behavior: 'smooth' });
    });
  });

  // Flow: the stream's course in page coordinates. It comes in from above
  // the screen, then runs down through the middle of every case cover and on past
  // the last one. A Catmull-Rom curve through those points, sampled with
  // the running length at each sample.
  let path = { x: [], y: [], len: [], total: 1 };
  const covers = cards.map((c) => c.querySelector('.tunnel__cover'));
  const buildPath = () => {
    if (flight || !covers.length) return;
    // Starts above the top of the screen at the moment the camera is inside
    // the ball, so the viewer lands in the middle of the stream and rides it
    // down through the cases.
    const knots = [{ x: w / 2, y: introTop + introH - h * 1.6 }, { x: w / 2, y: tunnelTop + h * 0.15 }];
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
  let flow = 0;
  // Stream clock (flow): runs slowly on its own and speeds up with
  // scrolling, so the stream seems to pull the viewer along.
  let streamT = 0;
  let rush = 0;
  // The burst (flow) runs on its own clock once the fall reaches it.
  let burst = 0;
  let lastSy = window.scrollY;

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
    // Camera: how far it has flown in toward the point, how fast it is going
    // (for the warp streaks) and how much closer the point looks.
    const cameraIn = k * k * 1.6;
    // At the very end the camera flies into the ball itself: it swells past
    // the edges of the screen and its dust streams by on every side.
    const dive = Math.pow(clamp01((k - 0.82) / 0.18), 3);
    const zoom = 1 + 3.5 * k * k * k + 45 * dive;
    // m: the ring giving way to the tunnel walls. The tunnel opens halfway
    // through the fall, straight out of the shrinking ring, and the flight
    // down it starts right after.
    // Flow: the point bursts into a stream once the fall is over.
    const { mStart, tunnelEnd } = marks0();
    const m = flight
      ? ease(clamp01((sy - mStart) / (h * 0.5)))
      : clamp01((sy - (introTop + introH - h * 1.05)) / (h * 0.3));
    const introEnd = introTop + introH - h;
    // Flow: first the camera flies on into the dark centre of the stream
    // seen end-on, the hole opening wider round the viewer, then it swings
    // round beside the stream to see it, and the cases, side on.
    const hole = flight ? 0 : ease(clamp01((sy - introEnd) / (h * 0.25)));
    const side = flight ? 1 : ease(clamp01((sy - (introEnd + h * 0.12)) / (h * 0.35)));
    if (!flight) {
      if (m > 0.05) burst = still ? 1 : Math.min(1, burst + dt / 1100);
      else burst = still ? 0 : Math.max(0, burst - dt / 700);
    }
    // e: leaving the tunnel. The camera flies out of its mouth, the walls
    // rushing past the screen edges and fading, before "Обо мне". Tied to
    // the end of the tunnel block rather than to "Обо мне", whose height
    // differs a lot between desktop and phone.
    // Flow: the stream scatters into a faint dust by "Обо мне".
    const e = flight
      ? ease(clamp01((sy - (tunnelEnd - h * 0.92)) / (h * 0.27)))
      : ease(clamp01((sy - (aboutTop - h)) / (h * 0.8)));
    // Then "Обо мне" comes out of the depth like the cases: held under the
    // nav by CSS (sticky) while it grows from small at the screen's middle
    // and fades in. Only scale and opacity are scripted, nothing positional.
    if (flight && about) {
      const pin = aboutTop - aboutHeld;
      // Grows over 0.2 of a screen of scroll, all of it while held when the
      // page has that much left after the hold starts. On a phone, where it
      // is taller than the screen and no empty room follows it, the page
      // runs out sooner: then it starts growing a little earlier, on its way
      // up, and finishes as the page ends.
      const maxScroll = document.documentElement.scrollHeight - h;
      const span = h * 0.2;
      const after = Math.max(0, maxScroll - 2 - pin);
      const start = pin - Math.max(0, span - after);
      const ap = ease(clamp01((sy - start) / span));
      // Grows out of its own middle, where it is held.
      about.style.transformOrigin = '50% 50%';
      about.style.transform = ap < 1 ? `scale(${0.35 + 0.65 * ap})` : '';
      about.style.opacity = String(ap);
      if (footer) footer.style.opacity = String(ap);
    }
    // Camera depth in the tunnel.
    const cam = flight ? cameraAt(depthAt(sy)) : 0;
    flow += still ? 0 : dt * 0.05;

    pace += (((hovering || sheetOpen) && k === 0 ? 0 : 1) - pace) * 0.12;
    // Easing per frame, scaled by the frame's length, so the dust follows
    // the pointer at the same pace at 60 and at 120 frames a second.
    const soft = still ? 1 : 1 - Math.pow(0.91, dt / 16.7);
    // Quick to part under a finger, slower to close again.
    const rate = mouse.on > mouse.force ? 0.82 : 0.93;
    mouse.force += (mouse.on - mouse.force) * (still ? 1 : 1 - Math.pow(rate, dt / 16.7));
    if (mouse.force < 0.002 && !mouse.on) mouse.force = 0;
    // A finger covers far more than a cursor tip, so on a phone the dust
    // parts wider and further, or the effect hides under the finger.
    const repel = narrowScreen.matches ? 130 : REPEL;
    const push = narrowScreen.matches ? 60 : 40;
    const pushing = !still && k < 0.2 && m === 0 && mouse.force > 0;
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
        // would cross the name. It keeps moving smoothly and fades out while
        // it passes the name's band, rather than hopping over it.
        const band = hb.height / 2 + 14;
        const clear = narrow ? clamp01((Math.abs(oy) - band) / 36) : 1;
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
        if (!still && k < 0.2 && md < repel * 1.3 && md > 0.1 && !tag.matches(':hover')) {
          const q = 1 - md / (repel * 1.3);
          const f = q * q * (3 - 2 * q) * 46 * mouse.force;
          mtx = (mdx / md) * f;
          mty = (mdy / md) * f;
        }
        tag._ox = (tag._ox || 0) + (mtx - (tag._ox || 0)) * soft;
        tag._oy = (tag._oy || 0) + (mty - (tag._oy || 0)) * soft;
        marks.push({
          x: px + tag._ox, y: py + tag._oy, lx: lx + tag._ox, ly: ly + tag._oy,
          on: tag.matches(':hover') || hotPoint === i, alpha: 1 - clamp01(k * 1.6), line: clear, href: tag.href,
        });
        tag.style.transform = `translate(${left - hr.left + (tag._ox || 0)}px, ${cy + oy - hr.top + (tag._oy || 0)}px) translate(0, ${-50 * (1 - sa)}%)`;
        const shown = (1 - clamp01(k * 1.6)) * clear;
        tag.style.opacity = String(shown);
        tag.style.pointerEvents = shown > 0.4 ? 'auto' : 'none';
        // Preview opens toward the room: down from tags in the upper half,
        // up from tags in the lower half, so it never leaves the screen.
        tag.classList.toggle('is-below', cy + oy < h / 2);
      });
    }

    // Short trails while things move fast (the fall, the tunnel), none at
    // rest, so the ring stays crisp.
    // Flow: short glowing tails while the grains fly out of the burst.
    const flare = flight ? 0 : Math.sin(Math.PI * burst) * 1.1;
    const trail = still ? 0 : Math.max(k * (flight ? 1 : Math.pow(1 - burst, 4)), flight ? m * (1 - e) * 0.55 : 0, flare) * 0.55;
    if (trail > 0.02) {
      ctx.globalAlpha = 1;
      ctx.fillStyle = `rgba(${BG}, ${1 - trail})`;
      ctx.fillRect(0, 0, w, h);
    } else {
      ctx.clearRect(0, 0, w, h);
    }

    const drift = still ? 0 : time * 0.001;
    const near = [], mid = [], far = [], accent = [], stars = [], streaks = [];
    const ringOut = [];
    const flowDust = [], flowBack = [], flowAccent = [];
    const tcx = w / 2, tcy = h / 2;
    const halfDiag = Math.hypot(w, h) / 2 + 20;
    // Out of the tunnel's mouth: the walls open wide past the screen edges.
    const wall = Math.max(w, h) * 0.55 * (1 + 3.5 * e * e);
    // The walls do not turn: a rotating tunnel made people motion-sick.

    for (const p of pts) {
      if (p.star) {
        // The camera flies toward the point: every star sits at a depth and
        // rushes outward as the camera closes in, wrapping back to the far
        // distance once it passes, so the sky stays full and turns to warp
        // streaks at speed.
        const z0 = 0.2 + p.v * 0.8;
        const zc = (((z0 - cameraIn) % 1) + 1) % 1 + 0.06;
        const rr = p.sr * halfDiag * z0 / zc * 0.9;
        const sx = w / 2 + Math.cos(p.sa) * rr;
        const sy2 = h / 2 + Math.sin(p.sa) * rr;
        stars.push(sx, sy2, p.size * 0.8 * Math.min(2, z0 / zc));
        continue;
      }

      // Ring, spiralling in faster the closer it gets.
      p.a += dt * spinSpeed * (1 + k * (2 + p.fall * 4));
      const r0 = p.inner ? Math.sqrt(p.u) * 0.85 : 1 + p.band * 0.09;
      // The ring shrinks toward the point while the camera closes in on it,
      // so at the end the point is a dense ball filling the middle.
      const r = r0 * Math.max(0.05, Math.pow(1 - k, 0.7 + p.fall * 0.7)) * zoom;
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
        // The stream opens out of the point like a cone: no width at its
        // source, full width about a screen further on, so it never starts
        // with a flat cut.
        const open = 1;
        // A tighter rope than before, narrower still on a phone, so the
        // dust packs close instead of spreading thin.
        const wide = ((narrowScreen.matches ? 60 : 90) + 40 * p.fall * p.fall) * open;
        const turn = d * 0.009 + streamT * 0.0012 + (p.band > 0 ? 0 : Math.PI) + (p.phase - Math.PI) * 0.07;
        const off = Math.cos(turn) * wide + p.band * 9 * open;
        const depth = Math.sin(turn);
        let fx = q.x + q.nx * off;
        let fy = q.y + q.ny * off - sy;
        // Looking down along the stream from on top of it: the helix seen
        // end-on, in perspective, its dust coming up toward the camera.
        if (side < 1) {
          const zf = 1 - ((p.s + streamT * p.speed * 2.5) % 1);
          const z = 30 + zf * 3200;
          const sc = (520 * (1 + 9 * hole * hole)) / z;
          const ta = (d * 0.004) + (p.band > 0 ? 0 : Math.PI) + (p.phase - Math.PI) * 0.07;
          const tr = ((narrowScreen.matches ? 60 : 90) + 40 * p.fall * p.fall) * sc;
          const tx = w / 2 + Math.cos(ta) * tr;
          const ty = h / 2 + Math.sin(ta) * tr;
          fx = tx + (fx - tx) * side;
          fy = ty + (fy - ty) * side;
        }
        if (e > 0) {
          fx += (p.u * w - fx) * e;
          fy += (p.v * h - fy) * e;
        }
        // The dust that flew past the camera gathers in from all round the
        // screen into the stream, with a slight swirl on the way.
        const blast = Math.sin(Math.PI * mp) * (20 + 60 * p.u);
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
        // Crossfade rather than morph: the ring's dust fades where it is while
        // the tunnel fades in at its own place, so the change never passes
        // through a muddy in-between cloud.
        if (m < 1 && x > -4 && x < w + 4 && y > -4 && y < h + 4) ringOut.push(x, y, size);
        x = txp;
        y = typ;
        size = Math.min(3.2, Math.max(0.7, 1.3 * s));
        bucket = z < DEPTH * 0.25 ? 0 : z < DEPTH * 0.6 ? 1 : 2;
        // Near the viewer the dust is drawn as short streaks pointing away
        // from the centre, the way things smear past at speed.
        streak = m * (1 - e) * Math.min(22, 5 * s);
        dirX = Math.cos(a);
        dirY = Math.sin(a);
      }

      if (!still && m < 1) {
        x += Math.sin(drift + p.phase) * 1.5 * (1 - m);
        y += Math.cos(drift * 0.8 + p.phase) * 1.5 * (1 - m);
      }

      // Only grains near the pointer, or still settling back, cost anything:
      // with no pointer about, the whole field skips this.
      const dx = x - mouse.x, dy = y - mouse.y;
      if (pushing && dx < repel && dx > -repel && dy < repel && dy > -repel) {
        const dm = Math.hypot(dx, dy);
        let tx = 0, ty = 0;
        if (dm < repel && dm > 0.1) {
          // Smoothstep falloff: strongest at the pointer, fading to nothing
          // at the edge, so the hole has no hard rim.
          const q = 1 - dm / repel;
          const f = q * q * (3 - 2 * q) * push * mouse.force;
          tx = (dx / dm) * f;
          ty = (dy / dm) * f;
        }
        p.ox += (tx - p.ox) * soft;
        p.oy += (ty - p.oy) * soft;
      } else if (p.ox !== 0 || p.oy !== 0) {
        p.ox -= p.ox * soft;
        p.oy -= p.oy * soft;
        if (p.ox * p.ox + p.oy * p.oy < 0.01) { p.ox = 0; p.oy = 0; }
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
    // The tunnel ends at "Обо мне": its dust fades out so nothing moves
    // behind the text.
    const fade = flight ? 1 - e : 1 - e * 0.6;
    paint(stars, 'rgb(255, 255, 255)', 0.45 * (1 - m * (1 - e)) + 0.001);
    const ringFade = flight && m > 0 ? m : 1;
    paint(ringOut, 'rgb(236, 233, 255)', 0.85 * (1 - m));
    paint(flowBack, 'rgb(236, 233, 255)', 0.45 * fade);
    paint(flowDust, 'rgb(236, 233, 255)', 0.95 * fade);
    paint(flowAccent, 'rgb(214, 107, 208)', 0.95 * fade);
    paint(far, 'rgb(236, 233, 255)', 0.45 * fade * ringFade);
    paint(mid, 'rgb(236, 233, 255)', 0.75 * fade * ringFade);
    paint(near, 'rgb(236, 233, 255)', 0.85 * fade * ringFade);
    paint(accent, 'rgb(214, 107, 208)', 0.95 * fade * ringFade);

    lastMarks = marks;
    marks.forEach((mk) => {
      if (mk.alpha <= 0.01) return;
      ctx.globalAlpha = mk.alpha * mk.line * (mk.on ? 0.9 : 0.35);
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
      ctx.globalAlpha = 0.45;
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

    // Each case comes out of the depth, reads at full size, and flies past
    // the viewer.
    if (flight) {
      // One case at a time: the next stays hidden until the one in front of
      // it has flown by and faded out.
      let ahead = 0;
      cards.forEach((card, i) => {
        const z = caseDepth(i) - cam;
        let op = 0, sc = 0.1;
        if (z > 40) {
          sc = FOCUS / z;
          // Hidden until the tunnel has fully formed, then grows from a speck.
          op = clamp01((sc - 0.1) / 0.55) * (1 - clamp01((sc - 1.3) / 0.6)) * clamp01((m - 0.85) / 0.15);
        }
        op *= (1 - ahead) * (1 - e);
        const shownOwn = op;
        ahead = Math.max(ahead, shownOwn > 0.02 || z <= 40 ? (z > 40 ? Math.min(1, shownOwn * 3) : 0) : 0);
        card.style.opacity = String(op);
        card.style.transform = `translate(-50%, -50%) scale(${Math.min(sc, 4)})`;
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
    // A slow phone gets fewer particles: if the first couple of seconds
    // run well under 40 frames a second, the field is thinned out once.
    let frames = 0, spent = 0, prev = 0;
    const loop = (time) => {
      draw(time);
      if (frames < 150 && prev) {
        frames++;
        if (frames > 30) spent += time - prev;
        if (frames === 150 && spent / 120 > 25) pts.length = Math.floor(pts.length * 0.55);
      }
      prev = time;
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
    // clientWidth, not innerWidth: on a phone innerWidth can report more than
    // the screen, and a canvas that wide lets the page slide sideways.
    const w = document.documentElement.clientWidth, h = window.innerHeight;
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

// Where a case was opened from travels in its URL as ?back=<address>: the
// homepage with its scroll position, or the previous case with its own
// back address inside, so a chain of cases unwinds step by step. The back
// arrow is then an ordinary link. Neither the referrer nor the history
// stack can be trusted here: embedded previews run the site in a sandbox
// where the referrer is blank and history entries go missing.
const siteRoot = (() => {
  const bare = location.href.split(/[?#]/)[0];
  const i = bare.indexOf('/cases/');
  return i >= 0 ? bare.slice(0, i + 1) : bare.replace(/[^/]*$/, '');
})();
const onSite = (href) => typeof href === 'string' && href.startsWith(siteRoot);
const currentBack = () => {
  const back = document.querySelector('.case-back');
  return back ? back.href : null;
};
const hereAsBack = () => {
  const url = new URL(location.href);
  url.hash = '';
  url.search = '';
  if (document.body.classList.contains('case-page')) {
    const b = currentBack();
    if (onSite(b)) url.searchParams.set('back', b);
  } else {
    url.searchParams.set('y', String(Math.round(window.scrollY)));
  }
  return url.href;
};
const markCaseUrl = (href) => {
  let url;
  try { url = new URL(href, location.href); } catch (e) { return href; }
  if (!/\/cases\/[^/]+\.html$/.test(url.pathname)) return href;
  url.searchParams.set('back', hereAsBack());
  return url.href;
};
document.addEventListener('click', (ev) => {
  const a = ev.target.closest && ev.target.closest('a[href]');
  if (!a || a.target === '_blank' || a.classList.contains('case-back')) return;
  const marked = markCaseUrl(a.getAttribute('href'));
  if (marked !== a.getAttribute('href')) a.href = marked;
}, true);

const dropParams = (...names) => {
  try {
    const url = new URL(location.href);
    names.forEach((n) => url.searchParams.delete(n));
    history.replaceState(history.state, '', url.pathname + url.search + url.hash);
  } catch (e) { /* the address bar just keeps them */ }
};

if (document.body.classList.contains('case-page')) {
  const target = new URLSearchParams(location.search).get('back');
  const back = document.querySelector('.case-back');
  if (back && onSite(target)) back.href = target;
  dropParams('back');

  // Opened by a link, a case starts at its top, whatever scroll position the
  // browser or the preview carries over. Instant, not smooth: the page's
  // smooth scrolling would otherwise animate it, and late restores win.
  const nav = performance.getEntriesByType && performance.getEntriesByType('navigation')[0];
  if (!location.hash && (!nav || nav.type !== 'back_forward')) {
    const toTop = () => window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    toTop();
    requestAnimationFrame(toTop);
    window.addEventListener('load', () => { toTop(); requestAnimationFrame(toTop); }, { once: true });
  }
}

// Back on the homepage from a case: return to the scroll position the case
// was opened at, so the same case is on screen in the tunnel.
if (document.body.classList.contains('home-page')) {
  const y = Number(new URLSearchParams(location.search).get('y'));
  if (y > 0) {
    const go = () => window.scrollTo({ top: y, left: 0, behavior: 'instant' });
    go();
    window.addEventListener('load', () => { go(); requestAnimationFrame(go); }, { once: true });
  }
  if (new URLSearchParams(location.search).has('y')) dropParams('y');
}
