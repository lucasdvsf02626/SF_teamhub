# Tasks

State as of the 25 Aug 2026 review. Ordered by what blocks a safe deploy.

Anything marked **You** needs a person — access, a decision, or a machine this
session cannot reach.

---

## P0 — do before deploying

### 1. Check `postcss.config.js` in the Lovable editor — **You**

The malicious payload was removed here (PR #2), but Lovable commits straight into
this repository. If the same file is infected on Lovable's side, the next sync puts
it back and the fix is undone.

Open the file in the Lovable editor. A clean one is six lines and about 81 bytes:

```js
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
```

If line 10 is thousands of characters long, it is still infected there.

- [ ] Checked in Lovable
- [ ] Clean, or cleaned

### 2. Rotate credentials — **You**

The payload read `process.env` on every machine that ran a build, and ran on every
build since the initial commit. Treat anything in the environment on those machines
as exposed.

- [ ] Supabase service-role key (**not** the anon key — that one is public by design)
- [ ] GitHub personal access tokens
- [ ] npm tokens
- [ ] Any API keys used by the 38 edge functions
- [ ] SSH keys on developer machines
- [ ] Any crypto wallet on those machines — the payload's whole purpose was crypto theft

### 3. Merge PR #2

Removes the payload from `main`. Do this *after* task 1, so a Lovable sync does not
immediately revert it.

- [ ] Merged

### 4. Confirm the app still works against live data — **You**

Nothing in this session could sign in — there are no test credentials, and this
container will not write to the production database. Everything below is unverified
and covers the core daily loop:

- [ ] Sign in as a normal staff member
- [ ] Clock in, then clock out — confirm both write
- [ ] Book a leave request
- [ ] Approve that request as a manager
- [ ] Log a sickness absence
- [ ] Confirm shifts display correctly

---

## P1 — this week

### 5. Decide on the duplicate route families

Both `/team` and `/app/team` exist, and the same for `/settings`, plus a top-level
set covering `/clock`, `/shifts`, `/time-off`. Two ways to reach the same features
means twice the bug surface and confused deep links.

- [ ] Decide which is canonical
- [ ] Redirect the other, rather than leaving both live

### 6. Review the 25 edge functions with `verify_jwt = false`

Not automatically wrong — webhook receivers legitimately need it and usually
authenticate by signature inside the function. But each carries its own auth, so each
needs checking. These stand out:

- [ ] `hive-mail-inbound` — inbound webhook, confirm signature verification
- [ ] `validate-qr-token` — gates clock-in, reachable unauthenticated
- [ ] `hivemail-smoke-impersonate` — impersonation in the name; confirm it cannot run in production
- [ ] `sync-to-hive` / `sync-from-hive` / `bulk-sync-*` — move data both ways
- [ ] `request-password-reset` / `confirm-password-reset` — confirm rate limiting

### 7. Third-party scripts and privacy

`index.html` loads PushAlert on every page and `src/index.css` imports Google Fonts,
both before any consent gate, both sending staff IP addresses to third parties. For
UK staff data this is a GDPR question, not just a performance one.

- [ ] Confirm PushAlert is actually in use — Capacitor push is configured separately, so this may be redundant
- [ ] Confirm the `/privacy` policy names both
- [ ] Consider self-hosting the two fonts — also removes a render-blocking request

### 8. Remaining dependency vulnerabilities

Down from 25 to 5. The rest need breaking major bumps, so they need testing:

- [ ] `vite` + `esbuild` — dev-server only, does not affect production users
- [ ] `react-router` / `react-router-dom` — major bump, test every route
- [ ] `xlsx` — no npm fix published; used by bulk import and reports. Either move to the SheetJS CDN build or replace it

---

## P2 — soon

### 9. Clear the lint backlog

70 errors, 67 of them `no-explicit-any`, concentrated in `src/pages/staff/`.
CI reports lint without failing; once this is clear, remove `continue-on-error`
from `.github/workflows/ci.yml`.

- [ ] `src/pages/staff/TimeOff.tsx` — 19 errors, the worst offender
- [ ] `src/pages/staff/Team.tsx` — 5
- [ ] `src/pages/staff/Sickness.tsx`, `Settings.tsx` — 2 each
- [ ] `tailwind.config.ts` — one `require()` import
- [ ] Then remove `continue-on-error`

### 10. Split the four largest pages

Hand-written files carrying most of the behaviour: `Auth.tsx` (859 lines),
`LeaveRequests.tsx` (774), `ManagerApprovals.tsx` (719), `ProfileSettings.tsx` (498).

- [ ] Pull data fetching into hooks — `src/hooks/` has only 9 files, so there is room

### 11. Add a service worker

The app has a manifest and icons but no service worker, so there is no offline
support and Android's install prompt will not fire. iOS "Add to Home Screen" works
without one.

For an attendance app, cache conservatively: never cache Supabase responses, or staff
will see stale clock-in state.

- [ ] Add `vite-plugin-pwa`, network-first for navigation
- [ ] Test that clock-in state is never served stale

### 12. Get edge function source into version control

38 functions run in production with their code outside version control. It cannot be
reviewed, diffed, or restored from here. Deliberate, per `supabase/README.md` — but
worth revisiting, since it is a single point of failure.

- [ ] Decide whether to vendor the source into a separate repository

### 13. Add tests

There is no test framework at all — no runner, no test files. For an app that
calculates pay and statutory leave, the reconciliation and Bradford-score logic
deserve coverage first.

- [ ] Add Vitest
- [ ] Cover attendance reconciliation and leave-balance maths
- [ ] Add to the CI job

---

## Done

- [x] Removed the obfuscated payload from `postcss.config.js` (PR #2)
- [x] Added CI — typecheck, lint, build on every push and PR
- [x] Added `npm run scan:supply-chain`, verified it catches the original payload
- [x] Patched dependencies: 25 vulnerabilities down to 5, critical resolved
- [x] Documented the Supabase project-ref guardrail and the unused env vars inline
- [x] Added `npm run map` and published a visual codebase map
- [x] Browser-tested 16 routes at iPhone viewport — auth guard holds on all 7
      protected routes, no JS errors, no horizontal overflow
