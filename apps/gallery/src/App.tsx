import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { motion, useReducedMotion } from 'motion/react';

type Photo = {
  path: string;
  url: string;
  srcSet?: string;
  title: string;
};

type PhotoGroup = {
  id: string;
  title: string;
  photos: Photo[];
};

/**
 * Drop images into a folder under src/photos and the folder becomes a roll on
 * the next build. Loose images at the top level gather into "Loose frames".
 */
/** Responsive WebP renditions for the grid, generated at build time by vite-imagetools. */
const THUMB_SRCSETS = import.meta.glob('./photos/**/*.{jpg,jpeg,JPG,JPEG}', {
  eager: true,
  query: '?w=320;640;1280&format=webp&as=srcset',
  import: 'default',
}) as Record<string, string>;

const PHOTOS: Photo[] = Object.entries(
  import.meta.glob('./photos/**/*.{jpg,jpeg,png,webp,avif,svg,JPG,JPEG,PNG,WEBP,AVIF}', {
    eager: true,
    query: '?url',
    import: 'default',
  }),
)
  .sort(([a], [b]) => a.localeCompare(b))
  .map(([path, url]) => ({
    path,
    url: url as string,
    srcSet: THUMB_SRCSETS[path],
    title: titleFrom(path),
  }));

/** Folders listed here come first, in this order; the rest follow alphabetically. */
const GROUP_ORDER = ['hokkaido', 'guangzhou', 'osaka'];
const LOOSE_GROUP = 'loose-frames';

function folderFrom(path: string) {
  const segments = path.split('/');
  return segments.length > 3 ? segments[2] : LOOSE_GROUP;
}

const GROUPS: PhotoGroup[] = [...new Set(PHOTOS.map((photo) => folderFrom(photo.path)))]
  .sort((a, b) => {
    const rank = (folder: string) => {
      if (folder === LOOSE_GROUP) return GROUP_ORDER.length + 1;
      const index = GROUP_ORDER.indexOf(folder);
      return index === -1 ? GROUP_ORDER.length : index;
    };
    return rank(a) - rank(b) || a.localeCompare(b);
  })
  .map((folder) => ({
    id: folder,
    title: folder === LOOSE_GROUP ? 'Loose frames' : titleFrom(`/${folder}`),
    photos: PHOTOS.filter((photo) => folderFrom(photo.path) === folder),
  }));

const STACK_TRANSFORMS = [
  'translate3d(-40px, 18px, 0) rotate(-7deg)',
  'translate3d(28px, -14px, 0) rotate(5deg)',
  'translate3d(-12px, -26px, 0) rotate(-2deg)',
  'translate3d(22px, 20px, 0) rotate(4deg)',
];

const STACK_SPRING = { type: 'spring' as const, duration: 0.5, bounce: 0.16 };
const GROUP_FOCUS_LINE = 0.5;

function titleFrom(path: string) {
  const stem = path.split('/').pop()!.replace(/\.[^.]+$/, '');
  return stem
    .replace(/^\d+[-_]?/, '')
    .replace(/[-_]+/g, ' ')
    .replace(/^\w/, (character) => character.toUpperCase());
}

const number = (index: number) => String(index + 1).padStart(2, '0');

/** A small, stable tilt and drift per photo, so open rolls sit loose on the page. */
function scatterFrom(path: string) {
  let hash = 0;
  for (const character of path) hash = (hash * 31 + character.charCodeAt(0)) % 1000003;
  const pick = (shift: number, span: number) => (((hash >> shift) % 100) / 100) * span - span / 2;
  return `translate3d(${pick(2, 12).toFixed(1)}px, ${pick(4, 16).toFixed(1)}px, 0) rotate(${pick(6, 4.2).toFixed(2)}deg)`;
}

