"use strict";

(function () {
  const canvas = document.getElementById("brCanvas");
  const ctx = canvas.getContext("2d");
  const scoreEl = document.getElementById("brScore");
  const livesEl = document.getElementById("brLives");
  const resetBtn = document.getElementById("brReset");
  const musicBtn = document.getElementById("musicBtn");
  const modal = document.getElementById("gameModal");
  const modalTitle = document.getElementById("modalTitle");
  const modalText = document.getElementById("modalText");
  const modalRestart = document.getElementById("modalRestart");

  const DPR = Math.min(2, window.devicePixelRatio || 1);
  let vw = 0, vh = 0;
  function resize() {
    const rect = canvas.getBoundingClientRect();
    vw = Math.floor(rect.width);
    vh = Math.floor(rect.height);
    canvas.width = Math.floor(vw * DPR);
    canvas.height = Math.floor(vh * DPR);
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  }
  window.addEventListener("resize", resize);
  resize();

  const paddle = { w: 110, h: 14, x: 0, y: 0, vx: 0, speed: 420 };
  const ball = { x: 0, y: 0, r: 9, vx: 260, vy: -260 };
  let bricks = [], cols = 10, rows = 6, brickW = 64, brickH = 22, brickGap = 6;
  let score = 0, lives = 3, running = true;

  function layout() {
    paddle.x = (vw - paddle.w)/2; paddle.y = vh - 30;
    ball.x = vw/2; ball.y = vh - 60; ball.vx = 260 * (Math.random() < 0.5 ? -1 : 1); ball.vy = -260;
    bricks = [];
    const marginX = (vw - (cols * brickW + (cols - 1) * brickGap)) / 2;
    const marginY = 40;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        bricks.push({
          x: Math.floor(marginX + c * (brickW + brickGap)),
          y: Math.floor(marginY + r * (brickH + brickGap)),
          w: brickW,
          h: brickH,
          alive: true,
        });
      }
    }
    score = 0; lives = 3; updateHUD();
  }

  function updateHUD() { scoreEl.textContent = String(score); livesEl.textContent = String(lives); }

  window.addEventListener("keydown", (e) => { if (e.code === "ArrowLeft") paddle.vx = -paddle.speed; if (e.code === "ArrowRight") paddle.vx = paddle.speed; });
  window.addEventListener("keyup", (e) => { if (e.code === "ArrowLeft" && paddle.vx < 0) paddle.vx = 0; if (e.code === "ArrowRight" && paddle.vx > 0) paddle.vx = 0; });
  resetBtn.addEventListener("click", layout);
  if (modalRestart) modalRestart.addEventListener("click", () => { modal.classList.add("hidden"); layout(); });
  let music = null; let sfx = null; if (typeof createChiptune === 'function' && musicBtn) { music = createChiptune('breakout'); sfx = createSFX(); musicBtn.addEventListener("click", () => { if (music.isPlaying()) { music.pause(); musicBtn.textContent = "Music: Off"; } else { music.play(); musicBtn.textContent = "Music: On"; } }); }

  function step(dt) {
    paddle.x += paddle.vx * dt; paddle.x = Math.max(0, Math.min(vw - paddle.w, paddle.x));
    ball.x += ball.vx * dt; ball.y += ball.vy * dt;
    if (ball.x - ball.r < 0) { ball.x = ball.r; ball.vx *= -1; }
    if (ball.x + ball.r > vw) { ball.x = vw - ball.r; ball.vx *= -1; }
    if (ball.y - ball.r < 0) { ball.y = ball.r; ball.vy *= -1; }
    // Paddle collision
    if (ball.y + ball.r > paddle.y && ball.y - ball.r < paddle.y + paddle.h && ball.x > paddle.x && ball.x < paddle.x + paddle.w && ball.vy > 0) {
      ball.y = paddle.y - ball.r; ball.vy *= -1;
      const rel = (ball.x - (paddle.x + paddle.w/2)) / (paddle.w/2);
      ball.vx = 260 * rel;
    }
    // Brick collisions
    for (const b of bricks) {
      if (!b.alive) continue;
      if (ball.x + ball.r > b.x && ball.x - ball.r < b.x + b.w && ball.y + ball.r > b.y && ball.y - ball.r < b.y + b.h) {
        b.alive = false; score += 10; updateHUD(); if (sfx) sfx.playHit();
        // Reflect depending on side
        const overlapX = Math.min(ball.x + ball.r - b.x, b.x + b.w - (ball.x - ball.r));
        const overlapY = Math.min(ball.y + ball.r - b.y, b.y + b.h - (ball.y - ball.r));
        if (overlapX < overlapY) ball.vx *= -1; else ball.vy *= -1;
        break;
      }
    }
    if (ball.y - ball.r > vh) {
      lives -= 1; updateHUD();
      if (lives <= 0) { if (modal) { modalTitle.textContent = "Game Over"; modalText.textContent = `Score: ${score}`; modal.classList.remove("hidden"); } layout(); return; }
      ball.x = vw/2; ball.y = vh - 60; ball.vx = 240 * (Math.random() < 0.5 ? -1 : 1); ball.vy = -240;
    }
  }

  function draw() {
    ctx.fillStyle = "rgba(10, 15, 31, 1)"; ctx.fillRect(0, 0, vw, vh);
    // paddle
    ctx.fillStyle = "#00f5ff"; ctx.shadowColor = "rgba(0,245,255,0.6)"; ctx.shadowBlur = 12;
    ctx.fillRect(paddle.x, paddle.y, paddle.w, paddle.h); ctx.shadowBlur = 0;
    // ball
    ctx.beginPath(); ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI*2); ctx.closePath(); ctx.fillStyle = "#fff"; ctx.fill();
    // bricks
    for (const b of bricks) {
      if (!b.alive) continue; ctx.fillStyle = "#152456"; ctx.fillRect(b.x, b.y, b.w, b.h);
      ctx.strokeStyle = "rgba(0,245,255,0.35)"; ctx.lineWidth = 2; ctx.strokeRect(b.x+1, b.y+1, b.w-2, b.h-2);
    }
  }

  let last = performance.now();
  function loop(ts) {
    const dt = Math.min(0.033, (ts - last)/1000); last = ts; step(dt); draw(); requestAnimationFrame(loop);
  }

  layout(); requestAnimationFrame(loop);
})();


