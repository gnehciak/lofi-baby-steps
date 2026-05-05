// ============================================================
//  AUDIO BOOT
// ============================================================
let toneStarted = false;
async function startAudio() {
  if (!toneStarted) {
    await Tone.start();
    toneStarted = true;
    document.getElementById('audioToast').classList.remove('show');
  }
}
window.addEventListener('load', () => {
  // briefly show the audio toast
  const toast = document.getElementById('audioToast');
  toast.classList.add('show');
  setTimeout(() => { if (!toneStarted) toast.classList.remove('show'); }, 5000);
});

// ============================================================
//  SHARED LO-FI INSTRUMENTS
// ============================================================
// Master lo-fi bus
const masterFilter = new Tone.Filter(3500, 'lowpass').toDestination();
const masterReverb = new Tone.Reverb({ decay: 2.2, wet: 0.18 }).connect(masterFilter);

// Drum kit
const kick = new Tone.MembraneSynth({
  pitchDecay: 0.05, octaves: 4,
  oscillator: { type: 'sine' },
  envelope: { attack: 0.001, decay: 0.4, sustain: 0.01, release: 1.2 },
  volume: -2
}).connect(masterFilter);

const snareNoise = new Tone.NoiseSynth({
  noise: { type: 'pink' },
  envelope: { attack: 0.001, decay: 0.18, sustain: 0 },
  volume: -10
}).connect(masterFilter);

const snareTone = new Tone.Synth({
  oscillator: { type: 'triangle' },
  envelope: { attack: 0.001, decay: 0.12, sustain: 0, release: 0.1 },
  volume: -14
}).connect(masterFilter);

const hat = new Tone.MetalSynth({
  envelope: { attack: 0.001, decay: 0.05, release: 0.01 },
  harmonicity: 5.1, modulationIndex: 32, resonance: 4000, octaves: 1.5,
  volume: -28
}).connect(masterFilter);

// Pad / chord instrument — soft electric piano feel
const pad = new Tone.PolySynth(Tone.Synth, {
  oscillator: { type: 'triangle' },
  envelope: { attack: 0.02, decay: 0.6, sustain: 0.4, release: 1.2 },
  volume: -10
}).connect(masterReverb);

// Melody / lead
const lead = new Tone.Synth({
  oscillator: { type: 'sine' },
  envelope: { attack: 0.02, decay: 0.3, sustain: 0.5, release: 0.8 },
  volume: -8
}).connect(masterReverb);

// Click track for the metronome
const click = new Tone.MembraneSynth({
  pitchDecay: 0.008, octaves: 2,
  envelope: { attack: 0.001, decay: 0.06, sustain: 0, release: 0.1 },
  volume: -10
}).toDestination();

Tone.Transport.swing = 0.32;
Tone.Transport.swingSubdivision = '16n';

// ============================================================
//  HERO DEMO LOOP
// ============================================================
const heroPlayBtn = document.getElementById('heroPlay');
const heroVinyl = document.getElementById('heroVinyl');
let heroPlaying = false;
let heroLoop = null;
let heroChordLoop = null;
let heroMelodyLoop = null;

function startHeroLoop() {
  Tone.Transport.bpm.value = 76;

  // drums: kick on 1 and "and of 2.5", snare on 2 and 4, hat every 8th
  const drumPattern = [
    // 16-step pattern: K, S, H rows (1=on)
    // step:        1   2   3   4   5   6   7   8   9   10  11  12  13  14  15  16
    /* kick */  [1,0,0,0, 0,0,1,0, 0,0,1,0, 0,0,0,0],
    /* snare*/  [0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,1],
    /* hat  */  [1,0,1,0, 1,0,1,0, 1,0,1,0, 1,0,1,0]
  ];
  let step = 0;
  heroLoop = new Tone.Loop((time) => {
    if (drumPattern[0][step]) kick.triggerAttackRelease('C2', '8n', time);
    if (drumPattern[1][step]) {
      snareNoise.triggerAttackRelease('16n', time);
      snareTone.triggerAttackRelease('G3', '16n', time);
    }
    if (drumPattern[2][step]) hat.triggerAttackRelease('C5', '32n', time, 0.4);
    step = (step + 1) % 16;
  }, '16n').start(0);

  // chords: Am7 Dm7 G7 Cmaj7, 2 beats each
  const chords = [
    ['A3','C4','E4','G4'],
    ['D4','F4','A4','C5'],
    ['G3','B3','D4','F4'],
    ['C4','E4','G4','B4'],
  ];
  let chordIdx = 0;
  heroChordLoop = new Tone.Loop((time) => {
    pad.triggerAttackRelease(chords[chordIdx], '2n', time, 0.5);
    chordIdx = (chordIdx + 1) % 4;
  }, '2n').start(0);

  // melody: simple pentatonic phrase across 2 bars
  const mel = [
    {n:'A4', t:'0:0', d:'4n'},
    {n:'C5', t:'0:1', d:'8n'},
    {n:'E5', t:'0:1:2', d:'8n'},
    {n:'D5', t:'0:2', d:'4n'},
    {n:'C5', t:'0:3:2', d:'8n'},
    {n:'A4', t:'1:0', d:'2n'},
    {n:'G4', t:'1:2', d:'4n'},
    {n:'E4', t:'1:3', d:'4n'},
  ];
  const part = new Tone.Part((time, ev) => {
    lead.triggerAttackRelease(ev.n, ev.d, time, 0.6);
  }, mel);
  part.loop = true;
  part.loopEnd = '2m';
  part.start(0);
  heroMelodyLoop = part;

  Tone.Transport.start();
  heroVinyl.classList.add('spinning');
}

