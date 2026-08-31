# SF:Team Hub — mobile (React Native / Expo)

The native iOS and Android app. Shares its business logic with the web app
through `@sf/core`; everything else is written for React Native.

**Status: scaffold with a working vertical slice.** Sign-in, session
persistence and navigation work end to end against Supabase. The 30 staff and
manager screens are not built yet — see *What's left* below.

---

## Running it

```sh
cd apps/mobile
npm install          # installs independently of the web app, see "Why not a workspace"
npx expo start
```

Then press `i` for an iOS simulator (needs macOS with Xcode), `a` for Android
(needs Android Studio), or scan the QR code with Expo Go on a real phone.

`npm run typecheck` runs `tsc --noEmit`, which does check the shared package
too.

## How this is put together

| Concern | Choice | Why |
|---|---|---|
| Framework | Expo SDK 52 | Managed builds, no Xcode needed for day-to-day work |
| Styling | NativeWind 4 | Tailwind class names in RN, so the web app's palette carries over |
| Navigation | React Navigation 7 | `react-router-dom` is web-only |
| Storage | AsyncStorage | `localStorage` does not exist in RN |
| Shared logic | `@sf/core` | One implementation of the leave and pay maths |

### What is shared, and what is not

`packages/core` holds pure TypeScript — leave-day counting, geofencing,
service tiers, bank holidays. No DOM, no storage, no network client. Both apps
import it, so a staff member gets the same answer whichever they open, and the
57 tests cover both at once.

Everything else is rewritten. `react-dom`, shadcn/ui, Radix and
`react-router-dom` have no React Native equivalent — screens and components
are built fresh against RN primitives.

The rule that keeps this honest: **if a module needs `window`, AsyncStorage or
a network client, it does not belong in `packages/core`.** Put the platform
part in the app and keep the calculation shared.

### Why not a workspace

`apps/mobile` is deliberately *not* in the root `workspaces` array, and
depends on core via `file:../../packages/core`.

Root CI runs `npm ci` for the web build. Adding this app to the workspace
would pull the whole React Native toolchain — around 1,000 packages — into
every web CI run for no benefit. Keeping them separate means the mobile app
can move at its own pace without slowing or breaking the app that currently
ships.

Metro is configured for this in `metro.config.js`: `watchFolders` reaches up
to the repo root so `@sf/core` resolves, and `disableHierarchicalLookup`
prevents React being resolved twice.

## The three things that break a Supabase RN client

All handled in `src/lib/supabase.ts`, and each fails in a way that looks like a
backend problem rather than a client one:

1. **`storage: AsyncStorage`** — without it the session is memory-only and
   every member of staff is signed out each time the app closes.
2. **`detectSessionInUrl: false`** — there is no URL bar to read a session
   back from.
3. **`import 'react-native-url-polyfill/auto'` first** — supabase-js builds
   URLs internally and RN's implementation is incomplete.

## Security

The publishable key is in `src/lib/supabase.ts` and **ships inside every
installed binary**. Anyone can extract it. That is by design — but it means
**RLS is the only thing protecting staff data**, and it matters more here than
on web because the attacker has the binary in hand.

No screen should be merged against a table with row security off. The check:

```sql
select c.relname, c.relrowsecurity as rls_enabled, count(p.polname) as policies
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
left join pg_policy p on p.polrelid = c.oid
where n.nspname = 'public' and c.relkind = 'r'
group by 1, 2 order by rls_enabled, 1;
```

Any row with `rls_enabled = false` is exposed. Any row with RLS on and zero
policies denies everyone and breaks the app silently.

## What's left

The scaffold proves the architecture. The screens are the remaining work,
roughly 8,600 lines of web UI to re-express in RN:

- [ ] Clock in / out — needs `expo-location` for the geofence, `expo-camera` for QR
- [ ] Shifts, Time off, Sickness
- [ ] Team directory and calendar
- [ ] Manager approvals and today view
- [ ] Profile and settings
- [ ] Push notifications (`expo-notifications`)
- [ ] Deep links for password reset — the `sfteamhub` scheme is registered in
      `app.json` but nothing handles the callback yet

Native-only features the PWA cannot do — barcode scanning, background
geolocation, real push — are the reason this app exists, so they are worth
doing early rather than last.
