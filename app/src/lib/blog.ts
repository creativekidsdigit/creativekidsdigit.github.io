import matter from "gray-matter";
import { marked } from "marked";
import DOMPurify from "dompurify";

export interface PostMeta {
  title: string;
  date?: string;
  slug?: string;
  tags?: string[];
  excerpt?: string;
  [key: string]: any;
}

export async function fetchPostIndex(): Promise<PostMeta[]> {
  try {
    const res = await fetch(`/content/posts/index.json`);
    if (!res.ok) return [];
    const json = await res.json();
    return json as PostMeta[];
  } catch (e) {
    return [];
  }
}

export async function fetchPostBySlug(slug: string): Promise<{ meta: PostMeta; html: string; raw: string } | null> {
  try {
    const res = await fetch(`/content/posts/${slug}.md`);
    if (!res.ok) return null;
    const raw = await res.text();
    const parsed = matter(raw);
    const dirty = marked(parsed.content || "");
    const html = DOMPurify.sanitize(dirty);
    const meta = parsed.data as PostMeta;
    meta.slug = meta.slug || slug;
    return { meta, html, raw };
  } catch (e) {
    return null;
  }
}

export function excerptFromMetaOrContent(meta: PostMeta, raw: string) {
  if (meta.excerpt) return meta.excerpt;
  const first = raw.split(/\n\n/).find(Boolean) || "";
  return first.replace(/[#_*`>\-]/g, "").slice(0, 200);
}

export function buildTagIndex(posts: PostMeta[]) {
  const map: Record<string, number> = {};
  posts.forEach((p) => (p.tags || []).forEach((t) => (map[t] = (map[t] || 0) + 1)));
  return map;
}

export function buildCategoryIndex(posts: PostMeta[]) {
  const map: Record<string, number> = {};
  posts.forEach((p) => {
    const cat = (p as any).category;
    if (cat) map[cat] = (map[cat] || 0) + 1;
  });
  return map;
}

export function findRelatedPosts(target: PostMeta, posts: PostMeta[], max = 4) {
  const byScore = posts
    .filter((p) => p.slug !== target.slug)
    .map((p) => {
      const shared = (p.tags || []).filter((t) => (target.tags || []).includes(t)).length;
      return { p, score: shared };
    })
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, max)
    .map((r) => r.p);
  return byScore;
}

export function findPrevNext(slug: string, posts: PostMeta[]) {
  const idx = posts.findIndex((p) => p.slug === slug);
  if (idx === -1) return { prev: null, next: null };
  return { prev: posts[idx - 1] || null, next: posts[idx + 1] || null };
}

export function buildSearchIndex(posts: PostMeta[]) {
  return posts.map((p) => ({ slug: p.slug, title: p.title, excerpt: p.excerpt || "", tags: p.tags || [], category: (p as any).category || null }));
}
