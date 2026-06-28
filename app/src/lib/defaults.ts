import type { AppSettings, PromptTemplate } from "@/types";
import { uid, now } from "./id";

export const DEFAULT_SETTINGS: AppSettings = {
  activeProvider: "openai",
  theme: "system",
  brandVoice:
    "Warm, encouraging, parent-friendly. Calm authority. Avoid hype, jargon, or clinical tone. Use plain language that a tired parent can read in 10 seconds and trust.",
  defaultAudience:
    "Parents of children ages 5–12, especially those with ADHD or sensory needs.",
  autosave: true,
  providers: {
    openai: {
      id: "openai",
      apiKey: "",
      baseUrl: "",
      model: "gpt-4o-mini",
      enabled: true,
    },
    anthropic: {
      id: "anthropic",
      apiKey: "",
      baseUrl: "",
      model: "claude-sonnet-4-5",
      enabled: true,
    },
    google: {
      id: "google",
      apiKey: "",
      baseUrl: "",
      model: "gemini-2.5-flash",
      enabled: true,
    },
    openrouter: {
      id: "openrouter",
      apiKey: "",
      baseUrl: "",
      model: "anthropic/claude-sonnet-4.5",
      enabled: true,
    },
    ollama: {
      id: "ollama",
      apiKey: "",
      baseUrl: "http://localhost:11434",
      model: "llama3.2",
      enabled: true,
    },
  },
};

function tpl(
  name: string,
  category: string,
  description: string,
  systemPrompt: string,
  userPromptTemplate: string
): PromptTemplate {
  return {
    id: uid("tpl"),
    name,
    category,
    description,
    systemPrompt,
    userPromptTemplate,
    favorite: false,
    builtIn: true,
    versions: [],
    createdAt: now(),
    updatedAt: now(),
  };
}

const PRODUCT_CONTEXT = `PRODUCT
Title: {{product.title}}
Category: {{product.category}}
Audience: {{product.audience}}
Problem it solves: {{product.problemSolved}}
Benefits: {{product.benefits}}
Keywords: {{product.keywords}}
Pricing: {{product.pricing}}
Platform: {{product.platform}}
Notes: {{product.notes}}

BRAND VOICE
{{settings.brandVoice}}`;

const VOICE_PREFIX = `You are a senior direct-response copywriter and SEO strategist for a small digital product creator. You write in the brand voice exactly. You never invent facts about the product. If a field is missing, infer carefully from the surrounding context, never fabricate clinical or medical claims.`;

