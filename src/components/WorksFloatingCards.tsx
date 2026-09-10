import {
  CSSProperties,
  ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState
} from 'react';
import { SeoFooter } from '@/components/SeoFooter';
import { WordPressWork, getWordPressWorks } from '../lib/wordpress';

type FloatingContextType = {
  registerElement: (id: string, element: HTMLDivElement, depth: number) => void;
  unregisterElement: (id: string) => void;
};

type FloatingElementData = {
  element: HTMLDivElement;
  depth: number;
  currentPosition: { x: number; y: number };
};

type FloatingLayerProps = {
  children: ReactNode;
  className?: string;
  sensitivity?: number;
  easingFactor?: number;
  maxShift?: number;
  style?: CSSProperties;
  'aria-hidden'?: boolean;
};

type FloatingElementProps = {
  children: ReactNode;
  className?: string;
  depth?: number;
};

export type WorkCard = {
  id: string;
  slug: string;
  depth: number;
  x: number;
  y: number;
  width: string;
  tone: string;
  title: string;
  category: string;
  image: string;
  excerpt: string;
  contentHtml: string;
  sourceUrl?: string;
};

type ProjectDetailData = {
  eyebrow: string;
  title: string;
  summary: string;
  heroImage: string;
  heroBackground: string;
  logoImages: string[];
  contentImage: string;
  sections: Array<{
    label: string;
    body: string;
  }>;
};

type WorkSlot = Pick<WorkCard, 'depth' | 'x' | 'y' | 'width' | 'tone' | 'image'>;

const FloatingContext = createContext<FloatingContextType | null>(null);

const workSlots: WorkSlot[] = [
  {
    depth: 0.62,
    x: 13,
    y: 20,
    width: 'clamp(120px, 13vw, 200px)',
    tone: 'warm',
    image: '/PIC/Frame 146.png'
  },
  {
    depth: 1.16,
    x: 36,
    y: 12,
    width: 'clamp(180px, 19.5vw, 300px)',
    tone: 'blue',
    image: '/PIC/Frame 147.png'
  },
  {
    depth: 0.88,
    x: 58,
    y: 68,
    width: 'clamp(144px, 15.6vw, 240px)',
    tone: 'olive',
    image: '/PIC/Frame 148.png'
  },
  {
    depth: 1.36,
    x: 83,
    y: 24,
    width: 'clamp(156px, 16.9vw, 260px)',
    tone: 'rose',
    image: '/PIC/Frame 149.png'
  },
  {
    depth: 0.74,
    x: 21,
    y: 61,
    width: 'clamp(132px, 14.3vw, 220px)',
    tone: 'charcoal',
    image: '/PIC/Frame 146.png'
  },
  {
    depth: 1.04,
    x: 46,
    y: 39,
    width: 'clamp(168px, 18.2vw, 280px)',
    tone: 'gold',
    image: '/PIC/Frame 147.png'
  },
  {
    depth: 0.68,
    x: 72,
    y: 48,
    width: 'clamp(120px, 13vw, 200px)',
    tone: 'paper',
    image: '/PIC/Frame 148.png'
  },
  {
    depth: 1.24,
    x: 91,
    y: 72,
    width: 'clamp(180px, 19.5vw, 300px)',
    tone: 'warm',
    image: '/PIC/Frame 149.png'
  },
  {
    depth: 0.96,
    x: 8,
    y: 78,
    width: 'clamp(144px, 15.6vw, 240px)',
    tone: 'blue',
    image: '/PIC/Frame 146.png'
  },
  {
    depth: 1.42,
    x: 64,
    y: 18,
    width: 'clamp(156px, 16.9vw, 260px)',
    tone: 'olive',
    image: '/PIC/Frame 147.png'
  }
];

