import { useEffect, useState } from 'react';

type Photo = {
  path: string;
  url: string;
  title: string;
};

/** Drop an image into src/photos and it joins the gallery on the next build. */
const PHOTOS: Photo[] = Object.entries(
  import.meta.glob('./photos/*.{jpg,jpeg,png,webp,avif,svg}', {
    eager: true,
    query: '?url',
    import: 'default',
  }),
)
  .sort(([a], [b]) => a.localeCompare(b))
  .map(([path, url]) => ({ path, url: url as string, title: titleFrom(path) }));

function titleFrom(path: string) {
  const stem = path.split('/').pop()!.replace(/\.[^.]+$/, '');
  return stem
    .replace(/^\d+[-_]?/, '')
    .replace(/[-_]+/g, ' ')
    .replace(/^\w/, (character) => character.toUpperCase());
}

const number = (index: number) => String(index + 1).padStart(2, '0');

export default function App() {
  const [expandedPhoto, setExpandedPhoto] = useState<Photo | null>(null);

  useEffect(() => {
    const items = document.querySelectorAll<HTMLElement>('[data-photo-index]');
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const target = entry.target as HTMLElement;
          target.dataset.visible = 'true';
        });
      },
      { rootMargin: '-30% 0px -45%', threshold: 0 },
    );

    items.forEach((item) => observer.observe(item));
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!expandedPhoto) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setExpandedPhoto(null);
    };
    window.addEventListener('keydown', closeOnEscape);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', closeOnEscape);
    };
  }, [expandedPhoto]);

  return (
    <>
      <header className="site-header">
        <a className="title" href="https://theoazriel.com" aria-label="Theo Azriel home">
          <img className="mark" src="/favicon.svg" alt="" width={56} height={56} />
          Theo Azriel
        </a>
        <nav aria-label="Primary navigation">
          <p><a href="https://theoazriel.com">Home</a></p>
        </nav>
      </header>

      <main>
        <header className="intro">
          <h1>Photographs</h1>
          <p className="muted">Places, mostly quiet ones.</p>
        </header>

        <div className="photos">
          {PHOTOS.map((photo, index) => (
            <figure
              className="photo-entry"
              key={photo.path}
              data-photo-index={index}
              data-visible={index === 0 ? 'true' : undefined}
            >
              <button className="image-button" type="button" onClick={() => setExpandedPhoto(photo)} aria-label={`View ${photo.title} full screen`}>
                <img src={photo.url} alt={photo.title} loading={index === 0 ? 'eager' : 'lazy'} decoding="async" />
                <span className="view-cue" aria-hidden="true">View</span>
              </button>
              <figcaption>
                <span>{photo.title}</span>
                <span className="index">{number(index)}</span>
              </figcaption>
            </figure>
          ))}
        </div>
      </main>

      <footer className="site-footer">
        <p><a href="mailto:theo.azriel@icloud.com">Email</a></p>
      </footer>

      {expandedPhoto && (
        <div className="lightbox" role="dialog" aria-modal="true" aria-label={`${expandedPhoto.title}, full screen`} onMouseDown={(event) => {
          if (event.target === event.currentTarget) setExpandedPhoto(null);
        }}>
          <img src={expandedPhoto.url} alt={expandedPhoto.title} />
          <div className="lightbox-caption">
            <span>{expandedPhoto.title}</span>
            <span>{number(PHOTOS.indexOf(expandedPhoto))} / {number(PHOTOS.length - 1)}</span>
          </div>
          <button type="button" className="lightbox-close" onClick={() => setExpandedPhoto(null)} autoFocus>
            Close <span aria-hidden="true">×</span>
          </button>
        </div>
      )}
    </>
  );
}
