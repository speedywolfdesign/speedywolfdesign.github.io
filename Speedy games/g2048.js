"use strict";

(function () {
  const gridEl = document.getElementById("g2048Grid");
  const scoreEl = document.getElementById("g2048Score");
  const resetBtn = document.getElementById("g2048Reset");
  const musicBtn = document.getElementById("musicBtn");
  const modal = document.getElementById("gameModal");
  const modalTitle = document.getElementById("modalTitle");
  const modalText = document.getElementById("modalText");
  const modalRestart = document.getElementById("modalRestart");

  const size = 4;
  let grid, score, movedFlag;

  function init() {
    grid = Array.from({ length: size }, () => Array(size).fill(0));
    score = 0; updateHUD();
    spawn(); spawn();
    render();
  }

  function updateHUD() { scoreEl.textContent = String(score); }

  function spawn() {
    const empty = [];
    for (let r = 0; r < size; r++) for (let c = 0; c < size; c++) if (grid[r][c] === 0) empty.push([r,c]);
    if (!empty.length) return;
    const [r,c] = empty[Math.floor(Math.random() * empty.length)];
    grid[r][c] = Math.random() < 0.9 ? 2 : 4;
  }

  function render() {
    gridEl.innerHTML = "";
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        const v = grid[r][c];
        const cell = document.createElement("div");
        cell.className = "g2048-cell" + (v ? ` val-${v}` : "");
        cell.textContent = v ? String(v) : "";
        gridEl.appendChild(cell);
      }
    }
  }

  function rotate(times) {
    while (times--) {
      const ng = Array.from({ length: size }, () => Array(size).fill(0));
      for (let r = 0; r < size; r++) for (let c = 0; c < size; c++) ng[c][size-1-r] = grid[r][c];
      grid = ng;
    }
  }

  function slideLeft() {
    movedFlag = false;
    for (let r = 0; r < size; r++) {
      const row = grid[r].filter(v => v !== 0);
      for (let c = 0; c < row.length - 1; c++) {
        if (row[c] === row[c+1]) { row[c] *= 2; score += row[c]; row.splice(c+1, 1); }
      }
      const newRow = [...row, ...Array(size - row.length).fill(0)];
      if (grid[r].join(',') !== newRow.join(',')) movedFlag = true;
      grid[r] = newRow;
    }
  }

  function move(dir) {
    // 0 left, 1 up, 2 right, 3 down
    if (dir === 0) slideLeft();
    if (dir === 2) { rotate(2); slideLeft(); rotate(2); }
    if (dir === 1) { rotate(3); slideLeft(); rotate(1); }
    if (dir === 3) { rotate(1); slideLeft(); rotate(3); }
    if (movedFlag) { spawn(); updateHUD(); render(); checkGameOver(); }
  }

  function checkGameOver() {
    // Check any zero
    for (let r = 0; r < size; r++) for (let c = 0; c < size; c++) if (grid[r][c] === 0) return;
    // Check merges
    for (let r = 0; r < size; r++) for (let c = 0; c < size; c++) {
      const v = grid[r][c];
      if (r+1 < size && grid[r+1][c] === v) return;
      if (c+1 < size && grid[r][c+1] === v) return;
    }
    // Game over
    if (modal) { modalTitle.textContent = "Game Over"; modalText.textContent = `Score: ${score}`; modal.classList.remove("hidden"); }
  }

  window.addEventListener("keydown", (e) => {
    if (e.code === "ArrowLeft") move(0);
    if (e.code === "ArrowUp") move(1);
    if (e.code === "ArrowRight") move(2);
    if (e.code === "ArrowDown") move(3);
  });

  resetBtn.addEventListener("click", init);
  if (modalRestart) modalRestart.addEventListener("click", () => { modal.classList.add("hidden"); init(); });
  let music = null; if (typeof createChiptune === 'function' && musicBtn) { music = createChiptune('g2048'); musicBtn.addEventListener("click", () => { if (music.isPlaying()) { music.pause(); musicBtn.textContent = "Music: Off"; } else { music.play(); musicBtn.textContent = "Music: On"; } }); }
  init();
})();


