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
// Acts as a preview of the page's audio: clicking play toggles the master
// mix (the same transport the global player drives), so what you hear here
// is whatever the steps below currently produce.
function HeroDemo({ playing, onToggle }) {
  const [time, setTime] = useState(0);

  // Visual playhead — RAF-driven, decorative 32-second loop. The actual
  // audio loops on its own schedule down in the assembly engine.
  useEffect(() => {
    if (!playing) { setTime(0); return; }
    let raf;
    const t0 = performance.now();
    const tick = (t) => {
      setTime(((t - t0) / 1000) % 32);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing]);

  const togglePlay = () => {
    AE.init().catch(() => {});
    onToggle();
  };

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
          onClick={togglePlay}
          aria-label={playing ? 'Pause demo' : 'Play demo'}
          aria-pressed={playing}
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
//  GLOBAL PLAYER PILL
// ===========================================================
// Floating, always-visible transport for the user's track. Toggles the
// master (assembly) stem so play/stop works from anywhere on the page.
function GlobalPlayer({ playing, onToggle, selectedMood, bpm }) {
  const mood = MOODS.find(m => m.id === selectedMood) || MOODS[0];
  const [muted, setMuted] = useState(false);

  useEffect(() => {
    if (window.Tone && window.Tone.Destination) {
      window.Tone.Destination.mute = muted;
    }
  }, [muted]);

  const onClick = () => {
    AE.init().catch(() => {});
    onToggle();
  };

  return (
    <div className="global-player" role="region" aria-label="Your track">
      <button
        className={`gp-play ${playing ? 'playing' : ''}`}
        onClick={onClick}
        aria-label={playing ? 'Stop your track' : 'Play your track'}
      >
        {playing
          ? <span className="gp-stop" aria-hidden="true"></span>
          : <span className="gp-tri" aria-hidden="true"></span>}
      </button>

      <div className="gp-meta">
        <span className="gp-status">
          <span className={`gp-status-dot ${playing ? 'live' : ''}`}></span>
          {playing ? 'PLAYING' : 'PAUSED'}
        </span>
        <span className="gp-title">
          Your {mood.name}
          <span className="gp-sep"> · </span>
          <span className="gp-sub">{bpm} BPM · {mood.key}</span>
        </span>
      </div>

      <button
        className={`gp-vol ${muted ? 'muted' : ''}`}
        onClick={() => setMuted(m => !m)}
        aria-label={muted ? 'Unmute' : 'Mute'}
      >
        {muted ? (
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M11 5L6 9H2v6h4l5 4z" fill="currentColor" stroke="none"/>
            <line x1="22" y1="9" x2="16" y2="15"/>
            <line x1="16" y1="9" x2="22" y2="15"/>
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M11 5L6 9H2v6h4l5 4z" fill="currentColor" stroke="none"/>
            <path d="M15.5 8.5a5 5 0 0 1 0 7"/>
            <path d="M18.5 5.5a9 9 0 0 1 0 13"/>
          </svg>
        )}
      </button>
    </div>
  );
}

// ===========================================================
//  STEP 1 — VIBE
// ===========================================================
// Ordered slow→fast on purpose: tempo is the lesson here. BPM + key from
// songbpm.com / tunebat.com. youtubeId is the bit after v= — swap if a
// video gets pulled.
const MOODS = [
  { id: 'rainy',     name: 'Rainy Window',     desc: 'Drowsy, melancholy',    bpm: 72, key: 'C# maj', illus: 'rainy',
    youtubeId: 'BwIjst2UDQY', track: 'again',     artist: 'tomppabeats' },
  { id: 'latenight', name: 'Late Night Drive', desc: 'Smooth, contemplative', bpm: 79, key: 'E min',  illus: 'moon',
    youtubeId: '4jit_SPagrI', track: 'Lavender',  artist: 'Kupla' },
  { id: 'study',     name: 'Study Session',    desc: 'Focused, steady',       bpm: 84, key: 'C# maj', illus: 'study',
    youtubeId: '2xxH0XE1yzI', track: 'Affection', artist: 'Jinsang' },
  { id: 'sunday',    name: 'Sunday Morning',   desc: 'Warm, energetic',       bpm: 90, key: 'C min',  illus: 'sun',
    youtubeId: 'WI7LU95C6FU', track: 'Warm',     artist: 'Joey Pecoraro' },
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
        <h4 style={{marginBottom: 4}}>Set Your Tempo</h4>
        <div className="duration">
          <div><b>~10 min</b>Tempo + vibe</div>
          <div><b>Pre-music</b>Decision before sound</div>
        </div>
        <ul className="checklist">
          <li className={selectedMood ? 'done' : ''}>Hear the tempo range</li>
          <li className={completed.tempo ? 'done' : ''}>Lock in your BPM</li>
        </ul>
      </aside>

      <div className="step-body">
        <span className="eyebrow">Step 01<span className="dot"></span>Tempo</span>
        <h2>Decide how <em><span className="underline-hand">fast</span></em> your beat moves.</h2>
        <p className="lede">Before you touch a single drum, pick a tempo. In lo-fi, BPM <em>is</em> the mood — slow it down for sleepy and melancholic, speed it up for warm and energetic. Same chords, same drums, totally different feeling.</p>

        <h4 style={{marginBottom: 6}}>Pick a mood — hear the tempo do the work</h4>
        <p style={{maxWidth: 640, marginTop: 0, marginBottom: 14, color: 'var(--ink-2)'}}>Same genre, four real lo-fi tracks, slowest to fastest. Click each one and listen — your ear will tell you what 18 BPM of difference actually feels like.</p>
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
              <h5>{playingMood ? playingMood.track : 'Pick a tempo, hear a real track'}</h5>
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
                <p>Each tile is a real lo-fi track at a different tempo, slowest to fastest. Click one and hear how BPM changes the feel.</p>
              </div>
            )}
          </div>
        </div>

        <div className="callout-row">
          <div className="callout tip">
            <strong className="kicker"><span className="marker"></span>Why this matters</strong>
            <span className="body-title">Tempo <em>is</em> the mood.</span>
            <p>Listen to <strong>"again"</strong> at <strong>72 BPM</strong> then jump to <strong>"Warm"</strong> at <strong>90 BPM</strong> — same genre, completely different feel. That's an 18-BPM swing doing all the work.</p>
          </div>
          <div className="callout fallback">
            <strong className="kicker"><span className="marker"></span>Stuck?</strong>
            <span className="body-title">Pick <strong>Study Session</strong>.</span>
            <p>It's the most "classic" lo-fi sound — the steady 84-BPM pocket you've heard on every "beats to study to" playlist. You can't go wrong.</p>
          </div>
        </div>

        <h4 style={{marginTop: 36, marginBottom: 14}}>Lock in your BPM</h4>
        <p style={{maxWidth: 640, marginBottom: 0, color: 'var(--ink-2)'}}>The four tracks above span <strong>72–90 BPM</strong> — that's the lo-fi window. Picking a mood already set your tempo; nudge the slider if you want it sleepier or more awake. The metronome ticks so you can <em>feel</em> what each BPM actually sounds like.</p>

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
                animationDuration: `${60 / bpm}s`
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
  { id: 'hat',   label: 'Hi-Hat',short: 'HH', patternIndex: 2 },
  { id: 'snare', label: 'Snare', short: 'SD', patternIndex: 1 },
  { id: 'kick',  label: 'Kick',  short: 'BD', patternIndex: 0 },
];
const STARTER_PATTERN = [
  [1,0,0,0, 0,0,0,0, 0,0,1,0, 0,0,0,0],
  [0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,0],
  [1,0,1,0, 1,0,1,0, 1,0,1,0, 1,0,1,0],
];

const DRUM_PRESETS = [
  {
    id: 'boombap',
    name: 'Boom-Bap',
    desc: 'The classic. Kick on 1, kick on the "&" before 4.',
    pattern: [
      [1,0,0,0, 0,0,0,0, 0,0,1,0, 0,0,0,0],
      [0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,0],
      [1,0,1,0, 1,0,1,0, 1,0,1,0, 1,0,1,0],
    ],
  },
  {
    id: 'trap',
    name: 'Trap Hats',
    desc: 'Busy semiquaver hats, syncopated kicks. Modern feel.',
    pattern: [
      [1,0,0,0, 0,0,0,1, 0,0,1,0, 0,0,0,0],
      [0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,0],
      [1,1,1,1, 1,1,1,1, 1,1,1,1, 1,1,1,1],
    ],
  },
  {
    id: 'break',
    name: 'Breakbeat',
    desc: 'Extra snares on the "e" of 3 and "a" of 4. Funky, off-kilter.',
    pattern: [
      [1,0,0,1, 0,0,0,0, 0,0,1,0, 0,0,0,0],
      [0,0,0,0, 1,0,0,0, 0,1,0,0, 1,0,0,1],
      [1,0,1,0, 1,0,1,0, 1,0,1,0, 1,0,1,0],
    ],
  },
  {
    id: 'lazy',
    name: 'Lazy',
    desc: 'Sparse. Late kick on the "a" of 3 — drags behind.',
    pattern: [
      [1,0,0,0, 0,0,0,0, 0,0,0,1, 0,0,0,0],
      [0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,0],
      [1,0,1,0, 1,0,1,0, 1,0,1,0, 1,0,1,0],
    ],
  },
];

