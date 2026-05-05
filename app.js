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
//  STEP 3 — CHORD PROGRESSIONS
// ============================================================
const PROGS = [
  { name: 'Sleepy Café',     chords: [['A3','C4','E4','G4'], ['D4','F4','A4','C5'], ['G3','B3','D4','F4'], ['C4','E4','G4','B4']] },
  { name: 'Late Night Drive',chords: [['C4','E4','G4','B4'], ['E4','G4','B4','D5'], ['A3','C4','E4','G4'], ['F3','A3','C4','E4']] },
  { name: 'Rainy Window',    chords: [['F3','A3','C4','E4'], ['E4','G4','B4','D5'], ['D4','F4','A4','C5'], ['C4','E4','G4','B4']] },
  { name: 'Sunday Morning',  chords: [['D4','F4','A4','C5'], ['G3','B3','D4','F4'], ['C4','E4','G4','B4'], ['A3','C4','E4','G4']] }
];
let chordPlaying = false;
let chordLoop = null;
let activeProg = -1;

document.querySelectorAll('.chord-card').forEach(card => {
  card.addEventListener('click', async () => {
    await startAudio();
    const idx = parseInt(card.dataset.prog);
    if (activeProg === idx && chordPlaying) {
      stopChords();
      return;
    }
    stopAllOthers('chord');
    document.querySelectorAll('.chord-card').forEach(c => c.classList.remove('active'));
    card.classList.add('active');
    activeProg = idx;
    startChordLoop(idx);
  });
});

function startChordLoop(idx) {
  Tone.Transport.bpm.value = 76;
  let i = 0;
  const prog = PROGS[idx].chords;
  chordLoop = new Tone.Loop((time) => {
    pad.triggerAttackRelease(prog[i], '2n', time, 0.55);
    // highlight the playing chord pill
    const curI = i;
    Tone.Draw.schedule(() => {
      document.querySelectorAll('.chord-card.active .chords span').forEach(s => s.classList.remove('playing'));
      const span = document.querySelector(`.chord-card.active .chords span[data-i="${curI}"]`);
      if (span) span.classList.add('playing');
    }, time);
    i = (i + 1) % 4;
  }, '2n').start(0);
  Tone.Transport.start();
  chordPlaying = true;
}

function stopChords() {
  Tone.Transport.stop();
  Tone.Transport.cancel();
  if (chordLoop) chordLoop.dispose();
  chordLoop = null;
  chordPlaying = false;
  activeProg = -1;
  document.querySelectorAll('.chord-card').forEach(c => c.classList.remove('active'));
  document.querySelectorAll('.chord-card .chords span').forEach(s => s.classList.remove('playing'));
}

document.getElementById('chordStop').addEventListener('click', () => {
  if (chordPlaying) stopChords();
});

// ============================================================
//  STEP 4 — MELODY PAD
// ============================================================
const SAFE_NOTES = ['A4','C5','D5','E5','G5','A5'];
const sequenceRow = document.getElementById('sequenceRow');
let sequence = [];
let melodyPlaying = false;
let melodyPart = null;

document.querySelectorAll('.note-btn').forEach(btn => {
  btn.addEventListener('click', async () => {
    await startAudio();
    const note = btn.dataset.note;
    lead.triggerAttackRelease(note, '4n');
    btn.classList.add('flash');
    setTimeout(() => btn.classList.remove('flash'), 200);
    if (sequence.length < 8) {
      sequence.push(note);
      renderSequence();
    }
  });
});

function renderSequence() {
  if (sequence.length === 0) {
    sequenceRow.innerHTML = '<span class="empty">Your melody will appear here…</span>';
    return;
  }
  sequenceRow.innerHTML = sequence.map(n => {
    const display = n.replace(/\d/g, '');
    return `<span class="seq-note">${display}</span>`;
  }).join('');
}

document.getElementById('melodyClear').addEventListener('click', () => {
  sequence = [];
  renderSequence();
  if (melodyPlaying) stopMelody();
});

document.getElementById('melodyRandom').addEventListener('click', () => {
  // generate a 6-note "lo-fi friendly" melody
  const len = 6;
  sequence = [];
  // bias toward fewer jumps & repeating notes
  let last = 0;
  for (let i = 0; i < len; i++) {
    let next;
    if (Math.random() < 0.25) next = last;
    else {
      const stepDir = Math.random() < 0.5 ? -1 : 1;
      next = Math.max(0, Math.min(SAFE_NOTES.length - 1, last + stepDir * (Math.random() < 0.7 ? 1 : 2)));
    }
    sequence.push(SAFE_NOTES[next]);
    last = next;
  }
  renderSequence();
});

document.getElementById('melodyPlay').addEventListener('click', async () => {
  await startAudio();
  if (melodyPlaying) {
    stopMelody();
    return;
  }
  if (sequence.length === 0) return;
  stopAllOthers('melody');
  Tone.Transport.bpm.value = 76;
  // melody with the current sequence — each note quarter-length
  const events = sequence.map((n, i) => ({ time: `0:${i}`, note: n }));
  melodyPart = new Tone.Part((time, ev) => {
    lead.triggerAttackRelease(ev.note, '4n', time, 0.7);
  }, events);
  melodyPart.loop = true;
  melodyPart.loopEnd = `0:${sequence.length}`;
  melodyPart.start(0);
  Tone.Transport.start();
  melodyPlaying = true;
  document.getElementById('melodyPlay').innerHTML = '<span class="stop-icon"></span> Stop melody';
});

function stopMelody() {
  Tone.Transport.stop();
  Tone.Transport.cancel();
  if (melodyPart) melodyPart.dispose();
  melodyPart = null;
  melodyPlaying = false;
  document.getElementById('melodyPlay').innerHTML = '<span class="play-icon"></span> Play melody';
}

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
    activeProg = -1;
    document.querySelectorAll('.chord-card').forEach(c => c.classList.remove('active'));
    document.querySelectorAll('.chord-card .chords span').forEach(s => s.classList.remove('playing'));
  }
  if (except !== 'melody' && melodyPlaying) {
    if (melodyPart) melodyPart.dispose();
    melodyPart = null;
    melodyPlaying = false;
    document.getElementById('melodyPlay').innerHTML = '<span class="play-icon"></span> Play melody';
  }
  // make sure transport is stopped & cleared if nothing is playing
  Tone.Transport.stop();
  Tone.Transport.cancel();
}