function stopHeroLoop() {
  Tone.Transport.stop();
  Tone.Transport.cancel();
  if (heroLoop) heroLoop.dispose();
  if (heroChordLoop) heroChordLoop.dispose();
  if (heroMelodyLoop) heroMelodyLoop.dispose();
  heroLoop = heroChordLoop = heroMelodyLoop = null;
  heroVinyl.classList.remove('spinning');
}

heroPlayBtn.addEventListener('click', async () => {
  await startAudio();
  if (heroPlaying) {
    stopHeroLoop();
    heroPlayBtn.innerHTML = '<span class="play-icon"></span> Play demo';
  } else {
    // make sure other transports are clean
    stopAllOthers('hero');
    startHeroLoop();
    heroPlayBtn.innerHTML = '<span class="stop-icon"></span> Stop demo';
  }
  heroPlaying = !heroPlaying;
});

// ============================================================
//  STEP 1 — METRONOME
// ============================================================
const metroBtn = document.getElementById('metroBtn');
const metroTempo = document.getElementById('metroTempo');
const metroBpm = document.getElementById('metroBpm');
let metroPlaying = false;
let metroLoop = null;

metroTempo.addEventListener('input', e => {
  metroBpm.textContent = e.target.value;
  if (metroPlaying) Tone.Transport.bpm.value = parseInt(e.target.value);
  // also reflect in drumTempo if not playing the drums
  const dt = document.getElementById('drumTempo');
  const db = document.getElementById('drumBpm');
  if (dt && !drumPlaying) { dt.value = e.target.value; db.textContent = e.target.value; }
});

metroBtn.addEventListener('click', async () => {
  await startAudio();
  if (metroPlaying) {
    Tone.Transport.stop();
    if (metroLoop) metroLoop.dispose();
    metroLoop = null;
    metroPlaying = false;
    metroBtn.innerHTML = '<span class="play-icon"></span> Click track';
  } else {
    stopAllOthers('metro');
    Tone.Transport.bpm.value = parseInt(metroTempo.value);
    let beat = 0;
    metroLoop = new Tone.Loop((time) => {
      const pitch = (beat % 4 === 0) ? 'C5' : 'C4';
      click.triggerAttackRelease(pitch, '32n', time);
      beat++;
    }, '4n').start(0);
    Tone.Transport.start();
    metroPlaying = true;
    metroBtn.innerHTML = '<span class="stop-icon"></span> Stop click';
  }
});

// ============================================================
//  STEP 1 — MOOD SELECTOR
// ============================================================
document.querySelectorAll('.mood').forEach(m => {
  m.addEventListener('click', () => {
    document.querySelectorAll('.mood').forEach(x => x.classList.remove('selected'));
    m.classList.add('selected');
    // suggest a tempo that fits the mood
    const moodTempos = { study: 80, rainy: 72, latenight: 76, sunday: 84 };
    const t = moodTempos[m.dataset.mood];
    if (t) {
      metroTempo.value = t;
      metroBpm.textContent = t;
      const dt = document.getElementById('drumTempo');
      const db = document.getElementById('drumBpm');
      if (dt) { dt.value = t; db.textContent = t; }
    }
  });
});

// ============================================================
//  STEP 2 — DRUM GRID
// ============================================================
const drumGrid = document.getElementById('drumGrid');
const drumPlay = document.getElementById('drumPlay');
const drumClear = document.getElementById('drumClear');
const drumStarter = document.getElementById('drumStarter');
const drumTempo = document.getElementById('drumTempo');
const drumBpm = document.getElementById('drumBpm');