function DrumStep({ pattern, setPattern, bpm, setBpm, swing, setSwing, playing, setPlaying, currentStep }) {
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

  // Engine sends a 0..63 step; the drum grid only knows 0..15.
  const localStep = currentStep >= 0 ? currentStep % 16 : -1;
  useEffect(() => {
    if (!playing || localStep < 0) return;
    pattern.forEach((row, r) => {
      if (row[localStep]) fireSpark(r, localStep);
    });
  }, [localStep, playing]);

  const toggle = (r, s) => {
    const next = pattern.map(row => row.slice());
    const turningOn = !next[r][s];
    next[r][s] = turningOn ? 1 : 0;
    setPattern(next);
    if (turningOn) {
      const id = r === 0 ? 'kick' : r === 1 ? 'snare' : 'hat';
      AE.previewDrum(id);
    }
  };

  const clear = () => setPattern(DRUM_ROWS.map(() => Array(16).fill(0)));
  const loadPreset = (p) => setPattern(p.pattern.map(r => r.slice()));

  const activePresetId = (() => {
    const stringify = (pat) => pat.map(r => r.join('')).join('|');
    const cur = stringify(pattern);
    const m = DRUM_PRESETS.find(p => stringify(p.pattern) === cur);
    return m ? m.id : null;
  })();

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
        <p className="lede">A lo-fi drum pattern is just three sounds: <strong>kick</strong> (the boom), <strong>snare</strong> (the smack), <strong>hi-hat</strong> (the tick). Sixteen semiquavers across one bar. Click cells. Hit play.</p>

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
              {DRUM_ROWS.map((row) => {
                const pi = row.patternIndex;
                return (
                <React.Fragment key={row.id}>
                  <div className="row-label">
                    {row.label}
                    <span className="key">{row.short}</span>
                  </div>
                  {Array.from({length: 16}).map((_, s) => (
                    <button
                      key={s}
                      data-r={pi} data-s={s}
                      className={`drum-cell ${row.id} ${pattern[pi][s] ? 'on' : ''} ${s % 4 === 0 ? 'beat-mark' : ''} ${localStep === s && playing ? 'playhead' : ''} ${localStep === s && pattern[pi][s] && playing ? 'fired' : ''}`}
                      onClick={() => toggle(pi, s)}
                      aria-label={`${row.label} step ${s+1}`}
                    ></button>
                  ))}
                </React.Fragment>
                );
              })}
            </div>
          </div>
        </div>

        <div className="preset-box">
          <div className="preset-box-head">
            <strong className="kicker"><span className="marker"></span>Presets</strong>
            <span className="body-title">Four starting points — click one, then make it yours.</span>
          </div>
          <div className="preset-chips">
            {DRUM_PRESETS.map(p => (
              <button
                key={p.id}
                className={`preset-chip ${activePresetId === p.id ? 'active' : ''}`}
                onClick={() => loadPreset(p)}
                title={p.desc}
              >
                <span className="preset-name">{p.name}</span>
                <span className="preset-desc">{p.desc}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="swing-panel">
          <div className="swing-head">
            <div>
              <strong className="kicker"><span className="marker"></span>Swing</strong>
              <span className="body-title">The "drunk" feel that makes lo-fi <em>lo-fi</em>.</span>
            </div>
            <div className="swing-readout">
              <span className="val">{Math.round(swing * 100)}%</span>
              <span className="feel">{swing < 0.05 ? 'Straight' : swing < 0.25 ? 'Subtle' : swing < 0.55 ? 'Lo-fi pocket' : 'Heavy shuffle'}</span>
            </div>
          </div>
          <p>Without swing, every semiquaver is evenly spaced — robotic, like a metronome. Swing <strong>delays every other semiquaver</strong> (the "e"s and "a"s), nudging the in-between hits later so the groove leans and breathes. Most lo-fi sits around <strong>20–40%</strong>; that lazy, behind-the-beat feel is exactly what your favorite "beats to study to" tracks use.</p>
          <div className="swing-slider">
            <span className="end-label">Straight</span>
            <input
              type="range"
              min="0" max="75" step="1"
              value={Math.round(swing * 100)}
              onChange={(e) => setSwing(parseInt(e.target.value, 10) / 100)}
              aria-label="Swing amount"
            />
            <span className="end-label">Heavy</span>
          </div>
          <p className="swing-prompt"><strong>Try it:</strong> load the <strong>Trap Hats</strong> preset, hit ▶ Play, then drag the slider from 0% up to ~50% and back. Those busy semiquaver hats turn the swing into a stutter you can't miss — every "e" and "a" hat lands late while the downbeats stay put.</p>
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

// ===========================================================
//  MIDI EXPORT — minimal Standard MIDI File (format 1) writer
// ===========================================================
// 480 ticks per quarter → 1920 per bar, 480 per crotchet, 240 per quaver,
// 120 per semiquaver. All stems share these constants so they stay aligned
// when imported into the same BandLab project.
const MIDI_PPQ = 480;
const TICKS_BAR = MIDI_PPQ * 4;
const TICKS_QUAVER = MIDI_PPQ / 2;
const TICKS_SIXTEENTH = MIDI_PPQ / 4;

function vlq(n) {
  // Variable-length quantity used by SMF for delta-times.
  const out = [n & 0x7f];
  n >>= 7;
  while (n > 0) { out.unshift(0x80 | (n & 0x7f)); n >>= 7; }
  return out;
}
function pushU16(arr, n) { arr.push((n >> 8) & 0xff, n & 0xff); }
function pushU32(arr, n) { arr.push((n >>> 24) & 0xff, (n >>> 16) & 0xff, (n >>> 8) & 0xff, n & 0xff); }
function pushStr(arr, s) { for (let i = 0; i < s.length; i++) arr.push(s.charCodeAt(i) & 0xff); }

function metaTrackName(name) {
  const bytes = [];
  for (let i = 0; i < name.length; i++) bytes.push(name.charCodeAt(i) & 0x7f);
  return [0xff, 0x03, ...vlq(bytes.length), ...bytes];
}
function metaTempo(bpm) {
  const usPerQuarter = Math.round(60_000_000 / bpm);
  return [0xff, 0x51, 0x03,
    (usPerQuarter >> 16) & 0xff,
    (usPerQuarter >> 8) & 0xff,
    usPerQuarter & 0xff];
}
function metaTimeSig() { return [0xff, 0x58, 0x04, 4, 2, 24, 8]; }
function metaEnd() { return [0xff, 0x2f, 0x00]; }

// Build a track from an event list of { tick, type:'on'|'off', ch, note, vel }.
// Sort by tick (offs first when tied so 0-length notes don't blow up), then
// emit delta-time + event byte triples.
function buildTrack(events, name) {
  events = events.slice().sort((a, b) => {
    if (a.tick !== b.tick) return a.tick - b.tick;
    if (a.type !== b.type) return a.type === 'off' ? -1 : 1;
    return 0;
  });
  const data = [];
  data.push(...vlq(0), ...metaTrackName(name));
  data.push(...vlq(0), ...metaTimeSig());
  let last = 0;
  for (const ev of events) {
    const dt = ev.tick - last;
    last = ev.tick;
    data.push(...vlq(dt));
    const status = (ev.type === 'on' ? 0x90 : 0x80) | (ev.ch & 0x0f);
    data.push(status, ev.note & 0x7f, ev.vel & 0x7f);
  }
  data.push(...vlq(0), ...metaEnd());
  const out = [];
  pushStr(out, 'MTrk');
  pushU32(out, data.length);
  return out.concat(data);
}
function buildTempoTrack(bpm) {
  const data = [];
  data.push(...vlq(0), ...metaTrackName('Tempo'));
  data.push(...vlq(0), ...metaTempo(bpm));
  data.push(...vlq(0), ...metaTimeSig());
  data.push(...vlq(0), ...metaEnd());
  const out = [];
  pushStr(out, 'MTrk');
  pushU32(out, data.length);
  return out.concat(data);
}
function assembleMidi(trackByteArrays) {
  const out = [];
  pushStr(out, 'MThd');
  pushU32(out, 6);
  pushU16(out, 1);                    // format 1
  pushU16(out, trackByteArrays.length);
  pushU16(out, MIDI_PPQ);
  for (const t of trackByteArrays) for (const b of t) out.push(b & 0xff);
  return new Uint8Array(out);
}

// Stem-specific event builders — each emits 4 bars to match the loop length.
function drumEvents(pattern, ch = 9) {
  // Channel 10 (index 9) is the GM drum channel. Map our 3 rows to GM kit
  // pitches. Tile the 1-bar pattern across 4 bars so the export matches the
  // playable loop length.
  const GM = { kick: 36, snare: 38, hat: 42 };
  const rowToNote = [GM.kick, GM.snare, GM.hat]; // pattern row order: kick, snare, hat
  const evs = [];
  for (let bar = 0; bar < 4; bar++) {
    for (let r = 0; r < 3; r++) {
      const row = pattern[r] || [];
      for (let s = 0; s < 16; s++) {
        if (!row[s]) continue;
        const tick = bar * TICKS_BAR + s * TICKS_SIXTEENTH;
        evs.push({ tick, type: 'on',  ch, note: rowToNote[r], vel: 100 });
        evs.push({ tick: tick + TICKS_SIXTEENTH - 4, type: 'off', ch, note: rowToNote[r], vel: 0 });
      }
    }
  }
  return evs;
}
function chordEvents(chordNotes, ch = 0) {
  // Each bar is one block chord held for the full bar. chordNotes is 4 bars
  // of pitch arrays — fall through if the user emptied a bar.
  const evs = [];
  for (let bar = 0; bar < 4; bar++) {
    const notes = chordNotes[bar] || [];
    if (!notes.length) continue;
    const start = bar * TICKS_BAR;
    const end   = start + TICKS_BAR - 8;
    for (const n of notes) {
      const m = noteToMidi(n);
      evs.push({ tick: start, type: 'on',  ch, note: m, vel: 80 });
      evs.push({ tick: end,   type: 'off', ch, note: m, vel: 0 });
    }
  }
  return evs;
}
function melodyEvents(melody, pitches, ch = 0) {
  // Quaver grid (32 cells × 4 bars). Merge consecutive on cells in the same
  // row into one held note so legato passages export as single notes rather
  // than re-triggering quavers.
  const evs = [];
  for (let r = 0; r < melody.length; r++) {
    const row = melody[r];
    const pitch = pitches[r];
    if (!row || !pitch) continue;
    const note = noteToMidi(pitch);
    let s = 0;
    while (s < row.length) {
      if (!row[s]) { s++; continue; }
      let runEnd = s;
      while (runEnd + 1 < row.length && row[runEnd + 1]) runEnd++;
      const start = s * TICKS_QUAVER;
      const end   = (runEnd + 1) * TICKS_QUAVER - 6;
      evs.push({ tick: start, type: 'on',  ch, note, vel: 92 });
      evs.push({ tick: end,   type: 'off', ch, note, vel: 0 });
      s = runEnd + 1;
    }
  }
  return evs;
}
function bassEvents(bassNotes, ch = 0) {
  // 16-beat piano roll, one cell = one crotchet. Each placed note rings for
  // exactly one bar (a semibreve) — enforced by the UI as one note per bar.
  const evs = [];
  const TICKS_BEAT = TICKS_BAR / 4;
  for (let i = 0; i < 16; i++) {
    const pitch = bassNotes[i];
    if (!pitch) continue;
    const note  = noteToMidi(pitch);
    const start = i * TICKS_BEAT;
    const end   = start + TICKS_BAR - 8;
    evs.push({ tick: start, type: 'on',  ch, note, vel: 105 });
    evs.push({ tick: end,   type: 'off', ch, note, vel: 0 });
  }
  return evs;
}

function downloadMidi(bytes, filename) {
  const blob = new Blob([bytes], { type: 'audio/midi' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click();
  setTimeout(() => { a.remove(); URL.revokeObjectURL(url); }, 200);
}

// One-shot exporters → bytes. Each builds a 2-track SMF: tempo then notes.
function exportDrumsMidi(pattern, bpm) {
  return assembleMidi([buildTempoTrack(bpm), buildTrack(drumEvents(pattern), 'Drums')]);
}
function exportChordsMidi(chordNotes, bpm) {
  return assembleMidi([buildTempoTrack(bpm), buildTrack(chordEvents(chordNotes), 'Chords')]);
}
function exportMelodyMidi(melody, pitches, bpm) {
  return assembleMidi([buildTempoTrack(bpm), buildTrack(melodyEvents(melody, pitches), 'Melody')]);
}
function exportBassMidi(bassNotes, bpm) {
  return assembleMidi([buildTempoTrack(bpm), buildTrack(bassEvents(bassNotes), 'Bass')]);
}
function exportAllMidi({ pattern, chordNotes, melody, melodyPitches, bassNotes, bpm }) {
  return assembleMidi([
    buildTempoTrack(bpm),
    buildTrack(drumEvents(pattern),                       'Drums'),
    buildTrack(chordEvents(chordNotes),                   'Chords'),
    buildTrack(bassEvents(bassNotes),                     'Bass'),
    buildTrack(melodyEvents(melody, melodyPitches),       'Melody'),
  ]);
}

function ChordsStep({ progIdx, setProgIdx, chordNotes, setChordNotes, playing, setPlaying, currentStep, bpm }) {
  // Drive phase + progress + current beat from the engine's 0..63 step so
  // the visuals stay locked to the audio (each chord = one bar = 16 steps;
  // each beat = 4 sixteenths so 16 beats per loop).
  const phase    = playing && currentStep >= 0 ? Math.floor((currentStep % 64) / 16) : -1;
  const progress = playing && currentStep >= 0 ? ((currentStep % 64) + 1) / 64 : 0;
  const beatIdx  = playing && currentStep >= 0 ? Math.floor((currentStep % 64) / 4)  : -1;

  const prog = PROGS[progIdx];
  const isEdited = chordNotes.some((bar, i) => (
    bar.length !== prog.notes[i].length ||
    bar.some((n, j) => n !== prog.notes[i][j])
  ));
  const resetToPreset = () => setChordNotes(prog.notes.map(c => c.slice()));

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
              <div className="label">Piano roll · {prog.name}{isEdited ? ' · edited' : ''}</div>
              <div className="name">4 chords · 4 bars · click cells to edit</div>
            </div>
            <div className="controls">
              {isEdited && (
                <button className="roll-btn" onClick={resetToPreset} title="Restore preset chord voicings">↺ Reset</button>
              )}
              <button className={`roll-btn ${playing ? 'primary' : ''}`} onClick={() => setPlaying(p => !p)}>
                {playing ? '■ Stop' : '▶ Play loop'}
              </button>
              <button
                className="roll-btn"
                title="Export as MIDI"
                onClick={() => downloadMidi(exportChordsMidi(chordNotes, bpm), `lofi-chords-${prog.name.toLowerCase().replace(/\s+/g,'-')}.mid`)}
              >↓ MIDI</button>
            </div>
          </div>
          <div className="roll-canvas">
            <ChordRoll
              prog={prog}
              chordNotes={chordNotes}
              setChordNotes={setChordNotes}
              progress={progress}
              playing={playing}
              phase={phase}
              beatIdx={beatIdx}
            />
            <div className="chord-labels">
              <div></div>
              {prog.labels.map((l, i) => (
                <div key={i} className={`lbl ${CHORD_COLORS[i]} ${phase === i ? 'playing' : ''}`}>{l}</div>
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

function ChordRoll({ prog, chordNotes, setChordNotes, progress, playing, phase, beatIdx }) {
  // Pitch range — pad the preset's range so users have headroom to add
  // notes above/below without the grid resizing as they edit.
  const presetMidi = prog.notes.flat().map(noteToMidi);
  const minN = Math.min(...presetMidi) - 5;
  const maxN = Math.max(...presetMidi) + 5;
  const rowCount = maxN - minN + 1;
  const rowH = 18;
  const keyW = 60;
  const beats = 16; // 4 bars × 4 beats — each chord sustains for 4 beats

  // pitchString → Set<barIdx> for fast "is this cell on?" lookups.
  const noteIndex = React.useMemo(() => {
    const m = new Map();
    chordNotes.forEach((bar, ci) => {
      bar.forEach((p) => {
        if (!m.has(p)) m.set(p, new Set());
        m.get(p).add(ci);
      });
    });
    return m;
  }, [chordNotes]);

  const togglePitch = (barIdx, pitch) => {
    const next = chordNotes.map(c => c.slice());
    const bar = next[barIdx];
    const i = bar.indexOf(pitch);
    if (i >= 0) bar.splice(i, 1);
    else bar.push(pitch);
    setChordNotes(next);
  };

  return (
    <div className="chord-roll" style={{position: 'relative', minWidth: 640, overflowX: 'auto'}}>
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
          // All 4 progressions sit in C major / A minor — same scale, just
          // different tonal centres. Highlight diatonic notes (C D E F G A B)
          // and tag A as the tonic for a stronger accent.
          const isInScale = [0,2,4,5,7,9,11].includes(pc);
          const isTonic   = pc === 9;
          const letter = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'][pc];
          const oct = Math.floor(midi / 12) - 1;
          const pitch = `${letter}${oct}`;
          const onBars = noteIndex.get(pitch);
          return (
            <React.Fragment key={ri}>
              <div className={`cr-key ${isBlack ? 'black' : ''} ${isC ? 'octave' : ''} ${isTonic ? 'tonic' : ''}`}>
                {isC ? `C${oct}` : letter}
              </div>
              {Array.from({length: beats}).map((_, bi) => {
                const ci = Math.floor(bi / 4);
                const isOn = onBars && onBars.has(ci);
                const isCurrentBeat = playing && beatIdx === bi;
                const isCurrentBar  = playing && phase === ci;
                return (
                  <button
                    key={bi}
                    type="button"
                    className={`cr-cell editable ${bi % 4 === 0 ? 'barline' : ''} ${isBlack ? 'is-black' : ''} ${isInScale ? 'in-scale' : ''} ${isTonic ? 'tonic' : ''} ${isCurrentBeat ? 'beat-now' : ''} ${isCurrentBar ? 'bar-now' : ''} ${isOn ? 'has-note' : ''}`}
                    onClick={() => togglePitch(ci, pitch)}
                    aria-label={`${pitch} bar ${ci+1} beat ${(bi%4)+1}${isOn ? ' (on)' : ''}`}
                  ></button>
                );
              })}
            </React.Fragment>
          );
        })}
      </div>

      {/* notes overlay (purely visual; clicks pass through to cells beneath) */}
      <div style={{
        position: 'absolute',
        top: 0, left: keyW + 2,
        right: 0,
        height: rowCount * rowH + (rowCount - 1) * 2,
        pointerEvents: 'none',
      }}>
        {chordNotes.map((bar, ci) => {
          const colorClass = CHORD_COLORS[ci];
          return bar.map((n, ni) => {
            const midi = noteToMidi(n);
            const ri = maxN - midi;
            if (ri < 0 || ri >= rowCount) return null;
            const top = ri * (rowH + 2);
            const widthPct = (4 / beats) * 100;
            const leftPct  = (ci * 4 / beats) * 100;
            return (
              <div
                key={`${ci}-${ni}-${n}`}
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
const MELODY_STEPS = 32; // 4 bars × 8 quavers
const DEFAULT_MELODY = (() => {
  const m = MELODY_PITCHES.map(() => Array(MELODY_STEPS).fill(0));
  // Bar 1
  m[5][0]  = 1;                      // A4
  m[3][2]  = 1;                      // D5
  m[2][3]  = 1;                      // E5
  m[5][5]  = 1;                      // A4
  // Bar 2
  m[6][8]  = 1;                      // G4
  m[5][10] = 1;                      // A4
  m[7][11] = 1;                      // E4
  m[7][15] = 1;                      // E4
  // Bar 3
  m[5][16] = 1;                      // A4
  m[3][18] = 1;                      // D5
  m[2][19] = 1;                      // E5
  m[1][22] = 1;                      // G5
  m[0][23] = 1;                      // A5
  // Bar 4
  m[3][24] = 1;                      // D5
  m[2][27] = 1; m[2][28] = 1;        // E5 held final
  return m;
})();

function MelodyStep({ melody, setMelody, playing, setPlaying, currentStep, bpm }) {
  // Engine ticks 16ths (0..63); melody grid is quavers (0..31).
  const quaverStep = currentStep >= 0 ? Math.floor(currentStep / 2) : -1;
  const toggle = (pi, si) => {
    const next = melody.map(r => r.slice());
    next[pi][si] = next[pi][si] ? 0 : 1;
    setMelody(next);
  };
  const clear = () => setMelody(MELODY_PITCHES.map(() => Array(MELODY_STEPS).fill(0)));
  const random = () => {
    const m = MELODY_PITCHES.map(() => Array(MELODY_STEPS).fill(0));
    let cursor = 0;
    let last = Math.floor(MELODY_PITCHES.length / 2);
    const n = 10 + Math.floor(Math.random() * 6); // 10–15 notes across 4 bars
    for (let i = 0; i < n; i++) {
      if (cursor >= MELODY_STEPS - 1) break;
      const dir = Math.random() < 0.5 ? -1 : 1;
      const size = Math.random() < 0.7 ? 1 : 2;
      let pi = Math.max(0, Math.min(MELODY_PITCHES.length - 1, last + dir * size));
      if (Math.random() < 0.2) pi = last;
      last = pi;
      const len = 1 + Math.floor(Math.random() * 3);
      for (let k = 0; k < len && cursor + k < MELODY_STEPS; k++) m[pi][cursor + k] = 1;
      cursor += len + 1 + Math.floor(Math.random() * 4);
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
              <div className="label">Pad · A minor pentatonic · 4 bars</div>
              <div className="name">{noteCount} {noteCount === 1 ? 'note' : 'notes'} placed</div>
            </div>
            <div style={{display: 'flex', gap: 6}}>
              <button className="roll-btn" onClick={random}>↻ Random idea</button>
              <button className="roll-btn" onClick={clear}>Clear</button>
              <button className={`roll-btn ${playing ? 'primary' : ''}`} onClick={() => setPlaying(p => !p)} disabled={noteCount === 0}>
                {playing ? '■ Stop' : '▶ Play loop'}
              </button>
              <button
                className="roll-btn"
                title="Export as MIDI"
                disabled={noteCount === 0}
                onClick={() => downloadMidi(exportMelodyMidi(melody, MELODY_PITCHES, bpm), 'lofi-melody.mid')}
              >↓ MIDI</button>
            </div>
          </div>
          <div className="melody-roll four-bar">
            <div className="mr-header">
              <div></div>
              {Array.from({length: 4}).map((_, b) => (
                <div key={b} className="num bar-num">Bar {b+1}</div>
              ))}
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
                  {Array.from({length: MELODY_STEPS}).map((_, si) => (
                    <button
                      key={si}
                      className={`mr-cell ${melody[pi][si] ? 'on' : ''} ${si % 2 === 0 ? 'beat-mark' : ''} ${si % 8 === 0 ? 'bar-mark' : ''} ${playing && quaverStep === si && melody[pi][si] ? 'playing' : ''}`}
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
            <p>Long notes are good. Repeating a note is good. Silence is good — leave gaps so the chords can breathe.</p>
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
// 2 octaves (C1 → C3) for the bass piano roll. Top-to-bottom = high-to-low,
// matching how a real piano roll lays out — high pitches on top.
const BASS_PITCHES = (() => {
  const semis = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
  const out = ['C3'];
  for (let i = 11; i >= 0; i--) out.push(semis[i] + '2');
  for (let i = 11; i >= 0; i--) out.push(semis[i] + '1');
  return out;
})();
const BASS_BEATS = 16; // 4 bars × 4 beats (crotchets)

// Default bassline: each chord's root, one semibreve per bar on the downbeat.
// Octaves alternate low/high (bar 1,3 → octave 1; bar 2,4 → octave 2) for a
// classic lo-fi register bounce. The user can move the start beat within a
// bar but every bar is still one note.
function defaultBassFor(progIdx) {
  const roots = PROGS[progIdx].notes.map(c => c[0].replace(/\d/g, ''));
  const out = Array(BASS_BEATS).fill(null);
  for (let bar = 0; bar < 4; bar++) {
    const oct = bar % 2 === 0 ? '1' : '2';
    out[bar * 4] = roots[bar] + oct;
  }
  return out;
}

function BassStep({ progIdx, bassNotes, setBassNotes, playing, setPlaying, currentStep, bpm }) {
  const prog = PROGS[progIdx];
  // Engine 0..63 → bar phase (0–3), beat index (0–15), and progress %.
  const phase    = playing && currentStep >= 0 ? Math.floor((currentStep % 64) / 16) : -1;
  const beatIdx  = playing && currentStep >= 0 ? Math.floor((currentStep % 64) / 4)  : -1;
  const progress = playing && currentStep >= 0 ? ((currentStep % 64) + 1) / 64 : 0;

  const defaults  = defaultBassFor(progIdx);
  const isEdited  = bassNotes.some((p, i) => p !== defaults[i]);
  const noteCount = bassNotes.filter(Boolean).length;

  // First placed pitch per bar — drives the chord-label tag underneath the
  // roll and the BandLab translation tip.
  const firstPerBar = [0,1,2,3].map(bar => {
    for (let i = 0; i < 4; i++) {
      const p = bassNotes[bar * 4 + i];
      if (p) return p;
    }
    return null;
  });

  const resetToPreset = () => setBassNotes(defaults);
  const clearAll      = () => setBassNotes(Array(BASS_BEATS).fill(null));

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
          <li className={noteCount > 0 ? 'done' : ''}>Place at least one note</li>
          <li className={playing ? 'done' : ''}>Loop and feel the weight</li>
        </ul>
      </aside>

      <div className="step-body">
        <span className="eyebrow">Step 05<span className="dot"></span>Bassline</span>
        <h2>Drop the <em><span className="underline-hand">low end</span></em>.</h2>
        <p className="lede"><strong>Two octaves, one note per bar.</strong> The piano roll below covers <strong>C1 to C3</strong> — wide enough for a deep sub thump up to a punchy mid-bass — so you stay in bass register without feeling boxed in. Each bar holds one semibreve; click any cell to set that bar's note. The four indigo notes pre-drawn are the chord roots for <strong>{prog.name}</strong>; keep them, swap them out, or shift them sideways for syncopation.</p>

        <div className="roll-shell">
          <div className="roll-head">
            <div>
              <div className="label">Piano roll · 2 octaves · {prog.name}{isEdited ? ' · edited' : ''}</div>
              <div className="name">{noteCount} {noteCount === 1 ? 'note' : 'notes'} · 4 bars · click cells to edit</div>
            </div>
            <div className="controls">
              {isEdited && (
                <button className="roll-btn" onClick={resetToPreset} title="Restore preset roots">↺ Reset</button>
              )}
              <button className="roll-btn" onClick={clearAll} disabled={noteCount === 0}>Clear</button>
              <button className={`roll-btn ${playing ? 'primary' : ''}`} onClick={() => setPlaying(p => !p)} disabled={noteCount === 0 && !playing}>
                {playing ? '■ Stop' : '▶ Play loop'}
              </button>
              <button
                className="roll-btn"
                title="Export as MIDI"
                disabled={noteCount === 0}
                onClick={() => downloadMidi(exportBassMidi(bassNotes, bpm), 'lofi-bass.mid')}
              >↓ MIDI</button>
            </div>
          </div>
          <div className="roll-canvas">
            <BassRoll
              bassNotes={bassNotes}
              setBassNotes={setBassNotes}
              progress={progress}
              playing={playing}
              phase={phase}
              beatIdx={beatIdx}
            />
            <div className="chord-labels">
              <div></div>
              {prog.labels.map((l, i) => {
                const tag = firstPerBar[i] ? firstPerBar[i].replace(/\d/g, '') : '—';
                return (
                  <div key={i} className={`lbl ${CHORD_COLORS[i]} ${phase === i ? 'playing' : ''}`}>
                    {l} · <strong>{tag}</strong>
                  </div>
                );
              })}
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
            <span className="body-title">Shift the start.</span>
            <p>Each bar gets one semibreve, but you can place it on beat 2 or 3 instead of beat 1 for a syncopated feel. Try landing the bar's note half a beat behind the kick.</p>
          </div>
        </div>

        <div className="bandlab-split">
          <div>
            <div className="head">
              <h5>In this site</h5>
              <span className="badge">Practice</span>
            </div>
            <p>Click any cell to set that bar's note (one semibreve per bar — placing a new one replaces the old). The shaded white-key rows (<strong>C D E F G A B</strong>) are diatonic to A minor; anything else is a colour note. The bar tags under the roll show what each bar is currently playing.</p>
          </div>
          <div>
            <div className="head">
              <h5>In BandLab</h5>
              <span className="badge bl">Translate</span>
            </div>
            <p>Add a track → pick a <strong>Sub Bass</strong> or <strong>808</strong> instrument. Hit <code>↓ MIDI</code> and drag onto it, or draw the same notes by hand: one semibreve per bar between <strong>C1</strong> and <strong>C3</strong>, starting at whichever beat you placed each cell.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// Piano-roll component for the bassline. 13 rows × 16 cells, monophonic per
// cell — clicking a filled cell removes its note; clicking another row on the
// same beat replaces whatever pitch was there.
function BassRoll({ bassNotes, setBassNotes, progress, playing, phase, beatIdx }) {
  const rows  = BASS_PITCHES;
  const beats = BASS_BEATS;
  const rowH  = 18;
  const keyW  = 60;

  // One note per bar — clicking sets that bar's note (and clears any other
  // note already in the bar). Clicking the same cell again removes it.
  const setBeat = (bi, pitch) => {
    const next = bassNotes.slice();
    const wasOn = next[bi] === pitch;
    const barStart = Math.floor(bi / 4) * 4;
    for (let i = 0; i < 4; i++) next[barStart + i] = null;
    if (!wasOn) {
      next[bi] = pitch;
      AE.previewBass(pitch);
    }
    setBassNotes(next);
  };

  return (
    <div className="chord-roll bass-roll" style={{position: 'relative', minWidth: 640, overflowX: 'auto'}}>
      <div style={{
        display: 'grid',
        gridTemplateRows: `repeat(${rows.length}, ${rowH}px)`,
        gridTemplateColumns: `${keyW}px repeat(${beats}, 1fr)`,
        gap: 2,
      }}>
        {rows.map((pitch, ri) => {
          const letter  = pitch.replace(/\d/g, '');
          const oct     = pitch.replace(/[^\d]/g, '');
          const isBlack = letter.includes('#');
          const isC     = letter === 'C';
          const isInScale = ['C','D','E','F','G','A','B'].includes(letter);
          const isTonic = letter === 'A';
          return (
            <React.Fragment key={ri}>
              <div className={`cr-key ${isBlack ? 'black' : ''} ${isC ? 'octave' : ''} ${isTonic ? 'tonic' : ''}`}>
                {isC ? `C${oct}` : letter}
              </div>
              {Array.from({length: beats}).map((_, bi) => {
                const ci = Math.floor(bi / 4);
                const isOn = bassNotes[bi] === pitch;
                const isCurrentBeat = playing && beatIdx === bi;
                const isCurrentBar  = playing && phase === ci;
                return (
                  <button
                    key={bi}
                    type="button"
                    className={`cr-cell editable ${bi % 4 === 0 ? 'barline' : ''} ${isBlack ? 'is-black' : ''} ${isInScale ? 'in-scale' : ''} ${isTonic ? 'tonic' : ''} ${isCurrentBeat ? 'beat-now' : ''} ${isCurrentBar ? 'bar-now' : ''} ${isOn ? 'has-note' : ''}`}
                    onClick={() => setBeat(bi, pitch)}
                    aria-label={`${pitch} bar ${ci+1} beat ${(bi%4)+1}${isOn ? ' (on)' : ''}`}
                  ></button>
                );
              })}
            </React.Fragment>
          );
        })}
      </div>

      {/* notes overlay (visual only; clicks pass through to cells beneath) */}
      <div style={{
        position: 'absolute',
        top: 0, left: keyW + 2,
        right: 0,
        height: rows.length * rowH + (rows.length - 1) * 2,
        pointerEvents: 'none',
      }}>
        {bassNotes.map((p, bi) => {
          if (!p) return null;
          const ri = rows.indexOf(p);
          if (ri < 0) return null;
          // Each note is a semibreve — rings for 4 beats from its start. Clip
          // the visual at the right edge if a late beat would overflow.
          const run = Math.min(4, beats - bi);
          const ci = Math.floor(bi / 4);
          const colorClass = CHORD_COLORS[ci];
          const top = ri * (rowH + 2);
          const widthPct = (run / beats) * 100;
          const leftPct  = (bi / beats) * 100;
          const isPlayingNote = playing && beatIdx >= bi && beatIdx < bi + 4;
          return (
            <div
              key={`${bi}-${p}`}
              className={`cr-note ${colorClass} ${isPlayingNote ? 'playing' : ''}`}
              style={{
                position: 'absolute',
                top: top + 1,
                height: rowH - 2,
                left: `calc(${leftPct}% + 2px)`,
                width: `calc(${widthPct}% - 4px)`,
              }}
            ></div>
          );
        })}
      </div>

      {/* playhead */}
      {playing && (
        <div className="playhead-line" style={{
          left: `calc(${keyW + 2}px + ${progress * 100}% - ${(keyW + 2) * progress}px)`,
          top: 0,
          height: rows.length * rowH + (rows.length - 1) * 2,
        }}></div>
      )}
    </div>
  );
}

// ===========================================================
//  STEP 6 — DUSTY (tape FX — vinyl crackle lives in Step 7)
// ===========================================================
function DustyStep({ playing, setPlaying }) {
  const [warmth, setWarmth] = useState(40);
  const [fx, setFx] = useState({ hiss: false, saturation: true });

  // Audio: push dial / toggle values into the master FX chain.
  useEffect(() => {
    AE.setDust({
      warmth,
      hiss: fx.hiss,
      saturation: fx.saturation,
    });
  }, [warmth, fx.hiss, fx.saturation]);

  const grain = Math.min(0.85, 0.25 + warmth/200);
  const scratches = 0;

  const angleW = -135 + (warmth / 100) * 270;

  return (
    <div className="step-block" id="step6">
      <aside className="step-rail">
        <div className="step-num"><small>Step</small>06</div>
        <h4 style={{marginBottom: 4}}>Make it Dusty</h4>
        <div className="duration">
          <div><b>~5 min</b>Mix FX</div>
          <div><b>Goal</b>1996, not 2026</div>
        </div>
        <ul className="checklist">
          <li className={warmth > 0 ? 'done' : ''}>Roll off warmth</li>
          <li className={fx.saturation ? 'done' : ''}>Add saturation</li>
          <li className={fx.hiss ? 'done' : ''}>Add tape hiss</li>
        </ul>
      </aside>

      <div className="step-body">
        <span className="eyebrow">Step 06<span className="dot"></span>Dusty</span>
        <h2>Make it sound like <em><span className="underline-hand">tape</span></em>.</h2>
        <p className="lede">Right now your beat sounds <em>clean</em>. Lo-fi sounds <strong>old</strong>. Three small effects, all sitting on the master bus, do most of the work: <strong>warmth</strong> mellows the bright top end, <strong>saturation</strong> gently squashes the peaks (like running it through a real tape machine), and <strong>tape hiss</strong> lays a soft noise floor underneath everything. Vinyl crackle is a <em>place</em>, not a tape effect — that's Step 07.</p>

        <div className="dusty-shell">
          <div className="dusty-head">
            <div>
              <span className="label">Master FX · Lo-Fi chain</span>
              <h5>Tape Processor</h5>
            </div>
            <button className={`drum-btn primary`} onClick={() => setPlaying(p => !p)}>
              {playing ? '■ Stop' : '▶ Preview loop'}
            </button>
          </div>

          <div className="dusty-grid">
            <div className="dial-card">
              <h6>Warmth</h6>
              <span className="dial-sub">Mellow the highs · low-pass filter</span>
              <div className="dial">
                <div className="indicator" style={{transform: `translateX(-50%) rotate(${angleW}deg)`}}></div>
              </div>
              <input type="range" min="0" max="100" value={warmth} onChange={e => setWarmth(parseInt(e.target.value))} className="tempo-slider" style={{marginTop: 16}} />
              <div className="dial-value">{warmth}<small>%</small></div>
              <p className="desc">Cuts the brightness off the top. Lower = open and crisp. Higher = "blanket on the speaker" — softer, dustier, further away.</p>
            </div>
          </div>

          <div className="dusty-toggle-row">
            <button className={`dusty-toggle ${fx.saturation ? 'on' : ''}`} onClick={() => setFx({...fx, saturation: !fx.saturation})}>
              <div>
                <div className="name">Saturation</div>
                <div className="what">Soft tape squash — rounds off the loud peaks so the mix feels glued together.</div>
              </div>
              <div className="toggle-led"></div>
            </button>
            <button className={`dusty-toggle ${fx.hiss ? 'on' : ''}`} onClick={() => setFx({...fx, hiss: !fx.hiss})}>
              <div>
                <div className="name">Tape hiss</div>
                <div className="what">A quiet noise floor under everything — the sound of an old cassette, before the music starts.</div>
              </div>
              <div className="toggle-led"></div>
            </button>
          </div>

          <div className="dusty-preview" style={{
            '--grain': grain,
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
            <p>You don't bolt these onto each individual track. One chain sits on the <strong>master</strong> bus so every stem gets the <em>same</em> dust at the same time. That shared coating is what makes the whole song feel like it lives in one room.</p>
          </div>
          <div className="callout fallback">
            <strong className="kicker"><span className="marker"></span>Stuck?</strong>
            <span className="body-title">Warmth 50, saturation on, hiss on.</span>
            <p>That's a safe "classic lo-fi" starting point. Hit play, then nudge each control until it sits where you like.</p>
          </div>
        </div>

        <div className="bandlab-split">
          <div>
            <div className="head">
              <h5>In this site</h5>
              <span className="badge">Practice</span>
            </div>
            <p>Hit <strong>Preview loop</strong> to hear the full track playing through the master FX chain. Sweep the warmth dial — you'll hear the highs roll off in real time. Click saturation and hiss on and off to A/B compare clean vs dusty. That's the whole job.</p>
          </div>
          <div>
            <div className="head">
              <h5>In BandLab</h5>
              <span className="badge bl">Translate</span>
            </div>
            <p>Click the <strong>Master</strong> track → <code>+ FX</code> → search <strong>"Lo-Fi"</strong> or <strong>"Vinyl"</strong>. The one-knob preset bundles warmth + saturation + hiss together. If you want them separate, stack a <strong>"Low Pass"</strong> (warmth) and a <strong>"Tape"</strong> (saturation + hiss) instead.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ===========================================================
//  STEP 7 — ATMOSPHERE
// ===========================================================
// Stroke-style atmos icons — same visual language as MoodIllus (1.6 stroke,
// rounded caps/joins, optional low-opacity accent fill). The `playing` prop
// kicks in idle motion only when the layer is active and the bus is rolling.
function AtmosRainIcon({ active, playing }) {
  return (
    <svg viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="1.6"
         strokeLinecap="round" strokeLinejoin="round" className={`atmos-svg rain ${active ? 'on' : ''} ${playing ? 'live' : ''}`}>
      <path d="M16 28 a10 10 0 0 1 19-3 a8 8 0 0 1 5 14 H20 a8 8 0 0 1 -4-11z" fill="currentColor" fillOpacity={active ? 0.12 : 0.06}/>
      <line className="drop d1" x1="22" y1="46" x2="20" y2="54"/>
      <line className="drop d2" x1="32" y1="46" x2="30" y2="56"/>
      <line className="drop d3" x1="42" y1="46" x2="40" y2="54"/>
    </svg>
  );
}
function AtmosCafeIcon({ active, playing }) {
  return (
    <svg viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="1.6"
         strokeLinecap="round" strokeLinejoin="round" className={`atmos-svg cafe ${active ? 'on' : ''} ${playing ? 'live' : ''}`}>
      <path className="steam s1" d="M22 12 q3 4 0 8 q-3 4 0 8"/>
      <path className="steam s2" d="M30 10 q3 4 0 8 q-3 4 0 8"/>
      <path className="steam s3" d="M38 12 q3 4 0 8 q-3 4 0 8"/>
      <path d="M14 32 H44 v10 a10 10 0 0 1 -10 10 H24 a10 10 0 0 1 -10 -10 z" fill="currentColor" fillOpacity={active ? 0.12 : 0.06}/>
      <path d="M44 36 a6 6 0 0 1 0 12"/>
      <line x1="14" y1="32" x2="44" y2="32"/>
    </svg>
  );
}
function AtmosVinylIcon({ active, playing }) {
  return (
    <svg viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="1.6"
         strokeLinecap="round" strokeLinejoin="round" className={`atmos-svg vinyl ${active ? 'on' : ''} ${playing ? 'live' : ''}`}>
      <g className="disc">
        <circle cx="32" cy="32" r="20" fill="currentColor" fillOpacity={active ? 0.12 : 0.06}/>
        <circle cx="32" cy="32" r="20"/>
        <circle cx="32" cy="32" r="14"/>
        <circle cx="32" cy="32" r="9"/>
        <circle cx="32" cy="32" r="3" fill="currentColor"/>
      </g>
      <line className="dust d1" x1="14" y1="14" x2="16" y2="16"/>
      <line className="dust d2" x1="50" y1="18" x2="48" y2="20"/>
      <line className="dust d3" x1="48" y1="48" x2="50" y2="50"/>
    </svg>
  );
}
function AtmosFireIcon({ active, playing }) {
  return (
    <svg viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="1.6"
         strokeLinecap="round" strokeLinejoin="round" className={`atmos-svg fire ${active ? 'on' : ''} ${playing ? 'live' : ''}`}>
      <path className="flame outer" d="M32 12 q-2 8 -8 14 q-6 6 -6 14 a14 14 0 0 0 28 0 q0 -10 -6 -16 q-4 -4 -8 -12z"
            fill="currentColor" fillOpacity={active ? 0.14 : 0.06}/>
      <path className="flame inner" d="M32 26 q-3 4 -5 9 q-2 4 -2 7 a7 7 0 0 0 14 0 q0 -4 -2 -8 q-2 -4 -5 -8z"/>
      <line x1="14" y1="54" x2="50" y2="54"/>
      <line x1="20" y1="54" x2="24" y2="50"/>
      <line x1="44" y1="54" x2="40" y2="50"/>
    </svg>
  );
}

function AtmosStep({ playing, setPlaying, layers, setLayers, db, setDb }) {

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
  const setLayerDb = (k, v) => setDb({...db, [k]: v});
  const activeCount = Object.values(layers).filter(Boolean).length;
  // -50 dB → 0% fill, 0 dB → 100% fill
  const meterPct = (v) => Math.max(0, Math.min(100, ((v + 50) / 50) * 100));

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
            <div className={`fire ${layers.fire && playing ? 'on' : ''}`}></div>
          </div>

          <div className="atmos-layers">
            {[
              { id: 'rain',    Icon: AtmosRainIcon,    name: 'Rainfall' },
              { id: 'cafe',    Icon: AtmosCafeIcon,    name: 'Café murmur' },
              { id: 'crackle', Icon: AtmosVinylIcon,   name: 'Vinyl crackle' },
              { id: 'fire',    Icon: AtmosFireIcon,    name: 'Fireplace' },
            ].map(L => (
              <div key={L.id} className={`atmos-layer ${layers[L.id] ? 'on' : ''}`}>
                <button
                  type="button"
                  className="atmos-layer-toggle"
                  onClick={() => toggle(L.id)}
                  aria-label={`Toggle ${L.name}`}
                  aria-pressed={layers[L.id]}
                >
                  <span className="ico"><L.Icon active={layers[L.id]} playing={playing && layers[L.id]} /></span>
                  <div className="name">{L.name}</div>
                  <div className="lvl">{layers[L.id] ? 'Active' : 'Bypass'}</div>
                </button>
                <div className="atmos-fader" style={{ '--fill': `${meterPct(db[L.id])}%` }}>
                  <div className="fader-bubble" aria-hidden="true">{db[L.id]}<span>dB</span></div>
                  <div className="fader-track" aria-hidden="true">
                    <span className="fader-grid"></span>
                    <span className="fader-fill"></span>
                  </div>
                  <div className="fader-ticks" aria-hidden="true">
                    {[0, 25, 50, 75, 100].map(p => <i key={p} style={{ left: `${p}%` }}></i>)}
                  </div>
                  <input
                    type="range"
                    className="atmos-meter"
                    min="-50" max="0" step="1"
                    value={db[L.id]}
                    onChange={(e) => setLayerDb(L.id, parseInt(e.target.value, 10))}
                    onClick={(e) => e.stopPropagation()}
                    onMouseDown={(e) => e.stopPropagation()}
                    onTouchStart={(e) => e.stopPropagation()}
                    aria-label={`${L.name} level in decibels`}
                  />
                  <div className="fader-scale" aria-hidden="true">
                    <span>−50</span><span>−25</span><span>0</span>
                  </div>
                </div>
              </div>
            ))}
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
  // Master loop is 64 steps (4 bars × 16 sixteenths); the playhead sweeps that range.
  const pct = ((currentStep + 1) / 64) * 100;
  const prog = PROGS[progIdx];
  const moodObj = MOODS.find(m => m.id === mood);
  const roots = prog.notes.map(c => c[0].replace(/\d/g, ''));
  const atmosCount = atmosLayers ? Object.values(atmosLayers).filter(Boolean).length : 0;

  return (
    <section className="spread" id="assemble">
      <div className="blob b1" style={{background: 'var(--rose)'}}></div>
      <div className="blob b2" style={{background: 'var(--cyan)'}}></div>
      <div className="page">
        <span className="eyebrow"><span className="dot"></span>Final mix · all six layers</span>
        <h2 style={{margin: '14px 0 10px'}}>Stack it up.</h2>
        <p className="lede" style={{maxWidth: 700, marginBottom: 22}}>This is your finished track — drums, chords, melody, bass, dust, and atmosphere all playing together. Six tape reels, one transport. If you got this far, you've made a complete piece of music.</p>

        <div className="assembly">
          <div className="assembly-head">
            <div>
              <div className="label">Track · take 01</div>
              <h2>{moodObj?.name || 'Untitled'} <em style={{fontWeight: 300, color: 'var(--rose)'}}>· {prog.name}</em></h2>
              <p className="lede">6 stems · {bpm} BPM · 4/4 · A minor</p>
            </div>
            <div style={{
              fontFamily: 'var(--mono)', fontSize: '0.62rem',
              color: 'rgba(240,228,202,0.55)', letterSpacing: '0.1em',
              textTransform: 'uppercase', textAlign: 'right'
            }}>
              <div>Length<br/><strong style={{color: 'var(--paper)', fontFamily: 'var(--display)', fontSize: '1.15rem', fontWeight: 700, letterSpacing: '-0.01em'}}>0:{String(Math.floor((60 / bpm) * 16)).padStart(2,'0')}</strong></div>
            </div>
          </div>

          {/* drum stem */}
          <div className="tape-deck">
            <div className={`tape-reel ${playing ? 'playing' : ''}`}></div>
            <div className="tape-info">
              <div className="role"><span className="num">01</span>Stem · Drums</div>
              <div className="title-row"><h3>The Beat</h3><span className="source">Step 03 → Drum machine</span></div>
              <div className="tape-strip layered">
                {DRUM_ROWS.map((row) => {
                  const pi = row.patternIndex;
                  return (
                    <div key={row.id} className={`lane ${row.id}`}>
                      {[0,1,2,3].flatMap(bar => (
                        pattern[pi].map((on, s) => on ? (
                          <div key={`${bar}-${s}`} className="step" style={{
                            left: `${((bar*16 + s)/64)*100}%`,
                            width: `${(1/64)*100}%`
                          }}></div>
                        ) : null)
                      ))}
                    </div>
                  );
                })}
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
                    left: `${(si/MELODY_STEPS)*100}%`,
                    width: `${(1/MELODY_STEPS)*100}%`,
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
              <div className="role"><span className="num">05</span>Stem · Dust</div>
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
                      const colors = {rain: 'var(--cyan)', cafe: 'var(--mustard)', crackle: 'var(--rose)', fire: 'var(--lemon)'};
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
            <button className={`transport-btn ${playing ? 'playing' : ''}`} onClick={() => setPlaying()}>
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
            {(() => {
              const loopSec = (60 / bpm) * 16; // 4 bars × 4 beats / (bpm/60)
              const cur = playing && currentStep >= 0 ? (currentStep / 64) * loopSec : 0;
              const fmt = (s) => `0:${String(Math.floor(s)).padStart(2,'0')}`;
              return <div className="transport-time">{fmt(cur)} / {fmt(loopSec)}</div>;
            })()}
          </div>
        </div>
      </div>
    </section>
  );
}

// ===========================================================
//  EXPORT STUDIO — animated stem-export panel + BandLab walkthrough
// ===========================================================
// Sits inside "Now make it yours". Takes the live state of every stem and
// hands the user one .mid per stem (or a bundled 4-track file). The cards
// each animate idly so the panel feels alive even before you interact.
function ExportStudio({ pattern, chordNotes, melody, bassNotes, bpm, progName }) {
  const [pulse, setPulse] = useState(null);    // last-clicked stem id, for the success burst
  const [walkStep, setWalkStep] = useState(0); // active step in the BandLab walkthrough

  // Idle the BandLab walkthrough through its 4 steps every couple seconds —
  // gives the section a heartbeat without stealing focus from the cards.
  useEffect(() => {
    const id = setInterval(() => setWalkStep(s => (s + 1) % 4), 2400);
    return () => clearInterval(id);
  }, []);

  const slug = (progName || 'lofi').toLowerCase().replace(/\s+/g, '-');
  const fire = (id) => {
    setPulse(id);
    setTimeout(() => setPulse(p => p === id ? null : p), 900);
  };

  const handlers = {
    drums:  () => { fire('drums');  downloadMidi(exportDrumsMidi(pattern, bpm),                            'lofi-drums.mid'); },
    chords: () => { fire('chords'); downloadMidi(exportChordsMidi(chordNotes, bpm),                        `lofi-chords-${slug}.mid`); },
    melody: () => { fire('melody'); downloadMidi(exportMelodyMidi(melody, MELODY_PITCHES, bpm),            'lofi-melody.mid'); },
    bass:   () => { fire('bass');   downloadMidi(exportBassMidi(bassNotes, bpm),                           'lofi-bass.mid'); },
    bundle: () => { fire('bundle'); downloadMidi(exportAllMidi({ pattern, chordNotes, melody, melodyPitches: MELODY_PITCHES, bassNotes, bpm }), 'lofi-baby-steps-all-stems.mid'); },
  };

  // Live counts so each stem card can show the user *what* they're exporting.
  const drumHits   = pattern.flat().filter(Boolean).length;
  const melodyHits = melody.reduce((a, r) => a + r.reduce((b, v) => b + v, 0), 0);
  const chordCount = chordNotes.filter(c => c && c.length).length;
  const bassRoots = (() => {
    const firstByBar = [];
    for (let bar = 0; bar < 4; bar++) {
      for (let i = 0; i < 4; i++) {
        const p = bassNotes[bar * 4 + i];
        if (p) { firstByBar.push(p.replace(/\d/g, '')); break; }
      }
    }
    return firstByBar.join(' · ');
  })();

  const stems = [
    {
      id: 'drums',
      tone: 'rose',
      kicker: 'Stem 01',
      title: 'Drums',
      blurb: '4 bars · GM kit · channel 10',
      meta: `${drumHits} hits across the loop`,
      icon: <DrumIcon active={pulse === 'drums'} />,
    },
    {
      id: 'chords',
      tone: 'mustard',
      kicker: 'Stem 02',
      title: 'Chords',
      blurb: `${progName || 'progression'} · 4 bars · 1 chord per bar`,
      meta: `${chordCount} chord${chordCount === 1 ? '' : 's'} held full bar`,
      icon: <ChordIcon active={pulse === 'chords'} />,
    },
    {
      id: 'bass',
      tone: 'indigo',
      kicker: 'Stem 03',
      title: 'Bass',
      blurb: '2 octaves (C1 – C3) · piano roll',
      meta: bassRoots ? `Bars · ${bassRoots}` : 'Place notes in step 05',
      icon: <BassIcon active={pulse === 'bass'} />,
    },
    {
      id: 'melody',
      tone: 'sage',
      kicker: 'Stem 04',
      title: 'Melody',
      blurb: 'A min pentatonic · 4 bars · quavers',
      meta: `${melodyHits} note${melodyHits === 1 ? '' : 's'} placed`,
      icon: <MelodyIcon active={pulse === 'melody'} />,
    },
  ];

  return (
    <div className="export-studio">
      <div className="export-head">
        <span className="eyebrow"><span className="dot"></span>Take it home · MIDI export</span>
        <h3>Pull the stems out, drop them in <em><span className="underline-hand">BandLab</span></em>.</h3>
        <p>Each card is one .mid file. BandLab opens them straight onto its timeline — every stem on its own track so you can swap instruments, tweak notes, or add your own. <strong>{bpm} BPM</strong> is baked into every file.</p>
      </div>

      <div className="export-grid">
        {stems.map(s => (
          <button
            key={s.id}
            className={`export-card tone-${s.tone} ${pulse === s.id ? 'firing' : ''}`}
            onClick={handlers[s.id]}
            type="button"
          >
            <span className="export-burst"></span>
            <div className="export-icon">{s.icon}</div>
            <div className="export-card-text">
              <span className="num">{s.kicker}</span>
              <span className="name">{s.title}</span>
              <span className="blurb">{s.blurb}</span>
              <span className="meta">{s.meta}</span>
            </div>
            <span className="export-cta">
              <span className="arrow">↓</span>
              <span className="cta-label">Download .mid</span>
            </span>
          </button>
        ))}

        <button
          className={`export-card export-bundle ${pulse === 'bundle' ? 'firing' : ''}`}
          onClick={handlers.bundle}
          type="button"
        >
          <span className="export-burst"></span>
          <div className="bundle-stack">
            <span className="layer l1"></span>
            <span className="layer l2"></span>
            <span className="layer l3"></span>
            <span className="layer l4"></span>
          </div>
          <div className="export-card-text">
            <span className="num">All stems</span>
            <span className="name">Bundled .mid</span>
            <span className="blurb">4 tracks in one file · drums · chords · bass · melody</span>
            <span className="meta">The fastest way in. Drag once, four tracks land.</span>
          </div>
          <span className="export-cta primary">
            <span className="arrow">↓</span>
            <span className="cta-label">Download bundle</span>
          </span>
        </button>
      </div>

      <div className="bandlab-walk">
        <div className="walk-head">
          <span className="eyebrow"><span className="dot"></span>Then in BandLab</span>
          <h4>Four moves, two minutes.</h4>
          <p>BandLab is free in a browser — open the editor and walk through these.</p>
        </div>

        <ol className="walk-list">
          <WalkStep
            n="01" active={walkStep === 0}
            title="Open a fresh project"
            body={<>Hit <strong>Create</strong> → <strong>New Project</strong>. You'll get an empty timeline. Set tempo to <strong>{bpm} BPM</strong> in the top bar so it matches your stems.</>}
            illo={<IlloOpen />}
          />
          <WalkStep
            n="02" active={walkStep === 1}
            title="Drag the .mid file in"
            body={<>Drag any stem you downloaded straight onto the empty timeline. BandLab makes a new <strong>MIDI track</strong> automatically and shows your notes in the editor.</>}
            illo={<IlloDrag />}
          />
          <WalkStep
            n="03" active={walkStep === 2}
            title="Pick an instrument"
            body={<>Click the track's instrument icon → <strong>Browse Sounds</strong>. For drums use a <strong>Lo-Fi kit</strong>; chords → <strong>Mellow Piano</strong>; bass → <strong>Sub Bass</strong>; melody → <strong>Mellow Lead</strong>.</>}
            illo={<IlloInstrument />}
          />
          <WalkStep
            n="04" active={walkStep === 3}
            title="Drop the rest, mix"
            body={<>Repeat for the other stems — they'll all line up perfectly because they share BPM and bar count. Drag the volume sliders down so nothing fights. <em>Done.</em></>}
            illo={<IlloMix />}
          />
        </ol>

        <div className="walk-tip">
          <span className="kicker"><span className="marker"></span>Pro move</span>
          <span className="body-title">Use the bundled file first.</span>
          <p>Drag <code>lofi-baby-steps-all-stems.mid</code> in once and BandLab makes <strong>four tracks at once</strong>. Then swap each track's instrument. Faster than dragging stems one by one.</p>
        </div>

        <a className="bandlab-bookmark" href="https://www.bandlab.com/studio?triggered_from=top_bar_new_project" target="_blank" rel="noopener noreferrer">
          <span className="bm-mark">BL</span>
          <span className="bm-text">
            <span className="bm-eyebrow">Open in new tab</span>
            <span className="bm-url">bandlab.com<span className="bm-slash">/</span>studio</span>
          </span>
          <span className="bm-arrow" aria-hidden="true">↗</span>
        </a>

        <figure className="bandlab-preview">
          <div className="preview-frame">
            <div className="preview-chrome">
              <span></span><span></span><span></span>
              <span className="preview-url">bandlab.com/studio</span>
            </div>
            <img src="assets/bandlab-preview.png" alt="BandLab Studio with four colour-coded tracks: Drums, Chords, Bass, Melody — exactly what you'll see after dragging in the bundled .mid file." loading="lazy" />
          </div>
          <figcaption>
            <span className="kicker"><span className="marker"></span>What you'll see</span>
            <p>This is BandLab Studio after you drag the bundled <code>.mid</code> in. Four colour-coded tracks, your tempo (<strong>{bpm} bpm</strong>), four bars of clips ready to mix. The hard part's done — now you just pick instruments.</p>
          </figcaption>
        </figure>
      </div>
    </div>
  );
}

// ----- Walkthrough step row -----
function WalkStep({ n, title, body, illo, active }) {
  return (
    <li className={`walk-step ${active ? 'active' : ''}`}>
      <span className="walk-num">{n}</span>
      <div className="walk-illo">{illo}</div>
      <div className="walk-text">
        <h5>{title}</h5>
        <p>{body}</p>
      </div>
    </li>
  );
}

// ----- Animated stem icons (pure SVG/CSS, no external deps) -----
function DrumIcon({ active }) {
  return (
    <svg viewBox="0 0 64 64" className={`stem-icon drum ${active ? 'active' : ''}`} aria-hidden="true">
      <ellipse cx="32" cy="22" rx="22" ry="6" fill="none" stroke="currentColor" strokeWidth="2"/>
      <path d="M10 22 L10 42 Q32 50 54 42 L54 22" fill="none" stroke="currentColor" strokeWidth="2"/>
      <line x1="14" y1="14" x2="20" y2="6"  stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
      <line x1="50" y1="14" x2="44" y2="6"  stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
      <circle className="hit hit-a" cx="20" cy="6"  r="2" fill="currentColor"/>
      <circle className="hit hit-b" cx="44" cy="6"  r="2" fill="currentColor"/>
      <ellipse className="skin" cx="32" cy="22" rx="22" ry="6" fill="currentColor" opacity="0.18"/>
    </svg>
  );
}
function ChordIcon({ active }) {
  return (
    <svg viewBox="0 0 64 64" className={`stem-icon chord ${active ? 'active' : ''}`} aria-hidden="true">
      <rect x="6"  y="14" width="52" height="36" rx="2" fill="none" stroke="currentColor" strokeWidth="2"/>
      {[0,1,2,3,4,5,6].map(i => (
        <line key={i} x1={6 + (i+1) * (52/8)} y1="14" x2={6 + (i+1) * (52/8)} y2="50" stroke="currentColor" strokeWidth="1"/>
      ))}
      <rect className="key k1" x="9"  y="32" width="5" height="16" fill="currentColor"/>
      <rect className="key k2" x="22" y="32" width="5" height="16" fill="currentColor"/>
      <rect className="key k3" x="35" y="32" width="5" height="16" fill="currentColor"/>
      <rect className="key k4" x="48" y="32" width="5" height="16" fill="currentColor"/>
    </svg>
  );
}
function BassIcon({ active }) {
  return (
    <svg viewBox="0 0 64 64" className={`stem-icon bass ${active ? 'active' : ''}`} aria-hidden="true">
      <path className="wave wave-a" d="M4 32 Q14 12 24 32 T44 32 T64 32" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"/>
      <path className="wave wave-b" d="M4 40 Q14 20 24 40 T44 40 T64 40" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" opacity="0.5"/>
      <circle cx="8" cy="50" r="3" fill="currentColor"/>
      <text x="14" y="54" fontSize="9" fontFamily="JetBrains Mono, monospace" fill="currentColor" opacity="0.8">SUB</text>
    </svg>
  );
}
function MelodyIcon({ active }) {
  return (
    <svg viewBox="0 0 64 64" className={`stem-icon melody ${active ? 'active' : ''}`} aria-hidden="true">
      <line x1="6" y1="32" x2="58" y2="32" stroke="currentColor" strokeWidth="1" opacity="0.4"/>
      <circle className="dot d1" cx="12" cy="38" r="3" fill="currentColor"/>
      <circle className="dot d2" cx="24" cy="26" r="3" fill="currentColor"/>
      <circle className="dot d3" cx="36" cy="20" r="3" fill="currentColor"/>
      <circle className="dot d4" cx="48" cy="30" r="3" fill="currentColor"/>
      <path className="contour" d="M12 38 Q18 32 24 26 T36 20 T48 30" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeDasharray="3 3"/>
    </svg>
  );
}

// ----- Walkthrough illustrations -----
function IlloOpen() {
  return (
    <svg viewBox="0 0 80 56" className="walk-svg illo-open" aria-hidden="true">
      <rect x="4" y="6" width="72" height="44" rx="3" fill="none" stroke="currentColor" strokeWidth="1.6"/>
      <rect x="4" y="6" width="72" height="8"  fill="currentColor" opacity="0.12"/>
      <circle cx="9"  cy="10" r="1.6" fill="currentColor"/>
      <circle cx="14" cy="10" r="1.6" fill="currentColor"/>
      <circle cx="19" cy="10" r="1.6" fill="currentColor"/>
      <text className="bpm" x="40" y="34" fontSize="9" textAnchor="middle" fontFamily="JetBrains Mono, monospace" fill="currentColor">+ NEW</text>
      <rect className="cursor-blink" x="38" y="38" width="4" height="2" fill="currentColor"/>
    </svg>
  );
}
function IlloDrag() {
  return (
    <svg viewBox="0 0 80 56" className="walk-svg illo-drag" aria-hidden="true">
      <rect x="4" y="14" width="72" height="36" rx="2" fill="none" stroke="currentColor" strokeWidth="1.6"/>
      <line x1="4" y1="26" x2="76" y2="26" stroke="currentColor" strokeWidth="0.8" opacity="0.35"/>
      <line x1="4" y1="38" x2="76" y2="38" stroke="currentColor" strokeWidth="0.8" opacity="0.35"/>
      <g className="drag-file">
        <rect x="20" y="2" width="22" height="14" rx="2" fill="currentColor" opacity="0.85"/>
        <text x="31" y="12" fontSize="6" textAnchor="middle" fontFamily="JetBrains Mono, monospace" fill="var(--paper)">.mid</text>
      </g>
      <path className="drag-arrow" d="M44 14 L44 28" stroke="currentColor" strokeWidth="1.4" strokeDasharray="2 2"/>
    </svg>
  );
}
function IlloInstrument() {
  return (
    <svg viewBox="0 0 80 56" className="walk-svg illo-inst" aria-hidden="true">
      <rect x="4" y="6" width="48" height="44" rx="2" fill="none" stroke="currentColor" strokeWidth="1.6"/>
      <rect className="inst-row r1" x="8"  y="12" width="40" height="6" fill="currentColor" opacity="0.15"/>
      <rect className="inst-row r2" x="8"  y="22" width="40" height="6" fill="currentColor" opacity="0.15"/>
      <rect className="inst-row r3" x="8"  y="32" width="40" height="6" fill="currentColor" opacity="0.15"/>
      <rect className="inst-row r4" x="8"  y="42" width="40" height="6" fill="currentColor" opacity="0.15"/>
      <rect x="56" y="14" width="20" height="34" rx="2" fill="currentColor" opacity="0.85"/>
      <text x="66" y="33" fontSize="6" textAnchor="middle" fontFamily="JetBrains Mono, monospace" fill="var(--paper)">PIANO</text>
    </svg>
  );
}
function IlloMix() {
  return (
    <svg viewBox="0 0 80 56" className="walk-svg illo-mix" aria-hidden="true">
      {[0,1,2,3].map(i => (
        <g key={i}>
          <line x1={14 + i*16} y1="8" x2={14 + i*16} y2="48" stroke="currentColor" strokeWidth="1" opacity="0.3"/>
          <rect className={`fader f${i}`} x={11 + i*16} y={14 + i*5} width="6" height="10" rx="1" fill="currentColor"/>
        </g>
      ))}
      <text x="40" y="55" fontSize="5" textAnchor="middle" fontFamily="JetBrains Mono, monospace" fill="currentColor" opacity="0.7">MIX</text>
    </svg>
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
  const [swing, setSwing] = useState(0);

  const [progIdx, setProgIdx] = useState(0);
  const [chordsPlaying, setChordsPlaying] = useState(false);
  // Editable chord voicings — 4 bars × pitch arrays. Resets whenever the
  // user picks a new progression so the preset comes back cleanly.
  const [chordNotes, setChordNotes] = useState(() => PROGS[0].notes.map(c => c.slice()));
  useEffect(() => {
    setChordNotes(PROGS[progIdx].notes.map(c => c.slice()));
  }, [progIdx]);

  const [melody, setMelody] = useState(DEFAULT_MELODY.map(r => r.slice()));
  const [melodyPlaying, setMelodyPlaying] = useState(false);

  const [bassPlaying, setBassPlaying] = useState(false);
  // 16-cell piano-roll grid (4 bars × 4 crotchets), each cell either a full
  // pitch like 'A2' or null. Defaults to one chord-root note per bar.
  const [bassNotes, setBassNotes] = useState(() => defaultBassFor(0));
  useEffect(() => {
    setBassNotes(defaultBassFor(progIdx));
  }, [progIdx]);
  const [dustyPlaying, setDustyPlaying] = useState(false);
  const [atmosPlaying, setAtmosPlaying] = useState(false);
  const [atmosLayers, setAtmosLayers] = useState({ rain: true, cafe: false, crackle: false, fire: false });
  const [atmosDb, setAtmosDb] = useState({ rain: -18, cafe: -22, crackle: -24, fire: -22 });

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
        atmosPlaying || dustyPlaying) {
      AE.init().catch(() => {});
    }
  }, [drumPlaying, chordsPlaying, melodyPlaying, bassPlaying,
      atmosPlaying, dustyPlaying]);

  // Push state to the engine on every change.
  useEffect(() => { AE.setBpm(bpm); }, [bpm]);
  useEffect(() => { AE.setSwing(swing); }, [swing]);
  useEffect(() => { AE.setDrumPattern(pattern); }, [pattern]);
  useEffect(() => { AE.setProgIdx(progIdx); }, [progIdx]);
  useEffect(() => { AE.setChordNotes(chordNotes); }, [chordNotes]);
  useEffect(() => { AE.setBassNotes(bassNotes); }, [bassNotes]);
  useEffect(() => { AE.setMelody(melody, MELODY_PITCHES); }, [melody]);
  useEffect(() => { AE.setStem('drums',  drumPlaying); },    [drumPlaying]);
  useEffect(() => { AE.setStem('chords', chordsPlaying); },  [chordsPlaying]);
  useEffect(() => { AE.setStem('melody', melodyPlaying); },  [melodyPlaying]);
  useEffect(() => { AE.setStem('bass',   bassPlaying); },    [bassPlaying]);
  // Step 6's preview button uses the master stem so the user hears the full
  // arrangement (drums + chords + melody + bass) running through the FX chain.
  useEffect(() => { AE.setStem('master', dustyPlaying); },   [dustyPlaying]);
  useEffect(() => { AE.setAtmos(atmosLayers, atmosPlaying, atmosDb); }, [atmosLayers, atmosPlaying, atmosDb]);

  // Visual playhead — driven by the engine's per-step subscriber.
  const [rawStep, setRawStep] = useState(-1);
  useEffect(() => {
    const anyStem = drumPlaying || chordsPlaying || melodyPlaying || bassPlaying;
    if (!anyStem) { setRawStep(-1); return; }
    return AE.subscribe(s => setRawStep(s));
  }, [drumPlaying, chordsPlaying, melodyPlaying, bassPlaying]);

  const drumStep   = drumPlaying   ? rawStep : -1;
  const chordsStep = chordsPlaying ? rawStep : -1;
  const melodyStep = melodyPlaying ? rawStep : -1;
  const bassStep   = bassPlaying   ? rawStep : -1;

  // The Assembly view is a passive read-out of the step states — its
  // playhead and reels animate whenever any stem is running.
  const assemblyPlaying = drumPlaying || chordsPlaying || melodyPlaying ||
                          bassPlaying || dustyPlaying || atmosPlaying;
  const assemblyStep    = assemblyPlaying ? rawStep : -1;

  // Global transport: pill reflects ANY stem playing. Pressing play activates
  // every section together so the page sounds like the finished track; pausing
  // kills them all.
  const anyPlaying = assemblyPlaying;
  const handleGlobalToggle = () => {
    const next = !anyPlaying;
    setDrumPlaying(next);
    setChordsPlaying(next);
    setMelodyPlaying(next);
    setBassPlaying(next);
    setDustyPlaying(next);
    setAtmosPlaying(next);
  };

  // Spacebar toggles play/pause for the step section closest to the
  // viewport's vertical centre. Skips when an interactive element has
  // focus so it doesn't hijack tab-navigation or text input.
  useEffect(() => {
    const sectionToggles = {
      step2:    () => setChordsPlaying(p => !p),
      step3:    () => setDrumPlaying(p => !p),
      step4:    () => setMelodyPlaying(p => !p),
      step5:    () => setBassPlaying(p => !p),
      step6:    () => setDustyPlaying(p => !p),
      step7:    () => setAtmosPlaying(p => !p),
      assemble: () => handleGlobalToggle(),
    };

    const onKey = (e) => {
      if (e.code !== 'Space' && e.key !== ' ') return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const t = e.target;
      if (t && t.matches && t.matches('input, textarea, select, [contenteditable], [role="button"]')) return;
      // The cr-cell buttons in the chord roll are focusable but have no
      // useful keyboard activation — let space pass through to playback.
      if (t && t.tagName === 'BUTTON' && !t.classList.contains('cr-cell')) return;

      const vh = window.innerHeight;
      const target = vh / 2;
      let bestId = null, bestDist = Infinity;
      Object.keys(sectionToggles).forEach((id) => {
        const el = document.getElementById(id);
        if (!el) return;
        const r = el.getBoundingClientRect();
        if (r.bottom < 0 || r.top > vh) return; // not on screen
        const center = (r.top + r.bottom) / 2;
        const d = Math.abs(center - target);
        if (d < bestDist) { bestId = id; bestDist = d; }
      });
      if (!bestId) return;

      e.preventDefault(); // stop the default page-scroll
      sectionToggles[bestId]();
    };

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <React.Fragment>
      <CustomCursor />
      <Topnav />
      <GlobalPlayer
        playing={anyPlaying}
        onToggle={handleGlobalToggle}
        selectedMood={selectedMood}
        bpm={bpm}
      />

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

              <HeroDemo playing={anyPlaying} onToggle={handleGlobalToggle} />
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
          <div className="page">
            <div style={{maxWidth: 720}}>
              <h2 style={{margin: '0 0 18px'}}>What even <em><span className="underline-hand">is</span></em> lo-fi?</h2>
              <p style={{fontSize: '1.05rem'}}>
                Slow, dusty drums. Jazzy piano chords. A cosy little melody — the music on every YouTube study stream. It's <em>forgiving</em> by design: the whole point is that it sounds slightly imperfect, so there's no "wrong note" police.
              </p>
            </div>

            <div style={{marginTop: 48}}>
              <div style={{display: 'flex', alignItems: 'baseline', gap: 14, marginBottom: 18}}>
                <h3>Listen first</h3>
                <span className="mono" style={{fontSize: '0.72rem', letterSpacing: '0.16em', textTransform: 'uppercase'}}>· 4 reference tracks</span>
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
                chordNotes={chordNotes} setChordNotes={setChordNotes}
                playing={chordsPlaying} setPlaying={setChordsPlaying}
                currentStep={chordsStep}
                bpm={bpm}
              />
              <DrumStep
                pattern={pattern} setPattern={setPattern}
                bpm={bpm} setBpm={setBpm}
                swing={swing} setSwing={setSwing}
                playing={drumPlaying} setPlaying={setDrumPlaying}
                currentStep={drumStep}
              />
              <MelodyStep
                melody={melody} setMelody={setMelody}
                playing={melodyPlaying} setPlaying={setMelodyPlaying}
                currentStep={melodyStep}
                bpm={bpm}
              />
              <BassStep
                progIdx={progIdx}
                bassNotes={bassNotes} setBassNotes={setBassNotes}
                playing={bassPlaying} setPlaying={setBassPlaying}
                currentStep={bassStep}
                bpm={bpm}
              />
              <DustyStep
                playing={dustyPlaying} setPlaying={setDustyPlaying}
              />
              <AtmosStep
                playing={atmosPlaying} setPlaying={setAtmosPlaying}
                layers={atmosLayers} setLayers={setAtmosLayers}
                db={atmosDb} setDb={setAtmosDb}
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
          playing={assemblyPlaying} setPlaying={handleGlobalToggle}
          currentStep={assemblyStep}
          atmosLayers={atmosLayers}
        />

        {/* EXTEND */}
        <section className="spread tone-plum" id="extend" data-screen-label="06 Extend">
          <div className="blob b3" style={{background: 'var(--plum)'}}></div>
          <div className="page">
            <span className="eyebrow"><span className="dot"></span>Extension · go further</span>
            <h2 style={{margin: '14px 0 14px'}}>Now make it <em><span className="underline-hand">yours</span></em>.</h2>
            <p className="lede" style={{maxWidth: 640, marginBottom: 36}}>You have a beat, chords, melody, bass, dust, and atmosphere — that's a complete lo-fi track. Stop here if you want; you've made a piece of music. Or pick one of these.</p>

            <ExportStudio
              pattern={pattern}
              chordNotes={chordNotes}
              melody={melody}
              bassNotes={bassNotes}
              bpm={bpm}
              progName={PROGS[progIdx].name}
            />

            <div className="ext-section-head">
              <span className="eyebrow"><span className="dot"></span>Or keep building · 4 directions</span>
              <h3>Push the loop further.</h3>
            </div>

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
          <div className="name">Tempo</div>
          <div className="desc">BPM · Mood</div>
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
          <li><a href="#step1"><span className="nav-num">01</span><span className="nav-label">Tempo</span></a></li>
          <li><a href="#step2"><span className="nav-num">02</span><span className="nav-label">Chords</span></a></li>
          <li><a href="#step3"><span className="nav-num">03</span><span className="nav-label">Beat</span></a></li>
          <li><a href="#step4"><span className="nav-num">04</span><span className="nav-label">Melody</span></a></li>
          <li><a href="#step5"><span className="nav-num">05</span><span className="nav-label">Bass</span></a></li>
          <li><a href="#step6"><span className="nav-num">06</span><span className="nav-label">Dusty</span></a></li>
          <li><a href="#step7"><span className="nav-num">07</span><span className="nav-label">Atmos</span></a></li>
          <li><a href="#assemble"><span className="nav-num">∞</span><span className="nav-label">Mix</span></a></li>
          <li><a href="#teacher"><span className="nav-num">★</span><span className="nav-label">Notes</span></a></li>
        </ul>
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
              <a href="#step1" style={{color: 'var(--ink-2)', display: 'block'}}>01 · Tempo</a>
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
