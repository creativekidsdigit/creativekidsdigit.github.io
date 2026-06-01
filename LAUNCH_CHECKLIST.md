# Funnel Launch Checklist

**Goal:** Move from "drafted assets" to "earning revenue" in the shortest realistic timeline.

**Current state:** 10 blog post PRs (unmerged), 4 product pages, 2 working Payhip checkouts, GitHub Pages live, no traffic engine running yet.

**The single biggest leverage point:** Pinterest. Everything else (SEO, email, sales) compounds from there.

---

## TODAY — 2 to 3 Hours, Highest Impact

These are blocking. Without them, nothing else can start.

### 1. Merge the content PRs in this exact order (45 min)
Merge in order. Each later PR will have a small `sitemap.xml` conflict — resolve by keeping all blog URLs from both branches.

```
PR #15 → PR #16 → PR #17 → PR #18 → PR #19 → PR #20
PR #21 → PR #22 → PR #23 → PR #24 → PR #25 → PR #26
PR #27 → PR #28 → PR #29 → PR #30 → PR #31 → PR #32
```

After merge, verify the live site: every blog post should be accessible at its URL, every "Buy" button should open Payhip in a new tab.

### 2. Submit sitemap to Google Search Console (10 min)
- Sitemap URL: `https://creativekidsdigit.github.io/sitemap.xml`
- Path: Search Console → Sitemaps → Add new sitemap → enter `sitemap.xml` → Submit

### 3. Request indexing for the 4 highest-value URLs (15 min)
In Search Console → URL Inspection, paste each URL → "Request indexing":
1. `https://creativekidsdigit.github.io/`
2. `https://creativekidsdigit.github.io/blog/adhd-after-school-meltdowns-homework-help.html`
3. `https://creativekidsdigit.github.io/products/adhd-homework-toolkit.html` (live checkout)
4. `https://creativekidsdigit.github.io/products/adhd-emotional-regulation-toolkit.html` (live checkout)

### 4. Set up Pinterest Business account (20 min)
- pinterest.com/business → Create free account
- Verify your domain (Settings → Claim → enter `creativekidsdigit.github.io`)
- Enable Rich Pins (auto-pulls Article schema you already have)
- Create 4 boards minimum:
  - ADHD Parenting Tips
  - ADHD Homework Help
  - ADHD Emotional Regulation
  - ADHD Routines & Visual Schedules

### 5. Confirm email capture is working (15 min)
Test the homepage email form with a real email. Confirm you receive a notification (ConvertKit / Mailchimp / whatever you use). If broken, fix this BEFORE driving any traffic.

### 6. Buy a domain — optional but recommended (10 min, $12)
`creativekidsdigit.github.io` works but converts ~30% lower than a real domain. If you don't have one yet, register `fearlesscreations.com` or similar and point it at GitHub Pages. Don't delay launch over it.

---

## THIS WEEK — 5 to 7 Hours, Compounding Setup

The week is about turning the dormant blog into a Pinterest-fed traffic engine.

### Day 1-2: Pin design (3-4 hours total)
Create **10 pin images** (1 per blog post). Each pin uses one of the 5 viral hook angles already documented in the HTML comment at the bottom of each blog post.

