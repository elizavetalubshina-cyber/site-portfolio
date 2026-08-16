// `lines` are fixed line breaks (not left to CSS wrap) so the caption
// on the video and the row in the subtitles panel always match —
// same two-line shape in both places, regardless of container width.
const catCaptions = [
  { start: 0, end: 2.5, lines: ['Знакомьтесь — самый милый рыжик на свете.'] },
  { start: 2.5, end: 5.5, lines: ['Вот он просыпается... и потягивается — ну', 'разве не прелесть?'] },
  { start: 5.5, end: 9, lines: ['Этот сладкий зевок способен растопить любое', 'сердце.'] },
  { start: 9, end: 13, lines: ['Кажется, кто-то совсем не хочет вставать', 'сегодня.'] },
  { start: 13, end: 17, lines: ['Ну как тут не влюбиться с первого зевка?'] },
];

const catVideo = document.getElementById('catVideo');
const catCaption = document.getElementById('catCaption');
const catCues = document.getElementById('catCues');
const catTimecode = document.getElementById('catTimecode');
const catCueCounter = document.getElementById('catCueCounter');

const pad = (n) => String(n).padStart(2, '0');

function formatTimecode(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const f = Math.floor((seconds % 1) * 25);
  return `${pad(h)}:${pad(m)}:${pad(s)}:${pad(f)}`;
}

function formatDuration(seconds) {
  const s = Math.floor(seconds % 60);
  const f = Math.floor((seconds % 1) * 25);
  return `${pad(s)}:${pad(f)}`;
}

if (catVideo && catCaption && catCues) {
  catCues.innerHTML = catCaptions
    .map((cue, i) => {
      const meta = `${formatTimecode(cue.start)} ${formatTimecode(cue.end)} ${formatDuration(cue.end - cue.start)}`;
      return `<li class="tv__cue" data-index="${i}">
        <span class="tv__cue-meta">${String(i + 1).padStart(2, '0')} ${meta}</span>
        <strong class="tv__cue-num">${String(i + 1).padStart(2, '0')}</strong>
        <span class="tv__cue-text">${cue.lines.join('<br>')}</span>
      </li>`;
    })
    .join('');

  const cueEls = [...catCues.children];
  let activeIndex = -1;

  function updateCuesPadding() {
    catCues.style.paddingTop = 0;
    catCues.style.paddingBottom = 0;
    const half = catCues.clientHeight / 2 + 'px';
    catCues.style.paddingTop = half;
    catCues.style.paddingBottom = half;
    if (activeIndex >= 0) scrollActiveIntoCenter(false);
  }

  function scrollActiveIntoCenter(smooth = true) {
    const target = cueEls[activeIndex];
    if (!target) return;
    const centeredTop = target.offsetTop - catCues.clientHeight / 2 + target.offsetHeight / 2;
    const maxScroll = catCues.scrollHeight - catCues.clientHeight;
    catCues.scrollTo({
      top: Math.max(0, Math.min(centeredTop, maxScroll)),
      behavior: smooth ? 'smooth' : 'auto',
    });
  }

  updateCuesPadding();
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(updateCuesPadding);
  }
  window.addEventListener('resize', updateCuesPadding);

  if (catCueCounter) {
    catCueCounter.textContent = `Субтитр 1 из ${catCaptions.length}`;
  }

  catVideo.addEventListener('timeupdate', () => {
    const t = catVideo.currentTime;
    if (catTimecode) catTimecode.textContent = formatTimecode(t);

    const index = catCaptions.findIndex((c) => t >= c.start && t < c.end);
    if (index === activeIndex) return;
    activeIndex = index;

    catCaption.innerHTML = index >= 0 ? catCaptions[index].lines.join('<br>') : '';
    catCaption.classList.toggle('is-empty', index < 0);
    if (catCueCounter) {
      catCueCounter.textContent = `Субтитр ${index >= 0 ? index + 1 : 1} из ${catCaptions.length}`;
    }
    cueEls.forEach((el, i) => {
      el.classList.toggle('tv__cue--active', i === index);
      el.classList.toggle('tv__cue--released', index >= 0 && i < index);
    });
    if (index >= 0) scrollActiveIntoCenter(true);
  });
}

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

document.querySelectorAll('.nav__links a, .nav__menu a, .logo').forEach((link) => {
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

// CV preview. The "Резюме" link points at the PDF for real, so it still opens
// the file if this never runs; here the click is intercepted and the file shown
// in place instead. showModal() is used rather than a hand-rolled overlay
// because the preview contains an iframe: once focus moves into the PDF viewer,
// key events happen inside that document and never reach a focus trap written
// out here, so focus would walk out onto the page behind. The browser's own
// modal handles that, along with Escape and stacking above everything else.
const cvModal = document.getElementById('cvModal');

if (cvModal && typeof cvModal.showModal === 'function') {
  const cvFrame = cvModal.querySelector('[data-cv-frame]');
  const cvTrigger = document.querySelector('[data-cv-open]');
  const cvPdf = cvTrigger && cvTrigger.getAttribute('href');

  cvTrigger?.addEventListener('click', (e) => {
    // Leave the modified clicks alone — they mean "open somewhere else".
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    e.preventDefault();

    // Fetch the PDF only when it is going to be displayed. Below 820px the
    // frame is hidden and the fallback buttons take over, so nothing is
    // downloaded until the visitor actually asks for the file.
    if (cvFrame && !cvFrame.getAttribute('src') && getComputedStyle(cvFrame).display !== 'none') {
      cvFrame.setAttribute('src', cvPdf);
    }

    document.body.classList.add('cv-open');
    cvModal.showModal();
  });

  // Clicking the backdrop: with showModal the backdrop belongs to the dialog
  // itself, so a click that lands on the dialog rather than on its contents
  // came from outside the panel.
  cvModal.addEventListener('click', (e) => {
    if (e.target === cvModal) cvModal.close();
  });

  cvModal.querySelectorAll('[data-cv-close]').forEach((el) => {
    el.addEventListener('click', () => cvModal.close());
  });

  // Fires for the close button, the backdrop and Escape alike.
  cvModal.addEventListener('close', () => {
    document.body.classList.remove('cv-open');
  });
}
