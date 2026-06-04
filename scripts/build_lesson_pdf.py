#!/usr/bin/env python3
"""
Build a branded, downloadable PDF of the 3AS Ancient Civilizations lesson plan.

Reads:  prompts/free-sample-3as-ancient-civilizations.md
Writes: downloads/3as-ancient-civilizations-lesson-plan.pdf

Usage:  python3 scripts/build_lesson_pdf.py
"""

from __future__ import annotations

import sys
from pathlib import Path

import markdown
from weasyprint import HTML, CSS

ROOT = Path(__file__).resolve().parent.parent
SRC_MD = ROOT / "prompts" / "free-sample-3as-ancient-civilizations.md"
OUT_DIR = ROOT / "downloads"
OUT_PDF = OUT_DIR / "3as-ancient-civilizations-lesson-plan.pdf"

# Fearless Creations brand palette (mirrors styles.css / products.css).
CSS_TEMPLATE = """
@page {
    size: A4;
    margin: 18mm 16mm 22mm 16mm;
    @bottom-left {
        content: "Fearless Creations  \\2014  3AS New Prospects, Unit 1";
        font-family: 'Inter', sans-serif;
        font-size: 8pt;
        color: #8a8198;
    }
    @bottom-right {
        content: "Page " counter(page) " of " counter(pages);
        font-family: 'Inter', sans-serif;
        font-size: 8pt;
        color: #8a8198;
    }
}

@page :first {
    margin: 0;
    @bottom-left { content: ""; }
    @bottom-right { content: ""; }
}

* { box-sizing: border-box; }

html, body {
    font-family: 'Inter', 'Helvetica Neue', Arial, sans-serif;
    color: #2b2538;
    font-size: 10.5pt;
    line-height: 1.55;
    margin: 0;
    padding: 0;
    background: #ffffff;
}

/* ---------- Cover page ---------- */
.cover {
    page: cover;
    page-break-after: always;
    height: 297mm;
    width: 210mm;
    background:
        radial-gradient(circle at 85% 12%, #C9B6E4 0%, transparent 38%),
        radial-gradient(circle at 12% 88%, #E8D9F0 0%, transparent 40%),
        linear-gradient(160deg, #FBF8F3 0%, #F3ECF8 100%);
    padding: 30mm 22mm;
    position: relative;
    color: #2b2538;
}

.cover .brand {
    display: flex;
    align-items: center;
    gap: 10px;
    font-family: 'Fraunces', 'Georgia', serif;
    font-weight: 700;
    font-size: 14pt;
    color: #5C5374;
}

.cover .brand-mark {
    width: 34px;
    height: 34px;
    border-radius: 50%;
    background: #9B7FBF;
    display: inline-block;
    position: relative;
}
.cover .brand-mark::after {
    content: "";
    position: absolute;
    inset: 9px;
    border-radius: 50%;
    background: #FBF8F3;
}
.cover .brand span { color: #9B7FBF; }

.cover .eyebrow {
    margin-top: 60mm;
    display: inline-block;
    background: #9B7FBF;
    color: #FBF8F3;
    font-size: 9pt;
    font-weight: 600;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    padding: 6px 14px;
    border-radius: 999px;
}

.cover h1 {
    font-family: 'Fraunces', 'Georgia', serif;
    font-weight: 700;
    font-size: 36pt;
    line-height: 1.08;
    margin: 14mm 0 6mm 0;
    color: #2b2538;
    letter-spacing: -0.01em;
}

.cover .subtitle {
    font-family: 'Fraunces', 'Georgia', serif;
    font-size: 16pt;
    color: #5C5374;
    font-style: italic;
    margin: 0 0 14mm 0;
    max-width: 150mm;
}

.cover .meta {
    display: grid;
    grid-template-columns: max-content 1fr;
    gap: 5px 16px;
    font-size: 10pt;
    color: #2b2538;
    margin-top: 8mm;
}
.cover .meta dt { color: #8a8198; font-weight: 500; }
.cover .meta dd { margin: 0; font-weight: 600; }

.cover .footer {
    position: absolute;
    bottom: 22mm;
    left: 22mm;
    right: 22mm;
    display: flex;
    justify-content: space-between;
    align-items: end;
    font-size: 9pt;
    color: #5C5374;
    border-top: 1px solid rgba(155,127,191,0.35);
    padding-top: 8mm;
}
.cover .footer .url { color: #9B7FBF; font-weight: 600; }

/* ---------- Body ---------- */
.content {
    padding: 0 2mm;
}

.content h1, .content h2, .content h3, .content h4 {
    font-family: 'Fraunces', 'Georgia', serif;
    color: #2b2538;
    page-break-after: avoid;
    line-height: 1.2;
}

.content h1 {
    font-size: 22pt;
    margin: 0 0 12pt 0;
    border-bottom: 2px solid #9B7FBF;
    padding-bottom: 6pt;
}
.content h2 {
    font-size: 15pt;
    margin: 22pt 0 8pt 0;
    color: #5C5374;
    border-left: 4px solid #9B7FBF;
    padding-left: 10pt;
}
.content h3 {
    font-size: 12pt;
    margin: 16pt 0 6pt 0;
    color: #5C5374;
}

.content p { margin: 0 0 8pt 0; }
.content ul, .content ol { margin: 0 0 10pt 18pt; padding: 0; }
.content li { margin-bottom: 3pt; }
.content li::marker { color: #9B7FBF; }

.content strong { color: #2b2538; }
.content em { color: #5C5374; }
.content code {
    background: #F3ECF8;
    color: #5C5374;
    padding: 1px 5px;
    border-radius: 4px;
    font-size: 9.5pt;
}

.content blockquote {
    margin: 10pt 0;
    padding: 10pt 14pt;
    background: #F3ECF8;
    border-left: 4px solid #9B7FBF;
    border-radius: 0 6pt 6pt 0;
    color: #5C5374;
    font-style: italic;
    page-break-inside: avoid;
}
.content blockquote p { margin: 0; }

.content hr {
    border: 0;
    border-top: 1px dashed #DCC9EC;
    margin: 18pt 0;
}

/* ---------- Pupil-handout appendix ---------- */
/* The build script tags the appendix h2 with class="appendix-start" so the
   handout begins on a fresh sheet teachers can photocopy independently. */
.appendix-start {
    page-break-before: always;
    break-before: page;
}
.appendix-start::before {
    content: "Pupil handout";
    display: block;
    width: max-content;
    background: #9B7FBF;
    color: #FBF8F3;
    font-family: 'Inter', sans-serif;
    font-size: 8pt;
    font-weight: 600;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    padding: 4px 12px;
    border-radius: 999px;
    margin-bottom: 10pt;
}

.reading-lines {
    list-style: none;
    counter-reset: rline;
    margin: 8pt 0 14pt 0;
    padding: 14pt 16pt 14pt 18pt;
    background: #FBF8F3;
    border: 1px solid #E8D9F0;
    border-left: 4px solid #9B7FBF;
    border-radius: 0 6pt 6pt 0;
    font-family: 'Fraunces', 'Georgia', serif;
    font-size: 10.5pt;
    line-height: 1.85;
    color: #2b2538;
}
.reading-lines li {
    counter-increment: rline;
    position: relative;
    padding-left: 30pt;
    margin: 0;
    page-break-inside: avoid;
}
.reading-lines li::before {
    content: counter(rline);
    position: absolute;
    left: 0;
    top: 0;
    width: 22pt;
    text-align: right;
    font-family: 'Inter', sans-serif;
    font-size: 8.5pt;
    font-weight: 600;
    color: #9B7FBF;
    padding-top: 4pt;
}
.reading-lines li em {
    font-style: italic;
    color: #5C5374;
}

/* Tables */
.content table {
    width: 100%;
    border-collapse: collapse;
    margin: 10pt 0 14pt 0;
    font-size: 9.5pt;
}
.content thead th {
    background: #9B7FBF;
    color: #FBF8F3;
    font-weight: 600;
    text-align: left;
    padding: 7pt 9pt;
    font-size: 9pt;
    letter-spacing: 0.02em;
}
.content tbody td {
    padding: 7pt 9pt;
    border-bottom: 1px solid #E8D9F0;
    vertical-align: top;
}
.content tbody tr {
    page-break-inside: avoid;
}
.content tbody tr:nth-child(even) td {
    background: #FBF8F3;
}
.content tbody tr:last-child td { border-bottom: 0; }
/* Repeat the table header on each new page when a table breaks across pages. */
.content thead { display: table-header-group; }
.content tfoot { display: table-footer-group; }

/* The wide lesson stages table (6 columns) needs tighter type. */
.content table:has(th:nth-child(6)) {
    font-size: 8.5pt;
}
.content table:has(th:nth-child(6)) td,
.content table:has(th:nth-child(6)) th {
    padding: 6pt 7pt;
}

/* Final footer note */
.content blockquote:last-of-type {
    margin-top: 20pt;
    background: #2b2538;
    color: #FBF8F3;
    border-left-color: #C9B6E4;
}
.content blockquote:last-of-type strong { color: #FBF8F3; }
"""

