// Shared page list: drives the prev/next links on each page and the /present carousel.
// ring: where the Sola ring sits on that slide (center x/y in % of the screen, size in vmin).
// In /present the ring glides between these positions as the slides change.
// video: the slide has a video[data-slide-video]; /present moves on when it ends instead of on a timer.
// qr: the booth's QR code goes to this page instead of the start, with its own caption.
const SOLA_PAGES = [
  { path: '/', title: 'SolaCon 2', ring: { x: 82, y: 36, size: 64 } },
  { path: '/terminal/', title: 'Sola Terminal', ring: { x: 97, y: 90, size: 58 }, video: true },
  { path: '/terminal/devices/', title: 'Sola Terminal devices', ring: { x: 98, y: 4, size: 34 } },
  { path: '/checkout/', title: 'Sola Checkout', ring: { x: 4, y: 98, size: 56 } },
  { path: '/collect/', title: 'Sola Collect', ring: { x: 94, y: 14, size: 46 } },
  { path: '/surcharging/', title: 'Surcharging', ring: { x: 102, y: 58, size: 72 } },
  { path: '/chargebacks/', title: 'Chargeback Management', ring: { x: 6, y: 104, size: 50 } },
  { path: '/whats-next/', title: "What's next", ring: { x: 50, y: 116, size: 96 }, qr: { src: '/assets/qr-whats-next.svg', caption: 'Scan to vote' } },
];

// Pages loaded with ?present are slides inside /present: hide page navigation.
const SOLA_PRESENTING = new URLSearchParams(location.search).has('present');
if (SOLA_PRESENTING) document.documentElement.classList.add('present');

const SOLA_RING_HTML = '<b></b><i class="ripple"></i><i class="ripple"></i><i class="tap"></i>';

function solaNormalizePath(path) {
  path = path.replace(/index\.html$/, '');
  return path.endsWith('/') ? path : path + '/';
}

function solaPlaceRing(ring, placement) {
  ring.style.setProperty('--x', placement.x + '%');
  ring.style.setProperty('--y', placement.y + '%');
  ring.style.setProperty('--size', placement.size + 'vmin');
}

// Wrap each headline word so it can rise into place, and color the closing punctuation.
function solaSplitHeadline(h1) {
  let count = 0;
  const walk = node => {
    [...node.childNodes].forEach(child => {
      if (child.nodeType === Node.ELEMENT_NODE) return walk(child);
      if (child.nodeType !== Node.TEXT_NODE) return;
      const frag = document.createDocumentFragment();
      child.textContent.split(/(\s+)/).forEach(part => {
        if (!part) return;
        if (/^\s+$/.test(part)) return frag.append(part);
        const word = document.createElement('span');
        const inner = document.createElement('span');
        word.className = 'word';
        inner.style.setProperty('--w', count++);
        inner.textContent = part;
        word.append(inner);
        frag.append(word);
      });
      child.replaceWith(frag);
    });
  };
  walk(h1);

  const last = [...h1.querySelectorAll('.word > span')].pop();
  const match = last && last.textContent.match(/^(.*?)([.?!])$/);
  if (match) {
    last.textContent = match[1];
    const dot = document.createElement('span');
    dot.className = 'dot';
    dot.textContent = match[2];
    last.append(dot);
  }
}

// A .rotator cycles through the screenshots in its .browser until someone picks one.
// [data-shot] controls work like radio buttons: clicking one selects its screenshot and
// stops the cycle; hovering one only pauses it. Each image's data-bar fills the bar, and
// its data-href becomes the target of the rotator's [data-demo-link].
function solaRotator(root) {
  const shots = root.querySelectorAll('.browser-view img');
  const bar = root.querySelector('.browser-bar');
  const demoLink = root.querySelector('[data-demo-link]');
  const controls = root.querySelectorAll('[data-shot]');
  const interval = Number(root.dataset.interval) || 4000;
  // The booth monitor always rotates; visitors who prefer reduced motion pick for themselves.
  const auto = shots.length > 1 && (SOLA_PRESENTING || !matchMedia('(prefers-reduced-motion: reduce)').matches);
  let shown = 0;
  let holding = false;
  let picked = false;
  let timer;

  const show = i => {
    shown = i;
    shots.forEach((shot, j) => shot.classList.toggle('active', j === i));
    controls.forEach(control => {
      const selected = Number(control.dataset.shot) === i;
      control.classList.toggle('active', selected);
      if (control.getAttribute('role') === 'radio') control.setAttribute('aria-checked', selected);
    });
    if (bar && shots[i].dataset.bar) bar.textContent = shots[i].dataset.bar;
    if (demoLink && shots[i].dataset.href) demoLink.href = shots[i].dataset.href;
    clearTimeout(timer);
    if (auto && !picked) timer = setTimeout(() => show(holding ? shown : (shown + 1) % shots.length), interval);
  };

  controls.forEach(control => {
    control.addEventListener('mouseenter', () => { holding = true; });
    control.addEventListener('mouseleave', () => { holding = false; });
    control.addEventListener('click', () => {
      picked = true;
      show(Number(control.dataset.shot));
    });
  });

  root.solaRestart = () => { picked = false; show(0); };
  root.solaHold = value => { holding = value; };
  show(0);
}

