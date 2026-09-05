import { CSSProperties, useEffect, useMemo, useRef, useState } from 'react';
import { WorksFloatingCards } from '@/components/WorksFloatingCards';

type Point = {
  x: string;
  y: string;
  rotate?: number;
};

type FloatingItem = {
  start: Point;
  end: Point;
  mobileEnd?: Partial<Point>;
  depth: number;
};

type MotionState = {
  progress: number;
  pointerX: number;
  pointerY: number;
  elapsed: number;
};

const introTexts = ['Where', 'Brands', 'Find', 'Their', 'Voice', 'azstudio'];
const introFirstHoldDuration = 500;
const introHoldDuration = 100;
const introTransitionDurations = [650, 650, 650, 650, 2400];

const aboutText = 'AZ Studio is a creative studio in Norway working across brand identity, interactive web design, motion, and digital experience systems for culture, technology, and ambitious independent brands.';

function clamp(value: number, min = 0, max = 1) {
  return Math.min(Math.max(value, min), max);
}

function map(value: number, inMin: number, inMax: number, outMin: number, outMax: number) {
  const t = clamp((value - inMin) / (inMax - inMin));
  return outMin + (outMax - outMin) * t;
}

function easeInOut(t: number) {
  const v = clamp(t);
  return v < 0.5 ? 2 * v * v : 1 - Math.pow(-2 * v + 2, 2) / 2;
}

function easeOut(t: number) {
  const v = clamp(t);
  return 1 - Math.pow(1 - v, 3);
}

function lerp(start: number, end: number, factor: number) {
  return start + (end - start) * factor;
}

function unitToPx(value: string) {
  const raw = String(value).trim();
  const number = parseFloat(raw);
  if (raw.endsWith('vw')) return window.innerWidth * number / 100;
  if (raw.endsWith('vh')) return window.innerHeight * number / 100;
  if (raw.endsWith('px')) return number;
  return number || 0;
}

function toMotionValues(item: FloatingItem) {
  const isMobile = window.innerWidth <= 820;
  const end = isMobile && item.mobileEnd ? { ...item.end, ...item.mobileEnd } : item.end;
  return {
    startX: unitToPx(item.start.x),
    startY: unitToPx(item.start.y),
    endX: unitToPx(end.x),
    endY: unitToPx(end.y),
    startRotate: item.start.rotate ?? 0,
    endRotate: end.rotate ?? item.end.rotate ?? 0,
    depth: item.depth || 1
  };
}

function blurFromPresence(presence: number) {
  const safe = Math.max(presence, 0.018);
  return Math.min(8 / safe - 8, 100);
}

function getTextMorphStyle(presence: number, scaleLift = 0, linear = false): CSSProperties {
  const easedPresence = linear ? clamp(presence) : easeInOut(presence);
  const blur = blurFromPresence(easedPresence);
  const scale = 0.965 + easedPresence * 0.045 + scaleLift;

  return {
    opacity: Math.pow(easedPresence, 0.42),
    filter: `blur(${blur}px)`,
    '--text-scale': scale
  } as CSSProperties;
}

