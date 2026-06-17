# Billionaire Paradise Valley

The alignment sanctuary of Sascha Gorokhoff — installable PWA with end-to-end password protection and cross-device sync via Cloudflare KV.

## Architecture

- **Frontend**: Single-file PWA (`public/index.html`) with service worker (`public/sw.js`)
- **Backend**: Cloudflare Pages Functions (`functions/api/`) running at the edge
- **Storage**: Cloudflare Workers KV namespace bound as `SOVEREIGN_KV`
- **Auth**: PBKDF2-SHA256 password hashing (250k iterations), session tokens with 1-year TTL

## File structure

```
billionaire-paradise-valley/
├── public/                      ← Static assets served directly
│   ├── index.html               ← The sanctuary (single-page app)
│   ├── sw.js                    ← Service worker for offline support
│   ├── manifest.webmanifest     ← PWA manifest
│   ├── icon-192.png             ← Home screen icon (Android)
│   ├── icon-512.png             ← Home screen icon (large)
│   ├── icon-apple-180.png       ← Home screen icon (iOS)
│   ├── icon-512.svg             ← Vector source for icons
│   └── favicon.png              ← Browser tab icon
├── functions/
│   └── api/
│       ├── _lib/crypto.js       ← Shared crypto utilities
│       ├── auth/setup.js        ← POST /api/auth/setup
│       ├── auth/login.js        ← POST /api/auth/login
│       ├── auth/status.js       ← GET  /api/auth/status
│       └── sync.js              ← GET/POST /api/sync
└── wrangler.toml                ← Cloudflare Pages config
```

## Deploy to Cloudflare Pages

### Prerequisites

```bash
npm install -g wrangler
wrangler login
```

### Step 1 — Create the KV namespace

```bash
wrangler kv:namespace create SOVEREIGN_KV
```

You'll see output like:
```
🌀 Creating namespace with title "billionaire-paradise-valley-SOVEREIGN_KV"
✨ Success!
Add the following to your configuration file:
[[kv_namespaces]]
binding = "SOVEREIGN_KV"
id = "abc123def456..."
```

**Copy the `id` value into `wrangler.toml`**, replacing `REPLACE_WITH_KV_NAMESPACE_ID`.

### Step 2 — Deploy

```bash
wrangler pages deploy public --project-name=billionaire-paradise-valley
```

The first deploy will give you a URL like `https://billionaire-paradise-valley.pages.dev`.

### Step 3 — Bind the KV namespace to the Pages project

This is the step most people miss. The KV namespace must be bound to the Pages project (not just declared in wrangler.toml). Do it via the dashboard:

1. Go to https://dash.cloudflare.com → Workers & Pages → your project
2. Settings → Bindings → Add → KV namespace
3. Variable name: `SOVEREIGN_KV`
4. KV namespace: pick the one you created in Step 1
5. Save and redeploy

### Step 4 — Custom domain (optional)

In the Cloudflare dashboard:
- Custom domains → Add → enter your domain (e.g. `paradise.saschagorokhoff.com`)
- Cloudflare will auto-configure the SSL certificate

### Step 5 — Install on your phone

Open the deployed URL on your iPhone or Android:
- **iOS**: Safari → Share → Add to Home Screen
- **Android**: Chrome → menu → Install app

The app will install as a real PWA with the Sonoran sunrise icon and run in fullscreen.

## How sync works

1. First open → setup screen → you create a password
2. Password is hashed with PBKDF2 (never stored in plaintext) on the server
3. Server returns a session token, stored in browser localStorage
4. Every change to your local data (gratitude, journal, treasury, vow, etc.) auto-pushes to KV (debounced 2s)
5. Every 5 minutes (when visible) the app pulls latest from KV to apply changes from other devices
6. On any device, log in with the same password → instant restoration of all data

## Security notes

- Passwords are never transmitted or stored in plaintext. PBKDF2-SHA256 with 250k iterations + 128-bit salt.
- Session tokens are 256-bit random, transmitted via Bearer header, validated against KV.
- KV records have a 1-year TTL, refreshed on each login.
- Failed login attempts include a small artificial delay to mitigate timing attacks.
- All API endpoints have CORS enabled for cross-origin requests if needed.

## Local development

```bash
wrangler pages dev public
```

Visit http://localhost:8788
