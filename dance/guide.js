// The shoe guide: a PDF shown as page pictures in a window over the page,
// with a button to download the file itself. A PDF in an iframe shows
// nothing on Android and only the first page on iPhone, so the pages are
// pictures, made once from the PDF and kept in public/dance/pokupochki/.
//
// There is no link to it on the page: the window opens from a direct link
// to /dance/#pokupochki and closes back to the plain page.

const HASH = '#pokupochki';
const DIR = '/dance/pokupochki/';
const PAGES = 12;
// The size the pictures are made at, so the window keeps its height while
// they load.
const W = 1200;
const H = 1703;

const dialog = document.getElementById('pokupochki');
const pages = dialog.querySelector('.guide__pages');
const close = dialog.querySelector('.guide__close');

function fill() {
  if (pages.childElementCount) return;
  for (let i = 1; i <= PAGES; i++) {
    const img = document.createElement('img');
    img.src = `${DIR}page-${String(i).padStart(2, '0')}.webp`;
    img.width = W;
    img.height = H;
    img.alt = `Страница ${i} из ${PAGES}`;
    img.decoding = 'async';
    // The first two are on screen at once, the rest come as they scroll in.
    if (i > 2) img.loading = 'lazy';
    img.className = 'guide__page';
    pages.appendChild(img);
  }
}

function open() {
  if (dialog.open) return;
  fill();
  document.documentElement.classList.add('is-locked');
  dialog.showModal();
  pages.scrollTop = 0;
}

function sync() {
  if (location.hash === HASH) open();
  else if (dialog.open) dialog.close();
}

dialog.addEventListener('close', () => {
  document.documentElement.classList.remove('is-locked');
  // Drop the #pokupochki from the address so a reload shows the plain page.
  if (location.hash === HASH) {
    history.replaceState(null, '', location.pathname + location.search);
  }
});
close.addEventListener('click', () => dialog.close());
// A tap on the dimmed page around the window closes it too.
dialog.addEventListener('click', (e) => {
  if (e.target === dialog) dialog.close();
});
window.addEventListener('hashchange', sync);
sync();
