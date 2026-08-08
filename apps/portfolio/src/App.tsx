import { useEffect, useRef } from 'react';
import { HoloApp, type HoloParams } from './scene.ts';

const STATIC_QUOTE = 'Useful things do not need to shout.';
const A4_LANDSCAPE_ASPECT = Math.SQRT2;

type MaterialVersion =
  | 'tape'
  | 'holo'
  | 'black';

const SILVER_PARAMS: HoloParams = {
  performance: 'High',
  physics: {
    // light air drag, not gel — the drape has to keep swinging on the line
    viscosity: 0.09,
    stiffness: 0.96,
    iterations: 14,
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
  if (version === 'holo') return HOLO_PARAMS;
  if (version === 'black') return BLACK_CHROME_PARAMS;
  return TAPE_PARAMS;
};

function drawBarcode(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  code: string,
  color: string,
) {
  const bits = `1101001${[...code]
    .map((digit, index) => {
      const value = Number(digit) + index * 3;
      return value.toString(2).padStart(5, '0') + '10';
    })
    .join('')}1100011`;
  const barWidth = width / bits.length;

  ctx.save();
  ctx.fillStyle = color;
  for (let index = 0; index < bits.length; index += 1) {
    if (bits[index] === '1') ctx.fillRect(x + index * barWidth, y, barWidth + 0.65, height);
  }
  ctx.font = '400 17px "IBM Plex Mono", monospace';
  ctx.letterSpacing = '0px';
  ctx.fillText(code, x, y + height + 30);
  ctx.restore();
}

export default function App() {
  const hostRef = useRef<HTMLDivElement>(null);
  const heroRef = useRef<HTMLElement>(null);
  const appRef = useRef<HoloApp | null>(null);
  const textureRequestRef = useRef(0);
  const materialVersion: MaterialVersion = 'tape';

  useEffect(() => {
    if (!hostRef.current) return;

    const app = new HoloApp(hostRef.current);
    appRef.current = app;
    app.setClothAspect(A4_LANDSCAPE_ASPECT);
    app.applyParams(paramsFor(materialVersion));
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
    history.replaceState(null, '', `#${materialVersion}`);

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
        document.fonts.load('600 190px "IBM Plex Mono"'),
        document.fonts.load('400 28px "IBM Plex Mono"'),
      ]);
      if (textureRequestRef.current !== request || appRef.current !== app) return;

      const canvas = document.createElement('canvas');
      canvas.width = 1754;
      canvas.height = 1240;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const inkColor = paramsFor(materialVersion).material.preset === 'Black Chrome'
        ? '#f5f5f1'
        : '#050505';
      ctx.fillStyle = inkColor;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'alphabetic';
      ctx.letterSpacing = '0px';
      const printLeft = 150;

      ctx.save();
      ctx.globalAlpha = 0.54;
      ctx.font = '400 17px "IBM Plex Mono", monospace';
      for (let y = 70; y < canvas.height; y += 58) {
        for (let x = 42; x < canvas.width; x += 330) {
          const offset = (Math.floor(y / 58) % 2) * 132;
          ctx.fillText('theo azriel / authentic / 26041992', x - offset, y);
        }
      }
      ctx.restore();

      ctx.font = '600 190px "IBM Plex Mono", monospace';
      ctx.fillText('theo', printLeft, 340);
      ctx.fillText('azriel', printLeft, 550);

      ctx.font = '400 28px "IBM Plex Mono", monospace';
      ctx.fillText(`“${STATIC_QUOTE.toLowerCase()}”`, printLeft, 770, 1120);

      drawBarcode(ctx, printLeft, 890, 430, 70, '260419920104', inkColor);

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
