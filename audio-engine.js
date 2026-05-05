// ===========================================================
//  AUDIO ENGINE — Tone.js singleton wired by app.jsx
//
//  Architecture:
//    music bus → vibrato (wobble) → low-pass (warmth)
//              → distortion (saturation) → bitcrusher (crackle)
//              → limiter → destination
//
//    Drums / chords / melody / bass / metro all connect to music bus.
//    Atmosphere noise (rain / cafe / vinyl-crackle / hiss) bypasses
//    the dusty FX chain and goes straight to the limiter.
//
//    A single 64-step Tone.Sequence (4 bars × 16 sixteenths) drives
//    every stem; per-stem mute flags decide what fires. State is
//    mutable so React just calls setters; the sequence reads `state`
//    on each tick.
//
//    Loop layout per cycle:
//      drums  — 1-bar pattern (16 cells), repeats 4× across the cycle
//      chords — 4 chords, one per bar (chord switches at step 0,16,32,48)
//      bass   — 1 root note per bar, follows the chord
//      melody — 4-bar grid (64 cells per pitch row)
// ===========================================================

(function () {
  'use strict';

  let initialized = false;
  let initPromise = null;

  // Audio nodes
  let limiter, bitCrusher, distortion, warmthFilter, vibratoNode, musicBus;
  let kick, snare, hat;
  let chordSynth, melodySynth, bassSynth, metroSynth;
  let rainBus, cafeBus, crackleBus, hissBus;
  let crackleClick;

  // Mutable state read by the sequence
  const state = {
    bpm: 76,
    drumPattern: [Array(16).fill(0), Array(16).fill(0), Array(16).fill(0)],
    progIdx: 0,
    progs: [],         // pushed from app.jsx
    melody: [],        // 2D: rows × 64 (4 bars)
    melodyPitches: [], // string per row, top-to-bottom

    stems: {
      drums: false, chords: false, melody: false,
      bass: false, metro: false, master: false
    },

    dust: { warmth: 40, wobble: 20, crackle: false, hiss: false, saturation: true },
    atmos: { rain: false, cafe: false, crackle: false, hiss: false, playing: false },
  };

  const subs = new Set();

  async function init() {
    if (initialized) return;
    if (initPromise) return initPromise;

    initPromise = (async () => {
      try {
        // Tone.start() needs a user gesture; the caller should invoke
        // init() from a click/keydown handler.
        await Tone.start();
        console.log('[AE] Tone.start OK — context state:', Tone.context.state);

      // ---- master FX chain (built terminal → source) ----
      limiter = new Tone.Limiter(-3).toDestination();

      bitCrusher = new Tone.BitCrusher(8).connect(limiter);
      bitCrusher.wet.value = 0;

      distortion = new Tone.Distortion(0).connect(bitCrusher);

      warmthFilter = new Tone.Filter({
        frequency: 18000, type: 'lowpass', rolloff: -12,
      }).connect(distortion);

      vibratoNode = new Tone.Vibrato({ frequency: 4, depth: 0 })
        .connect(warmthFilter);

      musicBus = new Tone.Channel({ volume: -2 }).connect(vibratoNode);

      // ---- instruments ----
      kick = new Tone.MembraneSynth({
        pitchDecay: 0.08, octaves: 6,
        envelope: { attack: 0.001, decay: 0.4, sustain: 0.01, release: 1 },
      }).connect(musicBus);

      snare = new Tone.NoiseSynth({
        noise: { type: 'pink' },
        envelope: { attack: 0.001, decay: 0.13, sustain: 0 },
        volume: -10,
      }).connect(musicBus);

      hat = new Tone.MetalSynth({
        frequency: 250,
        envelope: { attack: 0.001, decay: 0.08, release: 0.05 },
        harmonicity: 5.1, modulationIndex: 32, resonance: 4000, octaves: 1.5,
        volume: -28,
      }).connect(musicBus);

      // PolySynth options are unreliable across Tone.js versions in the
      // constructor — set them after construction.
      chordSynth = new Tone.PolySynth(Tone.Synth).connect(musicBus);
      chordSynth.set({
        oscillator: { type: 'triangle8' },
        envelope: { attack: 0.06, decay: 0.5, sustain: 0.55, release: 1.6 },
      });
      chordSynth.volume.value = -14;

      melodySynth = new Tone.Synth({
        oscillator: { type: 'sine' },
        envelope: { attack: 0.02, decay: 0.2, sustain: 0.35, release: 0.5 },
        volume: -12,
      }).connect(musicBus);

      bassSynth = new Tone.Synth({
        oscillator: { type: 'sine' },
        envelope: { attack: 0.02, decay: 0.3, sustain: 0.7, release: 0.4 },
        volume: -10,
      }).connect(musicBus);

      // Metronome bypasses the dust chain so the click stays crisp.
      metroSynth = new Tone.MembraneSynth({
        pitchDecay: 0.005, octaves: 4,
        envelope: { attack: 0.001, decay: 0.06, sustain: 0, release: 0.03 },
        volume: -18,
      }).connect(limiter);

      // ---- ambience noise buses (bypass dust FX) ----
      // Rain: bandpass white noise, mid frequencies
      const rainNoise = new Tone.Noise('white').start();
      const rainFilter = new Tone.Filter({ frequency: 1400, type: 'bandpass', Q: 0.5 });
      rainNoise.connect(rainFilter);
      rainBus = new Tone.Channel({ volume: -Infinity }).connect(limiter);
      rainFilter.connect(rainBus);

      // Cafe: heavy low-pass on brown noise → muffled room rumble
      const cafeNoise = new Tone.Noise('brown').start();
      const cafeFilter = new Tone.Filter({ frequency: 600, type: 'lowpass' });
      cafeNoise.connect(cafeFilter);
      cafeBus = new Tone.Channel({ volume: -Infinity }).connect(limiter);
      cafeFilter.connect(cafeBus);

      // Tape hiss: pink noise, just present
      const hissNoise = new Tone.Noise('pink').start();
      hissBus = new Tone.Channel({ volume: -Infinity }).connect(limiter);
      hissNoise.connect(hissBus);

      // Vinyl crackle: random click bursts via NoiseSynth scheduled below
      crackleBus = new Tone.Channel({ volume: -Infinity }).connect(limiter);
      crackleClick = new Tone.NoiseSynth({
        noise: { type: 'pink' },
        envelope: { attack: 0.001, decay: 0.005, sustain: 0 },
      }).connect(crackleBus);

      // ---- master 64-step sequence (4 bars × 16 sixteenths) ----
      const seq = new Tone.Sequence((time, step) => {
        const s = state;
        const drumsOn  = s.stems.drums  || s.stems.master;
        const chordsOn = s.stems.chords || s.stems.master;
        const melodyOn = s.stems.melody || s.stems.master;
        const bassOn   = s.stems.bass   || s.stems.master;

        const localStep = step % 16;             // 0..15 within the current bar
        const barIdx    = Math.floor(step / 16); // 0..3 — which bar / which chord

        // Drums: 1-bar pattern, repeats every bar.
        if (drumsOn) {
          if (s.drumPattern[0] && s.drumPattern[0][localStep]) kick.triggerAttackRelease('C2', '8n', time);
          if (s.drumPattern[1] && s.drumPattern[1][localStep]) snare.triggerAttackRelease('16n', time);
          if (s.drumPattern[2] && s.drumPattern[2][localStep]) hat.triggerAttackRelease('C5', '32n', time);
        }

        // Chords + bass: one chord per bar (4 chords across 4 bars).
        if (localStep === 0) {
          const prog = s.progs[s.progIdx];
          if (prog && prog.notes && prog.notes[barIdx]) {
            if (chordsOn) {
              chordSynth.triggerAttackRelease(prog.notes[barIdx], '1n', time, 0.7);
            }
            if (bassOn) {
              const root = prog.notes[barIdx][0];      // e.g. "A3"
              const letter = root.replace(/[0-9-]/g, '');
              bassSynth.triggerAttackRelease(letter + '2', '1n', time, 0.85);
            }
          }
        }

        // Melody: 4-bar grid, indexed by the full 0..63 step.
        if (melodyOn) {
          for (let r = 0; r < s.melody.length; r++) {
            if (s.melody[r] && s.melody[r][step] && s.melodyPitches[r]) {
              melodySynth.triggerAttackRelease(s.melodyPitches[r], '8n', time, 0.65);
            }
          }
        }

        // Metronome: a click on every quarter; first click of the loop is the high tick.
        if (s.stems.metro && localStep % 4 === 0) {
          metroSynth.triggerAttackRelease(step === 0 ? 'C5' : 'A4', '32n', time, 0.5);
        }

        // Notify visual subscribers with the full 0..63 step for playheads.
        Tone.Draw.schedule(() => {
          subs.forEach((cb) => { try { cb(step); } catch (_) {} });
        }, time);
      }, [...Array(64).keys()], '16n');

      seq.start(0);

      // Vinyl-crackle scheduler — sparse random clicks
      Tone.Transport.scheduleRepeat((time) => {
        if (state.atmos.crackle && state.atmos.playing) {
          if (Math.random() < 0.5) {
            crackleClick.triggerAttackRelease('64n', time);
          }
        }
      }, '16n');

      Tone.Transport.bpm.value = state.bpm;
      Tone.Transport.position = 0;
      Tone.Transport.start();

      // Apply any state that arrived before init resolved
      applyDust();
      applyAtmos();

      initialized = true;
      console.log('[AE] init complete — transport state:', Tone.Transport.state, 'bpm:', Tone.Transport.bpm.value);
      } catch (err) {
        // Clear the cached promise so a later call (after a user gesture)
        // can retry from scratch.
        initPromise = null;
        console.warn('[AE] init deferred — will retry on next call:', err && err.message ? err.message : err);
        throw err;
      }
    })();

    return initPromise;
  }

  // ---- setters (safe to call before init; values stored in `state`) ----

  function setBpm(bpm) {
    state.bpm = bpm;
    if (initialized) Tone.Transport.bpm.rampTo(bpm, 0.05);
  }

  function setDrumPattern(p) { state.drumPattern = p; }
  function setProgIdx(i) { state.progIdx = i; }
  function setProgs(progs) { state.progs = progs; }
  function setMelody(m, pitches) {
    state.melody = m;
    if (pitches) state.melodyPitches = pitches;
  }

  function setStem(name, on) {
    if (state.stems.hasOwnProperty(name)) {
      state.stems[name] = !!on;
      console.log('[AE] stem', name, '→', !!on, '| ready:', initialized);
    }
  }

  function setDust(d) {
    Object.assign(state.dust, d);
    applyDust();
  }
  function applyDust() {
    if (!initialized) return;
    const { warmth, wobble, crackle, saturation } = state.dust;

    // Warmth: 0% → 18kHz cutoff (transparent), 100% → 3kHz (blanket)
    warmthFilter.frequency.rampTo(18000 - (warmth / 100) * 15000, 0.1);

    // Wobble: vibrato depth + frequency
    vibratoNode.depth.rampTo((wobble / 100) * 0.06, 0.1);
    vibratoNode.frequency.rampTo(3 + (wobble / 100) * 4, 0.1);

    // Saturation: subtle waveshaper drive
    distortion.distortion = saturation ? 0.18 : 0;

    // Crackle in dust chain → bitcrusher wet
    bitCrusher.wet.rampTo(crackle ? 0.35 : 0, 0.1);

    applyHiss();
  }

  function setAtmos(layers, playing) {
    Object.assign(state.atmos, layers, { playing: !!playing });
    applyAtmos();
  }
  function applyAtmos() {
    if (!initialized) return;
    const { rain, cafe, crackle, playing } = state.atmos;
    rainBus.volume.rampTo(rain && playing ? -16 : -Infinity, 0.25);
    cafeBus.volume.rampTo(cafe && playing ? -22 : -Infinity, 0.25);
    crackleBus.volume.rampTo(crackle && playing ? -18 : -Infinity, 0.25);
    applyHiss();
  }

  function applyHiss() {
    if (!initialized) return;
    const atmosHiss = state.atmos.hiss && state.atmos.playing;
    const dustHiss  = state.dust.hiss;
    let v = -Infinity;
    if (atmosHiss && dustHiss) v = -22;
    else if (atmosHiss)        v = -26;
    else if (dustHiss)         v = -32;
    hissBus.volume.rampTo(v, 0.25);
  }

  function subscribe(cb) {
    subs.add(cb);
    return () => subs.delete(cb);
  }

  window.AE = {
    init,
    setBpm,
    setDrumPattern,
    setProgIdx,
    setProgs,
    setMelody,
    setStem,
    setDust,
    setAtmos,
    subscribe,
    isReady: () => initialized,
  };
})();
