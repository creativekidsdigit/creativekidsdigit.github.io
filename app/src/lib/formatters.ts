// Pure formatters for Publishing Workspace output.
//
// The AI generators produce markdown. Most target platforms accept plain text
// or HTML, not markdown. These functions transform a generated asset into the
// shape each platform wants without adding any dependency.
//
// Scope is deliberately narrow: only the patterns the built-in prompt
// templates in lib/defaults.ts actually emit (#/##/###/, **bold**, *italic*,
// inline `code`, fenced ``` blocks, [link](url), -/* bullets, 1. numbered
// lists, blockquotes, --- rules, paragraphs separated by blank lines).
// Edge cases of "real" markdown (tables, footnotes, raw HTML, reference
// links) are intentionally not handled and pass through unchanged.

export type FormatId = "markdown" | "plain" | "html";

export const FORMAT_LABELS: Record<FormatId, string> = {
  markdown: "Markdown",
  plain: "Plain text",
  html: "HTML",
};

export const FORMAT_IDS: readonly FormatId[] = ["plain", "markdown", "html"];

/** Public API: format `text` (assumed markdown) into the requested shape. */
export function format(text: string, fmt: FormatId): string {
  if (fmt === "markdown") return text;
  if (fmt === "plain") return toPlainText(text);
  if (fmt === "html") return toHtml(text);
  return text;
}

/* -----------------------------------------------------------------------
 * Plain text
 * -------------------------------------------------------------------- */

/**
 * Strip the markdown markers most often produced by the built-in prompts.
 *
 * - Headings: drop the `#` markers but keep the heading text
 * - Bold / italic: drop `**` / `__` / `*` / `_` but keep the word
 * - Inline code: drop backticks
 * - Fenced code blocks: drop the fence lines, keep the inner text
 * - Links: keep the link text, drop the URL
 * - Blockquote markers, horizontal rules: drop
 * - Bullets and numbered list markers: preserve readability
 */
export function toPlainText(md: string): string {
  let s = md;

  // Fenced code blocks: drop the fence, keep contents.
  s = s.replace(/```[\w]*\n([\s\S]*?)\n```/g, "$1");

  // Headings (drop leading #s and the space after them)
  s = s.replace(/^#{1,6}\s+/gm, "");

  // Bold (double markers — handled before single markers)
  s = s.replace(/\*\*([\s\S]+?)\*\*/g, "$1");
  s = s.replace(/__([\s\S]+?)__/g, "$1");

  // Italic (single markers). Use lookarounds to avoid eating bullets like "* item"
  // (a bullet has a space after the asterisk; italics don't).
  s = s.replace(/(^|[^*\w])\*([^*\n]+?)\*(?!\*)/g, "$1$2");
  s = s.replace(/(^|[^_\w])_([^_\n]+?)_(?!_)/g, "$1$2");

  // Inline code
  s = s.replace(/`([^`\n]+)`/g, "$1");

  // Links: [text](url) → text
  s = s.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");

  // Blockquote markers
  s = s.replace(/^\s*>\s?/gm, "");

  // Horizontal rules
  s = s.replace(/^\s*-{3,}\s*$/gm, "");
  s = s.replace(/^\s*\*{3,}\s*$/gm, "");

  // Collapse 3+ blank lines to a single blank line (cleanup)
  s = s.replace(/\n{3,}/g, "\n\n");

  return s.trim();
}

/* -----------------------------------------------------------------------
 * HTML
 * -------------------------------------------------------------------- */

const ESCAPE_MAP: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};
function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ESCAPE_MAP[c]);
}

/**
 * Convert a small but practical subset of markdown to HTML. Output is
 * deliberately conservative — no scripts, no inline styles, no raw HTML
 * passthrough. The goal is "paste into the WordPress / Payhip rich-text
 * editor and get something usable," not full CommonMark compliance.
 */
export function toHtml(md: string): string {
  // 1. Extract fenced code blocks first so their content isn't mangled.
  const codeBlocks: string[] = [];
  let s = md.replace(/```[\w]*\n([\s\S]*?)\n```/g, (_, body: string) => {
    const i = codeBlocks.push(`<pre><code>${escapeHtml(body)}</code></pre>`) - 1;
    return `\x00CODE${i}\x00`;
  });

  // 2. Split into "blocks" separated by blank lines, transform each.
  const blocks = s.split(/\n{2,}/).map((raw) => transformBlock(raw));
  s = blocks.join("\n\n");

  // 3. Restore code blocks.
  s = s.replace(/\x00CODE(\d+)\x00/g, (_, i: string) => codeBlocks[Number(i)] ?? "");

  return s.trim();
}

/** Apply inline markdown (bold/italic/code/links) to a fragment. */
function inlineFormat(raw: string): string {
  let s = escapeHtml(raw);
  // Bold first (longer markers)
  s = s.replace(/\*\*([^*\n]+?)\*\*/g, "<strong>$1</strong>");
  s = s.replace(/__([^_\n]+?)__/g, "<strong>$1</strong>");
  // Italic
  s = s.replace(/(^|[^*\w])\*([^*\n]+?)\*(?!\*)/g, "$1<em>$2</em>");
  s = s.replace(/(^|[^_\w])_([^_\n]+?)_(?!_)/g, "$1<em>$2</em>");
  // Inline code (after escapeHtml so &lt; works inside)
  s = s.replace(/`([^`\n]+)`/g, "<code>$1</code>");
  // Links: [text](url) → <a href="url">text</a>
  // URL is also escapeHtml'd above, which is fine for href.
  s = s.replace(
    /\[([^\]]+)\]\(([^)]+)\)/g,
    (_, text: string, href: string) => `<a href="${href}">${text}</a>`
  );
  return s;
}

/** Transform a single newline-bounded block into HTML. */
function transformBlock(raw: string): string {
  const block = raw.trim();
  if (!block) return "";

  // Code-block placeholder — passthrough.
  if (/^\x00CODE\d+\x00$/.test(block)) return block;

  // Horizontal rule
  if (/^-{3,}$|^\*{3,}$/.test(block)) return "<hr>";

  // Heading
  const heading = /^(#{1,6})\s+(.+)$/.exec(block);
  if (heading) {
    const level = heading[1].length;
    return `<h${level}>${inlineFormat(heading[2].trim())}</h${level}>`;
  }

  // Blockquote (one or more leading "> " lines)
  if (block.split("\n").every((l) => /^\s*>/.test(l))) {
    const inner = block
      .split("\n")
      .map((l) => l.replace(/^\s*>\s?/, ""))
      .join("\n");
    return `<blockquote>${inlineFormat(inner)}</blockquote>`;
  }

  // Unordered list
  if (block.split("\n").every((l) => /^\s*[-*]\s+/.test(l))) {
    const items = block
      .split("\n")
      .map((l) => l.replace(/^\s*[-*]\s+/, ""))
      .map((t) => `<li>${inlineFormat(t)}</li>`)
      .join("");
    return `<ul>${items}</ul>`;
  }

  // Ordered list
  if (block.split("\n").every((l) => /^\s*\d+\.\s+/.test(l))) {
    const items = block
      .split("\n")
      .map((l) => l.replace(/^\s*\d+\.\s+/, ""))
      .map((t) => `<li>${inlineFormat(t)}</li>`)
      .join("");
    return `<ol>${items}</ol>`;
  }

  // Paragraph (default). Preserve hard line breaks as <br>.
  const html = inlineFormat(block).replace(/\n/g, "<br>");
  return `<p>${html}</p>`;
}
