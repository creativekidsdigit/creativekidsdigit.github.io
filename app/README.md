# AI Copywriting OS

A production-ready AI copywriting operating system for digital product creators.
Generates SEO-optimized sales copy, Pinterest content, blog posts, emails,
social media posts, sales funnels, and more — all driven from a single
product entry.

Deployed alongside the main site at **`https://creativekidsdigit.github.io/app/`**.

---

## Highlights

- **Provider-agnostic AI layer** — OpenAI, Anthropic, Google Gemini, OpenRouter,
  and local Ollama models. Adding a new provider is one file in
  `src/lib/ai/providers/`.
- **Products as source of truth** — one product entry feeds every generator,
  so copy stays consistent across Payhip, Pinterest, SEO, blog, email, and
  social.
- **50+ built-in prompt templates** spanning copy, Pinterest, SEO, blog, email,
  social, and sales funnel categories. All editable, versioned, favoritable.
- **Content Library** — every generation is saved to IndexedDB. Searchable,
  taggable, pinnable, exportable.
- **Analytics** — live charts of output by day, kind, top products, top prompts,
  launch history.
- **Local-first** — all data lives in your browser. No backend, no per-seat
  fees, no data leaves your machine except API calls you initiate.
- **Dark / light / system** theme, ⌘K product search, ⌘↵ to generate,
  autosave on product edits, undo/redo on every generation.

## Navigation

Dashboard · Products · Copy Generator · Pinterest · SEO · Email Marketing ·
Blog Generator · Social Media · Sales Funnels · Prompt Library ·
Content Library · Analytics · Settings.

## Tech

- Vite + React 18 + TypeScript
- TailwindCSS
- Zustand state with IndexedDB persistence (`idb-keyval`)
- React Router 6
- Recharts for analytics
- Lucide icons

## Architecture

```
app/
├── src/
│   ├── types/                 # Domain types (Product, ContentItem, PromptTemplate, ...)
│   ├── lib/
│   │   ├── ai/                # Provider abstraction. Add a new provider here.
│   │   │   ├── index.ts       # ai.generate() — only entry point modules call
│   │   │   ├── types.ts       # ProviderAdapter interface
│   │   │   └── providers/     # One file per provider
│   │   ├── storage.ts         # idb-keyval wrapper
│   │   ├── defaults.ts        # Default settings + built-in prompt templates
│   │   ├── template.ts        # {{path}} interpolator
│   │   └── util.ts            # copy, download, slug, format helpers
│   ├── store/useAppStore.ts   # Single Zustand store, full CRUD for all entities
│   ├── components/            # Shell, Sidebar, Topbar, Modal, Toast,
│   │                          # GeneratorWorkbench (the reusable generator core)
│   │                          # ProductForm, ui primitives
│   └── pages/                 # One file per route
```

### Adding a new AI provider

1. Create `src/lib/ai/providers/myprovider.ts` exporting a default
   `ProviderAdapter`.
2. Register it in `src/lib/ai/index.ts` `REGISTRY`.
3. Add a default config in `src/lib/defaults.ts` under `providers`.
4. Add the new `ProviderId` literal in `src/types/index.ts`.

That's it — Settings UI and the generator workbench pick it up automatically.

### Adding a new generator module

Most modules are 8 lines:

```tsx
import GeneratorWorkbench from "@/components/GeneratorWorkbench";
export default function FooPage() {
  return <GeneratorWorkbench kind="foo" title="Foo" description="..." />;
}
```

Then add templates with `category: "foo"` in `lib/defaults.ts` (or via the
Prompt Library UI at runtime).

## Local development

```bash
cd app
npm install
npm run dev      # http://localhost:5173/app/
npm run build    # production build into app/dist/
```

## Deployment

A GitHub Actions workflow at `.github/workflows/deploy.yml` builds the app
on every push to `main` and deploys it to GitHub Pages alongside the existing
static site. The app is mounted at `/app/`.

**One-time repo setting required:** in repo settings → Pages → "Build and
deployment", set **Source** to **GitHub Actions** (instead of "Deploy from a
branch"). After that, every push to `main` will deploy automatically.

## Data & privacy

- All product data, generated content, prompts, and settings live in your
  browser's IndexedDB.
- API keys are stored locally and sent **only** to the AI provider you've
  selected. They never touch any other server.
- Backups: Settings → Data → Export. Exports redact API keys.

## Future roadmap

The architecture is designed to host these without rewrites:

- Product research module (new generator kind)
- Competitor analysis (new templates + a fetcher)
- Pinterest scheduler (a new background worker layer)
- AI image generation (a new provider type — image adapters)
- Sales analytics from Payhip/Shopify (new module + integration layer)
- Customer CRM / affiliate management (new entity in the store)
- Workflow automation (chains of generators saved as recipes)
