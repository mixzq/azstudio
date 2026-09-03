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
};

type FloatingElementProps = {
  children: ReactNode;
  className?: string;
  depth?: number;
};

type WorkCard = {
  id: string;
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
    id: 'identity',
    title: 'Identity Study',
    category: 'Brand System',
    excerpt: 'A compact identity direction prepared as the first local work sample.',
    contentHtml: ''
  },
  {
    id: 'system',
    title: 'Interface Rhythm',
    category: 'Digital Product',
    excerpt: 'A product interface study for spacing, motion, and visual hierarchy.',
    contentHtml: ''
  },
  {
    id: 'campaign',
    title: 'Campaign Frame',
    category: 'Creative Direction',
    excerpt: 'A campaign frame exploring image, typography, and composition.',
    contentHtml: ''
  },
  {
    id: 'editorial',
    title: 'Editorial Motion',
    category: 'Visual Story',
    excerpt: 'A visual story sample built around editorial rhythm and motion.',
    contentHtml: ''
  }
];

function composeCards(cmsWorks: WordPressWork[] = []): WorkCard[] {
  const works = cmsWorks.length > 0 ? cmsWorks.slice(0, workSlots.length) : fallbackWorks;

  return works.map((work, index) => {
    const cmsWork = cmsWorks[index];
    const slot = workSlots[index];

    return {
      ...slot,
      ...work,
      image: cmsWork?.image ?? slot.image,
      id: cmsWork?.id ?? work.id
    };
  });
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
  style
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
      <div ref={containerRef} className={joinClass('works-floating-layer', className)} style={style}>
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
  const [selectedWork, setSelectedWork] = useState<WorkCard | null>(null);
  const [cards, setCards] = useState<WorkCard[]>(() => composeCards());
  const enter = easeOut(map(progress, 0.5, 0.64, 0, 1));
  const leave = easeInOut(map(progress, 0.79, 0.92, 0, 1));
  const presence = clamp(enter * (1 - leave));

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
    if (!selectedWork) return undefined;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setSelectedWork(null);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [selectedWork]);

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
          pointerEvents: presence > 0.03 ? 'auto' : 'none'
        }}
      >
        {cards.map((card) => (
          <FloatingElement key={card.id} depth={card.depth} className="works-card-position">
            <button
              className={`works-card works-card-${card.tone}`}
              type="button"
              onClick={() => setSelectedWork(card)}
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

      {selectedWork && (
        <section className="work-detail" aria-modal="true" role="dialog" aria-label={`${selectedWork.title} detail`}>
          <button className="work-detail-backdrop" type="button" aria-label="Close work detail" onClick={() => setSelectedWork(null)} />
          <article className="work-detail-panel">
            <button className="work-detail-close" type="button" onClick={() => setSelectedWork(null)}>
              Close
            </button>
            <div className="work-detail-image">
              <img src={selectedWork.image} alt="" />
            </div>
            <div className="work-detail-copy">
              <p>{selectedWork.category}</p>
              <h2>{selectedWork.title}</h2>
              {selectedWork.excerpt && <span>{selectedWork.excerpt}</span>}
              {selectedWork.contentHtml ? (
                <div
                  className="work-detail-content"
                  dangerouslySetInnerHTML={{ __html: selectedWork.contentHtml }}
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
          </article>
        </section>
      )}
    </>
  );
}
