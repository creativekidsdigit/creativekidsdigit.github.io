import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { fetchPostIndex, excerptFromMetaOrContent, buildTagIndex, buildCategoryIndex } from "@/lib/blog";
import { useMemo } from "react";

export default function BlogListPage() {
  const [posts, setPosts] = useState<any[]>([]);
  const [q, setQ] = useState("");
  const [tag, setTag] = useState<string | null>(null);
  const [category, setCategory] = useState<string | null>(null);

  useEffect(() => {
    fetchPostIndex().then((p) => setPosts(p || []));
  }, []);

  const tagIndex = useMemo(() => buildTagIndex(posts), [posts]);
  const categoryIndex = useMemo(() => buildCategoryIndex(posts), [posts]);

  const filtered = useMemo(() => {
    return posts.filter((p) => {
      if (tag && !(p.tags || []).includes(tag)) return false;
      if (category && ((p as any).category || null) !== category) return false;
      if (!q) return true;
      const txt = `${p.title} ${p.excerpt || ""} ${(p.tags || []).join(" ")} ${(p as any).category || ""}`.toLowerCase();
      return txt.includes(q.toLowerCase());
    });
  }, [posts, q, tag, category]);

  const featured = filtered[0] || null;
  const latest = filtered.slice(1, 9);

  return (
    <div className="p-6">
      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center">
        <h1 className="text-2xl font-bold">Blog</h1>
        <div className="flex items-center gap-2 ml-auto">
          <input className="input" placeholder="Search posts…" value={q} onChange={(e) => setQ(e.target.value)} />
          <select className="input" value={tag || ""} onChange={(e) => setTag(e.target.value || null)}>
            <option value="">All tags</option>
            {Object.keys(tagIndex).map((t) => (
              <option key={t} value={t}>{t} ({tagIndex[t]})</option>
            ))}
          </select>
          <select className="input" value={category || ""} onChange={(e) => setCategory(e.target.value || null)}>
            <option value="">All categories</option>
            {Object.keys(categoryIndex).map((c) => (
              <option key={c} value={c}>{c} ({categoryIndex[c]})</option>
            ))}
          </select>
        </div>
      </div>

      {posts.length === 0 && <div className="text-slate-500">No posts found.</div>}

      {featured && (
        <section className="mb-6">
          <article className="rounded-lg border p-6">
            <h2 className="text-2xl font-bold"><Link to={`/blog/${featured.slug}`}>{featured.title}</Link></h2>
            <div className="text-sm text-slate-500">{featured.date}</div>
            <p className="mt-3 text-slate-700">{featured.excerpt}</p>
            <div className="mt-4">
              {(featured.tags || []).map((t: string) => <span key={t} className="chip mr-2">{t}</span>)}
            </div>
          </article>
        </section>
      )}

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {latest.map((post) => (
          <article key={post.slug} className="rounded-lg border p-4 hover:shadow">
            <h3 className="font-semibold text-lg"><Link to={`/blog/${post.slug}`}>{post.title}</Link></h3>
            <div className="text-sm text-slate-500">{post.date}</div>
            <p className="mt-2 text-slate-700">{post.excerpt}</p>
            <div className="mt-3 flex flex-wrap gap-2">{(post.tags || []).map((t: string) => <button key={t} onClick={() => setTag(t)} className="chip">{t}</button>)}</div>
          </article>
        ))}
      </section>

      <aside className="mt-6">
        <div className="mb-3 text-sm font-semibold">Popular tags</div>
        <div className="flex flex-wrap gap-2">
          {Object.keys(tagIndex).slice(0, 20).map((t) => (
            <button key={t} onClick={() => setTag(t)} className="chip">{t} ({tagIndex[t]})</button>
          ))}
        </div>
      </aside>
    </div>
  );
}
