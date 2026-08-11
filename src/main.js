import './style.css';

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

document.querySelectorAll('.nav__links a, .logo').forEach((link) => {
  link.addEventListener('click', (e) => {
    const id = link.getAttribute('href');
    if (!id || !id.startsWith('#')) return;
    const target = document.querySelector(id);
    if (!target) return;
    e.preventDefault();
    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
});

const galleryPhotos = document.querySelectorAll('#aboutPhotoGallery img');
if (galleryPhotos.length > 1) {
  let galleryIndex = 0;
  setInterval(() => {
    galleryPhotos[galleryIndex].classList.remove('is-active');
    galleryIndex = (galleryIndex + 1) % galleryPhotos.length;
    galleryPhotos[galleryIndex].classList.add('is-active');
  }, 5000);
}
