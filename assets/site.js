// Shared page list: drives the prev/next links on each page and the /present carousel.
const SOLA_PAGES = [
  { path: '/', title: 'SolaCon 2' },
  { path: '/terminal/', title: 'Sola Terminal' },
  { path: '/checkout/', title: 'Sola Checkout' },
  { path: '/collect/', title: 'Sola Collect' },
  { path: '/surcharging/', title: 'Surcharging' },
  { path: '/chargebacks/', title: 'Chargeback Management' },
  { path: '/whats-next/', title: "What's next" },
];

// Pages loaded with ?present are slides inside /present: hide page navigation.
const SOLA_PRESENTING = new URLSearchParams(location.search).has('present');
if (SOLA_PRESENTING) document.documentElement.classList.add('present');

function solaNormalizePath(path) {
  path = path.replace(/index\.html$/, '');
  return path.endsWith('/') ? path : path + '/';
}

document.addEventListener('DOMContentLoaded', () => {
  const nav = document.querySelector('.page-nav');
  if (nav) {
    const i = SOLA_PAGES.findIndex(p => p.path === solaNormalizePath(location.pathname));
    const prev = SOLA_PAGES[i - 1];
    const next = SOLA_PAGES[i + 1];
    nav.innerHTML =
      (prev ? `<a href="${prev.path}" rel="prev">&larr; ${prev.title}</a>` : '<span></span>') +
      (next ? `<a href="${next.path}" rel="next">${next.title} &rarr;</a>` : '<a href="/">Back to start</a>');
  }

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
  }
});
