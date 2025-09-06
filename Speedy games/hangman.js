"use strict";

(function () {
  const WORDS = [
    { w: "NEON", hint: "Glowing sign gas" },
    { w: "GALAXY", hint: "Home of stars like the Milky Way" },
    { w: "FUTURE", hint: "Time ahead" },
    { w: "ROBOT", hint: "Programmable machine" },
    { w: "LASER", hint: "Coherent light beam" },
    { w: "PLASMA", hint: "Ionized fourth state of matter" },
    { w: "ORBIT", hint: "Path around a star or planet" },
    { w: "VECTOR", hint: "Quantity with magnitude and direction" },
    { w: "QUANTUM", hint: "Physics of the very small" },
    { w: "CIRCUIT", hint: "Path for electric current" },
  ];
  const canvas = document.getElementById("hangmanCanvas");
  const ctx = canvas.getContext("2d");
  const wordEl = document.getElementById("hangmanWord");
  const lettersEl = document.getElementById("hangmanLetters");
  const wrongEl = document.getElementById("hangmanWrong");
  const msgEl = document.getElementById("hangmanMsg");
  const resetBtn = document.getElementById("hangmanReset");
  const hintSpan = document.getElementById("hangmanHint");
  const musicBtn = document.getElementById("musicBtn");
  const modal = document.getElementById("gameModal");
  const modalTitle = document.getElementById("modalTitle");
  const modalText = document.getElementById("modalText");
  const modalRestart = document.getElementById("modalRestart");

  let target, masked, wrong, used, over;

  function newWord() {
    const pick = WORDS[Math.floor(Math.random() * WORDS.length)];
    target = pick.w;
    masked = Array.from(target).map(() => "_");
    wrong = 0; used = new Set(); over = false;
    updateUI(); drawGallows();
    if (hintSpan) hintSpan.textContent = pick.hint;
  }

  function updateUI() {
    wordEl.textContent = masked.join(" ");
    wrongEl.textContent = String(wrong);
    lettersEl.innerHTML = "";
    for (let i = 65; i <= 90; i++) {
      const ch = String.fromCharCode(i);
      const btn = document.createElement("button");
      btn.className = "btn";
      btn.textContent = ch;
      btn.disabled = used.has(ch) || over;
      btn.addEventListener("click", () => guess(ch));
      lettersEl.appendChild(btn);
    }
    msgEl.textContent = over ? msgEl.textContent : "Press letters on your keyboard";
  }

  function drawGallows() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = "rgba(0,245,255,0.6)"; ctx.lineWidth = 4; ctx.lineCap = "round";
    // base
    ctx.beginPath(); ctx.moveTo(30, 270); ctx.lineTo(390, 270); ctx.stroke();
    // pole
    ctx.beginPath(); ctx.moveTo(90, 270); ctx.lineTo(90, 40); ctx.stroke();
    // top
    ctx.beginPath(); ctx.moveTo(90, 40); ctx.lineTo(250, 40); ctx.stroke();
    // rope
    ctx.beginPath(); ctx.moveTo(250, 40); ctx.lineTo(250, 80); ctx.stroke();

    // draw parts by wrong count
    if (wrong > 0) { ctx.beginPath(); ctx.arc(250, 105, 25, 0, Math.PI*2); ctx.stroke(); }
    if (wrong > 1) { ctx.beginPath(); ctx.moveTo(250, 130); ctx.lineTo(250, 200); ctx.stroke(); }
    if (wrong > 2) { ctx.beginPath(); ctx.moveTo(250, 150); ctx.lineTo(220, 170); ctx.stroke(); }
    if (wrong > 3) { ctx.beginPath(); ctx.moveTo(250, 150); ctx.lineTo(280, 170); ctx.stroke(); }
    if (wrong > 4) { ctx.beginPath(); ctx.moveTo(250, 200); ctx.lineTo(230, 235); ctx.stroke(); }
    if (wrong > 5) { ctx.beginPath(); ctx.moveTo(250, 200); ctx.lineTo(270, 235); ctx.stroke(); }
  }

  function guess(ch) {
    if (over || used.has(ch)) return;
    used.add(ch);
    let hit = false;
    for (let i = 0; i < target.length; i++) {
      if (target[i] === ch) { masked[i] = ch; hit = true; }
    }
    if (!hit) wrong += 1;
    drawGallows();
    if (masked.join("") === target) { over = true; msgEl.textContent = "You win!"; if (modal) { modalTitle.textContent = "You win!"; modalText.textContent = `Word: ${target}`; modal.classList.remove("hidden"); } }
    else if (wrong >= 6) { over = true; msgEl.textContent = `Game Over — Word: ${target}`; if (modal) { modalTitle.textContent = "Game Over"; modalText.textContent = `Word: ${target}`; modal.classList.remove("hidden"); } }
    updateUI();
  }

  window.addEventListener("keydown", (e) => {
    const code = e.key.toUpperCase();
    if (code.length === 1 && code >= 'A' && code <= 'Z') guess(code);
  });
  resetBtn.addEventListener("click", newWord);
  if (modalRestart) modalRestart.addEventListener("click", () => { modal.classList.add("hidden"); newWord(); });
  let music = null; if (typeof createChiptune === 'function' && musicBtn) { music = createChiptune('hangman'); musicBtn.addEventListener("click", () => { if (music.isPlaying()) { music.pause(); musicBtn.textContent = "Music: Off"; } else { music.play(); musicBtn.textContent = "Music: On"; } }); }

  newWord();
})();


