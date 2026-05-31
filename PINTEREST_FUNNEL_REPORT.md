# Pinterest → Blog → Product → Payhip Funnel Report

**Site:** creativekidsdigit.github.io  
**Date:** May 31, 2026

---

## Funnel Map (Text Diagram)

```
                          ┌──────────────────┐
                          │   PINTEREST      │
                          │  (pin images)    │
                          └────────┬─────────┘
                                   │ click → blog post (NEVER directly to product)
                                   ▼
        ┌─────────────────────────────────────────────────────┐
        │  BLOG POST                                          │
        │  blog/adhd-after-school-meltdowns-homework-help.html│
        │                                                     │
        │  • Educational content (why meltdowns happen)       │
        │  • In-text CTAs to product pages                    │
        │  • Final "Recommended toolkits" section (4 links)   │
        │  • Author bio + Article schema                      │
        └────────┬───────────┬───────────┬─────────────┬──────┘
                 │           │           │             │
                 ▼           ▼           ▼             ▼
        ┌─────────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐
        │ HOMEWORK    │ │ EMOTIONAL│ │ MORNING  │ │AFTER-    │
        │ TOOLKIT $9  │ │ REG $11  │ │ ROUTINE $9│ │SCHOOL $29│
        │ ✅ Working  │ │ ✅ Working│ │ ❌ Broken│ │❌ Broken │
        └──────┬──────┘ └─────┬────┘ └────┬─────┘ └────┬─────┘
               │              │           │            │
               ▼              ▼           ▼            ▼
        ┌──────────┐   ┌──────────┐    ┌────┐     ┌────┐
        │ Payhip   │   │ Payhip   │    │ ❌ │     │ ❌ │
        │ /b/i2x1W │   │ /b/iCIH8 │    │NONE│     │NONE│
        └──────────┘   └──────────┘    └────┘     └────┘
```

---

## TASK 1 — Blog as Hub (Status)

**Blog post:** `blog/adhd-after-school-meltdowns-homework-help.html`

| Element | Status |
|---|---|
| Article schema (JSON-LD) | ✅ Present |
| Author bio section | ✅ Present |
| Published date (`<time>`) | ✅ Present |
| In-text product CTA #1 (After-School Reset) | ✅ Line 167 |
| In-text product CTA #2 (Homework Toolkit) | ✅ Line 198 |
| Final "Recommended toolkits" CTA card | ✅ **Updated to include all 4 toolkits** |
| Pinterest "save for later" prompt | ✅ Present |
| Breadcrumb navigation | ✅ Present |

### Improvements Made in This PR

- Final CTA card upgraded from 2 toolkits → **all 4 ADHD toolkits**
- Now the blog post recommends Emotional Regulation + Morning Routine in addition to Homework + After-School

---

## TASK 2 — Product Page Conversion (Status)

| Page | Problem→Solution | Benefits | What's Inside | Blog Link | Buy Now → Payhip |
|---|:---:|:---:|:---:|:---:|:---:|
| ADHD Homework Toolkit | ✅ | ✅ | ✅ (10 pages) | ✅ **Added** | ✅ b/i2x1W |
| ADHD Emotional Regulation | ✅ | ✅ | ✅ (12 pages) | ✅ **Added** | ✅ b/iCIH8 |
| ADHD Morning Routine | ✅ | ✅ | ✅ (10 pages) | ✅ **Added** | ❌ Missing URL |
| ADHD After-School Reset | ✅ | ✅ | ✅ (28 pages) | ✅ **Added** | ❌ Missing URL |
| Lesson plan products (×6) | Partial | ⚠️ Thin | Partial | ❌ N/A (different audience) | ❌ Missing URLs |

### Improvements Made in This PR

Added "Want the science behind it?" section linking back to the blog on all 4 ADHD product pages — closes the loop and helps users who land on a product page without context.

---

## TASK 3 — Pinterest Preparation

### Top Blog Posts Suitable for Pinterest

