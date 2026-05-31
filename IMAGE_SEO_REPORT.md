# Image SEO Audit Report

**Site:** creativekidsdigit.github.io  
**Date:** May 31, 2026  
**Auditor:** Kiro (automated)

---

## Executive Summary

This site uses **zero `<img>` tags**. All visuals are inline SVG elements used as decorative illustrations. There is only **1 image file** on the entire site (`og-image.svg`). This creates both opportunities and critical issues.

---

## Image Inventory

| File | Format | Size | Purpose | Issue |
|------|--------|------|---------|-------|
| `og-image.svg` | SVG | 7KB | Open Graph / social sharing | **SVG not supported by Facebook, Twitter, LinkedIn, Pinterest** |

### Inline SVG Usage (not files — embedded in HTML)

| Page | Inline SVGs | aria-hidden | Status |
|------|------------|-------------|--------|
| index.html | 47 | 64 (includes nested) | OK — all decorative |
| teachers.html | 22 | 31 | OK — all decorative |
| products/adhd-after-school-reset-toolkit.html | 16 | 28 | OK — all decorative |
| products/adhd-homework-toolkit.html | 12 | 24 | OK — all decorative |
| products/adhd-morning-routine-toolkit.html | 12 | 22 | OK — all decorative |
| products/adhd-emotional-regulation-toolkit.html | 12 | 20 | OK — all decorative |
| All lesson plan product pages | 9 each | 6 each | OK — all decorative |
| products/index.html | 8 | 13 | OK — all decorative |
| thank-you.html | 3 | 2 | OK — all decorative |
| 404.html | 2 | 2 | OK — all decorative |
| blog post | 1 | 2 | OK — decorative |

---

## Alt Text Audit

### Status: N/A (No `<img>` tags exist)

Since the site has zero `<img>` elements, there are no alt text issues. All visual elements are inline SVGs correctly marked with `aria-hidden="true"`, which is the proper accessibility approach for decorative graphics.

### Recommendation:
When real product images/photos are added in the future, follow this alt text format:
- Product pages: `alt="ADHD Homework Survival Toolkit - 10-page printable PDF preview"`
- Blog posts: `alt="Child doing homework at desk with visual schedule on wall"`
- Hero images: `alt="Fearless Creations - lesson plans for Algerian teachers"`

---

## Critical Issues

### 1. OG Image is SVG (Not Supported by Social Platforms)

**Problem:** `og-image.svg` is referenced in `og:image` meta tags across ALL pages. Facebook, Twitter/X, LinkedIn, and Pinterest **do not render SVG** as preview images.

**Impact:** When anyone shares any page from this site on social media, **no preview image appears**. This drastically reduces click-through from social channels and kills Pinterest potential entirely.

**Fix:** Create a PNG or JPG version of the OG image:
- Dimensions: 1200 x 630px (Facebook/LinkedIn optimal)
- Format: PNG (for crisp text) or JPG (for photos)
- File: `og-image.png` (replace all `og-image.svg` references)
- Also create a Pinterest-optimized vertical version: 1000 x 1500px

### 2. No Product Images for Structured Data

**Problem:** All Product schema JSON-LD blocks are missing the `image` property. Google recommends product images for rich result eligibility.

**Impact:** Product pages are unlikely to get rich results (star ratings, price) in search without the `image` field.

**Fix:** Create product preview images and add to schema:
```json
"image": "https://creativekidsdigit.github.io/images/adhd-homework-toolkit-preview.png"
```

### 3. No Pinterest-Optimized Images

**Problem:** The site has a Pinterest account but zero pinnable images. Pinterest requires:
- Vertical format (2:3 ratio, ideally 1000x1500px)
- Text overlay with title
- Branded with logo/colors

**Impact:** Pinterest is the #1 traffic source for printable/toolkit products. Without pin images, this channel is completely untapped.

---

## Pinterest-Friendly Image Recommendations

Create these images (recommended filenames follow SEO best practices):

| Image | Filename | Dimensions | Purpose |
|-------|----------|------------|---------|
| Homework Toolkit Pin | `adhd-homework-routine-printable-kids.png` | 1000x1500 | Pinterest pin |
| Morning Routine Pin | `adhd-morning-routine-visual-schedule-kids.png` | 1000x1500 | Pinterest pin |
| Emotional Regulation Pin | `adhd-calm-down-cards-feelings-wheel-kids.png` | 1000x1500 | Pinterest pin |
| After-School Reset Pin | `adhd-after-school-meltdown-routine-kids.png` | 1000x1500 | Pinterest pin |
| Blog Post Pin | `adhd-after-school-meltdown-why-it-happens.png` | 1000x1500 | Pinterest pin |
| Mega Bundle Pin | `adhd-parent-toolkit-bundle-printable.png` | 1000x1500 | Pinterest pin |
| OG Image (landscape) | `og-image.png` | 1200x630 | Social sharing |
| Lesson Plans OG | `lesson-plans-algerian-teachers-og.png` | 1200x630 | Social sharing (teachers) |

### Pinterest Filename SEO Guidelines:
- Use hyphens between words (not underscores)
- Include primary keyword in filename
- Keep under 50 characters when possible
- Format: `[primary-keyword]-[descriptor]-[audience].png`

---

## Recommendations Summary

| Priority | Action | Impact |
|----------|--------|--------|
| **Critical** | Convert og-image.svg to og-image.png (1200x630) | Social sharing works |
| **High** | Create 6 Pinterest pin images (1000x1500) | Unlock Pinterest traffic |
| **High** | Add `image` property to all Product schemas | Enable rich results |
| **Medium** | Add product preview images to product pages | Better UX + schema |
| **Low** | Create separate OG images per page category | Better social CTR |

---

## What's Working Well

- All inline SVGs have proper `aria-hidden="true"` for accessibility
- No broken image references
- No missing alt text issues (since no `<img>` tags exist)
- SVG favicons are lightweight and render crisply
- Decorative visuals don't block page rendering

---

## Image Directory Structure (Recommended)

When images are added, organize them as:
```
/images/
  og-image.png              (1200x630, social sharing default)
  og-teachers.png           (1200x630, teachers page social)
  pins/
    adhd-homework-routine-printable-kids.png    (1000x1500)
    adhd-morning-routine-visual-schedule.png    (1000x1500)
    adhd-calm-down-cards-feelings-wheel.png     (1000x1500)
    adhd-after-school-meltdown-routine.png      (1000x1500)
    adhd-mega-bundle-printable-parents.png      (1000x1500)
  products/
    adhd-homework-toolkit-preview.png           (800x600)
    adhd-morning-toolkit-preview.png            (800x600)
    adhd-emotional-toolkit-preview.png          (800x600)
    adhd-after-school-toolkit-preview.png       (800x600)
```