COVER_HTML = """
<section class="cover">
  <div class="brand">
    <span class="brand-mark"></span>
    Fearless <span>Creations</span>
  </div>
  <span class="eyebrow">Free sample lesson plan</span>
  <h1>Ancient Civilizations</h1>
  <p class="subtitle">Reading Comprehension &mdash; <em>The Lost Civilization of the Aztecs</em></p>
  <dl class="meta">
    <dt>Level</dt>            <dd>3AS &mdash; Troisi&egrave;me Ann&eacute;e Secondaire</dd>
    <dt>Textbook</dt>         <dd><em>New Prospects</em>, Unit 1</dd>
    <dt>Sequence</dt>         <dd>Sequence 1 &mdash; Reading &amp; Writing</dd>
    <dt>Duration</dt>         <dd>60 minutes</dd>
    <dt>Class size</dt>       <dd>32 pupils, mixed ability</dd>
    <dt>Framework</dt>        <dd>APC-aligned &middot; Bloom&rsquo;s Taxonomy &middot; SMART objectives</dd>
  </dl>
  <div class="footer">
    <span>A Fearless Creations free sample &mdash; share with a colleague.</span>
    <span class="url">creativekidsdigit.github.io</span>
  </div>
</section>
"""


def main() -> int:
    if not SRC_MD.exists():
        print(f"ERROR: source markdown not found at {SRC_MD}", file=sys.stderr)
        return 1

    raw_md = SRC_MD.read_text(encoding="utf-8")

    # Drop the first heading + intro blockquote from the markdown, since the cover
    # page already covers that information. Everything from "## Header" onward
    # is the actual lesson plan body.
    marker = "## Header"
    idx = raw_md.find(marker)
    body_md = raw_md[idx:] if idx != -1 else raw_md

    # Promote the first H2 to an H1 for a clean opening on page 2.
    # The source uses the HTML entity "&amp;" rather than a raw ampersand.
    for needle in ("## Header &amp; Identification",
                   "## Header & Identification"):
        if needle in body_md:
            body_md = body_md.replace(needle, "# Lesson Plan", 1)
            break

    body_html = markdown.markdown(
        body_md,
        extensions=["tables", "sane_lists", "smarty"],
    )

    # Mark the appendix heading so the print stylesheet can force a page break
    # before it (one fresh A4 sheet = the photocopiable pupil handout).
    body_html = body_html.replace(
        "<h2>Appendix",
        '<h2 class="appendix-start">Appendix',
        1,
    )

    full_html = f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>3AS Ancient Civilizations - Lesson Plan</title>
  <link href="https://fonts.googleapis.com/css2?family=Fraunces:wght@500;600;700&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
</head>
<body>
  {COVER_HTML}
  <main class="content">
    {body_html}
  </main>
</body>
</html>"""

    OUT_DIR.mkdir(parents=True, exist_ok=True)

    HTML(string=full_html, base_url=str(ROOT)).write_pdf(
        target=str(OUT_PDF),
        stylesheets=[CSS(string=CSS_TEMPLATE)],
    )

    size_kb = OUT_PDF.stat().st_size / 1024
    print(f"OK  wrote {OUT_PDF.relative_to(ROOT)}  ({size_kb:.1f} KB)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
