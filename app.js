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
// Master lo-fi FX chain (entry point: masterCrush → wobble → filter → out).
//   - masterCrush (BitCrusher): off by default (wet=0)
//   - masterWobble (Vibrato): off by default (depth=0)
//   - masterFilter (Lowpass): always-on gentle warmth at 3500 Hz; the "Muffled"
//     dust toggle drops it to 1500 Hz for a stronger effect.
const masterFilter = new Tone.Filter(3500, 'lowpass').toDestination();
const masterWobble = new Tone.Vibrato({ frequency: 0.3, depth: 0 }).connect(masterFilter);
const masterCrush = new Tone.BitCrusher(6).connect(masterWobble);
masterCrush.wet.value = 0;
const masterReverb = new Tone.Reverb({ decay: 2.2, wet: 0.18 }).connect(masterCrush);

// Vinyl crackle generator — bypasses the dust chain so the user controls it
// independently of the other lo-fi processing. -80 dB is the "off" floor;
// rampTo(-Infinity) isn't reliable across Tone.js param types, so we use a
// finite-but-inaudible value instead.
const SILENT_DB = -80;
const crackleVol = new Tone.Volume(SILENT_DB).toDestination();
const crackleHp = new Tone.Filter(3500, 'highpass').connect(crackleVol);
const crackleSrc = new Tone.Noise('pink').connect(crackleHp);
crackleSrc.start();

// Drum kit
const kick = new Tone.MembraneSynth({
  pitchDecay: 0.05, octaves: 4,
  oscillator: { type: 'sine' },
  envelope: { attack: 0.001, decay: 0.4, sustain: 0.01, release: 1.2 },
  volume: -2
}).connect(masterCrush);

const snareNoise = new Tone.NoiseSynth({
  noise: { type: 'pink' },
  envelope: { attack: 0.001, decay: 0.18, sustain: 0 },
  volume: -10
}).connect(masterCrush);

const snareTone = new Tone.Synth({
  oscillator: { type: 'triangle' },
  envelope: { attack: 0.001, decay: 0.12, sustain: 0, release: 0.1 },
  volume: -14
}).connect(masterCrush);

const hat = new Tone.MetalSynth({
  envelope: { attack: 0.001, decay: 0.05, release: 0.01 },
  harmonicity: 5.1, modulationIndex: 32, resonance: 4000, octaves: 1.5,
  volume: -28
}).connect(masterCrush);

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

// Bass — warm sub-bass with a soft attack
const bass = new Tone.MonoSynth({
  oscillator: { type: 'triangle' },
  filter: { Q: 2, type: 'lowpass', rolloff: -12 },
  envelope: { attack: 0.02, decay: 0.4, sustain: 0.55, release: 0.4 },
  filterEnvelope: { attack: 0.01, decay: 0.2, sustain: 0.55, release: 0.4, baseFrequency: 200, octaves: 2 },
  volume: -10
}).connect(masterCrush);

// Click track for the metronome
const click = new Tone.MembraneSynth({
  pitchDecay: 0.008, octaves: 2,
  envelope: { attack: 0.001, decay: 0.06, sustain: 0, release: 0.1 },
  volume: -10
}).toDestination();

Tone.Transport.swing = 0.32;
Tone.Transport.swingSubdivision = '16n';
Tone.Transport.bpm.value = 78; // global default — every widget reads from here

// ============================================================
//  LAYER REGISTRY — multiple widgets play together on one Transport
// ============================================================
const activeLayers = new Set(); // 'drum' | 'chord' | 'melody' | 'bass'

function layerStarted(name) {
  activeLayers.add(name);
  if (Tone.Transport.state !== 'started') {
    Tone.Transport.position = 0;
    Tone.Transport.start();
  }
  updateMasterPill();
}

function layerStopped(name) {
  activeLayers.delete(name);
  if (activeLayers.size === 0 && !heroPlaying) {
    Tone.Transport.stop();
    Tone.Transport.position = 0;
  }
  updateMasterPill();
}

