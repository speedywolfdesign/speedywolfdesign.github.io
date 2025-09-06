"use strict";

(function () {
  const unoNew = document.getElementById("unoNew");
  const unoDraw = document.getElementById("unoDraw");
  const pileEl = document.getElementById("unoDiscard");
  const playerEl = document.getElementById("unoPlayer");
  const cpuEl = document.getElementById("unoCpu");
  const turnEl = document.getElementById("unoTurn");
  const dirEl = document.getElementById("unoDir");
  const modal = document.getElementById("gameModal");
  const modalTitle = document.getElementById("modalTitle");
  const modalText = document.getElementById("modalText");
  const modalRestart = document.getElementById("modalRestart");

  const colors = ["red", "green", "blue", "yellow"]; // Wild has no color
  const numbers = [0,1,2,3,4,5,6,7,8,9];
  const specials = ["skip","reverse","draw2"]; // per color
  const wilds = ["wild","wild4"]; // no color

  let drawPile, discardTop, discardPile, playerHand, cpuHand, isPlayerTurn, dir; // dir: 1 = normal, -1 = reversed

  function newDeck() {
    const deck = [];
    for (const c of colors) {
      deck.push(card(c, 0));
      for (const n of numbers.slice(1)) { deck.push(card(c, n), card(c, n)); }
      for (const s of specials) { deck.push(card(c, s), card(c, s)); }
    }
    for (const w of wilds) { deck.push(card(null, w), card(null, w), card(null, w), card(null, w)); }
    return shuffle(deck);
  }

  function card(color, value) { return { color, value }; }

  function shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }

  function canPlay(c, top) {
    if (!top) return true;
    if (typeof c.value === 'number' && typeof top.value === 'number' && c.value === top.value) return true;
    if (c.color && top.color && c.color === top.color) return true;
    if (typeof c.value === 'string' && (c.value.startsWith('wild') || c.value === top.value)) return true;
    return false;
  }

  function start() {
    drawPile = newDeck();
    playerHand = draw(7);
    cpuHand = draw(7);
    dir = 1; isPlayerTurn = true; updateDir();
    // Ensure first non-wild top card
    do { discardTop = draw(1)[0]; } while (typeof discardTop.value !== 'number');
    discardPile = [discardTop];
    render();
  }

  function draw(n) { const out = []; for (let i=0;i<n;i++){ if (drawPile.length===0) reshuffle(); out.push(drawPile.pop()); } return out; }
  function reshuffle() {
    // Take all but the top from discard pile and reshuffle back into draw pile
    const pool = (discardPile || []).slice(0, -1);
    drawPile = shuffle(pool);
    discardPile = [discardTop];
  }

  function render() {
    // Discard stack (show last up to 5)
    pileEl.innerHTML = "";
    const showCount = Math.min(5, (discardPile || []).length);
    const startIdx = (discardPile || []).length - showCount;
    for (let i = 0; i < showCount; i++) {
      const c = discardPile[startIdx + i];
      const node = renderCard(c, false);
      node.style.position = 'absolute';
      node.style.left = `${i * 10}px`;
      node.style.top = `${i * 2}px`;
      node.disabled = true;
      node.style.pointerEvents = 'none';
      node.style.zIndex = String(100 + i);
      pileEl.appendChild(node);
    }
    // Player
    playerEl.innerHTML = "";
    for (const c of playerHand) playerEl.appendChild(renderCard(c, true));
    // CPU (hidden backs)
    cpuEl.innerHTML = "";
    for (let i=0;i<cpuHand.length;i++) cpuEl.appendChild(renderCardBack());
    // Turn
    turnEl.textContent = isPlayerTurn ? 'Player' : 'CPU';
  }

  function renderCard(c, clickable=false) {
    const el = document.createElement('button');
    el.className = 'uno-card';
    const img = document.createElement('img');
    img.className = 'uno-img';
    img.alt = `${(c.color||'wild').toString()} ${String(c.value)}`;
    img.src = getCardImageSrc(c);
    img.onerror = () => {
      if (c.color === 'red' && c.value === 'reverse') {
        img.onerror = null;
        img.src = encodeURI('uno cards/RED_Reverse.jpg');
      }
    };
    el.appendChild(img);
    if (clickable) {
      el.addEventListener('click', () => playPlayer(c));
    }
    return el;
  }

  function renderCardBack() {
    const el = document.createElement('div');
    el.className = 'uno-card back';
    return el;
  }

  function formatValue(v) {
    if (typeof v === 'number') return String(v);
    if (v === 'skip') return '⛔';
    if (v === 'reverse') return '↻';
    if (v === 'draw2') return '+2';
    if (v === 'wild') return '★';
    if (v === 'wild4') return '+4';
    return String(v);
  }

  function toTitleCase(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : s; }

  function getCardImageSrc(c) {
    if (typeof c.value === 'string' && c.value.startsWith('wild')) {
      if (c.value === 'wild4' || c.value === 'wild_4') return encodeURI('uno cards/Wild_Draw_4.jpg');
      return encodeURI('uno cards/Wild.jpg');
    }
    const color = toTitleCase(c.color);
    if (typeof c.value === 'number') return encodeURI(`uno cards/${color}_${c.value}.jpg`);
    if (c.value === 'draw2') return encodeURI(`uno cards/${color}_Draw_2.jpg`);
    if (c.value === 'skip') return encodeURI(`uno cards/${color}_Skip.jpg`);
    if (c.value === 'reverse') return encodeURI(`uno cards/${color}_Reverse.jpg`);
    return '';
  }

  function playPlayer(c) {
    if (!isPlayerTurn) return;
    if (!canPlay(c, discardTop)) return;
    // Remove from hand
    const idx = playerHand.indexOf(c);
    if (idx >= 0) playerHand.splice(idx,1);
    // Wild color choice (simple prompt)
    if (typeof c.value === 'string' && c.value.startsWith('wild')) {
      const chosen = prompt('Choose color: red, green, blue, yellow', 'red');
      c = { color: (colors.includes(chosen||'')?chosen:'red'), value: c.value };
    }
    discardTop = c;
    if (!discardPile) discardPile = [];
    discardPile.push(c);
    applyEffect(c, 'player');
    if (playerHand.length === 0) { end('You win!'); return; }
    isPlayerTurn = false; render();
    setTimeout(cpuTurn, 600);
  }

  function cpuTurn() {
    // try to play a card
    let playableIdx = cpuHand.findIndex(c => canPlay(c, discardTop));
    if (playableIdx === -1) {
      // draw one, try again
      cpuHand.push(draw(1)[0]);
      playableIdx = cpuHand.findIndex(c => canPlay(c, discardTop));
      if (playableIdx === -1) { isPlayerTurn = true; render(); return; }
    }
    let c = cpuHand.splice(playableIdx, 1)[0];
    if (typeof c.value === 'string' && c.value.startsWith('wild')) {
      // choose color heuristically by most common in hand
      const counts = { red:0, green:0, blue:0, yellow:0 };
      for (const k of cpuHand) if (k.color) counts[k.color]++;
      let best = 'red'; let max = -1; for (const col of colors) { if (counts[col] > max) { max = counts[col]; best = col; } }
      c = { color: best, value: c.value };
    }
    discardTop = c;
    if (!discardPile) discardPile = [];
    discardPile.push(c);
    applyEffect(c, 'cpu');
    if (cpuHand.length === 0) { end('CPU wins!'); return; }
    isPlayerTurn = true; render();
  }

  function applyEffect(c, who) {
    if (typeof c.value === 'number') return;
    if (c.value === 'reverse') { dir *= -1; updateDir(); return; }
    if (c.value === 'skip') { isPlayerTurn = (who === 'player'); return; }
    if (c.value === 'draw2') {
      if (who === 'player') cpuHand.push(...draw(2)); else playerHand.push(...draw(2));
      if (who === 'player') isPlayerTurn = false; else isPlayerTurn = true;
      return;
    }
    if (c.value === 'wild') return;
    if (c.value === 'wild4') { if (who === 'player') cpuHand.push(...draw(4)); else playerHand.push(...draw(4)); if (who === 'player') isPlayerTurn = false; else isPlayerTurn = true; return; }
  }

  function updateDir() { if (dirEl) dirEl.textContent = dir === 1 ? '↻' : '↺'; }

  unoDraw.addEventListener('click', () => {
    if (!isPlayerTurn) return;
    playerHand.push(draw(1)[0]);
    render();
  });

  unoNew.addEventListener('click', start);
  if (modalRestart) modalRestart.addEventListener('click', () => { modal.classList.add('hidden'); start(); });
  function end(msg) { modalTitle.textContent = 'Game Over'; modalText.textContent = msg; modal.classList.remove('hidden'); }

  start();
})();



