import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { fetchPostBySlug, fetchPostIndex, findRelatedPosts, findPrevNext } from "@/lib/blog";

export default function BlogPostPage() {
  const { slug } = useParams<{ slug: string }>();
  const [post, setPost] = useState<any | null>(null);
  const [related, setRelated] = useState<any[]>([]);
  const [prevNext, setPrevNext] = useState<{ prev: any | null; next: any | null }>({ prev: null, next: null });

  useEffect(() => {
    if (!slug) return;
    (async () => {
      const p = await fetchPostBySlug(slug);
      if (!p) return;
      setPost(p);
      document.title = p.meta?.title || "Blog";
      const desc = p.meta?.excerpt || "";
      let el = document.querySelector("meta[name=description]") as HTMLMetaElement | null;
      if (!el) {
        el = document.createElement("meta");
        el.name = "description";
        document.head.appendChild(el);
      }
      el.content = desc;

      // Open Graph / Twitter
      function setMeta(name: string, content: string) {
        let m = document.querySelector(`meta[name="${name}"]`) as HTMLMetaElement | null;
        if (!m) {
          m = document.createElement("meta");
          m.setAttribute("name", name);
          document.head.appendChild(m);
        }
        m.content = content;
      }
      function setProperty(prop: string, content: string) {
        let m = document.querySelector(`meta[property="${prop}"]`) as HTMLMetaElement | null;
        if (!m) {
          m = document.createElement("meta");
          m.setAttribute("property", prop);
          document.head.appendChild(m);
        }
        m.content = content;
      }

      const base = window.location.origin;
      const url = `${base}/blog/${slug}`;
      // canonical link
      let link = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
      if (!link) {
        link = document.createElement("link");
        link.rel = "canonical";
        document.head.appendChild(link);
      }
      link.href = url;

      // image: use post image or site default
      const image = p.meta.image ? (p.meta.image.startsWith("http") ? p.meta.image : `${base}${p.meta.image.startsWith("/") ? "" : "/"}${p.meta.image}`) : `${base}/icon.svg`;
      setProperty("og:image", image);
      setMeta("twitter:image", image);
      setProperty("og:title", p.meta.title || "");
      setProperty("og:description", desc);
      setProperty("og:url", url);
      setMeta("twitter:card", "summary_large_image");
      setMeta("twitter:title", p.meta.title || "");
      setMeta("twitter:description", desc);

      // related & prev/next
      const idx = await fetchPostIndex();
      const related = findRelatedPosts(p.meta, idx as any[]);
      const { prev, next } = findPrevNext(p.meta.slug || slug, idx as any[]);
      setRelated(related);
      setPrevNext({ prev, next });

        // JSON-LD: BlogPosting, BreadcrumbList, Organization
        try {
          const siteName = document.title || window.location.hostname;
          const ld = {
            "@context": "https://schema.org",
            "@type": "BlogPosting",
            headline: p.meta.title,
            description: desc,
            datePublished: p.meta.date,
            author: { "@type": "Organization", name: siteName },
            mainEntityOfPage: { "@type": "WebPage", "@id": url },
            image: image,
          };

          const breadcrumb = {
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: "Home", item: `${base}/` },
              { "@type": "ListItem", position: 2, name: "Blog", item: `${base}/blog` },
              { "@type": "ListItem", position: 3, name: p.meta.title, item: url },
            ],
          };

          const org = { "@context": "https://schema.org", "@type": "Organization", name: siteName, url: base };

          function upsertLd(id: string, obj: any) {
            let s = document.getElementById(id) as HTMLScriptElement | null;
            if (!s) {
              s = document.createElement("script");
              s.type = "application/ld+json";
              s.id = id;
              document.head.appendChild(s);
            }
            s.textContent = JSON.stringify(obj);
          }

          upsertLd("ld-blogposting", ld);
          upsertLd("ld-breadcrumb", breadcrumb);
          upsertLd("ld-organization", org);
        } catch (e) {
          /* ignore */
        }
    })();
  }, [slug]);

  if (!post) return <div className="p-6">Loading...</div>;

  return (
    <article className="prose lg:prose-xl p-6">
      <nav className="text-sm text-slate-500 mb-2">
        <Link to="/blog">← Back to Blog</Link>
      </nav>
      <h1>{post.meta.title}</h1>
      <div className="text-sm text-slate-500">{post.meta.date}</div>
      <div dangerouslySetInnerHTML={{ __html: post.html }} />
      <footer className="mt-8 text-sm text-slate-500">Tags: {post.meta.tags?.join(", ")}</footer>

      <section className="mt-10">
        <div className="text-lg font-semibold mb-2">Related</div>
        <div className="flex flex-wrap gap-3">
          {related.length === 0 && <div className="text-slate-500">No related posts.</div>}
          {related.map((r) => (
            <Link key={r.slug} to={`/blog/${r.slug}`} className="chip">
              {r.title}
            </Link>
          ))}
        </div>
      </section>

      <nav className="mt-8 flex justify-between">
          {prevNext.prev ? (
            <Link to={`/blog/${prevNext.prev.slug}`} className="text-slate-600">← {prevNext.prev.title}</Link>
          ) : <div />}
          {prevNext.next ? (
            <Link to={`/blog/${prevNext.next.slug}`} className="text-slate-600">{prevNext.next.title} →</Link>
          ) : <div />}
      </nav>
    </article>
  );
}
