export type WordPressWork = {
  id: string;
  slug: string;
  title: string;
  category: string;
  excerpt: string;
  contentHtml: string;
  image?: string;
  sourceUrl?: string;
  showOnHome: boolean;
  displayOrder: number;
  seoTitle?: string;
  seoDescription?: string;
  socialImage?: string;
  projectDetail?: {
    heroBackground?: string;
    heroBackgroundSrcSet?: string;
    heroLogo?: string;
    heroSummary: string;
    client?: string;
    year?: string;
    location?: string;
    services?: string;
    aboutBrandHtml?: string;
    projectGoalsHtml?: string;
  };
};

type RenderedField = {
  rendered?: string;
};

type WordPressCategory = {
  id: number;
  name: string;
  slug: string;
};

type WordPressMedia = {
  source_url?: string;
  media_details?: {
    width?: number;
    sizes?: Record<string, { source_url?: string; width?: number }>;
  };
};

type WordPressPost = {
  id: number;
  slug: string;
  link?: string;
  jetpack_featured_media_url?: string;
  title?: RenderedField;
  excerpt?: RenderedField;
  content?: RenderedField;
  categories?: number[];
  acf?: {
    project_category?: string;
    card_image?: WordPressImageField;
    card_summary?: string;
    show_on_home?: boolean | number | string;
    display_order?: number | string;
    hero_background?: WordPressImageField;
    hero_logo?: WordPressImageField;
    hero_summary?: string;
    client?: string;
    year?: string;
    location?: string;
    services?: string;
    about_brand?: string;
    project_goals?: string;
    seo_title?: string;
    seo_description?: string;
    social_image?: WordPressImageField;
  };
  _embedded?: {
    'wp:featuredmedia'?: Array<{
      source_url?: string;
      media_details?: {
        sizes?: Record<string, { source_url?: string }>;
      };
    }>;
    'wp:term'?: WordPressCategory[][];
  };
};

type WordPressImageField =
  | number
  | string
  | {
      url?: string;
      source_url?: string;
      width?: number;
      sizes?: Record<string, string | number | false>;
    };

type ResponsiveImage = {
  src?: string;
  srcSet?: string;
};

const WORDPRESS_API_BASE =
  import.meta.env.VITE_WORDPRESS_API_BASE ??
  'https://public-api.wordpress.com/wp/v2/sites/mixzq9.wordpress.com';
const WORKS_CACHE_KEY = 'azstudio:wordpress-works:v2';
const WORKS_CACHE_MAX_AGE = 60 * 1000;

type CachedWorks = {
  savedAt: number;
  works: WordPressWork[];
};

let cachedWorks: CachedWorks | null = null;

export function getCachedWordPressWorks(): WordPressWork[] {
  if (cachedWorks) return cachedWorks.works;

  try {
    const stored = window.sessionStorage.getItem(WORKS_CACHE_KEY);
    if (!stored) return [];
    const parsed = JSON.parse(stored) as CachedWorks;
    if (!Number.isFinite(parsed.savedAt) || !Array.isArray(parsed.works)) return [];
    cachedWorks = parsed;
    return parsed.works;
  } catch {
    return [];
  }
}

function cacheWordPressWorks(works: WordPressWork[]) {
  cachedWorks = { savedAt: Date.now(), works };
  try {
    window.sessionStorage.setItem(WORKS_CACHE_KEY, JSON.stringify(cachedWorks));
  } catch {
    // Keep the in-memory cache if session storage is unavailable.
  }
}

function decodeHtml(value: string) {
  const textarea = document.createElement('textarea');
  textarea.innerHTML = value;
  return textarea.value;
}

function textFromHtml(value?: string) {
  if (!value) return '';

  const template = document.createElement('template');
  template.innerHTML = value;
  return decodeHtml(template.content.textContent?.replace(/\s+/g, ' ').trim() ?? '');
}

function imageFromMedia(media?: WordPressMedia) {
  return (
    media?.media_details?.sizes?.large?.source_url ??
    media?.media_details?.sizes?.medium_large?.source_url ??
    media?.media_details?.sizes?.medium?.source_url ??
    media?.source_url
  );
}

