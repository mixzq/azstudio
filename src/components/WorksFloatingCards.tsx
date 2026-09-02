import {
  CSSProperties,
  ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef
} from 'react';

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
};

const FloatingContext = createContext<FloatingContextType | null>(null);

const cards: WorkCard[] = [
  { id: 'identity', depth: 0.5, x: 8, y: 12, width: 'clamp(96px, 12vw, 172px)', tone: 'warm' },
  { id: 'system', depth: 0.68, x: 28, y: 18, width: 'clamp(108px, 13vw, 188px)', tone: 'blue' },
  { id: 'campaign', depth: 1.26, x: 57, y: 7, width: 'clamp(160px, 21vw, 312px)', tone: 'olive' },
  { id: 'editorial', depth: 0.58, x: 86, y: 11, width: 'clamp(98px, 12vw, 168px)', tone: 'rose' },
  { id: 'motion', depth: 1.48, x: 3, y: 62, width: 'clamp(168px, 22vw, 330px)', tone: 'charcoal' },
  { id: 'archive', depth: 0.92, x: 45, y: 76, width: 'clamp(132px, 16vw, 232px)', tone: 'gold' },
  { id: 'space', depth: 1.08, x: 75, y: 65, width: 'clamp(142px, 18vw, 270px)', tone: 'paper' }
];

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
  const enter = easeOut(map(progress, 0.5, 0.64, 0, 1));
  const leave = easeInOut(map(progress, 0.79, 0.92, 0, 1));
  const presence = clamp(enter * (1 - leave));

  return (
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
          <article
            className={`works-card works-card-${card.tone}`}
            style={{
              '--work-card-x': `${card.x}%`,
              '--work-card-y': `${card.y}%`,
              '--work-card-width': card.width,
              '--work-card-depth': card.depth
            } as CSSProperties}
            aria-label={`Work preview ${card.id}`}
          />
        </FloatingElement>
      ))}
    </FloatingLayer>
  );
}
