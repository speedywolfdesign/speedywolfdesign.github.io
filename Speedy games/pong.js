"use strict";

(function () {
  const canvas = document.getElementById("pongCanvas");
  const ctx = canvas.getContext("2d");
  const leftEl = document.getElementById("pongLeft");
  const rightEl = document.getElementById("pongRight");
  const restartBtn = document.getElementById("pongRestart");
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

  const paddleW = 14, paddleH = 100, ballR = 10, paddleSpeed = 360, ballSpeed = 280;
  let left = { x: 24, y: (vh - paddleH)/2, vy: 0 };
  let right = { x:  vw - 24 - paddleW, y: (vh - paddleH)/2, vy: 0 };
  let ball = { x: vw/2, y: vh/2, vx: ballSpeed, vy: ballSpeed * 0.25 };
  let score = { l: 0, r: 0 };
  let running = true;

  function resetBall(toLeft) {
    ball.x = vw/2; ball.y = vh/2;
    const dirX = toLeft ? -1 : 1;
    const angle = (Math.random() * 0.6 - 0.3);
    ball.vx = dirX * (ballSpeed + Math.random() * 40);
    ball.vy = (ballSpeed * 0.6) * angle;
  }

  window.addEventListener("keydown", (e) => {
    if (e.code === "KeyW") left.vy = -paddleSpeed;
    if (e.code === "KeyS") left.vy = paddleSpeed;
    if (e.code === "ArrowUp") right.vy = -paddleSpeed;
    if (e.code === "ArrowDown") right.vy = paddleSpeed;
  });
  window.addEventListener("keyup", (e) => {
    if (e.code === "KeyW" || e.code === "KeyS") left.vy = 0;
    if (e.code === "ArrowUp" || e.code === "ArrowDown") right.vy = 0;
  });
  restartBtn.addEventListener("click", () => { score.l = 0; score.r = 0; updateHUD(); if (modal) modal.classList.add("hidden"); resetBall(Math.random()<0.5); });
  if (modalRestart) modalRestart.addEventListener("click", () => { score.l = 0; score.r = 0; updateHUD(); modal.classList.add("hidden"); resetBall(Math.random()<0.5); });
  let music = null; let sfx = null; if (typeof createChiptune === 'function' && musicBtn) { music = createChiptune('pong'); sfx = createSFX(); musicBtn.addEventListener("click", () => { if (music.isPlaying()) { music.pause(); musicBtn.textContent = "Music: Off"; } else { music.play(); musicBtn.textContent = "Music: On"; } }); }

  function updateHUD() { leftEl.textContent = String(score.l); rightEl.textContent = String(score.r); }

  function step(dt) {
    left.y += left.vy * dt; right.y += right.vy * dt;
    left.y = Math.max(0, Math.min(vh - paddleH, left.y));
    right.y = Math.max(0, Math.min(vh - paddleH, right.y));

    ball.x += ball.vx * dt; ball.y += ball.vy * dt;
    if (ball.y - ballR < 0) { ball.y = ballR; ball.vy *= -1; }
    if (ball.y + ballR > vh) { ball.y = vh - ballR; ball.vy *= -1; }

    // Paddle collisions
    if (ball.x - ballR < left.x + paddleW && ball.y > left.y && ball.y < left.y + paddleH) {
      ball.x = left.x + paddleW + ballR;
      const rel = (ball.y - (left.y + paddleH/2)) / (paddleH/2);
      ball.vx = Math.abs(ball.vx) * 1.05;
      ball.vx *= 1; // ensure positive
      ball.vy = 260 * rel;
    }
    if (ball.x + ballR > right.x && ball.y > right.y && ball.y < right.y + paddleH) {
      ball.x = right.x - ballR;
      const rel = (ball.y - (right.y + paddleH/2)) / (paddleH/2);
      ball.vx = -Math.abs(ball.vx) * 1.05;
      ball.vy = 260 * rel;
    }

    // Scoring
    if (ball.x < -40) { score.r += 1; if (sfx) sfx.playCrash(); updateHUD(); endCheck(); resetBall(false); }
    if (ball.x > vw + 40) { score.l += 1; if (sfx) sfx.playCrash(); updateHUD(); endCheck(); resetBall(true); }
  }

  function endCheck() {
    const winScore = 7;
    if (score.l >= winScore || score.r >= winScore) {
      if (modal) {
        modalTitle.textContent = "Match Over";
        modalText.textContent = score.l > score.r ? "Left player wins!" : "Right player wins!";
        modal.classList.remove("hidden");
      }
    }
  }

  function draw() {
    // background
    ctx.fillStyle = "rgba(10, 15, 31, 1)"; ctx.fillRect(0, 0, vw, vh);
    // center line
    ctx.strokeStyle = "rgba(255,255,255,0.12)"; ctx.setLineDash([10, 12]);
    ctx.beginPath(); ctx.moveTo(vw/2, 0); ctx.lineTo(vw/2, vh); ctx.stroke(); ctx.setLineDash([]);
    // paddles
    ctx.fillStyle = "#00f5ff"; ctx.shadowColor = "rgba(0,245,255,0.6)"; ctx.shadowBlur = 10;
    ctx.fillRect(left.x, left.y, paddleW, paddleH);
    ctx.fillRect(right.x, right.y, paddleW, paddleH);
    ctx.shadowBlur = 0;
    // ball
    ctx.beginPath(); ctx.arc(ball.x, ball.y, ballR, 0, Math.PI*2); ctx.closePath();
    ctx.fillStyle = "#ffffff"; ctx.shadowColor = "rgba(106,92,255,0.6)"; ctx.shadowBlur = 14; ctx.fill(); ctx.shadowBlur = 0;
  }

  let last = performance.now();
  function loop(ts) {
    const dt = Math.min(0.033, (ts - last)/1000); last = ts;
    step(dt); draw(); requestAnimationFrame(loop);
  }

  function layout() {
    right.x = vw - 24 - paddleW; left.y = (vh - paddleH)/2; right.y = (vh - paddleH)/2; resetBall(Math.random()<0.5);
  }
  layout(); updateHUD(); requestAnimationFrame(loop);
})();


