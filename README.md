# SF:Team Hub

Internal staff attendance and presence tracking for Supplement Factory. Staff clock
in and out, book leave, log sickness and view shifts; managers approve requests and
see who is on site today.

**Live app:** https://sfteam-hub-spark.lovable.app
**Lovable project:** https://lovable.dev/projects/82067e2b-a6cb-4c1c-939f-0b87cf500fee
**App ID:** `com.supplementfactory.teamhub`

---

## Read this first

Two things about this repository are unusual and are easy to "fix" into an outage.

**1. The database ref in `supabase/config.toml` is deliberately wrong.**
It names the retired project `tiornvtwymjhsrrpbwvr`. The app actually runs on the
Hive database `zbltbvizmlvotayjjcum`, pinned in `src/integrations/supabase/client.ts`.
Pointing the config at the retired project is a guardrail — it stops a careless
`supabase db push` or `functions deploy` from this repo landing on live data. Do not
change it. See `supabase/README.md`.

**2. Edge function source is not in this repository.**
`supabase/config.toml` declares 38 functions; `supabase/functions/` does not exist.
That code is deployed and maintained outside version control. The declarations are
an inventory of what runs in production, not something you can deploy from here.

---

## Stack

| Layer | Choice |
|---|---|
| UI | React 18, Vite, TypeScript, Tailwind, shadcn/ui |
| Data | Supabase (Postgres, Auth, Edge Functions) |
| Mobile | Capacitor 8 — iOS project present, Android not yet added |
| Distribution | PWA today; native builds not yet shipped |

Roughly 21,000 lines across 140 source files: 31 pages, 73 components, 30 routes,
51 database tables, 74 migrations.

## Getting started

Requires Node.js 22.

```sh
npm ci
npm run dev          # http://localhost:8080
```

No `.env` is needed. The Supabase URL and publishable key are pinned in
`src/integrations/supabase/client.ts` — the variables in `.env.example` are read by
nothing. That pinning is intentional; see the file's comment for the history.

### Commands

| Command | What it does |
|---|---|
| `npm run dev` | Dev server with hot reload |
| `npm run build` | Production build to `dist/` |
| `npm run preview` | Serve the built `dist/` locally |
| `npm run lint` | ESLint |
| `npm run scan:supply-chain` | Check build-time files for tampering (see below) |
| `npm run map` | Regenerate `codebase-map.json` — a summary of the whole codebase |

`npm run map` is worth knowing about: it extracts routes, tables, function inventory
and file sizes into one JSON file, so you can see the shape of the project without
reading through it.

## Supply-chain scanning

`npm run scan:supply-chain` exists because a 31,000-character obfuscated payload was
found appended to `postcss.config.js`. It executed on every build, resolved a
command-and-control host from Ethereum transaction data, and fetched a second stage.

The scan flags over-long lines, obfuscator-style mangled identifiers, and blockchain
RPC references in build-time files. It runs in CI ahead of the build, so a tampered
config is caught before any project code executes.

This matters because Lovable commits directly to this repository. A payload removed
here can be reintroduced by a sync, outside of review.

## Architecture

**Routes** split into public (9) and guarded (21). Everything guarded renders inside
`<Protected>`, which redirects to `/auth` — verified by browser test across all
protected routes.

Note that two route families overlap: `/app/*` and a bare top-level set, so both
`/team` and `/app/team` exist. Confirm which is canonical before adding more.

**Database tables** group by prefix:

| Prefix | Count | Covers |
|---|---|---|
| `teamhub_` | 21 | Attendance, shifts, leave, pay periods, timesheets |
| *(core)* | 18 | Profiles, notifications, QR tokens, certifications, sync |
| `hivemail_` | 6 | Messaging bridge |
| `email_` | 6 | Templates, broadcasts, delivery state |

**Hive integration.** A family of `sync-*` edge functions moves data between Team Hub
and the Hive system in both directions, some on a schedule.

## Deployment

Lovable deploys on push to `main` and syncs changes back into this repository. That
two-way sync is why `.env` rewrites and reintroduced files are a recurring concern.

For getting the app onto a phone, and the full pre-deploy checklist, see
[`LAUNCH-LIST.md`](./LAUNCH-LIST.md). For outstanding work, see
[`TASKS.md`](./TASKS.md).

## Third-party services

- **Supabase** — database, auth, edge functions
- **PushAlert** (`cdn.pushalert.co`) — web push, loaded in `index.html` on every page
- **Google Fonts** — Outfit and Geist, imported at the top of `src/index.css`

Both PushAlert and Google Fonts load before any consent gate and send visitor IP
addresses to third parties. Worth a look against the privacy policy at `/privacy`.
