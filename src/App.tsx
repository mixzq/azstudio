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

type ServiceCardItem = FloatingItem & {
  enter: [number, number];
  leave: [number, number];
  strength: number;
  scale: [number, number];
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
const introTransitionDurations = [455, 455, 455, 455, 1680];

const serviceCards = [
  {
    title: 'Logo Design & Branding',
    description: 'Build a clear and professional brand that reflects your value, connects with the right audience and makes your business easier to remember.',
    image: '/PIC/mockup-free-dyWVPeyBvrM-unsplash.jpg'
  },
  {
    title: 'Web Design & Development',
    description: 'A clear, professional website designed around your brand, customers and business goals, helping people understand, trust and contact you.',
    image: '/PIC/azwedo-l-lc-nT4WsKUoLo4-unsplash.jpg'
  },
  {
    title: 'Graphic Design Subscription',
    description: 'Your flexible design team for everyday creative needs, without the time and cost of hiring full time designers.',
    image: '/PIC/charlesdeluvio-Lks7vei-eAg-unsplash.jpg'
  }
];

const googleAdsConversionId = 'AW-17700578992/udXfCOaJs7ObELDNpfhB';

function trackGoogleAdsConversion() {
  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || function gtagFallback(...args: unknown[]) {
    window.dataLayer?.push(args);
  };
  window.gtag('event', 'conversion', {
    send_to: googleAdsConversionId
  });
}

function getContentsquarePath() {
  return window.location.pathname + window.location.hash.replace('#', '?__');
}

function trackContentsquarePageview() {
  window._uxa?.push(['trackPageview', getContentsquarePath()]);
}

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

function getStoryboardMaxScroll() {
  const spacer = document.querySelector<HTMLElement>('.story-scroll-spacer');
  const scrollHeight = spacer?.offsetHeight ?? document.documentElement.scrollHeight;
  return Math.max(scrollHeight - window.innerHeight, 0);
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
  const autoAdvancedRef = useRef(false);

  useEffect(() => {
    if ('scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual';
    }
    window.scrollTo(0, 0);

    introStartRef.current = performance.now();
    rafRef.current = null;

    const readProgress = () => {
      const maxScroll = getStoryboardMaxScroll();
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

      const elapsed = performance.now() - introStartRef.current;
      if (!autoAdvancedRef.current && elapsed >= getIntroDuration() + 250 && window.scrollY < 8 && !window.location.pathname.startsWith('/projects/')) {
        autoAdvancedRef.current = true;
        smoothScrollToProgress(navTargets[0].progress);
      }

      const needsPointerFrame = Math.abs(pointer.targetX - pointer.x) > 0.001 || Math.abs(pointer.targetY - pointer.y) > 0.001;
      const needsIntroFrame = elapsed < getIntroDuration() + 900;
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
      { text: introTexts[0], small: false, compact: false, style: getTextMorphStyle(scrollPresence, 0, true) },
      { text: '', small: false, compact: false, style: getTextMorphStyle(0, 0, true) }
    ];
  }

  if (elapsed >= introDuration) {
    return [
      { text: 'azstudio', small: false, compact: false, style: getTextMorphStyle(scrollPresence, 0, true) },
      { text: '', small: false, compact: false, style: getTextMorphStyle(0, 0, true) }
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
      compact: false,
      style: getTextMorphStyle(currentPresence, 0, true)
    },
    {
      text: introTexts[rawIndex + 1],
      small: false,
      compact: false,
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
  compact?: boolean;
};

const titleFrames: TitleFrame[] = [
  { text: 'azstudio', progress: 0.08, small: false },
  { text: 'Projects', progress: 1 / 3, small: true },
  { text: 'service', progress: 2 / 3, small: false },
  { text: 'where you want to start?', progress: 0.94, small: true, compact: true }
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
        <span
          key={`title-${index}`}
          className={`gooey-word${word.small ? ' is-small' : ''}${word.compact ? ' is-compact' : ''}`}
          style={word.style}
        >
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

function FloatingService({ progress, pointerX, pointerY }: { progress: number; pointerX: number; pointerY: number }) {
  const items = useMemo<ServiceCardItem[]>(() => [
    {
      start: { x: '36vw', y: '72vh', rotate: -5 },
      end: { x: '14vw', y: '48vh', rotate: 0 },
      mobileEnd: { x: '3vw', y: '40vh' },
      depth: 1.65,
      enter: [0.48, 0.62],
      leave: [0.8, 0.91],
      strength: 62,
      scale: [0.78, 0.24]
    },
    {
      start: { x: '84vw', y: '24vh', rotate: 6 },
      end: { x: '70vw', y: '10vh', rotate: -2 },
      mobileEnd: { x: '53vw', y: '14vh' },
      depth: 0.72,
      enter: [0.52, 0.66],
      leave: [0.76, 0.88],
      strength: 30,
      scale: [0.86, 0.1]
    },
    {
      start: { x: '6vw', y: '28vh', rotate: 4 },
      end: { x: '55vw', y: '56vh', rotate: 2 },
      mobileEnd: { x: '53vw', y: '69vh' },
      depth: 1.28,
      enter: [0.5, 0.69],
      leave: [0.82, 0.94],
      strength: 48,
      scale: [0.76, 0.16]
    }
  ], []);

  return (
    <section className="about-floating" aria-label="AZ Studio services">
      {items.map((item, index) => {
        const cardEnter = easeOut(map(progress, item.enter[0], item.enter[1], 0, 1));
        const cardLeave = easeInOut(map(progress, item.leave[0], item.leave[1], 0, 1));
        const cardPresence = clamp(cardEnter * (1 - cardLeave));
        const t = easeOut(cardEnter);
        const baseStyle = getFloatingStyle(item, t, pointerX, pointerY, item.strength, item.scale[0], item.scale[1], 38, 0.7);
        const opacity = Math.pow(cardPresence, 0.52);
        const blur = 34 * (1 - cardPresence);

        return (
          <article
            key={serviceCards[index].title}
            className={`about-copy service-copy service-copy-${index + 1}`}
            style={{
              ...baseStyle,
              opacity,
              filter: `blur(${blur.toFixed(2)}px)`,
              transform: baseStyle.transform,
              '--service-depth': item.depth
            } as CSSProperties}
            aria-label={serviceCards[index].title}
          >
            <div className="service-copy-image" aria-hidden="true">
              <img src={serviceCards[index].image} alt="" />
            </div>
            <div className="service-copy-content">
              <h2>{serviceCards[index].title}</h2>
              <p>{serviceCards[index].description}</p>
            </div>
          </article>
        );
      })}
    </section>
  );
}

function ContactPanel({ progress, onOpenForm }: { progress: number; onOpenForm: () => void }) {
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
      <button className="talk-button talk-button-center" type="button" onClick={onOpenForm}>Let's talk</button>
    </section>
  );
}

function FloatingTalkButton({ progress, onOpenForm }: { progress: number; onOpenForm: () => void }) {
  const contactPresence = easeOut(map(progress, 0.78, 0.9, 0, 1));
  const presence = 1 - contactPresence;

  return (
    <button
      className="talk-button talk-button-corner"
      type="button"
      onClick={onOpenForm}
      style={{
        opacity: presence,
        '--talk-offset-y': `${(12 * contactPresence).toFixed(2)}px`,
        pointerEvents: presence > 0.08 ? 'auto' : 'none'
      } as CSSProperties}
    >
      Let's talk
    </button>
  );
}

type NavTarget = {
  id: 'projects' | 'service' | 'contact';
  label: string;
  progress: number;
};

const navTargets: NavTarget[] = [
  { id: 'projects', label: 'projects', progress: 1 / 3 },
  { id: 'service', label: 'service', progress: 2 / 3 },
  { id: 'contact', label: 'contact', progress: 1 }
];

function getActiveNav(progress: number) {
  if (progress < 0.2) return null;
  if (progress < 0.5) return 'projects';
  if (progress < 0.82) return 'service';
  return 'contact';
}

function smoothScrollToProgress(targetProgress: number) {
  const maxScroll = getStoryboardMaxScroll();
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

function BrandMark({ progress, elapsed }: { progress: number; elapsed: number }) {
  const presence = clamp(map(Math.max(progress, elapsed >= getIntroDuration() ? 0.12 : 0), 0.06, 0.14, 0, 1));

  return (
    <a
      className="brand-mark"
      href="/"
      style={{
        opacity: presence,
        transform: `translateY(${(10 * (1 - presence)).toFixed(2)}px)`
      }}
    >
      azstudio
    </a>
  );
}

function scrollToHash() {
  const target = navTargets.find((item) => `#${item.id}` === window.location.hash);

  if (target) {
    requestAnimationFrame(() => smoothScrollToProgress(target.progress));
  }
}

function SeoFooter() {
  return (
    <footer className="seo-footer" aria-label="AZ Studio overview">
      <div className="seo-footer-inner">
        <section id="about" className="seo-footer-brand" aria-labelledby="footer-about-heading">
          <a className="seo-footer-logo" href="/" aria-label="AZ Studio home">azstudio</a>
          <p id="footer-about-heading">
            AZ Studio is a Norway based creative studio for brand identity, interactive web design, motion, and digital experience systems.
          </p>
          <div className="seo-footer-social" aria-label="Social links">
            <a href="https://www.instagram.com/" aria-label="Instagram">Ig</a>
            <a href="https://www.behance.net/" aria-label="Behance">Be</a>
            <a href="https://www.linkedin.com/" aria-label="LinkedIn">In</a>
          </div>
        </section>

        <nav className="seo-footer-nav" aria-label="Footer navigation">
          <section className="seo-footer-section" aria-labelledby="footer-studio-heading">
            <h2 id="footer-studio-heading">Studio</h2>
            <a href="#projects">Projects</a>
            <a href="#service">Service</a>
            <a href="#contact">Contact</a>
            <a href="/admin">Admin</a>
          </section>
          <section className="seo-footer-section" aria-labelledby="footer-services-heading">
            <h2 id="footer-services-heading">Services</h2>
            <a href="#service">Brand identity</a>
            <a href="#service">Web design</a>
            <a href="#service">Motion direction</a>
            <a href="#service">Digital systems</a>
          </section>
          <section className="seo-footer-section" aria-labelledby="footer-contact-heading">
            <h2 id="footer-contact-heading">Contact</h2>
            <a href="mailto:hello@azstudio.com">Email</a>
            <a href="/contact">Start a project</a>
            <a href="https://azstudio.no/">azstudio.no</a>
            <a href="/sitemap.xml">Sitemap</a>
          </section>
        </nav>
      </div>

      <div className="seo-footer-bottom">
        <p>© 2026 AZ Studio. All rights reserved.</p>
        <div>
          <a href="/privacy">Privacy Policy</a>
          <a href="/terms">Terms</a>
        </div>
      </div>
    </footer>
  );
}

function ContactFormPage({ onClose }: { onClose: () => void }) {
  return (
    <section className="contact-form-page" aria-label="Contact form">
      <button className="work-detail-close" type="button" onClick={onClose}>
        Back
      </button>
      <form
        className="contact-form-shell"
        action="mailto:hello@azstudio.com"
        method="post"
        encType="text/plain"
        onSubmit={trackGoogleAdsConversion}
      >
        <div className="contact-form-heading">
          <p>Start a project</p>
          <h1>where you want to start?</h1>
        </div>
        <div className="contact-form-fields">
          <label>
            Name
            <input name="name" type="text" autoComplete="name" required />
          </label>
          <label>
            Email
            <input name="email" type="email" autoComplete="email" required />
          </label>
          <label className="contact-form-wide">
            Project
            <input name="project" type="text" placeholder="Logo design,website building, or just image resizing?" />
          </label>
          <label className="contact-form-wide">
            Message
            <textarea name="message" rows={5} required />
          </label>
        </div>
        <button className="talk-button contact-form-submit" type="submit">
          Send message
        </button>
      </form>
    </section>
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
  const [isContactFormOpen, setIsContactFormOpen] = useState(() => window.location.pathname === '/contact');

  useEffect(() => {
    scrollToHash();
  }, []);

  useEffect(() => {
    const onPopState = () => setIsContactFormOpen(window.location.pathname === '/contact');
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  useEffect(() => {
    const originalPushState = window.history.pushState;
    const trackAfterNavigation = () => window.setTimeout(trackContentsquarePageview, 0);

    window.history.pushState = function pushStateWithContentsquare(...args) {
      const result = originalPushState.apply(this, args);
      trackAfterNavigation();
      return result;
    };

    window.addEventListener('popstate', trackAfterNavigation);
    window.addEventListener('hashchange', trackAfterNavigation);

    return () => {
      window.history.pushState = originalPushState;
      window.removeEventListener('popstate', trackAfterNavigation);
      window.removeEventListener('hashchange', trackAfterNavigation);
    };
  }, []);

  const openContactForm = () => {
    history.pushState(null, '', '/contact');
    setIsContactFormOpen(true);
  };

  const closeContactForm = () => {
    history.pushState(null, '', '/');
    setIsContactFormOpen(false);
  };

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
        <BrandMark progress={progress} elapsed={elapsed} />
        <TopNav progress={progress} />
        <ScrollRail progress={progress} />
        <FloatingTalkButton progress={progress} onOpenForm={openContactForm} />
        <WorksFloatingCards progress={progress} />
        <FloatingService progress={progress} pointerX={pointerX} pointerY={pointerY} />
        <GooeyStage progress={progress} elapsed={elapsed} />
        <ContactPanel progress={progress} onOpenForm={openContactForm} />
      </main>

      {isContactFormOpen && <ContactFormPage onClose={closeContactForm} />}
      <div className="story-scroll-spacer" aria-hidden="true" />
      <SeoFooter />
    </>
  );
}
