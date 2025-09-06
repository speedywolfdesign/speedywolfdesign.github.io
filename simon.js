"use strict";

(function () {
  const buttons = Array.from(document.querySelectorAll(".simon"));
  const startBtn = document.getElementById("simonStart");
  const scoreEl = document.getElementById("simonScore");
  const musicBtn = document.getElementById("musicBtn");
  const modal = document.getElementById("gameModal");
  const modalTitle = document.getElementById("modalTitle");
  const modalText = document.getElementById("modalText");
  const modalRestart = document.getElementById("modalRestart");
  const statusEl = document.getElementById("simonStatus");
  const hintEl = document.getElementById("simonHint");

  let seq = [], idx = 0, busy = false, score = 0;

  // --- Audio: tones per button + metronome tick ---
  let audioCtx = null;
  const buttonFrequencies = [329.63, 261.63, 220.0, 164.81]; // Distinct tones per quadrant

  function ensureAudio() {
    if (!audioCtx) {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (Ctx) audioCtx = new Ctx();
    }
  }

  function playTone(frequency, durationMs = 300, type = "sine", gainLevel = 0.18) {
    if (!audioCtx) return;
    const now = audioCtx.currentTime;
    const oscillator = audioCtx.createOscillator();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, now);

    const gain = audioCtx.createGain();
    // Smooth attack/decay to avoid clicks
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(gainLevel, now + 0.01);
    const endTime = now + durationMs / 1000;
    gain.gain.setTargetAtTime(0, endTime - 0.06, 0.04);

    oscillator.connect(gain);
    gain.connect(audioCtx.destination);
    oscillator.start(now);
    oscillator.stop(endTime);
  }

  function playButtonTone(index, durationMs = 300) {
    if (!audioCtx) return;
    const freq = buttonFrequencies[index % buttonFrequencies.length];
    playTone(freq, durationMs, "sine", 0.22);
  }

  function playTick(durationMs = 70) {
    // Disabled per request: keep only pad sounds
  }

  function flash(i) {
    return new Promise((resolve) => {
      const el = buttons[i];
      el.classList.add("active");
      // Play the associated tone while flashing
      playButtonTone(i, 300);
      setTimeout(() => { el.classList.remove("active"); resolve(); }, 300);
    });
  }

  async function playSequence() {
    busy = true;
    for (let i = 0; i < seq.length; i++) {
      // Small spacing before each flash
      await wait(90);
      await flash(seq[i]);
      await wait(200);
    }
    busy = false; idx = 0;
  }

  function wait(ms) { return new Promise(r => setTimeout(r, ms)); }

  async function start() {
    // Ensure audio is allowed by user gesture
    ensureAudio(); if (audioCtx && audioCtx.state === 'suspended') { audioCtx.resume(); }
    seq = []; score = 0; scoreEl.textContent = "0"; idx = 0;
    busy = true;
    if (statusEl) statusEl.textContent = "Get Ready";
    if (hintEl) hintEl.textContent = "Starting in 3...";
    for (let t = 3; t > 0; t--) {
      if (hintEl) hintEl.textContent = `Starting in ${t}...`;
      await wait(1000);
    }
    if (hintEl) hintEl.textContent = "Listen to the sequence";
    busy = false;
    await next();
  }

  async function next() {
    seq.push(Math.floor(Math.random() * 4));
    if (statusEl) statusEl.textContent = `Level ${seq.length}`;
    if (hintEl) hintEl.textContent = "Get ready...";
    busy = true;
    await wait(1000); // Pause before showing the next sequence
    await playSequence();
  }

  function press(i) {
    if (busy || seq.length === 0) return;
    flash(i);
    if (i !== seq[idx]) { seq = []; scoreEl.textContent = String(score) + " — Fail"; if (statusEl) statusEl.textContent = "Failed"; if (hintEl) hintEl.textContent = "Press Restart to try again"; if (modal) { modalTitle.textContent = "Game Over"; modalText.textContent = `Score: ${score}`; modal.classList.remove("hidden"); } return; }
    idx += 1;
    if (idx === seq.length) { score += 1; scoreEl.textContent = String(score); next(); }
  }

  buttons.forEach((btn, i) => btn.addEventListener("click", () => press(i)));
  startBtn.addEventListener("click", start);
  if (modalRestart) modalRestart.addEventListener("click", () => { modal.classList.add("hidden"); start(); });
  let music = null; if (typeof createChiptune === 'function' && musicBtn) { music = createChiptune('simon'); musicBtn.addEventListener("click", () => { if (music.isPlaying()) { music.pause(); musicBtn.textContent = "Music: Off"; } else { music.play(); musicBtn.textContent = "Music: On"; } }); }
})();