// Clicking a .browser opens its screenshots full size, starting with the one showing.
function solaLightbox(browser) {
  let box = document.querySelector('.lightbox');
  if (!box) {
    box = document.createElement('dialog');
    box.className = 'lightbox';
    box.innerHTML = `
      <button class="lightbox-close" type="button" aria-label="Close">&times;</button>
      <button class="lightbox-step" type="button" data-step="-1" aria-label="Previous screenshot">&lsaquo;</button>
      <figure><img alt=""><figcaption></figcaption></figure>
      <button class="lightbox-step" type="button" data-step="1" aria-label="Next screenshot">&rsaquo;</button>`;
    document.body.append(box);
    box.querySelector('.lightbox-close').addEventListener('click', () => box.close());
    box.addEventListener('click', e => {
      const step = e.target.closest('[data-step]');
      if (step) box.solaStep(Number(step.dataset.step));
      else if (e.target === box || e.target.tagName === 'FIGURE') box.close();
    });
    box.addEventListener('keydown', e => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
        e.stopPropagation();
        box.solaStep(e.key === 'ArrowRight' ? 1 : -1);
      }
    });
    box.addEventListener('close', () => box.solaRotator?.solaHold(false));
  }

  const shots = [...browser.querySelectorAll('.browser-view img')];
  const bar = browser.querySelector('.browser-bar').textContent;
  let index = Math.max(0, shots.findIndex(shot => shot.classList.contains('active')));
  const show = () => {
    const shot = shots[index];
    box.querySelector('img').src = shot.src;
    box.querySelector('img').alt = shot.alt;
    box.querySelector('figcaption').textContent = shot.dataset.bar || bar;
  };
  box.solaStep = step => {
    index = (index + step + shots.length) % shots.length;
    show();
  };
  box.classList.toggle('single', shots.length < 2);
  box.solaRotator = browser.closest('.rotator');
  box.solaRotator?.solaHold(true);
  show();
  box.showModal();
}

// Restart the entrance sequence (see "Entrance" in site.css).
function solaEnter() {
  const root = document.documentElement;
  root.classList.remove('entered');
  void root.offsetWidth;
  root.classList.add('entered');
}

document.addEventListener('DOMContentLoaded', () => {
  const page = SOLA_PAGES.find(p => p.path === solaNormalizePath(location.pathname));

  // /present draws its own ring behind every slide.
  if (!SOLA_PRESENTING && !document.querySelector('.ring')) {
    const ring = document.createElement('div');
    ring.className = 'ring';
    ring.setAttribute('aria-hidden', 'true');
    ring.innerHTML = SOLA_RING_HTML;
    solaPlaceRing(ring, page ? page.ring : SOLA_PAGES[0].ring);
    document.body.prepend(ring);
  }

  const nav = document.querySelector('.page-nav');
  if (nav) {
    const i = SOLA_PAGES.indexOf(page);
    const prev = SOLA_PAGES[i - 1];
    const next = SOLA_PAGES[i + 1];
    nav.innerHTML =
      (prev ? `<a href="${prev.path}" rel="prev">&larr; ${prev.title}</a>` : '<span></span>') +
      (next ? `<a href="${next.path}" rel="next">${next.title} &rarr;</a>` : '<a href="/">Back to start</a>');
  }

  document.querySelectorAll('.slide h1').forEach(solaSplitHeadline);
  document.querySelectorAll('.stagger').forEach(group => {
    [...group.children].forEach((child, i) => child.style.setProperty('--i', i));
  });
  document.querySelectorAll('.rotator').forEach(solaRotator);
  // The screenshot (and its bar) opens the viewer.
  document.querySelectorAll('.browser').forEach(browser => {
    const view = browser.querySelector('.browser-view');
    view.tabIndex = 0;
    view.setAttribute('role', 'button');
    view.setAttribute('aria-label', 'View full screenshot');
    browser.addEventListener('click', () => solaLightbox(browser));
    view.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        solaLightbox(browser);
      }
    });
  });
  solaEnter();

  // Slide videos autoplay muted and loop on every visit (their controls can pause them).
  const slideVideos = document.querySelectorAll('video[data-slide-video]');

  // Inside the carousel, links jump to that slide and keys control the deck.
  if (SOLA_PRESENTING && window.parent !== window) {
    // Slide videos play once, muted, from the start each time the slide shows, and
    // report progress so the carousel can follow them and move on when they end.
    slideVideos.forEach(video => {
      const report = message => parent.postMessage(message, location.origin);
      video.controls = false;
      video.muted = true;
      video.loop = false;
      video.autoplay = false;
      video.preload = 'auto';
      video.pause();
      video.addEventListener('timeupdate', () => {
        if (video.duration) report({ type: 'video-progress', value: video.currentTime / video.duration });
      });
      video.addEventListener('ended', () => report({ type: 'video-ended' }));
    });

    document.addEventListener('click', e => {
      const link = e.target.closest('a[href]');
      if (!link) return;
      e.preventDefault();
      const url = new URL(link.href);
      if (url.origin === location.origin) {
        parent.postMessage({ type: 'goto', path: solaNormalizePath(url.pathname) }, location.origin);
      }
    });
    document.addEventListener('keydown', e => {
      parent.postMessage({ type: 'key', key: e.key }, location.origin);
    });
    window.addEventListener('message', e => {
      if (e.origin !== location.origin) return;
      const { type } = e.data;
      // Each time the carousel shows this slide, replay it from the start.
      if (type === 'enter') {
        document.querySelector('.lightbox')?.close();
        solaEnter();
        document.querySelectorAll('.rotator').forEach(rotator => rotator.solaRestart());
        slideVideos.forEach(video => {
          video.currentTime = 0;
          video.play();
        });
      }
      if (type === 'leave' || type === 'pause') slideVideos.forEach(video => video.pause());
      if (type === 'play') slideVideos.forEach(video => video.play());
    });
  }
});
