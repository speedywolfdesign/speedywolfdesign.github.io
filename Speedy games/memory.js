"use strict";

(function () {
  const icons = ["⚡","💎","🌌","🚀","🧬","🛰","🔮","⚙️"];
  const gridEl = document.getElementById("memoryGrid");
  const movesEl = document.getElementById("memMoves");
  const resetBtn = document.getElementById("memReset");
  const musicBtn = document.getElementById("musicBtn");
  const modal = document.getElementById("gameModal");
  const modalTitle = document.getElementById("modalTitle");
  const modalText = document.getElementById("modalText");
  const modalRestart = document.getElementById("modalRestart");
  const effectsEl = document.getElementById("memEffects");
  const pointsEl = document.getElementById("memPoints");

  let deck, first, second, lock, matches, moves, points;
  let sfx = (typeof createSFX === 'function') ? createSFX() : null;
  const PREVIEW_MS = 3000;

  function reset() {
    deck = shuffle([...icons, ...icons]).map((icon, i) => ({ id: i, icon, matched: false }));
    gridEl.innerHTML = "";
    first = null; second = null; lock = true; matches = 0; moves = 0; movesEl.textContent = "0"; points = 0; if (pointsEl) pointsEl.textContent = "0";
    for (const card of deck) {
      const el = document.createElement("button");
      el.className = "mem-card open"; // show face for preview
      el.setAttribute("data-id", String(card.id));
      el.addEventListener("click", () => flip(card, el));
      const inner = document.createElement("div");
      inner.className = "mem-inner";
      const front = document.createElement("div"); front.className = "mem-front"; front.textContent = card.icon;
      const back = document.createElement("div"); back.className = "mem-back"; back.textContent = "✦";
      inner.appendChild(front); inner.appendChild(back); el.appendChild(inner);
      gridEl.appendChild(el);
    }
    // After preview, hide all and unlock
    setTimeout(() => {
      const all = gridEl.querySelectorAll('.mem-card');
      all.forEach((node) => node.classList.remove('open'));
      lock = false;
    }, PREVIEW_MS);
  }

  function flip(card, el) {
    if (lock || card.matched || el.classList.contains("open")) return;
    el.classList.add("open");
    if (!first) { first = { card, el }; return; }
    second = { card, el }; lock = true; moves += 1; movesEl.textContent = String(moves);
    if (first.card.icon === second.card.icon) {
      first.card.matched = second.card.matched = true; matches += 1; lock = false; first = second = null;
      // Award points and celebrate
      points += 10; if (pointsEl) pointsEl.textContent = String(points);
      if (sfx) sfx.playCoin();
      celebrateMatch();
      if (matches === icons.length && modal) { modalTitle.textContent = "Completed"; modalText.textContent = `Moves: ${moves}`; modal.classList.remove("hidden"); if (sfx) sfx.playWin(); }
    } else {
      setTimeout(() => { first.el.classList.remove("open"); second.el.classList.remove("open"); first = second = null; lock = false; if (sfx) sfx.playCrash(); }, 700);
    }
  }

  function shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }

  resetBtn.addEventListener("click", reset);
  if (modalRestart) modalRestart.addEventListener("click", () => { modal.classList.add("hidden"); reset(); });
  let music = null; if (typeof createChiptune === 'function' && musicBtn) { music = createChiptune('memory'); musicBtn.addEventListener("click", () => { if (music.isPlaying()) { music.pause(); musicBtn.textContent = "Music: Off"; } else { music.play(); musicBtn.textContent = "Music: On"; } }); }
  reset();

  function celebrateMatch() {
    if (!effectsEl) return;
    // Points badge
    const badge = document.createElement('div');
    badge.className = 'mem-points-badge';
    badge.textContent = '+10';
    effectsEl.appendChild(badge);
    setTimeout(() => badge.remove(), 1100);

    // Confetti burst
    const count = 24;
    for (let i = 0; i < count; i++) {
      const c = document.createElement('div');
      c.className = 'confetti';
      c.style.setProperty('--x', `${Math.random()*100}%`);
      c.style.setProperty('--y', `-8px`);
      const dx = (Math.random() - 0.5) * 240;
      const dy = 420 + Math.random() * 160;
      c.style.setProperty('--dx', `${dx}px`);
      c.style.setProperty('--dy', `${dy}px`);
      c.style.setProperty('--rot', `${Math.random()*720 - 360}deg`);
      c.style.setProperty('--dur', `${700 + Math.random()*500}ms`);
      c.style.background = `hsl(${Math.floor(Math.random()*360)}, 80%, 60%)`;
      effectsEl.appendChild(c);
      setTimeout(() => c.remove(), 1400);
    }
  }
})();


