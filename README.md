# Lorenzo Pulcini portfolio

A SvelteKit portfolio and GitHub-authenticated publishing studio. Public pages are server-rendered, while the article workspace uses Tiptap for structured writing, equations, configurable image layouts, uploaded media, and inline interactive figures.

Public article URLs are generated from their titles, using lowercase words separated by hyphens. Internal IDs remain stable so renaming an article does not disturb its figures or attachments; old ID-based URLs redirect to the current title URL.

## Publishing studio

Open `/admin` with an authorized GitHub account. The article workspace supports:

- headings, lists, quotes, links, code blocks, rules, and undo/redo;
- KaTeX inline expressions with `\(S\)` and display equations with `\[ E = mc^2 \]`, including typed and pasted delimiters;
- uploaded PNG, JPEG, GIF, and WebP images;
- PDF attachments;
- interactive figure blocks that can be placed anywhere in the article;
- built-in bar chart, scatter plot, and simulation starters;
- per-figure HTML, CSS, JavaScript, and JSON data;
- contained, wide, and full-bleed figure layouts with live sandboxed previews.

Interactive figure code runs in a sandboxed iframe with no network access. Its validated JSON is exposed as `window.__ARTICLE_DATA__`. Figure metadata and code are included in JSON backups; uploaded image and PDF bytes remain in the data volume.

## Local development

Node.js 22 or later is required.

```sh
npm install
cp .env.example .env
# Fill in the GitHub OAuth and session values, then load the environment.
set -a; . ./.env; set +a
npm run dev
```

Open `http://localhost:5173` for Vite development. Set the OAuth callback to `http://localhost:5173/auth/github/callback` while developing, and keep `APP_ORIGIN` aligned with that address.

For a production-style local run:

```sh
npm run build
PORT=3000 npm start
```

## Security model

- GitHub OAuth is paired with a server-side allowlist; GitHub login alone does not grant access.
- Prefer immutable numeric `GITHUB_ALLOWED_IDS` over usernames.
- Sessions and OAuth state are signed, short-lived, `HttpOnly`, and `SameSite=Lax`.
- SvelteKit origin checks and a session-bound CSRF token protect every admin mutation.
- Rich-text documents, links, media references, equations, figure references, code sizes, and JSON data are validated on the server.
- Uploaded files are verified by signature; SVG uploads are not accepted.
- Author code is isolated from the parent site in a script-only sandbox with a restrictive content security policy.
- Content is stored with atomic file replacement and restrictive permissions.

Generate `SESSION_SECRET` with `openssl rand -base64 48`. Production should always set `APP_ORIGIN`, both GitHub OAuth credentials, an allowed ID or username, and `SESSION_SECRET`. The production launcher maps `APP_ORIGIN` to SvelteKit's `ORIGIN`; if you run `build/index.js` directly, set both values to the exact public origin.

## Validation and deployment

Create the production environment file on the server itself (it is intentionally
excluded from Git), and set `APP_ORIGIN` to the exact public HTTPS origin:

```sh
cp .env.example .env
# Fill in .env, including the production GitHub OAuth app credentials.
chmod 600 .env
npm run check
docker compose config --quiet
docker compose up --build --force-recreate -d
```

The GitHub OAuth app callback URL must be exactly
`https://your-domain.example/auth/github/callback`. Compose loads `.env` into
the container and refuses to start when a required production setting is
missing. When running `npm start` directly instead of Docker, the production
launcher also loads `.env` automatically.

The production adapter is `@sveltejs/adapter-node`. The container runs as an unprivileged user with a read-only filesystem and `/data` as its only writable volume. Back up that volume when uploaded files matter. The health endpoint is `/healthz`.

## Project layout

- `src/routes` — SvelteKit pages, form actions, OAuth, media, and sandbox endpoints
- `src/lib/components/ArticleEditor.svelte` — Tiptap editor and interactive figure workbench
- `src/lib/server` — application initialization and validated content mutations
- `src/rich-text.mjs` — server-side Tiptap schema validation and safe rendering
- `src/store.mjs` and `src/media.mjs` — persistent content and uploaded files
- `public/styles.css` — public site and studio design system

The original `.dc.html` prototypes and the previous server-rendered modules remain as reference material; the deployable application is the SvelteKit build in `build/`.
