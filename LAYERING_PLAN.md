# Layering Plan — drums + chords + melody playing together

## Goal

Let students hear their drum pattern, chord progression, and melody **at the same time**, locked to one tempo, so the page becomes a tiny in-browser DAW. Each widget gets its own play/stop, and any combination can be active simultaneously.

This is a behaviour change to `app.js` only. No HTML restructuring, no CSS rewrites, no framework switch.

---

## The core problem (one paragraph)

`Tone.Transport` is a singleton — there's exactly one timeline shared by every widget. The current code treats that as "only one widget at a time", and `stopAllOthers()` (`app.js:837`) enforces it. Worse, every widget's stop handler calls `Tone.Transport.stop()` *and* `Tone.Transport.cancel()`, which nukes every scheduled event on the timeline, including ones that belong to other widgets. The fix is to (a) stop calling `cancel()` per-widget, (b) only stop the Transport when *no* layers are active, and (c) put all layers on the same BPM so they stay in phase.

---

## What changes

### 1. Reference-counted Transport lifecycle

Replace `stopAllOthers()` with a small layer registry:

```js
const activeLayers = new Set(); // 'drum' | 'chord' | 'melody'

function layerStarted(name) {
  activeLayers.add(name);
  if (Tone.Transport.state !== 'started') Tone.Transport.start();
}

function layerStopped(name) {
  activeLayers.delete(name);
  if (activeLayers.size === 0) {
    Tone.Transport.stop();
    Tone.Transport.position = 0;
  }
}
```

Each widget's stop handler **only disposes its own Loop**. No more `Transport.cancel()` calls inside per-widget stop handlers. (Loops dispose themselves cleanly via `loop.dispose()` — that removes their scheduled callbacks without touching anyone else's.)

### 2. One shared BPM

Pick a single source of truth: the Step 1 tempo slider (`#metroTempo`).

- Remove the duplicate Step 2 tempo slider, OR keep it as a mirror that reads/writes the same value.
- Delete the per-widget `CHORD_BPM = 76` and `MELODY_BPM = 76` constants. All widgets read `Tone.Transport.bpm.value` instead.
- The hero demo still forces 76 when it plays (it's a fixed demo, see #5).

Recommendation: **remove the Step 2 slider** and put one big "Tempo" control near the top of the page, since tempo is now a global property of the project, not a per-widget setting.

### 3. Bar-aligned layer entry

If a student starts the drum loop, lets it run for a bit, then hits Play on chords, the chord loop should enter on the next downbeat — not in the middle of bar 3. Tone.js supports this with the `@` syntax:

```js
chordLoop.start('@1m'); // start at the next bar line
```

For the very first layer (Transport not yet running), start at `0`. A helper:

```js
function layerStart(loop) {
  loop.start(activeLayers.size === 0 ? 0 : '@1m');
}
```

This is the single biggest "feels musical" detail. Without it, layering sounds sloppy.

### 4. Each widget owns only its own state

Currently the chord stop handler clears the chord playhead, the drum stop handler clears the drum cell highlights, etc. — that's already correct. The bug is just the Transport calls. After change #1, each widget's stop should:

1. Dispose its own Loop.
2. Clear its own visual state (playhead, cell highlight, button label).
3. Call `layerStopped(name)` to update the global registry.

### 5. Hero demo stays exclusive

The hero "Play demo" is a *preview* of a finished track, not a layer. When the user starts the hero demo, stop everything else (drum/chord/melody). When the user starts any layer, stop the hero demo. This is the only legitimate use of the old "stop the others" pattern.

### 6. Master "Stop all" button

Add one small button somewhere visible — maybe in the top nav, or as a floating control — that disposes every active layer and stops the Transport. Useful when a student has three things going and just wants silence.

Open question: do we also want a master "Play all" that starts whatever's been programmed in all four widgets? My recommendation is **no for now** — let students start layers one at a time so they hear what each layer adds. Easy to add later.

---

## Implementation steps (in order)

1. **Add the layer registry** (`activeLayers`, `layerStarted`, `layerStopped`, `layerStart` helpers). Place near the top of `app.js` after the instrument definitions.
2. **Rewrite drum play/stop handler** to use the registry. Remove its `Transport.stop/cancel` calls. Verify drum still plays standalone.
3. **Rewrite chord play/stop handler** similarly. Verify chord plays standalone, then verify drum + chord layer correctly.
4. **Rewrite melody play/stop handler** similarly. Verify all three layer correctly.
5. **Consolidate BPM control.** Decide: remove Step 2 slider, or keep it as a mirror. Delete per-widget BPM constants. Wire all tempo changes to `Tone.Transport.bpm.value`.
6. **Update hero demo** to call `stopAllLayers()` (a new helper that empties the registry) on play, and to register itself so layers stop it on their play.
7. **Add the master "Stop all" button** in the topnav or as a floating pill. Wire it to `stopAllLayers()`.
8. **Smoke-test in browser**:
   - Start drums alone, stop. ✓ silence
   - Start drums + chords, stop chords. ✓ drums continue
   - Start chords mid-drum-loop. ✓ chords enter on next bar
   - Change tempo while all three are playing. ✓ all three stay in sync at new tempo
   - Hero demo while a layer is playing. ✓ layer stops, hero plays
   - Layer play while hero is playing. ✓ hero stops, layer plays

---

## Decisions I need from you before coding

1. **Tempo control consolidation**: remove the Step 2 tempo slider, or keep it as a mirror of Step 1?
2. **Master Stop All location**: in the topnav (always visible) or as a floating pill (only visible when something is playing)?
3. **Bar alignment**: confirm you want layers entering on the next bar line, not immediately. (I strongly recommend bar-aligned.)
4. **Master "Play all" button**: skip for now, or add it?

---

## Out of scope (future work)

These are mentioned only so they don't sneak in:

- Per-layer volume sliders / mute / solo
- Switching synths to real samples (`Tone.Sampler`)
- Recording the layered output to a downloadable file
- Save/load student work to URL or localStorage
- Sharing across the four widgets via a centralized state object (right now each widget owns its own state — that's fine for layering)

---

## Risk register

- **`Tone.Transport.cancel()` removed too aggressively** — if a Loop reference is lost without dispose, its callbacks linger. Mitigation: every widget already keeps a handle (`drumLoop`, `chordLoop`, `melodyLoop`) and disposes it on stop. We're keeping that.
- **Position drift when layers start mid-loop** — `@1m` aligns to bar boundaries, not phrase boundaries. The chord loop is 2 bars long, so entering at `@1m` could land on its second bar. Acceptable musically (still on a downbeat, just half-way through the progression). If this is bothersome, we'd need `@2m` for the chord loop specifically — easy follow-up.
- **iOS Safari** — none of these changes touch the audio-unlock gesture flow, so existing mobile behaviour is preserved.
