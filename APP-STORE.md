# Getting SF:Team Hub onto the App Store

Written 31 Aug 2026, from the state of this repo on `claude/sf-teamhub-github-connect-a1tk53`.

Apple's rules change. Everything guideline-numbered below should be re-checked against
the current [App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)
before you submit — the numbers are stable, the wording is not.

---

## 1 · Is React Native the right stack?

**As an engineering choice: yes. As the way to reach the App Store next: no.**

Those are two different questions and they have different answers, because this repo
already contains a second, far more complete native app.

| | Capacitor (`capacitor.config.ts`, `ios/`) | React Native (`apps/mobile/`) |
|---|---|---|
| Screens built | **31 pages, 8,597 lines** | **2** — sign-in, home |
| Native plugins called in code | 4 — barcode, geolocation, haptics, splash | 0 |
| Xcode project | committed, 20 files tracked | none — needs `expo prebuild` |
| App icon | 1024×1024, no alpha — **Apple-compliant** | not created |
| Time to a TestFlight build | days | months |

The Capacitor project is not a sketch. `src/components/ScanButton.tsx` calls the MLKit
barcode scanner, `src/hooks/useGeolocation.ts` calls the geolocation plugin,
`src/hooks/useHaptic.ts` and `useSplashScreen.ts` call theirs. `src/lib/platform.ts`
already branches on `Capacitor.isNativePlatform()`. That work is done.

The React Native app is a scaffold that proves the architecture — sign-in, session
persistence and navigation work end to end, and `@sf/core` resolves from RN with real
types. It is a good foundation. It is roughly 29 screens short of an app.

### So why keep React Native at all

Three reasons it stays the right long-term target:

1. **Background geolocation.** Auto clock-in when someone walks onto site cannot be done
   from a web view. Note that `capacitor.config.ts` configures a `BackgroundGeolocation`
   plugin that **is not installed** — see the blocker list. On the Capacitor side that
   feature does not exist; on RN it is `expo-location` plus a task manager.
2. **The floor.** Gloves, cold hands, people in a hurry. Native scroll physics, keyboard
   handling and tap latency are the difference between a tool and a chore.
3. **The maths is already shared.** `packages/core` holds the leave, geofence and service
   tier calculations with 57 tests, and both apps import it. Migrating the UI never means
   re-deriving the rules.

### The recommendation

**Ship Capacitor as v1.0. Keep React Native as the v2 track.** You get an app on staff
phones in weeks instead of months, and the RN rewrite proceeds screen by screen against a
shipped product rather than a deadline.

**One thing to fix today if you do this:** `capacitor.config.ts` and
`apps/mobile/app.json` both claim the bundle ID `com.supplementfactory.teamhub`. Only one
can own it in App Store Connect. Whichever ships first keeps it; give the other
`com.supplementfactory.teamhub.rn` while it is in development.

---

## 2 · Decide this before you open any accounts

**SF:Team Hub is an internal staff app.** Clock in, shifts, leave, manager approvals.
Nobody outside Supplement Factory can use it — there is no self-registration, accounts are
created by managers.

That shapes which door you go through, and it is a week-one decision because it changes
how you enrol.

**Custom App via Apple Business Manager — the recommended route.** Built for exactly this:
private distribution to your own organisation, no public listing, still reviewed but
without having to justify why the public would want a factory clock-in app. Needs an Apple
Developer Program membership *and* your organisation enrolled in Apple Business Manager.

**Public App Store — the route with the rejection risk.** A login wall with no public value
is the classic **Guideline 4.2 (Minimum Functionality)** trigger. Reviewers regularly reject
"only usable by employees of one company" apps, or redirect them to Custom Apps. Winnable,
but expect to argue it, and expect at least one rejection cycle.

**Apple Developer Enterprise Program** ($299/yr) is in-house distribution with no App Store
at all. Apple restricts eligibility — broadly, large organisations with a demonstrated need.
Probably not open to you; worth a look only if ABM does not fit.

Either way you need the **Apple Developer Program** — $99/year, and enrolling as an
organisation requires a D-U-N-S number, which can take a week or two on its own. Start it
first; it is the longest pole that involves no engineering.

---

## 3 · What is actually blocking, verified in the repo today

### P0 — will crash, or will ship malware

**1. The app will crash the first time anyone taps clock-in.**
`ios/App/App/Info.plist` declares exactly one usage string, `NSCameraUsageDescription`.
`src/hooks/useGeolocation.ts` calls `Geolocation.getCurrentPosition()`. iOS terminates an
app the moment it requests location with no `NSLocationWhenInUseUsageDescription` in the
bundle. Not a warning, not a denied permission — an immediate crash, on the core feature.
Add:

- `NSLocationWhenInUseUsageDescription`
- `NSLocationAlwaysAndWhenInUseUsageDescription` — only if background geofencing ships
- `NSPhotoLibraryUsageDescription` — only if `@capacitor/camera` starts being used

Write them as sentences a member of staff would accept, naming the benefit. Apple rejects
strings like "needs location".

**2. `main` still carries the payload.** `postcss.config.js` on `main` is 31,473 bytes with
the obfuscated line. Build the app from `main` and the payload ships **inside the binary on
every staff phone**. `LAUNCH-LIST.md` Gate 1 covers this: check Lovable's copy first, then
merge PR #2, then rotate credentials. Nothing else in this document matters until that is done.

**3. The Xcode project contains no app.** `ios/App/App/public/` is empty — `npx cap sync ios`
has never been run. The project builds an empty shell today.

