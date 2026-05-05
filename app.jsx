// ===========================================================
//  LO-FI BABY STEPS — interactive widgets (visual only)
// ===========================================================
const { useState, useEffect, useRef, useMemo, useCallback } = React;

// ----------- shared timing -----------
function useAnimatedStep({ playing, stepCount, stepMs, onTick }) {
  const stepRef = useRef(0);
  useEffect(() => {
    if (!playing) { stepRef.current = 0; return; }
    let raf;
    let last = performance.now();
    let acc = 0;
    const tick = (t) => {
      const dt = t - last;
      last = t;
      acc += dt;
      while (acc >= stepMs) {
        acc -= stepMs;
        stepRef.current = (stepRef.current + 1) % stepCount;
        onTick && onTick(stepRef.current);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing, stepMs, stepCount, onTick]);
}

// ===========================================================
//  HERO DEMO CARD
// ===========================================================
function HeroDemo() {
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  useEffect(() => {
    if (!playing) return;
    let raf;
    let start = performance.now() - time * 1000;
    const tick = (t) => {
      setTime(((t - start) / 1000) % 32);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing]);

  const fmt = (s) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  return (
    <aside className="demo-card">
      <div className="tape" style={{
        top: -10, left: 22, width: 90, height: 22,
        transform: 'rotate(-3deg)'
      }}></div>
      <div>
        <div className="label"><span className="live-dot"></span>Now playing · A1</div>
        <h3>Sleepy Café</h3>
        <div className="demo-meta">
          DEMO LOOP <span style={{margin: '0 8px', opacity: 0.4}}>—</span>
          <strong>76 BPM</strong> · A min · 2 bars
        </div>
      </div>

      <div className="vinyl-wrap">
        <div className={`vinyl ${playing ? 'spinning' : ''}`}></div>
      </div>

      <div className="demo-controls">
        <button
          className={`play-btn ${playing ? 'playing' : ''}`}
          onClick={() => setPlaying(p => !p)}
          aria-label={playing ? 'Pause demo' : 'Play demo'}
        >
          <span className="play-tri"></span>
        </button>
        <div className={`waveform ${playing ? 'playing' : ''}`}>
          {Array.from({length: 38}).map((_, i) => {
            const seed = (i * 7 + 3) % 11;
            const h = 30 + seed * 6 + (i % 4) * 4;
            return (
              <i key={i} style={{
                height: `${Math.min(100, h)}%`,
                animationDelay: `${(i * 50) % 1400}ms`
              }}></i>
            );
          })}
        </div>
        <div className="timecode">{fmt(time)} / 0:32</div>
      </div>
    </aside>
  );
}

// ===========================================================
//  STEP 1 — VIBE
// ===========================================================
// youtubeId is the bit after v= in a YouTube URL. Swap any if a video goes
// unavailable. Picks below are long-running, well-known lo-fi videos.
const MOODS = [
  { id: 'study',     name: 'Study Session',   desc: 'Focused, steady',   bpm: 80, key: 'A min', illus: 'study',
    youtubeId: 'jfKfPfyJRdk', track: 'lofi hip hop radio – beats to relax/study to', artist: 'Lofi Girl' },
  { id: 'rainy',     name: 'Rainy Window',    desc: 'A bit melancholy',  bpm: 72, key: 'D min', illus: 'rainy',
    youtubeId: 'rUxyKA_-grg', track: 'lofi hip hop radio – beats to sleep/chill to', artist: 'Lofi Girl' },
  { id: 'latenight', name: 'Late Night Drive',desc: 'Moody, smooth',     bpm: 76, key: 'E min', illus: 'moon',
    youtubeId: '4xDzrJKXOOY', track: '1 A.M Study Session 📚 – lofi hip hop mix', artist: 'Chillhop Music' },
  { id: 'sunday',    name: 'Sunday Morning',  desc: 'Warm, hopeful',     bpm: 84, key: 'C maj', illus: 'sun',
    youtubeId: 'DWcJFNfaw9c', track: 'morning slowed vibes – lofi mix', artist: 'Dreamy' },
];

function MoodIllus({ kind, dark }) {
  const stroke = dark ? '#f0e4ca' : '#2a1d12';
  const accent = '#c47474';
  if (kind === 'study') return (
    <svg viewBox="0 0 64 64" fill="none" stroke={stroke} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <rect x="10" y="14" width="44" height="32" rx="2"/>
      <line x1="10" y1="22" x2="54" y2="22"/>
      <line x1="16" y1="30" x2="38" y2="30" stroke={accent} strokeWidth="2"/>
      <line x1="16" y1="36" x2="44" y2="36"/>
      <line x1="16" y1="42" x2="32" y2="42"/>
      <path d="M22 50 L22 56 L42 56 L42 50" />
    </svg>
  );
  if (kind === 'rainy') return (
    <svg viewBox="0 0 64 64" fill="none" stroke={stroke} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 26 a10 10 0 0 1 19-3 a8 8 0 0 1 5 14 H22 a8 8 0 0 1 -4-11 z"/>
      <line x1="22" y1="46" x2="20" y2="54" stroke={accent} strokeWidth="2"/>
      <line x1="32" y1="46" x2="30" y2="56" stroke={accent} strokeWidth="2"/>
      <line x1="42" y1="46" x2="40" y2="54" stroke={accent} strokeWidth="2"/>
    </svg>
  );
  if (kind === 'moon') return (
    <svg viewBox="0 0 64 64" fill="none" stroke={stroke} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M44 14 a18 18 0 1 0 6 30 a14 14 0 0 1 -6-30z" fill={accent} fillOpacity="0.1"/>
      <circle cx="18" cy="20" r="1" fill={stroke}/>
      <circle cx="14" cy="34" r="1" fill={stroke}/>
      <circle cx="22" cy="46" r="1" fill={stroke}/>
    </svg>
  );
  if (kind === 'sun') return (
    <svg viewBox="0 0 64 64" fill="none" stroke={stroke} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="32" cy="32" r="10" fill={accent} fillOpacity="0.18"/>
      {[0,45,90,135,180,225,270,315].map(a => {
        const rad = a * Math.PI/180;
        const x1 = 32 + Math.cos(rad)*16, y1 = 32 + Math.sin(rad)*16;
        const x2 = 32 + Math.cos(rad)*22, y2 = 32 + Math.sin(rad)*22;
        return <line key={a} x1={x1} y1={y1} x2={x2} y2={y2}/>;
      })}
    </svg>
  );
  return null;
}

function VibeStep({ selectedMood, setSelectedMood, bpm, setBpm, completed, setCompleted }) {
  const beats = 4;
  const [beat, setBeat] = useState(-1);
  const [metroOn, setMetroOn] = useState(false);
  const [playingMoodId, setPlayingMoodId] = useState(null);
  const playingMood = MOODS.find(m => m.id === playingMoodId);

  const handleMoodClick = (m) => {
    setSelectedMood(m.id);
    setBpm(m.bpm);
    if (metroOn) setMetroOn(false);
    setPlayingMoodId(m.id);
  };

  useEffect(() => {
    if (!metroOn) { setBeat(-1); return; }
    const interval = (60 / bpm) * 1000;
    let i = 0;
    setBeat(0);
    const id = setInterval(() => {
      i = (i + 1) % beats;
      setBeat(i);
    }, interval);
    return () => clearInterval(id);
  }, [metroOn, bpm]);

  // Audio: just push the metro flag. AE.init() is driven by the App's
  // user-gesture listener — calling it here on mount (before any click)
  // would fail because the AudioContext can't start without a gesture.
  useEffect(() => {
    AE.setStem('metro', metroOn);
  }, [metroOn]);

  return (
    <div className="step-block" id="step1">
      <aside className="step-rail">
        <div className="step-num"><small>Step</small>01</div>
        <h4 style={{marginBottom: 4}}>Find Your Vibe</h4>
        <div className="duration">
          <div><b>~10 min</b>Mood + tempo</div>
          <div><b>Pre-music</b>Decision before sound</div>
        </div>
        <ul className="checklist">
          <li className={selectedMood ? 'done' : ''}>Pick a mood</li>
          <li className={completed.tempo ? 'done' : ''}>Lock in tempo</li>
        </ul>
      </aside>

      <div className="step-body">
        <span className="eyebrow">Step 01<span className="dot"></span>Vibe</span>
        <h2>Decide what your beat is <em><span className="underline-hand">for</span></em>.</h2>
        <p className="lede">Before you touch a single drum, set the mood. The vibe you pick guides every choice you make next — tempo, key, even which chords sound right.</p>

        <h4 style={{marginBottom: 14}}>Pick a mood — hear the vibe</h4>
        <div className="mood-grid">
          {MOODS.map((m) => (
            <button
              key={m.id}
              className={`mood-tile ${selectedMood === m.id ? 'selected' : ''} ${playingMoodId === m.id ? 'playing' : ''}`}
              onClick={() => handleMoodClick(m)}
            >
              <div className="mood-illus">
                <MoodIllus kind={m.illus} dark={selectedMood === m.id} />
                {playingMoodId === m.id && (
                  <span className="mood-playing-badge"><span className="eq"><i></i><i></i><i></i></span>Playing</span>
                )}
              </div>
              <div className="mood-body">
                <div className="name">{m.name}</div>
                <div className="desc">{m.desc}</div>
                <div className="mood-meta">
                  <span>{m.bpm} bpm</span>
                  <span>{m.key}</span>
                </div>
              </div>
            </button>
          ))}
        </div>

        <div className="mood-player">
          <div className="mood-player-hd">
            <div>
              <span className="kicker"><span className="marker"></span>{playingMood ? 'Now playing' : 'Reference track'}</span>
              <h5>{playingMood ? playingMood.track : 'Pick a mood to hear the vibe'}</h5>
              <div className="mood-player-meta">
                {playingMood
                  ? <><span>{playingMood.artist}</span><span>·</span><span>{playingMood.bpm} bpm · {playingMood.key}</span></>
                  : <span>YouTube preview · click any tile above</span>}
              </div>
            </div>
            {playingMood && (
              <button className="mood-stop-btn" onClick={() => setPlayingMoodId(null)}>■ Stop</button>
            )}
          </div>
          <div className="mood-player-frame">
            {playingMood ? (
              <iframe
                key={playingMood.youtubeId}
                src={`https://www.youtube-nocookie.com/embed/${playingMood.youtubeId}?autoplay=1&modestbranding=1&rel=0`}
                title={`${playingMood.track} — ${playingMood.artist}`}
                frameBorder="0"
                allow="autoplay; encrypted-media; picture-in-picture"
                allowFullScreen
              />
            ) : (
              <div className="mood-player-placeholder">
                <svg viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="32" cy="32" r="22"/>
                  <path d="M27 24 L43 32 L27 40 Z" fill="currentColor" stroke="none"/>
                </svg>
                <p>Each mood has a real lo-fi reference track. Tap a tile above and listen while you decide.</p>
              </div>
            )}
          </div>
        </div>

        <div className="callout-row">
          <div className="callout tip">
            <strong className="kicker"><span className="marker"></span>Why this matters</strong>
            <span className="body-title">Mood is the brief.</span>
            <p>"Rainy Window" wants slower drums and minor chords. "Sunday Morning" wants brighter major chords. Mood gives you a question to ask at every step: <em>does this fit?</em></p>
          </div>
          <div className="callout fallback">
            <strong className="kicker"><span className="marker"></span>Stuck?</strong>
            <span className="body-title">Just pick "Sleepy Café" energy.</span>
            <p>It's the most "classic" lo-fi sounding mood. Pick <strong>Rainy Window</strong> or <strong>Late Night Drive</strong> and you can't go wrong.</p>
          </div>
        </div>

        <h4 style={{marginTop: 36, marginBottom: 14}}>Lock in your tempo</h4>
        <p style={{maxWidth: 620, marginBottom: 0, color: 'var(--ink-2)'}}>Lo-fi lives between <strong>70 and 90 BPM</strong>. Slower = sleepier. Faster = more energy. Drag the slider, watch the metronome.</p>

        <div className="tempo-strip">
          <div className="tempo-card">
            <div className="hd">
              <h5>Tempo</h5>
              <span className="mono" style={{fontSize: '0.7rem', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--ink-3)'}}>Beats per minute</span>
            </div>
            <div className="bpm-readout">{bpm}<small>BPM</small></div>
            <input
              type="range"
              className="tempo-slider"
              min="60" max="100"
              value={bpm}
              onChange={(e) => { setBpm(parseInt(e.target.value)); setCompleted({...completed, tempo: true}); }}
            />
            <div className="tempo-scale">
              <span>60</span><span>70</span><span>80</span><span>90</span><span>100</span>
            </div>
          </div>

          <div className="metronome-vis">
            <div className="hd">
              <h5>Metronome</h5>
              <span className="label">{metroOn ? 'Live' : 'Idle'}</span>
            </div>
            <div className="metro-pendulum">
              <div className="base"></div>
              <div className={`arm ${metroOn ? 'tick' : ''}`} style={{
                animationDuration: `${(60 / bpm) * 2}s`
              }}></div>
            </div>
            <div className="metro-beats">
              {[0,1,2,3].map(i => (
                <div key={i} className={`beat ${beat === i ? 'on' : ''}`}></div>
              ))}
            </div>
            <button
              className="drum-btn"
              style={{marginTop: 14, alignSelf: 'flex-end'}}
              onClick={() => setMetroOn(o => {
                const next = !o;
                if (next && playingMoodId) setPlayingMoodId(null);
                return next;
              })}
            >
              {metroOn ? '■ Stop click' : '▶ Click track'}
            </button>
          </div>
        </div>

        <div className="bandlab-split">
          <div>
            <div className="head">
              <h5>In this site</h5>
              <span className="badge">Practice</span>
            </div>
            <p>Drag the slider above. Watch the metronome arm swing in time with your tempo. The beat dots flash on each quarter-note.</p>
          </div>
          <div>
            <div className="head">
              <h5>In BandLab</h5>
              <span className="badge bl">Translate</span>
            </div>
            <p>Open a new project. Top toolbar → click the <code>BPM</code> number → type your tempo. Done.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ===========================================================
//  STEP 3 — DRUM MACHINE
// ===========================================================
const DRUM_ROWS = [
  { id: 'kick',  label: 'Kick',  short: 'BD' },
  { id: 'snare', label: 'Snare', short: 'SD' },
  { id: 'hat',   label: 'Hi-Hat',short: 'HH' },
];
const STARTER_PATTERN = [
  [1,0,0,0, 0,0,1,0, 0,0,1,0, 0,0,0,0],
  [0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,1],
  [1,0,1,0, 1,0,1,0, 1,0,1,0, 1,0,1,0],
];

function DrumStep({ pattern, setPattern, bpm, setBpm, playing, setPlaying, currentStep }) {
  const sparksRef = useRef(null);

  const fireSpark = (rowIdx, stepIdx) => {
    const wrap = sparksRef.current;
    if (!wrap) return;
    const cell = wrap.querySelector(`[data-r="${rowIdx}"][data-s="${stepIdx}"]`);
    if (!cell) return;
    const cellRect = cell.getBoundingClientRect();
    const wrapRect = wrap.getBoundingClientRect();
    const x = cellRect.left - wrapRect.left + cellRect.width / 2;
    const y = cellRect.top - wrapRect.top + cellRect.height / 2;
    for (let i = 0; i < 4; i++) {
      const s = document.createElement('div');
      s.className = 'spark';
      const angle = -Math.PI / 2 + (Math.random() - 0.5) * 1.8;
      const dist = 24 + Math.random() * 18;
      s.style.left = x + 'px';
      s.style.top = y + 'px';
      s.style.setProperty('--dx', `${Math.cos(angle) * dist}px`);
      s.style.setProperty('--dy', `${Math.sin(angle) * dist}px`);
      const colors = ['#c47474', '#c89545', '#6b8a64', '#f0e4ca'];
      s.style.background = colors[rowIdx === 0 ? 0 : rowIdx === 1 ? 1 : 2];
      wrap.appendChild(s);
      setTimeout(() => s.remove(), 700);
    }
  };

  useEffect(() => {
    if (!playing || currentStep < 0) return;
    pattern.forEach((row, r) => {
      if (row[currentStep]) fireSpark(r, currentStep);
    });
  }, [currentStep, playing]);

  const toggle = (r, s) => {
    const next = pattern.map(row => row.slice());
    next[r][s] = next[r][s] ? 0 : 1;
    setPattern(next);
  };

  const clear = () => setPattern(DRUM_ROWS.map(() => Array(16).fill(0)));
  const loadStarter = () => setPattern(STARTER_PATTERN.map(r => r.slice()));

  return (
    <div className="step-block" id="step3">
      <aside className="step-rail">
        <div className="step-num"><small>Step</small>03</div>
        <h4 style={{marginBottom: 4}}>Build the Beat</h4>
        <div className="duration">
          <div><b>~15 min</b>Drum machine</div>
          <div><b>Recipe</b>Kick · Snare · Hat</div>
        </div>
        <ul className="checklist">
          <li className={pattern[0].some(x => x) ? 'done' : ''}>Place a kick</li>
          <li className={pattern[1].some(x => x) ? 'done' : ''}>Add a snare</li>
          <li className={pattern[2].some(x => x) ? 'done' : ''}>Sprinkle hi-hats</li>
        </ul>
      </aside>

      <div className="step-body">
        <span className="eyebrow">Step 03<span className="dot"></span>Beat</span>
        <h2>Build the <em><span className="underline-hand">groove</span></em>.</h2>
        <p className="lede">A lo-fi drum pattern is just three sounds: <strong>kick</strong> (the boom), <strong>snare</strong> (the smack), <strong>hi-hat</strong> (the tick). Sixteen sixteenth-notes across one bar. Click cells. Hit play.</p>

        <div className="drum-shell" ref={sparksRef}>
          <div className="drum-head">
            <div>
              <div className="device-name">SP-7080 <span style={{color: 'var(--rose)', fontStyle: 'italic'}}>· lofi</span></div>
              <span className="device-sub">Sequencer · 1 bar · 16 steps</span>
            </div>
            <div className="drum-tempo">
              <span>Tempo</span>
              <input type="range" min="60" max="100" value={bpm} onChange={(e) => setBpm(parseInt(e.target.value))} />
              <span className="val">{bpm}</span>
              <span>BPM</span>
            </div>
            <div className="drum-controls">
              <button className="drum-btn" onClick={loadStarter}>Starter</button>
              <button className="drum-btn" onClick={clear}>Clear</button>
              <button className={`drum-btn primary`} onClick={() => setPlaying(p => !p)}>
                {playing ? '■ Stop' : '▶ Play'}
              </button>
            </div>
          </div>

          <div className="drum-grid-wrap">
            <div className="drum-headers">
              <div></div>
              {[0,1,2,3].map(b => (
                <React.Fragment key={b}>
                  <div className="num">{b+1}</div>
                  <div>e</div><div>&amp;</div><div>a</div>
                </React.Fragment>
              ))}
            </div>
            <div className="drum-grid">
              {DRUM_ROWS.map((row, r) => (
                <React.Fragment key={row.id}>
                  <div className="row-label">
                    {row.label}
                    <span className="key">{row.short}</span>
                  </div>
                  {Array.from({length: 16}).map((_, s) => (
                    <button
                      key={s}
                      data-r={r} data-s={s}
                      className={`drum-cell ${row.id} ${pattern[r][s] ? 'on' : ''} ${s % 4 === 0 ? 'beat-mark' : ''} ${currentStep === s && playing ? 'playhead' : ''} ${currentStep === s && pattern[r][s] && playing ? 'fired' : ''}`}
                      onClick={() => toggle(r, s)}
                      aria-label={`${row.label} step ${s+1}`}
                    ></button>
                  ))}
                </React.Fragment>
              ))}
            </div>
          </div>
        </div>

        <div className="callout-row">
          <div className="callout tip">
            <strong className="kicker"><span className="marker"></span>The lo-fi recipe</strong>
            <span className="body-title">Kick on 1 + just before 3.</span>
            <p>Snares on <strong>2</strong> and <strong>4</strong>. Hats every 8th. The kick <em>just before</em> beat 3 (not on it) is what gives lo-fi its lazy, dragging feel.</p>
          </div>
          <div className="callout fallback">
            <strong className="kicker"><span className="marker"></span>Stuck?</strong>
            <span className="body-title">Hit Starter, then change one thing.</span>
            <p>It loads a classic boom-bap pattern. Your job: move a hi-hat, add a kick, take one out — and decide if you like it better.</p>
          </div>
        </div>

        <div className="bandlab-split">
          <div>
            <div className="head">
              <h5>In this site</h5>
              <span className="badge">Practice</span>
            </div>
            <p>Click cells to toggle steps. Hot rows: <span className="kbd">K</span> kick, <span className="kbd">S</span> snare, <span className="kbd">H</span> hat.</p>
          </div>
          <div>
            <div className="head">
              <h5>In BandLab</h5>
              <span className="badge bl">Translate</span>
            </div>
            <p>Click <code>+</code> on the left → <strong>Drum Machine</strong>. Pick a kit called something like <em>Boom Bap</em> or <em>Lo-Fi</em>. Same grid: kick, snare, hat rows. Recreate your pattern.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ===========================================================
//  STEP 2 — CHORDS
// ===========================================================
const PROGS = [
  { name: 'Sleepy Café',      labels: ['Am7','Dm7','G7','Cmaj7'],     notes: [['A3','C4','E4','G4'], ['D4','F4','A4','C5'], ['G3','B3','D4','F4'], ['C4','E4','G4','B4']], color: 'rose',    mood: 'A little sad, a little soft.' },
  { name: 'Late Night Drive', labels: ['Cmaj7','Em7','Am7','Fmaj7'],  notes: [['C4','E4','G4','B4'], ['E4','G4','B4','D5'], ['A3','C4','E4','G4'], ['F3','A3','C4','E4']], color: 'indigo', mood: 'Smooth, a little mysterious.' },
  { name: 'Rainy Window',     labels: ['Fmaj7','Em7','Dm7','Cmaj7'],  notes: [['F3','A3','C4','E4'], ['E4','G4','B4','D5'], ['D4','F4','A4','C5'], ['C4','E4','G4','B4']], color: 'sage',   mood: 'Falling. Like rain on glass.' },
  { name: 'Sunday Morning',   labels: ['Dm7','G7','Cmaj7','Am7'],     notes: [['D4','F4','A4','C5'], ['G3','B3','D4','F4'], ['C4','E4','G4','B4'], ['A3','C4','E4','G4']], color: 'mustard',mood: 'Warm. Like sunlight on your face.' },
];

const CHORD_COLORS = ['rose', 'mustard', 'sage', 'indigo'];

function noteToMidi(name) {
  const m = name.match(/^([A-G])([#b]?)(-?\d+)$/);
  if (!m) return 60;
  const semitones = { C:0, D:2, E:4, F:5, G:7, A:9, B:11 };
  const acc = m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0;
  return 12 * (parseInt(m[3], 10) + 1) + semitones[m[1]] + acc;
}

function ChordsStep({ progIdx, setProgIdx, playing, setPlaying }) {
  const [phase, setPhase] = useState(0); // 0..3 (which chord is current)
  const [progress, setProgress] = useState(0); // 0..1 within whole loop

  useEffect(() => {
    if (!playing) { setPhase(0); setProgress(0); return; }
    let raf;
    const start = performance.now();
    const cycleMs = 8000; // 4 chords × 2s
    const tick = (t) => {
      const elapsed = (t - start) % cycleMs;
      const p = elapsed / cycleMs;
      setProgress(p);
      setPhase(Math.floor(p * 4));
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing]);

  const prog = PROGS[progIdx];
  // Pitch range for roll: F3(53) to F5(77), 25 rows; we'll display 13 (half)
  const lo = 56, hi = 80; // 25 rows
  const allNotes = prog.notes.flat().map(noteToMidi);
  const minN = Math.min(...allNotes) - 1;
  const maxN = Math.max(...allNotes) + 1;
  const rows = [];
  for (let n = maxN; n >= minN; n--) rows.push(n);

  const beats = 8; // 4 chords × 2 beats
  const cellsW = 8;

  return (
    <div className="step-block" id="step2">
      <aside className="step-rail">
        <div className="step-num"><small>Step</small>02</div>
        <h4 style={{marginBottom: 4}}>Lay the Chords</h4>
        <div className="duration">
          <div><b>~15 min</b>Harmony</div>
          <div><b>Tip</b>4 jazz 7th chords</div>
        </div>
        <ul className="checklist">
          <li className="done">Listen to all 4 progressions</li>
          <li className={progIdx >= 0 ? 'done' : ''}>Pick the one that fits</li>
        </ul>
      </aside>

      <div className="step-body">
        <span className="eyebrow">Step 02<span className="dot"></span>Chords</span>
        <h2>The <em><span className="underline-hand">warm bed</span></em> your melody sleeps on.</h2>
        <p className="lede">Lo-fi chords are jazz chords — they have a 7th note added on top, which is what gives them that dreamy, slightly bittersweet feel. Pick one of the four progressions below.</p>

        <div className="chord-grid">
          {PROGS.map((p, i) => (
            <button
              key={p.name}
              className={`chord-card ${progIdx === i ? 'active' : ''}`}
              onClick={() => setProgIdx(i)}
            >
              <div className="num">Progression · {String(i+1).padStart(2,'0')}</div>
              <div className="name">{p.name}</div>
              <div className="chord-card-mood">{p.mood}</div>
              <div className="chord-card-pills">
                {p.labels.map((l, idx) => (
                  <span key={idx} className={progIdx === i && playing && phase === idx ? 'playing' : ''}>{l}</span>
                ))}
              </div>
            </button>
          ))}
        </div>

        <div className="roll-shell">
          <div className="roll-head">
            <div>
              <div className="label">Piano roll · {prog.name}</div>
              <div className="name">4 chords · 8 beats · loop</div>
            </div>
            <div className="controls">
              <button className={`roll-btn ${playing ? 'primary' : ''}`} onClick={() => setPlaying(p => !p)}>
                {playing ? '■ Stop' : '▶ Play loop'}
              </button>
              <button className="roll-btn" title="Export as MIDI">↓ MIDI</button>
            </div>
          </div>
          <div className="roll-canvas">
            <ChordRoll prog={prog} progIdx={progIdx} progress={progress} playing={playing} phase={phase} />
            <div className="chord-labels">
              <div></div>
              {prog.labels.map((l, i) => (
                <div key={i} className={`lbl ${CHORD_COLORS[i]}`}>{l}</div>
              ))}
            </div>
          </div>
        </div>

        <div className="callout-row">
          <div className="callout tip">
            <strong className="kicker"><span className="marker"></span>What just happened</strong>
            <span className="body-title">Each block = one note.</span>
            <p>Each chord stacks 4 notes. The <strong>bottom note</strong> is the chord's name (the root); the others are added on top to give it colour. The <strong>"7"</strong> in <em>Am7</em> means we added a 7th above the root.</p>
          </div>
          <div className="callout fallback">
            <strong className="kicker"><span className="marker"></span>Stuck?</strong>
            <span className="body-title">Just pick "Sleepy Café".</span>
            <p>It's the most "classic" lo-fi sounding one. You can't go wrong with it.</p>
          </div>
        </div>

        <div className="bandlab-split">
          <div>
            <div className="head">
              <h5>In this site</h5>
              <span className="badge">Practice</span>
            </div>
            <p>Click any progression card to load it. The piano roll shows how the four chords stack — same notation BandLab uses.</p>
          </div>
          <div>
            <div className="head">
              <h5>In BandLab</h5>
              <span className="badge bl">Translate</span>
            </div>
            <p><strong>Easy:</strong> click <code>↓ MIDI</code>, then drag the file onto an empty track. <strong>Hands-on:</strong> add a <strong>Piano</strong> track, open the piano roll, click in 4 notes stacked vertically per chord — match the roll above.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function ChordRoll({ prog, progIdx, progress, playing, phase }) {
  // pitch range
  const allNotes = prog.notes.flat().map(noteToMidi);
  const minN = Math.min(...allNotes) - 1;
  const maxN = Math.max(...allNotes) + 1;
  const rowCount = maxN - minN + 1;
  const rowH = 18;
  const keyW = 60;
  const beats = 8;

  return (
    <div style={{position: 'relative', minWidth: 640, overflowX: 'auto'}}>
      <div style={{
        display: 'grid',
        gridTemplateRows: `repeat(${rowCount}, ${rowH}px)`,
        gridTemplateColumns: `${keyW}px repeat(${beats}, 1fr)`,
        gap: 2,
      }}>
        {Array.from({length: rowCount}).map((_, ri) => {
          const midi = maxN - ri;
          const pc = ((midi % 12) + 12) % 12;
          const isBlack = [1,3,6,8,10].includes(pc);
          const isC = pc === 0;
          const letter = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'][pc];
          const oct = Math.floor(midi / 12) - 1;
          return (
            <React.Fragment key={ri}>
              <div className={`cr-key ${isBlack ? 'black' : ''} ${isC ? 'octave' : ''}`}>
                {isC ? `C${oct}` : letter}
              </div>
              {Array.from({length: beats}).map((_, bi) => (
                <div key={bi} className={`cr-cell ${bi % 2 === 0 ? 'barline' : ''}`} style={{
                  background: isBlack ? 'rgba(40,28,16,0.06)' : 'rgba(40,28,16,0.025)'
                }}></div>
              ))}
            </React.Fragment>
          );
        })}
      </div>
      {/* notes overlay */}
      <div style={{
        position: 'absolute',
        top: 0, left: keyW + 2,
        right: 0,
        height: rowCount * rowH + (rowCount - 1) * 2,
      }}>
        {prog.notes.map((chord, ci) => {
          const colorClass = CHORD_COLORS[ci];
          return chord.map((n, ni) => {
            const midi = noteToMidi(n);
            const ri = maxN - midi;
            const top = ri * (rowH + 2);
            const widthPct = (2 / beats) * 100; // each chord = 2 beats out of 8
            const leftPct = (ci * 2 / beats) * 100;
            return (
              <div
                key={`${ci}-${ni}`}
                className={`cr-note ${colorClass} ${playing && phase === ci ? 'playing' : ''}`}
                style={{
                  position: 'absolute',
                  top: top + 1,
                  height: rowH - 2,
                  left: `calc(${leftPct}% + 2px)`,
                  width: `calc(${widthPct}% - 4px)`,
                }}
              ></div>
            );
          });
        })}
      </div>
      {/* playhead */}
      {playing && (
        <div className="playhead-line" style={{
          left: `calc(${keyW + 2}px + ${progress * 100}% - ${(keyW + 2) * progress}px)`,
          top: 0,
          height: rowCount * rowH + (rowCount - 1) * 2,
        }}></div>
      )}
    </div>
  );
}

// ===========================================================
//  STEP 4 — MELODY
// ===========================================================
const MELODY_PITCHES = ['A5','G5','E5','D5','C5','A4','G4','E4','D4','C4','A3'];
const MELODY_TONIC = new Set(['A5','A4','A3']);
const DEFAULT_MELODY = (() => {
  const m = MELODY_PITCHES.map(() => Array(16).fill(0));
  // a sample sparse melody so it's not empty on load
  m[5][0] = 1; m[5][1] = 1;       // A4 long
  m[3][4] = 1;                    // D5
  m[2][5] = 1; m[2][6] = 1;       // C5
  m[5][9] = 1;                    // A4
  m[6][12] = 1; m[6][13] = 1;     // G4
  return m;
})();

function MelodyStep({ melody, setMelody, playing, setPlaying, currentStep }) {
  const toggle = (pi, si) => {
    const next = melody.map(r => r.slice());
    next[pi][si] = next[pi][si] ? 0 : 1;
    setMelody(next);
  };
  const clear = () => setMelody(MELODY_PITCHES.map(() => Array(16).fill(0)));
  const random = () => {
    const m = MELODY_PITCHES.map(() => Array(16).fill(0));
    let cursor = 0;
    let last = Math.floor(MELODY_PITCHES.length / 2);
    const n = 3 + Math.floor(Math.random() * 3);
    for (let i = 0; i < n; i++) {
      if (cursor >= 15) break;
      const dir = Math.random() < 0.5 ? -1 : 1;
      const size = Math.random() < 0.7 ? 1 : 2;
      let pi = Math.max(0, Math.min(MELODY_PITCHES.length - 1, last + dir * size));
      if (Math.random() < 0.2) pi = last;
      last = pi;
      const len = 1 + Math.floor(Math.random() * 3);
      for (let k = 0; k < len && cursor + k < 16; k++) m[pi][cursor + k] = 1;
      cursor += len + 1 + Math.floor(Math.random() * 3);
    }
    setMelody(m);
  };
  const noteCount = melody.reduce((acc, row) => acc + row.reduce((a,b) => a+b, 0), 0);

  return (
    <div className="step-block" id="step4">
      <aside className="step-rail">
        <div className="step-num"><small>Step</small>04</div>
        <h4 style={{marginBottom: 4}}>Sing the Melody</h4>
        <div className="duration">
          <div><b>~15 min</b>Top line</div>
          <div><b>Safe notes</b>A min pentatonic</div>
        </div>
        <ul className="checklist">
          <li className={noteCount > 0 ? 'done' : ''}>Place at least one note</li>
          <li className={noteCount >= 4 ? 'done' : ''}>Keep it sparse (4–6 notes)</li>
        </ul>
      </aside>

      <div className="step-body">
        <span className="eyebrow">Step 04<span className="dot"></span>Melody</span>
        <h2>The part someone <em><span className="underline-hand">hums</span></em> walking out.</h2>
        <p className="lede">Melodies in lo-fi are <strong>sparse</strong> — five or six notes total. Every row below is a "safe note" (A minor pentatonic). They all sound good against any of the chord progressions above.</p>

        <div className="melody-shell">
          <div className="melody-head">
            <div>
              <div className="label">Pad · A minor pentatonic · 1 bar</div>
              <div className="name">{noteCount} {noteCount === 1 ? 'note' : 'notes'} placed</div>
            </div>
            <div style={{display: 'flex', gap: 6}}>
              <button className="roll-btn" onClick={random}>↻ Random idea</button>
              <button className="roll-btn" onClick={clear}>Clear</button>
              <button className={`roll-btn ${playing ? 'primary' : ''}`} onClick={() => setPlaying(p => !p)} disabled={noteCount === 0}>
                {playing ? '■ Stop' : '▶ Play loop'}
              </button>
              <button className="roll-btn" title="Export as MIDI">↓ MIDI</button>
            </div>
          </div>
          <div className="melody-roll">
            <div className="mr-header">
              <div></div>
              <div className="num">1</div><div className="num">2</div><div className="num">3</div><div className="num">4</div>
            </div>
            {MELODY_PITCHES.map((pitch, pi) => {
              const letter = pitch.replace(/\d/g, '');
              const oct = pitch.replace(/[^\d]/g, '');
              const isTonic = MELODY_TONIC.has(pitch);
              return (
                <div key={pitch} className="mr-row">
                  <div className={`mr-key ${isTonic ? 'tonic' : ''}`}>
                    <span>{letter}<span style={{fontSize: '0.7em', opacity: 0.5}}>{oct}</span></span>
                    {isTonic && <span className="deg">root</span>}
                  </div>
                  {Array.from({length: 16}).map((_, si) => (
                    <button
                      key={si}
                      className={`mr-cell ${melody[pi][si] ? 'on' : ''} ${si % 4 === 0 ? 'beat-mark' : ''} ${playing && currentStep === si && melody[pi][si] ? 'playing' : ''}`}
                      onClick={() => toggle(pi, si)}
                    ></button>
                  ))}
                </div>
              );
            })}
          </div>
        </div>

        <div className="callout-row">
          <div className="callout tip">
            <strong className="kicker"><span className="marker"></span>The recipe</strong>
            <span className="body-title">Fewer notes than you think.</span>
            <p>Long notes are good. Repeating a note is good. Silence is good — leave gaps so the chords can breathe. Aim for <strong>4 notes only</strong>.</p>
          </div>
          <div className="callout fallback">
            <strong className="kicker"><span className="marker"></span>Stuck?</strong>
            <span className="body-title">Hit "Random idea".</span>
            <p>It generates a 6-note phrase using only safe notes. If you like it, keep it. If you don't, hit it again.</p>
          </div>
        </div>

        <div className="bandlab-split">
          <div>
            <div className="head">
              <h5>In this site</h5>
              <span className="badge">Practice</span>
            </div>
            <p>Click cells in the same row for longer notes. Click filled cells to remove them. The yellow row is your <strong>root note</strong> — landing there feels resolved.</p>
          </div>
          <div>
            <div className="head">
              <h5>In BandLab</h5>
              <span className="badge bl">Translate</span>
            </div>
            <p>Hit <code>↓ MIDI</code> and drag onto a new <strong>Synth</strong> or <strong>Mellow Lead</strong> track. Or build it from scratch using the same safe notes: <strong>A3 · C4 · D4 · E4 · G4 · A4 · C5 · D5 · E5 · G5 · A5</strong>.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ===========================================================
//  STEP 5 — BASSLINE
// ===========================================================
function BassStep({ progIdx, playing, setPlaying }) {
  const prog = PROGS[progIdx];
  const [phase, setPhase] = useState(-1);
  useEffect(() => {
    if (!playing) { setPhase(-1); return; }
    let i = 0;
    setPhase(0);
    const id = setInterval(() => {
      i = (i + 1) % 4;
      setPhase(i);
    }, 2000);
    return () => clearInterval(id);
  }, [playing]);

  // bass roots are bottom note of each chord
  const roots = prog.notes.map(c => c[0].replace(/\d/g, ''));
  const freqs = [110, 73, 98, 130]; // approx Hz placeholder visual

  return (
    <div className="step-block" id="step5">
      <aside className="step-rail">
        <div className="step-num"><small>Step</small>05</div>
        <h4 style={{marginBottom: 4}}>Add a Bassline</h4>
        <div className="duration">
          <div><b>~10 min</b>Low end</div>
          <div><b>Trick</b>One root per chord</div>
        </div>
        <ul className="checklist">
          <li className="done">Match each chord's bottom note</li>
          <li className={playing ? 'done' : ''}>Loop and feel the weight</li>
        </ul>
      </aside>

      <div className="step-body">
        <span className="eyebrow">Step 05<span className="dot"></span>Bassline</span>
        <h2>Drop the <em><span className="underline-hand">low end</span></em>.</h2>
        <p className="lede">A bassline glues the chords to the drums. The simplest move: play the <strong>same note</strong> as the bottom of each chord, one note per chord. That's it. The four buttons below are pre-mapped to <strong>{prog.name}</strong>.</p>

        <div className="bass-shell">
          <div className="bass-head">
            <div>
              <span className="label">Sub bass · 1 note per chord</span>
              <h5>One Note Bass · {prog.name}</h5>
            </div>
            <button className={`drum-btn primary`} onClick={() => setPlaying(p => !p)}>
              {playing ? '■ Stop' : '▶ Loop bass'}
            </button>
          </div>

          <div className="bass-buttons">
            {roots.map((root, i) => (
              <button key={i} className={`bass-btn ${playing && phase === i ? 'playing' : ''}`}>
                {playing && phase === i && <span className="ring"></span>}
                <div className="root">{root}</div>
                <div className="from">From {prog.labels[i]}</div>
              </button>
            ))}
          </div>

          <div className="bass-wave">
            <div className={`bass-wave-bars ${playing ? 'live' : ''}`}>
              {Array.from({length: 32}).map((_, i) => (
                <i key={i} style={{
                  height: `${30 + ((i * 13) % 70)}%`,
                  animationDelay: `${(i * 60) % 1200}ms`
                }}></i>
              ))}
            </div>
            <div className="freq">
              <strong>{freqs[Math.max(0, phase)]}Hz</strong><br/>
              <span style={{fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.1em'}}>Sub frequency</span>
            </div>
          </div>
        </div>

        <div className="callout-row">
          <div className="callout tip">
            <strong className="kicker"><span className="marker"></span>Why this works</strong>
            <span className="body-title">The bass note is the foundation.</span>
            <p>Every chord is named after its bottom note. <em>Am7</em> is built on <strong>A</strong>. <em>Dm7</em> on <strong>D</strong>. Play that note as bass and you can never be wrong — it's literally what the chord is built from.</p>
          </div>
          <div className="callout fallback">
            <strong className="kicker"><span className="marker"></span>Want more</strong>
            <span className="body-title">Octave bounce.</span>
            <p>Play the root, then the same note an octave higher, then back. Splits one boring note into a little walking pattern. Keep it sparse — hold each note nice and long.</p>
          </div>
        </div>

        <div className="bandlab-split">
          <div>
            <div className="head">
              <h5>In this site</h5>
              <span className="badge">Practice</span>
            </div>
            <p>Hit "Loop bass" to hear the four root notes cycle in time with the chords. Each button lights when its note is playing.</p>
          </div>
          <div>
            <div className="head">
              <h5>In BandLab</h5>
              <span className="badge bl">Translate</span>
            </div>
            <p>Add a track → pick a <strong>Sub Bass</strong> or <strong>808</strong> instrument. In the piano roll, draw one long note per bar at the chord roots: <strong>{roots.join(' · ')}</strong>. Use octave 2 (like <code>{roots[0]}2</code>) for properly low bass.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ===========================================================
//  STEP 6 — DUSTY (vinyl FX)
// ===========================================================
function DustyStep({ playing, setPlaying }) {
  const [warmth, setWarmth] = useState(40);
  const [wobble, setWobble] = useState(20);
  const [fx, setFx] = useState({ crackle: false, hiss: false, saturation: true });

  // Audio: push dial / toggle values into the master FX chain.
  useEffect(() => {
    AE.setDust({
      warmth, wobble,
      crackle: fx.crackle,
      hiss: fx.hiss,
      saturation: fx.saturation,
    });
  }, [warmth, wobble, fx.crackle, fx.hiss, fx.saturation]);

  const grain = Math.min(0.85, fx.crackle ? 0.7 : 0.25 + warmth/200);
  const blur = (wobble / 100) * 1.2;
  const scratches = fx.crackle ? 0.6 : 0;

  const angleW = -135 + (warmth / 100) * 270;
  const angleWob = -135 + (wobble / 100) * 270;

  return (
    <div className="step-block" id="step6">
      <aside className="step-rail">
        <div className="step-num"><small>Step</small>06</div>
        <h4 style={{marginBottom: 4}}>Make it Dusty</h4>
        <div className="duration">
          <div><b>~10 min</b>Mix FX</div>
          <div><b>Goal</b>1996, not 2026</div>
        </div>
        <ul className="checklist">
          <li className={warmth > 0 ? 'done' : ''}>Add warmth</li>
          <li className={wobble > 0 ? 'done' : ''}>Add wobble</li>
          <li className={fx.crackle || fx.hiss ? 'done' : ''}>Toggle vinyl</li>
        </ul>
      </aside>

      <div className="step-body">
        <span className="eyebrow">Step 06<span className="dot"></span>Dusty</span>
        <h2>Make it sound like <em><span className="underline-hand">tape</span></em>.</h2>
        <p className="lede">Right now your beat sounds <em>clean</em>. Lo-fi sounds <strong>old</strong>. We turn back the clock with three classic effects: <strong>warmth</strong> (mellow the highs), <strong>wobble</strong> (slight pitch drift, like an old tape), and <strong>vinyl noise</strong>.</p>

        <div className="dusty-shell">
          <div className="dusty-head">
            <div>
              <span className="label">Master FX · Lo-Fi chain</span>
              <h5>Tape &amp; Vinyl Processor</h5>
            </div>
            <button className={`drum-btn primary`} onClick={() => setPlaying(p => !p)}>
              {playing ? '■ Stop' : '▶ A / B compare'}
            </button>
          </div>

          <div className="dusty-grid">
            <div className="dial-card">
              <h6>Warmth</h6>
              <span className="dial-sub">Tape saturation · low-pass</span>
              <div className="dial">
                <div className="indicator" style={{transform: `translateX(-50%) rotate(${angleW}deg)`}}></div>
              </div>
              <input type="range" min="0" max="100" value={warmth} onChange={e => setWarmth(parseInt(e.target.value))} className="tempo-slider" style={{marginTop: 16}} />
              <div className="dial-value">{warmth}<small>%</small></div>
              <p className="desc">Rolls off the bright top end. Higher = more "blanket on the speaker".</p>
            </div>

            <div className="dial-card">
              <h6>Wobble</h6>
              <span className="dial-sub">Wow &amp; flutter · pitch drift</span>
              <div className="dial">
                <div className="indicator" style={{transform: `translateX(-50%) rotate(${angleWob}deg)`}}></div>
              </div>
              <input type="range" min="0" max="100" value={wobble} onChange={e => setWobble(parseInt(e.target.value))} className="tempo-slider" style={{marginTop: 16}} />
              <div className="dial-value">{wobble}<small>%</small></div>
              <p className="desc">Tiny up-and-down pitch drift, like an old cassette stretching. Subtle is best.</p>
            </div>
          </div>

          <div className="dusty-toggle-row">
            <button className={`dusty-toggle ${fx.crackle ? 'on' : ''}`} onClick={() => setFx({...fx, crackle: !fx.crackle})}>
              <div>
                <div className="name">Vinyl crackle</div>
                <div className="what">Pops &amp; ticks of an old record</div>
              </div>
              <div className="toggle-led"></div>
            </button>
            <button className={`dusty-toggle ${fx.hiss ? 'on' : ''}`} onClick={() => setFx({...fx, hiss: !fx.hiss})}>
              <div>
                <div className="name">Tape hiss</div>
                <div className="what">Soft white noise floor</div>
              </div>
              <div className="toggle-led"></div>
            </button>
            <button className={`dusty-toggle ${fx.saturation ? 'on' : ''}`} onClick={() => setFx({...fx, saturation: !fx.saturation})}>
              <div>
                <div className="name">Saturation</div>
                <div className="what">Tape squash · glue</div>
              </div>
              <div className="toggle-led"></div>
            </button>
          </div>

          <div className="dusty-preview" style={{
            '--grain': grain,
            '--blur': blur + 'px',
            '--scratches': scratches
          }}>
            <div className="grain"></div>
            <div className="scratches"></div>
            <div className={`wave ${playing ? 'playing' : ''}`}>
              {Array.from({length: 50}).map((_, i) => (
                <i key={i} style={{
                  height: `${20 + ((i * 11) % 80)}%`,
                  animationDelay: `${(i * 40) % 1500}ms`
                }}></i>
              ))}
            </div>
          </div>
        </div>

        <div className="callout-row">
          <div className="callout tip">
            <strong className="kicker"><span className="marker"></span>The big secret</strong>
            <span className="body-title">FX go on the master.</span>
            <p>You don't add these to each track. You put one chain on the <strong>master</strong> bus so every track gets the same dust. That's what makes the whole song feel like it belongs together.</p>
          </div>
          <div className="callout fallback">
            <strong className="kicker"><span className="marker"></span>Stuck?</strong>
            <span className="body-title">Warmth 50, Wobble 25, crackle on.</span>
            <p>That's a "classic" lo-fi setting. Use that as your starting point and twist from there.</p>
          </div>
        </div>

        <div className="bandlab-split">
          <div>
            <div className="head">
              <h5>In this site</h5>
              <span className="badge">Practice</span>
            </div>
            <p>Twist the dials. Toggle the effects. Watch the preview wave get fuzzier and dustier.</p>
          </div>
          <div>
            <div className="head">
              <h5>In BandLab</h5>
              <span className="badge bl">Translate</span>
            </div>
            <p>Master track → <code>+ FX</code> → search <strong>"Vinyl"</strong> or <strong>"Lo-Fi"</strong>. There's a one-knob preset that does all of this at once. Stack with <strong>"Tape"</strong> for the wobble.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ===========================================================
//  STEP 7 — ATMOSPHERE
// ===========================================================
function AtmosStep({ playing, setPlaying, layers, setLayers }) {

  // Generate rain droplets
  const rainDrops = useMemo(() =>
    Array.from({length: 60}).map((_, i) => ({
      left: (i * 1.7) % 100,
      delay: (i * 137) % 800,
      duration: 600 + ((i * 53) % 400)
    })), []);
  const crackleDots = useMemo(() =>
    Array.from({length: 24}).map((_, i) => ({
      top: (i * 11) % 100,
      left: (i * 23) % 100,
      delay: (i * 67) % 500
    })), []);

  const toggle = (k) => setLayers({...layers, [k]: !layers[k]});
  const activeCount = Object.values(layers).filter(Boolean).length;

  return (
    <div className="step-block" id="step7">
      <aside className="step-rail">
        <div className="step-num"><small>Step</small>07</div>
        <h4 style={{marginBottom: 4}}>Add Atmosphere</h4>
        <div className="duration">
          <div><b>~5 min</b>Sound design</div>
          <div><b>Layer count</b>{activeCount}/4 active</div>
        </div>
        <ul className="checklist">
          <li className={activeCount > 0 ? 'done' : ''}>Pick at least one layer</li>
          <li className={activeCount >= 2 ? 'done' : ''}>Stack 2 for depth</li>
        </ul>
      </aside>

      <div className="step-body">
        <span className="eyebrow">Step 07<span className="dot"></span>Atmosphere</span>
        <h2>Take the listener <em><span className="underline-hand">somewhere</span></em>.</h2>
        <p className="lede">Lo-fi tracks aren't just music — they're a <strong>place</strong>. A rainy window. A late-night café. The gentle crackle of a record in a quiet room. Layer one or two atmospheric sounds <em>underneath</em> everything else.</p>

        <div className="atmos-shell">
          <div className="atmos-head">
            <div>
              <span className="label">Ambience bus · loop</span>
              <h5>Atmosphere Mixer</h5>
            </div>
            <button className={`drum-btn primary`} onClick={() => setPlaying(p => !p)}>
              {playing ? '■ Stop' : '▶ Listen'}
            </button>
          </div>

          <div className="atmos-window">
            <div className="moon"></div>
            <div className={`rain ${layers.rain && playing ? 'on' : ''}`}>
              {rainDrops.map((d, i) => (
                <i key={i} style={{
                  left: `${d.left}%`,
                  animationDelay: `${d.delay}ms`,
                  animationDuration: `${d.duration}ms`
                }}></i>
              ))}
            </div>
            <div className={`cafe ${layers.cafe && playing ? 'on' : ''}`}>
              <div className="silhouette"></div>
              <div className="silhouette"></div>
              <div className="silhouette"></div>
              <div className="silhouette"></div>
            </div>
            <div className={`crackle ${layers.crackle && playing ? 'on' : ''}`}>
              {crackleDots.map((d, i) => (
                <i key={i} style={{
                  top: `${d.top}%`,
                  left: `${d.left}%`,
                  animationDelay: `${d.delay}ms`
                }}></i>
              ))}
            </div>
            <div className={`hiss ${layers.hiss && playing ? 'on' : ''}`}></div>
          </div>

          <div className="atmos-layers">
            <button className={`atmos-layer ${layers.rain ? 'on' : ''}`} onClick={() => toggle('rain')}>
              <span className="ico">☔</span>
              <div className="name">Rainfall</div>
              <div className="lvl">{layers.rain ? 'Active · -18dB' : 'Bypass'}</div>
              <div className="meter"><div className="meter-fill"></div></div>
            </button>
            <button className={`atmos-layer ${layers.cafe ? 'on' : ''}`} onClick={() => toggle('cafe')}>
              <span className="ico">☕</span>
              <div className="name">Café murmur</div>
              <div className="lvl">{layers.cafe ? 'Active · -22dB' : 'Bypass'}</div>
              <div className="meter"><div className="meter-fill"></div></div>
            </button>
            <button className={`atmos-layer ${layers.crackle ? 'on' : ''}`} onClick={() => toggle('crackle')}>
              <span className="ico">💿</span>
              <div className="name">Vinyl crackle</div>
              <div className="lvl">{layers.crackle ? 'Active · -24dB' : 'Bypass'}</div>
              <div className="meter"><div className="meter-fill"></div></div>
            </button>
            <button className={`atmos-layer ${layers.hiss ? 'on' : ''}`} onClick={() => toggle('hiss')}>
              <span className="ico">📼</span>
              <div className="name">Tape hiss</div>
              <div className="lvl">{layers.hiss ? 'Active · -28dB' : 'Bypass'}</div>
              <div className="meter"><div className="meter-fill"></div></div>
            </button>
          </div>
        </div>

        <div className="callout-row">
          <div className="callout tip">
            <strong className="kicker"><span className="marker"></span>The rule</strong>
            <span className="body-title">Quiet enough to almost miss.</span>
            <p>Atmosphere should sit <em>way</em> under the music. If you can clearly hear the rain, it's too loud. People should feel it before they hear it.</p>
          </div>
          <div className="callout fallback">
            <strong className="kicker"><span className="marker"></span>Stuck?</strong>
            <span className="body-title">Just rain + crackle.</span>
            <p>That's the most "lo-fi" combination. If you want more energy, swap rain for café murmur.</p>
          </div>
        </div>

        <div className="bandlab-split">
          <div>
            <div className="head">
              <h5>In this site</h5>
              <span className="badge">Practice</span>
            </div>
            <p>Toggle each layer. Watch the window scene change. Hit Listen to play them together.</p>
          </div>
          <div>
            <div className="head">
              <h5>In BandLab</h5>
              <span className="badge bl">Translate</span>
            </div>
            <p>Loop library → search <code>rain</code>, <code>cafe</code>, <code>vinyl crackle</code>. Drag onto its own track. Set the volume to about <strong>-20dB</strong> — properly quiet.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ===========================================================
//  ASSEMBLY VIEW — final track tape deck
// ===========================================================
function Assembly({ pattern, progIdx, melody, mood, bpm, playing, setPlaying, currentStep, dustyOn, atmosLayers }) {
  const pct = ((currentStep + 1) / 16) * 100;
  const prog = PROGS[progIdx];
  const moodObj = MOODS.find(m => m.id === mood);
  const roots = prog.notes.map(c => c[0].replace(/\d/g, ''));
  const atmosCount = atmosLayers ? Object.values(atmosLayers).filter(Boolean).length : 0;

  return (
    <section className="spread" id="assemble">
      <div className="blob b1" style={{background: 'var(--rose)'}}></div>
      <div className="blob b2" style={{background: 'var(--cyan)'}}></div>
      <span className="folio">Final Mix · 05/06</span>
      <div className="page">
        <span className="eyebrow"><span className="dot"></span>Final mix · all six layers</span>
        <h2 style={{margin: '14px 0 10px'}}>Stack it up.</h2>
        <p className="lede" style={{maxWidth: 700, marginBottom: 36}}>This is your finished track — drums, chords, melody, bass, dust, and atmosphere all playing together. Six tape reels, one transport. If you got this far, you've made a complete piece of music.</p>

        <div className="assembly">
          <div className="assembly-head">
            <div>
              <div className="label">Track · take 01</div>
              <h2 style={{fontSize: '2.4rem'}}>{moodObj?.name || 'Untitled'} <em style={{fontWeight: 300, color: 'var(--rose)'}}>· {prog.name}</em></h2>
              <p className="lede">6 stems · {bpm} BPM · 4/4 · A minor</p>
            </div>
            <div style={{
              fontFamily: 'var(--mono)', fontSize: '0.7rem',
              color: 'rgba(240,228,202,0.55)', letterSpacing: '0.1em',
              textTransform: 'uppercase', textAlign: 'right'
            }}>
              <div>Length<br/><strong style={{color: 'var(--paper)', fontFamily: 'var(--display)', fontSize: '1.6rem', fontWeight: 700, letterSpacing: '-0.01em'}}>0:32</strong></div>
            </div>
          </div>

          {/* drum stem */}
          <div className="tape-deck">
            <div className={`tape-reel ${playing ? 'playing' : ''}`}></div>
            <div className="tape-info">
              <div className="role"><span className="num">01</span>Stem · Drums</div>
              <div className="title-row"><h3>The Beat</h3><span className="source">Step 03 → Drum machine</span></div>
              <div className="tape-strip layered">
                {DRUM_ROWS.map((row, r) => (
                  <div key={row.id} className={`lane ${row.id}`}>
                    {pattern[r].map((on, s) => on ? (
                      <div key={s} className="step" style={{
                        left: `${(s/16)*100}%`,
                        width: `${(1/16)*100}%`
                      }}></div>
                    ) : null)}
                  </div>
                ))}
                <div className="playhead" style={{left: `${pct}%`}}></div>
              </div>
            </div>
            <div className="tape-meter">
              <div className="vu">
                {Array.from({length: 8}).map((_, i) => (
                  <i key={i} style={{
                    height: `${10 + ((playing ? Math.sin(Date.now()/200 + i) * 12 + 14 : 6))}px`,
                    background: i > 5 ? 'var(--rose)' : i > 3 ? 'var(--mustard)' : 'var(--sage)'
                  }}></i>
                ))}
              </div>
              <span>VU</span>
            </div>
          </div>

          {/* chords stem */}
          <div className="tape-deck">
            <div className={`tape-reel ${playing ? 'playing' : ''}`}></div>
            <div className="tape-info">
              <div className="role"><span className="num">02</span>Stem · Chords</div>
              <div className="title-row"><h3>The Bed</h3><span className="source">Step 02 → {prog.name}</span></div>
              <div className="tape-strip chord">
                {[0,1,2,3].map(i => (
                  <div key={i} className="step" style={{
                    left: `${(i/4)*100}%`,
                    width: `${(1/4)*100 - 0.5}%`,
                    background: ['var(--rose)','var(--mustard)','var(--sage)','var(--indigo)'][i]
                  }}></div>
                ))}
                <div className="playhead" style={{left: `${pct}%`}}></div>
              </div>
            </div>
            <div className="tape-meter">
              <div className="vu">
                {Array.from({length: 8}).map((_, i) => (
                  <i key={i} style={{
                    height: `${8 + (playing ? (i*2 + (Date.now()/300 + i) % 10) : 4)}px`,
                    background: i > 6 ? 'var(--rose)' : 'var(--sage)'
                  }}></i>
                ))}
              </div>
              <span>VU</span>
            </div>
          </div>

          {/* melody stem */}
          <div className="tape-deck">
            <div className={`tape-reel ${playing ? 'playing' : ''}`}></div>
            <div className="tape-info">
              <div className="role"><span className="num">03</span>Stem · Melody</div>
              <div className="title-row"><h3>The Top Line</h3><span className="source">Step 04 → A min pentatonic</span></div>
              <div className="tape-strip melody">
                {melody.map((row, pi) => row.map((on, si) => on ? (
                  <div key={`${pi}-${si}`} className="step" style={{
                    left: `${(si/16)*100}%`,
                    width: `${(1/16)*100}%`,
                    top: `${(pi/MELODY_PITCHES.length)*100}%`,
                    height: `${100/MELODY_PITCHES.length}%`,
                    bottom: 'auto',
                    background: 'var(--rose)'
                  }}></div>
                ) : null))}
                <div className="playhead" style={{left: `${pct}%`}}></div>
              </div>
            </div>
            <div className="tape-meter">
              <div className="vu">
                {Array.from({length: 8}).map((_, i) => (
                  <i key={i} style={{
                    height: `${6 + (playing ? Math.abs(Math.sin(Date.now()/250 + i*0.5)) * 16 : 3)}px`,
                    background: i > 5 ? 'var(--rose)' : 'var(--sage)'
                  }}></i>
                ))}
              </div>
              <span>VU</span>
            </div>
          </div>

          {/* bass stem */}
          <div className="tape-deck">
            <div className={`tape-reel ${playing ? 'playing' : ''}`}></div>
            <div className="tape-info">
              <div className="role"><span className="num">04</span>Stem · Bass</div>
              <div className="title-row"><h3>The Floor</h3><span className="source">Step 05 → Root-note bass</span></div>
              <div className="tape-strip chord">
                {roots.map((r, i) => (
                  <div key={i} className="step" style={{
                    left: `${(i/4)*100}%`,
                    width: `${(1/4)*100 - 0.5}%`,
                    background: 'var(--indigo)',
                    opacity: 0.85
                  }}>
                    <span style={{
                      position: 'absolute', inset: 0, display: 'grid', placeItems: 'center',
                      fontFamily: 'var(--display)', fontWeight: 700, fontSize: '1.1rem',
                      color: 'var(--paper)', letterSpacing: '0.02em'
                    }}>{r}</span>
                  </div>
                ))}
                <div className="playhead" style={{left: `${pct}%`}}></div>
              </div>
            </div>
            <div className="tape-meter">
              <div className="vu">
                {Array.from({length: 8}).map((_, i) => (
                  <i key={i} style={{
                    height: `${10 + (playing ? Math.abs(Math.sin(Date.now()/180 + i*0.4)) * 18 : 4)}px`,
                    background: i > 5 ? 'var(--rose)' : i > 2 ? 'var(--mustard)' : 'var(--indigo)'
                  }}></i>
                ))}
              </div>
              <span>VU</span>
            </div>
          </div>

          {/* dust stem */}
          <div className="tape-deck">
            <div className={`tape-reel ${playing ? 'playing' : ''}`}></div>
            <div className="tape-info">
              <div className="role"><span className="num">05</span>Stem · Dust & Wobble</div>
              <div className="title-row"><h3>The Character</h3><span className="source">Step 06 → Tape effects</span></div>
              <div className="tape-strip" style={{background: 'rgba(0,0,0,0.4)', height: 56, position: 'relative', overflow: 'hidden'}}>
                {/* wavy wobble line */}
                <svg viewBox="0 0 400 56" preserveAspectRatio="none" style={{position:'absolute', inset:0, width:'100%', height:'100%'}}>
                  <path d={`M 0 28 ${Array.from({length: 40}).map((_, i) => `L ${i*10} ${28 + Math.sin(i*0.8 + (playing ? Date.now()/300 : 0)) * 10}`).join(' ')}`}
                    stroke="var(--mustard)" strokeWidth="1.5" fill="none" opacity="0.7"/>
                </svg>
                {/* crackle dots */}
                {Array.from({length: 24}).map((_, i) => (
                  <span key={i} style={{
                    position: 'absolute',
                    left: `${(i * 37) % 100}%`,
                    top: `${(i * 53) % 80 + 10}%`,
                    width: 2, height: 2, borderRadius: '50%',
                    background: 'var(--paper)',
                    opacity: 0.3 + ((i * 7) % 5) / 10
                  }}></span>
                ))}
                <div className="playhead" style={{left: `${pct}%`}}></div>
              </div>
            </div>
            <div className="tape-meter">
              <div className="vu">
                {Array.from({length: 8}).map((_, i) => (
                  <i key={i} style={{
                    height: `${6 + (playing ? ((i * 13 + Date.now()/100) % 14) : 3)}px`,
                    background: 'var(--mustard)',
                    opacity: 0.7
                  }}></i>
                ))}
              </div>
              <span>VU</span>
            </div>
          </div>

          {/* atmosphere stem */}
          <div className="tape-deck">
            <div className={`tape-reel ${playing ? 'playing' : ''}`}></div>
            <div className="tape-info">
              <div className="role"><span className="num">06</span>Stem · Atmosphere</div>
              <div className="title-row">
                <h3>The Room</h3>
                <span className="source">
                  Step 07 → {atmosCount > 0
                    ? Object.entries(atmosLayers || {}).filter(([_,v]) => v).map(([k]) => k).join(' + ')
                    : 'no layers'}
                </span>
              </div>
              <div className="tape-strip" style={{background: 'rgba(0,0,0,0.35)', height: 56, position:'relative', overflow:'hidden'}}>
                {atmosCount === 0 ? (
                  <span style={{
                    position:'absolute', inset:0, display:'grid', placeItems:'center',
                    fontFamily: 'var(--mono)', fontSize: '0.7rem', color: 'rgba(240,228,202,0.4)',
                    letterSpacing: '0.15em', textTransform: 'uppercase'
                  }}>— silent —</span>
                ) : (
                  <React.Fragment>
                    {/* horizontal bands per active layer */}
                    {Object.entries(atmosLayers || {}).filter(([_,v]) => v).map(([key], idx, arr) => {
                      const colors = {rain: 'var(--cyan)', cafe: 'var(--mustard)', crackle: 'var(--rose)', hiss: 'var(--sage)'};
                      const h = 100 / arr.length;
                      return (
                        <div key={key} style={{
                          position:'absolute', left:0, right:0,
                          top: `${idx*h}%`, height: `${h}%`,
                          background: `linear-gradient(90deg, transparent, ${colors[key]}33, transparent)`,
                          borderTop: idx > 0 ? '1px dashed rgba(240,228,202,0.1)' : 'none'
                        }}>
                          <span style={{
                            position:'absolute', left: 8, top: '50%', transform:'translateY(-50%)',
                            fontFamily:'var(--mono)', fontSize:'0.6rem',
                            color: colors[key], letterSpacing:'0.15em', textTransform:'uppercase'
                          }}>{key}</span>
                        </div>
                      );
                    })}
                  </React.Fragment>
                )}
                <div className="playhead" style={{left: `${pct}%`}}></div>
              </div>
            </div>
            <div className="tape-meter">
              <div className="vu">
                {Array.from({length: 8}).map((_, i) => (
                  <i key={i} style={{
                    height: `${4 + (playing && atmosCount > 0 ? ((i * 11 + Date.now()/120) % 10) + atmosCount*2 : 3)}px`,
                    background: 'var(--cyan)',
                    opacity: 0.6
                  }}></i>
                ))}
              </div>
              <span>VU</span>
            </div>
          </div>

          <div className="assembly-controls">
            <button className={`transport-btn ${playing ? 'playing' : ''}`} onClick={() => setPlaying(p => !p)}>
              <span className="play-tri"></span>
            </button>
            <div className="transport-info">
              <div className="track-name">Press play. Hear it all together.</div>
              <div className="meta">Loop · {bpm} BPM · stems sync to one transport</div>
            </div>
            <div style={{flex: 1, display: 'flex', alignItems: 'center', gap: 14}}>
              <div className="transport-bar">
                <div className="progress" style={{width: `${pct}%`}}></div>
              </div>
            </div>
            <div className="transport-time">{playing ? `0:${String(Math.floor(currentStep / 16 * 32)).padStart(2,'0')}` : '0:00'} / 0:32</div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ===========================================================
//  TOP-LEVEL APP
// ===========================================================
function App() {
  const [selectedMood, setSelectedMood] = useState('latenight');
  const [bpm, setBpm] = useState(76);
  const [vibeCompleted, setVibeCompleted] = useState({ tempo: false });

  const [pattern, setPattern] = useState(STARTER_PATTERN.map(r => r.slice()));
  const [drumPlaying, setDrumPlaying] = useState(false);

  const [progIdx, setProgIdx] = useState(0);
  const [chordsPlaying, setChordsPlaying] = useState(false);

  const [melody, setMelody] = useState(DEFAULT_MELODY.map(r => r.slice()));
  const [melodyPlaying, setMelodyPlaying] = useState(false);

  const [bassPlaying, setBassPlaying] = useState(false);
  const [dustyPlaying, setDustyPlaying] = useState(false);
  const [atmosPlaying, setAtmosPlaying] = useState(false);
  const [atmosLayers, setAtmosLayers] = useState({ rain: true, cafe: false, crackle: false, hiss: false });

  const [assemblyPlaying, setAssemblyPlaying] = useState(false);

  // ===== Audio-engine wiring =====

  // Push static data (chord progressions, melody-row pitches) once.
  useEffect(() => {
    AE.setProgs(PROGS);
    AE.setMelody(DEFAULT_MELODY, MELODY_PITCHES);
  }, []);

  // Init AE on first user gesture so Tone.start() can unlock the audio context.
  useEffect(() => {
    const tryInit = () => AE.init().catch(() => {});
    window.addEventListener('mousedown',  tryInit, { once: true });
    window.addEventListener('keydown',    tryInit, { once: true });
    window.addEventListener('touchstart', tryInit, { once: true });
    return () => {
      window.removeEventListener('mousedown',  tryInit);
      window.removeEventListener('keydown',    tryInit);
      window.removeEventListener('touchstart', tryInit);
    };
  }, []);

  // Defensive: any play flag flipping on also kicks init.
  useEffect(() => {
    if (drumPlaying || chordsPlaying || melodyPlaying || bassPlaying ||
        assemblyPlaying || atmosPlaying || dustyPlaying) {
      AE.init().catch(() => {});
    }
  }, [drumPlaying, chordsPlaying, melodyPlaying, bassPlaying,
      assemblyPlaying, atmosPlaying, dustyPlaying]);

  // Push state to the engine on every change.
  useEffect(() => { AE.setBpm(bpm); }, [bpm]);
  useEffect(() => { AE.setDrumPattern(pattern); }, [pattern]);
  useEffect(() => { AE.setProgIdx(progIdx); }, [progIdx]);
  useEffect(() => { AE.setMelody(melody, MELODY_PITCHES); }, [melody]);
  useEffect(() => { AE.setStem('drums',  drumPlaying); },    [drumPlaying]);
  useEffect(() => { AE.setStem('chords', chordsPlaying); },  [chordsPlaying]);
  useEffect(() => { AE.setStem('melody', melodyPlaying); },  [melodyPlaying]);
  useEffect(() => { AE.setStem('bass',   bassPlaying); },    [bassPlaying]);
  useEffect(() => { AE.setStem('master', assemblyPlaying); }, [assemblyPlaying]);
  useEffect(() => { AE.setAtmos(atmosLayers, atmosPlaying); }, [atmosLayers, atmosPlaying]);

  // Visual playhead — driven by the engine's per-step subscriber.
  const [rawStep, setRawStep] = useState(-1);
  useEffect(() => {
    const anyPlaying = drumPlaying || chordsPlaying || melodyPlaying ||
                       bassPlaying || assemblyPlaying;
    if (!anyPlaying) { setRawStep(-1); return; }
    return AE.subscribe(s => setRawStep(s));
  }, [drumPlaying, chordsPlaying, melodyPlaying, bassPlaying, assemblyPlaying]);

  const drumStep     = (drumPlaying   || assemblyPlaying) ? rawStep : -1;
  const melodyStep   = (melodyPlaying || assemblyPlaying) ? rawStep : -1;
  const assemblyStep = assemblyPlaying ? rawStep : -1;

  return (
    <React.Fragment>
      <CustomCursor />
      <Topnav />

      <main>
        {/* HERO */}
        <section className="spread hero" data-screen-label="01 Hero">
          <HeroBackground />
          <div className="page">
            <div className="hero-grid">
              <div className="hero-title">
                <h1>
                  Make your<br/>
                  first lo-fi <em className="swash">beat.</em>
                </h1>
                <p className="lede">Four small steps. No theory required. By the end you'll have a chilled, sleepy beat that sounds like the ones you study to <span className="highlight-mustard">— and it'll be yours.</span></p>
                <div className="hero-tags">
                  <span className="tag filled">A four-step scaffold</span>
                  <span className="tag">2–3 lessons</span>
                  <span className="tag">Made in BandLab</span>
                  <span className="tag">No theory</span>
                </div>
                <div className="hero-byline">
                  <strong>Made by Kevin Li</strong>
                </div>
              </div>

              <HeroDemo />
            </div>

            <div className="ribbon-intro">
              <span className="eyebrow"><span className="dot"></span>The seven steps</span>
              <p>These are the steps. <strong>Click any one to jump to it.</strong></p>
            </div>
            <StepRibbon />
          </div>
        </section>

        {/* WHAT IS LO-FI */}
        <section className="spread field-guide" id="whatis" data-screen-label="02 What is lo-fi">
          <span className="folio">Field Guide · 02/06</span>
          <div className="page">
            <div className="fg-intro">
              <div>
                <span className="eyebrow"><span className="dot"></span>Field guide · part one</span>
                <h2 style={{margin: '14px 0 18px'}}>What even <em><span className="underline-hand">is</span></em> lo-fi?</h2>
                <p className="dropcap" style={{fontSize: '1.05rem'}}>
                  Lo-fi hip-hop is the music you've heard a million times on YouTube study streams — slow, dusty drums with jazzy piano chords and a cosy little melody. The genre grew out of the beats producer <strong>J Dilla</strong> made in the late 1990s, and was made global by Japanese producer <strong>Nujabes</strong> and the "Lofi Girl" radio stream that's been running 24/7 since 2017.
                </p>

                <div className="gutter-rule double" style={{marginTop: 36}}></div>

                <div className="grid-2" style={{marginTop: 28}}>
                  <div>
                    <h4>The recipe</h4>
                    <p style={{margin: '8px 0 0'}}>Slow tempo (around <strong>75 BPM</strong>) · "lazy" swung drums · jazz chords with 7ths · a sparse melody that leaves heaps of space · and a "dusty" sound, like it was recorded onto an old tape.</p>
                  </div>
                  <div>
                    <h4>Why it's good for learning</h4>
                    <p style={{margin: '8px 0 0'}}>It's <em>forgiving</em>. The whole point is that it sounds slightly imperfect. Whatever you make is going to fit the genre — there's no "wrong note" police.</p>
                  </div>
                </div>
              </div>

              <aside className="marginalia fg-aside">
                <span className="num">№1 — Listen first</span>
                Before you make anything, listen for 5 minutes. Listen for <strong>what stays the same</strong> across the songs (the recipe) and <strong>what changes</strong> (the personality).
                <br/><br/>
                <span className="num">№2 — Lineage</span>
                J Dilla → Nujabes → Lofi Girl. The whole genre sits on three pillars.
              </aside>
            </div>

            <div style={{marginTop: 56}}>
              <div style={{display: 'flex', alignItems: 'baseline', gap: 14, marginBottom: 18}}>
                <h3>Listen first</h3>
                <span className="mono" style={{fontSize: '0.72rem', letterSpacing: '0.16em', textTransform: 'uppercase'}}>· 4 reference tracks · ~12 min</span>
              </div>
              <div className="ref-grid">
                <div className="ref">
                  <span className="num">REF · 01</span>
                  <span className="artist">Nujabes</span>
                  <span className="track">"Feather"</span>
                  <div className="ref-embed">
                    <iframe
                      src="https://www.youtube-nocookie.com/embed/hQ5x8pHoIPA?controls=0&modestbranding=1&rel=0&iv_load_policy=3&playsinline=1"
                      title="Nujabes — Feather"
                      loading="lazy"
                      allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    ></iframe>
                  </div>
                  <span className="why">The OG lo-fi blueprint. Notice the soft piano chords and the lazy drums.</span>
                  <span className="yr"><span>2005</span><span>Modal Soul</span></span>
                </div>
                <div className="ref">
                  <span className="num">REF · 02</span>
                  <span className="artist">J Dilla</span>
                  <span className="track">"Time: The Donut of the Heart"</span>
                  <div className="ref-embed">
                    <iframe
                      src="https://www.youtube-nocookie.com/embed/0vmhgotEByc?controls=0&modestbranding=1&rel=0&iv_load_policy=3&playsinline=1"
                      title="J Dilla — Time: The Donut of the Heart"
                      loading="lazy"
                      allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    ></iframe>
                  </div>
                  <span className="why">Listen to how the drums feel a tiny bit "wrong" in time. That's <em>swing</em>, on purpose.</span>
                  <span className="yr"><span>2006</span><span>Donuts</span></span>
                </div>
                <div className="ref">
                  <span className="num">REF · 03</span>
                  <span className="artist">Lofi Girl radio</span>
                  <span className="track">"lofi hip hop · beats to relax/study to"</span>
                  <div className="ref-embed">
                    <iframe
                      src="https://www.youtube-nocookie.com/embed/jfKfPfyJRdk?controls=0&modestbranding=1&rel=0&iv_load_policy=3&playsinline=1"
                      title="Lofi Girl — lofi hip hop radio"
                      loading="lazy"
                      allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    ></iframe>
                  </div>
                  <span className="why">Just leave this on in the background. Dozens of lo-fi tracks back-to-back.</span>
                  <span className="yr"><span>2017–</span><span>YouTube</span></span>
                </div>
                <div className="ref">
                  <span className="num">REF · 04</span>
                  <span className="artist">Idealism</span>
                  <span className="track">"Mac DeMarco"</span>
                  <div className="ref-embed">
                    <iframe
                      src="https://www.youtube-nocookie.com/embed/kAYa4JLUNfE?controls=0&modestbranding=1&rel=0&iv_load_policy=3&playsinline=1"
                      title="Idealism — Best Of (lofi hip hop mix)"
                      loading="lazy"
                      allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    ></iframe>
                  </div>
                  <span className="why">A modern lo-fi staple — same recipe, very different mood.</span>
                  <span className="yr"><span>2018</span><span>SoundCloud</span></span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* THE FOUR STEPS */}
        <section className="spread tone-mustard" data-screen-label="03 The seven steps">
          <div className="blob b1" style={{background: 'var(--mustard)'}}></div>
          <span className="folio">The Seven Steps · 03/06</span>
          <div className="page">
            <span className="eyebrow"><span className="dot"></span>Activity · the workshop</span>
            <h2 style={{margin: '14px 0 14px', maxWidth: 760}}>Seven moves. <em style={{color: 'var(--rose-deep)', fontWeight: 300}}>That's the whole song.</em></h2>
            <p className="lede" style={{maxWidth: 640, marginBottom: 0}}>Four core moves get you a complete loop. Three more give it character: <strong>bass</strong>, <strong>dust</strong>, and <strong>atmosphere</strong>. Every step has a working widget here, then a translation to BandLab.</p>

            <div style={{display: 'flex', flexDirection: 'column', gap: 80, marginTop: 60}}>
              <VibeStep
                selectedMood={selectedMood} setSelectedMood={setSelectedMood}
                bpm={bpm} setBpm={setBpm}
                completed={vibeCompleted} setCompleted={setVibeCompleted}
              />
              <ChordsStep
                progIdx={progIdx} setProgIdx={setProgIdx}
                playing={chordsPlaying} setPlaying={setChordsPlaying}
              />
              <DrumStep
                pattern={pattern} setPattern={setPattern}
                bpm={bpm} setBpm={setBpm}
                playing={drumPlaying} setPlaying={setDrumPlaying}
                currentStep={drumStep}
              />
              <MelodyStep
                melody={melody} setMelody={setMelody}
                playing={melodyPlaying} setPlaying={setMelodyPlaying}
                currentStep={melodyStep}
              />
              <BassStep
                progIdx={progIdx}
                playing={bassPlaying} setPlaying={setBassPlaying}
              />
              <DustyStep
                playing={dustyPlaying} setPlaying={setDustyPlaying}
              />
              <AtmosStep
                playing={atmosPlaying} setPlaying={setAtmosPlaying}
                layers={atmosLayers} setLayers={setAtmosLayers}
              />
            </div>
          </div>
        </section>

        {/* ASSEMBLY */}
        <Assembly
          pattern={pattern}
          progIdx={progIdx}
          melody={melody}
          mood={selectedMood}
          bpm={bpm}
          playing={assemblyPlaying} setPlaying={setAssemblyPlaying}
          currentStep={assemblyStep}
          atmosLayers={atmosLayers}
        />

        {/* EXTEND */}
        <section className="spread tone-plum" id="extend" data-screen-label="06 Extend">
          <div className="blob b3" style={{background: 'var(--plum)'}}></div>
          <span className="folio">Now make it yours · 06/06</span>
          <div className="page">
            <span className="eyebrow"><span className="dot"></span>Extension · go further</span>
            <h2 style={{margin: '14px 0 14px'}}>Now make it <em><span className="underline-hand">yours</span></em>.</h2>
            <p className="lede" style={{maxWidth: 640, marginBottom: 36}}>You have a beat, chords, melody, bass, dust, and atmosphere — that's a complete lo-fi track. Stop here if you want; you've made a piece of music. Or pick one of these.</p>

            <div className="ext-grid">
              <div className="ext-card">
                <span className="num">i.</span>
                <h4>Make it longer</h4>
                <p>Copy your loop 4 times. In one of the copies, <strong>remove the drums</strong> for 4 bars (chords + melody only). That's a "drop" — it gives your track shape.</p>
              </div>
              <div className="ext-card">
                <span className="num">ii.</span>
                <h4>Add a sample</h4>
                <p>Find a short vocal chop, jazz piano lick, or saxophone phrase from BandLab's loop library. Drop it once every 4 bars as an accent.</p>
              </div>
              <div className="ext-card">
                <span className="num">iii.</span>
                <h4>Sidechain the bass</h4>
                <p>Make the bass duck slightly every time the kick hits. It's how the drums and bass share the same low frequencies without fighting each other.</p>
              </div>
              <div className="ext-card">
                <span className="num">iv.</span>
                <h4>Share it</h4>
                <p>Export from BandLab as MP3. Post it to the class channel. Listen to a friend's. Try to identify which step they tweaked differently.</p>
              </div>
            </div>
          </div>
        </section>

        {/* TEACHER NOTES */}
        <section className="spread" id="teacher" data-screen-label="07 Teacher notes">
          <span className="folio">Teacher notes · A1</span>
          <div className="page">
            <details className="teacher" open={false}>
              <summary>
                <span>
                  <span className="sub" style={{display: 'block', marginBottom: 6}}>Appendix · for the marker</span>
                  Teacher notes &amp; rationale
                </span>
                <span className="marker"></span>
              </summary>
              <div className="body">
                <p>A short rationale on the pedagogical decisions behind this resource.</p>

                <div className="meta-grid">
                  <div className="meta"><div className="k">Stage</div><div className="v">Stage 4 · Yrs 7–8</div></div>
                  <div className="meta"><div className="k">Compositional model</div><div className="v">Lo-fi hip-hop</div></div>
                  <div className="meta"><div className="k">Lineage</div><div className="v">Dilla → Nujabes → Lofi Girl</div></div>
                  <div className="meta"><div className="k">Tools</div><div className="v">BandLab + this site</div></div>
                  <div className="meta"><div className="k">Time</div><div className="v">2–3 lessons (60 min)</div></div>
                  <div className="meta"><div className="k">Differentiation</div><div className="v">Low floor, high ceiling</div></div>
                </div>

                <h3>The compositional model</h3>
                <p>Lo-fi hip-hop is the chosen model because it is (a) familiar to the target Stage 4 cohort through YouTube study streams and TikTok, (b) genuinely <em>simple</em> at its core — short chord loops, a 1-bar drum pattern, and a sparse melody — and (c) deeply <em>forgiving</em> at the production level. The genre's aesthetic embraces "imperfect" sounds, swung rhythms, dropped notes, and tape hiss, so beginner-level decisions read as stylistically appropriate rather than as mistakes. This last point removes the "wrong note" anxiety Humberstone (2015) identifies as a barrier to engaging with composition.</p>

                <h3>The four-step scaffold</h3>
                <p>The four steps move from <em>creative decision</em> → <em>rhythm</em> → <em>harmony</em> → <em>melody</em>. This sequence follows the actual production order most lo-fi producers use (drums first, then chords, then topline) and lets each step have a clear, completable outcome that builds directly on the last. By the end of Step 2 students have a playable beat. By the end of Step 3 they have beat + chords. By Step 4 they have a complete loop.</p>

                <h3>Differentiation: low floor, high ceiling</h3>
                <ul>
                  <li><strong>Step 2:</strong> the <em>"Starter"</em> button gives students who can't yet design a drum pattern a working one to modify.</li>
                  <li><strong>Step 3:</strong> four pre-made progressions so students who can't yet voice jazz chords still get to make a harmonic choice.</li>
                  <li><strong>Step 4:</strong> the safe-note pad reduces the choice space from 12 notes to 5, guaranteeing every selection sounds good.</li>
                  <li><strong>Extension cards:</strong> bassline, "drop" structure, sound design — extending Pass-level activity into Distinction-level work.</li>
                </ul>

                <h3>NESA Music Yrs 7–10 syllabus links</h3>
                <ul>
                  <li><strong>4.4</strong> demonstrates an understanding of musical concepts through exploring, experimenting, improvising, organising, arranging and composing.</li>
                  <li><strong>4.5</strong> notates compositions using traditional and/or non-traditional notation.</li>
                  <li><strong>4.6</strong> experiments with different forms of technology in the composition process.</li>
                  <li><strong>4.7</strong> demonstrates understanding through listening, observing, responding, discriminating, analysing.</li>
                  <li><strong>4.10</strong> identifies the use of technology in the music selected for study.</li>
                  <li><strong>4.12</strong> demonstrates a developing confidence and willingness to engage in performance, composition, listening and discussion.</li>
                </ul>

                <ul className="refs">
                  <li>Humberstone, J. H. B. (2015). Defining creativity for a more pluralist approach to music education. <em>ASME XXth National Conference 2015</em>, 56–63.</li>
                  <li>Humberstone, J. H. B. (2017). A Pluralist Approach to Music Education. In <em>The Oxford Handbook of Technology and Music Education</em> (pp. 421–430). Oxford University Press.</li>
                  <li>Humberstone, J. H. B. (2023). Battle Dances and 808s: Teaching music creation in Australia. <em>The Routledge Companion to Teaching Music Composition in Schools</em> (pp. 9–25).</li>
                  <li>NSW Education Standards Authority. (2003, amended 2018). <em>Music Years 7–10 Syllabus</em>. NESA.</li>
                </ul>
              </div>
            </details>
          </div>
        </section>
      </main>

      <Footer />
    </React.Fragment>
  );
}

function StepRibbon() {
  return (
    <div className="step-ribbon">
      <a className="pill" href="#step1">
        <div className="num">i</div>
        <div>
          <div className="name">Vibe</div>
          <div className="desc">Mood · Tempo</div>
        </div>
      </a>
      <a className="pill" href="#step2">
        <div className="num">ii</div>
        <div>
          <div className="name">Chords</div>
          <div className="desc">Jazz 7ths</div>
        </div>
      </a>
      <a className="pill" href="#step3">
        <div className="num">iii</div>
        <div>
          <div className="name">Beat</div>
          <div className="desc">Drums · 16 steps</div>
        </div>
      </a>
      <a className="pill" href="#step4">
        <div className="num">iv</div>
        <div>
          <div className="name">Melody</div>
          <div className="desc">Pentatonic</div>
        </div>
      </a>
      <a className="pill" href="#step5">
        <div className="num">v</div>
        <div>
          <div className="name">Bass</div>
          <div className="desc">One note</div>
        </div>
      </a>
      <a className="pill" href="#step6">
        <div className="num">vi</div>
        <div>
          <div className="name">Dusty</div>
          <div className="desc">Tape · Vinyl</div>
        </div>
      </a>
      <a className="pill" href="#step7">
        <div className="num">vii</div>
        <div>
          <div className="name">Atmos</div>
          <div className="desc">Rain · Café</div>
        </div>
      </a>
    </div>
  );
}

function Topnav() {
  return (
    <nav className="topnav" aria-label="Section navigation">
      <div className="topnav-inner">
        <a className="brand" href="#top">
          <span className="brand-mark"></span>
          Lo-Fi Baby Steps
        </a>
        <ul className="steps-nav">
          <li><a href="#whatis"><span className="nav-num">§</span><span className="nav-label">Field Guide</span></a></li>
          <li><a href="#step1"><span className="nav-num">01</span><span className="nav-label">Vibe</span></a></li>
          <li><a href="#step2"><span className="nav-num">02</span><span className="nav-label">Chords</span></a></li>
          <li><a href="#step3"><span className="nav-num">03</span><span className="nav-label">Beat</span></a></li>
          <li><a href="#step4"><span className="nav-num">04</span><span className="nav-label">Melody</span></a></li>
          <li><a href="#step5"><span className="nav-num">05</span><span className="nav-label">Bass</span></a></li>
          <li><a href="#step6"><span className="nav-num">06</span><span className="nav-label">Dusty</span></a></li>
          <li><a href="#step7"><span className="nav-num">07</span><span className="nav-label">Atmos</span></a></li>
          <li><a href="#assemble"><span className="nav-num">∞</span><span className="nav-label">Mix</span></a></li>
          <li><a href="#teacher"><span className="nav-num">★</span><span className="nav-label">Notes</span></a></li>
        </ul>
        <div className="nav-meta">
          Made by Kevin Li
        </div>
      </div>
    </nav>
  );
}

function Footer() {
  return (
    <footer className="colophon">
      <div className="page">
        <div className="big">Now go make<br/><em>your version</em>.</div>
        <div className="row">
          <div>
            <h5>Colophon</h5>
            <p>Set in <strong>Fraunces</strong> (display) and <strong>Inter</strong> (body), with <strong>JetBrains Mono</strong> for technical labels.</p>
            <p>Audio engine — Tone.js. Source code on GitHub. Designed and written by Kevin Li, 2026.</p>
            <div className="credit">© 2026 KEVIN LI · ALL RIGHTS RESERVED</div>
          </div>
          <div>
            <h5>Sections</h5>
            <p style={{lineHeight: 2}}>
              <a href="#whatis" style={{color: 'var(--ink-2)', display: 'block'}}>Field guide</a>
              <a href="#step1" style={{color: 'var(--ink-2)', display: 'block'}}>01 · Vibe</a>
              <a href="#step2" style={{color: 'var(--ink-2)', display: 'block'}}>02 · Chords</a>
              <a href="#step3" style={{color: 'var(--ink-2)', display: 'block'}}>03 · Beat</a>
              <a href="#step4" style={{color: 'var(--ink-2)', display: 'block'}}>04 · Melody</a>
            </p>
          </div>
          <div>
            <h5>Tools</h5>
            <p style={{lineHeight: 2}}>
              <span style={{display: 'block'}}>BandLab — DAW</span>
              <span style={{display: 'block'}}>Tone.js — synthesis</span>
              <span style={{display: 'block'}}>Web MIDI export</span>
            </p>
          </div>
          <div>
            <h5>Listen further</h5>
            <p style={{lineHeight: 2}}>
              <span style={{display: 'block'}}>J Dilla — Donuts</span>
              <span style={{display: 'block'}}>Nujabes — Modal Soul</span>
              <span style={{display: 'block'}}>Lofi Girl radio</span>
              <span style={{display: 'block'}}>Idealism</span>
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
