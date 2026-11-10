/* ---------------------------------------------------------------
   Home hero carousel — a full-bleed background that cross-fades
   every 20 seconds. Edit HERO_SLIDES to change the pictures.
   Slides that fail to load are skipped automatically.
   --------------------------------------------------------------- */
const HERO_INTERVAL = 20000;
const unsplash = id => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=1920&q=80`;
const HERO_SLIDES = [
  { src: unsplash('photo-1523805009345-7448845a9e53'), place: 'Giraffes on the savanna',        alt: 'Giraffes on the African savanna' },
  { src: unsplash('photo-1559833064-6f4573ec1ac9'),    place: 'Lagos, Nigeria',                 alt: 'The Lagos skyline in daylight' },
  { src: unsplash('photo-1594999945795-e570338fdd12'), place: 'Street food, Douala, Cameroon',  alt: 'Meat grilling over charcoal at a street food stall in Douala' },
  { src: 'https://images.pexels.com/photos/33624055/pexels-photo-33624055/free-photo-of-vibrant-african-market-scene-in-jos-nigeria.jpeg?auto=compress&cs=tinysrgb&w=1920',
                                                       place: 'A market in Jos, Nigeria',       alt: 'A busy, colourful market in Jos, Nigeria' },
  { src: unsplash('photo-1535940360221-641a69c43bac'), place: 'Acacia trees on golden savanna', alt: 'Acacia trees scattered across a golden savanna' },
  { src: unsplash('photo-1547471080-7cc2caa01a7e'),    place: 'Golden hour on the plains',      alt: 'A lone tree on green land at golden hour' }
];

(function () {
  const root = document.getElementById('heroSlides');
  if (!root) return;
  const dotsBox = document.getElementById('heroDots');
  const caption = document.getElementById('heroCaption');
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const slides = HERO_SLIDES.map(s => {
    const el = document.createElement('div');
    el.className = 'hero-slide';
    el.setAttribute('role', 'img');
    el.setAttribute('aria-label', s.alt);
    root.appendChild(el);
    return Object.assign({ el, ready: false }, s);
  });

  let index = -1, timer = null;
  const ready = () => slides.filter(s => s.ready);

  function renderDots() {
    const list = ready();
    dotsBox.innerHTML = list.map((s, i) =>
      `<button type="button" class="hero-dot${s === slides[index] ? ' active' : ''}" data-i="${i}" aria-label="Show: ${s.place}"><i></i></button>`).join('');
    dotsBox.hidden = list.length < 2;
  }
  function show(slide) {
    index = slides.indexOf(slide);
    slides.forEach(s => s.el.classList.toggle('active', s === slide));
    caption.textContent = slide.place;
    renderDots();
    schedule(true);
  }
  // (Re)start the 20s clock. Called when a slide is shown, and when more
  // pictures finish loading after the first one is already on screen.
  function schedule(restart) {
    if (timer && !restart) return;
    clearTimeout(timer); timer = null;
    if (index > -1 && ready().length > 1 && !document.hidden) timer = setTimeout(next, HERO_INTERVAL);
  }
  function next() {
    const list = ready();
    if (!list.length) return;
    const pos = list.indexOf(slides[index]);
    show(list[(pos + 1) % list.length]);
  }
  dotsBox.addEventListener('click', e => {
    const b = e.target.closest('.hero-dot');
    if (b) show(ready()[Number(b.dataset.i)]);
  });
  // Don't let a backgrounded tab pile up transitions; restart the clock when it returns.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { clearTimeout(timer); timer = null; }
    else if (index > -1) {
      schedule(true);
      const a = dotsBox.querySelector('.active');   // restart the dot's progress bar to match
      if (a) { a.classList.remove('active'); void a.offsetWidth; a.classList.add('active'); }
    }
  });

  // The giraffe should be the first thing people see, so hold the others back
  // until it has loaded (or failed, or 3 seconds have passed).
  let settled = false;
  function settle() { settled = true; tryStart(); }
  function tryStart() {
    if (index === -1 && settled) { const first = ready()[0]; if (first) show(first); }
  }
  setTimeout(settle, 3000);

  slides.forEach((s, i) => {
    const img = new Image();
    img.onload = () => {
      s.el.style.backgroundImage = `url("${s.src}")`;
      s.ready = true;
      if (i === 0) settle();
      else if (index === -1) tryStart(); else { renderDots(); schedule(false); }
    };
    img.onerror = () => { s.el.remove(); if (i === 0) settle(); };
    img.src = s.src;
  });
})();
