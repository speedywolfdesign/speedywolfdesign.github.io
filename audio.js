"use strict";

// Minimal chiptune-style music and SFX using Web Audio API.
// Exposes:
// - createChiptune(themeName) -> { play(), pause(), isPlaying() }
// - createSFX() -> { playWin(), playLose(), playCrash(), playHit(), playCoin(), playClick() }

(function(){
  let audioCtx = null;
  function getCtx() {
    if (audioCtx) return audioCtx;
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return null;
    audioCtx = new Ctx();
    return audioCtx;
  }

  function now() { const ctx = getCtx(); return ctx ? ctx.currentTime : 0; }

  function makeGain(value = 0.2) {
    const ctx = getCtx(); if (!ctx) return null;
    const g = ctx.createGain(); g.gain.value = value; g.connect(ctx.destination); return g;
  }

  function note(freq, tStart, dur, type = "square", gain = 0.15) {
    const ctx = getCtx(); if (!ctx) return;
    const osc = ctx.createOscillator(); osc.type = type; osc.frequency.setValueAtTime(freq, tStart);
    const g = ctx.createGain(); g.gain.setValueAtTime(0, tStart);
    // quick attack/decay
    g.gain.linearRampToValueAtTime(gain, tStart + 0.01);
    const tEnd = tStart + dur;
    g.gain.setTargetAtTime(0, tEnd - 0.05, 0.03);
    osc.connect(g); g.connect(ctx.destination);
    osc.start(tStart); osc.stop(tEnd);
  }

  const THEMES = {
    // Simple 8-bit style loops; tempos ~120bpm (0.5s per beat)
    default: { bpm: 120, scale: [261.63, 329.63, 392.00, 523.25], pattern: [0,1,2,1] }, // C E G E
    snake:   { bpm: 120, scale: [196.00, 246.94, 293.66, 329.63, 392.00], pattern: [0,1,2,3,4,3,2,1] },
    flappy:  { bpm: 128, scale: [261.63, 311.13, 392.00, 466.16, 523.25], pattern: [0,2,4,2,1,3,1,3] },
    g2048:   { bpm: 110, scale: [220.00, 277.18, 329.63, 415.30, 523.25], pattern: [0,1,2,1,3,2,4,2] },
    rps:     { bpm: 116, scale: [246.94, 311.13, 369.99, 493.88], pattern: [0,1,2,1,3,2,1,0] },
    memory:  { bpm: 100, scale: [261.63, 293.66, 349.23, 392.00], pattern: [0,1,2,3,2,1] },
    hangman: { bpm: 96,  scale: [220.00, 246.94, 293.66, 329.63], pattern: [0,1,0,2,1,3,2,1] },
    simon:   { bpm: 120, scale: [329.63, 261.63, 220.00, 164.81], pattern: [0,1,2,3] },
    pong:    { bpm: 124, scale: [196.00, 246.94, 329.63, 392.00], pattern: [0,1,2,1,3,2,1,0] },
    breakout:{ bpm: 126, scale: [261.63, 329.63, 392.00, 440.00], pattern: [0,1,2,3,2,1] },
    guess:   { bpm: 108, scale: [261.63, 311.13, 349.23], pattern: [0,1,2,1] },
    ttt:     { bpm: 112, scale: [261.63, 329.63, 392.00], pattern: [0,1,2,1] },
    chess:   { bpm: 118, scale: [196.00, 246.94, 293.66, 329.63, 392.00], pattern: [0,1,2,3,4,3,2,1] },
    uno:     { bpm: 120, scale: [220.00, 261.63, 329.63, 392.00], pattern: [0,1,2,3,2,1] },
  };

  function createChiptune(themeName = "default") {
    const ctx = getCtx(); if (!ctx) return { play(){}, pause(){}, isPlaying(){ return false; } };
    const theme = THEMES[themeName] || THEMES.default;
    let playing = false; let rafId = 0; let anchor = now();

    function scheduleLoop(startAt) {
      const beatSec = 60 / theme.bpm;
      const stepSec = beatSec / 2; // 8th notes
      const pattern = theme.pattern;
      const scale = theme.scale;
      const loopDur = pattern.length * stepSec;
      // schedule two bars ahead
      for (let k = 0; k < pattern.length; k++) {
        const t = startAt + k * stepSec;
        const freq = scale[pattern[k] % scale.length];
        note(freq, t, stepSec * 0.9, "square", 0.08);
        // add a quiet bass an octave lower
        note(freq / 2, t, stepSec * 0.9, "triangle", 0.05);
      }
      return startAt + loopDur;
    }

    function tick() {
      if (!playing) return;
      const t = now();
      while (anchor < t + 0.5) { anchor = scheduleLoop(anchor); }
      rafId = requestAnimationFrame(tick);
    }

    return {
      play() {
        if (playing) return; const ctx = getCtx(); if (!ctx) return;
        if (ctx.state === "suspended") ctx.resume();
        playing = true; anchor = now();
        anchor = scheduleLoop(anchor);
        rafId = requestAnimationFrame(tick);
      },
      pause() {
        playing = false; if (rafId) cancelAnimationFrame(rafId);
      },
      isPlaying() { return playing; }
    };
  }

  function blip(type = "square", freq = 440, durMs = 140, gain = 0.18) {
    const ctx = getCtx(); if (!ctx) return;
    const t0 = now();
    note(freq, t0, durMs/1000, type, gain);
  }

  function sweep(startFreq, endFreq, durMs, type = "square", gain = 0.18) {
    const ctx = getCtx(); if (!ctx) return;
    const t0 = now(); const t1 = t0 + durMs/1000;
    const osc = ctx.createOscillator(); osc.type = type; osc.frequency.setValueAtTime(startFreq, t0); osc.frequency.exponentialRampToValueAtTime(Math.max(1, endFreq), t1);
    const g = ctx.createGain(); g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(gain, t0 + 0.01); g.gain.setTargetAtTime(0, t1 - 0.06, 0.04);
    osc.connect(g); g.connect(ctx.destination); osc.start(t0); osc.stop(t1);
  }

  function noiseBurst(durMs = 180, gain = 0.14) {
    const ctx = getCtx(); if (!ctx) return;
    const bufferSize = Math.floor(ctx.sampleRate * (durMs/1000));
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i=0;i<bufferSize;i++) data[i] = Math.random()*2-1;
    const src = ctx.createBufferSource(); src.buffer = buffer;
    const g = ctx.createGain(); g.gain.value = gain; src.connect(g); g.connect(ctx.destination);
    src.start(now()); src.stop(now() + durMs/1000);
  }

  function createSFX() {
    return {
      playWin() { sweep(440, 880, 320, "square", 0.18); blip("triangle", 660, 160, 0.16); },
      playLose() { sweep(330, 110, 500, "square", 0.16); noiseBurst(140, 0.08); },
      playCrash() { noiseBurst(220, 0.18); },
      playBounce() { blip("square", 520, 70, 0.14); },
      playHit() { blip("square", 660, 90, 0.16); },
      playCoin() { sweep(660, 1320, 160, "square", 0.14); },
      playClick() { blip("triangle", 440, 60, 0.12); },
    };
  }

  window.createChiptune = createChiptune;
  window.createSFX = createSFX;
})();


