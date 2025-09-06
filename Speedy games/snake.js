"use strict";

(function () {
  const canvas = document.getElementById("snakeCanvas");
  const scoreEl = document.getElementById("snakeScore");
  const bestEl = document.getElementById("snakeBest");
  const speedEl = document.getElementById("snakeSpeed");
  const hintEl = document.getElementById("snakeHint");
  const restartBtn = document.getElementById("restartBtn");
  const musicBtn = document.getElementById("musicBtn");
  const modal = document.getElementById("gameModal");
  const modalRestart = document.getElementById("modalRestart");

  const ctx = canvas.getContext("2d");
  const DPR = Math.min(2, window.devicePixelRatio || 1);

  let cols = 28, rows = 20, cell = 24;
  function resize() {
    const rect = canvas.getBoundingClientRect();
    const targetWidth = Math.min(rect.width, 800);
    cell = Math.floor(targetWidth / cols);
    canvas.width = Math.floor(cols * cell * DPR);
    canvas.height = Math.floor(rows * cell * DPR);
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    canvas.style.height = `${rows * cell}px`;
  }
  window.addEventListener("resize", resize);
  resize();

  let snake, dir, pendingDir, food, score, best, speedScale, tickMs, accMs, alive;

  function reset() {
    snake = [ {x: Math.floor(cols/2), y: Math.floor(rows/2)} ];
    dir = {x: 1, y: 0};
    pendingDir = dir;
    spawnFood();
    score = 0; speedScale = 1.0; tickMs = 160; accMs = 0; alive = true;
    updateHUD();
    draw();
  }

  function updateHUD() {
    scoreEl.textContent = String(score);
    best = Math.max(best || 0, score);
    bestEl.textContent = String(best);
    speedEl.textContent = `${speedScale.toFixed(1)}x`;
  }

  function spawnFood() {
    while (true) {
      const x = Math.floor(Math.random() * cols);
      const y = Math.floor(Math.random() * rows);
      if (!snake.some(s => s.x === x && s.y === y)) { food = {x, y}; return; }
    }
  }

  window.addEventListener("keydown", (e) => {
    if (!alive && (e.code === "Space" || e.code === "Enter")) { reset(); return; }
    if (e.code === "ArrowUp" && dir.y !== 1) pendingDir = {x:0, y:-1};
    else if (e.code === "ArrowDown" && dir.y !== -1) pendingDir = {x:0, y:1};
    else if (e.code === "ArrowLeft" && dir.x !== 1) pendingDir = {x:-1, y:0};
    else if (e.code === "ArrowRight" && dir.x !== -1) pendingDir = {x:1, y:0};
  });
  restartBtn.addEventListener("click", reset);
  if (modalRestart) modalRestart.addEventListener("click", () => { modal.classList.add("hidden"); reset(); });
  let music = null; let sfx = null; if (typeof createChiptune === 'function' && musicBtn) {
    music = createChiptune('snake'); sfx = createSFX(); musicBtn.addEventListener("click", () => { if (music.isPlaying()) { music.pause(); musicBtn.textContent = "Music: Off"; } else { music.play(); musicBtn.textContent = "Music: On"; } });
  }

  let last = performance.now();
  function loop(ts) {
    const dt = Math.min(0.05, (ts - last) / 1000);
    last = ts;
    if (alive) {
      accMs += dt * 1000;
      while (accMs >= tickMs) {
        accMs -= tickMs;
        step();
      }
    }
    draw();
    requestAnimationFrame(loop);
  }

  function step() {
    dir = pendingDir;
    const head = { x: snake[0].x + dir.x, y: snake[0].y + dir.y };
    // Wall collide
    if (head.x < 0 || head.y < 0 || head.x >= cols || head.y >= rows) { if (sfx) sfx.playCrash(); gameOver(); return; }
    // Self collide
    if (snake.some(s => s.x === head.x && s.y === head.y)) { if (sfx) sfx.playCrash(); gameOver(); return; }
    snake.unshift(head);
    if (head.x === food.x && head.y === food.y) {
      score += 1; updateHUD(); spawnFood();
      if (score % 10 === 0) { speedScale = Math.min(3.0, speedScale + 0.2); tickMs = Math.max(70, tickMs - 12); }
    } else {
      snake.pop();
    }
  }

  function gameOver() {
    alive = false;
    hintEl.textContent = "Game Over — Press Space/Enter or click New Game";
    if (modal) modal.classList.remove("hidden");
  }

  function drawGrid() {
    ctx.fillStyle = "rgba(10, 15, 31, 1)";
    ctx.fillRect(0, 0, cols * cell, rows * cell);
    ctx.strokeStyle = "rgba(255,255,255,0.05)";
    for (let y = 0; y <= rows; y++) {
      ctx.beginPath(); ctx.moveTo(0, y*cell); ctx.lineTo(cols*cell, y*cell); ctx.stroke();
    }
    for (let x = 0; x <= cols; x++) {
      ctx.beginPath(); ctx.moveTo(x*cell, 0); ctx.lineTo(x*cell, rows*cell); ctx.stroke();
    }
  }

  function draw() {
    drawGrid();
    // Food
    ctx.fillStyle = "#ff00d4";
    ctx.shadowColor = "rgba(255,0,212,0.7)"; ctx.shadowBlur = 12;
    ctx.fillRect(food.x*cell+4, food.y*cell+4, cell-8, cell-8);
    ctx.shadowBlur = 0;
    // Snake
    for (let i = 0; i < snake.length; i++) {
      const s = snake[i];
      const c = i === 0 ? "#00f5ff" : "#6a5cff";
      ctx.fillStyle = c;
      ctx.shadowColor = c; ctx.shadowBlur = 10;
      ctx.fillRect(s.x*cell+2, s.y*cell+2, cell-4, cell-4);
      ctx.shadowBlur = 0;
    }
  }

  // Best score persistence
  best = parseInt(localStorage.getItem("neonSnakeBest") || "0", 10) || 0;
  function saveBest() { localStorage.setItem("neonSnakeBest", String(Math.max(best, score))); }
  setInterval(saveBest, 2000);
  window.addEventListener("beforeunload", saveBest);

  reset();
  requestAnimationFrame(loop);
})();


