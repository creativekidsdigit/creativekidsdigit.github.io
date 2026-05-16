# Deployment — GitHub Pages

The site is set up to deploy automatically to **GitHub Pages** on every push
to `main`. No build step needed — the static files are served as-is.

## One-time setup (do this once after the first merge to main)

1. Open the repo on GitHub
2. **Settings → Pages**
3. Under **Source**, select **"GitHub Actions"**
4. The next push to `main` (or merging this PR) triggers the workflow

After ~1 minute the site is live at:

> **https://creativekidsdigit.github.io/digital---product-store/**

You can watch deploys in the **Actions** tab.

## How it works

The workflow at `.github/workflows/deploy.yml`:

1. Triggers on every push to `main` (or manually from the Actions tab)
2. Uploads the entire repo root as a Pages artifact
3. Deploys it to `github-pages` environment
4. The site goes live at the URL above

## Custom domain (later, when you're ready)

If you buy a domain (e.g. `fearlesscreations.com`):

1. **Settings → Pages → Custom domain** → enter your domain
2. GitHub will give you DNS records to add at your registrar
3. Add a `CNAME` file at the repo root containing just your domain name
4. Wait for DNS to propagate (a few minutes to a few hours)

When you do this, also update the canonical URL and Open Graph URL in
`index.html` from `creativekidsdigit.github.io/...` to your custom domain.

## Updating the site

Just merge any PR to `main` and GitHub Pages re-deploys automatically.
Local edits → push → live in ~1 minute.

## What's *not* in this workflow

- No build step (no Vite, webpack, etc.) — the site is plain HTML/CSS/JS
- No tests — add a step here later if you want HTML/CSS linting
- No image optimization — we use CSS-only mockups today; if you add real
  images later, consider adding [`image-actions`](https://github.com/marketplace/actions/image-actions) or just compress before commit
