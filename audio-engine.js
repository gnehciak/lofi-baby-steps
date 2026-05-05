// ===========================================================
//  AUDIO ENGINE — Tone.js singleton wired by app.jsx
//
//  Architecture:
//    music bus → low-pass (warmth) → distortion (saturation)
//              → limiter → destination
//
//    Drums / chords / melody / bass / metro all connect to music bus.
//    Atmosphere noise (rain / cafe / vinyl-crackle / fire) bypasses
//    the dusty FX chain and goes straight to the limiter — vinyl
//    crackle lives in Step 7 (atmosphere), not Step 6 (dust).
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
//      melody — 4-bar grid in quavers (32 cells per pitch row)
// ===========================================================

(function () {
  'use strict';

  let initialized = false;
  let initPromise = null;

  // Audio nodes
  let limiter, distortion, warmthFilter, musicBus;
  let kick, snare, hat;                        // synth fallbacks
  let kickSample, snareSample, hatSample;      // drum one-shots (Tone.Player)
  let chordSynth, melodySynth, bassSynth, metroSynth;
  let chordSampler = null, bassSampler = null, melodySampler = null;
  let rainBus, cafeBus, crackleBus, hissBus, fireBus;
  let rainSynthVol, cafeSynthVol, crackleSynthVol, hissSynthVol, fireSynthVol;   // mute synth side when sample loads
  let rainPlayer = null, cafePlayer = null, cracklePlayer = null, hissPlayer = null, firePlayer = null;
  let crackleClick;

  let samplesReady = {
    kick: false, snare: false, hat: false,
    chords: false, bass: false, melody: false,
    rain: false, cafe: false, crackle: false, fire: false,
  };

  // === User-supplied samples ===
  // Drop files into:
  //   assets/drums/    — kick.wav, snare.wav, hat.wav   (one-shots)
  //   assets/chords/   — note-named files like C3.wav, E3.wav, G3.wav…
  //   assets/bass/     — note-named files like C2.wav, E2.wav…
  //   assets/melody/   — note-named files like C5.wav, A4.wav…
  //   assets/ambience/ — rain.wav, cafe.wav, crackle.wav, fire.wav (looped)
  // For pitched folders the loader probes every candidate pitch with a HEAD
  // request; whichever files exist are wired into a Tone.Sampler that
  // pitch-shifts to fill in missing notes. Anything missing falls back to
  // the existing synth voice for that part.
  const DRUM_URLS = {
    kick:  'assets/drums/kick.wav',
    snare: 'assets/drums/snare.wav',
    hat:   'assets/drums/hat.wav',
  };
  const PITCH_CANDIDATES = [
    'C1','D1','E1','F1','G1','A1','B1',
    'C2','D2','E2','F2','G2','A2','B2',
    'C3','D3','E3','F3','G3','A3','B3',
    'C4','D4','E4','F4','G4','A4','B4',
    'C5','D5','E5','F5','G5','A5','B5',
    'C6','D6','E6','F6','G6',
  ];

  async function probePitchUrls(baseUrl) {
    const found = {};
    await Promise.all(PITCH_CANDIDATES.map(async (note) => {
      try {
        const r = await fetch(baseUrl + note + '.wav', { method: 'HEAD' });
        if (r.ok) found[note] = note + '.wav';
      } catch (_) {}
    }));
    return found;
  }

  function buildSampler(folder, opts) {
    const baseUrl = 'assets/' + folder + '/';
    return probePitchUrls(baseUrl).then((urls) => {
      const count = Object.keys(urls).length;
      if (count === 0) {
        console.log('[AE] no ' + folder + ' samples — using synth');
        return null;
      }
      return new Promise((resolve) => {
        let done = false;
        const s = new Tone.Sampler({
          urls, baseUrl,
          onload: () => { if (!done) { done = true; resolve(s); } },
          onerror: (e) => {
            console.warn('[AE] ' + folder + ' sampler error:', e && e.message);
            if (!done) { done = true; resolve(null); }
          },
          ...(opts || {}),
        });
      }).then((s) => {
        if (s) console.log('[AE] ✓ ' + folder + ' sampler loaded (' + count + ' pitches)');
        return s;
      });
    });
  }

  // Sampler-like wrapper that loops the underlying buffer for the full
  // requested duration. Tone.Sampler plays each note as a one-shot — fine
  // for a 4-second piano sample, useless for a 0.5s bass pluck that needs
  // to hold a whole-note. Each trigger spawns a Tone.ToneBufferSource with
  // loop:true and an explicit stop time, so short samples sustain while
  // long ones still respect the duration.
  function buildLoopingSampler(folder, opts) {
    const baseUrl = 'assets/' + folder + '/';
    return probePitchUrls(baseUrl).then((urls) => {
      const noteList = Object.keys(urls);
      if (noteList.length === 0) {
        console.log('[AE] no ' + folder + ' samples — using synth');
        return null;
      }
      return new Promise((resolve) => {
        const buffers = {};
        let remaining = noteList.length;
        const finish = () => {
          if (Object.keys(buffers).length > 0) resolve(buffers);
          else resolve(null);
        };
        noteList.forEach((note) => {
          const buf = new Tone.ToneAudioBuffer(
            baseUrl + urls[note],
            () => { buffers[note] = buf; if (--remaining === 0) finish(); },
            () => { console.warn('[AE] ' + folder + '/' + note + ' failed to decode'); if (--remaining === 0) finish(); }
          );
        });
      }).then((buffers) => {
        if (!buffers) return null;
        console.log('[AE] ✓ ' + folder + ' looping sampler loaded (' + Object.keys(buffers).length + ' pitches)');
        return makeLoopingSampler(buffers, opts || {});
      });
    });
  }

  // One-shot pitched sampler. Plays each sample at its natural duration
  // (no looping) with pitch shifted via Tone.PitchShift, so transposing
  // doesn't squash or stretch the note in time. Suitable for short bass
  // hits where the buffer length already covers the bar.
  function makeLoopingSampler(buffers, opts) {
    const noteMidi = Object.keys(buffers).map((n) => ({ note: n, midi: pitchToMidi(n) }));
    const out = new Tone.Volume(0);
    const attack     = opts.attack     != null ? opts.attack     : 0.02;
    const release    = opts.release    != null ? opts.release    : 0.4;
    const windowSize = opts.windowSize != null ? opts.windowSize : 0.05;

    function findClosest(targetMidi) {
      let best = noteMidi[0], bestDist = Math.abs(noteMidi[0].midi - targetMidi);
      for (let i = 1; i < noteMidi.length; i++) {
        const d = Math.abs(noteMidi[i].midi - targetMidi);
        if (d < bestDist) { best = noteMidi[i]; bestDist = d; }
      }
      return best;
    }

    return {
      volume: out.volume,
      output: out,
      connect(dest) { out.connect(dest); return this; },
      triggerAttackRelease(note, duration, time, velocity) {
        const v = velocity != null ? velocity : 1;
        const targetMidi = pitchToMidi(note);
        const closest = findClosest(targetMidi);
        const semitones = targetMidi - closest.midi;
        const durSec = Tone.Time(duration).toSeconds();

        const src = new Tone.ToneBufferSource({
          url: buffers[closest.note],
          fadeIn: attack,
          fadeOut: release,
          playbackRate: 1,
          curve: 'exponential',
        });

        let dest = out;
        let pitchShift = null;
        if (semitones !== 0) {
          pitchShift = new Tone.PitchShift({ pitch: semitones, windowSize });
          pitchShift.connect(out);
          dest = pitchShift;
        }
        src.connect(dest);
        src.start(time, 0, durSec, v);
        src.onended = () => {
          try {
            src.dispose();
            if (pitchShift) pitchShift.dispose();
          } catch (_) {}
        };
      },
    };
  }

  // Mutable state read by the sequence
  const state = {
    bpm: 76,
    swing: 0,         // 0..1 — Tone.Transport.swing amount
    swingSub: '16n',  // subdivision the swing applies to (semiquavers)
    drumPattern: [Array(16).fill(0), Array(16).fill(0), Array(16).fill(0)],
    progIdx: 0,
    progs: [],         // pushed from app.jsx (read-only presets)
    chordNotes: null,  // user-editable: 4 bars × pitch arrays. null → fall back to progs[progIdx].notes
    bassNotes: null,   // user-editable: 16-cell piano roll (4 bars × 4 crotchets); each cell is a full pitch like 'A2' / 'C#2' or null
    melody: [],        // 2D: rows × 64 (4 bars)
    melodyPitches: [], // string per row, top-to-bottom

    stems: {
      drums: false, chords: false, melody: false,
      bass: false, metro: false, master: false
    },

    dust: { warmth: 40, hiss: false, saturation: true },
    atmos: { rain: false, cafe: false, crackle: false, fire: false, playing: false },
    atmosDb: { rain: -18, cafe: -22, crackle: -24, fire: -22 },
  };

  const subs = new Set();

  async function init() {
    if (initialized) return;

    // If the context is suspended, we need a real user gesture to resume it.
    // Try to resume directly (this call must be inside a gesture handler) —
    // if it fails, drop any stuck promise so the next gesture can retry.
    const ctx = Tone.context.rawContext || Tone.context;
    if (ctx.state !== 'running') {
      try {
        await ctx.resume();
        console.log('[AE] context resumed:', ctx.state);
      } catch (e) {
        console.warn('[AE] resume failed (need user gesture):', e && e.message);
        initPromise = null;
        return;
      }
      if (ctx.state !== 'running') {
        // Resume returned but context still suspended — autoplay still blocked.
        initPromise = null;
        return;
      }
    }

    if (initPromise) return initPromise;

    initPromise = (async () => {
      try {
        await Tone.start();
        console.log('[AE] Tone.start OK — context state:', Tone.context.state);

      // ---- master FX chain (built terminal → source) ----
      limiter = new Tone.Limiter(-1).toDestination();

      // Soft-clip waveshaper. Oversampled to keep aliasing in check at the
      // gentle settings we use for "tape saturation" (Step 6).
      distortion = new Tone.Distortion({ distortion: 0, oversample: '4x' })
        .connect(limiter);

      warmthFilter = new Tone.Filter({
        frequency: 18000, type: 'lowpass', rolloff: -12,
      }).connect(distortion);

      musicBus = new Tone.Channel({ volume: 4 }).connect(warmthFilter);

      // No artificial placement — every instrument feeds musicBus directly,
      // so stereo .wav content plays back exactly as recorded.

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

      // Real lo-fi drum samples — players load async; fall back to synths
      // above if a sample fails to decode.
      kickSample = new Tone.Player({
        url: DRUM_URLS.kick,
        autostart: false,
        volume: -4,
        onload:  () => { samplesReady.kick  = true; console.log('[AE] ✓ kick sample loaded'); },
        onerror: (e) => { console.warn('[AE] ✗ kick sample failed, using synth:', e); },
      }).connect(musicBus);

      snareSample = new Tone.Player({
        url: DRUM_URLS.snare,
        autostart: false,
        volume: -6,
        onload:  () => { samplesReady.snare = true; console.log('[AE] ✓ snare sample loaded'); },
        onerror: (e) => { console.warn('[AE] ✗ snare sample failed, using synth:', e); },
      }).connect(musicBus);

      hatSample = new Tone.Player({
        url: DRUM_URLS.hat,
        autostart: false,
        volume: -12,
        onload:  () => { samplesReady.hat   = true; console.log('[AE] ✓ hat sample loaded'); },
        onerror: (e) => { console.warn('[AE] ✗ hat sample failed, using synth:', e); },
      }).connect(musicBus);

      // PolySynth options are unreliable across Tone.js versions in the
      // constructor — set them after construction.
      chordSynth = new Tone.PolySynth(Tone.Synth).connect(musicBus);
      chordSynth.set({
        oscillator: { type: 'triangle8' },
        envelope: { attack: 0.06, decay: 0.5, sustain: 0.55, release: 1.6 },
      });
      chordSynth.volume.value = -9;

      melodySynth = new Tone.Synth({
        oscillator: { type: 'sine' },
        envelope: { attack: 0.02, decay: 0.2, sustain: 0.35, release: 0.5 },
        volume: -3,
      }).connect(musicBus);

      bassSynth = new Tone.Synth({
        oscillator: { type: 'sine' },
        envelope: { attack: 0.02, decay: 0.3, sustain: 0.7, release: 0.4 },
        volume: -13,
      }).connect(musicBus);

      // Metronome bypasses the dust chain so the click stays crisp.
      metroSynth = new Tone.MembraneSynth({
        pitchDecay: 0.005, octaves: 4,
        envelope: { attack: 0.001, decay: 0.06, sustain: 0, release: 0.03 },
        volume: -18,
      }).connect(limiter);

      // ---- ambience noise buses (bypass dust FX) ----
      // Each layer has a synth-side Volume node so the looping sample can
      // crossfade in (and the synth out) when a user-supplied .wav loads.
      // No placement applied — recorded wav stereo flows straight through.

      // Rain: bandpass white noise, mid frequencies
      const rainNoise = new Tone.Noise('white').start();
      const rainFilter = new Tone.Filter({ frequency: 1400, type: 'bandpass', Q: 0.5 });
      rainSynthVol = new Tone.Volume(0);
      rainNoise.connect(rainFilter);
      rainFilter.connect(rainSynthVol);
      rainBus = new Tone.Channel({ volume: -Infinity }).connect(limiter);
      rainSynthVol.connect(rainBus);

      // Cafe: heavy low-pass on brown noise → muffled room rumble
      const cafeNoise = new Tone.Noise('brown').start();
      const cafeFilter = new Tone.Filter({ frequency: 600, type: 'lowpass' });
      cafeSynthVol = new Tone.Volume(0);
      cafeNoise.connect(cafeFilter);
      cafeFilter.connect(cafeSynthVol);
      cafeBus = new Tone.Channel({ volume: -Infinity }).connect(limiter);
      cafeSynthVol.connect(cafeBus);

      // Tape hiss: pink noise, just present
      const hissNoise = new Tone.Noise('pink').start();
      hissSynthVol = new Tone.Volume(0);
      hissNoise.connect(hissSynthVol);
      hissBus = new Tone.Channel({ volume: -Infinity }).connect(limiter);
      hissSynthVol.connect(hissBus);

      // Vinyl crackle: random click bursts via NoiseSynth scheduled below
      crackleBus = new Tone.Channel({ volume: -Infinity }).connect(limiter);
      crackleSynthVol = new Tone.Volume(0).connect(crackleBus);
      crackleClick = new Tone.NoiseSynth({
        noise: { type: 'pink' },
        envelope: { attack: 0.001, decay: 0.005, sustain: 0 },
      }).connect(crackleSynthVol);

      // Fireplace: brown-noise roar through a low-pass — synth fallback only;
      // assets/ambience/fire.wav loops over it once decoded.
      const fireNoise = new Tone.Noise('brown').start();
      const fireFilter = new Tone.Filter({ frequency: 400, type: 'lowpass' });
      fireSynthVol = new Tone.Volume(0);
      fireNoise.connect(fireFilter);
      fireFilter.connect(fireSynthVol);
      fireBus = new Tone.Channel({ volume: -Infinity }).connect(limiter);
      fireSynthVol.connect(fireBus);

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
        // Real CC0 lo-fi samples preferred; fall back to synths until loaded.
        if (drumsOn) {
          if (s.drumPattern[0] && s.drumPattern[0][localStep]) {
            if (samplesReady.kick) {
              try { kickSample.start(time); }
              catch (e) { kick.triggerAttackRelease('C2', '8n', time); }
            } else kick.triggerAttackRelease('C2', '8n', time);
          }
          if (s.drumPattern[1] && s.drumPattern[1][localStep]) {
            if (samplesReady.snare) {
              try { snareSample.start(time); }
              catch (e) { snare.triggerAttackRelease('16n', time); }
            } else snare.triggerAttackRelease('16n', time);
          }
          if (s.drumPattern[2] && s.drumPattern[2][localStep]) {
            if (samplesReady.hat) {
              try { hatSample.start(time); }
              catch (e) { hat.triggerAttackRelease('C5', '32n', time); }
            } else hat.triggerAttackRelease('C5', '32n', time);
          }
        }

        // Chords: one chord per bar (4 chords across 4 bars). User edits live
        // in chordNotes; fall back to the active preset if the editable copy
        // hasn't been pushed yet.
        if (localStep === 0 && chordsOn) {
          const editable = s.chordNotes && s.chordNotes[barIdx];
          const prog     = s.progs[s.progIdx];
          const presetN  = prog && prog.notes ? prog.notes[barIdx] : null;
          const barNotes = (editable && editable.length) ? editable : presetN;
          if (barNotes && barNotes.length) {
            const inst = samplesReady.chords ? chordSampler : chordSynth;
            inst.triggerAttackRelease(barNotes, '1n', time, 0.7);
          }
        }

        // Bass: 16-cell piano roll, one trigger per crotchet (every 4 16ths).
        // Each placed note rings for exactly one bar (a semibreve) — the UI
        // enforces one note per bar so notes never overlap.
        if (bassOn && step % 4 === 0) {
          const beatIdx = step >> 2;
          const pitch   = s.bassNotes && s.bassNotes[beatIdx];
          if (pitch) {
            const useSample = samplesReady.bass;
            const inst = useSample ? bassSampler : bassSynth;
            // Synth voice plays an octave higher than the piano roll —
            // the sine bassSynth at C2-range sits too low to hear clearly.
            const playPitch = useSample ? pitch : pitch.replace(/(-?\d+)$/, (m) => String(parseInt(m, 10) + 1));
            inst.triggerAttackRelease(playPitch, '1n', time, 0.85);
          }
        }

        // Melody: 4-bar grid in quavers (32 cells); fire on every other 16th.
        if (melodyOn && step % 2 === 0) {
          const qStep = step >> 1;
          for (let r = 0; r < s.melody.length; r++) {
            if (s.melody[r] && s.melody[r][qStep] && s.melodyPitches[r]) {
              const inst = samplesReady.melody ? melodySampler : melodySynth;
              inst.triggerAttackRelease(s.melodyPitches[r], '8n', time, 0.65);
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

      // Vinyl-crackle scheduler — sparse random clicks (synth fallback only;
      // a real crackle.wav loop replaces this if user supplies one).
      Tone.Transport.scheduleRepeat((time) => {
        if (state.atmos.crackle && state.atmos.playing && !samplesReady.crackle) {
          if (Math.random() < 0.5) {
            crackleClick.triggerAttackRelease('64n', time);
          }
        }
      }, '16n');

      Tone.Transport.bpm.value = state.bpm;
      Tone.Transport.swing = state.swing;
      Tone.Transport.swingSubdivision = state.swingSub;
      Tone.Transport.position = 0;
      Tone.Transport.start();

      // Apply any state that arrived before init resolved
      applyDust();
      applyAtmos();

      // ---- async user-supplied samples ----
      // Pitched instruments — Tone.Sampler with whatever pitches the user
      // dropped into the folder. Missing folders → keep synth.
      buildSampler('chords', { attack: 0.06, release: 1.6 }).then((s) => {
        if (s) {
          chordSampler = s.connect(musicBus);
          chordSampler.volume.value = -5;
          samplesReady.chords = true;
        }
      });
      buildLoopingSampler('bass', { attack: 0.02, release: 0.4 }).then((s) => {
        if (s) {
          bassSampler = s.connect(musicBus);
          bassSampler.volume.value = -11;
          samplesReady.bass = true;
        }
      });
      buildSampler('melody', { attack: 0.02, release: 0.5 }).then((s) => {
        if (s) {
          melodySampler = s.connect(musicBus);
          melodySampler.volume.value = -1;
          samplesReady.melody = true;
        }
      });

      // Looping ambience layers — Tone.Player(loop:true). Crossfade the
      // synth side out and the sample side in once the file decodes.
      const ambienceMap = {
        rain:    { bus: rainBus,    synthVol: rainSynthVol },
        cafe:    { bus: cafeBus,    synthVol: cafeSynthVol },
        crackle: { bus: crackleBus, synthVol: crackleSynthVol },
        fire:    { bus: fireBus,    synthVol: fireSynthVol },
      };
      Object.entries(ambienceMap).forEach(([layer, { bus, synthVol }]) => {
        const playerVol = new Tone.Volume(-Infinity).connect(bus);
        const player = new Tone.Player({
          url: 'assets/ambience/' + layer + '.wav',
          loop: true,
          autostart: true,
          fadeIn: 0.05, fadeOut: 0.05,
          onload: () => {
            samplesReady[layer] = true;
            synthVol.volume.rampTo(-Infinity, 0.5);   // mute synth side
            playerVol.volume.rampTo(0, 0.5);           // unmute sample side
            console.log('[AE] ✓ ambience/' + layer + ' loaded');
          },
          onerror: () => { /* keep synth ambience */ },
        });
        player.connect(playerVol);
        if (layer === 'rain')    rainPlayer    = player;
        if (layer === 'cafe')    cafePlayer    = player;
        if (layer === 'crackle') cracklePlayer = player;
        if (layer === 'fire')    firePlayer    = player;
      });

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

  function setSwing(amount) {
    const v = Math.max(0, Math.min(1, +amount || 0));
    state.swing = v;
    if (initialized) Tone.Transport.swing = v;
  }

  function setDrumPattern(p) { state.drumPattern = p; }
  function setProgIdx(i) { state.progIdx = i; }
  function setProgs(progs) { state.progs = progs; }
  function setChordNotes(bars) { state.chordNotes = bars; }
  function setBassNotes(grid) { state.bassNotes = grid; }
  function setMelody(m, pitches) {
    state.melody = m;
    if (pitches) state.melodyPitches = pitches;
  }

  // Pitch helpers — used to pick the bass root from an arbitrary voicing.
  const PC = { C:0, D:2, E:4, F:5, G:7, A:9, B:11 };
  function pitchToMidi(p) {
    const m = p && p.match(/^([A-G])(#|b)?(-?\d+)$/);
    if (!m) return 60;
    const acc = m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0;
    return 12 * (parseInt(m[3], 10) + 1) + PC[m[1]] + acc;
  }
  function sortByPitch(arr) {
    return arr.slice().sort((a, b) => pitchToMidi(a) - pitchToMidi(b));
  }

  function setStem(name, on) {
    if (!state.stems.hasOwnProperty(name)) return;

    const wasAnyOn = Object.values(state.stems).some(v => v);
    state.stems[name] = !!on;
    const isAnyOn = Object.values(state.stems).some(v => v);

    // Rewind on every transition so play always starts from step 0:
    // - Last stem stopping pauses the transport at position 0 so the
    //   sequence can't drift forward during silence.
    // - First stem starting restarts the transport from position 0.
    // Adding/removing stems while others keep playing leaves the
    // transport untouched so stems stay in sync.
    if (initialized) {
      if (wasAnyOn && !isAnyOn) {
        Tone.Transport.pause();
        Tone.Transport.position = 0;
      } else if (!wasAnyOn && isAnyOn) {
        Tone.Transport.position = 0;
        Tone.Transport.start();
      }
    }
    console.log('[AE] stem', name, '→', !!on, '| ready:', initialized, '| anyOn:', isAnyOn);
  }

  function setDust(d) {
    Object.assign(state.dust, d);
    applyDust();
  }
  function applyDust() {
    if (!initialized) return;
    const { warmth, saturation } = state.dust;

    // Warmth: 0% → 18kHz cutoff (transparent), 100% → 3kHz (blanket)
    warmthFilter.frequency.rampTo(18000 - (warmth / 100) * 15000, 0.1);

    // Saturation: gentle tape soft-clip. Anything past ~0.08 with the bus
    // level we run at fizzes into harsh fuzz — keep it conservative.
    distortion.distortion = saturation ? 0.05 : 0;

    applyHiss();
  }

  function setAtmos(layers, playing, dbValues) {
    Object.assign(state.atmos, layers, { playing: !!playing });
    if (dbValues) Object.assign(state.atmosDb, dbValues);
    applyAtmos();
  }
  function applyAtmos() {
    if (!initialized) return;
    const { rain, cafe, crackle, fire, playing } = state.atmos;
    const db = state.atmosDb;
    rainBus.volume.rampTo(rain && playing ? db.rain : -Infinity, 0.25);
    cafeBus.volume.rampTo(cafe && playing ? db.cafe : -Infinity, 0.25);
    crackleBus.volume.rampTo(crackle && playing ? db.crackle : -Infinity, 0.25);
    fireBus.volume.rampTo(fire && playing ? db.fire : -Infinity, 0.25);
    applyHiss();
  }

  function applyHiss() {
    if (!initialized) return;
    // hissBus is now driven solely by the dust-FX tape hiss (Step 6).
    hissBus.volume.rampTo(state.dust.hiss ? -32 : -Infinity, 0.25);
  }

  function subscribe(cb) {
    subs.add(cb);
    return () => subs.delete(cb);
  }

  // One-shot preview for UI cell clicks. Fires immediately at "now" — the
  // calling button click is the gesture that unlocks the AudioContext.
  function previewDrum(id) {
    if (!initialized) { init().then(() => previewDrum(id)).catch(() => {}); return; }
    const t = Tone.now();
    if (id === 'kick') {
      if (samplesReady.kick) { try { kickSample.start(t); } catch (_) { kick.triggerAttackRelease('C2', '8n', t); } }
      else kick.triggerAttackRelease('C2', '8n', t);
    } else if (id === 'snare') {
      if (samplesReady.snare) { try { snareSample.start(t); } catch (_) { snare.triggerAttackRelease('16n', t); } }
      else snare.triggerAttackRelease('16n', t);
    } else if (id === 'hat') {
      if (samplesReady.hat) { try { hatSample.start(t); } catch (_) { hat.triggerAttackRelease('C5', '32n', t, 0.6); } }
      else hat.triggerAttackRelease('C5', '32n', t, 0.6);
    }
  }

  // One-shot bass preview (used when placing notes in the piano roll).
  // Accepts either a full pitch like 'A2' / 'C#2' or a bare letter (legacy);
  // bare letters are pinned to octave 2 to match the bass register.
  function previewBass(pitch) {
    if (!initialized) { init().then(() => previewBass(pitch)).catch(() => {}); return; }
    if (!pitch) return;
    const fullPitch = /\d/.test(pitch) ? pitch : pitch + '2';
    const useSample = samplesReady.bass;
    const inst = useSample ? bassSampler : bassSynth;
    const playPitch = useSample ? fullPitch : fullPitch.replace(/(-?\d+)$/, (m) => String(parseInt(m, 10) + 1));
    inst.triggerAttackRelease(playPitch, '2n', Tone.now(), 0.85);
  }

  window.AE = {
    init,
    setBpm,
    setSwing,
    setDrumPattern,
    setProgIdx,
    setProgs,
    setChordNotes,
    setBassNotes,
    setMelody,
    setStem,
    setDust,
    setAtmos,
    subscribe,
    previewDrum,
    previewBass,
    isReady: () => initialized,
    samplesReady: () => ({ ...samplesReady }),
  };
})();
