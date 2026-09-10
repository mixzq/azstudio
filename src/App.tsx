import { CSSProperties, ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import { WorkCard, WorksFloatingCards, composeProjectCards } from '@/components/WorksFloatingCards';
import { SeoFooter } from '@/components/SeoFooter';
import { getWordPressWorks } from '@/lib/wordpress';

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

const serviceDetailImages = [
  '/PIC/branding.png',
  '/PIC/web development.png',
  '/PIC/subscribe.png'
];

const serviceDetails = [
  {
    title: 'Logo Design & Branding',
    headline: '建立专业、清晰、容易被记住的品牌形象',
    summary: 'We build brand foundations that make your business easier to understand, trust and remember.',
    details: 'Suitable for businesses with real customers that are ready to look more professional, launch a new brand or sharpen an existing identity. We clarify your value, audience, positioning and visual direction, then shape the logo, colors, typography and practical brand materials into one usable system.',
    audience: '适合已经开始有客户，准备提升专业度、扩大业务或者推出新品牌的企业。',
    intro: '我们会先与你一起梳理：',
    discovery: [
      '你的品牌提供什么价值。',
      '你的目标客户是谁。',
      '客户为什么选择你。',
      '你的品牌应该给人什么感觉。',
      '你与竞争者有什么不同。'
    ],
    deliverableIntro: '在此基础上，我们可以完成：',
    deliverables: [
      'Logo 设计或现有 Logo 升级。',
      '品牌颜色和字体。',
      '品牌视觉方向。',
      '简洁实用的品牌指南。',
      '名片、社交媒体模板、演示文稿、包装等品牌材料。'
    ],
    outcome: '最终得到的不只是一个 Logo，而是一套能够帮助客户理解你、信任你和记住你的品牌基础。'
  },
  {
    title: 'Web Design & Development',
    headline: '清楚介绍你的业务，让客户更容易了解和信任你',
    summary: 'We design and build clear websites that help people understand what you do and take the next step.',
    details: 'For small businesses, personal brands and service pages, we plan the structure, refine the content, design the interface and build a responsive website with essential SEO, testing and launch support.',
    audience: '我们为小型企业和个人品牌设计简洁、专业、容易使用的网站。',
    intro: '在设计之前，我们会先了解你的业务目标、品牌价值和目标客户，再规划适合的网站内容与结构。',
    discovery: [],
    deliverableIntro: '服务包括：',
    deliverables: [
      '网站结构与内容规划。',
      '基础文案整理。',
      'UI UX 设计。',
      '手机和平板适配。',
      '网站开发。',
      '联系表单等基础功能。',
      '基础 SEO 设置。',
      '网站测试与上线。'
    ],
    outcome: '适合制作品牌官网、企业介绍网站、个人作品集和服务落地页。'
  },
  {
    title: 'Graphic Design Subscription',
    headline: '不需要招聘全职设计师，也能拥有稳定的设计支持',
    summary: 'We become a flexible design team for everyday creative needs, campaigns and brand updates.',
    details: 'Designed for small companies that need ongoing visual support without hiring full time. We handle social content, ads, posters, menus, presentations, website graphics, packaging and campaign visuals through a prioritized task list.',
    audience: '适合持续有设计需求，但暂时不需要招聘平面设计师、网页设计师或品牌人员的小型企业。',
    intro: '我们会先熟悉你的品牌、目标客户和营销计划，再持续处理日常设计需求，例如：',
    discovery: [],
    deliverableIntro: '',
    deliverables: [
      '社交媒体内容和广告图片。',
      '宣传单、海报、菜单和价目表。',
      '公司介绍、产品目录和演示文稿。',
      '网站横幅、活动页面和内容更新。',
      '包装、标签和品牌材料。',
      '新产品或营销活动的视觉设计。'
    ],
    outcome: '你可以把不同需求放进同一个任务清单，我们会按照优先级和约定的服务时间逐项完成。随着合作深入，我们会越来越了解你的品牌。你不需要每次重新寻找设计师，也不用反复解释品牌应该是什么样子。'
  }
];

const projectManifestoText = 'Design for clear brands, useful websites, and visual systems people remember.';

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

function useStoryboardMotion(isActive = true) {
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
    if (!isActive) {
      setMotion({
        progress: 0,
        pointerX: 0,
        pointerY: 0,
        elapsed: 0
      });
      return undefined;
    }

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
        smoothScrollToProgress(1 / 3);
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
  }, [isActive]);

  return motion;
}