function useStoryboardMotion() {
  const [motion, setMotion] = useState<MotionState>({
    progress: 0,
    pointerX: 0,
    pointerY: 0,
    elapsed: 0
  });
  const pointerRef = useRef({ targetX: 0, targetY: 0, x: 0, y: 0 });
  const introStartRef = useRef(0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if ('scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual';
    }
    window.scrollTo(0, 0);

    introStartRef.current = performance.now();
    rafRef.current = null;

    const readProgress = () => {
      const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
      return maxScroll <= 0 ? 0 : clamp(window.scrollY / maxScroll);
    };

    const tick = () => {
      const pointer = pointerRef.current;
      pointer.x += (pointer.targetX - pointer.x) * 0.12;
      pointer.y += (pointer.targetY - pointer.y) * 0.12;

      setMotion({
        progress: readProgress(),
        pointerX: pointer.x,
        pointerY: pointer.y,
        elapsed: performance.now() - introStartRef.current
      });

      const needsPointerFrame = Math.abs(pointer.targetX - pointer.x) > 0.001 || Math.abs(pointer.targetY - pointer.y) > 0.001;
      const needsIntroFrame = performance.now() - introStartRef.current < 6100;
      rafRef.current = needsPointerFrame || needsIntroFrame ? requestAnimationFrame(tick) : null;
    };

    const requestTick = () => {
      if (rafRef.current) return;
      rafRef.current = requestAnimationFrame(tick);
    };

    const onPointerMove = (event: PointerEvent) => {
      pointerRef.current.targetX = (event.clientX / window.innerWidth - 0.5) * 2;
      pointerRef.current.targetY = (event.clientY / window.innerHeight - 0.5) * 2;
      requestTick();
    };

    window.addEventListener('scroll', requestTick, { passive: true });
    window.addEventListener('resize', requestTick);
    window.addEventListener('pointermove', onPointerMove, { passive: true });
    requestTick();

    return () => {
      window.removeEventListener('scroll', requestTick);
      window.removeEventListener('resize', requestTick);
      window.removeEventListener('pointermove', onPointerMove);
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, []);

  return motion;
}

function getIntroState(elapsed: number) {
  const transitionCount = introTransitionDurations.length;
  const introDuration = getIntroDuration();
  const scrollPresence = 1;

  if (elapsed < introFirstHoldDuration) {
    return [
      { text: introTexts[0], small: false, style: getTextMorphStyle(scrollPresence, 0, true) },
      { text: '', small: false, style: getTextMorphStyle(0, 0, true) }
    ];
  }

  if (elapsed >= introDuration) {
    return [
      { text: 'azstudio', small: false, style: getTextMorphStyle(scrollPresence, 0, true) },
      { text: '', small: false, style: getTextMorphStyle(0, 0, true) }
    ];
  }

  let timelineTime = elapsed - introFirstHoldDuration;
  let rawIndex = transitionCount - 1;
  let morphDuration = introTransitionDurations[rawIndex];

  for (let index = 0; index < transitionCount; index += 1) {
    const segmentDuration = introTransitionDurations[index] + introHoldDuration;
    if (timelineTime <= segmentDuration) {
      rawIndex = index;
      morphDuration = introTransitionDurations[index];
      break;
    }
    timelineTime -= segmentDuration;
  }

  const localTime = Math.min(timelineTime, morphDuration);
  const morph = clamp(localTime / morphDuration);
  const currentPresence = (1 - morph) * scrollPresence;
  const nextPresence = morph * scrollPresence;

  return [
    {
      text: introTexts[rawIndex],
      small: false,
      style: getTextMorphStyle(currentPresence, 0, true)
    },
    {
      text: introTexts[rawIndex + 1],
      small: false,
      style: getTextMorphStyle(nextPresence, 0, true)
    }
  ];
}

function getIntroDuration() {
  return introFirstHoldDuration + introTransitionDurations.reduce((total, duration) => total + duration + introHoldDuration, 0);
}

type TitleFrame = {
  text: string;
  progress: number;
  small: boolean;
};

const titleFrames: TitleFrame[] = [
  { text: 'azstudio', progress: 0.08, small: false },
  { text: 'About', progress: 1 / 3, small: true },
  { text: 'works', progress: 2 / 3, small: false },
  { text: 'get in touch', progress: 0.94, small: true }
];

function getScrollTitleState(progress: number) {
  if (progress <= titleFrames[0].progress) {
    return [
      { ...titleFrames[0], style: getTextMorphStyle(1, 0, true) },
      { ...titleFrames[0], text: '', style: getTextMorphStyle(0, 0, true) }
    ];
  }

  for (let index = 0; index < titleFrames.length - 1; index += 1) {
    const current = titleFrames[index];
    const next = titleFrames[index + 1];

    if (progress <= next.progress) {
      const morph = easeInOut(map(progress, current.progress, next.progress, 0, 1));
      return [
        { ...current, style: getTextMorphStyle(1 - morph, 0, true) },
        { ...next, style: getTextMorphStyle(morph, 0, true) }
      ];
    }
  }

  return [
    { ...titleFrames[titleFrames.length - 1], style: getTextMorphStyle(1, 0, true) },
    { ...titleFrames[titleFrames.length - 1], text: '', style: getTextMorphStyle(0, 0, true) }
  ];
}

function GooeyStage({ progress, elapsed }: { progress: number; elapsed: number }) {
  const titleState = progress < titleFrames[0].progress && elapsed < getIntroDuration()
    ? getIntroState(elapsed)
    : getScrollTitleState(progress);

  return (
    <section className="gooey-layer" aria-live="polite">
      {titleState.map((word, index) => (
        <span key={`title-${index}`} className={`gooey-word${word.small ? ' is-small' : ''}`} style={word.style}>
          {word.text}
        </span>
      ))}
    </section>
  );
}

function getFloatingStyle(
  item: FloatingItem,
  t: number,
  pointerX: number,
  pointerY: number,
  strength: number,
  baseScale: number,
  scaleRange: number,
  blurAmount: number,
  opacityPower: number
): CSSProperties {
  const values = toMotionValues(item);
  const opacity = Math.pow(t, opacityPower);
  const x = lerp(values.startX, values.endX, t);
  const y = lerp(values.startY, values.endY, t);
  const rotate = lerp(values.startRotate, values.endRotate, t);
  const scale = baseScale + t * scaleRange;
  const floatX = pointerX * values.depth * strength * opacity;
  const floatY = pointerY * values.depth * strength * opacity * 0.72;

  return {
    opacity,
    filter: `blur(${(blurAmount * (1 - t)).toFixed(2)}px)`,
    transform: `translate3d(${(x + floatX).toFixed(2)}px, ${(y + floatY).toFixed(2)}px, 0) rotate(${rotate.toFixed(2)}deg) scale(${scale})`
  };
}

function FloatingAbout({ progress, pointerX, pointerY }: { progress: number; pointerX: number; pointerY: number }) {
  const item = useMemo(() => ({
    start: { x: '36vw', y: '72vh', rotate: -5 },
    end: { x: '10vw', y: '62vh', rotate: 0 },
    mobileEnd: { x: '7vw', y: '64vh' },
    depth: 1.45
  }), []);
  const aboutCopyEnter = easeOut(map(progress, 0.093, 0.22, 0, 1));
  const aboutCopyLeave = easeInOut(map(progress, 0.5, 0.573, 0, 1));
  const presence = clamp(aboutCopyEnter * (1 - aboutCopyLeave));
  const t = easeOut(aboutCopyEnter);
  const baseStyle = getFloatingStyle(item, t, pointerX, pointerY, 44, 0.82, 0.18, 34, 0.68);
  const opacity = Math.pow(presence, 0.48);
  const blur = 34 * (1 - presence);

  return (
    <section className="about-floating" aria-label="About AZ Studio">
      <p
        className="about-copy"
        style={{
          ...baseStyle,
          opacity,
          filter: `blur(${blur.toFixed(2)}px)`,
          transform: baseStyle.transform
        }}
      >
        {aboutText}
      </p>
    </section>
  );
}

function ContactPanel({ progress }: { progress: number }) {
  const enter = easeOut(map(progress, 0.78, 0.94, 0, 1));
  const presence = clamp(enter);

  return (
    <section
      className="contact-panel"
      style={{
        opacity: presence,
        filter: `blur(${(18 * (1 - presence)).toFixed(2)}px)`,
        transform: `translateX(-50%) translateY(${(26 * (1 - presence)).toFixed(2)}px)`
      }}
    >
      <a href="mailto:hello@azstudio.com">hello@azstudio.com</a>
    </section>
  );
}

type NavTarget = {
  id: 'about' | 'works' | 'contact';
  label: string;
  progress: number;
};

const navTargets: NavTarget[] = [
  { id: 'about', label: 'about', progress: 1 / 3 },
  { id: 'works', label: 'works', progress: 2 / 3 },
  { id: 'contact', label: 'contact', progress: 1 }
];

function getActiveNav(progress: number) {
  if (progress < 0.2) return null;
  if (progress < 0.5) return 'about';
  if (progress < 0.82) return 'works';
  return 'contact';
}

function smoothScrollToProgress(targetProgress: number) {
  const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
  const startY = window.scrollY;
  const targetY = clamp(targetProgress) * Math.max(maxScroll, 0);
  const distance = targetY - startY;
  const duration = Math.min(3000, Math.max(1520, Math.abs(distance) * 0.72));
  const startTime = performance.now();

  const tick = (now: number) => {
    const t = clamp((now - startTime) / duration);
    const eased = easeInOut(t);
    window.scrollTo(0, startY + distance * eased);

    if (t < 1) {
      requestAnimationFrame(tick);
    }
  };

  requestAnimationFrame(tick);
}

function TopNav({ progress }: { progress: number }) {
  const active = getActiveNav(progress);

  return (
    <nav className="top-nav" aria-label="Primary navigation">
      {navTargets.map((target) => (
        <a
          key={target.id}
          href={`#${target.id}`}
          className={active === target.id ? 'is-active' : undefined}
          onClick={(event) => {
            event.preventDefault();
            history.replaceState(null, '', `#${target.id}`);
            smoothScrollToProgress(target.progress);
          }}
        >
          {target.label}
        </a>
      ))}
    </nav>
  );
}

function scrollToHash() {
  const target = navTargets.find((item) => `#${item.id}` === window.location.hash);

  if (target) {
    requestAnimationFrame(() => smoothScrollToProgress(target.progress));
  }
}

function SeoCopy() {
  return (
    <div className="scroll-copy">
      <section id="about" className="scroll-copy-section" aria-labelledby="about-heading">
        <article>
          <span>About</span>
          <h1 id="about-heading">AZ Studio designs identities, interactive systems, and digital experiences.</h1>
          <p>
            Based in Norway, AZ Studio works with brands, founders, cultural projects, and creative teams that need a sharper visual voice online. The studio combines brand identity, typography, motion direction, and web experience design into focused digital systems.
          </p>
        </article>
      </section>
      <section id="works" className="scroll-copy-section" aria-labelledby="works-heading">
        <article>
          <span>Works</span>
          <h2 id="works-heading">Selected work across brand identity, motion, editorial systems, and interactive web design.</h2>
          <p>
            The work section presents visual studies and CMS powered project entries. Each piece can describe the client context, design role, process, imagery, and outcome, giving visitors and search engines clearer project content over time.
          </p>
        </article>
      </section>
      <section id="contact" className="scroll-copy-section" aria-labelledby="contact-heading">
        <article>
          <span>Contact</span>
          <h2 id="contact-heading">Work with AZ Studio on brand and digital experience projects.</h2>
          <p>
            For identity systems, portfolio websites, visual direction, interactive experiences, and motion led digital communication, contact AZ Studio through the email link on this page.
          </p>
        </article>
      </section>
      <section className="scroll-copy-section" aria-label="End of homepage" />
    </div>
  );
}

function ScrollRail({ progress }: { progress: number }) {
  return (
    <div className="scroll-rail" aria-hidden="true" style={{ '--progress': progress.toFixed(4) } as CSSProperties}>
      <span />
    </div>
  );
}

export default function App() {
  const { progress, pointerX, pointerY, elapsed } = useStoryboardMotion();

  useEffect(() => {
    scrollToHash();
  }, []);

  return (
    <>
      <svg width="0" height="0" aria-hidden="true" focusable="false">
        <defs>
          <filter id="threshold">
            <feColorMatrix
              in="SourceGraphic"
              type="matrix"
              values="1 0 0 0 0
                      0 1 0 0 0
                      0 0 1 0 0
                      0 0 0 255 -140"
            />
          </filter>
        </defs>
      </svg>

      <main className="site-stage" aria-label="AZ Studio homepage storyboard">
        <div className="grain" />
        <TopNav progress={progress} />
        <ScrollRail progress={progress} />
        <WorksFloatingCards progress={progress} />
        <FloatingAbout progress={progress} pointerX={pointerX} pointerY={pointerY} />
        <GooeyStage progress={progress} elapsed={elapsed} />
        <ContactPanel progress={progress} />
      </main>

      <SeoCopy />
    </>
  );
}
