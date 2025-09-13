"use strict";

(function(){
  const canvas = document.getElementById("tacticsCanvas");
  const ctx = canvas.getContext("2d");
  const objCount = document.getElementById("objCount");
  const objTotal = document.getElementById("objTotal");
  const hpText = document.getElementById("hpText");
  const hpFill = document.getElementById("hpFill");
  const scoreText = document.getElementById("scoreText");
  const stageText = document.getElementById("stageText");
  const musicBtn = document.getElementById("musicBtn");
  const resetBtn = document.getElementById("tacReset");
  const modal = document.getElementById("gameModal");
  const modalTitle = document.getElementById("modalTitle");
  const modalText = document.getElementById("modalText");
  const modalRestart = document.getElementById("modalRestart");

  const DPR = Math.min(2, window.devicePixelRatio || 1);
  let vw = 0, vh = 0;
  function resize(){
    const rect = canvas.getBoundingClientRect();
    vw = Math.floor(rect.width); vh = Math.floor(rect.height);
    canvas.width = Math.floor(vw * DPR); canvas.height = Math.floor(vh * DPR);
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    // Re-sync grid size with current TILE
    MAP_W = Math.max(8, Math.floor(vw / TILE)) || MAP_W;
    MAP_H = Math.max(6, Math.floor(vh / TILE)) || MAP_H;
  }
  // Defer attaching resize until after TILE is defined

  // Map: 0 floor, 1 wall, 2 crate
  let TILE = 40; // will scale with stages later
  let MAP_W = Math.floor(vw / TILE) || 20;
  let MAP_H = Math.floor(vh / TILE) || 14;
  let MAP = [];

  // Entities
  const player = { x: 2, y: 2, r: 14, hp: 100, maxHits: 5, hits: 0, color: "#2c7be5", facing: 0 };
  let enemies = [];
  const bullets = [];
  let score = 0;
  let stage = 1;

  // Input
  const keys = new Set();
  let planning = false; // Hold Shift to show path preview

  // Audio
  let music = null; let sfx = null;
  if (typeof createChiptune === 'function') {
    music = createChiptune('default');
    sfx = createSFX();
  }
  if (musicBtn) {
    musicBtn.addEventListener('click', () => {
      if (music && music.isPlaying()) { music.pause(); musicBtn.textContent = 'Music: Off'; }
      else if (music) { music.play(); musicBtn.textContent = 'Music: On'; }
    });
  }

  function genMap(){
    // Recompute grid dimensions to match current TILE and viewport
    MAP_W = Math.max(8, Math.floor(vw / TILE)) || MAP_W;
    MAP_H = Math.max(6, Math.floor(vh / TILE)) || MAP_H;
    MAP = Array.from({length: MAP_H}, (_,y) => Array.from({length: MAP_W}, (_,x) => {
      // No gray walls; only crates as obstacles
      if (Math.random() < 0.10) return 2; // crates
      return 0;
    }));
    // Ensure spawn area clear
    for (let y=1;y<5;y++) for (let x=1;x<6;x++) MAP[y][x] = 0;
  }

  // Now that TILE is initialized, attach resize and run once
  window.addEventListener("resize", resize); resize();

  function spawnEnemies(n = 10){
    enemies = [];
    let placed = 0; let guard = 0;
    while (placed < n && guard++ < 2000) {
      const x = Math.floor(Math.random() * MAP_W);
      const y = Math.floor(Math.random() * MAP_H);
      if (MAP[y] && MAP[y][x] === 0 && (x+y) % 2 === 0 && (x>8 || y>6)) {
        enemies.push({
          x: x + 0.5,
          y: y + 0.5,
          r: 13,
          hp: 60,
          color: "#ff4d6d",
          vx: 0,
          vy: 0,
          cooldown: 0,
          state: 'patrol',
          facing: Math.random() * Math.PI * 2,
          anchorX: x + 0.5,
          anchorY: y + 0.5,
          targetX: x + 0.5,
          targetY: y + 0.5,
          fov: Math.PI * 0.7, // ~126 degrees
          visionRange: 2.5,    // tiles (further reduced)
          speedPatrol: 2.0,    // tiles/sec (more active patrol)
          speedChase: 3.0      // tiles/sec
          ,repathTimer: 1.5 + Math.random()*1.5
        });
        placed++;
      }
    }
  }

  function reset(){
    genMap();
    player.x = 2.5; player.y = 2.5; player.hp = 100;
    const enemyCount = Math.min(5 + (stage-1)*2, 10);
    spawnEnemies(enemyCount);
    if (objTotal) objTotal.textContent = String(enemies.length);
    if (objCount) objCount.textContent = String(0);
    if (hpText) hpText.textContent = String(player.hp);
    if (hpFill) hpFill.style.width = '100%';
    if (scoreText) scoreText.textContent = String(score);
    if (stageText) stageText.textContent = String(stage);
    bullets.length = 0;
    if (modal) modal.classList.add('hidden');
  }

  if (resetBtn) resetBtn.addEventListener('click', reset);
  if (modalRestart) modalRestart.addEventListener('click', () => { if (modal) modal.classList.add('hidden'); reset(); });

  // LOS test: Bresenham line sampling for obstacles
  function hasLOS(x0, y0, x1, y1){
    const steps = Math.max(Math.abs(x1-x0), Math.abs(y1-y0)) * 3;
    for (let i=1;i<steps;i++){
      const t = i/steps;
      const x = x0 + (x1-x0)*t, y = y0 + (y1-y0)*t;
      const gx = Math.floor(x), gy = Math.floor(y);
      if (MAP[gy] && (MAP[gy][gx] === 1 || MAP[gy][gx] === 2)) return false; // wall or crate blocks
    }
    return true;
  }

  function shoot(from, to, speed = 12, friendly = true){
    const dx = to.x - from.x, dy = to.y - from.y; const len = Math.max(0.0001, Math.hypot(dx,dy));
    const vx = (dx/len) * speed, vy = (dy/len) * speed;
    bullets.push({ x: from.x, y: from.y, vx, vy, friendly, life: 2.0 });
    if (sfx) sfx.playHit();
  }

  // Input
  window.addEventListener('keydown', (e)=>{
    keys.add(e.code);
    if (e.code === 'Space') {
      // Shoot in movement/facing direction
      const sx = player.x*TILE+TILE/2, sy = player.y*TILE+TILE/2;
      const dist = 800; // px ahead
      const tx = sx + Math.cos(player.facing) * dist;
      const ty = sy + Math.sin(player.facing) * dist;
      shoot({ x: sx, y: sy }, { x: tx, y: ty }, 14, true);
      e.preventDefault();
    }
    if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') planning = true;
  });
  window.addEventListener('keyup', (e)=>{
    keys.delete(e.code);
    if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') planning = false;
  });
  canvas.addEventListener('mousedown', (e)=>{
    const rect = canvas.getBoundingClientRect();
    const mx = (e.clientX - rect.left); const my = (e.clientY - rect.top);
    // Also align facing to click direction
    player.facing = Math.atan2(my - (player.y*TILE+TILE/2), mx - (player.x*TILE+TILE/2));
    shoot({ x: player.x*TILE+TILE/2, y: player.y*TILE+TILE/2 }, { x: mx, y: my }, 14, true);
  });

  const mouse = { x: 0, y: 0 };
  canvas.addEventListener('mousemove', (e)=>{
    const rect = canvas.getBoundingClientRect(); mouse.x = (e.clientX - rect.left); mouse.y = (e.clientY - rect.top);
  });
  // Keep focus for keyboard
  function ensureFocus(){ try { canvas.focus(); } catch(_){} }
  ensureFocus();
  canvas.addEventListener('pointerdown', ensureFocus);

  // Prevent page scroll on game keys
  window.addEventListener('keydown', (e)=>{
    if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space','KeyW','KeyA','KeyS','KeyD'].includes(e.code)) e.preventDefault();
  }, { passive: false });

  function update(dt){
    // Movement
    const mv = { x: 0, y: 0 };
    if (keys.has('KeyW') || keys.has('ArrowUp')) mv.y -= 1;
    if (keys.has('KeyS') || keys.has('ArrowDown')) mv.y += 1;
    if (keys.has('KeyA') || keys.has('ArrowLeft')) mv.x -= 1;
    if (keys.has('KeyD') || keys.has('ArrowRight')) mv.x += 1;
    const speed = 4.0;
    const nx = player.x + mv.x * speed * dt;
    const ny = player.y + mv.y * speed * dt;
    // Update facing if moving
    if (mv.x !== 0 || mv.y !== 0) player.facing = Math.atan2(mv.y, mv.x);
    // Collision against walls/crates (0=floor passable, 1/2 blocked)
    {
      const ry = Math.floor(player.y), rx = Math.floor(nx);
      const t = (MAP[ry] && typeof MAP[ry][rx] !== 'undefined') ? MAP[ry][rx] : 2; // out-of-bounds blocks
      if (t === 0) player.x = nx;
    }
    {
      const ry2 = Math.floor(ny), rx2 = Math.floor(player.x);
      const t2 = (MAP[ry2] && typeof MAP[ry2][rx2] !== 'undefined') ? MAP[ry2][rx2] : 2; // out-of-bounds blocks
      if (t2 === 0) player.y = ny;
    }

    // Helper: passable tile check
    const isPassable = (tx, ty) => (MAP[ty] && MAP[ty][tx] === 0);
    // Move entity with collision similar to player
    function moveEntity(ent, nx, ny) {
      const ry = Math.floor(ent.y), rx = Math.floor(nx);
      const t = (MAP[ry] && typeof MAP[ry][rx] !== 'undefined') ? MAP[ry][rx] : 2; // block outside
      if (t === 0) ent.x = nx;
      const ry2 = Math.floor(ny), rx2 = Math.floor(ent.x);
      const t2 = (MAP[ry2] && typeof MAP[ry2][rx2] !== 'undefined') ? MAP[ry2][rx2] : 2; // block outside
      if (t2 === 0) ent.y = ny;
    }

    // Enemies AI (FOV + LOS, patrol and chase)
    for (const e of enemies){
      if (e.hp <= 0) continue;
      // Update facing based on movement if moving
      if (Math.abs(e.vx) > 0.001 || Math.abs(e.vy) > 0.001) e.facing = Math.atan2(e.vy, e.vx);

      const dxT = player.x - e.x, dyT = player.y - e.y;
      const distT = Math.hypot(dxT, dyT);
      const seesLOS = distT <= e.visionRange && hasLOS(e.x, e.y, player.x, player.y);
      // Angle check
      let inFOV = false;
      if (seesLOS) {
        const dirDot = (Math.cos(e.facing) * dxT + Math.sin(e.facing) * dyT) / (distT || 1);
        const angleDiff = Math.acos(Math.max(-1, Math.min(1, dirDot)));
        inFOV = angleDiff <= e.fov * 0.5;
      }

      if (seesLOS && inFOV) {
        // Chase and shoot
        e.state = 'chase';
        const ang = Math.atan2(dyT, dxT); e.facing = ang;
        const sp = e.speedChase;
        e.vx = Math.cos(ang) * sp;
        e.vy = Math.sin(ang) * sp;
        // Fire with cooldown
        if (e.cooldown <= 0) {
          shoot({ x: e.x*TILE+TILE/2, y: e.y*TILE+TILE/2 }, { x: player.x*TILE+TILE/2, y: player.y*TILE+TILE/2 }, 11, false);
          e.cooldown = 0.6 + Math.random() * 0.5;
        }
      } else {
        // Patrol: move towards a local target around anchor
        e.repathTimer -= dt;
        if (e.state !== 'patrol' || !e.targetX || Math.hypot(e.x - e.targetX, e.y - e.targetY) < 0.2 || e.repathTimer <= 0) {
          e.state = 'patrol';
          const rad = 3.0;
          let tries = 0;
          while (tries++ < 20) {
            const tx = e.anchorX + (Math.random()*2 - 1) * rad;
            const ty = e.anchorY + (Math.random()*2 - 1) * rad;
            const gx = Math.floor(tx), gy = Math.floor(ty);
            if (isPassable(gx, gy)) { e.targetX = tx; e.targetY = ty; break; }
          }
          e.repathTimer = 1.5 + Math.random()*1.5;
        }
        const dirAng = Math.atan2(e.targetY - e.y, e.targetX - e.x);
        e.vx = Math.cos(dirAng) * e.speedPatrol;
        e.vy = Math.sin(dirAng) * e.speedPatrol;
        e.facing = dirAng;
      }

      // Move with collision
      moveEntity(e, e.x + e.vx * dt, e.y + e.vy * dt);
      if (e.cooldown > 0) e.cooldown -= dt;
    }

    // Bullets
    for (let i=bullets.length-1;i>=0;i--){
      const b = bullets[i]; b.x += b.vx; b.y += b.vy; b.life -= dt;
      if (b.x < 0 || b.y < 0 || b.x > vw || b.y > vh || b.life <= 0) { bullets.splice(i,1); continue; }
      // Collision grid
      const gx = Math.floor(b.x / TILE), gy = Math.floor(b.y / TILE);
      if (MAP[gy] && (MAP[gy][gx] === 2)) { bullets.splice(i,1); if (sfx) sfx.playCrash(); continue; }
      if (b.friendly) {
        for (const e of enemies){
          if (e.hp <= 0) continue;
          const dx = b.x - (e.x*TILE+TILE/2), dy = b.y - (e.y*TILE+TILE/2);
          if (Math.hypot(dx,dy) < e.r) { e.hp = 0; bullets.splice(i,1); if (sfx) sfx.playHit(); score += 10; if (scoreText) scoreText.textContent = String(score); break; }
        }
      } else {
        const dx = b.x - (player.x*TILE+TILE/2), dy = b.y - (player.y*TILE+TILE/2);
        if (Math.hypot(dx,dy) < player.r) {
          bullets.splice(i,1);
          if (sfx) sfx.playCrash();
          // 5 hits to lose; each hit reduces 20 HP equivalently
          player.hits = Math.min(player.maxHits, player.hits + 1);
          player.hp = Math.max(0, 100 - (player.hits * (100/player.maxHits)));
          if (hpText) hpText.textContent = String(Math.round(player.hp));
          if (hpFill) hpFill.style.width = `${Math.max(0, 100 - player.hits * 20)}%`;
        }
      }
    }

    // Cleanup enemies and check win
    let remaining = 0, defeated = 0;
    for (const e of enemies){ if (e.hp > 0) remaining++; else defeated++; }
    if (objCount) objCount.textContent = String(defeated);
    if (player.hp <= 0) { if (modal) { modalTitle.textContent = 'Mission Failed'; modalText.textContent = `Score: ${score}`; modal.classList.remove('hidden'); } return; }
    if (remaining === 0) {
      // Advance stage up to 10; after 10, end game
      if (stage < 10) {
        stage += 1;
        // Scale viewport density slightly every 2 stages by increasing tile size
        if (stage % 2 === 0) { TILE = Math.min(52, TILE + 2); resize(); }
        if (stageText) stageText.textContent = String(stage);
        reset();
      } else {
        if (modal) { modalTitle.textContent = 'All Rounds Complete'; modalText.textContent = `Final Score: ${score}`; modal.classList.remove('hidden'); }
      }
    }
  }

  function drawGrid(){
    ctx.fillStyle = '#e9edf3'; ctx.fillRect(0,0,vw,vh);
    // grid
    ctx.strokeStyle = 'rgba(0,0,0,0.04)'; ctx.lineWidth = 1;
    for (let y=0;y<MAP_H;y++){
      for (let x=0;x<MAP_W;x++){
        const tx = x*TILE, ty = y*TILE;
        ctx.strokeRect(Math.floor(tx)+0.5, Math.floor(ty)+0.5, Math.floor(TILE), Math.floor(TILE));
        const t = MAP[y][x];
        if (t === 2) {
          ctx.fillStyle = '#d93636'; ctx.fillRect(tx,ty,TILE,TILE);
          ctx.strokeStyle = 'rgba(255,255,255,0.35)';
          ctx.beginPath(); ctx.moveTo(tx+6,ty+6); ctx.lineTo(tx+TILE-6,ty+TILE-6); ctx.moveTo(tx+TILE-6,ty+6); ctx.lineTo(tx+6,ty+TILE-6); ctx.stroke();
        }
      }
    }
    // shadows simple: draw overlay gradient
    const g = ctx.createLinearGradient(0,0,0,vh);
    g.addColorStop(0,'rgba(0,0,0,0.04)'); g.addColorStop(1,'rgba(0,0,0,0.12)');
    ctx.fillStyle = g; ctx.fillRect(0,0,vw,vh);
  }

  function drawEntities(){
    // planning arrow
    if (planning) {
      const dirX = (mouse.x - (player.x*TILE+TILE/2));
      const dirY = (mouse.y - (player.y*TILE+TILE/2));
      const ang = Math.atan2(dirY, dirX);
      const len = 46;
      const sx = player.x*TILE+TILE/2, sy = player.y*TILE+TILE/2;
      ctx.strokeStyle = 'rgba(44,123,229,0.85)'; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.moveTo(sx, sy);
      ctx.quadraticCurveTo(sx + Math.cos(ang-Math.PI/2)*24, sy + Math.sin(ang-Math.PI/2)*24, sx + Math.cos(ang)*len, sy + Math.sin(ang)*len);
      ctx.stroke();
    }
    // player
    ctx.fillStyle = player.color; ctx.beginPath(); ctx.arc(player.x*TILE+TILE/2, player.y*TILE+TILE/2, player.r, 0, Math.PI*2); ctx.fill();
    // enemies + FOV cones
    for (const e of enemies){
      if (e.hp <= 0) continue;
      // FOV cone
      ctx.save();
      ctx.translate(e.x*TILE, e.y*TILE);
      ctx.fillStyle = 'rgba(255,77,109,0.08)';
      ctx.beginPath();
      ctx.moveTo(0,0);
      ctx.arc(0,0, e.visionRange*TILE, e.facing - e.fov/2, e.facing + e.fov/2);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
      // Enemy body
      ctx.fillStyle = e.color; ctx.beginPath(); ctx.arc(e.x*TILE, e.y*TILE, e.r, 0, Math.PI*2); ctx.fill();
    }
    // bullets
    ctx.fillStyle = '#222'; for (const b of bullets){ ctx.beginPath(); ctx.arc(b.x, b.y, 3, 0, Math.PI*2); ctx.fill(); }
  }

  let last = performance.now();
  function loop(ts){
    const dt = Math.min(0.033, (ts - last)/1000); last = ts;
    update(dt); drawGrid(); drawEntities(); requestAnimationFrame(loop);
  }

  reset(); requestAnimationFrame(loop);
})();


