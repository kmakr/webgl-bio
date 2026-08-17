import { useCallback, useEffect, useRef, useState } from 'react';
import { HoloApp, type HoloParams } from './scene.ts';

type MaterialVersion =
  | 'tape'
  | 'silver'
  | 'holo'
  | 'black';

/**
 * The photographs, in filename order. Drop image files (jpg/png/webp — the
 * SVGs are placeholders) into src/photos/ and they join the gallery on the
 * next build; each drapes onto the cloth at its own aspect ratio.
 */
const PHOTOS = Object.entries(
  import.meta.glob('./photos/*.{jpg,jpeg,png,webp,avif,svg}', {
    eager: true,
    query: '?url',
    import: 'default',
  }),
)
  .sort(([a], [b]) => a.localeCompare(b))
  .map(([, url]) => url as string);

/**
 * Pick a quality profile from what the device tells us about itself.
 *
 * Without this every visitor got 'High' — DPR 2, 8x MSAA, and a 48-segment
 * cloth — because nothing ever wrote to `performance`. The hero's two costs
 * pull in different directions, so both are worth reading:
 *
 *  - the cloth solver is single-threaded JS, and its constraint count grows
 *    with the square of the segment count (48 -> 28 segments is ~9.9k -> 3.4k
 *    constraints), so core count and memory matter;
 *  - the material is transmissive with a heavy fragment shader, so cost also
 *    tracks the pixels actually rasterized — DPR² × viewport.
 *
 * Deliberately conservative: it only steps down on clear evidence, since a
 * wrong guess costs visible fold detail and sharpness. `deviceMemory` is
 * Chromium-only and `hardwareConcurrency` can be absent, so both fall back to
 * values that keep a device at 'High' rather than punishing it for being
 * unmeasurable.
 */
function detectPerformanceProfile(): string {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return 'High';
  const nav = navigator as Navigator & { deviceMemory?: number };
  const cores = nav.hardwareConcurrency || 8;
  const memoryGB = nav.deviceMemory ?? 8;
  const coarsePointer = window.matchMedia?.('(pointer: coarse)').matches ?? false;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const pixels = window.innerWidth * window.innerHeight * dpr * dpr;

  // Phones and tablets. Medium rather than Low for anything current: with the
  // render costs cut, the profiles' DPR and MSAA steps are worth ~0.15ms here
  // while the segment count is worth milliseconds, and Medium already takes
  // the solver from 9.9k constraints to 5.5k. Low additionally drops to DPR 1
  // with no MSAA, which is a visibly soft, jagged hero — worth it only on a
  // device that genuinely cannot keep up.
  if (coarsePointer) return cores <= 4 || memoryGB <= 4 ? 'Low' : 'Medium';
  if (cores <= 4 || memoryGB <= 4) return 'Medium';
  // A retina panel at full screen is fill-bound even on capable hardware:
  // ~6.5M pixels is where a 1728x1080 DPR-2 window lands.
  if (pixels > 6.5e6) return 'Medium';
  return 'High';
}

const PERFORMANCE_PROFILE = detectPerformanceProfile();

const SILVER_PARAMS: HoloParams = {
  performance: PERFORMANCE_PROFILE,
  physics: {
    // light air drag, not gel — the drape has to keep swinging on the line
    viscosity: 0.09,
    stiffness: 0.96,
    // Gauss-Seidel relaxation converges fast at this stiffness: the last
    // iterations were spending a full pass over every constraint to move
    // vertices by amounts too small to see. 8 holds the same drape.
    iterations: 8,
    smoothing: 0.02,
    grabRadius: 0.32,
  },
  material: {
    preset: 'Silver',
    finish: 'Satin',
    baseColor: '#f1f1ed',
    holoIntensity: 0,
    holoScale: 90,
    bandFreq: 1,
    saturation: 0,
    hueShift: 0,
    sparkle: 0,
    specTint: 0,
    iridescence: 0,
    roughness: 0.22,
    metalness: 0.92,
    clearcoat: 0.72,
    coatRoughness: 0.18,
    sheen: 0.08,
    transmission: 0,
    thickness: 0,
    ior: 1.45,
    opacity: 1,
    bump: 0.7,
    bumpTiling: 4,
  },
  images: {
    edit: false,
    useImage: true,
    scale: 0.92,
    rotation: 0,
    opacity: 1,
    cornerRadius: 0.06,
  },
  render: {
    background: '#ffffff',
    exposure: 0.78,
    environment: 1.05,
    bloom: 0,
    bloomThreshold: 1.4,
    noise: 0.025,
    toneMapping: 'Neutral',
    occlusion: true,
    occlusionStrength: 0.85,
    dof: false,
    dofAperture: 40,
    dofBlur: 0.04,
    dofRange: 0.3,
    colorBackdrop: true,
  },
};

const TAPE_PARAMS: HoloParams = {
  ...SILVER_PARAMS,
  material: {
    ...SILVER_PARAMS.material,
    preset: 'Clear Tape',
    finish: 'Glossy',
    baseColor: '#ffffff',
    roughness: 0.08,
    metalness: 0,
    clearcoat: 1,
    coatRoughness: 0.025,
    sheen: 0,
    transmission: 0.97,
    // Tape is a film, not a block of glass. thickness sets how far the
    // refracted ray is displaced, and three draws the sheet's far face into
    // the transmission background when a transmissive material is
    // double-sided — so anything but a hair's breadth here prints the artwork
    // a second time, offset, visible as a ghost layer from behind.
    thickness: 0.02,
    ior: 1.46,
    opacity: 1,
    bump: 0.32,
  },
  render: {
    ...SILVER_PARAMS.render,
    exposure: 0.82,
    environment: 1.35,
    bloom: 0.035,
    noise: 0.045,
    colorBackdrop: true,
  },
};