const ROWS = ['kick', 'snare', 'hat'];
const ROW_LABELS = ['Kick', 'Snare', 'Hat'];
const STEPS = 16;
let drumState = ROWS.map(() => Array(STEPS).fill(false));
let drumPlaying = false;
let drumLoop = null;

function buildDrumGrid() {
  drumGrid.innerHTML = '';
  ROWS.forEach((row, r) => {
    const label = document.createElement('div');
    label.className = 'row-label';
    label.textContent = ROW_LABELS[r];
    drumGrid.appendChild(label);
    for (let s = 0; s < STEPS; s++) {
      const cell = document.createElement('button');
      cell.className = 'cell ' + row;
      if (s % 4 === 0) cell.classList.add('beat-mark');
      cell.dataset.row = r;
      cell.dataset.step = s;
      cell.addEventListener('click', () => {
        drumState[r][s] = !drumState[r][s];
        cell.classList.toggle('on', drumState[r][s]);
      });
      drumGrid.appendChild(cell);
    }
  });
}
buildDrumGrid();

function applyDrumState() {
  document.querySelectorAll('.drum-grid .cell').forEach(c => {
    const r = parseInt(c.dataset.row), s = parseInt(c.dataset.step);
    c.classList.toggle('on', drumState[r][s]);
  });
}

drumClear.addEventListener('click', () => {
  drumState = ROWS.map(() => Array(STEPS).fill(false));
  applyDrumState();
});

drumStarter.addEventListener('click', () => {
  // classic boom-bap: kick on 1, kick just before 3, snare on 2 and 4, hats every 8th
  drumState = [
    [1,0,0,0, 0,0,1,0, 0,0,1,0, 0,0,0,0],
    [0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,1],
    [1,0,1,0, 1,0,1,0, 1,0,1,0, 1,0,1,0]
  ].map(r => r.map(v => !!v));
  applyDrumState();
});

drumTempo.addEventListener('input', e => {
  drumBpm.textContent = e.target.value;
  if (drumPlaying) Tone.Transport.bpm.value = parseInt(e.target.value);
});

drumPlay.addEventListener('click', async () => {
  await startAudio();
  if (drumPlaying) {
    Tone.Transport.stop();
    if (drumLoop) drumLoop.dispose();
    drumLoop = null;
    drumPlaying = false;
    drumPlay.innerHTML = '<span class="play-icon"></span> Play';
    document.querySelectorAll('.drum-grid .cell.playing').forEach(c => c.classList.remove('playing'));
  } else {
    stopAllOthers('drum');
    Tone.Transport.bpm.value = parseInt(drumTempo.value);
    let step = 0;
    drumLoop = new Tone.Loop((time) => {
      if (drumState[0][step]) kick.triggerAttackRelease('C2', '8n', time);
      if (drumState[1][step]) {
        snareNoise.triggerAttackRelease('16n', time);
        snareTone.triggerAttackRelease('G3', '16n', time);
      }
      if (drumState[2][step]) hat.triggerAttackRelease('C5', '32n', time, 0.4);
      // visual highlight
      const curStep = step;
      Tone.Draw.schedule(() => {
        document.querySelectorAll('.drum-grid .cell.playing').forEach(c => c.classList.remove('playing'));
        document.querySelectorAll(`.drum-grid .cell[data-step="${curStep}"]`).forEach(c => c.classList.add('playing'));
      }, time);
      step = (step + 1) % STEPS;
    }, '16n').start(0);
    Tone.Transport.start();
    drumPlaying = true;
    drumPlay.innerHTML = '<span class="stop-icon"></span> Stop';
  }
});