| # | Blog Post | Pinterest Audience | Estimated Pin CTR |
|---|---|---|---|
| 1 | `adhd-after-school-meltdowns-homework-help.html` | ADHD parents, neurodivergent moms, homeschoolers | High (3-7%) |

> **Note:** Currently only 1 blog post exists. To build sustainable Pinterest traffic, you need 5-10 published blog posts that map to your products.

### 10 Pinterest Pin Ideas — `adhd-after-school-meltdowns-homework-help.html`

All pins should link to the **blog post URL only** (never directly to Payhip):

`https://creativekidsdigit.github.io/blog/adhd-after-school-meltdowns-homework-help.html`

| # | Pin Title (Text Overlay) | Hook / Angle | Board Suggestion |
|---|---|---|---|
| 1 | "Why ADHD Kids Fall Apart After School" | Relatable problem → solution | ADHD Parenting |
| 2 | "The 60-Minute After-School Reset for ADHD Kids" | System / framework | ADHD Routines |
| 3 | "5 After-School Mistakes Making ADHD Worse" | Listicle, fear of doing it wrong | ADHD Tips |
| 4 | "Restraint Collapse Explained: Your ADHD Child Isn't Being Bad" | Reframe / validation | Neurodivergent Kids |
| 5 | "What to Say When Your ADHD Child Melts Down" | Scripts / words to use | ADHD Communication |
| 6 | "ADHD After-School: 4-Zone Routine That Stops Meltdowns" | Visual system | ADHD Visual Schedule |
| 7 | "Homework Battles: Why They Happen & The Fix" | Pain point + promise | Homework Help |
| 8 | "Decompress → Fuel → Move → Reconnect (ADHD After-School)" | Memorable framework | Executive Function |
| 9 | "How to Help Your ADHD Child Calm Down Tonight" | Urgency + benefit | Calm Down Strategies |
| 10 | "Free Guide: After-School Routine for ADHD Kids 5-12" | Free + age range | Free Printables for Kids |

### Pin Design Guidelines

