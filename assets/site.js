// Shared page list: drives the prev/next links on each page and the /present carousel.
// ring: where the Sola ring sits on that slide (center x/y in % of the screen, size in vmin).
// In /present the ring glides between these positions as the slides change.
const SOLA_PAGES = [
  { path: '/', title: 'SolaCon 2', ring: { x: 82, y: 36, size: 64 } },
  { path: '/terminal/', title: 'Sola Terminal', ring: { x: 97, y: 90, size: 58 } },
  { path: '/terminal/devices/', title: 'Sola Terminal devices', ring: { x: 98, y: 4, size: 34 } },
  { path: '/checkout/', title: 'Sola Checkout', ring: { x: 4, y: 98, size: 56 } },
  { path: '/collect/', title: 'Sola Collect', ring: { x: 94, y: 14, size: 46 } },
  { path: '/surcharging/', title: 'Surcharging', ring: { x: 102, y: 58, size: 72 } },
  { path: '/chargebacks/', title: 'Chargeback Management', ring: { x: 6, y: 104, size: 50 } },
  { path: '/whats-next/', title: "What's next", ring: { x: 50, y: 116, size: 96 } },
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
  solaEnter();

  // Inside the carousel, links jump to that slide and keys control the deck.
  if (SOLA_PRESENTING && window.parent !== window) {
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
      if (e.origin === location.origin && e.data.type === 'enter') solaEnter();
    });
  }
});