- **Tool:** Canva (free)
- **Size:** 1000 × 1500 px (vertical, 2:3 ratio)
- **Brand colors:** teal `#7FBFBF` + lavender `#9B7FBF` + cream `#FAF6EE`
- **Filename pattern:** keyword-rich, hyphenated (e.g., `adhd-homework-routine-printable-kids.png`)
- **Save 10 designs as templates** so you can iterate (you'll create 4 more variants per post over time)

### Day 3: Upload + publish first 10 pins (1 hour)
- Pin each to its primary board AND 1-2 related boards
- Pin description format:
  ```
  [Hook sentence]. [What's inside]. [CTA].
  #ADHDParenting #ADHDKids #[topic] #NeurodivergentParenting
  ```
- Pin destination: the **blog post URL only** — never directly to Payhip

### Day 4-7: Daily pinning routine (15 min/day)
- Pin 1 fresh pin per day (varying which post, varying which hook)
- Repin 5-10 high-quality pins from other ADHD parenting accounts (signals you're active)
- Track which pins get saves — that data shapes your design choices

### Set up email lead magnet (1 hour, do during week)
- Create a 1-page "ADHD Quick Wins" PDF (10 tips, branded)
- Add to homepage as the email capture incentive
- Trigger sends the PDF + a 5-email welcome sequence
- Welcome sequence email subjects (write once, automate forever):
  1. **Day 0:** "Your ADHD quick wins (and a small ask)"
  2. **Day 2:** "Why your ADHD child melts down at 3pm" → links to blog #1
  3. **Day 4:** "The homework battle has a fix" → links to blog #2 + Homework Toolkit
  4. **Day 7:** "When 'calm down' makes it worse" → links to blog #3 + Emotional Reg
  5. **Day 14:** "What 500 ADHD families wish they'd known sooner" (story + soft sell on bundle)

### Submit each blog post for indexing (30 min, do during week)
URL Inspection → request indexing for all 10 blog URLs. Speeds up Google discovery from "weeks" to "days."

### Apply for Pinterest Verified Merchant (15 min)
Once you have a verified domain and live checkouts, you can apply. Approval gives you product pin features and search visibility in shopping queries.

---

## NEXT 30 DAYS — The Scale Phase

By end of week 4, you should be running a real funnel. The work is consistency, not creativity.

### Week 2: Pinterest scale + email automation
- Increase to **3-5 fresh pins/day** (different blog posts, different hooks)
- Total pins published by end of week 2: 30-40
- Activate the 5-email welcome sequence for any new email subscribers
- Add a sticky banner on the homepage: "Free ADHD Quick Wins PDF" + email field

### Week 3: First conversion data review
- Open Google Analytics (or Search Console Performance tab)
- Identify: which blog post is getting the most traffic?
- Whichever it is — make 5 NEW pins for that post (you've found a winner)
- Identify: which product page is getting the most visits?
- That's your hottest funnel — promote that product harder

### Week 4: Get the missing Payhip URLs
- Publish your Morning Routine Toolkit and After-School Reset Toolkit on Payhip
- Send me the `/b/` URLs — I'll connect them across all 10 blog posts in one PR
- This unblocks ~30% of your funnel arms (Posts #1, #6, #7 currently dead-end)

### Throughout the 30 days
- **Pinterest:** 5-10 pins/day
- **Email:** Add 1 broadcast email per week (share the latest blog post)
- **Blog:** Don't write new content yet — let the existing 10 do their work
- **Engagement:** Reply to every comment within 48 hours
- **Reviews:** After your first 10 sales, ask each customer for a Payhip review (this 3x's conversion rate over time)

---

## Traffic Goals (Realistic, Pinterest-Heavy Niche)

| Time | Pinterest Impressions / Mo | Site Visits / Mo | Email Subs / Mo | Sales / Mo |
|------|---------------------------:|-----------------:|----------------:|-----------:|
| **Week 1** | 1,000-3,000 | 50-150 | 2-10 | 0-1 |
| **Week 4 (Month 1)** | 5,000-15,000 | 200-600 | 15-40 | 1-5 |
| **Month 3** | 30,000-80,000 | 1,500-4,000 | 80-200 | 8-25 |
| **Month 6** | 100,000-250,000 | 5,000-12,000 | 250-600 | 30-90 |
| **Month 12** | 300,000-800,000 | 15,000-40,000 | 600-1,500 | 100-350 |

**Why these numbers:** ADHD parenting + printable products is a high-saver, high-buyer niche on Pinterest. Industry benchmarks: 33% blog→product CTR, 5% product→checkout conversion, $9-29 AOV. Pinterest takes 4-8 weeks to seed, then compounds heavily after month 3.

---

## Pinterest Posting Schedule

### Week 1
- 1 fresh pin/day from your initial 10 designs
- Repin 5-10 from other accounts daily

### Week 2-4
- 3-5 fresh pins/day (mix of new designs and repurposed)
- Repin 5-10 daily
- Pin to 2-3 boards each (your own + 1-2 group boards if you can join)

### Month 2+
- 5-10 fresh pins/day
- Track performance weekly: pins with >100 saves get redesigned variants
- Total pins by Month 3: 300-600
- Total pins by Month 12: 2,000-4,000

### Best posting times (US/UK ADHD parent audience)
- 8-10pm local time, weekdays (post-bedtime, parent scrolling)
- Saturday 9-11am (weekend planning)
- Schedule pins through Pinterest's native scheduler or Tailwind ($15/mo) — manual posting is unsustainable past week 2

---

## SEO Indexing Checklist

Complete in this order. Each step takes 10-30 minutes.

- [ ] Submit sitemap to Search Console (`sitemap.xml`)
- [ ] Submit sitemap to Bing Webmaster Tools (10% of search traffic, free)
- [ ] Request indexing for all 10 blog URLs in Search Console (one-by-one)
- [ ] Request indexing for all 4 product page URLs
- [ ] Verify Article schema for blog posts via [Google Rich Results Test](https://search.google.com/test/rich-results) (paste each URL, confirm valid)
- [ ] Verify Product schema for product pages
- [ ] Verify FAQPage schema for `teachers.html`
- [ ] Confirm internal links from homepage to each blog post are working (already done in PRs)
- [ ] Wait 7 days, then check Search Console Performance for first impressions
- [ ] Identify top 5 queries you're appearing for — adjust meta descriptions if CTR is below 2%

---

## Conversion Optimization Checklist

Do these in order. Each compounds.

- [ ] Verify Payhip checkout works on mobile (90% of Pinterest traffic is mobile — test on your phone)
- [ ] Confirm `target="_blank"` on every Buy button so users don't lose your page
- [ ] Add the email capture above the fold on the homepage (free PDF + form)
- [ ] Add a sticky "Free Sample" banner to the top of every blog post (drives email signups from blog readers)
- [ ] Write the 5-email welcome sequence (drives sales from subscribers)
- [ ] After first 10 sales: request reviews on Payhip (social proof = 2-3x conversion)
- [ ] A/B test: at month 2, swap one blog post's primary CTA position (mid-article → end-of-article). Compare conversion.
- [ ] Add scarcity element on product pages: "Used by 500+ ADHD families" already exists — keep it
- [ ] Reduce checkout friction: ensure Payhip product pages have clear delivery promise ("instant download")
- [ ] Build the bundle products on Payhip (Mega Bundle $22, School Year Bundle $39) — the bundle CTAs already exist on your site, they just need URLs

---

## Expected Milestones (Be Honest With Yourself)

These are real numbers from comparable Pinterest-driven printable businesses.

| Milestone | Realistic timeline | Stretch goal |
|---|---|---|
| First Pinterest impression | Day 1 of pinning | — |
| First blog visitor | Day 2-5 | Day 1 |
| First email subscriber | Week 1-2 | Day 3 |
| First Payhip product page visit | Week 1 | Day 2 |
| **First Payhip sale** | **Week 4-8** | Week 2 |
| 5 sales in a single week | Month 2-3 | Week 6 |
| First repeat customer | Month 3-4 | Month 2 |
| First viral pin (1,000+ saves) | Month 2-4 | Month 1 |
| Sustainable $500/mo revenue | Month 4-6 | Month 3 |
| First $1,000 month | Month 6-9 | Month 4 |

**Reality check:** Most printable businesses fail at month 2 because they expect viral results in week 1. The ones that succeed treat months 1-3 as "seeding" and start measuring at month 4. Plan accordingly.

---

## What NOT to Do (Common Mistakes That Kill Launches)

- ❌ Don't write more blog posts before the existing 10 get traffic
- ❌ Don't redesign the website in week 2 (premature optimization)
- ❌ Don't run paid ads until organic traffic shows what's converting
- ❌ Don't change Pinterest pin design every week (give each design 2-3 weeks of data)
- ❌ Don't email subscribers more than once a week (kills list health)
- ❌ Don't link Pinterest pins directly to Payhip (kills SEO + email capture)
- ❌ Don't switch platforms before month 6 (Payhip → Gumroad / Shopify is premature)
- ❌ Don't spend money on courses about how to run Pinterest (the docs you have are enough)

---

## Single-Sentence Summary

**Merge the PRs today, design 10 pins this week, pin daily for 30 days → first sale within 60 days.**

Everything else is a distraction until those four things happen.
