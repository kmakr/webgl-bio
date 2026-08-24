# Theo Azriel — Web

One repository contains both public sites.

```text
apps/
├── home/       # home.theoazriel.com — a room of sunlight
├── notes/      # theoazriel.com — the index and the notes
└── gallery/    # gallery.theoazriel.com — photographs on the cloth
```

The site at the root domain is a static Astro app: its index page is a quiet
typographic table of contents, and Markdown files in
`apps/notes/src/content/notes` are the published notes. The gallery is a
React, Vite, and Three.js app built on the Holocloth cloth simulation.
`notes.theoazriel.com` stays attached to the site Worker so old note links
keep resolving.

## Run

```bash
npm install
npm run dev:home
npm run dev:notes
npm run dev:gallery
```

## Build

```bash
npm run build
```

## Publish a note

1. Add a Markdown file to `apps/notes/src/content/notes`.
2. While `draft: true`, the note renders only at the unlisted, noindex
   `theoazriel.com/drafts/<slug>` for proofreading.
3. Set `draft: false` in its frontmatter.
4. Commit and push the file.
5. Cloudflare builds and deploys the site; the note appears on the index
   and at `theoazriel.com/notes/<slug>`.

## Deploy

```bash
npm run deploy:notes
npm run deploy:gallery
npm run deploy:home
```

## Gallery

A black-and-white personal site built on the Holocloth cloth simulation.

The name and changing quote are printed directly onto one interactive silver
cloth. The typography bends with the cloth. Click anywhere for a different
quote. Drag the cloth to move it.

Use the small material switch to select the preserved silver version or the
clear plastic-tape version. Open `#tape` to link directly to the clear version.
The clear version uses a four-color scene backdrop so its transmission and
refraction stay visible.

## Source

The cloth engine comes from
[dmitrykurash/holocloth](https://github.com/dmitrykurash/holocloth).

---

## Original Holocloth documentation

A little browser tool for playing with holographic fabric.

You get a sheet of simulated cloth floating in space. You can grab it, throw it around, drape your own images over it, and watch them ripple like they're printed on holo foil. When it looks good — export a PNG.

![Holocloth](docs/preview.jpg)

## What it does

- **Real cloth physics** — grab the sheet and pull. It wrinkles, settles, and floats like fabric in gel. Written from scratch (Verlet integration, no physics library).
- **Holographic material** — an iridescent foil shader with rainbow diffraction, sparkle, and bump maps. Also chrome and black cloth presets.
- **Your images** — upload any image or SVG and it becomes the cloth, or a sticker on top of it. Everything bends and folds with the fabric.
- **Camera looks** — macro depth of field (click to pick a focus point), ambient occlusion in the folds, film grain, bloom.
- **Export** — one click PNG, with or without the background.
- **Versions** — save looks and switch between them while you work.

## Controls

| Action | How |
|---|---|
| Grab the cloth | Click + drag on it |
| Orbit the camera | Drag empty space |
| Pan | Hold `Space` + drag, or right-drag |
| Zoom | Scroll |
| Move a sticker | Turn on `Edit` in the Images panel, then drag it |

## Run it

One line (needs Node 20+ and git):

```bash
git clone https://github.com/dmitrykurash/holocloth.git && cd holocloth && npm install && npm run dev
```

Then open the local URL Vite prints — usually `http://localhost:5199`.

## Tech

- [Three.js](https://threejs.org) (WebGL 2) — rendering
- [React](https://react.dev) + TypeScript + [Vite](https://vite.dev)
- Custom GLSL: the holo foil shader, a circle-of-confusion depth of field pass, film grain
- Custom cloth simulation: Verlet integration with structural, shear, and bend constraints
- [DialKit](https://github.com/joshpuckett/dialkit) by [Josh Puckett](https://x.com/joshpuckett) — the control panel UI

## Credits

Made by [Dmitry Kurash](https://x.com/DmitryKurash).

UI powered by [DialKit](https://github.com/joshpuckett/dialkit) — a lovely little library by [Josh Puckett](https://x.com/joshpuckett) for dialing in interface parameters.