// First layer enters at position 0; later layers wait for the next bar line.
function nextLayerStartTime() {
  return activeLayers.size === 0 ? 0 : '@1m';
}


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
  if (heroLoop) heroLoop.dispose();
  if (heroChordLoop) heroChordLoop.dispose();
  if (heroMelodyLoop) heroMelodyLoop.dispose();
  heroLoop = heroChordLoop = heroMelodyLoop = null;
  heroVinyl.classList.remove('spinning');
  heroPlaying = false;
  heroPlayBtn.innerHTML = '<span class="play-icon"></span> Play demo';
  // Hero owns the Transport exclusively; safe to stop it here.
  Tone.Transport.stop();
  Tone.Transport.position = 0;
  updateMasterPill();
}

// Called by every layer-start. Does nothing if hero isn't running.
function stopHeroIfPlaying() {
  if (heroPlaying) stopHeroLoop();
}

heroPlayBtn.addEventListener('click', async () => {
  await startAudio();
  if (heroPlaying) {
    stopHeroLoop();
  } else {
    // Hero is exclusive — wipe any active layers first
    stopAllLayers();
    startHeroLoop();
    heroPlaying = true;
    heroPlayBtn.innerHTML = '<span class="stop-icon"></span> Stop demo';
    updateMasterPill();
  }
});

// ============================================================
//  STEP 1 — METRONOME (independent clock — does NOT touch Transport)
// ============================================================
// The metronome runs on its own Tone.Clock so its tempo is fully
// decoupled from the layer tempo (drums/chords/melody on Transport).
// Step 1 is a teaching aid for finding tempo, not a layer.
const metroBtn = document.getElementById('metroBtn');
const metroTempo = document.getElementById('metroTempo');
const metroBpm = document.getElementById('metroBpm');
let metroPlaying = false;
let metroBeat = 0;

const metroClock = new Tone.Clock((time) => {
  const pitch = (metroBeat % 4 === 0) ? 'C5' : 'C4';
  click.triggerAttackRelease(pitch, '32n', time);
  metroBeat++;
}, parseInt(metroTempo.value) / 60); // frequency in Hz; bpm/60 = quarter-note rate

metroTempo.addEventListener('input', e => {
  const bpm = parseInt(e.target.value);
  metroBpm.textContent = bpm;
  metroClock.frequency.value = bpm / 60;
});