const fallbackWorks: Array<Omit<WorkCard, keyof WorkSlot>> = [
  {
    id: 'fotland',
    slug: 'fotland-bryggeri',
    title: 'Fotland Bryggeri',
    category: 'Logo Design & Branding',
    excerpt: 'A quiet identity system for a small family brewery in Oslo.',
    contentHtml: ''
  },
  {
    id: 'system',
    slug: 'interface-rhythm',
    title: 'Interface Rhythm',
    category: 'Digital Product',
    excerpt: 'A product interface study for spacing, motion, and visual hierarchy.',
    contentHtml: ''
  },
  {
    id: 'campaign',
    slug: 'campaign-frame',
    title: 'Campaign Frame',
    category: 'Creative Direction',
    excerpt: 'A campaign frame exploring image, typography, and composition.',
    contentHtml: ''
  },
  {
    id: 'editorial',
    slug: 'editorial-motion',
    title: 'Editorial Motion',
    category: 'Visual Story',
    excerpt: 'A visual story sample built around editorial rhythm and motion.',
    contentHtml: ''
  }
];

const projectDetails: Record<string, ProjectDetailData> = {
  'fotland-bryggeri': {
    eyebrow: 'Logo Design & Branding',
    title: 'Fotland Bryggeri',
    summary: 'A simple, honest logo direction for a family run brewery built around local ingredients, close community, and the house at the center of the brand.',
    heroImage: '/PIC/fotland_bryggeri/logo.svg',
    heroBackground: '/PIC/fotland_bryggeri/top_part_background.png',
    logoImages: [
      '/PIC/fotland_bryggeri/logo.svg'
    ],
    contentImage: '/PIC/fotland_bryggeri/content-pic.png',
    sections: [
      {
        label: 'About brand',
        body: 'Fotland Bryggeri is a small family run brewery with its main audience made up of close family and friends. Most ingredients are locally sourced from Oslo, where the brewery is located.'
      },
      {
        label: 'Goals',
        body: 'The client for Fotland Bryggeri\'s logo requested a design that is simple and unpretentious, reflecting the authenticity of the brand. They specifically wanted the brewery house to be incorporated into the logo, highlighting its importance as a central element of their identity.'
      }
    ]
  }
};

function getWorkSlot(index: number): WorkSlot {
  const slot = workSlots[index % workSlots.length];
  if (index < workSlots.length) return slot;

  const cycle = Math.floor(index / workSlots.length);
  const x = (slot.x + cycle * 11) % 92;
  const y = (slot.y + cycle * 17) % 84;

  return {
    ...slot,
    x: Math.max(6, x),
    y: Math.max(10, y),
    depth: slot.depth + (cycle % 3) * 0.08
  };
}

function composeCards(cmsWorks: WordPressWork[] = []): WorkCard[] {
  const works = cmsWorks.length > 0 ? cmsWorks : fallbackWorks;

  return works.map((work, index) => {
    const cmsWork = cmsWorks[index];
    const slot = getWorkSlot(index);

    return {
      ...slot,
      ...work,
      image: cmsWork?.image ?? slot.image,
      id: cmsWork?.id ?? work.id,
      slug: cmsWork?.slug ?? work.slug
    };
  });
}

export function composeProjectCards(cmsWorks: WordPressWork[] = []) {
  return composeCards(cmsWorks);
}

function getProjectDetail(work: WorkCard): ProjectDetailData | null {
  if (projectDetails[work.slug]) return projectDetails[work.slug];

  if (work.title.toLowerCase().includes('fotland')) {
    return projectDetails['fotland-bryggeri'];
  }

  return null;
}

function getWorkDescription(work: WorkCard) {
  const detail = getProjectDetail(work);
  return detail?.summary || work.excerpt || `${work.title} project detail by AZ Studio.`;
}

function createWorkFromDetail(slug: string): WorkCard | null {
  const detail = projectDetails[slug];
  if (!detail) return null;

  return {
    ...workSlots[0],
    id: slug,
    slug,
    title: detail.title,
    category: detail.eyebrow,
    image: detail.heroImage,
    excerpt: detail.summary,
    contentHtml: ''
  };
}

