"use strict";

(function(){
  // ---- Fullscreen helpers ----
  function toggleFullscreen(el){
    const target = el || document.documentElement;
    if (!document.fullscreenElement) {
      if (target.requestFullscreen) target.requestFullscreen().catch(()=>{});
    } else {
      if (document.exitFullscreen) document.exitFullscreen().catch(()=>{});
    }
  }
  window.addEventListener("keydown", (e) => {
    if (e.code === "KeyF") { e.preventDefault(); toggleFullscreen(document.documentElement); }
  });
  // Double click on any canvas toggles fullscreen of its parent frame
  Array.from(document.querySelectorAll("canvas")).forEach((cv)=>{
    cv.addEventListener("dblclick", () => toggleFullscreen(cv.closest(".flappy-frame") || cv));
  });

  // ---- Gamepad to keyboard mapping ----
  const pressed = new Set();
  const mapDown = (code) => { if (!pressed.has(code)) { pressed.add(code); dispatch(code, "keydown"); } };
  const mapUp = (code) => { if (pressed.has(code)) { pressed.delete(code); dispatch(code, "keyup"); } };
  function dispatch(code, type){
    const ev = new KeyboardEvent(type, { code, key: code.replace("Key",""), bubbles: true });
    window.dispatchEvent(ev);
  }
  function poll(){
    const gps = navigator.getGamepads ? navigator.getGamepads() : [];
    let any = false;
    for (const gp of gps){ if (!gp) continue; any = true;
      const th = 0.35;
      const axX = gp.axes[0] || 0, axY = gp.axes[1] || 0;
      // D-pad (standard mapping)
      const dUp = gp.buttons[12] && gp.buttons[12].pressed || axY < -th;
      const dDown = gp.buttons[13] && gp.buttons[13].pressed || axY > th;
      const dLeft = gp.buttons[14] && gp.buttons[14].pressed || axX < -th;
      const dRight = gp.buttons[15] && gp.buttons[15].pressed || axX > th;
      dUp ? mapDown("ArrowUp") : mapUp("ArrowUp");
      dDown ? mapDown("ArrowDown") : mapUp("ArrowDown");
      dLeft ? mapDown("ArrowLeft") : mapUp("ArrowLeft");
      dRight ? mapDown("ArrowRight") : mapUp("ArrowRight");
      // Buttons → actions
      const A = gp.buttons[0] && gp.buttons[0].pressed; // South
      const B = gp.buttons[1] && gp.buttons[1].pressed; // East
      const X = gp.buttons[2] && gp.buttons[2].pressed; // West
      const Y = gp.buttons[3] && gp.buttons[3].pressed; // North
      const START = gp.buttons[9] && gp.buttons[9].pressed;
      A ? mapDown("Space") : mapUp("Space");
      (B||X) ? mapDown("Enter") : mapUp("Enter");
      START ? mapDown("KeyP") : mapUp("KeyP"); // pause
    }
    if (any) requestAnimationFrame(poll); else setTimeout(poll, 500);
  }
  poll();

  // --- Optional haptics when firing or colliding ---
  function vibrate(ms){ if (navigator.vibrate) try { navigator.vibrate(ms); } catch(_){} }
  window.addEventListener('keydown', (e)=>{ if (e.code==='Space' || e.code==='Enter') vibrate(30); });
})();


