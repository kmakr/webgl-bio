import { useEffect, useRef, useState } from 'react';
import { HoloApp, type HoloParams } from './scene.ts';

const STATIC_QUOTE = 'Useful things do not need to shout.';
const A4_LANDSCAPE_ASPECT = Math.SQRT2;

type MaterialVersion = 'silver' | 'tape';

const SILVER_PARAMS: HoloParams = {
  performance: 'High',
  physics: {
    viscosity: 0.58,
    stiffness: 0.96,
    iterations: 14,
    smoothing: 0.05,
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
    useImage: false,
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
    thickness: 0.24,
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

const paramsFor = (version: MaterialVersion) =>
  version === 'silver' ? SILVER_PARAMS : TAPE_PARAMS;

function drawBarcode(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  code: string,
) {
  const bits = `1101001${[...code]
    .map((digit, index) => {
      const value = Number(digit) + index * 3;
      return value.toString(2).padStart(5, '0') + '10';
    })
    .join('')}1100011`;
  const barWidth = width / bits.length;

  ctx.save();
  ctx.fillStyle = '#050505';
  for (let index = 0; index < bits.length; index += 1) {
    if (bits[index] === '1') ctx.fillRect(x + index * barWidth, y, barWidth + 0.65, height);
  }
  ctx.font = '400 21px "IBM Plex Mono", monospace';
  ctx.letterSpacing = '0px';
  ctx.fillText(code, x, y + height + 30);
  ctx.restore();
}

export default function App() {
  const hostRef = useRef<HTMLDivElement>(null);
  const heroRef = useRef<HTMLElement>(null);
  const appRef = useRef<HoloApp | null>(null);
  const textureRequestRef = useRef(0);
  const [materialVersion, setMaterialVersion] = useState<MaterialVersion>(() =>
    location.hash === '#silver' ? 'silver' : 'tape',
  );

  useEffect(() => {
    if (!hostRef.current) return;

    const app = new HoloApp(hostRef.current);
    appRef.current = app;
    app.setClothAspect(A4_LANDSCAPE_ASPECT);
    app.applyParams(SILVER_PARAMS);
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
    appRef.current?.applyParams(paramsFor(materialVersion));
    document.body.classList.add('portfolio-open');
    history.replaceState(null, '', materialVersion === 'silver' ? '#silver' : '#tape');

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

  useEffect(() => {
    const app = appRef.current;
    if (!app) return;

    const request = ++textureRequestRef.current;
    const renderPrint = async () => {
      await Promise.all([
        document.fonts.load('600 300px "IBM Plex Mono"'),
        document.fonts.load('400 34px "IBM Plex Mono"'),
      ]);
      if (textureRequestRef.current !== request || appRef.current !== app) return;

      const canvas = document.createElement('canvas');
      canvas.width = 1754;
      canvas.height = 1240;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#050505';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'alphabetic';
      ctx.letterSpacing = '0px';
      const printLeft = 120;
      ctx.font = '600 280px "IBM Plex Mono", monospace';
      ctx.fillText('THEO', printLeft, 420);
      ctx.fillText('AZRIEL', printLeft, 710);

      ctx.font = '400 34px "IBM Plex Mono", monospace';
      ctx.fillText(`“${STATIC_QUOTE.toUpperCase()}”`, printLeft, 900, 1250);

      drawBarcode(ctx, printLeft, 1010, 520, 92, '260419920104');

      const image = new Image();
      image.onload = () => {
        if (textureRequestRef.current !== request || appRef.current !== app) return;
        if (app.getDecalThumbnails().length > 0) app.removeDecal(0);
        app.addDecal(image);
        app.applyParams(paramsFor(materialVersion));
      };
      image.src = canvas.toDataURL('image/png');
    };
    void renderPrint();
  }, [materialVersion]);

  const scrollToSection = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <main className="site is-portfolio" aria-label="Theo Azriel personal site">
      <div id="canvas-host" ref={hostRef} aria-hidden="true" />

      <header className="portfolio-header">
        <span className="wordmark">Theo Azriel</span>
        <nav className="section-nav" aria-label="Page sections">
          <button type="button" onClick={() => scrollToSection('work')}>Work</button>
          <button type="button" onClick={() => scrollToSection('about')}>About</button>
          <a href="https://notes.theoazriel.com">Notes</a>
          <button type="button" onClick={() => scrollToSection('contact')}>Contact</button>
        </nav>
      </header>

      <nav className="versions" aria-label="Material versions">
        <button
          className={materialVersion === 'silver' ? 'is-active' : ''}
          type="button"
          aria-pressed={materialVersion === 'silver'}
          onClick={() => setMaterialVersion('silver')}
        >
          Silver
        </button>
        <button
          className={materialVersion === 'tape' ? 'is-active' : ''}
          type="button"
          aria-pressed={materialVersion === 'tape'}
          onClick={() => setMaterialVersion('tape')}
        >
          Clear tape
        </button>
      </nav>

      <section className="portfolio-hero" ref={heroRef} aria-labelledby="portfolio-title">
            <h1 id="portfolio-title" className="sr-only">Theo Azriel</h1>
            <div className="hero-caption" aria-hidden="true">
              <p>Designer + engineer</p>
              <p>Interfaces / systems / experiments</p>
            </div>
            <button className="scroll-cue" type="button" onClick={() => scrollToSection('work')}>
              View work <span aria-hidden="true">↓</span>
            </button>
          </section>

          <section className="content-section work-section" id="work" aria-labelledby="work-title">
            <header className="section-heading">
              <h2 id="work-title">Selected work</h2>
              <p>2024—Now</p>
            </header>
            <div className="work-list">
              <article className="work-row">
                <h3>Interface systems</h3>
                <p>Product design + engineering</p>
                <p>Ongoing</p>
              </article>
              <article className="work-row">
                <h3>Applied experiments</h3>
                <p>Prototypes + research</p>
                <p>Archive</p>
              </article>
            </div>
          </section>

          <section className="content-section about-section" id="about" aria-labelledby="about-title">
            <div className="section-heading">
              <h2 id="about-title">About</h2>
              <p>Hong Kong</p>
            </div>
            <p className="about-copy">
              I design and build interfaces, tools, and systems. My work connects product design,
              software engineering, and focused experiments.
            </p>
          </section>

          <footer className="content-section contact-section" id="contact">
            <p>Start a conversation</p>
            <a href="mailto:theo.azriel@icloud.com">theo.azriel@icloud.com</a>
            <div className="footer-line">
              <span>Theo Azriel</span>
              <span>© 2026</span>
            </div>
          </footer>
    </main>
  );
}