function MoreProjects({ projects, currentSlug }: { projects: WorkCard[]; currentSlug: string }) {
  const relatedProjects = projects.filter((project) => project.slug !== currentSlug).slice(0, 3);

  if (relatedProjects.length === 0) return null;

  return (
    <section className="project-more" aria-labelledby="project-more-heading">
      <div className="project-more-header">
        <p>Selected work</p>
        <h2 id="project-more-heading">other projects</h2>
      </div>
      <div className="project-more-grid">
        {relatedProjects.map((project) => (
          <a key={project.slug} className="project-more-card" href={`/projects/${project.slug}`}>
            <img src={project.image} alt="" loading="lazy" />
            <span>
              <small>{project.category}</small>
              <strong>{project.title}</strong>
            </span>
          </a>
        ))}
      </div>
    </section>
  );
}

function joinClass(...classes: Array<string | undefined>) {
  return classes.filter(Boolean).join(' ');
}

function clamp(value: number, min = 0, max = 1) {
  return Math.min(Math.max(value, min), max);
}

function map(value: number, inMin: number, inMax: number, outMin: number, outMax: number) {
  const t = clamp((value - inMin) / (inMax - inMin));
  return outMin + (outMax - outMin) * t;
}

function easeOut(t: number) {
  const v = clamp(t);
  return 1 - Math.pow(1 - v, 3);
}

function easeInOut(t: number) {
  const v = clamp(t);
  return v < 0.5 ? 2 * v * v : 1 - Math.pow(-2 * v + 2, 2) / 2;
}

function FloatingLayer({
  children,
  className,
  sensitivity = 0.55,
  easingFactor = 0.06,
  maxShift = 36,
  style,
  'aria-hidden': ariaHidden
}: FloatingLayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const pointerRef = useRef({ x: 0, y: 0 });
  const elementsMap = useRef(new Map<string, FloatingElementData>());

  const registerElement = useCallback((id: string, element: HTMLDivElement, depth: number) => {
    elementsMap.current.set(id, {
      element,
      depth,
      currentPosition: { x: 0, y: 0 }
    });
  }, []);

  const unregisterElement = useCallback((id: string) => {
    elementsMap.current.delete(id);
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return undefined;

    const handlePointerMove = (event: PointerEvent) => {
      const rect = container.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      pointerRef.current = {
        x: (event.clientX - centerX) / (rect.width / 2),
        y: (event.clientY - centerY) / (rect.height / 2)
      };
    };

    const handlePointerLeave = () => {
      pointerRef.current = { x: 0, y: 0 };
    };

    container.addEventListener('pointermove', handlePointerMove);
    container.addEventListener('pointerleave', handlePointerLeave);

    return () => {
      container.removeEventListener('pointermove', handlePointerMove);
      container.removeEventListener('pointerleave', handlePointerLeave);
    };
  }, []);

  useEffect(() => {
    let frameId = 0;

    const tick = () => {
      elementsMap.current.forEach((data) => {
        const strength = data.depth * sensitivity;
        const targetX = -pointerRef.current.x * maxShift * strength;
        const targetY = -pointerRef.current.y * maxShift * strength;
        const dx = targetX - data.currentPosition.x;
        const dy = targetY - data.currentPosition.y;

        data.currentPosition.x += dx * easingFactor;
        data.currentPosition.y += dy * easingFactor;
        data.element.style.transform = `translate3d(${data.currentPosition.x}px, ${data.currentPosition.y}px, 0)`;
      });

      frameId = requestAnimationFrame(tick);
    };

    frameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameId);
  }, [easingFactor, maxShift, sensitivity]);

  const contextValue = useMemo(
    () => ({ registerElement, unregisterElement }),
    [registerElement, unregisterElement]
  );

  return (
    <FloatingContext.Provider value={contextValue}>
      <div ref={containerRef} className={joinClass('works-floating-layer', className)} style={style} aria-hidden={ariaHidden}>
        {children}
      </div>
    </FloatingContext.Provider>
  );
}

