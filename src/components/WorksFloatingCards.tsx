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
import { WordPressWork, getCachedWordPressWorks, getWordPressWorks } from '../lib/wordpress';

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
  showOnHome?: boolean;
  displayOrder?: number;
  seoTitle?: string;
  seoDescription?: string;
  socialImage?: string;
  projectDetail?: WordPressWork['projectDetail'];
};

type ProjectDetailData = {
  eyebrow: string;
  title: string;
  summary: string;
  heroImage: string;
  heroBackground: string;
  heroBackgroundSrcSet?: string;
  logoImages: string[];
  contentImage?: string;
  contentHtml?: string;
  sections: Array<{
    label: string;
    body?: string;
    bodyHtml?: string;
  }>;
};

type WorkSlot = Pick<WorkCard, 'depth' | 'x' | 'y' | 'width' | 'tone'>;

const FloatingContext = createContext<FloatingContextType | null>(null);

const workSlots: WorkSlot[] = [
  {
    depth: 0.62,
    x: 13,
    y: 20,
    width: 'clamp(120px, 13vw, 200px)',
    tone: 'warm'
  },
  {
    depth: 1.16,
    x: 36,
    y: 12,
    width: 'clamp(180px, 19.5vw, 300px)',
    tone: 'blue'
  },
  {
    depth: 0.88,
    x: 58,
    y: 68,
    width: 'clamp(144px, 15.6vw, 240px)',
    tone: 'olive'
  },
  {
    depth: 1.36,
    x: 83,
    y: 24,
    width: 'clamp(156px, 16.9vw, 260px)',
    tone: 'rose'
  },
  {
    depth: 0.74,
    x: 21,
    y: 61,
    width: 'clamp(132px, 14.3vw, 220px)',
    tone: 'charcoal'
  },
  {
    depth: 1.04,
    x: 46,
    y: 39,
    width: 'clamp(168px, 18.2vw, 280px)',
    tone: 'gold'
  },
  {
    depth: 0.68,
    x: 72,
    y: 48,
    width: 'clamp(120px, 13vw, 200px)',
    tone: 'paper'
  },
  {
    depth: 1.24,
    x: 91,
    y: 72,
    width: 'clamp(180px, 19.5vw, 300px)',
    tone: 'warm'
  },
  {
    depth: 0.96,
    x: 8,
    y: 78,
    width: 'clamp(144px, 15.6vw, 240px)',
    tone: 'blue'
  },
  {
    depth: 1.42,
    x: 64,
    y: 18,
    width: 'clamp(156px, 16.9vw, 260px)',
    tone: 'olive'
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

function composeCards(cmsWorks: WordPressWork[]): WorkCard[] {
  return cmsWorks.flatMap((work, index) => {
    if (!work.image) return [];

    const slot = getWorkSlot(index);

    return [{
      ...slot,
      ...work,
      image: work.image
    }];
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

  if (work.projectDetail) {
    const detail = work.projectDetail;
    const sections = [
      detail.aboutBrandHtml
        ? { label: 'About brand', bodyHtml: detail.aboutBrandHtml }
        : { label: 'Overview', body: detail.heroSummary },
      detail.projectGoalsHtml
        ? { label: 'Goals', bodyHtml: detail.projectGoalsHtml }
        : undefined
    ].filter((section): section is NonNullable<typeof section> => Boolean(section));

    return {
      eyebrow: work.category,
      title: work.title,
      summary: detail.heroSummary || work.excerpt,
      heroImage: detail.heroLogo || work.image,
      heroBackground: detail.heroBackground || work.image,
      heroBackgroundSrcSet: detail.heroBackgroundSrcSet,
      logoImages: [detail.heroLogo || work.image],
      contentHtml: work.contentHtml,
      sections
    };
  }

  return null;
}

function getWorkDescription(work: WorkCard) {
  const detail = getProjectDetail(work);
  return work.seoDescription || detail?.summary || work.excerpt || `${work.title} project detail by AZ Studio.`;
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

    let frameId: number | null = null;

    const tick = () => {
      let needsAnotherFrame = false;

      elementsMap.current.forEach((data) => {
        const strength = data.depth * sensitivity;
        const targetX = -pointerRef.current.x * maxShift * strength;
        const targetY = -pointerRef.current.y * maxShift * strength;
        const dx = targetX - data.currentPosition.x;
        const dy = targetY - data.currentPosition.y;

        data.currentPosition.x += dx * easingFactor;
        data.currentPosition.y += dy * easingFactor;
        data.element.style.transform = `translate3d(${data.currentPosition.x}px, ${data.currentPosition.y}px, 0)`;

        if (Math.abs(dx) > 0.01 || Math.abs(dy) > 0.01) {
          needsAnotherFrame = true;
        }
      });

      frameId = needsAnotherFrame ? requestAnimationFrame(tick) : null;
    };

    const requestTick = () => {
      if (frameId === null) {
        frameId = requestAnimationFrame(tick);
      }
    };

    const handlePointerMove = (event: PointerEvent) => {
      const rect = container.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      pointerRef.current = {
        x: (event.clientX - centerX) / (rect.width / 2),
        y: (event.clientY - centerY) / (rect.height / 2)
      };
      requestTick();
    };

    const handlePointerLeave = () => {
      pointerRef.current = { x: 0, y: 0 };
      requestTick();
    };

    container.addEventListener('pointermove', handlePointerMove);
    container.addEventListener('pointerleave', handlePointerLeave);

    return () => {
      container.removeEventListener('pointermove', handlePointerMove);
      container.removeEventListener('pointerleave', handlePointerLeave);
      if (frameId !== null) {
        cancelAnimationFrame(frameId);
      }
    };
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
  const activeSlug = getProjectSlugFromPath();
  const [cards, setCards] = useState<WorkCard[]>(() => composeCards(getCachedWordPressWorks()));
  const enter = easeOut(map(progress, 0.48, 0.62, 0, 1));
  const leave = easeInOut(map(progress, 0.76, 0.88, 0, 1));
  const presence = clamp(enter * (1 - leave));
  const isVisible = presence > 0.01;
  const isInteractive = presence > 0.12;
  const homeCards = cards.filter((card) => card.showOnHome !== false);
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
        // Keep the already displayed project if a refresh fails.
      });

    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (!activeWork) return;

    document.title = activeWork.seoTitle || `${activeWork.title} | AZ Studio`;

    const description = getWorkDescription(activeWork);
    const metaDescription = document.querySelector<HTMLMetaElement>('meta[name="description"]');
    const canonical = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    const ogTitle = document.querySelector<HTMLMetaElement>('meta[property="og:title"]');
    const ogDescription = document.querySelector<HTMLMetaElement>('meta[property="og:description"]');
    const ogImage = document.querySelector<HTMLMetaElement>('meta[property="og:image"]');

    metaDescription?.setAttribute('content', description);
    canonical?.setAttribute('href', window.location.href);
    ogTitle?.setAttribute('content', activeWork.seoTitle || `${activeWork.title} | AZ Studio`);
    ogDescription?.setAttribute('content', description);
    if (activeWork.socialImage) {
      ogImage?.setAttribute('content', activeWork.socialImage);
    }

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
    history.pushState(null, '', `/projects/${card.slug}`);
  };

  const closeProject = () => {
    history.pushState(null, '', '/projects');
  };

  return (
    <>
      {!activeWork && isVisible && homeCards.length > 0 && (
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
          {homeCards.map((card) => (
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
      )}

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
                    <img
                      className="project-case-background"
                      src={activeDetail.heroBackground}
                      srcSet={activeDetail.heroBackgroundSrcSet}
                      sizes="100vw"
                      alt=""
                      decoding="async"
                      fetchPriority="high"
                    />
                  </figure>
                  <h1 className="project-case-title">{activeDetail.title}</h1>
                </header>
                <section className="project-case-logo-stage" aria-label={`${activeDetail.title} logo direction`}>
                  {activeDetail.logoImages.map((image, index) => (
                    <img
                      key={image}
                      className={`project-case-logo project-case-logo-${index + 1}`}
                      src={image}
                      alt=""
                      decoding="async"
                    />
                  ))}
                </section>
                <section className="project-case-story" aria-label="Project story">
                  {activeDetail.sections.map((section) => (
                    <div key={section.label} className="project-case-text-card">
                      <p>{section.label}</p>
                      {section.bodyHtml ? (
                        <div
                          className="project-case-text-body"
                          dangerouslySetInnerHTML={{ __html: section.bodyHtml }}
                        />
                      ) : (
                        <span>{section.body}</span>
                      )}
                    </div>
                  ))}
                </section>

                {activeDetail.contentImage && (
                  <section id="fotland-presentation" className="project-case-full-image" aria-label="Project presentation">
                    <img src={activeDetail.contentImage} alt="" />
                  </section>
                )}
                {activeDetail.contentHtml && (
                  <section
                    className="project-case-content"
                    aria-label="Project presentation"
                    dangerouslySetInnerHTML={{ __html: activeDetail.contentHtml }}
                  />
                )}
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