function imageFromPost(post: WordPressPost) {
  const image = imageFromMedia(post._embedded?.['wp:featuredmedia']?.[0]) ?? post.jetpack_featured_media_url;

  return image || undefined;
}

function imageFromField(image?: WordPressImageField) {
  if (typeof image === 'number') return undefined;
  if (typeof image === 'string') {
    const value = image.trim();
    return /^\d+$/.test(value) ? undefined : value || undefined;
  }

  const large = image?.sizes?.large;
  const mediumLarge = image?.sizes?.medium_large;

  return (
    (typeof large === 'string' ? large : undefined) ??
    (typeof mediumLarge === 'string' ? mediumLarge : undefined) ??
    image?.url ??
    image?.source_url
  );
}

function responsiveImageFromField(image?: WordPressImageField): ResponsiveImage {
  const src = imageFromField(image);
  if (!image || typeof image === 'number' || typeof image === 'string') return { src };

  const candidates = [
    ['medium_large', 768],
    ['large', 1024],
    ['1536x1536', 1536],
    ['2048x2048', 2048]
  ].flatMap(([name, fallbackWidth]) => {
    const url = image.sizes?.[name];
    const storedWidth = Number(image.sizes?.[`${name}-width`]);
    if (typeof url !== 'string') return [];
    return [{ url, width: storedWidth > 0 ? storedWidth : Number(fallbackWidth) }];
  });

  const originalUrl = image.url ?? image.source_url;
  if (originalUrl && Number(image.width) > 0) {
    candidates.push({ url: originalUrl, width: Number(image.width) });
  }

  const uniqueCandidates = Array.from(
    new Map(candidates.map((candidate) => [candidate.width, candidate])).values()
  ).sort((first, second) => first.width - second.width);

  return {
    src,
    srcSet: uniqueCandidates.length > 1
      ? uniqueCandidates.map((candidate) => `${candidate.url} ${candidate.width}w`).join(', ')
      : undefined
  };
}

function responsiveImageFromMedia(media?: WordPressMedia): ResponsiveImage {
  const src = imageFromMedia(media);
  const candidates = Object.values(media?.media_details?.sizes ?? {}).flatMap((size) => (
    size.source_url && Number(size.width) > 0
      ? [{ url: size.source_url, width: Number(size.width) }]
      : []
  ));

  if (media?.source_url && Number(media.media_details?.width) > 0) {
    candidates.push({ url: media.source_url, width: Number(media.media_details?.width) });
  }

  const uniqueCandidates = Array.from(
    new Map(candidates.map((candidate) => [candidate.width, candidate])).values()
  ).sort((first, second) => first.width - second.width);

  return {
    src,
    srcSet: uniqueCandidates.length > 1
      ? uniqueCandidates.map((candidate) => `${candidate.url} ${candidate.width}w`).join(', ')
      : undefined
  };
}

function mediaIdFromField(image?: WordPressImageField) {
  if (typeof image === 'number') return Number.isInteger(image) && image > 0 ? image : undefined;
  if (typeof image !== 'string' || !/^\d+$/.test(image.trim())) return undefined;

  const id = Number(image);
  return Number.isInteger(id) && id > 0 ? id : undefined;
}

async function fetchMediaImage(url: string, signal?: AbortSignal) {
  try {
    const response = await fetch(url, {
      headers: {
        Accept: 'application/json'
      },
      signal
    });

    if (!response.ok) return {};
    return responsiveImageFromMedia((await response.json()) as WordPressMedia);
  } catch (error) {
    if (signal?.aborted) throw error;
    return {};
  }
}

function resolveImageField(
  image: WordPressImageField | undefined,
  post: WordPressPost,
  mediaCache: Map<string, Promise<ResponsiveImage>>,
  signal?: AbortSignal
): Promise<ResponsiveImage> {
  const directImage = responsiveImageFromField(image);
  if (directImage.src) return Promise.resolve(directImage);

  const mediaId = mediaIdFromField(image);
  if (!mediaId || !post.link) return Promise.resolve<ResponsiveImage>({});

  const mediaUrl = new URL(`/wp-json/wp/v2/media/${mediaId}`, post.link).toString();
  const cachedRequest = mediaCache.get(mediaUrl);
  if (cachedRequest) return cachedRequest;

  const request = fetchMediaImage(mediaUrl, signal);
  mediaCache.set(mediaUrl, request);
  return request;
}

