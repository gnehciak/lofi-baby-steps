# Lo-Fi Baby Steps

> A Stage 4 (Years 7–8) scaffolded composition activity. Students learn to make a lo-fi hip-hop track in four small steps using BandLab, supported by interactive in-browser audio widgets.

Built for **MUED3603 Assessment Task 3 — Scaffolding composition with baby steps**, University of Sydney, Semester 1 2026.

---

## What this is

A single-page interactive guide that walks a Stage 4 student through composing their first lo-fi beat. Every step has a working in-browser music widget (built with [Tone.js](https://tonejs.github.io/)), a fallback for stuck students, and a translation note showing how to do the same thing in [BandLab](https://www.bandlab.com).

The four steps:

1. **Vibe** — pick a mood and tempo.
2. **Beat** — build a 16-step drum pattern in the in-browser drum machine.
3. **Chords** — choose from four jazz progressions and hear them loop.
4. **Melody** — write a sequence on the pentatonic safe-note pad.

The page also includes a collapsible **Teacher Notes & Rationale** section covering the compositional model, pedagogical decisions, differentiation strategy, and NESA Music 7–10 syllabus links.

---

## Running it locally

It's a static site with no build step. Three options:

**Option 1 — just open the file**
Double-click `index.html`. It'll open in your default browser. Some browsers restrict module loading from `file://` URLs, but this site doesn't use modules so it should work everywhere.

**Option 2 — local server (recommended for development)**

```bash
# Python 3
python3 -m http.server 8000

# Or Node
npx serve .
```

Then visit `http://localhost:8000`.

**Option 3 — VS Code Live Server extension**
Right-click `index.html` → "Open with Live Server".

---

## Deploying to GitHub Pages

This is the recommended free hosting path. After you push to GitHub:

1. Go to your repo on github.com
2. Click **Settings** → **Pages** (left sidebar)
3. Under **Build and deployment** → **Source**, choose **Deploy from a branch**
4. Choose branch **`main`** and folder **`/ (root)`**
5. Click **Save**
6. Wait ~30 seconds. Your site will be live at `https://<your-username>.github.io/<repo-name>/`

The `.nojekyll` file in this repo tells GitHub Pages to skip Jekyll processing (which would otherwise interfere with files starting with `_`).

### First-time setup (push to GitHub)

If this folder isn't yet on GitHub:

```bash
cd "baby steps"          # or wherever the project lives

# 1. Init git
git init
git branch -M main
git add .
git commit -m "Initial commit: lo-fi baby steps scaffolding site"

# 2. Create an empty repo on github.com — do NOT add a README/license/gitignore there
#    Then copy its URL (looks like https://github.com/YOU/REPO.git)

# 3. Connect and push
git remote add origin https://github.com/YOU/REPO.git
git push -u origin main
```

Then enable Pages as described above.

---

## Project structure

```
baby steps/
├── index.html              # Main page
├── styles.css              # All styles
├── app.js                  # All interactivity (Tone.js audio + UI)
├── manifest.webmanifest    # PWA manifest
├── .nojekyll               # Tells GitHub Pages to skip Jekyll
├── .gitignore
├── README.md
└── assets/
    ├── favicon.svg
    └── og-image.svg        # Social share preview (1200×630)
```

External dependencies (loaded from CDN at runtime, no build):

- [Tone.js 14.8.49](https://tonejs.github.io/) — Web Audio synthesis engine
- [Google Fonts](https://fonts.google.com/) — Fraunces (headings) + Inter (body)

---

## Audio note

Browsers block audio from playing until a user gesture (click/tap). The first click on any **Play** button on the page will start the audio context. A small toast at the bottom of the screen reminds users of this on first load.

All audio is synthesised live in the browser using Tone.js — no audio files are loaded. This means the page is small (no MP3/WAV downloads) and works after first load even if the network drops out.

---

## Credits & references

- Lo-fi hip-hop genre lineage: J Dilla (*Donuts*, 2006), Nujabes (*Samurai Champloo* OST, 2004), Lofi Girl YouTube radio (2017–).
- Pedagogical framing draws on Humberstone, J. H. B. (2015, 2017, 2023).
- Curriculum links to NSW Education Standards Authority, *Music Years 7–10 Syllabus*.

Full references are in the **Teacher Notes** section of the site itself.

---

## License

Personal/educational coursework — © 2026 Kevin Li. The design and copy are mine; the libraries and fonts retain their own licenses (Tone.js MIT, Fraunces SIL OFL, Inter SIL OFL).