function useGridHoverLight() {
  useEffect(() => {
    const root = document.documentElement;
    let raf: number | null = null;
    let x = window.innerWidth / 2;
    let y = window.innerHeight / 2;

    const update = () => {
      root.style.setProperty('--grid-hover-x', `${x}px`);
      root.style.setProperty('--grid-hover-y', `${y}px`);
      root.style.setProperty('--grid-hover-opacity', '1');
      raf = null;
    };

    const onPointerMove = (event: PointerEvent) => {
      x = event.clientX;
      y = event.clientY;
      if (!raf) {
        raf = window.requestAnimationFrame(update);
      }
    };

    const onPointerLeave = () => {
      root.style.setProperty('--grid-hover-opacity', '0');
    };

    window.addEventListener('pointermove', onPointerMove, { passive: true });
    document.addEventListener('pointerleave', onPointerLeave);

    root.style.setProperty('--grid-hover-x', `${x}px`);
    root.style.setProperty('--grid-hover-y', `${y}px`);
    root.style.setProperty('--grid-hover-opacity', '0');

    return () => {
      window.removeEventListener('pointermove', onPointerMove);
      document.removeEventListener('pointerleave', onPointerLeave);
      if (raf) {
        window.cancelAnimationFrame(raf);
      }
    };
  }, []);
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
  { text: 'service', progress: 1 / 3, small: false },
  { text: 'Projects', progress: 2 / 3, small: true },
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
      start: { x: '36vw', y: '72vh', rotate: 0 },
      end: { x: '14vw', y: '48vh', rotate: 0 },
      mobileEnd: { x: '3vw', y: '40vh' },
      depth: 1.65,
      enter: [0.16, 0.3],
      leave: [0.46, 0.58],
      strength: 62,
      scale: [0.78, 0.24]
    },
    {
      start: { x: '84vw', y: '24vh', rotate: 0 },
      end: { x: '70vw', y: '10vh', rotate: 0 },
      mobileEnd: { x: '53vw', y: '14vh' },
      depth: 0.72,
      enter: [0.2, 0.34],
      leave: [0.44, 0.56],
      strength: 30,
      scale: [0.86, 0.1]
    },
    {
      start: { x: '6vw', y: '28vh', rotate: 0 },
      end: { x: '55vw', y: '56vh', rotate: 0 },
      mobileEnd: { x: '53vw', y: '69vh' },
      depth: 1.28,
      enter: [0.18, 0.37],
      leave: [0.48, 0.6],
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
        const isVisible = cardPresence > 0.01;

        return (
          <article
            key={serviceCards[index].title}
            className={`about-copy service-copy service-copy-${index + 1}`}
            style={{
              ...baseStyle,
              opacity,
              filter: `blur(${blur.toFixed(2)}px)`,
              transform: baseStyle.transform,
              visibility: isVisible ? 'visible' : 'hidden',
              '--service-depth': item.depth
            } as CSSProperties}
            aria-hidden={!isVisible}
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
  const isVisible = presence > 0.01;
  const isInteractive = presence > 0.12;

  return (
    <section
      className="contact-panel"
      style={{
        opacity: presence,
        filter: `blur(${(18 * (1 - presence)).toFixed(2)}px)`,
        transform: `translateX(-50%) translateY(${(26 * (1 - presence)).toFixed(2)}px)`,
        visibility: isVisible ? 'visible' : 'hidden',
        pointerEvents: isInteractive ? 'auto' : 'none'
      }}
      aria-hidden={!isVisible}
    >
      <button
        className="talk-button talk-button-center"
        type="button"
        onClick={onOpenForm}
        disabled={!isInteractive}
        tabIndex={isInteractive ? 0 : -1}
      >
        Let's talk
      </button>
    </section>
  );
}

function FloatingTalkButton({ progress, onOpenForm }: { progress: number; onOpenForm: () => void }) {
  const contactPresence = easeOut(map(progress, 0.78, 0.9, 0, 1));
  const presence = 1 - contactPresence;
  const isVisible = presence > 0.01;
  const isInteractive = presence > 0.12;

  return (
    <button
      className="talk-button talk-button-corner"
      type="button"
      onClick={onOpenForm}
      disabled={!isInteractive}
      tabIndex={isInteractive ? 0 : -1}
      aria-hidden={!isVisible}
      style={{
        opacity: presence,
        '--talk-offset-y': `${(12 * contactPresence).toFixed(2)}px`,
        visibility: isVisible ? 'visible' : 'hidden',
        pointerEvents: isInteractive ? 'auto' : 'none'
      } as CSSProperties}
    >
      Let's talk
    </button>
  );
}

type NavTarget = {
  id: 'projects' | 'service' | 'contact';
  label: string;
  href: string;
};

const navTargets: NavTarget[] = [
  { id: 'projects', label: 'projects', href: '/projects' },
  { id: 'service', label: 'service', href: '/service' },
  { id: 'contact', label: 'contact', href: '/contact' }
];

function getActiveNav(progress: number) {
  if (progress < 0.2) return null;
  if (progress < 0.5) return 'service';
  if (progress < 0.82) return 'projects';
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
          href={target.href}
          className={active === target.id ? 'is-active' : undefined}
        >
          {target.label}
        </a>
      ))}
    </nav>
  );
}

