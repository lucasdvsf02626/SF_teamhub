# Launch list

Deploy-day checklist for SF:Team Hub. Work top to bottom — the gates come first
because shipping past them ships known-bad code.

---

## Gate 1 — security

Do not deploy until all four are true.

- [ ] `postcss.config.js` checked **in the Lovable editor**, not just on GitHub
      *(clean is ~81 bytes / 6 lines; infected has a line of 31,304 characters)*
- [ ] PR #2 merged, so `main` no longer carries the payload
- [ ] Credentials rotated — see `TASKS.md` task 2 for the full list
- [ ] `npm run scan:supply-chain` passes on the commit you are shipping

If the payload is present on Lovable's side, stop. Merging first and cleaning Lovable
second means the next sync silently reverts you.

## Gate 2 — build

- [ ] `npm ci` completes
- [ ] `npx tsc --noEmit -p tsconfig.app.json` passes
- [ ] `npm run build` succeeds
- [ ] `npm run preview` serves and the landing page renders

*Verified in this session at commit `b012caa`: typecheck clean, build 9.77s.*

## Gate 3 — the daily loop works against live data

Not verifiable from this session — no test credentials, and no writes to the
production database. **This is the biggest untested area before launch.**

Sign in as a real staff member and confirm:

- [ ] Sign in, then sign out
- [ ] Clock in — record appears in `teamhub_attendance_events`
- [ ] Clock out — pairs correctly with the clock-in
- [ ] Book leave — lands in `teamhub_leave_requests`
- [ ] Approve it as a manager
- [ ] Log sickness
- [ ] Shifts show the right pattern
- [ ] Team calendar and directory load

Then as a manager:

- [ ] `/manager/today` shows who is on site
- [ ] `/manager/approvals` lists pending requests and approving one sticks

## Gate 4 — permissions

The app has permission levels up to 5 (Architect). Confirm the boundary holds:

- [ ] A normal staff member cannot reach `/manager/*`
- [ ] A staff member cannot see another person's leave or sickness records
- [ ] Manager approval is limited to their own team

*Route-level guarding is verified: all 7 protected routes tested redirect to `/auth`
when signed out. Role-level separation between signed-in users is not tested — that
is a Supabase RLS question, so check it against the policies, not just the UI.*

---

## Getting it on a phone

### PWA — works today, no store, no Mac

The manifest, both icon sizes and a built `/install` page with a QR code and
per-device instructions are all present.

**iPhone:** open the live URL in **Safari** (Chrome on iOS cannot install) → Share →
Add to Home Screen. Launches standalone with no browser chrome.

**Android:** Chrome → menu → Install app. The automatic install banner will not
appear until a service worker exists (`TASKS.md` task 11), but manual install works.

- [ ] Installed on your own phone and signed in
- [ ] Send `/install` to staff — that page detects the device and shows the right steps

**Limitation worth knowing before you promise it to staff:** barcode scanning,
background geolocation and push notifications are Capacitor native plugins. They do
**not** work in the PWA. If clock-in depends on QR scanning or geofencing, the PWA
covers fewer people than it looks like it does. Confirm which clock-in methods
actually matter before rolling it out.

### Native iOS — not this week

Needs macOS with Xcode, a paid Apple Developer account (£79/year) and TestFlight
review. The Capacitor project exists at `ios/`, but no web assets have been synced
into it yet.

- [ ] `npx cap sync ios`
- [ ] Open `ios/App/App.xcworkspace` in Xcode
- [ ] Signing team and provisioning profile
- [ ] Archive → upload to TestFlight

### Native Android — not set up

`@capacitor/android` is installed, but there is no `android/` directory — the
platform was never added.

- [ ] `npx cap add android`
- [ ] `npm run build && npx cap sync android`
- [ ] Build a signed APK/AAB, keep the keystore somewhere safe

---

## After deploying

- [ ] Watch `client_error_logs` for the first hour — the app logs its own client errors
- [ ] Confirm the `sync-*` functions still move data to and from Hive
- [ ] Confirm scheduled functions fired (`scheduled-sync-from-hive`,
      `check-certification-expiry`, `generate-attendance-summaries`)
- [ ] Spot-check that attendance reconciliation produced sensible numbers

## Rollback

Lovable deploys on push to `main`, so rolling back means reverting the commit and
letting it redeploy.

- [ ] Know which commit was last good before you ship — record it here: `________`
- [ ] Remember migrations do not roll back with the code. If a deploy included a
      migration, reverting the app does not revert the schema

---

## Not blocking launch

Real, but they will not stop staff using the app on day one. Full detail in
`TASKS.md`.

- Duplicate route families (`/team` vs `/app/team`)
- 25 edge functions with `verify_jwt = false`
- PushAlert and Google Fonts loading before consent
- 5 remaining dependency vulnerabilities, all needing major bumps
- 70 lint errors
- No test suite