export function buildDefaultPrompts(): PromptTemplate[] {
  return [
    // ---------- COPY GENERATOR ----------
    tpl(
      "SEO Title",
      "copy",
      "Search-optimized product title.",
      VOICE_PREFIX,
      `${PRODUCT_CONTEXT}

TASK
Write 5 SEO-optimized product titles, each under 70 characters, that include the primary keyword naturally. Return as a numbered list.`
    ),
    tpl(
      "Product Title",
      "copy",
      "Catchy customer-facing title.",
      VOICE_PREFIX,
      `${PRODUCT_CONTEXT}

TASK
Write 7 customer-facing product title options. Emotional, benefit-led, scannable. Each on its own line, no commentary.`
    ),
    tpl(
      "Short Description",
      "copy",
      "1–2 line marketplace blurb.",
      VOICE_PREFIX,
      `${PRODUCT_CONTEXT}

TASK
Write a 1–2 sentence product description (max 280 chars). Lead with the transformation, end with the audience.`
    ),
    tpl(
      "Long Description",
      "copy",
      "Full marketplace description.",
      VOICE_PREFIX,
      `${PRODUCT_CONTEXT}

TASK
Write a long product description (300–450 words) with:
- 1 hook paragraph naming the pain
- "What's inside" bullets
- "Who it's for" section
- "How to use it" section
- A reassuring closing line.
Use short paragraphs and plain language.`
    ),
    tpl(
      "Payhip Sales Page",
      "copy",
      "Full conversion-optimized Payhip listing.",
      VOICE_PREFIX,
      `${PRODUCT_CONTEXT}

TASK
Write a complete Payhip sales page in markdown:
# Headline
## Subheadline (one sentence transformation)
### The struggle (3 short paragraphs)
### What you'll get (bullets)
### Why it works (3 reasons)
### Who it's for / Who it's NOT for
### What's included (file list)
### FAQ (4 questions)
### Guarantee
### Final CTA
Keep tone warm, not pushy.`
    ),
    tpl(
      "Shopify Description",
      "copy",
      "Description block for Shopify product page.",
      VOICE_PREFIX,
      `${PRODUCT_CONTEXT}

TASK
Write a Shopify product description in HTML using <h2>, <p>, <ul>, <li>. Sections: Overview, What's inside, Benefits, How to use, FAQ.`
    ),
    tpl(
      "Etsy Description",
      "copy",
      "Etsy-optimized description with keyword density.",
      VOICE_PREFIX,
      `${PRODUCT_CONTEXT}

TASK
Write an Etsy listing description. First two lines must hook + include primary keyword. Then "What you'll receive", "How to download", "Terms of use" (digital product, no refunds wording). Sprinkle long-tail keywords naturally. Plain text only.`
    ),
    tpl(
      "Landing Page",
      "copy",
      "Standalone marketing page.",
      VOICE_PREFIX,
      `${PRODUCT_CONTEXT}

TASK
Write a long-form landing page in markdown with these blocks: Hero (headline + sub + CTA), Problem agitation, Promise, What's included, How it works (3 steps), Social proof placeholder, FAQ, Final CTA, P.S. line.`
    ),
    tpl(
      "FAQ",
      "copy",
      "10 customer questions with concise answers.",
      VOICE_PREFIX,
      `${PRODUCT_CONTEXT}

TASK
Write 10 FAQ Q&A pairs a buyer would actually ask. Real, specific, non-generic. Each answer 2–3 sentences max.`
    ),
    tpl(
      "Benefits List",
      "copy",
      "Customer-language benefits, not features.",
      VOICE_PREFIX,
      `${PRODUCT_CONTEXT}

TASK
Write 10 benefits in customer language. Each one a single line, leading with the outcome (e.g. "Mornings that don't end in tears"). No feature-speak.`
    ),
    tpl(
      "Features List",
      "copy",
      "Concrete features and components.",
      VOICE_PREFIX,
      `${PRODUCT_CONTEXT}

TASK
List 10 specific features/components of this product. Be concrete: page counts, formats, what's printable, what's editable.`
    ),
    tpl(
      "Call to Action",
      "copy",
      "10 CTA variations.",
      VOICE_PREFIX,
      `${PRODUCT_CONTEXT}

TASK
Write 10 CTA button/link variations. Each 2–5 words, action-led, no exclamation marks. Return as a numbered list.`
    ),
    tpl(
      "Emotional Hooks",
      "copy",
      "Opening lines that grab tired parents.",
      VOICE_PREFIX,
      `${PRODUCT_CONTEXT}

TASK
Write 12 opening lines that grab a tired parent in under 2 seconds. Mix curiosity, recognition of the pain, and gentle relief. One per line.`
    ),
    tpl(
      "Headline Variations",
      "copy",
      "10 headlines in different angles.",
      VOICE_PREFIX,
      `${PRODUCT_CONTEXT}

TASK
Write 10 headline variations across these angles: transformation, specificity, contrarian, fear-relief, before/after, question, command, social proof angle, time-saving, "stop doing X". Label each.`
    ),
    tpl(
      "Bullet Points",
      "copy",
      "Scannable benefit bullets.",
      VOICE_PREFIX,
      `${PRODUCT_CONTEXT}

TASK
Write 10 scannable benefit bullets. Format: bold outcome — short clarifier. Example: "**Calm afternoons** — the visual reset that ends meltdowns before homework."`
    ),
    tpl(
      "Guarantees",
      "copy",
      "Honest guarantees & reassurance language.",
      VOICE_PREFIX,
      `${PRODUCT_CONTEXT}

TASK
Write 5 guarantee/reassurance blurbs appropriate for a non-refundable digital product. Focus on quality, instant access, and ongoing updates. No false money-back claims.`
    ),
    tpl(
      "Objection Handling",
      "copy",
      "Answer the top 8 buyer objections.",
      VOICE_PREFIX,
      `${PRODUCT_CONTEXT}

TASK
List the 8 most likely buyer objections (price, time, "will it work for my kid", overwhelm, etc.) and write a 2-sentence rebuttal for each in our brand voice. Format: "Objection: …\\nReframe: …".`
    ),

    // ---------- PINTEREST STUDIO ----------
    tpl(
      "Pinterest — 20 Titles",
      "pinterest",
      "Curiosity-driven pin titles.",
      VOICE_PREFIX,
      `${PRODUCT_CONTEXT}

TASK
Write 20 Pinterest pin titles. Each <= 100 characters. Mix listicle, how-to, question, surprising-stat, and emotional-hook angles. Sprinkle the primary keywords. One per line, numbered.`
    ),
    tpl(
      "Pinterest — 20 Descriptions",
      "pinterest",
      "Keyword-rich pin descriptions.",
      VOICE_PREFIX,
      `${PRODUCT_CONTEXT}

TASK
Write 20 Pinterest pin descriptions (200–400 chars each). End each with a CTA. Naturally include 3–5 keywords per description. Numbered list.`
    ),
    tpl(
      "Pinterest — 20 CTAs",
      "pinterest",
      "Click-driving CTAs for pins.",
      VOICE_PREFIX,
      `${PRODUCT_CONTEXT}

TASK
Write 20 click-driving CTAs for Pinterest pins. Short, parent-friendly, no pushy language. One per line.`
    ),
    tpl(
      "Pinterest — Board Ideas",
      "pinterest",
      "Topic boards to host this product's pins.",
      VOICE_PREFIX,
      `${PRODUCT_CONTEXT}

TASK
Suggest 12 Pinterest board names (60 chars max each) that this product could live in. Include a 1-line description and 5 keyword tags per board.`
    ),
    tpl(
      "Pinterest — Pin Text Overlays",
      "pinterest",
      "Bold short overlays for pin graphics.",
      VOICE_PREFIX,
      `${PRODUCT_CONTEXT}

TASK
Write 15 short text-overlay phrases for Pinterest pin graphics. Max 7 words. Bold, emotional, scroll-stopping. One per line.`
    ),
    tpl(
      "Pinterest — Image Prompts",
      "pinterest",
      "Visual prompts to feed an AI image tool.",
      VOICE_PREFIX,
      `${PRODUCT_CONTEXT}

TASK
Write 10 image-generation prompts for Pinterest pins. Each prompt should include: scene, mood, color palette, style (e.g. soft watercolor, clean flat-lay, cozy lifestyle photo), and the on-pin overlay text. Format each as a short paragraph.`
    ),
    tpl(
      "Pinterest — Seasonal Calendar",
      "pinterest",
      "12 month rolling angles for this product.",
      VOICE_PREFIX,
      `${PRODUCT_CONTEXT}

TASK
Build a 12-month seasonal Pinterest calendar for this product. For each month: 1-line theme, 2 pin title ideas, 1 keyword cluster.`
    ),
    tpl(
      "Pinterest — Keywords",
      "pinterest",
      "Primary + long-tail Pinterest keywords.",
      VOICE_PREFIX,
      `${PRODUCT_CONTEXT}

TASK
Provide:
1) 10 primary Pinterest keywords
2) 25 long-tail keyword phrases
3) 10 keywords to avoid (too broad / off-audience)
Comma-separated within sections, sections clearly labeled.`
    ),

    // ---------- SEO STUDIO ----------
    tpl(
      "SEO — Keyword Map",
      "seo",
      "Primary, secondary, and long-tail keywords.",
      VOICE_PREFIX,
      `${PRODUCT_CONTEXT}

TASK
Provide:
- 1 primary keyword
- 5 secondary keywords
- 20 long-tail keywords
- Intent label for each (informational / commercial / transactional)
Use markdown tables.`
    ),
    tpl(
      "SEO — Meta Pack",
      "seo",
      "Meta title, description, slug.",
      VOICE_PREFIX,
      `${PRODUCT_CONTEXT}

TASK
Output 3 options of:
- Meta title (<= 60 chars)
- Meta description (<= 155 chars)
- URL slug (kebab-case, primary keyword first)
Label them Option A / B / C.`
    ),
    tpl(
      "SEO — Schema Suggestions",
      "seo",
      "Structured data recommendations.",
      VOICE_PREFIX,
      `${PRODUCT_CONTEXT}

TASK
Recommend which schema.org types to add to the product page (Product, Offer, FAQPage, BreadcrumbList, etc.) and output a complete JSON-LD example for the most important one, filled with this product's details.`
    ),
    tpl(
      "SEO — Internal Linking",
      "seo",
      "Internal link suggestions.",
      VOICE_PREFIX,
      `${PRODUCT_CONTEXT}

TASK
Suggest 8 internal link opportunities: anchor text + the type of page it should link to (category, related product, supporting blog post). Format as a markdown table.`
    ),
    tpl(
      "SEO — Blog Topics",
      "seo",
      "20 blog topic ideas targeting search intent.",
      VOICE_PREFIX,
      `${PRODUCT_CONTEXT}

TASK
Suggest 20 blog topics that drive search traffic to this product. For each: working title, primary keyword, search intent, suggested word count.`
    ),
    tpl(
      "SEO — Content Cluster",
      "seo",
      "Pillar + cluster outline.",
      VOICE_PREFIX,
      `${PRODUCT_CONTEXT}

TASK
Design a content cluster: 1 pillar page (title + outline) and 8 cluster articles (title + 1-line angle + primary keyword). Output as markdown.`
    ),
    tpl(
      "SEO — On-Page Checklist",
      "seo",
      "Audit-style checklist tailored to this product.",
      VOICE_PREFIX,
      `${PRODUCT_CONTEXT}

TASK
Output a tailored on-page SEO checklist (15–20 items) for this product's sales page. Be specific to this product, not generic.`
    ),

    // ---------- BLOG ----------
    tpl(
      "Blog — How-To Article",
      "blog",
      "Step-by-step educational post.",
      VOICE_PREFIX,
      `${PRODUCT_CONTEXT}

TASK
Write a 1200–1600 word how-to blog post. Include:
- SEO meta title + description
- H1 + 6–8 H2s
- Numbered steps with actionable detail
- A "common mistakes" section
- A soft CTA to the product near the end (not pushy)`
    ),
    tpl(
      "Blog — Buying Guide",
      "blog",
      "Comparison-style buying guide.",
      VOICE_PREFIX,
      `${PRODUCT_CONTEXT}

TASK
Write an 1100–1400 word buying guide that helps a parent choose between options in this category. Comparison table, decision criteria, and a final recommendation that gracefully includes this product.`
    ),
    tpl(
      "Blog — Comparison Post",
      "blog",
      "X vs Y article.",
      VOICE_PREFIX,
      `${PRODUCT_CONTEXT}

TASK
Write a 900–1200 word "X vs Y" article relevant to this product's category. Pros/cons of each approach, who each fits, and a balanced verdict.`
    ),
    tpl(
      "Blog — Educational Post",
      "blog",
      "Long-form education without selling.",
      VOICE_PREFIX,
      `${PRODUCT_CONTEXT}

TASK
Write a 1000–1300 word educational article that teaches the parent something genuinely useful related to this product's pain point. Cite practical strategies. Mention the product only once at the end as a resource.`
    ),
    tpl(
      "Blog — FAQ Article",
      "blog",
      "Indexable FAQ-style article.",
      VOICE_PREFIX,
      `${PRODUCT_CONTEXT}

TASK
Write an FAQ-style blog post answering 10 of the most-searched questions in this product's space. H2 per question, 100–180 words per answer.`
    ),

    // ---------- EMAIL ----------
    tpl(
      "Email — Launch",
      "email",
      "Product launch announcement.",
      VOICE_PREFIX,
      `${PRODUCT_CONTEXT}

TASK
Write a launch email. Output: 3 subject line options, 1 preview text, the email body (300–450 words) with a single clear CTA. Warm + personal, not corporate.`
    ),
    tpl(
      "Email — Welcome",
      "email",
      "First email to new subscribers.",
      VOICE_PREFIX,
      `${PRODUCT_CONTEXT}

TASK
Write a welcome email for a new subscriber who came via the freebie related to this product's topic. 200–300 words. Set expectations, deliver value, soft mention of the product.`
    ),
    tpl(
      "Email — Abandoned Cart",
      "email",
      "Recovery email for left-behind carts.",
      VOICE_PREFIX,
      `${PRODUCT_CONTEXT}

TASK
Write an abandoned-cart email. Empathetic, not pushy. 3 subject lines + body (180–250 words) + 1 CTA. Acknowledge cost concern without discounting first.`
    ),
    tpl(
      "Email — Newsletter",
      "email",
      "Weekly value newsletter.",
      VOICE_PREFIX,
      `${PRODUCT_CONTEXT}

TASK
Write a weekly newsletter (350–500 words) that delivers 1 useful tip related to this product's topic, then a P.S. soft mention of the product.`
    ),
    tpl(
      "Email — Promotional Campaign",
      "email",
      "Limited-time promo without sleaze.",
      VOICE_PREFIX,
      `${PRODUCT_CONTEXT}

TASK
Write a 3-email promotional sequence (each 150–250 words) for a 72-hour promotion of this product. Email 1: open the offer. Email 2: address objections. Email 3: last-call. Include subject lines and preview text for each.`
    ),
    tpl(
      "Email — Holiday Campaign",
      "email",
      "Seasonal/holiday campaign.",
      VOICE_PREFIX,
      `${PRODUCT_CONTEXT}

TASK
Write a holiday-themed email for this product. Specify which holiday makes most sense given the product's audience. 250–350 words, plus 3 subject lines.`
    ),
    tpl(
      "Email — Upsell",
      "email",
      "Post-purchase upsell.",
      VOICE_PREFIX,
      `${PRODUCT_CONTEXT}

TASK
Write a post-purchase upsell email for a complementary product/bundle. 180–250 words. Reaffirm their first purchase, then introduce the next step.`
    ),
    tpl(
      "Email — Follow-up Sequence",
      "email",
      "5-email nurture sequence.",
      VOICE_PREFIX,
      `${PRODUCT_CONTEXT}

TASK
Write a 5-email nurture sequence (each 150–250 words) following a freebie download. Map: 1) deliver + welcome 2) story/value 3) teach a tactic 4) social-proof angle 5) product invitation. Include subject lines and the day-spacing recommendation.`
    ),

    // ---------- SOCIAL ----------
    tpl(
      "Social — Pinterest",
      "social",
      "Pinterest-native long captions.",
      VOICE_PREFIX,
      `${PRODUCT_CONTEXT}

TASK
Write 5 Pinterest captions optimized for the platform. Keyword-rich, 300–500 chars each. Include 2 hashtags max.`
    ),
    tpl(
      "Social — Facebook",
      "social",
      "Facebook post with community framing.",
      VOICE_PREFIX,
      `${PRODUCT_CONTEXT}

TASK
Write 5 Facebook posts (80–150 words each) framed for parent groups. Open with a relatable moment, end with an invitation. No salesy first line.`
    ),
    tpl(
      "Social — Instagram",
      "social",
      "Instagram caption + hashtags.",
      VOICE_PREFIX,
      `${PRODUCT_CONTEXT}

TASK
Write 5 Instagram captions (each 100–200 words) with a strong first line (Instagram cuts off fast), a body, a CTA, and 10–15 niche hashtags per post.`
    ),
    tpl(
      "Social — LinkedIn",
      "social",
      "LinkedIn post for educators/admin.",
      VOICE_PREFIX,
      `${PRODUCT_CONTEXT}

TASK
Write 3 LinkedIn posts (150–250 words each) reframed for educators / school admins. Lead with insight, soft mention of the resource at the end.`
    ),
    tpl(
      "Social — X (Twitter)",
      "social",
      "X threads and standalone posts.",
      VOICE_PREFIX,
      `${PRODUCT_CONTEXT}

TASK
Write:
- 5 standalone posts (<= 280 chars)
- 1 thread of 7 posts that delivers a useful framework, ending with a soft product mention.`
    ),
    tpl(
      "Social — Threads",
      "social",
      "Threads-native short posts.",
      VOICE_PREFIX,
      `${PRODUCT_CONTEXT}

TASK
Write 8 Threads posts (60–250 chars each). Conversational, no hashtags, end one of them with a soft CTA.`
    ),
    tpl(
      "Social — TikTok Captions",
      "social",
      "TikTok hook + caption + hashtags.",
      VOICE_PREFIX,
      `${PRODUCT_CONTEXT}

TASK
Write 5 TikTok caption packs. Each pack: opening hook (first 3 words), full caption (<= 150 chars), 8–10 hashtags. Numbered.`
    ),

    // ---------- SALES FUNNELS ----------
    tpl(
      "Funnel — Lead Magnet",
      "funnel",
      "Freebie idea + opt-in page.",
      VOICE_PREFIX,
      `${PRODUCT_CONTEXT}

TASK
Design a lead magnet for this product:
1) Lead magnet name + 1-line promise
2) What's inside (5 bullets)
3) Opt-in page copy (headline, sub, 3 bullets, CTA)
4) Thank-you page copy with soft tripwire offer mentioning this product.`
    ),
    tpl(
      "Funnel — Tripwire",
      "funnel",
      "Low-ticket tripwire offer page.",
      VOICE_PREFIX,
      `${PRODUCT_CONTEXT}

TASK
Write a tripwire offer page positioning this product (or a starter version) at a low entry price. Sections: headline, 2-line transformation, value stack, social proof placeholder, urgency line, CTA.`
    ),
    tpl(
      "Funnel — Upsell Page",
      "funnel",
      "Post-purchase upsell page.",
      VOICE_PREFIX,
      `${PRODUCT_CONTEXT}

TASK
Write a one-time-offer upsell page that appears right after this product is purchased. Sections: confirmation line, "before you go" hook, the complement product framing, value stack, "no thanks" link copy.`
    ),
    tpl(
      "Funnel — Bundle Strategy",
      "funnel",
      "Bundle this product with related items.",
      VOICE_PREFIX,
      `${PRODUCT_CONTEXT}

TASK
Propose 3 bundle structures around this product (starter / complete / pro). For each: included items, suggested price, target customer, headline + 2-line pitch.`
    ),
  ];
}
