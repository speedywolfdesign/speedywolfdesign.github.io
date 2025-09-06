"use strict";

(function () {
  const input = document.getElementById("guessInput");
  const btn = document.getElementById("guessBtn");
  const resetBtn = document.getElementById("resetGuess");
  const musicBtn = document.getElementById("musicBtn");
  const modal = document.getElementById("gameModal");
  const modalTitle = document.getElementById("modalTitle");
  const modalText = document.getElementById("modalText");
  const modalRestart = document.getElementById("modalRestart");
  const msg = document.getElementById("guessMsg");
  const attemptsEl = document.getElementById("attempts");

  let target, attempts;

  function reset() {
    target = 1 + Math.floor(Math.random() * 100);
    attempts = 0;
    attemptsEl.textContent = "0";
    msg.textContent = "Make your first guess!";
    input.value = "";
    input.focus();
  }

  function guess() {
    const v = parseInt(input.value, 10);
    if (!v || v < 1 || v > 100) { msg.textContent = "Enter a number 1–100"; return; }
    attempts += 1; attemptsEl.textContent = String(attempts);
    if (v === target) {
      msg.textContent = `Correct! The number was ${target}. Attempts: ${attempts}.`;
      if (modal) { modalTitle.textContent = "You got it!"; modalText.textContent = `Attempts: ${attempts}`; modal.classList.remove("hidden"); }
    } else if (v < target) {
      msg.textContent = "Too Low";
    } else {
      msg.textContent = "Too High";
    }
    input.select();
  }

  btn.addEventListener("click", guess);
  input.addEventListener("keydown", (e) => { if (e.key === "Enter") guess(); });
  resetBtn.addEventListener("click", reset);
  if (modalRestart) modalRestart.addEventListener("click", () => { modal.classList.add("hidden"); reset(); });
  let music = null; if (typeof createChiptune === 'function' && musicBtn) { music = createChiptune('guess'); musicBtn.addEventListener("click", () => { if (music.isPlaying()) { music.pause(); musicBtn.textContent = "Music: Off"; } else { music.play(); musicBtn.textContent = "Music: On"; } }); }

  reset();
})();


