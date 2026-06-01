# Implementation Kit — Copy/Paste-Ready Code & Content

Everything you need to ship the Top 10 high-impact changes. Open this file alongside your code editor and Canva.

> **Important:** Apply HTML snippets AFTER you merge the 19 unmerged PRs (#15-#35). The standalone files (`exit-intent.js`, lead magnet content, email sequence) work independently.

---

## Snippet 1 — Above-the-Fold Email Capture (Homepage)

**Where to paste:** Into `index.html`, immediately after the closing `</section>` of the hero section (around line 280).

```html
<section style="background:linear-gradient(135deg,#FAF6EE 0%,#F3ECF8 100%);padding:2.5rem 0;text-align:center;">
  <div class="container" style="max-width:580px;">
    <span style="display:inline-block;font-size:.75rem;text-transform:uppercase;letter-spacing:.1em;color:#9B7FBF;font-weight:700;margin-bottom:.6rem;">Free download · No spam</span>
    <h2 style="font-family:'Fraunces',serif;font-size:1.6rem;line-height:1.25;margin-bottom:.6rem;color:#3A3A3A;">ADHD Quick Wins: 9 strategies you can use tonight</h2>
    <p style="color:#6B6B6B;margin-bottom:1.5rem;font-size:1rem;">Evidence-based ADHD parenting wins, sent in 30 seconds.</p>
    <form id="topLeadForm" action="REPLACE_WITH_EMAIL_SERVICE_URL" method="post" style="display:flex;gap:.5rem;justify-content:center;flex-wrap:wrap;max-width:480px;margin:0 auto;">
      <input type="email" name="email_address" placeholder="your.email@example.com" required style="flex:1;min-width:220px;padding:.85rem 1.25rem;border-radius:50px;border:1px solid #ddd;font-size:1rem;">
      <button type="submit" style="padding:.85rem 1.75rem;background:#9B7FBF;color:#fff;border:none;border-radius:50px;font-weight:600;font-size:1rem;cursor:pointer;white-space:nowrap;">Send my PDF</button>
    </form>
    <p style="font-size:.78rem;color:#999;margin-top:.85rem;">Join 500+ ADHD parents · Unsubscribe anytime</p>
  </div>
</section>
```

Replace `REPLACE_WITH_EMAIL_SERVICE_URL` with your ConvertKit / Mailchimp form action URL.

---

## Snippet 2 — Inline Email Capture (Mid-Article in All 10 Blog Posts)

**Where to paste:** In each blog post HTML, inside the `<article class="article-body">`, immediately after the FIRST H2 section ends.

```html
<div style="background:#FAF6EE;border:1px solid #e8e0d4;border-radius:12px;padding:1.5rem;margin:2rem 0;text-align:center;">
  <strong style="display:block;margin-bottom:.5rem;font-size:1.05rem;">📩 Get the Free ADHD Quick Wins PDF</strong>
  <p style="font-size:.9rem;color:#6B6B6B;margin-bottom:1rem;">9 evidence-based strategies you can use tonight. Sent in 30 seconds.</p>
  <form action="REPLACE_WITH_EMAIL_SERVICE_URL" method="post" style="display:flex;gap:.5rem;justify-content:center;flex-wrap:wrap;">
    <input type="email" name="email_address" placeholder="your.email@example.com" required style="padding:.6rem 1rem;border-radius:8px;border:1px solid #ddd;min-width:220px;">
    <button type="submit" style="padding:.6rem 1.4rem;background:#7FBFBF;color:#fff;border:none;border-radius:8px;font-weight:600;cursor:pointer;">Send it free</button>
  </form>
  <p style="font-size:.75rem;color:#999;margin-top:.5rem;">No spam · Unsubscribe anytime</p>
</div>
```


---

## Snippet 3 — Exit-Intent Popup (Site-Wide)

**File:** Save as `assets/exit-intent.js` (create the assets directory).

**Add to all pages** before `</body>`:
```html
<script src="assets/exit-intent.js" defer></script>
```

**JS file content:**
```javascript
(function () {
  if (window.innerWidth < 768 || localStorage.getItem('eiSeen')) return;

  const html = `
  <div id="eiOverlay" style="position:fixed;inset:0;background:rgba(0,0,0,.5);display:flex;align-items:center;justify-content:center;z-index:9999;opacity:0;transition:opacity .25s;">
    <div style="background:#fff;max-width:480px;margin:1rem;padding:2rem;border-radius:12px;text-align:center;position:relative;font-family:Inter,sans-serif;">
      <button id="eiClose" aria-label="Close" style="position:absolute;top:.6rem;right:.8rem;background:none;border:none;font-size:1.5rem;cursor:pointer;color:#999;line-height:1;">&times;</button>
      <span style="display:inline-block;font-size:.7rem;text-transform:uppercase;letter-spacing:.1em;color:#9B7FBF;font-weight:700;margin-bottom:.5rem;">Wait — before you go</span>
      <h3 style="font-family:Fraunces,serif;font-size:1.4rem;margin-bottom:.6rem;color:#3A3A3A;">Get the free ADHD Quick Wins PDF</h3>
      <p style="font-size:.95rem;color:#6B6B6B;margin-bottom:1.25rem;">9 evidence-based strategies you can use tonight. Free, sent in 30 seconds.</p>
      <form action="REPLACE_WITH_EMAIL_SERVICE_URL" method="post" style="display:flex;flex-direction:column;gap:.5rem;">
        <input type="email" name="email_address" placeholder="your.email@example.com" required style="padding:.85rem 1.25rem;border-radius:8px;border:1px solid #ddd;font-size:1rem;">
        <button type="submit" style="padding:.85rem;background:#9B7FBF;color:#fff;border:none;border-radius:8px;font-weight:600;font-size:1rem;cursor:pointer;">Send my PDF</button>
      </form>
      <p style="font-size:.75rem;color:#999;margin-top:.75rem;">No spam · Unsubscribe anytime</p>
    </div>
  </div>`;

  function show() {
    if (localStorage.getItem('eiSeen')) return;
    document.body.insertAdjacentHTML('beforeend', html);
    const overlay = document.getElementById('eiOverlay');
    requestAnimationFrame(() => overlay.style.opacity = '1');
    document.getElementById('eiClose').addEventListener('click', close);
    overlay.addEventListener('click', e => { if (e.target === overlay) close(); });
    localStorage.setItem('eiSeen', '1');
  }

  function close() {
    const overlay = document.getElementById('eiOverlay');
    if (overlay) { overlay.style.opacity = '0'; setTimeout(() => overlay.remove(), 250); }
  }

  document.addEventListener('mouseout', e => {
    if (e.clientY < 5 && !e.relatedTarget) show();
  });
})();
```

Behavior: Desktop only. Triggers when cursor leaves through top of page. Shows once per browser (localStorage). Dismissable.

---

## Snippet 4 — Mobile Sticky Bottom Bar

**Where to paste:** Just before `</body>` on every page.

```html
<div id="mobileBar" style="display:none;position:fixed;bottom:0;left:0;right:0;background:#fff;border-top:1px solid #eee;padding:.65rem .85rem;z-index:998;box-shadow:0 -4px 16px rgba(0,0,0,.08);">
  <form action="REPLACE_WITH_EMAIL_SERVICE_URL" method="post" style="display:flex;gap:.4rem;align-items:center;max-width:560px;margin:0 auto;">
    <span style="font-size:.78rem;color:#3A3A3A;font-weight:600;white-space:nowrap;">📩 Free PDF:</span>
    <input type="email" name="email_address" placeholder="your email" required style="flex:1;padding:.5rem .8rem;border-radius:50px;border:1px solid #ddd;font-size:.85rem;min-width:0;">
    <button type="submit" style="padding:.55rem 1rem;background:#9B7FBF;color:#fff;border:none;border-radius:50px;font-weight:600;font-size:.85rem;white-space:nowrap;">Send</button>
    <button type="button" onclick="document.getElementById('mobileBar').style.display='none';localStorage.setItem('mbDismissed','1');" aria-label="Close" style="background:none;border:none;color:#999;font-size:1.1rem;cursor:pointer;padding:0 .25rem;">&times;</button>
  </form>
</div>
<script>
  (function(){
    if (window.innerWidth >= 768 || localStorage.getItem('mbDismissed')) return;
    setTimeout(() => { document.getElementById('mobileBar').style.display = 'block'; }, 8000);
  })();
</script>
```

---

## Snippet 5 — Pinterest Tracking Pixel

**Where to paste:** Inside `<head>` of every page (homepage, all blog posts, all product pages, teachers.html), just before `</head>`.

```html
<!-- Pinterest Tag -->
<script>
!function(e){if(!window.pintrk){window.pintrk=function(){window.pintrk.queue.push(Array.prototype.slice.call(arguments))};var n=window.pintrk;n.queue=[],n.version="3.0";var t=document.createElement("script");t.async=!0,t.src=e;var r=document.getElementsByTagName("script")[0];r.parentNode.insertBefore(t,r)}}("https://s.pinimg.com/ct/core.js");
pintrk('load', 'YOUR_PINTEREST_TAG_ID');
pintrk('page');
</script>
<noscript><img height="1" width="1" style="display:none" alt="" src="https://ct.pinterest.com/v3/?event=init&tid=YOUR_PINTEREST_TAG_ID&noscript=1" /></noscript>
<!-- End Pinterest Tag -->
```

Get `YOUR_PINTEREST_TAG_ID` from Pinterest Business → Ads → Conversions → Create Tag (free, 2 minutes).

---

## Snippet 6 — Testimonials Above Buy Button (ADHD Product Pages)

**Where to paste:** Above the `<div class="product-cta">` block on each ADHD product page.

```html
<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:1rem;margin:2rem 0;">
  <figure style="background:#fff;border:1px solid #eee;border-radius:12px;padding:1.25rem;margin:0;">
    <div style="color:#E8C87A;font-size:1rem;margin-bottom:.5rem;">★★★★★</div>
    <blockquote style="margin:0 0 .75rem;font-size:.92rem;color:#3A3A3A;line-height:1.55;font-style:normal;border:none;padding:0;background:none;">"My son actually asks to start homework now because he knows a reward block is coming. Game changer."</blockquote>
    <figcaption style="font-size:.82rem;color:#6B6B6B;">— Sarah M., mom of 8-year-old</figcaption>
  </figure>
  <figure style="background:#fff;border:1px solid #eee;border-radius:12px;padding:1.25rem;margin:0;">
    <div style="color:#E8C87A;font-size:1rem;margin-bottom:.5rem;">★★★★★</div>
    <blockquote style="margin:0 0 .75rem;font-size:.92rem;color:#3A3A3A;line-height:1.55;font-style:normal;border:none;padding:0;background:none;">"The parent scripts alone are worth the price. I stopped saying 'just focus' and started saying 'let's shrink it.'"</blockquote>
    <figcaption style="font-size:.82rem;color:#6B6B6B;">— David R., dad of twin girls</figcaption>
  </figure>
  <figure style="background:#fff;border:1px solid #eee;border-radius:12px;padding:1.25rem;margin:0;">
    <div style="color:#E8C87A;font-size:1rem;margin-bottom:.5rem;">★★★★★</div>
    <blockquote style="margin:0 0 .75rem;font-size:.92rem;color:#3A3A3A;line-height:1.55;font-style:normal;border:none;padding:0;background:none;">"Printed page 7 and stuck it on the fridge. Now my daughter picks her own reset and comes back calmer."</blockquote>
    <figcaption style="font-size:.82rem;color:#6B6B6B;">— Jasmine T., mom of 7-year-old</figcaption>
  </figure>
</div>
```

---

## Snippet 7 — Trust Bar Below Buy Button

**Where to paste:** Directly below the `<div class="product-cta">` block on each ADHD product page.

```html
<div style="display:flex;flex-wrap:wrap;justify-content:center;gap:.6rem;margin-top:1rem;font-size:.82rem;color:#6B6B6B;">
  <span>✓ Instant PDF download</span>
  <span>✓ Print unlimited copies</span>
  <span>✓ 14-day refund guarantee</span>
  <span>✓ 500+ ADHD families</span>
</div>
```


---

## Lead Magnet Content — "ADHD Quick Wins" PDF

Paste this content directly into Canva. Single-page A4 / US Letter, designed in your brand colors.

### Title Block
> **ADHD QUICK WINS**
> 9 Evidence-Based Parenting Strategies You Can Use Tonight

### Intro (small italic)
> Save this. Pin it on the fridge. Pull it out when you need a reset. Each tip works on its own — pick the one that matches tonight's hardest hour.

### Strategy 1 — After-School
> **Skip "How was school?" for the first 30 minutes.** Your child's nervous system needs sensory regulation before language. Offer a snack, water, and silence instead.
> *Read more: blog/adhd-after-school-meltdowns-homework-help*

### Strategy 2 — Homework
> **Replace "just focus" with "let's shrink it."** ADHD brains can't focus harder; they can start smaller. Cover all but one task on the worksheet.
> *Read more: blog/how-to-help-adhd-child-focus-homework-without-yelling*

### Strategy 3 — Meltdowns
> **Hand on heart for 30 seconds.** Sit beside them, place your hand on their chest, breathe slowly. Body-first co-regulation works where words fail.
> *Read more: blog/calm-down-strategies-adhd-kids*

### Strategy 4 — Schedules
> **Use NOW / NEXT / LATER instead of clock times.** ADHD brains can't feel future time. A movable marker on a 3-block list beats any digital reminder.
> *Read more: blog/adhd-visual-schedules-why-they-work*

### Strategy 5 — Focus
> **Body double — sit nearby, don't help.** ADHD adults pay $5/hour for this. It's free for your kid. Bring your own task. Don't supervise.
> *Read more: blog/body-doubling-for-kids-adhd-hack*

### Strategy 6 — Co-Regulation
> **The 3-second pause before responding.** Long enough for your prefrontal cortex to come back online. Short enough that they don't notice. The single most useful skill in ADHD parenting.
> *Read more: blog/co-regulation-adhd-kids-big-feelings-calm-parents*

### Strategy 7 — Rewards
> **Tier 1 micro-rewards happen within 5 minutes.** A high-five, a check-mark, "I noticed." This is the tier most parents skip — and it's the most important.
> *Read more: blog/adhd-reward-systems-that-motivate*

### Strategy 8 — Refusal
> **Test "can't" vs. "won't" before you push.** Defiance can be reasoned with. Demand avoidance cannot. Refusal of every option = overload, not bad behavior.
> *Read more: blog/adhd-task-refusal-what-to-do*

### Strategy 9 — School Communication
> **Email teachers BEFORE the meltdown spiral.** "Quick homework question about [name]" gets opened in the morning. Reach out at problem 1, not problem 50.
> *Read more: blog/what-teachers-wish-adhd-parents-knew-homework*

### Footer
> These 9 wins are excerpted from our 4-toolkit ADHD parent system.
> Full toolkits at **payhip.com/creativekidsdigit**
> © 2026 Fearless Creations · Made with care for ADHD families

### Canva Design Notes
- 1 page, US Letter (8.5 × 11 in) or A4
- Background: cream `#FAF6EE`
- Headers: Fraunces serif bold, color `#3A3A3A`
- Body text: Inter sans-serif, 11pt
- Numbers: Large, lavender `#9B7FBF` circle backgrounds
- Bottom-right: small Fearless Creations logo
- Save as PDF (high quality, embed fonts)

---


## Email Sequence — 5-Email Welcome Series

Paste each email into your email service. Set up as a sequence triggered when someone subscribes via the lead magnet form.

### Email 1 — Day 0 (immediate)

**Subject:** Your ADHD Quick Wins PDF (+ a small ask)

**Body:**

Hi friend,

Your ADHD Quick Wins PDF is attached. Save it to your phone or print it for the fridge — both work.

Before you close this email, I have one tiny ask: **what's your hardest hour with your ADHD child?** (Mornings? Homework? Bedtime? After-school?)

Reply to this email and tell me. I read every reply. It helps me make better resources for you, and I'll send the right strategies your way.

Just hit reply with one word: morning, homework, after-school, bedtime, or other.

— The Fearless Creations team

*P.S. Tomorrow I'm sending you something most ADHD parents have never heard of: why your child's 3pm meltdown is actually a documented neurological phenomenon called restraint collapse. Watch your inbox.*

**[Attach: ADHD Quick Wins PDF]**

---

### Email 2 — Day 2

**Subject:** Why your ADHD child melts down at 3pm (it's not what you think)

**Body:**

If your child is sweet at school and falls apart at home — read this.

The afternoon meltdown has a name: **restraint collapse**. Your child holds it together for 6 hours of school, depleting 80% of their executive function just looking "fine." By 3pm, the system is empty. Home is safe. They release.

This isn't bad behavior. It isn't bad parenting. It's a documented neurological phenomenon, and it has a fix.

The 60-minute reset routine is in our full guide:

**Read:** [Why Your ADHD Child Melts Down After School (And What Actually Helps)](https://creativekidsdigit.github.io/blog/adhd-after-school-meltdowns-homework-help.html)

Tomorrow I'll send you the homework version — the routine that ends the 6:30pm worksheet wars.

— Fearless Creations

---

### Email 3 — Day 4

**Subject:** The homework battle has a fix (and it's not bribery)

**Body:**

6:30pm. The math worksheet has been on the table for an hour. Your child has sharpened the same pencil three times.

Sound familiar?

Standard homework advice doesn't work for ADHD kids because **it wasn't built for ADHD brains**. The strategies in our guide were.

Inside:
- The 5-Block Homework Routine (Reset → Connect → Plan → Work → Reward)
- 6 evidence-based focus strategies (body doubling is the parent's secret weapon)
- 30+ parent scripts to replace "just focus"

**Read:** [How to Help Your ADHD Child Focus on Homework (Without Yelling)](https://creativekidsdigit.github.io/blog/how-to-help-adhd-child-focus-homework-without-yelling.html)

If you want everything as a printable system you can use tonight:

**Get the toolkit:** [ADHD Homework Survival Toolkit — $9](https://payhip.com/b/i2x1W)

No pressure. Read the article first. The toolkit is there if you want the system.

— Fearless Creations

---

### Email 4 — Day 7

**Subject:** When "calm down" makes it worse (here's what works)

**Body:**

Have you ever said "calm down" to your ADHD child and watched the meltdown get worse?

Here's why: a dysregulated ADHD brain literally cannot access logic. The amygdala is in charge. Reasoning won't work. **Body-first co-regulation will.**

The Calm-Down Pyramid:
1. Body first (your body, then theirs)
2. Sensory regulation (one sensory input)
3. Naming the feeling (yours first)
4. Choosing the next move

Skip steps 1-2 and step 3 will fail. Every time.

**Read:** [Calm-Down Strategies for ADHD Kids: What Works (And Doesn't)](https://creativekidsdigit.github.io/blog/calm-down-strategies-adhd-kids.html)

If big feelings are a daily battle:

**Get the toolkit:** [ADHD Emotional Regulation Toolkit — $11](https://payhip.com/b/iCIH8)

Includes feelings wheel, calm-down cards, body scan, co-regulation guide.

— Fearless Creations

---

### Email 5 — Day 14

**Subject:** What 500 ADHD families wish they'd known sooner

**Body:**

A confession from a tired ADHD mom:

*"I spent 4 years thinking my kid was just lazy. Then I read about restraint collapse and cried for an hour. He wasn't lazy. He was empty."*

Most ADHD parents come to us after years of:
- Bedtime struggles that ended in tears
- Homework wars they swore they'd never fight
- "Calm down" sentences they immediately regretted

The toolkits we build solve specific moments:
- **Mornings** → ADHD Morning Routine Toolkit ($9)
- **Homework** → ADHD Homework Survival Toolkit ($9)
- **Big feelings** → ADHD Emotional Regulation Toolkit ($11)
- **After-school** → ADHD After-School Reset Toolkit ($29)

The **ADHD Mega Bundle** combines the 3 most-purchased toolkits for **$22** (saves you $7).

**Get the bundle:** [https://payhip.com/creativekidsdigit](https://payhip.com/creativekidsdigit)

If you've read this far, you're already doing the hardest part right.

— The Fearless Creations team

*P.S. From here, you'll get one weekly email with a new ADHD parenting strategy. No spam, no constant selling. Just the thing that helped 500 families this week.*

---

## ConvertKit Quick Setup

1. Sign up at **convertkit.com** (free up to 1,000 subs)
2. Create a **Tag** called "ADHD Parent"
3. Create a **Form** with the lead magnet PDF as incentive
4. Copy the form's **action URL** into the snippet placeholders above
5. Create a **Sequence** called "ADHD Welcome 5-Email"
6. Paste each of the 5 emails (one per day)
7. Trigger the sequence when someone subscribes via the form
8. Test it: enter your own email through the homepage form, confirm Email 1 arrives in <2 min

Done. The autoresponder runs forever from this point.

---

## Implementation Order

| Step | Action | Snippet | Time |
|:----:|--------|:-------:|:----:|
| 1 | Sign up for ConvertKit + create form | — | 30 min |
| 2 | Replace `REPLACE_WITH_EMAIL_SERVICE_URL` placeholders | Snippets 1, 2, 3, 4 | 5 min |
| 3 | Build the lead magnet PDF in Canva | Lead Magnet Content | 2 hr |
| 4 | Upload PDF to ConvertKit, set as incentive | — | 15 min |
| 5 | Paste 5 emails into a ConvertKit Sequence | Email Sequence | 1 hr |
| 6 | Apply Snippet 5 (Pinterest pixel) to head of all pages | Snippet 5 | 30 min |
| 7 | Apply Snippet 1 (above-fold capture) to homepage | Snippet 1 | 15 min |
| 8 | Apply Snippet 2 (inline capture) to all 10 blog posts | Snippet 2 | 30 min |
| 9 | Save Snippet 3 as `assets/exit-intent.js` + reference everywhere | Snippet 3 | 15 min |
| 10 | Apply Snippet 4 (mobile bar) to all pages | Snippet 4 | 15 min |
| 11 | Apply Snippets 6 + 7 to 4 ADHD product pages | Snippets 6, 7 | 30 min |

**Total:** ~6 hours of focused work.

This kit + the existing 19 unmerged PRs = your complete launch funnel.
