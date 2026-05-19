# ConvertKit Setup &mdash; 5-minute checklist

This site already has the front-end wired for ConvertKit. You only need to:

1. **Create two ConvertKit forms**
2. **Paste their IDs into `forms.js`**
3. **Build the auto-reply automation that delivers the free lesson plan**

That's it. No backend, no Zapier, no extra hosting.

---

## 1. Create your forms in ConvertKit

In your ConvertKit dashboard go to **Grow &rarr; Landing Pages &amp; Forms &rarr; Create new** and create:

### Form A &mdash; "Homepage Free Sample"
- **Format:** *Inline*
- **Style:** any (we don't render ConvertKit's HTML &mdash; we just call its API)
- **Incentive email:** OFF for now (we want a richer automation)
- **Tags to apply on subscribe:**
  - `lesson-plans`
  - `free-sample-3as`
  - `source: homepage`

### Form B &mdash; "Newsletter &mdash; Teachers"
- **Format:** *Inline*
- **Tags to apply on subscribe:**
  - `newsletter`
  - `teachers`
  - `source: homepage-footer`

---

## 2. Find each form's ID

Open the form, then look at the URL:

```
https://app.convertkit.com/forms/8123456/edit
                                    ^^^^^^^
                                  this is your form ID
```

Or click **Embed &rarr; HTML** &mdash; the ID also appears in the snippet (`data-uid` or `/forms/<id>/subscriptions`).

---

## 3. Paste the IDs into `forms.js`

Open `forms.js` at the root of the repo and edit the two values:

```js
var CONVERTKIT = {
  leadMagnetFormId:  '8123456',  // <-- Form A
  newsletterFormId:  '8123457',  // <-- Form B
  publicApiKey:      ''
};
```

Commit and push. The forms will start delivering subscribers to ConvertKit immediately.

> If you leave the IDs empty, the forms still work end-to-end visually:
> they validate, show the success message, and queue leads in `localStorage`
> so launching before ConvertKit is configured is safe.

---

## 4. Build the auto-reply that delivers the free lesson plan

This is what turns the free sample into a real lead-magnet flow.

### A. Upload the asset to ConvertKit's File Library
- ConvertKit dashboard &rarr; **Earn &rarr; Products** is for paid products. For a free download we use the **File Manager** (icon in the email composer).
- Upload **two** files:
  - `Fearless-Creations-3AS-Ancient-Civilizations.pdf`
  - `Fearless-Creations-3AS-Ancient-Civilizations.docx`

> The Markdown source is in `prompts/free-sample-3as-ancient-civilizations.md`.
> Open it in Google Docs / Word, apply your brand styling, and export to both formats.

### B. Create a Visual Automation
- ConvertKit dashboard &rarr; **Automate &rarr; Visual Automations &rarr; New Automation**
- Name it: **"Free Sample &mdash; 3AS Ancient Civilizations"**
- Trigger: **Joins a form** &rarr; select **"Homepage Free Sample"**
- Action: **Email** &rarr; *Send a sequence email*

### C. Compose the email

**Subject:** Your free 3AS lesson plan is here &mdash; *Ancient Civilizations*

**From:** Fearless Creations &lt;hello@fearlesscreations.com&gt;

**Body (paste &amp; tweak):**

```
Hi there,

Thank you for joining the Fearless Creations teacher community.

As promised, here's your complete 60-minute lesson plan for 3AS,
Unit 1 — Ancient Civilizations:

  📎 Download (PDF):   {{download-pdf}}
  📎 Download (DOCX):  {{download-docx}}

What you'll find inside:
  • Target competency phrased as a Can-do statement
  • SMART objectives tagged with Bloom's verbs
  • Full lesson stages table (warm-up → production)
  • Expected pupils' answers for every prompt
  • Differentiation strategies for three ability tiers
  • Assessment rubric, homework and remedial activities

If this lesson plan saves you time this week, you'll love what's
in the full library — over 40 inspector-ready lesson plans for
1AS, 2AS, 3AS and BAC preparation:

  → https://creativekidsdigit.github.io/#lesson-plans

Quick question to help me tailor what comes next:
What level do you teach the most? (Just hit reply with "1AS",
"2AS", "3AS" or "BAC" — I read every reply.)

Calmer Sundays ahead,
Fearless Creations
```

Replace `{{download-pdf}}` and `{{download-docx}}` with the file links from
the File Manager.

### D. Add a follow-up nurture sequence (optional but recommended)

Add to the same Visual Automation:

| Day | Email |
|-----|-------|
| **+0** | Free lesson plan delivery (above) |
| **+2** | "How to use the plan in your 3AS class — a 3-minute walkthrough" |
| **+5** | "What teachers liked most about the full library" (3 testimonials + soft CTA) |
| **+9** | "Behind the scenes: how I write a Fearless Creations lesson plan" |
| **+14** | First-purchase coupon: 15&percnt; off any plan, valid 72h |

---

## 5. Verify

1. Open the homepage in an incognito window.
2. Submit the lead-magnet form with a test address.
3. Confirm the new subscriber appears in ConvertKit with the expected tags.
4. Confirm the free-sample email arrives within ~1 minute.

If something breaks, every submission is also stored in the browser's
`localStorage` under the key `fc_pending_leads` &mdash; so you never lose a lead.

---

## Optional: analytics

`forms.js` already fires `gtag('event', 'sign_up', ...)` and
`fbq('track', 'Lead', ...)` on success, so if you later add Google
Analytics or Facebook Pixel to the page they'll automatically track conversions.

That's it. Ship it.
