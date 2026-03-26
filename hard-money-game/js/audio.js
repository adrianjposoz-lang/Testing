// audio.js - Retro 16-bit RPG Sound System (Web Audio API, procedurally generated)

export const audio = (() => {
  let ctx = null;
  let masterGain = null;
  let sfxGain = null;
  let musicGain = null;

  let masterVolume = 1;
  let sfxVolume = 0.5;
  let musicVolume = 0.4;
  let muted = false;

  // Current music state
  let currentMusicInterval = null;
  let currentMusicNodes = [];
  let musicPlaying = false;

  // ─── Helpers ──────────────────────────────────────────────

  function ensureCtx() {
    if (!ctx) {
      throw new Error('AudioContext not initialized. Call audio.init() first.');
    }
    if (ctx.state === 'suspended') {
      ctx.resume();
    }
  }

  function updateGains() {
    if (!masterGain) return;
    const vol = muted ? 0 : masterVolume;
    masterGain.gain.setValueAtTime(vol, ctx.currentTime);
    sfxGain.gain.setValueAtTime(sfxVolume, ctx.currentTime);
    musicGain.gain.setValueAtTime(musicVolume, ctx.currentTime);
  }

  function osc(type, freq, dest) {
    const o = ctx.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(freq, ctx.currentTime);
    o.connect(dest);
    return o;
  }

  function gain(value, dest) {
    const g = ctx.createGain();
    g.gain.setValueAtTime(value, ctx.currentTime);
    g.connect(dest);
    return g;
  }

  function noise(duration, dest) {
    const sr = ctx.sampleRate;
    const len = sr * duration;
    const buf = ctx.createBuffer(1, len, sr);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.connect(dest);
    return src;
  }

  function playNote(type, freq, startTime, duration, dest, vol = 0.3) {
    const g = ctx.createGain();
    g.connect(dest);
    g.gain.setValueAtTime(vol, startTime);
    g.gain.setValueAtTime(vol, startTime + duration * 0.7);
    g.gain.linearRampToValueAtTime(0, startTime + duration);

    const o = ctx.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(freq, startTime);
    o.connect(g);
    o.start(startTime);
    o.stop(startTime + duration);
    return { osc: o, gain: g };
  }

  // Note frequency helper (MIDI-ish)
  const NOTE_FREQS = {
    C3: 130.81, D3: 146.83, E3: 164.81, F3: 174.61, G3: 196.00, A3: 220.00, B3: 246.94,
    C4: 261.63, D4: 293.66, E4: 329.63, F4: 349.23, G4: 392.00, A4: 440.00, B4: 493.88,
    C5: 523.25, D5: 587.33, E5: 659.25, F5: 698.46, G5: 783.99, A5: 880.00, B5: 987.77,
    C6: 1046.50, D6: 1174.66, E6: 1318.51,
    'Eb3': 155.56, 'Bb3': 233.08, 'Eb4': 311.13, 'Ab4': 415.30, 'Bb4': 466.16,
    'Db4': 277.18, 'Gb4': 369.99, 'Ab3': 207.65, 'Db5': 554.37, 'Eb5': 622.25,
    'Bb5': 932.33, 'F#4': 369.99, 'F#5': 739.99,
  };

  function nf(name) {
    return NOTE_FREQS[name] || 440;
  }

  // ─── Public API ───────────────────────────────────────────

  function init() {
    if (ctx) return;
    ctx = new (window.AudioContext || window.webkitAudioContext)();

    masterGain = ctx.createGain();
    masterGain.connect(ctx.destination);

    sfxGain = ctx.createGain();
    sfxGain.connect(masterGain);

    musicGain = ctx.createGain();
    musicGain.connect(masterGain);

    updateGains();
  }

  function setMasterVolume(v) {
    masterVolume = Math.max(0, Math.min(1, v));
    updateGains();
  }

  function setSfxVolume(v) {
    sfxVolume = Math.max(0, Math.min(1, v));
    updateGains();
  }

  function setMusicVolume(v) {
    musicVolume = Math.max(0, Math.min(1, v));
    updateGains();
  }

  function mute() {
    muted = true;
    updateGains();
  }

  function unmute() {
    muted = false;
    updateGains();
  }

  function isMuted() {
    return muted;
  }

  // ─── Sound Effects ────────────────────────────────────────

  function playSlash() {
    ensureCtx();
    const t = ctx.currentTime;
    // Noise burst filtered high-to-low for swoosh
    const g = gain(0.4, sfxGain);
    g.gain.linearRampToValueAtTime(0, t + 0.15);

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(4000, t);
    filter.frequency.exponentialRampToValueAtTime(400, t + 0.12);
    filter.Q.setValueAtTime(2, t);
    filter.connect(g);

    const n = noise(0.15, filter);
    n.start(t);
    n.stop(t + 0.15);

    // Quick oscillator sweep
    const og = gain(0.2, sfxGain);
    og.gain.linearRampToValueAtTime(0, t + 0.1);
    const o = osc('sawtooth', 1200, og);
    o.frequency.exponentialRampToValueAtTime(200, t + 0.1);
    o.start(t);
    o.stop(t + 0.1);
  }

  function playHit() {
    ensureCtx();
    const t = ctx.currentTime;
    // Low thud
    const g = gain(0.5, sfxGain);
    g.gain.setValueAtTime(0.5, t);
    g.gain.linearRampToValueAtTime(0, t + 0.2);

    const o = osc('sine', 120, g);
    o.frequency.exponentialRampToValueAtTime(40, t + 0.2);
    o.start(t);
    o.stop(t + 0.2);

    // Noise punch
    const ng = gain(0.25, sfxGain);
    ng.gain.linearRampToValueAtTime(0, t + 0.08);

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(600, t);
    filter.connect(ng);

    const n = noise(0.08, filter);
    n.start(t);
    n.stop(t + 0.08);
  }

  function playCritical() {
    ensureCtx();
    const t = ctx.currentTime;

    // Slash component
    const sg = gain(0.3, sfxGain);
    sg.gain.linearRampToValueAtTime(0, t + 0.12);
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(3000, t);
    filter.frequency.exponentialRampToValueAtTime(500, t + 0.12);
    filter.Q.setValueAtTime(2, t);
    filter.connect(sg);
    const n = noise(0.12, filter);
    n.start(t);
    n.stop(t + 0.12);

    // Sparkle chime (high pitched arpeggiated)
    const freqs = [1400, 1800, 2200, 2600];
    freqs.forEach((f, i) => {
      const delay = 0.04 + i * 0.04;
      const g2 = ctx.createGain();
      g2.connect(sfxGain);
      g2.gain.setValueAtTime(0, t + delay);
      g2.gain.linearRampToValueAtTime(0.15, t + delay + 0.01);
      g2.gain.linearRampToValueAtTime(0, t + delay + 0.12);

      const o = ctx.createOscillator();
      o.type = 'square';
      o.frequency.setValueAtTime(f, t + delay);
      o.connect(g2);
      o.start(t + delay);
      o.stop(t + delay + 0.12);
    });

    // Impact
    const ig = gain(0.35, sfxGain);
    ig.gain.linearRampToValueAtTime(0, t + 0.15);
    const io = osc('sine', 200, ig);
    io.frequency.exponentialRampToValueAtTime(60, t + 0.15);
    io.start(t);
    io.stop(t + 0.15);
  }

  function playCombo() {
    ensureCtx();
    const t = ctx.currentTime;
    // Ascending 3-note chime
    const notes = [nf('E5'), nf('G5'), nf('C6')];
    notes.forEach((freq, i) => {
      const start = t + i * 0.08;
      const g2 = ctx.createGain();
      g2.connect(sfxGain);
      g2.gain.setValueAtTime(0.25, start);
      g2.gain.linearRampToValueAtTime(0, start + 0.15);

      const o = ctx.createOscillator();
      o.type = 'square';
      o.frequency.setValueAtTime(freq, start);
      o.connect(g2);
      o.start(start);
      o.stop(start + 0.15);
    });
  }

  function playBossDeath() {
    ensureCtx();
    const t = ctx.currentTime;

    // Explosion: noise + low rumble
    const eg = gain(0.5, sfxGain);
    eg.gain.setValueAtTime(0.5, t);
    eg.gain.linearRampToValueAtTime(0, t + 0.6);

    const ef = ctx.createBiquadFilter();
    ef.type = 'lowpass';
    ef.frequency.setValueAtTime(1200, t);
    ef.frequency.exponentialRampToValueAtTime(80, t + 0.6);
    ef.connect(eg);

    const en = noise(0.6, ef);
    en.start(t);
    en.stop(t + 0.6);

    // Low rumble oscillator
    const rg = gain(0.3, sfxGain);
    rg.gain.linearRampToValueAtTime(0, t + 0.5);
    const ro = osc('sine', 80, rg);
    ro.frequency.exponentialRampToValueAtTime(30, t + 0.5);
    ro.start(t);
    ro.stop(t + 0.5);

    // Descending sparkle cascade
    const sparkleNotes = [
      nf('C6'), nf('B5'), nf('A5'), nf('G5'),
      nf('F5'), nf('E5'), nf('D5'), nf('C5'),
    ];
    sparkleNotes.forEach((freq, i) => {
      const start = t + 0.2 + i * 0.07;
      const sg = ctx.createGain();
      sg.connect(sfxGain);
      sg.gain.setValueAtTime(0.15, start);
      sg.gain.linearRampToValueAtTime(0, start + 0.14);

      const so = ctx.createOscillator();
      so.type = 'square';
      so.frequency.setValueAtTime(freq, start);
      so.connect(sg);
      so.start(start);
      so.stop(start + 0.14);
    });
  }

  function playGoldPickup() {
    ensureCtx();
    const t = ctx.currentTime;
    // High pitched ding - two quick tones
    const g1 = gain(0.2, sfxGain);
    g1.gain.linearRampToValueAtTime(0, t + 0.1);
    const o1 = osc('square', nf('E6'), g1);
    o1.start(t);
    o1.stop(t + 0.1);

    const g2 = gain(0.25, sfxGain);
    g2.gain.setValueAtTime(0.25, t + 0.06);
    g2.gain.linearRampToValueAtTime(0, t + 0.2);
    const o2 = osc('square', nf('C6'), g2);
    o2.start(t + 0.06);
    o2.stop(t + 0.2);
  }

  function playPurchase() {
    ensureCtx();
    const t = ctx.currentTime;
    // Ka-ching: two quick high notes
    const g1 = gain(0.25, sfxGain);
    g1.gain.setValueAtTime(0.25, t);
    g1.gain.linearRampToValueAtTime(0, t + 0.06);
    const o1 = osc('square', nf('A5'), g1);
    o1.start(t);
    o1.stop(t + 0.06);

    const g2 = gain(0.3, sfxGain);
    g2.gain.setValueAtTime(0.3, t + 0.07);
    g2.gain.linearRampToValueAtTime(0, t + 0.25);
    const o2 = osc('square', nf('E6'), g2);
    o2.start(t + 0.07);
    o2.stop(t + 0.25);

    // Shimmer
    const g3 = gain(0.1, sfxGain);
    g3.gain.setValueAtTime(0.1, t + 0.07);
    g3.gain.linearRampToValueAtTime(0, t + 0.3);
    const o3 = osc('triangle', nf('C6'), g3);
    o3.start(t + 0.07);
    o3.stop(t + 0.3);
  }

  function playHeartbeat() {
    ensureCtx();
    const t = ctx.currentTime;
    // Thump-thump: two low sine pulses
    [0, 0.15].forEach((offset) => {
      const g2 = ctx.createGain();
      g2.connect(sfxGain);
      const s = t + offset;
      g2.gain.setValueAtTime(0, s);
      g2.gain.linearRampToValueAtTime(0.4, s + 0.02);
      g2.gain.linearRampToValueAtTime(0, s + 0.12);

      const o = ctx.createOscillator();
      o.type = 'sine';
      o.frequency.setValueAtTime(55, s);
      o.frequency.exponentialRampToValueAtTime(35, s + 0.12);
      o.connect(g2);
      o.start(s);
      o.stop(s + 0.12);
    });
  }

  function playVictoryFanfare() {
    ensureCtx();
    const t = ctx.currentTime;
    // 4-note heroic jingle: C E G C(octave up)
    const notes = [
      { freq: nf('C4'), time: 0, dur: 0.15 },
      { freq: nf('E4'), time: 0.15, dur: 0.15 },
      { freq: nf('G4'), time: 0.30, dur: 0.15 },
      { freq: nf('C5'), time: 0.45, dur: 0.4 },
    ];
    notes.forEach((n) => {
      playNote('square', n.freq, t + n.time, n.dur, sfxGain, 0.25);
    });
    // Harmony layer
    const harmony = [
      { freq: nf('E4'), time: 0.45, dur: 0.35 },
      { freq: nf('G4'), time: 0.45, dur: 0.35 },
    ];
    harmony.forEach((n) => {
      playNote('triangle', n.freq, t + n.time, n.dur, sfxGain, 0.12);
    });
  }

  function playGameOver() {
    ensureCtx();
    const t = ctx.currentTime;
    // Sad 3-note descending: Eb Db Bb(low)
    const notes = [
      { freq: nf('Eb4'), time: 0, dur: 0.3 },
      { freq: nf('Db4'), time: 0.35, dur: 0.3 },
      { freq: nf('Bb3'), time: 0.7, dur: 0.6 },
    ];
    notes.forEach((n) => {
      playNote('triangle', n.freq, t + n.time, n.dur, sfxGain, 0.3);
    });
  }

  function playMenuSelect() {
    ensureCtx();
    const t = ctx.currentTime;
    const g2 = gain(0.2, sfxGain);
    g2.gain.linearRampToValueAtTime(0, t + 0.05);
    const o = osc('square', 1200, g2);
    o.start(t);
    o.stop(t + 0.05);
  }

  function playTypewriter() {
    ensureCtx();
    const t = ctx.currentTime;
    // Single tick: very short noise burst
    const g2 = gain(0.12, sfxGain);
    g2.gain.linearRampToValueAtTime(0, t + 0.02);

    const filter = ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(3000, t);
    filter.connect(g2);

    const n = noise(0.02, filter);
    n.start(t);
    n.stop(t + 0.02);
  }

  function playTimerTick() {
    ensureCtx();
    const t = ctx.currentTime;
    // Subtle high tick
    const g2 = gain(0.08, sfxGain);
    g2.gain.linearRampToValueAtTime(0, t + 0.015);
    const o = osc('square', 2400, g2);
    o.start(t);
    o.stop(t + 0.015);
  }

  // ─── Music System ─────────────────────────────────────────

  function stopAllMusicNodes() {
    if (currentMusicInterval !== null) {
      clearInterval(currentMusicInterval);
      currentMusicInterval = null;
    }
    currentMusicNodes.forEach((node) => {
      try { node.stop(); } catch (_) { /* already stopped */ }
      try { node.disconnect(); } catch (_) { /* ok */ }
    });
    currentMusicNodes = [];
    musicPlaying = false;
  }

  function scheduleLoop(patternFn, barDuration) {
    // Schedule the first iteration immediately
    const firstNodes = patternFn(ctx.currentTime);
    currentMusicNodes.push(...firstNodes);

    // Re-schedule on an interval just before each bar ends
    const intervalMs = barDuration * 1000;
    let nextTime = ctx.currentTime + barDuration;

    currentMusicInterval = setInterval(() => {
      if (!ctx || ctx.state === 'closed') {
        stopAllMusicNodes();
        return;
      }
      // Clean up old nodes
      currentMusicNodes = currentMusicNodes.filter((n) => {
        try {
          // Keep only recently scheduled ones; old ones auto-stop
          return true;
        } catch (_) {
          return false;
        }
      });
      const nodes = patternFn(nextTime);
      currentMusicNodes.push(...nodes);
      nextTime += barDuration;
    }, intervalMs);

    musicPlaying = true;
  }

  // --- Battle Music: urgent, ~120bpm, 4-bar loop, square wave ---
  function playBattleMusic() {
    ensureCtx();
    stopAllMusicNodes();

    const bpm = 120;
    const beat = 60 / bpm; // 0.5s per beat
    const barDuration = beat * 16; // 4 bars of 4 beats = 16 beats

    // Melody pattern (square wave, driving feel)
    // 4 bars in E minor: E G A B | E G A G | E G A B | D E D B
    const melody = [
      // Bar 1
      'E4', 'E4', 'G4', 'G4', 'A4', 'A4', 'B4', 'B4',
      // Bar 2
      'E4', 'E4', 'G4', 'G4', 'A4', 'A4', 'G4', 'G4',
      // Bar 3
      'E4', 'E4', 'G4', 'G4', 'A4', 'A4', 'B4', 'B4',
      // Bar 4
      'D4', 'D4', 'E4', 'E4', 'D4', 'D4', 'B3', 'B3',
    ];

    // Bass pattern (every beat)
    const bass = [
      'E3', null, 'E3', null, 'A3', null, 'A3', null,
      'E3', null, 'E3', null, 'A3', null, 'G3', null,
      'E3', null, 'E3', null, 'A3', null, 'A3', null,
      'D3', null, 'E3', null, 'D3', null, 'B3', null,
    ];

    function pattern(startTime) {
      const nodes = [];
      const eighth = beat / 2;

      // Melody: eighth notes
      melody.forEach((note, i) => {
        if (!note) return;
        const s = startTime + i * eighth;
        const { osc: o, gain: g } = playNote('square', nf(note), s, eighth * 0.85, musicGain, 0.18);
        nodes.push(o);
      });

      // Bass: eighth notes
      bass.forEach((note, i) => {
        if (!note) return;
        const s = startTime + i * eighth;
        const { osc: o } = playNote('square', nf(note), s, eighth * 0.7, musicGain, 0.14);
        nodes.push(o);
      });

      // Kick-like pulse on every beat
      for (let b = 0; b < 16; b++) {
        const s = startTime + b * beat;
        const kg = ctx.createGain();
        kg.connect(musicGain);
        kg.gain.setValueAtTime(0.12, s);
        kg.gain.linearRampToValueAtTime(0, s + 0.06);
        const ko = ctx.createOscillator();
        ko.type = 'sine';
        ko.frequency.setValueAtTime(90, s);
        ko.frequency.exponentialRampToValueAtTime(30, s + 0.06);
        ko.connect(kg);
        ko.start(s);
        ko.stop(s + 0.06);
        nodes.push(ko);
      }

      return nodes;
    }

    scheduleLoop(pattern, barDuration);
  }

  // --- Shop Music: calm, triangle wave, slower tempo ---
  function playShopMusic() {
    ensureCtx();
    stopAllMusicNodes();

    const bpm = 80;
    const beat = 60 / bpm;
    const barDuration = beat * 16;

    // Gentle melody in C major pentatonic
    const melody = [
      'C5', null, 'E5', null, 'G5', null, 'E5', null,
      'D5', null, 'F5', null, 'E5', null, 'C5', null,
      'C5', null, 'E5', null, 'G5', null, 'A5', null,
      'G5', null, 'E5', null, 'D5', null, 'C5', null,
    ];

    const bass = [
      'C3', null, null, null, 'G3', null, null, null,
      'F3', null, null, null, 'G3', null, null, null,
      'C3', null, null, null, 'A3', null, null, null,
      'F3', null, null, null, 'G3', null, 'C3', null,
    ];

    function pattern(startTime) {
      const nodes = [];
      const eighth = beat / 2;

      melody.forEach((note, i) => {
        if (!note) return;
        const s = startTime + i * eighth;
        const { osc: o } = playNote('triangle', nf(note), s, eighth * 1.8, musicGain, 0.18);
        nodes.push(o);
      });

      bass.forEach((note, i) => {
        if (!note) return;
        const s = startTime + i * eighth;
        const { osc: o } = playNote('triangle', nf(note), s, beat * 1.5, musicGain, 0.12);
        nodes.push(o);
      });

      return nodes;
    }

    scheduleLoop(pattern, barDuration);
  }

  // --- Map Music: adventurous, medium tempo ---
  function playMapMusic() {
    ensureCtx();
    stopAllMusicNodes();

    const bpm = 100;
    const beat = 60 / bpm;
    const barDuration = beat * 16;

    // Adventurous melody in G major
    const melody = [
      'G4', null, 'B4', null, 'D5', null, 'E5', null,
      'D5', null, 'B4', null, 'C5', null, 'A4', null,
      'G4', null, 'A4', null, 'B4', null, 'D5', null,
      'C5', null, 'B4', null, 'A4', null, 'G4', null,
    ];

    const bass = [
      'G3', null, null, null, 'D3', null, null, null,
      'E3', null, null, null, 'C3', null, 'D3', null,
      'G3', null, null, null, 'B3', null, null, null,
      'C3', null, 'D3', null, 'G3', null, null, null,
    ];

    // Counter-melody adds adventure flavor
    const counter = [
      null, null, null, null, 'G4', null, null, null,
      null, null, null, null, 'E4', null, null, null,
      null, null, null, null, 'G4', null, null, null,
      null, null, 'F#4', null, 'G4', null, null, null,
    ];

    function pattern(startTime) {
      const nodes = [];
      const eighth = beat / 2;

      melody.forEach((note, i) => {
        if (!note) return;
        const s = startTime + i * eighth;
        const { osc: o } = playNote('square', nf(note), s, eighth * 0.9, musicGain, 0.15);
        nodes.push(o);
      });

      bass.forEach((note, i) => {
        if (!note) return;
        const s = startTime + i * eighth;
        const { osc: o } = playNote('triangle', nf(note), s, beat * 1.2, musicGain, 0.12);
        nodes.push(o);
      });

      counter.forEach((note, i) => {
        if (!note) return;
        const s = startTime + i * eighth;
        const { osc: o } = playNote('triangle', nf(note), s, eighth * 1.5, musicGain, 0.08);
        nodes.push(o);
      });

      // Light percussion: hi-hat-like noise on off-beats
      for (let b = 0; b < 16; b += 2) {
        const s = startTime + (b + 1) * eighth;
        const hg = ctx.createGain();
        hg.connect(musicGain);
        hg.gain.setValueAtTime(0.04, s);
        hg.gain.linearRampToValueAtTime(0, s + 0.03);

        const hf = ctx.createBiquadFilter();
        hf.type = 'highpass';
        hf.frequency.setValueAtTime(6000, s);
        hf.connect(hg);

        const sr = ctx.sampleRate;
        const len = Math.floor(sr * 0.03);
        const buf = ctx.createBuffer(1, len, sr);
        const data = buf.getChannelData(0);
        for (let j = 0; j < len; j++) data[j] = Math.random() * 2 - 1;
        const hn = ctx.createBufferSource();
        hn.buffer = buf;
        hn.connect(hf);
        hn.start(s);
        hn.stop(s + 0.03);
        nodes.push(hn);
      }

      return nodes;
    }

    scheduleLoop(pattern, barDuration);
  }

  // --- Title Music: epic/heroic theme ---
  function playTitleMusic() {
    ensureCtx();
    stopAllMusicNodes();

    const bpm = 90;
    const beat = 60 / bpm;
    const barDuration = beat * 32; // 8-bar epic phrase

    // Epic melody in C major - heroic, slower notes for grandeur
    const melodyData = [
      // Bar 1-2: opening statement
      { note: 'C4', beat: 0, dur: 2 },
      { note: 'E4', beat: 2, dur: 2 },
      { note: 'G4', beat: 4, dur: 2 },
      { note: 'C5', beat: 6, dur: 2 },
      // Bar 3-4: ascending heroic line
      { note: 'B4', beat: 8, dur: 1 },
      { note: 'C5', beat: 9, dur: 1 },
      { note: 'D5', beat: 10, dur: 2 },
      { note: 'E5', beat: 12, dur: 3 },
      { note: 'D5', beat: 15, dur: 1 },
      // Bar 5-6: response
      { note: 'C5', beat: 16, dur: 2 },
      { note: 'G4', beat: 18, dur: 2 },
      { note: 'A4', beat: 20, dur: 2 },
      { note: 'B4', beat: 22, dur: 2 },
      // Bar 7-8: resolution
      { note: 'C5', beat: 24, dur: 2 },
      { note: 'E5', beat: 26, dur: 2 },
      { note: 'D5', beat: 28, dur: 2 },
      { note: 'C5', beat: 30, dur: 2 },
    ];

    // Harmonic bass
    const bassData = [
      { note: 'C3', beat: 0, dur: 4 },
      { note: 'C3', beat: 4, dur: 4 },
      { note: 'G3', beat: 8, dur: 4 },
      { note: 'A3', beat: 12, dur: 4 },
      { note: 'F3', beat: 16, dur: 4 },
      { note: 'C3', beat: 20, dur: 4 },
      { note: 'F3', beat: 24, dur: 4 },
      { note: 'G3', beat: 28, dur: 4 },
    ];

    // Harmony/pad layer
    const harmonyData = [
      { note: 'E4', beat: 0, dur: 4 },
      { note: 'E4', beat: 4, dur: 4 },
      { note: 'D4', beat: 8, dur: 4 },
      { note: 'C4', beat: 12, dur: 4 },
      { note: 'A3', beat: 16, dur: 4 },
      { note: 'E4', beat: 20, dur: 4 },
      { note: 'A3', beat: 24, dur: 4 },
      { note: 'B3', beat: 28, dur: 4 },
    ];

    function pattern(startTime) {
      const nodes = [];

      melodyData.forEach((n) => {
        const s = startTime + n.beat * beat;
        const { osc: o } = playNote('square', nf(n.note), s, n.dur * beat * 0.9, musicGain, 0.16);
        nodes.push(o);
      });

      bassData.forEach((n) => {
        const s = startTime + n.beat * beat;
        const { osc: o } = playNote('triangle', nf(n.note), s, n.dur * beat * 0.9, musicGain, 0.12);
        nodes.push(o);
      });

      harmonyData.forEach((n) => {
        const s = startTime + n.beat * beat;
        const { osc: o } = playNote('triangle', nf(n.note), s, n.dur * beat * 0.85, musicGain, 0.06);
        nodes.push(o);
      });

      // Slow kick on beats 1 and 3 of each bar
      for (let bar = 0; bar < 8; bar++) {
        [0, 2].forEach((b) => {
          const s = startTime + (bar * 4 + b) * beat;
          const kg = ctx.createGain();
          kg.connect(musicGain);
          kg.gain.setValueAtTime(0.08, s);
          kg.gain.linearRampToValueAtTime(0, s + 0.1);
          const ko = ctx.createOscillator();
          ko.type = 'sine';
          ko.frequency.setValueAtTime(70, s);
          ko.frequency.exponentialRampToValueAtTime(25, s + 0.1);
          ko.connect(kg);
          ko.start(s);
          ko.stop(s + 0.1);
          nodes.push(ko);
        });
      }

      return nodes;
    }

    scheduleLoop(pattern, barDuration);
  }

  function stopMusic() {
    if (!ctx) return;
    ensureCtx();

    if (!musicPlaying) return;

    // Fade out over 0.5s
    const t = ctx.currentTime;
    musicGain.gain.setValueAtTime(musicVolume, t);
    musicGain.gain.linearRampToValueAtTime(0, t + 0.5);

    // Stop everything after fade completes
    setTimeout(() => {
      stopAllMusicNodes();
      // Restore music gain for next track
      if (musicGain) {
        musicGain.gain.setValueAtTime(musicVolume, ctx.currentTime);
      }
    }, 550);
  }

  // ─── Return singleton ─────────────────────────────────────

  return {
    init,
    setMasterVolume,
    setSfxVolume,
    setMusicVolume,
    mute,
    unmute,
    isMuted,

    playSlash,
    playHit,
    playCritical,
    playCombo,
    playBossDeath,
    playGoldPickup,
    playPurchase,
    playHeartbeat,
    playVictoryFanfare,
    playGameOver,
    playMenuSelect,
    playTypewriter,
    playTimerTick,

    playBattleMusic,
    playShopMusic,
    playMapMusic,
    playTitleMusic,
    stopMusic,
  };
})();
