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
  | string
  | {
      url?: string;
      source_url?: string;
      sizes?: Record<string, string>;
    };

const WORDPRESS_API_BASE =
  import.meta.env.VITE_WORDPRESS_API_BASE ??
  'https://public-api.wordpress.com/wp/v2/sites/mixzq9.wordpress.com';

const LOCAL_PREVIEW_WORK: WordPressWork = {
  id: 'local-preview-test-project',
  slug: 'test-project',
  title: 'Test Project',
  category: 'Test Project',
  excerpt: 'A local preview used to verify the WordPress and React project data connection.',
  contentHtml: `
    <figure class="wp-block-image size-full">
      <img src="/PIC/fotland_bryggeri/content-part-01.webp" srcset="/PIC/fotland_bryggeri/content-part-01-1280.webp 1280w, /PIC/fotland_bryggeri/content-part-01.webp 3200w" sizes="100vw" alt="" width="3200" height="2583" loading="lazy" decoding="async" />
    </figure>
    <figure class="wp-block-image size-full">
      <img src="/PIC/fotland_bryggeri/content-part-02.webp" srcset="/PIC/fotland_bryggeri/content-part-02-1280.webp 1280w, /PIC/fotland_bryggeri/content-part-02.webp 3200w" sizes="100vw" alt="" width="3200" height="2583" loading="lazy" decoding="async" />
    </figure>
    <figure class="wp-block-image size-full">
      <img src="/PIC/fotland_bryggeri/content-part-03.webp" srcset="/PIC/fotland_bryggeri/content-part-03-1280.webp 1280w, /PIC/fotland_bryggeri/content-part-03.webp 3200w" sizes="100vw" alt="" width="3200" height="2583" loading="lazy" decoding="async" />
    </figure>
    <figure class="wp-block-image size-full">
      <img src="/PIC/fotland_bryggeri/content-part-04.webp" srcset="/PIC/fotland_bryggeri/content-part-04-1280.webp 1280w, /PIC/fotland_bryggeri/content-part-04.webp 3200w" sizes="100vw" alt="" width="3200" height="2583" loading="lazy" decoding="async" />
    </figure>
  `,
  image: '/PIC/Frame 149.png',
  showOnHome: false,
  displayOrder: 999,
  seoTitle: 'Test Project | AZ Studio',
  seoDescription: 'A local test project for validating the AZ Studio portfolio template.',
  projectDetail: {
    heroBackground: '/PIC/fotland_bryggeri/top_part_background.webp',
    heroBackgroundSrcSet: '/PIC/fotland_bryggeri/top_part_background-1280.webp 1280w, /PIC/fotland_bryggeri/top_part_background.webp 2560w',
    heroLogo: '/PIC/fotland_bryggeri/logo.svg',
    heroSummary: 'A structured test case for checking project cards, detail pages and content fields.',
    client: 'AZ Studio',
    year: '2026',
    location: 'Oslo, Norway',
    services: 'Brand Identity\nWeb Design',
    aboutBrandHtml: '<p>This local preview shows how structured WordPress fields become a consistent case study page.</p>',
    projectGoalsHtml: '<p>Confirm the card data, hero layout, detail content and responsive presentation before migrating the real projects.</p>'
  }
};

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

function imageFromPost(post: WordPressPost) {
  const media = post._embedded?.['wp:featuredmedia']?.[0];
  const image =
    media?.media_details?.sizes?.large?.source_url ??
    media?.media_details?.sizes?.medium_large?.source_url ??
    media?.media_details?.sizes?.medium?.source_url ??
    media?.source_url ??
    post.jetpack_featured_media_url;

  return image || undefined;
}

function imageFromField(image?: WordPressImageField) {
  if (typeof image === 'string') return image || undefined;

  return image?.sizes?.large ?? image?.sizes?.medium_large ?? image?.url ?? image?.source_url;
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
  url.searchParams.set('_cacheBust', Date.now().toString());

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

function mapWordPressWork(post: WordPressPost): WordPressWork {
  const acf = post.acf;
  const excerpt = textFromHtml(acf?.card_summary) || textFromHtml(post.excerpt?.rendered);
  const image = imageFromField(acf?.card_image) ?? imageFromPost(post);
  const order = Number(acf?.display_order);

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
    socialImage: imageFromField(acf?.social_image),
    projectDetail: acf
      ? {
          heroBackground: imageFromField(acf.hero_background) ?? image,
          heroLogo: imageFromField(acf.hero_logo),
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
  let posts: WordPressPost[];

  try {
    const projects = await getWordPressPosts('projects', signal);
    posts = projects.length > 0 ? projects : await getWordPressPosts('posts', signal);
  } catch {
    posts = await getWordPressPosts('posts', signal);
  }

  const works = posts.map(mapWordPressWork);
  const worksWithPreview = import.meta.env.DEV
    ? [...works.filter((work) => work.slug !== LOCAL_PREVIEW_WORK.slug), LOCAL_PREVIEW_WORK]
    : works;

  return worksWithPreview
    .sort((first, second) => first.displayOrder - second.displayOrder);
}
