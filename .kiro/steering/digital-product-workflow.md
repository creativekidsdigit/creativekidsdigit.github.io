---
inclusion: auto
---

# Digital Product Creation Workflow

This steering file defines the standard workflow for creating sellable digital products (printables, toolkits, ebooks, planners) for the Fearless Creations / Creative Kids Digit brand.

## Workflow Steps

### Step 1 — User States the Goal

The user provides a brief product idea. Examples:
- "I want a printable ADHD toolkit for parents."
- "I want a BAC revision pack for students."
- "I want a teacher planner for primary school."

### Step 2 — Kiro Builds the Strategic Production Prompt

Before generating content, Kiro produces a structured production brief covering:

1. **Product positioning** — what makes this different from competitors
2. **Target audience** — specific, not generic (age, context, pain point)
3. **Toolkit structure** — page-by-page breakdown (typically 8–12 pages)
4. **Content requirements per page** — headlines, body content, layout direction, icon suggestions
5. **ADHD-friendly / printable-friendly formatting rules** (if applicable)
6. **Tone & style** — calming, professional, supportive, non-judgmental
7. **Color palette** — product-specific accent color (sage, gold, terracotta, etc.)
8. **Design direction** — Canva-friendly, printable specs (US Letter, 300 DPI)

### Step 3 — Kiro Generates the Full Product

Kiro creates two markdown files in `digital-products/{product-slug}/`:

- **`toolkit-content.md`** — Complete content for every page (headlines, body, layout direction, design notes)
- **`marketing-assets.md`** — Etsy SEO title, product description, 15 tags, 5 Pinterest pin titles, bundle/upsell ideas, pricing strategy, listing photo checklist

### Step 4 — Kiro Builds the Landing Page

A high-converting product landing page at `products/{product-slug}.html` with:

- Hero section with emotional hook + $X CTA
- Pain point / "sound familiar?" section (4 cards)
- "What's inside" — page-by-page breakdown grid
- Core method preview (visual routine/system)
- Testimonials (3 parent/teacher reviews)
- Pricing card with feature list + guarantee strip
- Bundle upsell (if companion products exist)
- Email capture (free sample page as lead magnet)
- FAQ section (6–8 objection-handling questions)
- Final CTA with emotional close
- ConvertKit-ready form with localStorage fallback
- Full SEO: meta, OG, Twitter, structured data (Product schema)

### Step 5 — User Polishes in Canva

User takes the toolkit-content.md to Canva for visual design and PDF export.

---

## Brand Standards

### Visual Identity
- **Brand name**: Fearless Creations / Creative Kids Digit
- **Fonts**: Fraunces (headings), Inter (body)
- **Base palette**: Lavender (#C9B6E4), Purple (#9B7FBF), Cream (#FBF8F3), Blush (#F4C9D4)
- **Product accents**: Each product gets a unique accent color (sage, gold, terracotta, etc.)

### Product Page Architecture
- Reuse existing CSS: `styles.css`, `home.css`, `products.css`, `landing.css`
- Match nav/footer pattern from `index.html`
- Include `script.js` + `forms.js` (or inline form handler)
- Mobile-first responsive design

### Pricing Standard
- Individual toolkit: $7–$9 (Etsy), $9–$12 (Payhip/Shopify)
- Bundle (2 toolkits): $14 (save $4)
- Mega bundle (3+): $22 (save $5+)

### Content Tone
- Calm, practical, judgment-free
- Short sentences, bullet points, visual hierarchy
- Emotionally supportive — validate the parent's experience
- Never shame, never generic, never academic

### File Organization
```
digital-products/
  {product-slug}/
    toolkit-content.md      ← Full page-by-page content
    marketing-assets.md     ← SEO, tags, description, strategy
products/
  {product-slug}.html       ← Landing page
```

---

## Marketing Asset Requirements

Every product must include:
- [ ] Etsy SEO title (under 140 chars)
- [ ] Etsy product description (empathy hook → what's inside → who it's for → format → closing note)
- [ ] 15 Etsy tags (under 20 chars each)
- [ ] 5 Pinterest pin titles (high CTR, save-worthy)
- [ ] 3 bundle/upsell suggestions
- [ ] Pricing recommendations by platform
- [ ] 10-item listing photo/mockup checklist

---

## Cross-Sell Rules

When a new product is created:
1. Add a bundle upsell card to the new product's pricing section
2. Reference the new product in existing companion product pages
3. Update the bundle pricing if a 3rd product completes a mega-bundle

---

## Quality Bar

Every product must feel:
- **Premium** — not generic, not thin
- **Etsy-ready** — title, tags, and description optimized
- **Canva-ready** — clear layout direction for every page
- **Printable** — US Letter, 300 DPI, ADHD-friendly formatting
- **Conversion-optimized** — landing page follows proven sales page structure
