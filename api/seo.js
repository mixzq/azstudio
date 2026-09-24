import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

const SITE_URL = 'https://azstudio.no';
const DEFAULT_IMAGE = `${SITE_URL}/PIC/Frame%20148.png`;
const WORDPRESS_API_BASE = process.env.VITE_WORDPRESS_API_BASE
  ?? 'https://public-api.wordpress.com/wp/v2/sites/mixzq9.wordpress.com';

const pages = {
  '/start': {
    title: 'Brand Identity and Web Design for Small Businesses | AZ Studio',
    description: 'Take the first step with AZ Studio. Explore brand identity, web design and creative support for small businesses and emerging brands in Norway.',
    type: 'WebPage'
  },
  '/service': {
    title: 'Brand Identity, Web Design and Creative Support | AZ Studio',
    description: 'Explore AZ Studio services in brand identity, web design and ongoing creative support for businesses ready to build a clearer presence.',
    type: 'WebPage'
  },
  '/projects': {
    title: 'Selected Brand Identity and Web Design Projects | AZ Studio',
    description: 'Explore selected AZ Studio projects in brand identity, logo design and digital experiences for independent brands and small businesses.',
    type: 'CollectionPage'
  },
  '/contact': {
    title: 'Contact AZ Studio | Start a Brand or Web Project',
    description: 'Get in touch with AZ Studio in Norway to discuss brand identity, web design or a new creative project.',
    type: 'ContactPage'
  }
};

let templatePromise;
let projectsCache;

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[character]);
}