// ============================================================
//  MIDI ENCODER (Standard MIDI File, format 0)
//  Tiny hand-rolled encoder so we don't pull in another library.
// ============================================================
function noteNameToMidi(name) {
  // "A4" -> 69, "C#5" -> 73, "Bb3" -> 58
  const m = name.match(/^([A-Ga-g])([#b]?)(-?\d+)$/);
  if (!m) return 60;
  const semitones = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  const acc = m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0;
  return 12 * (parseInt(m[3], 10) + 1) + semitones[m[1].toUpperCase()] + acc;
}

function vlqBytes(value) {
  if (value < 0) value = 0;
  const out = [value & 0x7F];
  value >>= 7;
  while (value > 0) {
    out.unshift((value & 0x7F) | 0x80);
    value >>= 7;
  }
  return out;
}

// events: array of {time: ticks, type: 'on'|'off', note: midi#, velocity: 0-127}
// ppq: ticks per quarter note (default 96)
// bpm: tempo
function encodeMidi(events, bpm, ppq) {
  ppq = ppq || 96;
  bpm = bpm || 76;
  // Sort by time, stable: note-offs before note-ons at the same tick
  events = events.slice().sort((a, b) => {
    if (a.time !== b.time) return a.time - b.time;
    if (a.type === b.type) return 0;
    return a.type === 'off' ? -1 : 1;
  });

  const track = [];
  // Tempo meta (FF 51 03 + microsecondsPerQuarter, 3 bytes)
  const usPerQuarter = Math.round(60000000 / bpm);
  track.push(0x00, 0xFF, 0x51, 0x03,
    (usPerQuarter >> 16) & 0xFF, (usPerQuarter >> 8) & 0xFF, usPerQuarter & 0xFF);
  // Time signature 4/4
  track.push(0x00, 0xFF, 0x58, 0x04, 0x04, 0x02, 0x18, 0x08);
  // Track name (optional)
  const name = 'Lo-Fi Baby Steps';
  const nameBytes = Array.from(new TextEncoder().encode(name));
  track.push(0x00, 0xFF, 0x03, nameBytes.length, ...nameBytes);

  let prev = 0;
  for (const ev of events) {
    const delta = Math.max(0, ev.time - prev);
    track.push(...vlqBytes(delta));
    if (ev.type === 'on') {
      track.push(0x90, ev.note & 0x7F, ev.velocity & 0x7F);
    } else {
      track.push(0x80, ev.note & 0x7F, (ev.velocity || 0) & 0x7F);
    }
    prev = ev.time;
  }
  // End of track
  track.push(0x00, 0xFF, 0x2F, 0x00);

  const trackLen = track.length;
  const header = [
    0x4D, 0x54, 0x68, 0x64,  // "MThd"
    0x00, 0x00, 0x00, 0x06,  // header chunk length
    0x00, 0x00,              // format 0
    0x00, 0x01,              // 1 track
    (ppq >> 8) & 0xFF, ppq & 0xFF
  ];
  const trackHeader = [
    0x4D, 0x54, 0x72, 0x6B,  // "MTrk"
    (trackLen >> 24) & 0xFF, (trackLen >> 16) & 0xFF, (trackLen >> 8) & 0xFF, trackLen & 0xFF
  ];
  return new Uint8Array([...header, ...trackHeader, ...track]);
}

function downloadMidi(bytes, filename) {
  const blob = new Blob([bytes], { type: 'audio/midi' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function safeFilename(s) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

// ============================================================
//  STEP 3 — CHORD PROGRESSIONS (with piano roll + MIDI export)
// ============================================================
const PROGS = [
  { name: 'Sleepy Café',      labels: ['Am7','Dm7','G7','Cmaj7'],     chords: [['A3','C4','E4','G4'], ['D4','F4','A4','C5'], ['G3','B3','D4','F4'], ['C4','E4','G4','B4']] },
  { name: 'Late Night Drive', labels: ['Cmaj7','Em7','Am7','Fmaj7'],  chords: [['C4','E4','G4','B4'], ['E4','G4','B4','D5'], ['A3','C4','E4','G4'], ['F3','A3','C4','E4']] },
  { name: 'Rainy Window',     labels: ['Fmaj7','Em7','Dm7','Cmaj7'],  chords: [['F3','A3','C4','E4'], ['E4','G4','B4','D5'], ['D4','F4','A4','C5'], ['C4','E4','G4','B4']] },
  { name: 'Sunday Morning',   labels: ['Dm7','G7','Cmaj7','Am7'],     chords: [['D4','F4','A4','C5'], ['G3','B3','D4','F4'], ['C4','E4','G4','B4'], ['A3','C4','E4','G4']] }
];
const CHORD_PALETTE = ['#c98a8a', '#d4a857', '#7d9b76', '#8a8ec9']; // rose, gold, sage, indigo
const CHORD_BPM = 76;
const CHORD_PPQ = 96;

let chordPlaying = false;
let chordLoop = null;
let activeProg = 0; // default selection

// --- Chord piano roll renderer (SVG) ---
function renderChordRoll(progIdx) {
  const prog = PROGS[progIdx];
  const chords = prog.chords;
  // Pitch range: F3 (53) to F5 (77) — 25 semitones, 2 octaves + 1
  const lo = 53, hi = 77;
  const rows = hi - lo + 1;
  const W = 720, H = 220;
  const keyW = 50, padL = keyW + 6, padT = 8, padR = 10, padB = 22;
  const gridW = W - padL - padR;
  const gridH = H - padT - padB;
  const rowH = gridH / rows;
  const beats = 8; // 4 chords × 2 beats
  const colW = gridW / beats;

  let svg = `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Piano roll for ${prog.name}">`;

  // background
  svg += `<rect x="0" y="0" width="${W}" height="${H}" fill="#fffdf7" rx="6"/>`;

  // pitch row stripes (lighter for white keys, darker for black keys)
  for (let i = 0; i < rows; i++) {
    const midi = hi - i;
    const pc = midi % 12;
    const isBlack = [1, 3, 6, 8, 10].includes(pc);
    const y = padT + i * rowH;
    svg += `<rect x="${padL}" y="${y}" width="${gridW}" height="${rowH}" fill="${isBlack ? '#ebdfc3' : '#fffdf7'}" opacity="${isBlack ? 0.55 : 1}"/>`;
  }

  // pitch labels (octave Cs only, on the left)
  for (let i = 0; i < rows; i++) {
    const midi = hi - i;
    const pc = midi % 12;
    if (pc === 0) {
      const y = padT + i * rowH + rowH / 2;
      const oct = Math.floor(midi / 12) - 1;
      svg += `<text x="${keyW - 8}" y="${y + 3.5}" text-anchor="end" font-family="Inter, sans-serif" font-size="9" fill="#5a4636" opacity="0.75">C${oct}</text>`;
    }
  }

  // beat divider lines
  for (let b = 0; b <= beats; b++) {
    const x = padL + b * colW;
    const heavy = b % 2 === 0;
    svg += `<line x1="${x}" y1="${padT}" x2="${x}" y2="${padT + gridH}" stroke="#3a2a1c" stroke-width="${heavy ? 1 : 0.4}" opacity="${heavy ? 0.18 : 0.1}"/>`;
  }

  // chord blocks (each chord = 2 beats wide, all 4 notes simultaneously)
  for (let ci = 0; ci < chords.length; ci++) {
    const chord = chords[ci];
    const x = padL + ci * 2 * colW + 3;
    const w = 2 * colW - 6;
    const color = CHORD_PALETTE[ci];
    for (const noteName of chord) {
      const midi = noteNameToMidi(noteName);
      if (midi < lo || midi > hi) continue;
      const i = hi - midi;
      const y = padT + i * rowH + 1;
      const h = rowH - 2;
      svg += `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${color}" rx="3" opacity="0.92"/>`;
    }
  }

  // chord name labels at the bottom
  for (let ci = 0; ci < chords.length; ci++) {
    const x = padL + ci * 2 * colW + colW;
    svg += `<text x="${x}" y="${H - 6}" text-anchor="middle" font-family="Fraunces, serif" font-size="13" font-weight="700" fill="#3a2a1c">${prog.labels[ci]}</text>`;
  }

  // playhead
  svg += `<line id="chordPlayhead" x1="${padL}" y1="${padT}" x2="${padL}" y2="${padT + gridH}" stroke="#3a2a1c" stroke-width="1.6" opacity="0" pointer-events="none"/>`;

  svg += `</svg>`;

  document.getElementById('chordRoll').innerHTML = svg;
  document.getElementById('chordRollName').textContent = prog.name;
  // Export needs the geometry
  return { padL, padT, gridW, gridH, beats };
}

let chordRollGeom = null;

// Initial render
chordRollGeom = renderChordRoll(activeProg);
document.querySelectorAll('.chord-card').forEach((c, i) => {
  if (i === activeProg) c.classList.add('active');
});

// Card click = select progression (and start playing if not already on it)
document.querySelectorAll('.chord-card').forEach(card => {
  card.addEventListener('click', async () => {
    await startAudio();
    const idx = parseInt(card.dataset.prog);
    document.querySelectorAll('.chord-card').forEach(c => c.classList.remove('active'));
    card.classList.add('active');
    activeProg = idx;
    chordRollGeom = renderChordRoll(idx);
    if (chordPlaying) {
      // restart the loop with the new progression
      stopChordsAudio();
      startChordLoop(idx);
    } else {
      // auto-play on selection
      stopAllOthers('chord');
      startChordLoop(idx);
    }
  });
});

let chordPhAnim = null;
function startChordLoop(idx) {
  Tone.Transport.bpm.value = CHORD_BPM;
  let i = 0;
  const prog = PROGS[idx].chords;
  const beatsPerChord = 2, beatsTotal = 8;
  const chordSec = (60 / CHORD_BPM) * beatsPerChord;
  chordLoop = new Tone.Loop((time) => {
    pad.triggerAttackRelease(prog[i], '2n', time, 0.55);
    const curI = i;
    Tone.Draw.schedule(() => {
      // playhead: smoothly slide across this chord's segment
      const ph = document.getElementById('chordPlayhead');
      if (ph && chordRollGeom) {
        const xStart = (curI * beatsPerChord / beatsTotal) * chordRollGeom.gridW;
        const xEnd = ((curI + 1) * beatsPerChord / beatsTotal) * chordRollGeom.gridW;
        ph.setAttribute('opacity', '0.85');
        if (chordPhAnim) chordPhAnim.cancel();
        chordPhAnim = ph.animate(
          [{ transform: `translateX(${xStart}px)` }, { transform: `translateX(${xEnd}px)` }],
          { duration: chordSec * 1000, easing: 'linear', fill: 'forwards' }
        );
      }
      // chord pill highlight on the active card
      document.querySelectorAll('.chord-card.active .chords span').forEach(s => s.classList.remove('playing'));
      const span = document.querySelector(`.chord-card.active .chords span[data-i="${curI}"]`);
      if (span) span.classList.add('playing');
    }, time);
    i = (i + 1) % 4;
  }, '2n').start(0);
  Tone.Transport.start();
  chordPlaying = true;
  setChordPlayBtn(true);
}

function stopChordsAudio() {
  Tone.Transport.stop();
  Tone.Transport.cancel();
  if (chordLoop) chordLoop.dispose();
  chordLoop = null;
  chordPlaying = false;
  document.querySelectorAll('.chord-card .chords span').forEach(s => s.classList.remove('playing'));
  if (chordPhAnim) { chordPhAnim.cancel(); chordPhAnim = null; }
  const ph = document.getElementById('chordPlayhead');
  if (ph) ph.setAttribute('opacity', '0');
  setChordPlayBtn(false);
}

function setChordPlayBtn(playing) {
  const b = document.getElementById('chordPlayBtn');
  if (!b) return;
  b.innerHTML = playing
    ? '<span class="stop-icon"></span> Stop loop'
    : '<span class="play-icon"></span> Play loop';
}

document.getElementById('chordStop').addEventListener('click', () => {
  if (chordPlaying) stopChordsAudio();
});

document.getElementById('chordPlayBtn').addEventListener('click', async () => {
  await startAudio();
  if (chordPlaying) {
    stopChordsAudio();
  } else {
    stopAllOthers('chord');
    startChordLoop(activeProg);
  }
});

document.getElementById('chordExportBtn').addEventListener('click', () => {
  const prog = PROGS[activeProg];
  // Each chord is 2 beats = 2 * PPQ ticks. 4 chords = 8 beats.
  const ticksPerChord = 2 * CHORD_PPQ;
  const events = [];
  for (let ci = 0; ci < prog.chords.length; ci++) {
    const start = ci * ticksPerChord;
    const end = start + ticksPerChord;
    for (const noteName of prog.chords[ci]) {
      const midi = noteNameToMidi(noteName);
      events.push({ time: start, type: 'on', note: midi, velocity: 78 });
      events.push({ time: end, type: 'off', note: midi, velocity: 0 });
    }
  }
  const bytes = encodeMidi(events, CHORD_BPM, CHORD_PPQ);
  downloadMidi(bytes, `lofi-chords-${safeFilename(prog.name)}.mid`);
});

// ============================================================
//  STEP 4 — MELODY PIANO ROLL (draw + play + export)
// ============================================================
// Pentatonic A minor, top→bottom = high→low pitch
const MELODY_PITCHES = ['A5','G5','E5','D5','C5','A4','G4','E4','D4','C4','A3'];
const MELODY_TONIC = new Set(['A5','A4','A3']); // visual emphasis on the root
const MELODY_STEPS = 16;
const MELODY_BPM = 76;
const MELODY_PPQ = 96;

// state[pitchIndex][stepIndex] = boolean
let melodyState = MELODY_PITCHES.map(() => Array(MELODY_STEPS).fill(false));
let melodyPlaying = false;
let melodyLoop = null;
let melodyCurrentStep = -1;

function buildMelodyRoll() {
  const root = document.getElementById('melodyRoll');
  root.innerHTML = '';

  // header row with bar markers
  const header = document.createElement('div');
  header.className = 'mr-header';
  header.innerHTML = '<div></div>' +
    '<div class="num">1</div><div class="num">2</div><div class="num">3</div><div class="num">4</div>';
  root.appendChild(header);

  for (let pi = 0; pi < MELODY_PITCHES.length; pi++) {
    const pitch = MELODY_PITCHES[pi];
    const row = document.createElement('div');
    row.className = 'mr-row';

    const key = document.createElement('button');
    key.className = 'mr-key' + (MELODY_TONIC.has(pitch) ? ' tonic' : '');
    const letter = pitch.replace(/\d/g, '');
    const oct = pitch.replace(/[^\d]/g, '');
    key.innerHTML = `${letter}<span style="font-size:0.7em;opacity:0.6;">${oct}</span>${MELODY_TONIC.has(pitch) ? '<span class="deg">root</span>' : ''}`;
    key.title = `Click to preview ${pitch}`;
    key.addEventListener('click', async () => {
      await startAudio();
      lead.triggerAttackRelease(pitch, '8n');
    });
    row.appendChild(key);

    for (let si = 0; si < MELODY_STEPS; si++) {
      const cell = document.createElement('button');
      cell.className = 'mr-cell' + (si % 4 === 0 ? ' beat-mark' : '');
      cell.dataset.pi = pi;
      cell.dataset.si = si;
      cell.title = `${pitch}, beat ${Math.floor(si/4) + 1}.${(si % 4) + 1}`;
      cell.addEventListener('click', async () => {
        await startAudio();
        const newState = !melodyState[pi][si];
        melodyState[pi][si] = newState;
        cell.classList.toggle('on', newState);
        if (newState) lead.triggerAttackRelease(pitch, '16n');
      });
      row.appendChild(cell);
    }
    root.appendChild(row);
  }
}
buildMelodyRoll();

function applyMelodyState() {
  document.querySelectorAll('.mr-cell').forEach(c => {
    const pi = parseInt(c.dataset.pi), si = parseInt(c.dataset.si);
    c.classList.toggle('on', melodyState[pi][si]);
  });
}

function clearMelodyHighlight() {
  document.querySelectorAll('.mr-cell.playing').forEach(c => c.classList.remove('playing'));
}

document.getElementById('melodyClear').addEventListener('click', () => {
  melodyState = MELODY_PITCHES.map(() => Array(MELODY_STEPS).fill(false));
  applyMelodyState();
  if (melodyPlaying) stopMelody();
});

document.getElementById('melodyRandom').addEventListener('click', () => {
  // Generate a sparse, lo-fi-friendly melody:
  //   - 3 to 5 note events
  //   - each can be 1-3 cells long
  //   - prefer small steps between consecutive notes
  melodyState = MELODY_PITCHES.map(() => Array(MELODY_STEPS).fill(false));
  let cursor = 0;
  let lastPi = Math.floor(MELODY_PITCHES.length / 2);
  const numNotes = 3 + Math.floor(Math.random() * 3); // 3..5
  for (let n = 0; n < numNotes; n++) {
    if (cursor >= MELODY_STEPS - 1) break;
    // small step from last pitch
    const stepDir = Math.random() < 0.5 ? -1 : 1;
    const stepSize = Math.random() < 0.7 ? 1 : 2;
    let pi = Math.max(0, Math.min(MELODY_PITCHES.length - 1, lastPi + stepDir * stepSize));
    if (Math.random() < 0.2) pi = lastPi; // sometimes repeat
    lastPi = pi;
    // length 1..3
    const len = 1 + Math.floor(Math.random() * 3);
    for (let k = 0; k < len && cursor + k < MELODY_STEPS; k++) {
      melodyState[pi][cursor + k] = true;
    }
    cursor += len;
    // gap
    cursor += 1 + Math.floor(Math.random() * 3);
  }
  applyMelodyState();
});

document.getElementById('melodyPlay').addEventListener('click', async () => {
  await startAudio();
  if (melodyPlaying) {
    stopMelody();
    return;
  }
  // need at least one note
  const hasAny = melodyState.some(row => row.some(c => c));
  if (!hasAny) return;
  stopAllOthers('melody');
  Tone.Transport.bpm.value = MELODY_BPM;
  melodyCurrentStep = -1;
  let step = 0;
  melodyLoop = new Tone.Loop((time) => {
    const curStep = step;
    // collect notes that start at this step (cell on; previous cell off in same row)
    const triggers = [];
    for (let pi = 0; pi < MELODY_PITCHES.length; pi++) {
      if (melodyState[pi][curStep] && (curStep === 0 || !melodyState[pi][curStep - 1])) {
        // find run length
        let len = 1;
        while (curStep + len < MELODY_STEPS && melodyState[pi][curStep + len]) len++;
        triggers.push({ pitch: MELODY_PITCHES[pi], dur: len });
      }
    }
    // duration: t.dur sixteenth notes converted to seconds
    const sixteenthSec = 60 / MELODY_BPM / 4;
    for (const t of triggers) {
      lead.triggerAttackRelease(t.pitch, sixteenthSec * t.dur * 0.95, time, 0.7);
    }
    Tone.Draw.schedule(() => {
      clearMelodyHighlight();
      document.querySelectorAll(`.mr-cell[data-si="${curStep}"]`).forEach(c => {
        if (c.classList.contains('on')) c.classList.add('playing');
      });
    }, time);
    step = (step + 1) % MELODY_STEPS;
  }, '16n').start(0);
  Tone.Transport.start();
  melodyPlaying = true;
  setMelodyPlayBtn(true);
});

function stopMelody() {
  Tone.Transport.stop();
  Tone.Transport.cancel();
  if (melodyLoop) melodyLoop.dispose();
  melodyLoop = null;
  melodyPlaying = false;
  clearMelodyHighlight();
  setMelodyPlayBtn(false);
}

function setMelodyPlayBtn(playing) {
  const b = document.getElementById('melodyPlay');
  if (!b) return;
  b.innerHTML = playing
    ? '<span class="stop-icon"></span> Stop loop'
    : '<span class="play-icon"></span> Play loop';
}

document.getElementById('melodyExportBtn').addEventListener('click', () => {
  // 16 sixteenth-notes per bar. 1 sixteenth = PPQ/4 ticks.
  const tps = MELODY_PPQ / 4; // ticks per step
  const events = [];
  for (let pi = 0; pi < MELODY_PITCHES.length; pi++) {
    let si = 0;
    while (si < MELODY_STEPS) {
      if (melodyState[pi][si]) {
        let len = 1;
        while (si + len < MELODY_STEPS && melodyState[pi][si + len]) len++;
        const midi = noteNameToMidi(MELODY_PITCHES[pi]);
        events.push({ time: si * tps, type: 'on', note: midi, velocity: 90 });
        events.push({ time: (si + len) * tps, type: 'off', note: midi, velocity: 0 });
        si += len;
      } else {
        si++;
      }
    }
  }
  if (events.length === 0) return; // nothing to export
  const bytes = encodeMidi(events, MELODY_BPM, MELODY_PPQ);
  downloadMidi(bytes, 'lofi-melody.mid');
});

// ============================================================
//  TRANSPORT CONFLICT MANAGER
//  Tone.Transport is shared. Stop everyone else when one starts.
// ============================================================
function stopAllOthers(except) {
  if (except !== 'hero' && heroPlaying) {
    Tone.Transport.stop();
    Tone.Transport.cancel();
    if (heroLoop) heroLoop.dispose();
    if (heroChordLoop) heroChordLoop.dispose();
    if (heroMelodyLoop) heroMelodyLoop.dispose();
    heroLoop = heroChordLoop = heroMelodyLoop = null;
    heroPlaying = false;
    heroVinyl.classList.remove('spinning');
    heroPlayBtn.innerHTML = '<span class="play-icon"></span> Play demo';
  }
  if (except !== 'metro' && metroPlaying) {
    if (metroLoop) metroLoop.dispose();
    metroLoop = null;
    metroPlaying = false;
    metroBtn.innerHTML = '<span class="play-icon"></span> Click track';
  }
  if (except !== 'drum' && drumPlaying) {
    if (drumLoop) drumLoop.dispose();
    drumLoop = null;
    drumPlaying = false;
    drumPlay.innerHTML = '<span class="play-icon"></span> Play';
    document.querySelectorAll('.drum-grid .cell.playing').forEach(c => c.classList.remove('playing'));
  }
  if (except !== 'chord' && chordPlaying) {
    if (chordLoop) chordLoop.dispose();
    chordLoop = null;
    chordPlaying = false;
    // keep .active on the selected card; just clear playback indicators
    document.querySelectorAll('.chord-card .chords span').forEach(s => s.classList.remove('playing'));
    const ph = document.getElementById('chordPlayhead');
    if (ph) ph.setAttribute('opacity', '0');
    setChordPlayBtn(false);
  }
  if (except !== 'melody' && melodyPlaying) {
    if (melodyLoop) melodyLoop.dispose();
    melodyLoop = null;
    melodyPlaying = false;
    clearMelodyHighlight();
    setMelodyPlayBtn(false);
  }
  // make sure transport is stopped & cleared if nothing is playing
  Tone.Transport.stop();
  Tone.Transport.cancel();
}
