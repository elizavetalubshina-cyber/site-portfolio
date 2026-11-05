// The same still night sky for case pages, the 404 and portfolio prototypes.
export function mountSky() {
  if (document.querySelector('canvas.sky')) return;
  const sky = document.createElement('canvas');
  sky.className = 'sky';
  sky.setAttribute('aria-hidden', 'true');
  document.body.prepend(sky);
  const stars = Array.from({ length: 420 }, () => ({
    x: Math.random(), y: Math.random(), s: Math.random() < 0.85 ? 1 : 1.8, a: 0.2 + Math.random() * 0.5,
  }));
  const paintSky = () => {
    const w = document.documentElement.clientWidth, h = window.innerHeight;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    sky.width = w * dpr;
    sky.height = h * dpr;
    const c = sky.getContext('2d');
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    c.fillStyle = '#ece9ff';
    stars.forEach((star) => {
      c.globalAlpha = star.a;
      c.fillRect(star.x * w, star.y * h, star.s, star.s);
    });
  };
  paintSky();
  window.addEventListener('resize', paintSky);
}
