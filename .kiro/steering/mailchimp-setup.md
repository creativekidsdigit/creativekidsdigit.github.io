# Newsletter (Mailchimp) — wiring it up later

The newsletter form on the homepage is currently a **polished placeholder**.
It validates the email and shows a friendly "coming soon" message, but it
doesn't send the email anywhere yet.

## Current state

In `index.html`:

```html
<form class="newsletter__form mc-form" data-coming-soon novalidate>
  <input id="mce-EMAIL" name="EMAIL" type="email" required />
  <button type="submit" class="btn btn--primary" name="subscribe">Get my free pack</button>
  <p class="newsletter__note" id="newsletter-note">We respect your inbox. Unsubscribe any time.</p>
</form>
```

The `data-coming-soon` attribute is what tells `script.js` to skip the
real submission and show the "list opens soon" message instead.

The eyebrow above the form reads **"Free printable · Coming soon"** —
this honestly signals the state to visitors.

## To wire up Mailchimp (later, ~2 minutes)

1. Sign up at [mailchimp.com](https://mailchimp.com) (free up to 500 contacts)
2. Create an **audience** (your subscriber list)
3. Go to **Audience → Signup forms → Embedded forms → Naked form**
4. Mailchimp will show you a snippet that looks like this:

   ```html
   <form action="https://us21.list-manage.com/subscribe/post?u=abc123def456&amp;id=xyz789"
         method="post" target="_blank">
     <input type="email" name="EMAIL" />
     ...
     <div style="position:absolute;left:-5000px;" aria-hidden="true">
       <input type="text" name="b_abc123def456_xyz789" tabindex="-1" value="">
     </div>
     ...
   </form>
   ```

5. In `index.html`, find the form and **replace this**:

   ```html
   <form class="newsletter__form mc-form" data-coming-soon novalidate>
   ```

   **with this** (using your real action URL from step 4):

   ```html
   <form
     class="newsletter__form mc-form"
     action="https://us21.list-manage.com/subscribe/post?u=YOUR_USER_ID&amp;id=YOUR_LIST_ID"
     method="post"
     target="_blank"
     novalidate
   >
   ```

6. Just before the closing `</form>` tag, add the Mailchimp honeypot
   (the field name must be `b_USERID_LISTID` — the same values from step 4):

   ```html
   <div aria-hidden="true" style="position:absolute;left:-5000px;">
     <input type="text" name="b_YOUR_USER_ID_YOUR_LIST_ID" tabindex="-1" value="" />
   </div>
   ```

7. Update the eyebrow above the form from "Free printable · Coming soon"
   back to just "Free printable".

That's it. The JS in `script.js` automatically detects whether
`data-coming-soon` is present and behaves accordingly.

## Alternatives if you prefer something other than Mailchimp

The `script.js` form handler is provider-agnostic — any of these can plug in
the same way (replace the form's `action` with their endpoint URL):

- **Buttondown** ([buttondown.email](https://buttondown.email)) — clean, indie, $9/mo for unlimited
- **ConvertKit** — free up to 1,000 subscribers, more creator-focused than Mailchimp
- **MailerLite** — free up to 1,000 subscribers, similar to Mailchimp
- **Resend Audiences** — developer-friendly, free tier

For each, just grab their embed action URL and follow the same swap pattern.