- **Format:** 1000 × 1500 px (vertical, 2:3 ratio)
- **Text overlay:** Large title at top, subtitle below, brand at bottom
- **Colors:** Use brand teal (#7FBFBF) and lavender (#9B7FBF) — pin scrollers stop on muted, soft palettes for parenting niche
- **Filename:** `adhd-after-school-meltdown-60min-reset-routine.png` (keyword-rich, hyphenated)
- **Alt text / Pin description:** Include 3-5 hashtags: `#ADHDParenting #ADHDKids #RestraintCollapse #AfterSchoolRoutine #NeurodivergentKids`

### What You Need to Build the Pinterest Channel

1. **Create 10 pin images** for the existing blog post (use Canva — free)
2. **Publish 9 more blog posts** (suggestions in PR #16's SEO_OVERHAUL_REPORT.md)
3. **Set up Pinterest Business account** + verify the GitHub Pages domain
4. **Enable Rich Pins** for Article type
5. **Pin 5-10 fresh pins/day** mixing original + repins

---

## TASK 4 — Internal Funnel Flow Map

### User Journey: Pinterest → Blog → Product → Payhip

#### ✅ Working Path (Homework Toolkit)
```
Pinterest pin
  → blog/adhd-after-school-meltdowns-homework-help.html
  → CTA "Get the Homework System" (line 198)
  → products/adhd-homework-toolkit.html
  → "Buy Now — $9" button
  → https://payhip.com/b/i2x1W (Payhip checkout)
  → Purchase ✅
```

#### ✅ Working Path (Emotional Regulation)
```
Pinterest pin
  → blog/adhd-after-school-meltdowns-homework-help.html
  → Final CTA card "Emotional Regulation Toolkit" (NEW — added in this PR)
  → products/adhd-emotional-regulation-toolkit.html
  → "Buy Now — $11" button
  → https://payhip.com/b/iCIH8 (Payhip checkout)
  → Purchase ✅
```

#### ❌ Broken Path (Morning Routine)
```
Pinterest pin
  → blog post
  → Final CTA "Morning Routine Toolkit" (NEW — added)
  → products/adhd-morning-routine-toolkit.html
  → "Buy Now — $9" button
  → href="#" 🔴 DEAD END
```

#### ❌ Broken Path (After-School Reset)
```
Pinterest pin
  → blog post
  → CTA "After-School Reset Toolkit" (line 167)
  → products/adhd-after-school-reset-toolkit.html
  → "Buy Now — $29" button
  → href="#" 🔴 DEAD END
```

### Internal Linking Gaps Fixed in This PR

1. ✅ Blog post Final CTA now recommends **all 4 ADHD toolkits** (was 2)
2. ✅ All 4 ADHD product pages now **link back to blog** (was 0)
3. ✅ Loop closed: Blog ↔ Product (bidirectional)

### Internal Linking Gaps Still Open

| Gap | Impact |
|---|---|
| Homepage doesn't link to blog | Pinterest discovery only — no organic blog traffic |
| Homepage doesn't link to After-School Reset product | Top product invisible from homepage |
| Lesson plan products don't link anywhere relevant | Different audience — separate funnel needed |
| Only 1 blog post exists | Cannot scale Pinterest traffic |

---

## TASK 5 — Final Report Summary

### Funnel Diagram

See top of this document.

### Blog Posts Ready for Pinterest Traffic

| Blog Post | Status | Pinterest Ready? |
|---|---|---|
| `adhd-after-school-meltdowns-homework-help.html` | Published, 1990 words, schema-rich, 4 CTAs | ✅ **Yes — needs pin images** |

### Product Pages Needing Improvement

| Page | Issue | Priority |
|---|---|---|
| `adhd-morning-routine-toolkit.html` | Buy Now button broken (`href="#"`) | 🔴 P0 |
| `adhd-after-school-reset-toolkit.html` | Buy Now button broken (`href="#"`) | 🔴 P0 |
| `adhd-after-school-reset-toolkit.html` | Bundle button broken | 🔴 P0 |
| `adhd-morning-routine-toolkit.html` | Bundle button broken | 🔴 P0 |
| `adhd-emotional-regulation-toolkit.html` | Mega Bundle button broken | 🟡 P1 |
| All 6 lesson plan pages | Buy Now broken + thin content (~300 words) | 🟡 P2 |

### Conversion Gaps Blocking Sales

| # | Gap | Revenue Impact |
|---|---|---|
| 1 | 2 of 4 ADHD toolkits have NO Payhip URL → 50% of ADHD funnel dead | 🔴 Critical |
| 2 | All bundle Buy buttons broken (Mega, School Year, Morning+Homework) | 🔴 High AOV loss |
| 3 | Homepage doesn't link to blog → no organic discovery loop | 🟡 Medium |
| 4 | Only 1 blog post → Pinterest channel can't scale | 🟡 Medium |
| 5 | No Pinterest pin images created yet | 🟡 Medium |
| 6 | Homepage missing After-School Reset product card | 🟢 Low |

### Recommended Next Steps (Ranked)

| Priority | Action | Owner | Time |
|---|---|---|---|
| 🔴 P0 | Publish Morning Routine + After-School Reset on Payhip | You | 1 hour |
| 🔴 P0 | Send me the 2 new Payhip `/b/` URLs | You | 1 min |
| 🟠 P1 | Create 10 Pinterest pin images for existing blog post | You / Canva | 2 hours |
| 🟠 P1 | Add "Blog" link to homepage navigation | Me | 5 min |
| 🟡 P2 | Write blog post #2 (suggest: "ADHD Morning Routine That Works") | You / Me | 2-3 hours |
| 🟡 P2 | Set up Pinterest Business + Rich Pins | You | 30 min |
| 🟢 P3 | Add After-School Reset card to homepage product grid | Me | 10 min |
