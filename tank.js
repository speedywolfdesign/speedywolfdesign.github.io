"use strict";

(function(){
  const canvas = document.getElementById("tankCanvas");
  const ctx = canvas.getContext("2d");
  const hudStage = document.getElementById("tnkStage");
  const hudLives = document.getElementById("tnkLives");
  const hudScore = document.getElementById("tnkScore");
  const musicBtn = document.getElementById("musicBtn");
  const fireBtn = document.getElementById("tnkFire");
  const pauseBtn = document.getElementById("tnkPause");

  const DPR = Math.min(2, window.devicePixelRatio || 1);
  let vw=0, vh=0;
  function resize(){
    const rect = canvas.getBoundingClientRect();
    vw = Math.floor(rect.width);
    vh = Math.floor(rect.height);
    canvas.width = Math.floor(vw * DPR);
    canvas.height = Math.floor(vh * DPR);
    ctx.setTransform(DPR,0,0,DPR,0,0);
  }
  window.addEventListener('resize', resize); resize();

  // Map setup (simple tile map: 26x26 grid, 16px each scaled)
  const GRID = 26;
  const TILE = () => Math.floor(Math.min(vw, vh) / GRID);
  const TYPES = { EMPTY:0, BRICK:1, STEEL:2, WATER:3, TREE:4, BASE:5 };
  let map = [];
  function makeStage(seed=1){
    map = Array.from({length: GRID}, () => Array.from({length: GRID}, () => TYPES.EMPTY));
    // frame steel
    for (let i=0;i<GRID;i++){ map[0][i]=map[GRID-1][i]=map[i][0]=map[i][GRID-1]=TYPES.STEEL; }
    // random bricks
    for (let i=0;i<260;i++){ const r=2+Math.floor(Math.random()* (GRID-4)); const c=2+Math.floor(Math.random()* (GRID-4)); map[r][c]=TYPES.BRICK; }
    // base
    map[GRID-2][Math.floor(GRID/2)] = TYPES.BASE;
  }

  // Tanks
  function Tank(x,y,dir,ai=false){ this.x=x; this.y=y; this.dir=dir; this.ai=ai; this.cool=0; this.alive=true; }
  const DIRS = { UP:0, RIGHT:1, DOWN:2, LEFT:3 };
  function moveTank(t, dt){
    const speed = 90; // px/s at DPR 1
    const d = speed * dt;
    if (t.dir===DIRS.UP) t.y -= d; else if (t.dir===DIRS.DOWN) t.y += d; else if (t.dir===DIRS.LEFT) t.x -= d; else t.x += d;
    clampTank(t);
  }
  function clampTank(t){ const pad=2; t.x = Math.max(pad, Math.min(vw-pad-16, t.x)); t.y = Math.max(pad, Math.min(vh-pad-16, t.y)); }

  function Bullet(x,y,dir,who){ this.x=x; this.y=y; this.dir=dir; this.who=who; this.alive=true; }
  const bullets = [];
  function fire(t){ if (t.cool>0) return; t.cool=0.35; const bx=t.x+8, by=t.y+8; bullets.push(new Bullet(bx,by,t.dir,t)); if (sfx) sfx.playHit(); }

  let player = new Tank(40, vh-80, DIRS.UP, false);
  const enemies = [ new Tank(vw-60, 40, DIRS.DOWN, true), new Tank(40, 40, DIRS.DOWN, true) ];
  let score=0, lives=3, stage=1, paused=false;

  function updateHUD(){ hudScore.textContent=String(score); hudLives.textContent=String(lives); hudStage.textContent=String(stage); }

  // Controls
  const keys = new Set();
  window.addEventListener('keydown', e=>{ keys.add(e.code); if (e.code==='Space') fire(player); if (e.code==='KeyP') paused=!paused; });
  window.addEventListener('keyup', e=>{ keys.delete(e.code); });
  document.querySelectorAll('.gb-key[data-dir]').forEach(btn=>btn.addEventListener('pointerdown',()=>{
    const d = btn.getAttribute('data-dir');
    if (d==='up') player.dir=DIRS.UP; if (d==='down') player.dir=DIRS.DOWN; if (d==='left') player.dir=DIRS.LEFT; if (d==='right') player.dir=DIRS.RIGHT;
  }));
  if (fireBtn) fireBtn.addEventListener('click', ()=>fire(player));
  if (pauseBtn) pauseBtn.addEventListener('click', ()=>paused=!paused);

  // Audio
  let music = null; let sfx = null;
  if (typeof createChiptune === 'function'){
    music = createChiptune('pong'); sfx = createSFX();
    if (musicBtn) musicBtn.addEventListener('click', ()=>{ if (music.isPlaying()) { music.pause(); musicBtn.textContent='Music: Off'; } else { music.play(); musicBtn.textContent='Music: On'; } });
  }

  // Game loop
  let last = performance.now(); makeStage(); updateHUD();
  function loop(ts){
    const dt = Math.min(0.033, (ts-last)/1000); last = ts;
    if (!paused){
      step(dt); draw();
    }
    requestAnimationFrame(loop);
  }

  function step(dt){
    // Player movement
    if (keys.has('ArrowUp')) player.dir=DIRS.UP;
    if (keys.has('ArrowDown')) player.dir=DIRS.DOWN;
    if (keys.has('ArrowLeft')) player.dir=DIRS.LEFT;
    if (keys.has('ArrowRight')) player.dir=DIRS.RIGHT;
    moveTank(player, dt);
    player.cool = Math.max(0, player.cool - dt);

    // Enemies simple AI
    for (const e of enemies){
      if (!e.alive) continue;
      if (Math.random()<0.02) e.dir = Math.floor(Math.random()*4);
      moveTank(e, dt*0.8);
      e.cool = Math.max(0, e.cool - dt);
      if (Math.random()<0.02) fire(e);
    }

    // Bullets
    for (const b of bullets){ if (!b.alive) continue; const sp=220*dt; if (b.dir===DIRS.UP) b.y-=sp; else if (b.dir===DIRS.DOWN) b.y+=sp; else if (b.dir===DIRS.LEFT) b.x-=sp; else b.x+=sp; if (b.x<0||b.y<0||b.x>vw||b.y>vh) b.alive=false; }
    // Collisions: bullets with enemies/player
    for (const b of bullets){ if (!b.alive) continue; if (b.who!==player && hitTank(player,b)) { lives--; b.alive=false; if (sfx) sfx.playCrash(); if (lives<=0) reset(); updateHUD(); }
      for (const e of enemies){ if (!e.alive) continue; if (b.who===player && hitTank(e,b)) { e.alive=false; score+=100; b.alive=false; if (sfx) sfx.playHit(); updateHUD(); } } }
  }

  function hitTank(t,b){ const r=10; return Math.abs((t.x+8)-b.x)<r && Math.abs((t.y+8)-b.y)<r; }

  function draw(){
    ctx.fillStyle = "#0a0f1f"; ctx.fillRect(0,0,vw,vh);
    // tiles simple render
    const s = TILE();
    for (let r=0;r<GRID;r++){
      for (let c=0;c<GRID;c++){
        const x=c*s, y=r*s; const t=map[r][c]; if (t===TYPES.EMPTY) continue; ctx.save(); ctx.translate(x,y);
        if (t===TYPES.BRICK) { ctx.fillStyle="#152456"; ctx.fillRect(0,0,s-1,s-1); ctx.strokeStyle="rgba(0,245,255,0.35)"; ctx.strokeRect(1,1,s-3,s-3); }
        if (t===TYPES.STEEL) { ctx.fillStyle="#2b2f4a"; ctx.fillRect(0,0,s-1,s-1); }
        if (t===TYPES.BASE) { ctx.fillStyle="#ff4d6d"; ctx.fillRect(0,0,s-1,s-1); }
        ctx.restore();
      }
    }
    drawTank(player,"#20f381");
    for (const e of enemies) if (e.alive) drawTank(e,"#6a5cff");
    // bullets
    ctx.fillStyle = "#fff"; for (const b of bullets) if (b.alive) { ctx.beginPath(); ctx.arc(b.x,b.y,2.5,0,Math.PI*2); ctx.fill(); }
  }

  function drawTank(t,color){ ctx.save(); ctx.translate(t.x,t.y); ctx.fillStyle=color; ctx.fillRect(0,0,16,16); ctx.fillStyle="#0a0f1f"; ctx.fillRect(7,7,2,2); ctx.restore(); }

  function reset(){ lives=3; score=0; stage=1; player = new Tank(40, vh-80, DIRS.UP, false); enemies.forEach((e,i)=>{ e.x = i? vw-60:40; e.y=40; e.alive=true; e.dir=DIRS.DOWN; }); bullets.length=0; makeStage(); updateHUD(); }

  reset(); requestAnimationFrame(loop);
})();