function textFromHtml(value) {
  return String(value ?? '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([\da-f]+);/gi, (_, code) => String.fromCodePoint(parseInt(code, 16)))
    .replace(/&(amp|lt|gt|quot|apos|nbsp);/gi, (_, name) => ({
      amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' '
    })[name.toLowerCase()])
    .replace(/\s+/g, ' ')
    .trim();
}

function conciseDescription(value) {
  const text = textFromHtml(value);
  if (text.length <= 160) return text;
  const shortened = text.slice(0, 160);
  return shortened.slice(0, shortened.lastIndexOf(' ')).trimEnd() + '…';
}

function imageUrl(field) {
  if (typeof field === 'string' && /^https?:\/\//.test(field)) return field;
  if (!field || typeof field !== 'object') return undefined;
  return field.url || field.source_url || field.sizes?.large || undefined;
}

async function fetchProjects() {
  if (projectsCache && Date.now() - projectsCache.savedAt < 5 * 60 * 1000) {
    return projectsCache.projects;
  }

  const projects = [];
  let totalPages = 1;

  for (let page = 1; page <= totalPages; page += 1) {
    const url = new URL(`${WORDPRESS_API_BASE.replace(/\/$/, '')}/projects`);
    url.searchParams.set('per_page', '100');
    url.searchParams.set('page', String(page));
    url.searchParams.set('acf_format', 'standard');
    url.searchParams.set('_fields', 'id,slug,status,title,excerpt,modified_gmt,acf,jetpack_featured_media_url');

    const response = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!response.ok) throw new Error(`WordPress projects returned ${response.status}`);

    projects.push(...await response.json());
    totalPages = Number(response.headers.get('x-wp-totalpages')) || 1;
  }

  projectsCache = { savedAt: Date.now(), projects };
  return projects;
}

function projectMetadata(project) {
  const title = textFromHtml(project.acf?.seo_title)
    || `${textFromHtml(project.title?.rendered) || project.slug} | AZ Studio`;
  const description = conciseDescription(
    project.acf?.seo_description
    || project.acf?.about_brand
    || project.acf?.hero_summary
    || project.acf?.card_summary
    || project.excerpt?.rendered
  ) || `Explore the ${textFromHtml(project.title?.rendered) || project.slug} creative project by AZ Studio.`;

  return {
    title,
    description,
    image: imageUrl(project.acf?.social_image)
      || imageUrl(project.acf?.card_image)
      || imageUrl(project.acf?.hero_background)
      || project.jetpack_featured_media_url
      || DEFAULT_IMAGE,
    type: 'WebPage',
    projectName: textFromHtml(project.title?.rendered) || project.slug
  };
}

function seoMarkup(path, page) {
  const url = `${SITE_URL}${path}`;
  const title = escapeHtml(page.title);
  const description = escapeHtml(page.description);
  const image = escapeHtml(page.image || DEFAULT_IMAGE);
  const schema = {
    '@context': 'https://schema.org',
    '@type': page.type,
    '@id': `${url}#webpage`,
    url,
    name: page.title,
    description: page.description,
    isPartOf: { '@id': `${SITE_URL}/#website` },
    publisher: { '@id': `${SITE_URL}/#organization` }
  };

  if (page.projectName) {
    schema.mainEntity = {
      '@type': 'CreativeWork',
      name: page.projectName,
      description: page.description,
      image: page.image,
      creator: { '@id': `${SITE_URL}/#organization` }
    };
  }

  return `<!-- SEO_START -->
    <title>${title}</title>
    <meta name="description" content="${description}" />
    <meta name="robots" content="index, follow" />
    <link rel="canonical" href="${escapeHtml(url)}" />
    <meta property="og:type" content="website" />
    <meta property="og:url" content="${escapeHtml(url)}" />
    <meta property="og:title" content="${title}" />
    <meta property="og:description" content="${description}" />
    <meta property="og:image" content="${image}" />
    <meta property="og:image:alt" content="${escapeHtml(page.projectName || 'AZ Studio creative work')}" />
    <meta property="og:site_name" content="AZ Studio" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${title}" />
    <meta name="twitter:description" content="${description}" />
    <meta name="twitter:image" content="${image}" />
    <script type="application/ld+json">${JSON.stringify(schema).replace(/</g, '\\u003c')}</script>
    <!-- SEO_END -->`;
}

async function htmlTemplate() {
  templatePromise ??= readFile(join(process.cwd(), 'dist', 'index.html'), 'utf8');
  return templatePromise;
}

async function sendPage(response, path, page) {
  const template = await htmlTemplate();
  const html = template.replace(/<!-- SEO_START -->[\s\S]*?<!-- SEO_END -->/, seoMarkup(path, page));
  if (html === template) throw new Error('SEO markers missing from built HTML');
  response.setHeader('Content-Type', 'text/html; charset=utf-8');
  response.setHeader('Cache-Control', 'public, max-age=0, s-maxage=300, stale-while-revalidate=3600');
  response.status(200).end(html);
}

function sendSitemap(response, projects) {
  const paths = ['/', ...Object.keys(pages), ...projects
    .filter((project) => project.status === 'publish' && /^[a-z0-9_-]+$/i.test(project.slug))
    .map((project) => `/projects/${project.slug}`)];
  const urls = [...new Set(paths)].map((path) => `  <url><loc>${escapeHtml(`${SITE_URL}${path}`)}</loc></url>`);
  response.setHeader('Content-Type', 'application/xml; charset=utf-8');
  response.setHeader('Cache-Control', 'public, max-age=0, s-maxage=300, stale-while-revalidate=3600');
  response.status(200).end(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>`);
}

export default async function handler(request, response) {
  const path = typeof request.query.path === 'string' ? request.query.path : '';

  try {
    if (path === '/sitemap.xml') {
      sendSitemap(response, await fetchProjects());
      return;
    }

    if (pages[path]) {
      await sendPage(response, path, pages[path]);
      return;
    }

    const projectSlug = /^\/projects\/([a-z0-9_-]+)$/i.exec(path)?.[1];
    if (projectSlug) {
      const project = (await fetchProjects()).find((item) => item.slug === projectSlug && item.status === 'publish');
      if (project) {
        await sendPage(response, path, projectMetadata(project));
        return;
      }
    }

    response.setHeader('X-Robots-Tag', 'noindex');
    response.status(404).end('Not found');
  } catch (error) {
    console.error('SEO response failed', error);
    response.setHeader('X-Robots-Tag', 'noindex');
    response.status(503).end('Temporarily unavailable');
  }
}
