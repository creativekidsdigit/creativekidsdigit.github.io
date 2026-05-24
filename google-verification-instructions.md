# Google Search Console Setup — Step-by-Step

## Your Site: https://creativekidsdigit.github.io/

Your site is a **plain HTML static site** hosted on GitHub Pages. Here's exactly how to get it indexed by Google.

---

## Step 1: Go to Google Search Console

1. Open https://search.google.com/search-console
2. Sign in with your Google account
3. Click **"Add Property"** (top-left dropdown)
4. Choose **"URL prefix"** (not Domain)
5. Enter: `https://creativekidsdigit.github.io/`
6. Click **Continue**

---

## Step 2: Verify Ownership (Choose ONE method)

### Option A: HTML Meta Tag (Recommended — easiest)

Google will show you a meta tag like this:
```html
<meta name="google-site-verification" content="YOUR_UNIQUE_CODE_HERE" />
```

**Where to add it:**
Open `index.html` and add it inside the `<head>` section, right after the existing meta tags:

```html
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <!-- ADD GOOGLE VERIFICATION HERE -->
  <meta name="google-site-verification" content="PASTE_YOUR_CODE_HERE" />
  <!-- ... rest of head ... -->
</head>
```

Then commit + push to GitHub. Wait 1–2 minutes for GitHub Pages to deploy, then click **Verify** in Search Console.

---

### Option B: HTML File Upload (Alternative)

Google will give you a file named something like `googleXXXXXXXXXXXXXXXX.html`

1. Download the file from Search Console
2. Place it in the ROOT of your repository (same level as `index.html`)
3. Commit and push
4. Verify the file is live by visiting: `https://creativekidsdigit.github.io/googleXXXXXXXXXXXXXXXX.html`
5. Click **Verify** in Search Console

---

## Step 3: Submit Your Sitemap

Once verified:

1. In Search Console, go to **Sitemaps** (left sidebar)
2. In the "Add a new sitemap" field, enter: `sitemap.xml`
3. Click **Submit**

Your sitemap is already live at:
https://creativekidsdigit.github.io/sitemap.xml

It includes all your product pages (14 URLs total including the new After-School Reset Toolkit).

---

## Step 4: Request Indexing (Optional but speeds things up)

1. In Search Console, go to **URL Inspection** (top search bar)
2. Paste your homepage URL: `https://creativekidsdigit.github.io/`
3. Click **Request Indexing**
4. Repeat for your most important pages:
   - `https://creativekidsdigit.github.io/products/adhd-after-school-reset-toolkit.html`
   - `https://creativekidsdigit.github.io/products/adhd-homework-toolkit.html`
   - `https://creativekidsdigit.github.io/products/adhd-morning-routine-toolkit.html`
   - `https://creativekidsdigit.github.io/products/adhd-emotional-regulation-toolkit.html`

---

## What's Already Done For You

| Item | Status | Location |
|---|---|---|
| `sitemap.xml` | Ready | Root of repository |
| `robots.txt` | Ready | Root of repository (points to sitemap) |
| Meta descriptions | Done | Every product page has unique `<meta name="description">` |
| Open Graph tags | Done | All product pages have OG tags for social sharing |
| Structured Data (JSON-LD) | Done | Product pages have Schema.org Product markup |
| Canonical URLs | Done | Every page has `<link rel="canonical">` |

---

## Timeline Expectations

- **Verification:** Instant (once you add the tag and push)
- **Sitemap processing:** 1–3 days
- **First pages indexed:** 3–7 days
- **Full indexing:** 1–4 weeks
- **Ranking for keywords:** 2–8 weeks (depends on competition)

---

## Bonus: Speed Up Indexing

1. **Share your product pages on social media** — Google crawls shared links faster
2. **Pin your pages on Pinterest** — Pinterest links get crawled quickly
3. **Submit individual URLs** via the URL Inspection tool in Search Console
4. **Interlink your pages** — your site already does this well (nav + product grid)

---

## If You Add a Custom Domain Later

If you connect a custom domain (e.g., `creativekidsdigit.com`):
1. Add the domain as a new property in Search Console
2. Re-verify ownership (usually via DNS TXT record)
3. Update `sitemap.xml` URLs to use the new domain
4. Update `robots.txt` Sitemap line
5. Set up 301 redirects from the old `.github.io` URLs

---

## File Reference

```
creativekidsdigit.github.io/
├── index.html          ← Add verification meta tag HERE (in <head>)
├── sitemap.xml         ← Already done, submit to Search Console
├── robots.txt          ← Already done, points to sitemap
├── products/
│   ├── adhd-after-school-reset-toolkit.html  ← NEW (in sitemap)
│   ├── adhd-homework-toolkit.html
│   ├── adhd-morning-routine-toolkit.html
│   ├── adhd-emotional-regulation-toolkit.html
│   └── ... (other product pages)
└── google-verification-instructions.md  ← This file (delete after setup)
```