const HOLO_PARAMS: HoloParams = {
  ...SILVER_PARAMS,
  material: {
    ...SILVER_PARAMS.material,
    preset: 'Holo',
    finish: 'Matte',
    baseColor: '#20242d',
    holoIntensity: 3.78,
    holoScale: 400,
    bandFreq: 1.1,
    saturation: 1,
    hueShift: 0.37,
    sparkle: 0.73,
    specTint: 0.33,
    iridescence: 0.81,
    roughness: 0.62,
    metalness: 1,
    clearcoat: 0.06,
    coatRoughness: 0.7,
    sheen: 0,
    transmission: 0,
    thickness: 0,
    bump: 3,
    bumpTiling: 3,
  },
  render: {
    ...SILVER_PARAMS.render,
    exposure: 0.62,
    environment: 0.82,
    bloom: 0.05,
    bloomThreshold: 1.41,
    noise: 0.12,
    occlusionStrength: 1,
  },
};

const BLACK_CHROME_PARAMS: HoloParams = {
  ...SILVER_PARAMS,
  material: {
    ...SILVER_PARAMS.material,
    preset: 'Black Chrome',
    finish: 'Glossy',
    baseColor: '#080808',
    roughness: 0.1,
    metalness: 1,
    clearcoat: 0.9,
    coatRoughness: 0.08,
    iridescence: 0.08,
    bump: 0.5,
    bumpTiling: 5,
  },
  render: {
    ...SILVER_PARAMS.render,
    exposure: 0.9,
    environment: 1.5,
    noise: 0.035,
  },
};

const paramsFor = (version: MaterialVersion) => {
  if (version === 'silver') return SILVER_PARAMS;
  if (version === 'holo') return HOLO_PARAMS;
  if (version === 'black') return BLACK_CHROME_PARAMS;
  return TAPE_PARAMS;
};

const versionFromHash = (): MaterialVersion => {
  const h = window.location.hash.replace('#', '');
  return h === 'silver' || h === 'holo' || h === 'black' ? h : 'tape';
};

export default function App() {
  const hostRef = useRef<HTMLDivElement>(null);
  const heroRef = useRef<HTMLElement>(null);
  const appRef = useRef<HoloApp | null>(null);
  const photoRequestRef = useRef(0);
  const [photoIndex, setPhotoIndex] = useState(0);
  const [materialVersion, setMaterialVersion] = useState<MaterialVersion>(versionFromHash);

  useEffect(() => {
    if (!hostRef.current) return;

    const app = new HoloApp(hostRef.current);
    appRef.current = app;
    app.applyParams(paramsFor(versionFromHash()));
    app.reveal();

    const bump = new Image();
    bump.onload = () => app.setBumpMap(bump);
    bump.src = '/bump-scratches.jpg';

    return () => {
      app.dispose();
      appRef.current = null;
    };
  }, []);

  useEffect(() => {
    const onHashChange = () => setMaterialVersion(versionFromHash());
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  useEffect(() => {
    appRef.current?.applyParams(paramsFor(materialVersion));
    document.body.classList.add('portfolio-open');
    return () => document.body.classList.remove('portfolio-open');
  }, [materialVersion]);

  useEffect(() => {
    const app = appRef.current;
    const hero = heroRef.current;
    if (!app || !hero) return;

    const observer = new IntersectionObserver(
      ([entry]) => app.setActive(entry.isIntersecting),
      { threshold: 0.01 },
    );
    observer.observe(hero);
    return () => {
      observer.disconnect();
      app.setActive(true);
    };
  }, []);

  // drape the current photograph onto the cloth
  useEffect(() => {
    const app = appRef.current;
    const url = PHOTOS[photoIndex];
    if (!app || !url) return;

    const request = ++photoRequestRef.current;
    const image = new Image();
    image.onload = () => {
      if (photoRequestRef.current !== request || appRef.current !== app) return;
      app.setClothImage(image);
      // a fresh sheet for each photograph — re-run the opening drape
      app.resetCloth();
      app.applyParams(paramsFor(materialVersion));
    };
    image.src = url;
    // materialVersion is read but deliberately not a dependency: a material
    // switch re-applies params itself and must not re-drop the cloth
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [photoIndex]);

  const step = useCallback((delta: number) => {
    if (PHOTOS.length < 2) return;
    setPhotoIndex((i) => (i + delta + PHOTOS.length) % PHOTOS.length);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') step(1);
      if (e.key === 'ArrowLeft') step(-1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [step]);

  const counter = `${String(photoIndex + 1).padStart(2, '0')} / ${String(PHOTOS.length).padStart(2, '0')}`;

  return (
    <main className="site is-portfolio" aria-label="Theo Azriel — photographs">
      <div id="canvas-host" ref={hostRef} aria-hidden="true" />

      <header className="portfolio-header">
        <a className="wordmark" href="https://theoazriel.com">Theo Azriel</a>
        <nav className="section-nav" aria-label="Site links">
          <a href="https://theoazriel.com">Home</a>
        </nav>
      </header>

      <section className="portfolio-hero" ref={heroRef} aria-labelledby="portfolio-title">
        <h1 id="portfolio-title" className="sr-only">Photographs by Theo Azriel</h1>
        <div className="hero-caption" aria-hidden="true">
          <p>Photographs</p>
          <p>Drag the cloth</p>
        </div>
        {PHOTOS.length > 1 && (
          <div className="gallery-nav">
            <button type="button" aria-label="Previous photograph" onClick={() => step(-1)}>
              ←
            </button>
            <span className="gallery-counter" aria-live="polite">{counter}</span>
            <button type="button" aria-label="Next photograph" onClick={() => step(1)}>
              →
            </button>
          </div>
        )}
      </section>
    </main>
  );
}
