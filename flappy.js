"use strict";

(function () {
  const canvas = document.getElementById("flappyCanvas");
  const scoreText = document.getElementById("scoreText");
  const bestText = document.getElementById("bestText");
  const speedText = document.getElementById("speedText");
  const hint = document.getElementById("flappyHint");
  const restartBtn = document.getElementById("restartBtn");
  const musicBtn = document.getElementById("musicBtn");
  const modal = document.getElementById("gameModal");
  const modalRestart = document.getElementById("modalRestart");

  const ctx = canvas.getContext("2d");

  const DPR = Math.min(2, window.devicePixelRatio || 1);
  const WORLD = { width: 800, height: 520 };
  let viewWidth = 0, viewHeight = 0;

  function resize() {
    const rect = canvas.getBoundingClientRect();
    viewWidth = Math.floor(rect.width);
    viewHeight = Math.floor(rect.height);
    canvas.width = Math.floor(viewWidth * DPR);
    canvas.height = Math.floor(viewHeight * DPR);
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  }
  window.addEventListener("resize", resize);
  resize();

  // Game state
  let bird, pipes, score, best, running, speedScale, passesSinceSpeedUp;
  const gravity = 1400; // px/s^2
  const flapImpulse = -380; // px/s
  const pipeGapBase = 160; // base gap
  const pipeWidth = 66; // px
  const spawnInterval = 1400; // ms
  let spawnTimer = 0;

  function resetGame() {
    bird = { x: viewWidth * 0.28, y: viewHeight * 0.45, vy: 0, r: 16 };
    pipes = [];
    score = 0;
    speedScale = 1.0;
    passesSinceSpeedUp = 0;
    spawnTimer = 0;
    running = false;
    hint.style.opacity = 0.9;
    updateHUD();
    draw(0); // initial draw
  }

  function updateHUD() {
    scoreText.textContent = String(score);
    best = Math.max(best || 0, score);
    bestText.textContent = String(best);
    speedText.textContent = `${speedScale.toFixed(1)}x`;
  }

  function flap() {
    if (!running) {
      running = true;
      hint.style.opacity = 0;
      lastTime = performance.now();
      requestAnimationFrame(loop);
    }
    bird.vy = flapImpulse;
  }

  // Controls
  window.addEventListener("keydown", (e) => {
    if (e.code === "Space" || e.code === "ArrowUp") {
      e.preventDefault(); flap();
    }
  });
  canvas.addEventListener("pointerdown", flap);
  restartBtn.addEventListener("click", resetGame);
  if (modalRestart) modalRestart.addEventListener("click", () => { modal.classList.add("hidden"); resetGame(); });
  let music = null; let sfx = null; if (typeof createChiptune === 'function' && musicBtn) {
    music = createChiptune('flappy'); sfx = createSFX();
    musicBtn.addEventListener("click", () => { if (music.isPlaying()) { music.pause(); musicBtn.textContent = "Music: Off"; } else { music.play(); musicBtn.textContent = "Music: On"; } });
  }

  // Pipes
  function spawnPipePair() {
    const gap = pipeGapBase - Math.min(60, (speedScale - 1) * 40);
    const minTop = 40;
    const maxTop = viewHeight - (gap + 60);
    const topY = minTop + Math.random() * (maxTop - minTop);
    const x = viewWidth + 40;
    const speed = 180 * speedScale; // px/s
    pipes.push({ x, width: pipeWidth, top: topY, bottom: topY + gap, speed, scored: false });
  }

  function updatePipes(dt) {
    for (const p of pipes) {
      p.x -= p.speed * dt;
    }
    // Remove off-screen
    while (pipes.length && pipes[0].x + pipes[0].width < -60) pipes.shift();
    // Spawn new
    if (spawnTimer <= 0) {
      spawnPipePair();
      spawnTimer = spawnInterval / speedScale;
    } else {
      spawnTimer -= dt * 1000;
    }
  }

  function checkCollisions() {
    // Ground / ceiling
    if (bird.y + bird.r >= viewHeight - 2 || bird.y - bird.r <= 0) { if (sfx) sfx.playCrash(); return true; }
    // Pipes
    for (const p of pipes) {
      if (bird.x + bird.r > p.x && bird.x - bird.r < p.x + p.width) {
        if (bird.y - bird.r < p.top || bird.y + bird.r > p.bottom) { if (sfx) sfx.playCrash(); return true; }
      }
      // Scoring when passing fully
      if (!p.scored && p.x + p.width < bird.x - bird.r) {
        p.scored = true;
        score += 1; if (sfx) sfx.playCoin();
        passesSinceSpeedUp += 1;
        if (passesSinceSpeedUp % 10 === 0) {
          speedScale = Math.min(3.0, speedScale + 0.2);
        }
        updateHUD();
      }
    }
    return false;
  }

  function drawBackground() {
    const g1 = ctx.createLinearGradient(0, 0, 0, viewHeight);
    g1.addColorStop(0, "rgba(106, 92, 255, 0.15)");
    g1.addColorStop(1, "rgba(0, 245, 255, 0.08)");
    ctx.fillStyle = g1;
    ctx.fillRect(0, 0, viewWidth, viewHeight);

    // Grid lines for neon vibe
    ctx.strokeStyle = "rgba(255,255,255,0.06)";
    ctx.lineWidth = 1;
    for (let y = 40; y < viewHeight; y += 40) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(viewWidth, y);
      ctx.stroke();
    }
  }

  function drawBird() {
    // Neon circle bird
    ctx.beginPath();
    ctx.arc(bird.x, bird.y, bird.r, 0, Math.PI * 2);
    ctx.closePath();
    ctx.fillStyle = "rgba(255,255,255,0.9)";
    ctx.fill();
    ctx.shadowColor = "rgba(0,245,255,0.8)";
    ctx.shadowBlur = 18;
    ctx.strokeStyle = "rgba(0,245,255,0.7)";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.shadowBlur = 0;
  }

  function drawPipes() {
    for (const p of pipes) {
      // Top pipe
      ctx.fillStyle = "rgba(21, 36, 86, 0.96)";
      ctx.fillRect(p.x, 0, p.width, p.top);
      // Bottom pipe
      ctx.fillRect(p.x, p.bottom, p.width, viewHeight - p.bottom);
      // Neon edges
      ctx.strokeStyle = "rgba(0,245,255,0.35)";
      ctx.lineWidth = 2;
      ctx.strokeRect(p.x + 1, 0 + 1, p.width - 2, p.top - 2);
      ctx.strokeRect(p.x + 1, p.bottom + 1, p.width - 2, viewHeight - p.bottom - 2);
      // Glow
      ctx.shadowColor = "rgba(106,92,255,0.45)";
      ctx.shadowBlur = 10;
      ctx.strokeRect(p.x + 3, 0 + 3, p.width - 6, p.top - 6);
      ctx.strokeRect(p.x + 3, p.bottom + 3, p.width - 6, viewHeight - p.bottom - 6);
      ctx.shadowBlur = 0;
    }
  }

  function draw(dt) {
    ctx.clearRect(0, 0, viewWidth, viewHeight);
    drawBackground();
    drawPipes();
    drawBird();
  }

  let lastTime = 0;
  function loop(ts) {
    if (!running) return;
    const dt = Math.min(0.033, (ts - lastTime) / 1000);
    lastTime = ts;

    // Physics
    bird.vy += gravity * dt;
    bird.y += bird.vy * dt;

    updatePipes(dt);
    draw(dt);

    if (checkCollisions()) {
      running = false;
      updateHUD();
      hint.textContent = "Game Over — Click / Tap / Space to restart";
      hint.style.opacity = 0.95;
      if (modal) modal.classList.remove("hidden");
      if (sfx) sfx.playLose();
      return;
    }
    requestAnimationFrame(loop);
  }

  // Init
  best = parseInt(localStorage.getItem("neonFlappyBest") || "0", 10) || 0;
  function saveBest() { localStorage.setItem("neonFlappyBest", String(best)); }
  const saveInterval = setInterval(() => { if (best) saveBest(); }, 2000);
  window.addEventListener("beforeunload", saveBest);

  resetGame();
})();