function FloatingElement({ children, className, depth = 0.3 }: FloatingElementProps) {
  const elementRef = useRef<HTMLDivElement>(null);
  const idRef = useRef(crypto.randomUUID());
  const context = useContext(FloatingContext);

  useEffect(() => {
    if (!elementRef.current || !context) return undefined;

    context.registerElement(idRef.current, elementRef.current, depth);
    return () => context.unregisterElement(idRef.current);
  }, [context, depth]);

  return (
    <div ref={elementRef} className={joinClass('works-floating-element', className)}>
      {children}
    </div>
  );
}

export function WorksFloatingCards({ progress }: { progress: number }) {
  const [activeSlug, setActiveSlug] = useState(() => getProjectSlugFromPath());
  const [cards, setCards] = useState<WorkCard[]>(() => composeCards());
  const previousLocationRef = useRef<string | null>(null);
  const previousScrollYRef = useRef<number | null>(null);
  const enter = easeOut(map(progress, 0.48, 0.62, 0, 1));
  const leave = easeInOut(map(progress, 0.76, 0.88, 0, 1));
  const presence = clamp(enter * (1 - leave));
  const isVisible = presence > 0.01;
  const isInteractive = presence > 0.12;
  const activeWork = cards.find((card) => card.slug === activeSlug) ?? (activeSlug ? createWorkFromDetail(activeSlug) : null);
  const activeDetail = activeWork ? getProjectDetail(activeWork) : null;

  useEffect(() => {
    const controller = new AbortController();

    getWordPressWorks(controller.signal)
      .then((works) => {
        if (works.length > 0) {
          setCards(composeCards(works));
        }
      })
      .catch(() => {
        setCards(composeCards());
      });

    return () => controller.abort();
  }, []);

  useEffect(() => {
    const onPopState = () => setActiveSlug(getProjectSlugFromPath());
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  useEffect(() => {
    if (!activeWork) return;

    document.title = `${activeWork.title} | AZ Studio`;

    const description = getWorkDescription(activeWork);
    const metaDescription = document.querySelector<HTMLMetaElement>('meta[name="description"]');
    const canonical = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    const ogTitle = document.querySelector<HTMLMetaElement>('meta[property="og:title"]');
    const ogDescription = document.querySelector<HTMLMetaElement>('meta[property="og:description"]');

    metaDescription?.setAttribute('content', description);
    canonical?.setAttribute('href', window.location.href);
    ogTitle?.setAttribute('content', `${activeWork.title} | AZ Studio`);
    ogDescription?.setAttribute('content', description);

    return () => {
      document.title = 'AZ Studio | Brand Identity and Digital Experience Studio in Norway';
      metaDescription?.setAttribute(
        'content',
        'AZ Studio is a Norway based creative studio for brand identity, interactive web design, motion, and digital experience systems.'
      );
      canonical?.setAttribute('href', 'https://azstudio.no/');
      ogTitle?.setAttribute('content', 'AZ Studio');
      ogDescription?.setAttribute(
        'content',
        'Brand identity, interactive web design, motion, and digital experience systems from AZ Studio in Norway.'
      );
    };
  }, [activeWork]);

  const openProject = (card: WorkCard) => {
    previousLocationRef.current = `${window.location.pathname}${window.location.search}${window.location.hash}`;
    previousScrollYRef.current = window.scrollY;
    history.pushState(null, '', `/projects/${card.slug}`);
    setActiveSlug(card.slug);
  };

  const closeProject = () => {
    const restoreLocation = previousLocationRef.current ?? '/projects';
    const restoreScrollY = previousScrollYRef.current ?? getProjectSectionScrollY();

    history.pushState(null, '', restoreLocation);
    setActiveSlug(null);
    requestAnimationFrame(() => {
      window.scrollTo({ top: restoreScrollY, behavior: 'auto' });
    });
  };

  return (
    <>
      <FloatingLayer
        className="works-board"
        sensitivity={0.85}
        easingFactor={0.06}
        maxShift={112}
        style={{
          opacity: Math.pow(presence, 0.72),
          filter: `blur(${(18 * (1 - presence)).toFixed(2)}px)`,
          visibility: isVisible ? 'visible' : 'hidden',
          pointerEvents: isInteractive ? 'auto' : 'none'
        }}
        aria-hidden={!isVisible}
      >
        {cards.map((card) => (
          <FloatingElement key={card.id} depth={card.depth} className="works-card-position">
            <button
              className={`works-card works-card-${card.tone}`}
              type="button"
              onClick={() => openProject(card)}
              disabled={!isInteractive}
              tabIndex={isInteractive ? 0 : -1}
              style={{
                '--work-card-x': `${card.x}%`,
                '--work-card-y': `${card.y}%`,
                '--work-card-width': card.width,
                '--work-card-depth': card.depth
              } as CSSProperties}
              aria-label={`Open ${card.title}`}
            >
              <img src={card.image} alt="" loading="eager" />
              <span className="works-card-meta">
                <span>{card.category}</span>
                <strong>{card.title}</strong>
              </span>
            </button>
          </FloatingElement>
        ))}
      </FloatingLayer>

      {activeWork && (
        <section className="work-detail-page" aria-label={`${activeWork.title} project detail`}>
          <article className={`work-detail-panel${activeDetail ? ' work-detail-panel-case' : ''}`}>
            <button className="work-detail-close" type="button" onClick={closeProject}>
              Back
            </button>
            {activeDetail ? (
              <>
                <nav className="project-sticky-nav" aria-label="Project navigation">
                  <a className="project-sticky-brand" href="/">
                    azstudio
                  </a>
                  <div className="project-sticky-links">
                    <a href="/projects">projects</a>
                    <a href="/service">service</a>
                    <a href="/contact">contact</a>
                  </div>
                </nav>
                <header id="fotland-overview" className="project-case-hero">
                  <figure className="project-case-media">
                    <img className="project-case-background" src={activeDetail.heroBackground} alt="" />
                  </figure>
                  <h1 className="project-case-title">{activeDetail.title}</h1>
                  <div className="project-case-logo-stage" aria-label="Fotland Bryggeri logo direction">
                    {activeDetail.logoImages.map((image, index) => (
                      <img key={image} className={`project-case-logo project-case-logo-${index + 1}`} src={image} alt="" />
                    ))}
                  </div>
                  <section className="project-case-story" aria-label="Project story">
                    {activeDetail.sections.map((section) => (
                      <div key={section.label} className="project-case-text-card">
                        <p>{section.label}</p>
                        <span>{section.body}</span>
                      </div>
                    ))}
                  </section>
                </header>

                <section id="fotland-presentation" className="project-case-full-image" aria-label="Project presentation">
                  <img src={activeDetail.contentImage} alt="" />
                </section>
                <MoreProjects projects={cards} currentSlug={activeWork.slug} />
                <SeoFooter />
              </>
            ) : (
              <>
                <div className="work-detail-image">
                  <img src={activeWork.image} alt="" />
                </div>
                <div className="work-detail-copy">
                  <p>{activeWork.category}</p>
                  <h2>{activeWork.title}</h2>
                  {activeWork.excerpt && <span>{activeWork.excerpt}</span>}
                  {activeWork.contentHtml ? (
                    <div
                      className="work-detail-content"
                      dangerouslySetInnerHTML={{ __html: activeWork.contentHtml }}
                    />
                  ) : (
                    <div className="work-detail-grid" aria-label="Work detail placeholders">
                      <div>Overview</div>
                      <div>Role</div>
                      <div>Process</div>
                      <div>Outcome</div>
                    </div>
                  )}
                </div>
              </>
            )}
          </article>
        </section>
      )}
    </>
  );
}

function getProjectSlugFromPath() {
  if (typeof window === 'undefined') return null;
  const match = window.location.pathname.match(/^\/projects\/([^/]+)\/?$/);
  return match ? decodeURIComponent(match[1]) : null;
}

function getProjectSectionScrollY() {
  const spacer = document.querySelector<HTMLElement>('.story-scroll-spacer');
  const scrollHeight = spacer?.offsetHeight ?? document.documentElement.scrollHeight;
  const maxScroll = Math.max(scrollHeight - window.innerHeight, 0);
  return maxScroll / 3;
}