function BrandMark({ progress, elapsed }: { progress: number; elapsed: number }) {
  const presence = clamp(map(Math.max(progress, elapsed >= getIntroDuration() ? 0.12 : 0), 0.06, 0.14, 0, 1));
  const isVisible = presence > 0.01;
  const isInteractive = presence > 0.12;

  return (
    <a
      className="brand-mark"
      href="/"
      tabIndex={isInteractive ? 0 : -1}
      aria-hidden={!isVisible}
      style={{
        opacity: presence,
        transform: `translateY(${(10 * (1 - presence)).toFixed(2)}px)`,
        visibility: isVisible ? 'visible' : 'hidden',
        pointerEvents: isInteractive ? 'auto' : 'none'
      }}
    >
      azstudio
    </a>
  );
}

function scrollToHash() {
  const hashTargets = [
    { id: 'service', progress: 1 / 3 },
    { id: 'projects', progress: 2 / 3 },
    { id: 'contact', progress: 1 }
  ];
  const target = hashTargets.find((item) => `#${item.id}` === window.location.hash);

  if (target) {
    requestAnimationFrame(() => smoothScrollToProgress(target.progress));
  }
}

function StandardPageNav() {
  return (
    <nav className="page-nav" aria-label="Primary navigation">
      <a className="page-nav-brand" href="/">azstudio</a>
      <div className="page-nav-links">
        {navTargets.map((target) => (
          <a key={target.id} href={target.href}>
            {target.label}
          </a>
        ))}
      </div>
    </nav>
  );
}

function RoutePageShell({ children, label }: { children: ReactNode; label: string }) {
  return (
    <>
      <main className="route-page" aria-label={label}>
        <div className="grain" />
        <StandardPageNav />
        {children}
      </main>
      <SeoFooter />
    </>
  );
}

function ProjectsPage() {
  const [projects, setProjects] = useState<WorkCard[]>(() => composeProjectCards());

  useEffect(() => {
    const controller = new AbortController();

    getWordPressWorks(controller.signal)
      .then((works) => {
        if (works.length > 0) {
          setProjects(composeProjectCards(works));
        }
      })
      .catch(() => {
        setProjects(composeProjectCards());
      });

    return () => controller.abort();
  }, []);

  return (
    <RoutePageShell label="AZ Studio projects">
      <section className="projects-index" aria-labelledby="projects-index-heading">
        <div className="projects-index-hero">
          <h1>{projectManifestoText}</h1>
        </div>
        <p id="projects-index-heading" className="projects-index-label">Selected work</p>
        <div className="projects-index-grid">
          {projects.map((project) => (
            <a key={project.slug} className="projects-index-card" href={`/projects/${project.slug}`}>
              <img src={project.image} alt="" loading="lazy" />
              <span>
                <small>{project.category}</small>
                <strong>{project.title}</strong>
                <em>{project.excerpt}</em>
              </span>
            </a>
          ))}
        </div>
      </section>
    </RoutePageShell>
  );
}

function ServicePage() {
  return (
    <RoutePageShell label="AZ Studio service">
      <section className="service-index" aria-labelledby="service-index-heading">
        <div className="service-index-heading">
          <p id="service-index-heading">What we do</p>
          <h1>Clear design systems for brands that need to be understood, trusted and remembered.</h1>
        </div>
        <div className="service-detail-list">
          {serviceDetails.map((service, index) => (
            <article key={service.title} className="service-detail-row">
              <div className="service-detail-copy">
                <div className="service-detail-meta">
                  <p>{service.title}</p>
                </div>
                <h2>{service.summary}</h2>
                <div className="service-detail-body">
                  <p>{service.details}</p>
                </div>
              </div>
              <div className="service-detail-media-slot" aria-hidden="true">
                <img src={serviceDetailImages[index]} alt="" loading="lazy" />
              </div>
            </article>
          ))}
        </div>
      </section>
    </RoutePageShell>
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
        action="mailto:mixzq@outlook.com"
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
  const [routePath, setRoutePath] = useState(() => window.location.pathname);
  const { progress, pointerX, pointerY, elapsed } = useStoryboardMotion(routePath === '/' || routePath === '/contact');
  const isContactFormOpen = routePath === '/contact';

  useGridHoverLight();

  useEffect(() => {
    scrollToHash();
  }, []);

  useEffect(() => {
    const onPopState = () => setRoutePath(window.location.pathname);
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  useEffect(() => {
    const originalPushState = window.history.pushState;
    const trackAfterNavigation = () => window.setTimeout(trackContentsquarePageview, 0);

    window.history.pushState = function pushStateWithContentsquare(...args) {
      const result = originalPushState.apply(this, args);
      setRoutePath(window.location.pathname);
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
    setRoutePath('/contact');
  };

  const closeContactForm = () => {
    history.pushState(null, '', '/');
    setRoutePath('/');
  };

  if (routePath === '/projects') {
    return <ProjectsPage />;
  }

  if (routePath === '/service') {
    return <ServicePage />;
  }

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
