# Lorenzo Pulcini portfolio

A dependency-light, server-rendered portfolio with a GitHub-authenticated admin area. Public content is readable without JavaScript. Content edits are validated on the server and persisted to one mounted JSON file using atomic replacement.

## Security model

- `/admin` requires GitHub OAuth and a server-side allowlist. A successful GitHub login alone does **not** grant admin access.
- Prefer `GITHUB_ALLOWED_IDS` (immutable numeric GitHub account IDs) over usernames. You can set both.
- OAuth requests use signed, 10-minute state cookies. Admin sessions are signed, `HttpOnly`, `SameSite=Lax`, and last eight hours by default.
- Every content change requires a session-bound CSRF token and an exact same-origin `Origin` header.
- Stored content is rendered as escaped text; the admin cannot inject arbitrary HTML or scripts.
- Responses include a restrictive Content Security Policy, clickjacking protection, MIME sniffing protection, a permissions policy, and HSTS in production.
- The production container runs as an unprivileged user with a read-only filesystem, all Linux capabilities dropped, and only `/data` writable.

The in-process rate limiter is deliberately simple. If this is deployed across multiple replicas or exposed to high traffic, enforce rate limits at the reverse proxy or edge as well.

## Article code blocks and backups

The article editor supports a standard article plus an optional HTML, CSS, and JavaScript block. Choose whether that block appears before the article, after a specific paragraph, at the end, or as the complete article page. Custom code runs in a sandboxed iframe: it cannot read the admin, submit forms, or use network APIs. Keep third-party libraries bundled into the code block rather than loading them from a CDN. A validated JSON field is exposed to custom code as `window.__ARTICLE_DATA__`, which is useful for charts and visualizations.

Upload PNG, JPEG, GIF, or WebP images from the article editor (8 MB per file). Use the displayed `[[image:IMAGE_ID]]` marker on its own line in a standard article body, or `/media/IMAGE_ID` from the article’s custom HTML. You can also select any uploaded image or GIF as the visual header for an article’s homepage card. You can also attach PDFs (20 MB each) with a download label; readers receive them as file downloads from the article page. Image and PDF bytes are stored in the Docker data volume.

Use **Download backup** in Admin → Site settings to export all content, image/PDF metadata, custom code, and graph JSON as JSON. **Restore backup** validates the file, requires an explicit confirmation, and replaces the complete current data set; only restore files you trust. The JSON export does not include image or PDF bytes, so back up the Docker `website-data` volume as well when uploaded files matter.

## GitHub OAuth setup

1. Open GitHub **Settings → Developer settings → OAuth Apps → New OAuth App**.
2. Use your public HTTPS site URL as the homepage URL.
3. Set the callback URL to `https://your-domain.example/auth/github/callback`.
4. Copy `.env.example` to `.env` and fill in `APP_ORIGIN`, `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`, `GITHUB_ALLOWED_IDS` or `GITHUB_ALLOWED_USERS`, and `SESSION_SECRET`.
5. Generate a session secret with `openssl rand -base64 48`.

Never commit `.env`. Rotate the GitHub client secret and session secret if either is exposed. Rotating `SESSION_SECRET` signs every administrator out.

## Run locally

Node.js 22 or later is required.

```sh
cp .env.example .env
# Fill in .env, then export it in your shell or use your preferred env loader.
set -a; . ./.env; set +a
npm start
```

Open `http://localhost:3000`. For a local OAuth app, use `http://localhost:3000/auth/github/callback` as the callback URL. Secure cookies are enabled automatically when `NODE_ENV=production`; use development mode for direct local HTTP.

## Deploy with Docker Compose

Terminate TLS at a reverse proxy or hosting platform and forward traffic to the loopback-only port exposed by Compose. `APP_ORIGIN` must exactly match the public HTTPS origin.

```sh
cp .env.example .env
# Fill in production values in .env.
docker compose up --build -d
docker compose ps
```

The named volume `website-data` contains `/data/content.json`. Back up that volume before infrastructure changes. The health endpoint is `/healthz`.

To run the image without Compose:

```sh
docker build -t lorenzo-portfolio .
docker run --read-only --cap-drop=ALL --security-opt=no-new-privileges \
  --env-file .env -p 127.0.0.1:3000:3000 \
  -v lorenzo-portfolio-data:/data lorenzo-portfolio
```

## Validate

```sh
npm run check
docker compose config
```

The original `.dc.html` prototype files remain in the repository as reference material; the deployable application entrypoint is `server.mjs`.
