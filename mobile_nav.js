"use strict";

// Injects a compact mobile top bar with Home (left), Game Title (center), Restart (right)
(function(){
  document.addEventListener("DOMContentLoaded", () => {
    const header = document.querySelector('.app-header');
    if (!header) return;
    // Avoid duplicating
    if (header.querySelector('.mobile-topbar')) return;
    const h1 = header.querySelector('h1');
    const title = (h1 ? h1.textContent : document.title || 'GAME').trim();

    const bar = document.createElement('div');
    bar.className = 'mobile-topbar';
    bar.innerHTML = `
      <a class="mtb-btn" href="index.html" aria-label="Home">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 11l9-7 9 7"/><path d="M9 21V12h6v9"/></svg>
      </a>
      <div class="mtb-title" aria-live="polite">${title}</div>
      <button class="mtb-btn" id="mtbReload" aria-label="Restart">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21 12a9 9 0 1 1-2.64-6.36"/><path d="M21 5v6h-6"/></svg>
      </button>
    `;
    header.appendChild(bar);
    const reloadBtn = bar.querySelector('#mtbReload');
    if (reloadBtn) reloadBtn.addEventListener('click', () => { try { location.reload(); } catch(_) {} });
  });
})();


