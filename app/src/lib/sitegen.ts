import { PostMeta } from "./blog";

export function generateRss(posts: PostMeta[], siteBase: string) {
  const items = posts
    .map((p) => {
      const url = `${siteBase.replace(/\/$/, "")}/blog/${p.slug}`;
      const date = p.date || new Date().toISOString();
      const desc = (p.excerpt || "").replace(/</g, "&lt;");
      return `<item><title><![CDATA[${p.title}]]></title><link>${url}</link><pubDate>${new Date(date).toUTCString()}</pubDate><description><![CDATA[${desc}]]></description><guid>${url}</guid></item>`;
    })
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0">\n<channel>\n<title>Blog</title>\n<link>${siteBase}</link>\n<description>Blog feed</description>\n${items}\n</channel>\n</rss>`;
}

export function generateSitemap(posts: PostMeta[], siteBase: string) {
  const urls = posts
    .map((p) => {
      const url = `${siteBase.replace(/\/$/, "")}/blog/${p.slug}`;
      const lastmod = p.date ? new Date(p.date).toISOString() : new Date().toISOString();
      return `<url><loc>${url}</loc><lastmod>${lastmod}</lastmod></url>`;
    })
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>`;
}
