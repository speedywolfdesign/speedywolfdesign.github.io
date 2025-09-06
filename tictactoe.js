"use strict";

(function () {
  const boardEl = document.getElementById("tttBoard");
  const statusEl = document.getElementById("tttStatus");
  const resetBtn = document.getElementById("tttReset");
  const musicBtn = document.getElementById("musicBtn");
  const modal = document.getElementById("gameModal");
  const modalTitle = document.getElementById("modalTitle");
  const modalText = document.getElementById("modalText");
  const modalRestart = document.getElementById("modalRestart");

  let board, turn, over;
  let sfx = (typeof createSFX === 'function') ? createSFX() : null;

  function init() {
    board = Array(9).fill(0); // 0 empty, 1 X, 2 O
    turn = 1;
    over = false;
    statusEl.textContent = "X to move";
    boardEl.innerHTML = "";
    for (let i = 0; i < 9; i++) {
      const cell = document.createElement("button");
      cell.className = "ttt-cell";
      cell.setAttribute("data-idx", String(i));
      cell.addEventListener("click", () => onClick(i));
      boardEl.appendChild(cell);
    }
  }

  function onClick(i) {
    if (over || board[i] !== 0) return;
    board[i] = turn;
    if (sfx) sfx.playClick();
    render();
    const w = winner();
    if (w) { end(w); return; }
    if (board.every(v => v !== 0)) { end(0); return; }
    turn = 3 - turn;
    statusEl.textContent = turn === 1 ? "X to move" : "O to move";
  }

  function winner() {
    const lines = [
      [0,1,2],[3,4,5],[6,7,8],
      [0,3,6],[1,4,7],[2,5,8],
      [0,4,8],[2,4,6],
    ];
    for (const [a,b,c] of lines) {
      if (board[a] && board[a] === board[b] && board[a] === board[c]) return { player: board[a], line: [a,b,c] };
    }
    return null;
  }

  function end(win) {
    over = true;
    if (win === 0) {
      statusEl.textContent = "Draw!";
      if (sfx) sfx.playCrash();
      if (modal) { modalTitle.textContent = "Draw"; modalText.textContent = "No winner this time."; modal.classList.remove("hidden"); }
    } else {
      statusEl.textContent = (win.player === 1 ? "X" : "O") + " wins!";
      for (const idx of win.line) {
        const cell = boardEl.children[idx];
        cell.classList.add("win");
      }
      if (sfx) sfx.playWin();
      if (modal) { modalTitle.textContent = "Game Over"; modalText.textContent = (win.player === 1 ? "X" : "O") + " wins!"; modal.classList.remove("hidden"); }
    }
  }

  function render() {
    for (let i = 0; i < 9; i++) {
      const cell = boardEl.children[i];
      const v = board[i];
      cell.textContent = v === 1 ? "X" : v === 2 ? "O" : "";
    }
  }

  resetBtn.addEventListener("click", init);
  if (modalRestart) modalRestart.addEventListener("click", () => { modal.classList.add("hidden"); init(); });
  let music = null; if (typeof createChiptune === 'function' && musicBtn) { music = createChiptune('default'); musicBtn.addEventListener("click", () => { if (music.isPlaying()) { music.pause(); musicBtn.textContent = "Music: Off"; } else { music.play(); musicBtn.textContent = "Music: On"; } }); }
  init();
})();