function categoryFromPost(post: WordPressPost) {
  const terms = post._embedded?.['wp:term']?.flat() ?? [];
  return terms.find((term) => post.categories?.includes(term.id))?.name ?? 'WordPress CMS';
}

async function getWordPressPosts(endpoint: 'projects' | 'posts', signal?: AbortSignal) {
  const url = new URL(`${WORDPRESS_API_BASE}/${endpoint}`);
  url.searchParams.set('per_page', '100');
  url.searchParams.set('orderby', 'date');
  url.searchParams.set('order', 'desc');
  url.searchParams.set('_embed', 'wp:featuredmedia,wp:term');
  url.searchParams.set('acf_format', 'standard');

  const response = await fetch(url, {
    headers: {
      Accept: 'application/json'
    },
    signal
  });

  if (!response.ok) {
    throw new Error(`WordPress API returned ${response.status}`);
  }

  return (await response.json()) as WordPressPost[];
}

async function mapWordPressWork(
  post: WordPressPost,
  mediaCache: Map<string, Promise<ResponsiveImage>>,
  signal?: AbortSignal
): Promise<WordPressWork> {
  const acf = post.acf;
  const excerpt = textFromHtml(acf?.card_summary) || textFromHtml(post.excerpt?.rendered);
  const order = Number(acf?.display_order);
  const [cardImage, heroBackground, heroLogo, socialImage] = await Promise.all([
    resolveImageField(acf?.card_image, post, mediaCache, signal),
    resolveImageField(acf?.hero_background, post, mediaCache, signal),
    resolveImageField(acf?.hero_logo, post, mediaCache, signal),
    resolveImageField(acf?.social_image, post, mediaCache, signal)
  ]);
  const image = cardImage.src ?? imageFromPost(post);

  return {
    id: `wp-${post.id}`,
    slug: post.slug,
    title: textFromHtml(post.title?.rendered) || post.slug,
    category: textFromHtml(acf?.project_category) || categoryFromPost(post),
    excerpt,
    contentHtml: post.content?.rendered ?? '',
    image,
    sourceUrl: post.link,
    showOnHome: acf ? Boolean(Number(acf.show_on_home)) || acf.show_on_home === true : true,
    displayOrder: Number.isFinite(order) ? order : 100,
    seoTitle: textFromHtml(acf?.seo_title) || undefined,
    seoDescription: textFromHtml(acf?.seo_description) || undefined,
    socialImage: socialImage.src,
    projectDetail: acf
      ? {
          heroBackground: heroBackground.src ?? image,
          heroBackgroundSrcSet: heroBackground.srcSet,
          heroLogo: heroLogo.src,
          heroSummary: textFromHtml(acf.hero_summary) || excerpt,
          client: textFromHtml(acf.client) || undefined,
          year: textFromHtml(acf.year) || undefined,
          location: textFromHtml(acf.location) || undefined,
          services: textFromHtml(acf.services) || undefined,
          aboutBrandHtml: acf.about_brand || undefined,
          projectGoalsHtml: acf.project_goals || undefined
        }
      : undefined
  };
}

export async function getWordPressWorks(signal?: AbortSignal): Promise<WordPressWork[]> {
  const cached = getCachedWordPressWorks();
  if (cachedWorks && Date.now() - cachedWorks.savedAt < WORKS_CACHE_MAX_AGE) {
    return cached;
  }

  let posts: WordPressPost[];

  try {
    const projects = await getWordPressPosts('projects', signal);
    posts = projects.length > 0 ? projects : await getWordPressPosts('posts', signal);
  } catch {
    posts = await getWordPressPosts('posts', signal);
  }

  const mediaCache = new Map<string, Promise<ResponsiveImage>>();
  const works = await Promise.all(posts.map((post) => mapWordPressWork(post, mediaCache, signal)));
  const sortedWorks = works.sort((first, second) => first.displayOrder - second.displayOrder);
  cacheWordPressWorks(sortedWorks);
  return sortedWorks;
}
