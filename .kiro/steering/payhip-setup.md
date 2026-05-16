# Payhip checkout — setup guide

The site uses **Payhip embedded buy buttons**. Clicking "Add to cart" opens
Payhip's checkout overlay on the same page (no redirect). The "Cart" button
in the nav opens the Payhip cart overlay.

## How Payhip embeds work

`index.html` loads Payhip once, near the bottom:

```html
<script src="https://payhip.com/payhip.js"></script>
```

Payhip then auto-binds to any element with these classes:

- `class="payhip-buy-button" data-product="PRODUCT_ID"` → adds to cart (overlay)
- `class="payhip-buy-button" data-product="PRODUCT_ID" data-cart="off"` → skips cart, goes straight to checkout (the **Buy now** button)
- `class="payhip-cart-button"` → opens the multi-item cart overlay (the nav cart)

Each product card renders both buttons side-by-side:

```html
<div class="product__buttons">
  <a class="payhip-buy-button btn btn--soft btn--sm"  data-product="ID">+ Cart</a>
  <a class="payhip-buy-button btn btn--primary btn--sm" data-product="ID" data-cart="off">Buy now</a>
</div>
```

The `href="https://payhip.com/b/PRODUCT_ID"` on each button is the **fallback
link** Payhip uses if JS is blocked — it sends users to Payhip's hosted
product page. Same `PRODUCT_ID` everywhere.

## Replacing the placeholder IDs

Each product currently uses a **named placeholder** (e.g. `FOCUS_FIDGET_BUNDLE`).
Each product appears **4 times** in `index.html` (twice per button × 2 buttons:
Add-to-cart and Buy-now). A single find/replace updates all of them.

After you create the product in Payhip:

1. Go to your Payhip dashboard → Products → click the product
2. Find the **Product link**, e.g. `https://payhip.com/b/aBcD3` — the part
   after `/b/` is your real Product ID (e.g. `aBcD3`)
3. In `index.html`, find/replace the placeholder with the real ID

> **Bundle tip:** For the Calm Starter Bundle, create a new Payhip product
> priced at $31 and attach all 4 included PDFs (Focus & Fidget Bundle, Calm
> Morning Routine, Quiet Garden Pages, Mini Forest Friends). Payhip lets one
> product deliver multiple files.

## Placeholder → Product mapping

| Placeholder ID            | Section     | Product                          | Price |
| ------------------------- | ----------- | -------------------------------- | ----- |
| `FOCUS_FIDGET_BUNDLE`     | ADHD        | Focus & Fidget Bundle            | $14   |
| `VISUAL_SCHEDULE_CARDS`   | ADHD        | Visual Daily Schedule Cards      | $9    |
| `BIG_FEELINGS_KIT`        | ADHD        | Big Feelings Calm-Down Kit       | $11   |
| `CALM_MORNING_ROUTINE`    | Ebooks      | The Calm Morning Routine         | $15   |
| `FEARLESS_FOCUS_KID`      | Ebooks      | Raising a Fearless Focus Kid     | $22   |
| `QUIET_CLASSROOM_TOOLKIT` | Ebooks      | The Quiet Classroom Toolkit      | $25   |
| `QUIET_GARDEN_PAGES`      | Coloring    | Quiet Garden Pages               | $7    |
| `SLEEPY_SEA_FRIENDS`      | Coloring    | Sleepy Sea Friends               | $8    |
| `BRAVE_HEARTS_COLORING`   | Coloring    | Brave Hearts Mindful Coloring    | $12   |
| `MINI_FOREST_FRIENDS`     | Papercraft  | Mini Forest Friends              | $6    |
| `TINY_TOWN_HOUSES`        | Papercraft  | Tiny Town Paper Houses           | $10   |
| `SEASONS_GARLAND`         | Papercraft  | Seasons Paper Garland Set        | $5    |
| `CALM_STARTER_BUNDLE`     | Bundle      | The Calm Starter Bundle (4-pack) | $31   |

## Optional Payhip features you can turn on later

- **Coupons / discount codes** — set up in Payhip dashboard, no code change needed
- **PDF stamping** — Payhip auto-stamps each PDF with the buyer's email to deter sharing
- **Affiliate program** — generate affiliate links from the dashboard
- **EU VAT / sales tax** — toggle on in Payhip settings (handles compliance for you)
- **Reviews** — embed product reviews via Payhip's review widget
- **Email file delivery** — products are auto-delivered after payment; no extra setup

## Testing the integration

1. Open `index.html` in a browser
2. Click any "Add to cart" — Payhip overlay should appear
3. Until you replace placeholder IDs, the overlay will show "Product not found"
4. Once IDs are real, you can use Payhip's test mode (Settings → Test mode)
   to do end-to-end purchase flow without real charges

## Why Payhip and not Stripe / Gumroad / Lemon Squeezy

- No backend / hosting needed — works with this static site as-is
- Handles VAT, MOSS, file delivery, and PDF stamping out of the box
- Lower fees than Gumroad for digital products at low price points
- Cart overlay keeps customers on your site (vs. a full checkout redirect)