**4. No signed-in path has ever been tested.** `LAUNCH-LIST.md` Gate 3. You cannot submit a
clock-in app whose clock-in has never been run against the real database. This is the
biggest gap and the one only you can close.

### P1 — required for submission

**5. Privacy manifest.** No `PrivacyInfo.xcprivacy` anywhere in `ios/`. Required since May
2024 for apps using "required reason" APIs and for SDKs on Apple's list. You will need
declarations covering at minimum `UserDefaults` and file-timestamp access.

**6. App Privacy label** in App Store Connect. This app collects precise location, name,
email and employment data. Declare all of it, and link each to its purpose.

**7. Account deletion — Guideline 5.1.1(v).** The rule targets apps that let users *create*
accounts. Yours are manager-created, which is a reasonable exemption argument — but
reviewers flag it often. Decide your answer before review, not during it.

**8. A demo account — Guideline 2.1.** Every login-gated app needs working reviewer
credentials. Create a real staff account seeded with plausible shifts and leave, and put it
in the review notes.

**9. Privacy policy and support URLs.** `src/pages/PrivacyPolicy.tsx` and `TermsOfUse.tsx`
exist — they need to be publicly reachable URLs before submission.

**Not a blocker:** Sign in with Apple (**Guideline 4.8**) is only required when you offer
third-party social login. `src/pages/Auth.tsx` is email and password only, so it does not apply.

### P2 — dead config worth clearing before review

**10. `BackgroundGeolocation` is configured but not installed.** `capacitor.config.ts`
carries a config block, including a user-facing "tracking your location for auto
sign-in/out" message, for a plugin absent from `package.json`. If auto clock-in by geofence
is a promised feature, it does not exist. Either install the plugin and build it, or delete
the block — do not ship a config that claims background tracking you do not do.

**11. `@capacitor/push-notifications` and `@capacitor/camera` are installed but never
imported.** Push notifications are not implemented. Unused SDKs that touch sensitive APIs
still need privacy-manifest entries and still invite review questions. Remove them or use them.

---

## 4 · The plan

Weeks assume one person on it part-time, with a Mac. Phases 0 and 1 run in parallel.

### Phase 0 — accounts (week 1, mostly waiting)
- Choose Custom App vs public App Store (§2)
- Start Apple Developer Program enrolment — get the D-U-N-S number moving first
- If Custom App: enrol the organisation in Apple Business Manager
- Confirm you have a Mac with current Xcode, or set up a macOS CI runner

### Phase 1 — close the security gate (week 1, blocking)
- `LAUNCH-LIST.md` Gate 1, all four boxes
- Check `postcss.config.js` **in the Lovable editor** before merging, or the next sync
  reverts the fix
- Merge PR #2, rotate credentials

### Phase 2 — make the iOS build real (week 2)
- Add the missing `Info.plist` usage strings (P0-1)
- Add `PrivacyInfo.xcprivacy` (P1-5)
- Clear the dead plugin config (P2-10, P2-11)
- `npm run build && npx cap sync ios`
- Open `ios/App/App.xcworkspace`, set the signing team, archive
- Icon and splash are already in place and compliant — nothing to do there

### Phase 3 — prove the daily loop (weeks 2–3, the real work)
- `LAUNCH-LIST.md` Gate 3 end to end **on a device**, not a simulator: clock in, clock out,
  book leave, approve it, log sickness, check shifts
- Gate 4: confirm a staff account cannot reach `/manager/*` or read another person's
  records — and check it against the RLS policies, not just the UI
- Location permission prompt appears and clock-in works after granting *and* after denying

### Phase 4 — TestFlight (week 3)
- Upload the archive, internal testers first — you and one manager
- Then 5–10 staff on the floor, in real conditions, for at least a week
- Watch `client_error_logs` throughout

### Phase 5 — submit (week 4)
- App Store Connect: description, keywords, support URL, privacy policy URL
- App Privacy label (P1-6)
- Screenshots: 6.7" and 6.5" iPhone required; iPad too, since `supportsTablet: true`
- Demo credentials in review notes, plus one line explaining it is an internal staff tool
- Submit. Review is typically 24–48 hours; budget for one rejection cycle

**Realistic first-submission date: 3–5 weeks from starting**, and the two things most likely
to stretch it are Apple enrolment (Phase 0) and Gate 3 (Phase 3) — neither of which is code.

### Phase 6 — React Native v2 (parallel, not blocking)
Screen by screen against a shipped v1, in this order:

1. Clock in/out — `expo-location` for the geofence, `expo-camera` for QR. The screen that
   justifies the native app
2. Shifts, Time off, Sickness
3. Team directory and calendar
4. Manager approvals and today view
5. Profile and settings
6. Push (`expo-notifications`) and deep links for password reset — the `sfteamhub` scheme is
   registered in `app.json` but nothing handles the callback yet

Each screen imports its rules from `@sf/core`, so the leave and geofence maths is never
written twice. Build with EAS — it compiles iOS in the cloud, so the RN track never needs
the Mac that the Capacitor track does.

---

## 5 · If you would rather go straight to React Native

Defensible, but be clear about the cost: **~29 screens and 8,597 lines to re-express, none
of the 47 shadcn components port, and every P0 and P1 item above still applies** — the
`Info.plist` strings become `app.json` `ios.infoPlist` entries, the privacy manifest still
has to be written, Gate 3 still has to be run. Realistically 2–4 months to first submission
rather than 3–5 weeks, and staff wait the whole time.

The middle path is the one recommended in §1: Capacitor ships now, RN replaces it screen by
screen, and `packages/core` means the business logic is written exactly once either way.
