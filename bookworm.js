"use strict";

(function(){
  const gridEl = document.getElementById("bwGrid");
  const scoreEl = document.getElementById("bwScore");
  const resetBtn = document.getElementById("bwReset");
  const musicBtn = document.getElementById("musicBtn");

  const ROWS = 8, COLS = 8;
  const LETTERS = "EEEEEEEEEEEEEEEEEEEEAAAAAAAIIIIIIIOOOOOONNNNNNRRRRRRTTTTTLLLLSSSSUUUUDDDDGGGBCM PCPFFHHVVWWYJKQXZ".replace(/\s+/g,"");
  const DICT = new Set(["CAT","DOG","BOOK","WORM","GAME","CODE","NEON","PLAY","WORD","GRID","JAVA","NODE","HTML","CSS","JS"]);

  let grid, selected, score;

  function randLetter(){ return LETTERS[Math.floor(Math.random()*LETTERS.length)]; }

  function newGrid(){
    grid = Array.from({length: ROWS}, () => Array.from({length: COLS}, randLetter));
  }

  function render(){
    gridEl.innerHTML = "";
    gridEl.style.gridTemplateColumns = `repeat(${COLS}, 1fr)`;
    gridEl.style.gap = "8px";
    for (let r=0;r<ROWS;r++){
      for (let c=0;c<COLS;c++){
        const btn = document.createElement('button');
        btn.className = 'mem-card';
        const inner = document.createElement('div'); inner.className = 'mem-inner';
        const face = document.createElement('div'); face.className = 'mem-back'; face.textContent = grid[r][c];
        const back = document.createElement('div'); back.className = 'mem-front'; back.textContent = ' ';
        inner.appendChild(face); inner.appendChild(back); btn.appendChild(inner);
        btn.addEventListener('click', () => onPick(r,c,btn));
        gridEl.appendChild(btn);
      }
    }
  }

  function isAdjacent(a,b){ return Math.abs(a.r-b.r) <= 1 && Math.abs(a.c-b.c) <= 1; }

  function onPick(r,c,btn){
    const pos = {r,c,btn};
    if (selected.length === 0) { selected.push(pos); mark(btn,true); return; }
    const last = selected[selected.length-1];
    if (!isAdjacent(last,pos)) return;
    // prevent reusing same tile
    if (selected.some(p => p.r===r && p.c===c)) return;
    selected.push(pos); mark(btn,true);
  }

  function currentWord(){ return selected.map(p => grid[p.r][p.c]).join(""); }

  function mark(btn, on){ btn.classList.toggle('open', on); }

  function commit(){
    const w = currentWord();
    if (w.length >= 3 && DICT.has(w)){
      score += w.length * 10;
      scoreEl.textContent = String(score);
      // remove selected letters and drop
      for (const p of selected){ grid[p.r][p.c] = null; mark(p.btn,false); }
      // drop letters
      for (let c=0;c<COLS;c++){
        let write = ROWS-1;
        for (let r=ROWS-1;r>=0;r--){ if (grid[r][c]) { grid[write][c] = grid[r][c]; if (write!==r) grid[r][c]=null; write--; } }
        for (let r=write;r>=0;r--) grid[r][c] = randLetter();
      }
      selected = [];
      render();
    } else {
      // invalid: clear selection
      for (const p of selected) mark(p.btn,false);
      selected = [];
    }
  }

  function reset(){ score = 0; scoreEl.textContent = '0'; selected = []; newGrid(); render(); }

  // Commit selection on double tap or long press
  gridEl.addEventListener('dblclick', commit);
  gridEl.addEventListener('touchend', (e) => { if (selected.length>=3) commit(); }, {passive:true});
  document.addEventListener('keydown', (e) => { if (e.key === 'Enter') commit(); });

  if (resetBtn) resetBtn.addEventListener('click', reset);
  let music = null; if (typeof createChiptune === 'function' && musicBtn) { music = createChiptune('memory'); musicBtn.addEventListener('click', () => { if (music.isPlaying()) { music.pause(); musicBtn.textContent = 'Music: Off'; } else { music.play(); musicBtn.textContent = 'Music: On'; } }); }

  reset();
})();


