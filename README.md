# pstbin

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)

Client-side pastebin inspired by [ix.io](https://ix.io).

**Reference instance:** [https://paste.aaqa.dev](https://paste.aaqa.dev)  
**Source:** [github.com/aaqaishtyaq/pstbin](https://github.com/aaqaishtyaq/pstbin)

The homepage is a man page. Paste data lives in the **URL fragment**. Nothing is stored in a database.

`curl` works via a **stateless** encoder — it compresses the body and returns a self-contained URL. That is not storage.

```bash
$ echo hello | curl -sF 'paste=<-' https://paste.aaqa.dev/
https://paste.aaqa.dev/#v1/z/…
```

## Features

- Man-page homepage (monospace, almost no CSS)
- Browser create/view (`#new`, `#v1/…`)
- `curl -F 'paste=<-'` to `/` or `/api` → plain-text URL
- Offline CLI helper `./pstbin` (raw base64url, no network)
- **No DB, no KV, no Blob**
- Configurable branding for forks (env vars — see [Configuration](#configuration))

## URL format

| Fragment            | Meaning                      |
| ------------------- | ---------------------------- |
| `#`                 | man page                     |
| `#new`              | create form                  |
| `#v1/r/<base64url>` | raw UTF-8                    |
| `#v1/z/<base64url>` | deflate-raw compressed UTF-8 |

## Usage

### curl (ix.io-style)

```bash
echo "hello world" | curl -sF 'paste=<-' https://paste.aaqa.dev/
cat notes.txt | curl -sF 'paste=<-' https://paste.aaqa.dev/api
curl -s --data-binary @notes.txt https://paste.aaqa.dev/api
```

Form fields accepted: `paste`, `f:1` (ix.io habit), `file`, `content`, `text`, `c`.

### Browser

Open the site → **[new paste]** → create → copy URL.

### Offline helper

```bash
chmod +x ./pstbin
./pstbin notes.txt
# or point at your own host:
PSTBIN_BASE=https://paste.example.com ./pstbin notes.txt
```

## Limits

- **URL length** — browsers/apps often cap tens of KiB; huge pastes will break
- **Request body** — platform function body limit applies to curl uploads
- **Not secret** — anyone with the link can read it
- **No expiry / edit / delete** — the URL _is_ the paste

## Configuration

Copy [`.env.example`](./.env.example) to `.env.local` (or set the same keys in your host’s dashboard).

| Variable                       | Default                  | Purpose                            |
| ------------------------------ | ------------------------ | ---------------------------------- |
| `NEXT_PUBLIC_SITE_NAME`        | `pstbin`                 | Short name in man page / CLI       |
| `NEXT_PUBLIC_SITE_NAME_UPPER`  | uppercased name          | Man-page banner                    |
| `NEXT_PUBLIC_SITE_TITLE`       | `pstbin(1)`              | HTML `<title>`                     |
| `NEXT_PUBLIC_SITE_DESCRIPTION` | (see example)            | Meta description                   |
| `NEXT_PUBLIC_SITE_TAGLINE`     | `client-side pastebin…`  | NAME section line                  |
| `NEXT_PUBLIC_REPO_URL`         | this repo                | SEE ALSO / docs link               |
| `NEXT_PUBLIC_CANONICAL_URL`    | `https://paste.aaqa.dev` | Canonical public origin            |
| `PSTBIN_PUBLIC_URL`            | _(unset)_                | Force origin in curl API responses |
| `PSTBIN_MAX_PASTE_BYTES`       | `1500000`                | Max POST body size                 |
| `PSTBIN_BASE`                  | `https://paste.aaqa.dev` | CLI helper default origin          |

`NEXT_PUBLIC_*` values are baked in at **build** time. Rebuild after changing them.

Fork checklist:

1. Set branding env vars to your name/domain/repo.
2. Deploy (below).
3. Point DNS at the host.
4. Optionally set `PSTBIN_PUBLIC_URL` if the API would otherwise print the wrong host.

## Self-hosting

**Requirements for full curl support:** a host that can run a **Node.js serverless/server** route (`POST /api`).  
Pure static hosts (GitHub Pages, plain Netlify static, S3) can still serve the **browser** UI if you export static assets, but **`curl` POST needs a function**.

### Vercel (recommended)

1. Fork or clone [aaqaishtyaq/pstbin](https://github.com/aaqaishtyaq/pstbin).
2. Import the repo at [vercel.com/new](https://vercel.com/new).
3. Set env vars from [`.env.example`](./.env.example) if you rebrand.
4. Deploy. Add a custom domain (e.g. `paste.example.com`).

```bash
npx vercel
```

Hobby free tier is enough for personal use (no storage products).

### Netlify

Next.js on Netlify via the official adapter:

1. Connect the Git repo in Netlify.
2. Build command: `npm run build`
3. Install `@netlify/plugin-nextjs` (or use Netlify’s Next runtime) — see [Netlify Next.js docs](https://docs.netlify.com/frameworks/next-js/overview/).
4. Set the same env vars; add your domain.

`POST /` rewrite is handled by Next `proxy`; ensure the Netlify Next runtime is enabled so API routes and proxy rewrites work.

### Node server (VPS, Docker, Fly, Railway, Render, …)

```bash
npm ci
npm run build
npm run start
# listens on PORT (default 3000). Local dev uses 6002: npm run dev
```

Example Docker-style:

```dockerfile
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:22-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Optional branding at build time:
# ARG NEXT_PUBLIC_CANONICAL_URL
# ENV NEXT_PUBLIC_CANONICAL_URL=$NEXT_PUBLIC_CANONICAL_URL
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
COPY --from=build /app/.next ./.next
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/public ./public
EXPOSE 3000
CMD ["npm", "run", "start"]
```

> There is no `public/` folder required; create an empty one if your packager expects it.

Set `PSTBIN_PUBLIC_URL=https://your.domain` if the process sees an internal hostname.

### Cloudflare Pages / Workers

Possible with OpenNext / Cloudflare’s Next adapter, but more moving parts than Vercel. Prefer Vercel/Netlify/Node if you want curl with minimal config.

### Static-only (browser only, no curl)

If you only need the hash-based UI without POST:

1. You would need a static export path (not the default full Next app).
2. Users create pastes in the browser or with `./pstbin` offline.
3. **No** `curl -F` endpoint.

For most self-hosters who want ix.io-like curl, use **Vercel, Netlify, or Node**.

## Local development

```bash
npm install
cp .env.example .env.local   # optional
npm run dev
# http://localhost:6002

echo hi | curl -sF 'paste=<-' http://localhost:6002/
```

```bash
npm run build && npm run start
```

## Stack

- Next.js (App Router)
- `POST /` → proxy rewrite → `POST /api` (Node, zlib)
- Client viewer: `CompressionStream` / `DecompressionStream`
- No database

## License

This project is licensed under the **MIT License** — see [LICENSE](./LICENSE).

You may use, modify, and redistribute freely, including commercial use, provided you keep the copyright and license notice.

## Contributing

Issues and PRs welcome at [github.com/aaqaishtyaq/pstbin](https://github.com/aaqaishtyaq/pstbin).