export default function App() {
  const [openGroupId, setOpenGroupId] = useState<string | null>(GROUPS[0]?.id ?? null);
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  const groupRefs = useRef<Record<string, HTMLElement | null>>({});
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (expandedIndex === null) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setExpandedIndex(null);
      if (event.key === 'ArrowRight') {
        setExpandedIndex((current) => current === null ? null : (current + 1) % PHOTOS.length);
      }
      if (event.key === 'ArrowLeft') {
        setExpandedIndex((current) => current === null ? null : (current - 1 + PHOTOS.length) % PHOTOS.length);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [expandedIndex]);

  useEffect(() => {
    let frame = 0;

    const updateGroupInView = () => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => {
        const focusLine = window.innerHeight * GROUP_FOCUS_LINE;
        let nextGroupId = GROUPS[0]?.id ?? null;

        GROUPS.forEach((group) => {
          const section = groupRefs.current[group.id];
          if (section && section.getBoundingClientRect().top <= focusLine) {
            nextGroupId = group.id;
          }
        });

        setOpenGroupId((current) => current === nextGroupId ? current : nextGroupId);
      });
    };

    updateGroupInView();
    window.addEventListener('scroll', updateGroupInView, { passive: true });
    window.addEventListener('resize', updateGroupInView);

    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener('scroll', updateGroupInView);
      window.removeEventListener('resize', updateGroupInView);
    };
  }, []);

  const focusGroup = (groupId: string) => {
    const section = groupRefs.current[groupId];
    if (!section) return;

    const target = window.scrollY
      + section.getBoundingClientRect().top
      - window.innerHeight * GROUP_FOCUS_LINE;

    window.scrollTo({
      top: Math.max(0, target),
      behavior: reduceMotion ? 'auto' : 'smooth',
    });
  };

  const expandedPhoto = expandedIndex === null ? null : PHOTOS[expandedIndex];

  return (
    <>
      <div className="page-shell">
        <header className="topbar">
          <a className="home-link" href="https://theoazriel.com">
            <span aria-hidden="true">←</span> Home
          </a>
        </header>

        <main className="gallery-layout">
          <aside className="group-index" aria-label="Photo groups">
            <p className="index-label">Index</p>
            <ol>
              {GROUPS.map((group) => {
                const isOpen = openGroupId === group.id;
                return (
                  <li key={group.id}>
                    <button
                      className={isOpen ? 'is-active' : undefined}
                      type="button"
                      onClick={() => focusGroup(group.id)}
                      aria-expanded={isOpen}
                      aria-controls={group.id}
                    >
                      <span>{group.title}</span>
                      <span className="index-number">{number(GROUPS.indexOf(group))}</span>
                    </button>
                  </li>
                );
              })}
            </ol>
          </aside>

          <div className="groups">
            <h1 className="sr-only">Photographs</h1>
            {GROUPS.map((group) => {
              const isOpen = openGroupId === group.id;
              const gridStyle = {
                '--desktop-columns': Math.min(group.photos.length, 4),
                '--mobile-columns': Math.min(group.photos.length, 2),
              } as CSSProperties;

              return (
                <section
                  className={`photo-group ${isOpen ? 'is-open' : 'is-closed'}`}
                  id={group.id}
                  key={group.id}
                  ref={(element) => { groupRefs.current[group.id] = element; }}
                  aria-labelledby={`${group.id}-title`}
                >
                  <header className="group-heading">
                    <h2 id={`${group.id}-title`}>{group.title}</h2>
                    <p>{group.photos.length} {group.photos.length === 1 ? 'frame' : 'frames'}</p>
                  </header>

                  <motion.div
                    className={`photo-grid ${isOpen ? 'is-tidy' : 'is-stacked'}`}
                    layout={!reduceMotion}
                    style={gridStyle}
                    transition={reduceMotion ? { duration: 0 } : STACK_SPRING}
                  >
                    {group.photos.map((photo, index) => (
                      <motion.figure
                        className="photo-card"
                        key={photo.path}
                        layout={!reduceMotion}
                        transition={reduceMotion ? { duration: 0 } : STACK_SPRING}
                        style={{ zIndex: isOpen ? 1 : index + 1 }}
                        aria-hidden={isOpen ? undefined : true}
                      >
                        <motion.div
                          className="card-motion"
                          initial={false}
                          animate={{
                            transform: reduceMotion
                              ? 'translate3d(0, 0, 0) rotate(0deg)'
                              : isOpen
                                ? scatterFrom(photo.path)
                                : STACK_TRANSFORMS[index % STACK_TRANSFORMS.length],
                          }}
                          transition={reduceMotion
                            ? { duration: 0 }
                            : { ...STACK_SPRING, delay: isOpen ? index * 0.045 : 0 }}
                        >
                          <button
                            className="print"
                            type="button"
                            onClick={() => setExpandedIndex(PHOTOS.indexOf(photo))}
                            aria-label={`Open ${photo.title}`}
                            disabled={!isOpen}
                            tabIndex={isOpen ? 0 : -1}
                          >
                            <span className="print-image">
                              <img
                                src={photo.url}
                                srcSet={photo.srcSet}
                                sizes="(max-width: 700px) 46vw, 222px"
                                alt={photo.title}
                                loading={isOpen ? 'eager' : 'lazy'}
                                decoding="async"
                                ref={(element) => {
                                  if (element?.complete) element.classList.add('is-loaded');
                                }}
                                onLoad={(event) => event.currentTarget.classList.add('is-loaded')}
                              />
                            </span>
                          </button>
                          <figcaption>
                            <span>{photo.title}</span>
                            <span>{number(index)}</span>
                          </figcaption>
                        </motion.div>
                      </motion.figure>
                    ))}

                    {!isOpen && (
                      <button
                        className="stack-trigger"
                        type="button"
                        onClick={() => focusGroup(group.id)}
                        aria-expanded="false"
                        aria-controls={group.id}
                      >
                        <span className="sr-only">Open {group.title}</span>
                      </button>
                    )}
                  </motion.div>

                </section>
              );
            })}
          </div>
        </main>
      </div>

      {expandedPhoto && expandedIndex !== null && (
        <div
          className="lightbox"
          role="dialog"
          aria-modal="true"
          aria-label={`${expandedPhoto.title}, full screen`}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setExpandedIndex(null);
          }}
        >
          <img src={expandedPhoto.url} alt={expandedPhoto.title} />
          <p className="lightbox-caption">
            <span>{expandedPhoto.title}</span>
            <span>{number(expandedIndex)} / {number(PHOTOS.length - 1)}</span>
          </p>
          <button
            type="button"
            className="lightbox-close"
            onClick={() => setExpandedIndex(null)}
            aria-label="Close photograph"
            autoFocus
          >
            <span aria-hidden="true">×</span>
          </button>
        </div>
      )}
    </>
  );
}
