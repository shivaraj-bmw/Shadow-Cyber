# Cyber Incident Simulator

A futuristic, fully client-side digital forensics / incident response training
platform. Investigate fictional cyber incidents, analyze simulated evidence,
build a threat picture, and submit a final investigation report.

**Everything in this project is fictional.** No real IP addresses, domains,
hashes, credentials, or people are used. No real network requests, scans, or
exploitation ever occur — every "scan," "log," and "attack" is simulated data
baked into the app for educational purposes.

## Features

- Animated system boot sequence (skippable, respects reduced-motion)
- Command-center home screen with rank, XP, and simulated system monitor
- 5 investigable cases (Phishing, Insider Threat, Ransomware, Data
  Exfiltration, Advanced Persistence) with escalating difficulty, unlocked
  sequentially
- Full evidence workspace per case: email, network logs, user logs, file
  system, DNS, firewall, browser history — each searchable/filterable
- Clickable evidence viewer with fabricated forensic metadata (hash, source,
  indicators)
- Interactive timeline, SVG network map with animated suspicious paths, and a
  threat-analysis panel with a live attack-chain visualization
- Investigator notes (autosaved), final report with scored multiple-choice
  questions, cinematic score screen, XP and rank progression
- Training Mode: 12 short lessons covering core security topics
- Cyber Lab: 7 hands-on mini challenges (phishing ID, log spotting, password
  strength, Base64 decode, file metadata, auth timeline, IR ordering)
- Case Archive, Achievements, simulated terminal, sound toggle, and a reset
  panel — all backed by `localStorage`
- Fully responsive: multi-panel desktop workspace collapses to a
  touch-friendly bottom nav on mobile
- Respects `prefers-reduced-motion` and uses visible focus states throughout

## Project structure

```
cyber-incident-simulator/
├── index.html        All screens (boot, shell, modals, terminal)
├── style.css          Design tokens + all component/layout styles
├── script.js          App state, router, and all screen/feature logic
├── data/
│   ├── cases.js        The 5 case definitions (evidence, timeline, etc.)
│   └── training.js     The 12 training-mode lessons
└── README.md
```

## Running locally

No build step or server-side code is required. Either:

- Open `index.html` directly in a modern browser, or
- Serve the folder locally, e.g. `python3 -m http.server`, then visit
  `http://localhost:8000`

## Deploying for free

**GitHub Pages**
1. Push this folder to a GitHub repository.
2. Repository Settings → Pages → set the source branch/folder to the repo
   root.
3. Your site will be live at `https://<username>.github.io/<repo>/`.

**Netlify**
1. Drag and drop this folder onto Netlify's "Deploy manually" screen, or
   connect the GitHub repo.
2. No build command is needed — it's a static site.

## Adding a new case

Add a new object to the `CASES` array in `data/cases.js` following the shape
of the existing entries (`evidence`, `clues`, `timeline`, `networkMap`,
`threatAnalysis`, `attackChain`, `questions`). Set `requires` to the id of the
case that should unlock it, or `null` to make it available from the start.

## Notes on safety

This project is intentionally self-contained: it performs no real scanning,
authentication attempts, or outbound requests to any target, fictional or
real. The in-app "terminal" and "scan" command only print simulated text and
never touch the host operating system or network.
