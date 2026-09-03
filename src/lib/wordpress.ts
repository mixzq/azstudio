export type WordPressWork = {
  id: string;
  title: string;
  category: string;
  excerpt: string;
  contentHtml: string;
  image?: string;
  sourceUrl?: string;
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

const WORDPRESS_API_BASE =
  import.meta.env.VITE_WORDPRESS_API_BASE ??
  'https://public-api.wordpress.com/wp/v2/sites/mixzq9.wordpress.com';

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

function categoryFromPost(post: WordPressPost) {
  const terms = post._embedded?.['wp:term']?.flat() ?? [];
  return terms.find((term) => post.categories?.includes(term.id))?.name ?? 'WordPress CMS';
}

export async function getWordPressWorks(signal?: AbortSignal): Promise<WordPressWork[]> {
  const url = new URL(`${WORDPRESS_API_BASE}/posts`);
  url.searchParams.set('per_page', '10');
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

  const posts = (await response.json()) as WordPressPost[];

  return posts.map((post) => ({
    id: `wp-${post.id}`,
    title: textFromHtml(post.title?.rendered) || post.slug,
    category: categoryFromPost(post),
    excerpt: textFromHtml(post.excerpt?.rendered),
    contentHtml: post.content?.rendered ?? '',
    image: imageFromPost(post),
    sourceUrl: post.link
  }));
}
