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

### 7b. "Trust this device for 30 days" defaults to ON — decide before launch

`src/pages/Auth.tsx:64` sets `useState(true)`, so the box is ticked before anyone
touches it. Verified in a browser.

On a personal phone that is good UX. But the app's own description says staff
"sign in/out via **tablet kiosk** or mobile app" — and on a shared kiosk this leaves
a 30-day trusted session behind for whoever signs in next.

This is a product decision, not a bug, so it has been left alone. The options:

- [ ] Default it off, and let people opt in
- [ ] Keep it on for personal devices, force it off in kiosk mode
- [ ] Leave as-is, if the kiosk is not actually a sign-in surface

### 7c. Remaining small tap targets

Measured at iPhone 13 width. The show-password toggle was 16x16 and has been fixed
to 40x40 (the icon did not move). What is left is minor but worth a pass:

- [ ] "Trust this device" row is 342x20 — the label forwards taps correctly, so
      width is fine, but 20px height is under the 24px WCAG 2.2 minimum
- [ ] Email and password inputs are 40px tall, just under the 44px iOS guideline
- [ ] "Forgot password?", "Desktop view" and the footer links sit at 14-20px tall

### 8. Remaining dependency vulnerabilities

Down from 25 to 5. The rest need breaking major bumps, so they need testing:

- [ ] `vite` + `esbuild` — dev-server only, does not affect production users
- [ ] `react-router` / `react-router-dom` — major bump, test every route
- [ ] `xlsx` — no npm fix published; used by bulk import and reports. Either move to the SheetJS CDN build or replace it

---

## P2 — soon

### 9. Clear the lint backlog

Down from 70 errors to 54. `src/pages/staff/TimeOff.tsx` went from 19 to 2 and is
the worked example — the same shape fixes most of the rest.

The pattern:

1. Declare an interface for the row the page actually uses, rather than leaning on
   the generated Supabase types (which lag the `day_part` migration).
2. Annotate the `queryFn` return type. Every `.filter`/`.map`/`.reduce` callback
   below it then infers, and its `: any` can simply be deleted.
3. For array literals with optional fields, declare the interface explicitly —
   otherwise TypeScript infers a union and the optional fields are unreachable,
   which is what forced the `(b as any)` casts.

These are type-only edits, erased at compile time, so a passing `tsc --noEmit`
means runtime behaviour is provably unchanged. That makes this safe to do without
exercising the signed-in paths — which is why it was done here and the rest was
not: each remaining file needs its own row shape decided.

Remaining, roughly 1-5 errors each:

- [ ] `src/pages/` — `LeaveRequests`, `ManagerApprovals`, `ManagerTeam`,
      `TeamDirectory`, `TeamCalendar`, `ProfileCompletion`
- [ ] `src/pages/staff/` — `Clock`, `Dashboard`, `Documents`, `Settings`,
      `Sickness`, `Team`
- [ ] `src/lib/supabase-helpers.ts`, `src/integrations/supabase/hive.ts`,
      `src/hooks/useMyShifts.ts`, `src/contexts/ClockContext.tsx`
- [ ] `tailwind.config.ts` — one `require()` import
- [ ] Then remove `continue-on-error` from `.github/workflows/ci.yml`

Two `as any` casts in `TimeOff.tsx` were left in place deliberately: they are on
Supabase insert/update calls and exist because the generated types lag the
migration. Both already carry a comment saying so.

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

### 13. Extend test coverage

Vitest is now set up with 57 tests over the leave-day, geofencing and
service-tier maths — the calculations that decide what staff are actually owed.
`npm test` runs them, and CI runs them on every push.

Still uncovered:

- [ ] `leave-year-helpers.ts` — leave year boundaries
- [ ] `sickness-pattern-helpers.ts` — Bradford factor scoring
- [ ] `uk-bank-holidays.ts` — the display list, which must agree with the fixture in `leaveDays.ts`
- [ ] Component tests — would need jsdom and `@testing-library/react`, neither installed
- [ ] The 38 edge functions — untestable from here, their source is not in this repo

### 14. Two small things found while writing tests

- [ ] `service-tier-helpers.ts` — `calculateProRataAllowance` declares `const today`
      and never uses it. Harmless dead code; removing it makes the function
      visibly pure.
- [ ] `service-tier-helpers.ts` — the comment on the final tier says "10+ years"
      but `min_years` is 15. The code is right, the comment is stale.

### 15. The bank holiday fixture expires in 2030

`leaveDays.ts` hardcodes England & Wales bank holidays for 2024-2030. After that
every date counts as a working day, so leave would be over-charged silently.
There is a test that pins this, but it is a reminder, not a fix.

- [ ] Extend the list before 2030, or source the dates from `gov.uk`'s bank holiday API
- [ ] Keep it in sync with the copy in `hive-vault-guard/src/lib/leaveDays.ts` —
      the two apps share the Hive database and must agree on the count

---

## Done

- [x] Removed the obfuscated payload from `postcss.config.js` (PR #2)
- [x] Added CI — typecheck, lint, build on every push and PR
- [x] Added `npm run scan:supply-chain`, verified it catches the original payload
- [x] Patched dependencies: 25 vulnerabilities down to 5, critical resolved
- [x] Documented the Supabase project-ref guardrail and the unused env vars inline
- [x] Added `npm run map` and published a visual codebase map
- [x] Fixed the show-password tap target: 16x16 to 40x40, icon position unchanged
- [x] Added Vitest with 57 tests over leave-day, geofence and service-tier maths
- [x] Browser-tested 16 routes at iPhone viewport — auth guard holds on all 7
      protected routes, no JS errors, no horizontal overflow