metroBtn.addEventListener('click', async () => {
  await startAudio();
  if (metroPlaying) {
    metroClock.stop();
    metroPlaying = false;
    metroBtn.innerHTML = '<span class="play-icon"></span> Click track';
  } else {
    metroBeat = 0;
    metroClock.frequency.value = parseInt(metroTempo.value) / 60;
    metroClock.start();
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
    // Suggest a tempo that fits the mood. Step 1 is intentionally isolated
    // from the master/layer tempo, so this only updates the metronome.
    const moodTempos = { study: 80, rainy: 72, latenight: 76, sunday: 84 };
    const t = moodTempos[m.dataset.mood];
    if (t) {
      metroTempo.value = t;
      metroBpm.textContent = t;
      metroClock.frequency.value = t / 60;
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

const ROWS = ['kick', 'snare', 'hat'];
const ROW_LABELS = ['Kick', 'Snare', 'Hat'];
const STEPS = 16;
let drumState = ROWS.map(() => Array(STEPS).fill(false));
let drumPlaying = false;
let drumLoop = null;

function buildDrumGrid() {
  drumGrid.innerHTML = '';
  // Visually render rows top→bottom as Hat, Snare, Kick (so the kick — the
  // lowest-pitched sound — sits at the bottom). Audio indices stay unchanged.
  const visualOrder = [2, 1, 0];
  visualOrder.forEach(r => {
    const row = ROWS[r];
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


function startDrumLayer() {
  stopHeroIfPlaying();
  let step = 0;
  drumLoop = new Tone.Loop((time) => {
    if (drumState[0][step]) kick.triggerAttackRelease('C2', '8n', time);
    if (drumState[1][step]) {
      snareNoise.triggerAttackRelease('16n', time);
      snareTone.triggerAttackRelease('G3', '16n', time);
    }
    if (drumState[2][step]) hat.triggerAttackRelease('C5', '32n', time, 0.4);
    const curStep = step;
    Tone.Draw.schedule(() => {
      document.querySelectorAll('.drum-grid .cell.playing').forEach(c => c.classList.remove('playing'));
      document.querySelectorAll(`.drum-grid .cell[data-step="${curStep}"]`).forEach(c => c.classList.add('playing'));
    }, time);
    step = (step + 1) % STEPS;
  }, '16n');
  drumLoop.start(nextLayerStartTime());
  drumPlaying = true;
  drumPlay.innerHTML = '<span class="stop-icon"></span> Stop';
  layerStarted('drum');
}

function stopDrumLayer() {
  if (!drumPlaying) return;
  if (drumLoop) drumLoop.dispose();
  drumLoop = null;
  drumPlaying = false;
  drumPlay.innerHTML = '<span class="play-icon"></span> Play';
  document.querySelectorAll('.drum-grid .cell.playing').forEach(c => c.classList.remove('playing'));
  layerStopped('drum');
}

drumPlay.addEventListener('click', async () => {
  await startAudio();
  drumPlaying ? stopDrumLayer() : startDrumLayer();
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
      // swap progression in place — dispose current loop and start a new one
      // aligned to the next bar so the swap feels musical
      if (chordLoop) chordLoop.dispose();
      chordLoop = null;
      buildAndStartChordLoop(idx);
    } else {
      // auto-play on selection
      startChordLayer();
    }
  });
});

let chordPhAnim = null;

function buildAndStartChordLoop(idx) {
  let i = 0;
  const prog = PROGS[idx].chords;
  const beatsPerChord = 2, beatsTotal = 8;
  chordLoop = new Tone.Loop((time) => {
    pad.triggerAttackRelease(prog[i], '2n', time, 0.55);
    const curI = i;
    const chordSec = (60 / Tone.Transport.bpm.value) * beatsPerChord;
    Tone.Draw.schedule(() => {
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
      document.querySelectorAll('.chord-card.active .chords span').forEach(s => s.classList.remove('playing'));
      const span = document.querySelector(`.chord-card.active .chords span[data-i="${curI}"]`);
      if (span) span.classList.add('playing');
    }, time);
    i = (i + 1) % 4;
  }, '2n');
  chordLoop.start(nextLayerStartTime());
}

function startChordLayer() {
  stopHeroIfPlaying();
  buildAndStartChordLoop(activeProg);
  chordPlaying = true;
  setChordPlayBtn(true);
  layerStarted('chord');
}

function stopChordLayer() {
  if (!chordPlaying) return;
  if (chordLoop) chordLoop.dispose();
  chordLoop = null;
  chordPlaying = false;
  document.querySelectorAll('.chord-card .chords span').forEach(s => s.classList.remove('playing'));
  if (chordPhAnim) { chordPhAnim.cancel(); chordPhAnim = null; }
  const ph = document.getElementById('chordPlayhead');
  if (ph) ph.setAttribute('opacity', '0');
  setChordPlayBtn(false);
  layerStopped('chord');
}

function setChordPlayBtn(playing) {
  const b = document.getElementById('chordPlayBtn');
  if (!b) return;
  b.innerHTML = playing
    ? '<span class="stop-icon"></span> Stop loop'
    : '<span class="play-icon"></span> Play loop';
}

document.getElementById('chordStop').addEventListener('click', () => {
  stopChordLayer();
});

document.getElementById('chordPlayBtn').addEventListener('click', async () => {
  await startAudio();
  chordPlaying ? stopChordLayer() : startChordLayer();
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
  const bytes = encodeMidi(events, Math.round(Tone.Transport.bpm.value), CHORD_PPQ);
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
  header.innerHTML =
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
  if (melodyPlaying) stopMelodyLayer();
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

function startMelodyLayer() {
  // need at least one note
  const hasAny = melodyState.some(row => row.some(c => c));
  if (!hasAny) return;
  stopHeroIfPlaying();
  melodyCurrentStep = -1;
  let step = 0;
  melodyLoop = new Tone.Loop((time) => {
    const curStep = step;
    const triggers = [];
    for (let pi = 0; pi < MELODY_PITCHES.length; pi++) {
      if (melodyState[pi][curStep] && (curStep === 0 || !melodyState[pi][curStep - 1])) {
        let len = 1;
        while (curStep + len < MELODY_STEPS && melodyState[pi][curStep + len]) len++;
        triggers.push({ pitch: MELODY_PITCHES[pi], dur: len });
      }
    }
    const sixteenthSec = 60 / Tone.Transport.bpm.value / 4;
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
  }, '16n');
  melodyLoop.start(nextLayerStartTime());
  melodyPlaying = true;
  setMelodyPlayBtn(true);
  layerStarted('melody');
}

function stopMelodyLayer() {
  if (!melodyPlaying) return;
  if (melodyLoop) melodyLoop.dispose();
  melodyLoop = null;
  melodyPlaying = false;
  clearMelodyHighlight();
  setMelodyPlayBtn(false);
  layerStopped('melody');
}

document.getElementById('melodyPlay').addEventListener('click', async () => {
  await startAudio();
  melodyPlaying ? stopMelodyLayer() : startMelodyLayer();
});

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
  const bytes = encodeMidi(events, Math.round(Tone.Transport.bpm.value), MELODY_PPQ);
  downloadMidi(bytes, 'lofi-melody.mid');
});

// ============================================================
//  STEP 5 — BASS (follows the active chord progression)
// ============================================================
const BASS_LABELS = { roots: 'Just roots', pulse: 'Pulse', octave: 'Octave hop' };

let bassPattern = 'roots';
let bassPlaying = false;
let bassLoop = null;
let bassPhAnim = null;
let bassBeat = 0;
let bassRollGeom = null;

function chordRoot(chord) {
  // Drop the chord's root note (chord[0]) by one octave for the bass voice.
  const m = chord[0].match(/^([A-G][#b]?)(-?\d+)$/);
  if (!m) return 'A2';
  return m[1] + (parseInt(m[2], 10) - 1);
}

function octaveUp(noteName) {
  const m = noteName.match(/^([A-G][#b]?)(-?\d+)$/);
  if (!m) return noteName;
  return m[1] + (parseInt(m[2], 10) + 1);
}

function renderBassRoll() {
  const prog = PROGS[activeProg];
  const lo = 41, hi = 64; // F2..E4 — covers all roots + their octave-up
  const rows = hi - lo + 1;
  const W = 720, H = 180;
  const keyW = 50, padL = keyW + 6, padT = 8, padR = 10, padB = 22;
  const gridW = W - padL - padR;
  const gridH = H - padT - padB;
  const rowH = gridH / rows;
  const beats = 8;
  const colW = gridW / beats;

  let svg = `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Bass piano roll for ${prog.name}">`;
  svg += `<rect x="0" y="0" width="${W}" height="${H}" fill="#fffdf7" rx="6"/>`;

  // pitch row stripes
  for (let i = 0; i < rows; i++) {
    const midi = hi - i;
    const pc = midi % 12;
    const isBlack = [1, 3, 6, 8, 10].includes(pc);
    const y = padT + i * rowH;
    svg += `<rect x="${padL}" y="${y}" width="${gridW}" height="${rowH}" fill="${isBlack ? '#ebdfc3' : '#fffdf7'}" opacity="${isBlack ? 0.55 : 1}"/>`;
  }

  // octave labels (Cs)
  for (let i = 0; i < rows; i++) {
    const midi = hi - i;
    if (midi % 12 === 0) {
      const y = padT + i * rowH + rowH / 2;
      const oct = Math.floor(midi / 12) - 1;
      svg += `<text x="${keyW - 8}" y="${y + 3.5}" text-anchor="end" font-family="Inter, sans-serif" font-size="9" fill="#5a4636" opacity="0.75">C${oct}</text>`;
    }
  }

  // beat dividers
  for (let b = 0; b <= beats; b++) {
    const x = padL + b * colW;
    const heavy = b % 2 === 0;
    svg += `<line x1="${x}" y1="${padT}" x2="${x}" y2="${padT + gridH}" stroke="#3a2a1c" stroke-width="${heavy ? 1 : 0.4}" opacity="${heavy ? 0.18 : 0.1}"/>`;
  }

  // bass blocks per pattern
  for (let ci = 0; ci < 4; ci++) {
    const root = chordRoot(prog.chords[ci]);
    const rootMidi = noteNameToMidi(root);
    const baseX = padL + ci * 2 * colW;
    const colour = CHORD_PALETTE[ci];

    if (bassPattern === 'roots') {
      const x = baseX + 3, w = 2 * colW - 6;
      const y = padT + (hi - rootMidi) * rowH + 1;
      svg += `<rect x="${x}" y="${y}" width="${w}" height="${rowH - 2}" fill="${colour}" rx="3" opacity="0.92"/>`;
    } else if (bassPattern === 'pulse') {
      for (let beat = 0; beat < 2; beat++) {
        const x = baseX + beat * colW + 3, w = colW - 6;
        const y = padT + (hi - rootMidi) * rowH + 1;
        svg += `<rect x="${x}" y="${y}" width="${w}" height="${rowH - 2}" fill="${colour}" rx="3" opacity="0.92"/>`;
      }
    } else if (bassPattern === 'octave') {
      const x0 = baseX + 3, w0 = colW - 6;
      const y0 = padT + (hi - rootMidi) * rowH + 1;
      svg += `<rect x="${x0}" y="${y0}" width="${w0}" height="${rowH - 2}" fill="${colour}" rx="3" opacity="0.92"/>`;
      const upMidi = rootMidi + 12;
      const x1 = baseX + colW + 3, w1 = colW - 6;
      const y1 = padT + (hi - upMidi) * rowH + 1;
      svg += `<rect x="${x1}" y="${y1}" width="${w1}" height="${rowH - 2}" fill="${colour}" rx="3" opacity="0.92"/>`;
    }
  }

  // chord labels (matches chord roll for visual consistency)
  for (let ci = 0; ci < 4; ci++) {
    const x = padL + ci * 2 * colW + colW;
    svg += `<text x="${x}" y="${H - 6}" text-anchor="middle" font-family="Fraunces, serif" font-size="13" font-weight="700" fill="#3a2a1c">${prog.labels[ci]}</text>`;
  }

  // playhead
  svg += `<line id="bassPlayhead" x1="${padL}" y1="${padT}" x2="${padL}" y2="${padT + gridH}" stroke="#3a2a1c" stroke-width="1.6" opacity="0" pointer-events="none"/>`;
  svg += `</svg>`;

  document.getElementById('bassRoll').innerHTML = svg;
  document.getElementById('bassRollName').textContent = `${BASS_LABELS[bassPattern]} · follows ${prog.name}`;
  return { padL, padT, gridW, gridH, beats };
}

function buildAndStartBassLoop() {
  bassBeat = 0;
  bassLoop = new Tone.Loop((time) => {
    const prog = PROGS[activeProg].chords;
    const chordIdx = Math.floor(bassBeat / 2) % 4;
    const root = chordRoot(prog[chordIdx]);
    const beatInChord = bassBeat % 2;

    if (bassPattern === 'roots') {
      if (beatInChord === 0) bass.triggerAttackRelease(root, '2n', time, 0.7);
    } else if (bassPattern === 'pulse') {
      bass.triggerAttackRelease(root, '8n', time, 0.65);
    } else if (bassPattern === 'octave') {
      const note = beatInChord === 0 ? root : octaveUp(root);
      bass.triggerAttackRelease(note, '8n', time, 0.7);
    }

    const curBeat = bassBeat;
    const beatSec = 60 / Tone.Transport.bpm.value;
    Tone.Draw.schedule(() => {
      const ph = document.getElementById('bassPlayhead');
      if (ph && bassRollGeom) {
        const xStart = (curBeat / 8) * bassRollGeom.gridW;
        const xEnd = ((curBeat + 1) / 8) * bassRollGeom.gridW;
        ph.setAttribute('opacity', '0.85');
        if (bassPhAnim) bassPhAnim.cancel();
        bassPhAnim = ph.animate(
          [{ transform: `translateX(${xStart}px)` }, { transform: `translateX(${xEnd}px)` }],
          { duration: beatSec * 1000, easing: 'linear', fill: 'forwards' }
        );
      }
    }, time);

    bassBeat = (bassBeat + 1) % 8;
  }, '4n');
  bassLoop.start(nextLayerStartTime());
}

function startBassLayer() {
  stopHeroIfPlaying();
  buildAndStartBassLoop();
  bassPlaying = true;
  setBassPlayBtn(true);
  layerStarted('bass');
}

function stopBassLayer() {
  if (!bassPlaying) return;
  if (bassLoop) bassLoop.dispose();
  bassLoop = null;
  bassPlaying = false;
  if (bassPhAnim) { bassPhAnim.cancel(); bassPhAnim = null; }
  const ph = document.getElementById('bassPlayhead');
  if (ph) ph.setAttribute('opacity', '0');
  setBassPlayBtn(false);
  layerStopped('bass');
}

function setBassPlayBtn(playing) {
  const b = document.getElementById('bassPlayBtn');
  if (!b) return;
  b.innerHTML = playing
    ? '<span class="stop-icon"></span> Stop loop'
    : '<span class="play-icon"></span> Play loop';
}

bassRollGeom = renderBassRoll();

document.querySelectorAll('.bass-card').forEach(card => {
  card.addEventListener('click', async () => {
    await startAudio();
    document.querySelectorAll('.bass-card').forEach(c => c.classList.remove('active'));
    card.classList.add('active');
    bassPattern = card.dataset.pat;
    bassRollGeom = renderBassRoll();
    if (bassPlaying) {
      if (bassLoop) bassLoop.dispose();
      bassLoop = null;
      buildAndStartBassLoop();
    } else {
      startBassLayer();
    }
  });
});

// When the chord progression changes, keep the bass roll + loop in sync.
document.querySelectorAll('.chord-card').forEach(card => {
  card.addEventListener('click', () => {
    bassRollGeom = renderBassRoll();
    if (bassPlaying) {
      if (bassLoop) bassLoop.dispose();
      bassLoop = null;
      buildAndStartBassLoop();
    }
  });
});

document.getElementById('bassPlayBtn').addEventListener('click', async () => {
  await startAudio();
  bassPlaying ? stopBassLayer() : startBassLayer();
});
document.getElementById('bassStop').addEventListener('click', () => {
  stopBassLayer();
});

document.getElementById('bassExportBtn').addEventListener('click', () => {
  const prog = PROGS[activeProg];
  const PPQ = 96;
  const events = [];
  for (let beat = 0; beat < 8; beat++) {
    const chordIdx = Math.floor(beat / 2);
    const root = chordRoot(prog.chords[chordIdx]);
    const beatInChord = beat % 2;
    const startTick = beat * PPQ;

    if (bassPattern === 'roots') {
      if (beatInChord === 0) {
        const midi = noteNameToMidi(root);
        events.push({ time: startTick, type: 'on', note: midi, velocity: 80 });
        events.push({ time: startTick + 2 * PPQ, type: 'off', note: midi, velocity: 0 });
      }
    } else if (bassPattern === 'pulse') {
      const midi = noteNameToMidi(root);
      events.push({ time: startTick, type: 'on', note: midi, velocity: 76 });
      events.push({ time: startTick + Math.floor(PPQ * 0.9), type: 'off', note: midi, velocity: 0 });
    } else if (bassPattern === 'octave') {
      const note = beatInChord === 0 ? root : octaveUp(root);
      const midi = noteNameToMidi(note);
      events.push({ time: startTick, type: 'on', note: midi, velocity: 78 });
      events.push({ time: startTick + Math.floor(PPQ * 0.9), type: 'off', note: midi, velocity: 0 });
    }
  }
  const bytes = encodeMidi(events, Math.round(Tone.Transport.bpm.value), PPQ);
  downloadMidi(bytes, `lofi-bass-${bassPattern}-${safeFilename(prog.name)}.mid`);
});

// ============================================================
//  STEP 6 — DUSTY FX (master bus parameters)
// ============================================================
const dustState = { crackle: false, muffle: false, wobble: false, crush: false };

function applyDust() {
  // Each param ramps over 0.4s so toggles don't click.
  crackleVol.volume.rampTo(dustState.crackle ? -22 : SILENT_DB, 0.4);
  masterFilter.frequency.rampTo(dustState.muffle ? 1500 : 3500, 0.4);
  masterWobble.depth.rampTo(dustState.wobble ? 0.18 : 0, 0.4);
  masterCrush.wet.rampTo(dustState.crush ? 0.55 : 0, 0.4);
}

function setDustCardUi(card, on) {
  card.setAttribute('aria-pressed', on ? 'true' : 'false');
  const state = card.querySelector('.dust-state');
  if (state) state.textContent = on ? 'On' : 'Off';
}

document.querySelectorAll('.dust-card').forEach(card => {
  card.addEventListener('click', async () => {
    await startAudio();
    const fx = card.dataset.fx;
    dustState[fx] = !dustState[fx];
    setDustCardUi(card, dustState[fx]);
    applyDust();
  });
});

document.getElementById('dustAuto').addEventListener('click', async () => {
  await startAudio();
  Object.keys(dustState).forEach(k => { dustState[k] = true; });
  document.querySelectorAll('.dust-card').forEach(card => setDustCardUi(card, true));
  applyDust();
});

document.getElementById('dustBypass').addEventListener('click', () => {
  Object.keys(dustState).forEach(k => { dustState[k] = false; });
  document.querySelectorAll('.dust-card').forEach(card => setDustCardUi(card, false));
  applyDust();
});

// ============================================================
//  STEP 7 — ATMOSPHERE (independent ambient sources)
// ============================================================
const atmosState = {
  rain:  { on: false, level: 55 },
  cafe:  { on: false, level: 45 },
  birds: { on: false, level: 40 }
};

function levelToDb(level) {
  // 0..100 -> -50..-6 dB. 0 returns SILENT_DB so we can ramp to it.
  if (level <= 0) return SILENT_DB;
  return -50 + (level / 100) * 44;
}

// Rain — pink noise, gentle highpass + lowpass for a soft hiss.
const rainVol = new Tone.Volume(SILENT_DB).connect(masterCrush);
const rainHp = new Tone.Filter({ frequency: 800, type: 'highpass', Q: 0.4 }).connect(rainVol);
const rainLp = new Tone.Filter({ frequency: 7000, type: 'lowpass', Q: 0.4 }).connect(rainHp);
const rainSrc = new Tone.Noise('pink').connect(rainLp);
rainSrc.start();

// Café murmur — pink noise, bandpass with slow LFO sweep, plus amplitude breathing.
const cafeVol = new Tone.Volume(SILENT_DB).connect(masterCrush);
const cafeBp = new Tone.Filter({ frequency: 950, type: 'bandpass', Q: 1.2 }).connect(cafeVol);
const cafeFilterLfo = new Tone.LFO({ frequency: 0.25, min: 700, max: 1300 }).start();
cafeFilterLfo.connect(cafeBp.frequency);
const cafeGain = new Tone.Gain(0.7).connect(cafeBp);
const cafeAmpLfo = new Tone.LFO({ frequency: 0.55, min: 0.4, max: 1.0 }).start();
cafeAmpLfo.connect(cafeGain.gain);
const cafeSrc = new Tone.Noise('pink').connect(cafeGain);
cafeSrc.start();

// Birds — random short chirps, fired by a setInterval (independent of Transport).
const birdVol = new Tone.Volume(SILENT_DB).connect(masterCrush);
const bird = new Tone.Synth({
  oscillator: { type: 'sine' },
  envelope: { attack: 0.008, decay: 0.07, sustain: 0, release: 0.05 }
}).connect(birdVol);
const BIRD_PITCHES = ['B5', 'C6', 'D6', 'E6', 'F#6', 'A6', 'C7'];
let birdInterval = null;

function chirp() {
  const n = 1 + Math.floor(Math.random() * 4);
  let t = Tone.now();
  for (let i = 0; i < n; i++) {
    bird.triggerAttackRelease(
      BIRD_PITCHES[Math.floor(Math.random() * BIRD_PITCHES.length)],
      0.05, t
    );
    t += 0.06 + Math.random() * 0.04;
  }
}
function startBirdScheduler() {
  if (birdInterval) return;
  birdInterval = setInterval(() => {
    if (atmosState.birds.on && Math.random() < 0.35) chirp();
  }, 1300);
}
function stopBirdScheduler() {
  if (birdInterval) { clearInterval(birdInterval); birdInterval = null; }
}

const ATMOS_VOL_NODES = { rain: rainVol, cafe: cafeVol, birds: birdVol };

function applyAtmos(key) {
  const s = atmosState[key];
  const target = s.on ? levelToDb(s.level) : SILENT_DB;
  const vol = ATMOS_VOL_NODES[key];
  if (vol) vol.volume.rampTo(target, 0.4);
  if (key === 'birds') s.on ? startBirdScheduler() : stopBirdScheduler();
}

document.querySelectorAll('.atmos-card').forEach(card => {
  const key = card.dataset.amb;
  const toggle = card.querySelector('.atmos-toggle');
  const slider = card.querySelector('.atmos-vol input');

  toggle.addEventListener('click', async () => {
    await startAudio();
    atmosState[key].on = !atmosState[key].on;
    toggle.setAttribute('aria-pressed', atmosState[key].on ? 'true' : 'false');
    toggle.textContent = atmosState[key].on ? 'On' : 'Off';
    applyAtmos(key);
  });

  slider.addEventListener('input', e => {
    atmosState[key].level = parseInt(e.target.value, 10);
    applyAtmos(key);
  });
});

// ============================================================
//  MASTER CONTROLS — Stop All / Play All
// ============================================================
function stopAllLayers() {
  // Stop in reverse so the Transport gets stopped exactly once at the end.
  // Note: Step 1's metronome is intentionally NOT included — it has its own
  // clock and is independent of the layer system.
  stopMelodyLayer();
  stopBassLayer();
  stopChordLayer();
  stopDrumLayer();
}

function playAllLayers() {
  stopHeroIfPlaying();
  // Start whichever layers have content but aren't already playing.
  // Order doesn't matter — they all align to the next bar (or 0 for the first).
  const drumHasContent = drumState.some(row => row.some(c => c));
  const melodyHasContent = melodyState.some(row => row.some(c => c));
  if (drumHasContent && !drumPlaying) startDrumLayer();
  if (!chordPlaying) startChordLayer(); // chords always have a default progression
  if (!bassPlaying) startBassLayer();   // bass follows the active progression
  if (melodyHasContent && !melodyPlaying) startMelodyLayer();
}

// ============================================================
//  MASTER PILL — floating Play All / Stop All control
// ============================================================
function updateMasterPill() {
  const pill = document.getElementById('masterPill');
  if (!pill) return;
  const stopBtn = document.getElementById('masterStopAll');
  const status = document.getElementById('masterStatus');
  const anyPlaying = activeLayers.size > 0 || heroPlaying;
  if (stopBtn) stopBtn.disabled = !anyPlaying;
  if (status) {
    if (heroPlaying) {
      status.textContent = 'Demo playing';
    } else if (activeLayers.size === 0) {
      status.textContent = 'Nothing playing';
    } else {
      const labels = { drum: 'drums', chord: 'chords', bass: 'bass', melody: 'melody' };
      const parts = [...activeLayers].map(k => labels[k] || k);
      status.textContent = parts.join(' + ');
    }
  }
}

document.getElementById('masterPlayAll').addEventListener('click', async () => {
  await startAudio();
  playAllLayers();
});
document.getElementById('masterStopAll').addEventListener('click', () => {
  if (heroPlaying) stopHeroLoop();
  stopAllLayers();
});

// Master tempo slider — drives Tone.Transport (drums/chords/melody only).
const masterTempo = document.getElementById('masterTempo');
const masterBpmDisplay = document.getElementById('masterBpm');
masterTempo.addEventListener('input', e => {
  const bpm = Math.max(60, Math.min(100, parseInt(e.target.value) || 78));
  masterBpmDisplay.textContent = bpm;
  Tone.Transport.bpm.value = bpm;
});
// Initialize Transport BPM from the slider's default value
Tone.Transport.bpm.value = parseInt(masterTempo.value);

updateMasterPill();
