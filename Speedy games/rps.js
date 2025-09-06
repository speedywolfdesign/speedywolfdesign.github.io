"use strict";

(function () {
  const statusEl = document.getElementById("rpsStatus");
  const youEl = document.getElementById("rpsYou");
  const cpuEl = document.getElementById("rpsCpu");
  const resetBtn = document.getElementById("rpsReset");
  const buttons = Array.from(document.querySelectorAll(".rps-buttons .btn"));
  const musicBtn = document.getElementById("musicBtn");
  const modal = document.getElementById("gameModal");
  const modalTitle = document.getElementById("modalTitle");
  const modalText = document.getElementById("modalText");
  const modalRestart = document.getElementById("modalRestart");
  const youEmoji = document.getElementById("rpsYouEmoji");
  const cpuEmoji = document.getElementById("rpsCpuEmoji");

  let you = 0, cpu = 0, over = false;

  function reset() { you = 0; cpu = 0; over = false; statusEl.textContent = "Make your move"; update(); }
  function update() { youEl.textContent = String(you); cpuEl.textContent = String(cpu); }

  function play(move) {
    if (over) return;
    const choices = ["rock","paper","scissors"]; const c = choices[Math.floor(Math.random() * 3)];
    const mapEmoji = { rock: "✊", paper: "✋", scissors: "✌️" };
    const win = (move === "rock" && c === "scissors") || (move === "paper" && c === "rock") || (move === "scissors" && c === "paper");
    const draw = move === c;
    if (youEmoji) youEmoji.textContent = mapEmoji[move];
    if (cpuEmoji) cpuEmoji.textContent = mapEmoji[c];
    if (draw) statusEl.textContent = `Draw — You ${mapEmoji[move]} vs CPU ${mapEmoji[c]}`;
    else if (win) { you += 1; statusEl.textContent = `You win — You ${mapEmoji[move]} vs CPU ${mapEmoji[c]}`; }
    else { cpu += 1; statusEl.textContent = `You lose — You ${mapEmoji[move]} vs CPU ${mapEmoji[c]}`; }
    update();
    if (you >= 5 || cpu >= 5) { over = true; const msg = you > cpu ? "You win the match!" : "CPU wins the match!"; statusEl.textContent += " — " + msg; if (modal) { modalTitle.textContent = "Match Over"; modalText.textContent = msg; modal.classList.remove("hidden"); } }
  }

  buttons.forEach(b => b.addEventListener("click", () => play(b.getAttribute("data-move"))));
  resetBtn.addEventListener("click", reset);
  if (modalRestart) modalRestart.addEventListener("click", () => { modal.classList.add("hidden"); reset(); });
  let music = null; if (typeof createChiptune === 'function' && musicBtn) { music = createChiptune('rps'); musicBtn.addEventListener("click", () => { if (music.isPlaying()) { music.pause(); musicBtn.textContent = "Music: Off"; } else { music.play(); musicBtn.textContent = "Music: On"; } }); }
  reset();
})();


