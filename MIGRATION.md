# Migrating Team Hub to a new Supabase project (Sfmediapr)

Runbook for moving SF:Team Hub off the Hive database (`zbltbvizmlvotayjjcum`)
onto a new Supabase project.

This is a **migration of a live system**, not a fresh build. There are ~66 staff
accounts, statutory attendance and leave records, 51 tables, 74 migrations and
38 edge functions in play. Read the whole document before starting.

---

## 0. Decide this first — it cannot be undone later

**Is `hive-vault-guard` moving too, or is Team Hub leaving it behind?**

The Hive database is shared by two applications. From `src/lib/leaveDays.ts:24`:

> KEEP IN SYNC with the identical list in `hive-vault-guard/src/lib/leaveDays.ts`
> (the two apps share the Hive DB, so a request must count the same number of
> days in both)

`src/lib/documentGuidance.ts` says the same about HR document wording.

So today, a leave request booked in Team Hub is visible to `hive-vault-guard`
and vice versa. After the move they are separate databases and immediately
start to diverge. Three ways to go:

| Option | Consequence |
|---|---|
| **Move both apps** to Sfmediapr | They keep sharing. Most work, no data split. |
| **Move Team Hub only, accept the split** | Two systems of record from day one. Fine only if `hive-vault-guard` genuinely does not need Team Hub's data. |
| **Move Team Hub only, keep them in sync** | Needs a bridge — you already have `sync-*` functions doing this against Hive, so there is a precedent, but it is ongoing work forever. |

Nothing below is safe to start until this is answered, because it changes what
"done" means.

- [ ] Decided, and written down here: `________________`

---

## 1. Do this today, whatever you decide

**Download the edge function source while you still have access to Hive.**

`supabase/config.toml` declares 38 functions. `supabase/functions/` does not
exist in this repo. That code runs in production and exists only in the
deployed project. You cannot migrate — or restore, or review — what you do not
have a copy of.

```sh
supabase login
./scripts/download-edge-functions.sh zbltbvizmlvotayjjcum
git add supabase/functions
git commit -m "Vendor edge function source from the Hive project"
```

Do this even if the migration is cancelled. Right now those 38 functions are a
single point of failure.

- [ ] All 38 downloaded (or each failure understood)
- [ ] Committed

**Then capture their secrets**, which are not in the code and not in any dump:

```sh
supabase secrets list --project-ref zbltbvizmlvotayjjcum
```

Expect at least `HIVEMAIL_INBOUND_SIGNING_SECRET` (see
`docs/hivemail-contract-v1-audit.md`). Store the values in a password manager,
**not** in the repo.

- [ ] Secret names recorded
- [ ] Values stored somewhere safe

---

## 2. What you are actually moving

| Item | Count | Where it lives now |
|---|---|---|
| Tables (public schema) | 51 | Hive |
| Migrations | 74 | `supabase/migrations/` in this repo |
| Edge functions | 38 | Deployed only — **not in this repo** |
| Staff auth accounts | ~66 | Hive `auth.users` |
| Scheduled jobs | at least 3 | Hive (pg_cron / scheduled functions) |
| Function secrets | unknown | Hive |
| Storage buckets | none found | — |

The client currently pins its target in `src/integrations/supabase/client.ts`
rather than reading env vars. That was deliberate, after the Lovable
integration twice rewrote `.env` to the wrong project. See `supabase/README.md`.

---

## 3. The step that can lock out every member of staff

Auth users do **not** move between Supabase projects with an ordinary
`pg_dump` of the public schema. Password hashes live in the `auth` schema, and
that schema is managed by Supabase.

You have already had this exact outage. `supabase/README.md` records the 18 Aug
2026 incident: pointing at the wrong project "locked every member of staff out
on the morning of 18 Aug."

Options, least risky first:

1. **Don't migrate auth at all.** If the goal is a project under SF Media PR
   billing/ownership rather than a new database, ask Supabase support about
   transferring the existing project to the new organisation. Same database,
   same users, no migration. **Try this before anything else.**
2. **Migrate users, force a password reset.** Copy user rows via the Auth Admin
   API, then have every member of staff reset their password on first sign-in.
   Predictable, but it needs comms to staff and a working reset email flow —
   which depends on `request-password-reset` / `confirm-password-reset` already
   being deployed on the new project.
3. **Copy the `auth` schema wholesale.** Preserves passwords, but is unsupported
   and version-sensitive. Only with a tested rehearsal.

Whichever you pick: **rehearse it on a throwaway project first, with a copy of
the data.** Do not first attempt this on a Monday morning.

- [ ] Option chosen: `________________`
- [ ] Rehearsed on a scratch project
- [ ] Staff comms drafted (if a reset is needed)

---

## 4. Migration order

Work top to bottom. Each step assumes the one before it succeeded.

### 4.1 Capture everything from Hive

```sh
supabase link --project-ref zbltbvizmlvotayjjcum

supabase db dump --schema public       -f dump/schema.sql       # structure
supabase db dump --schema public --data-only -f dump/data.sql   # rows
supabase db dump --schema auth         -f dump/auth-schema.sql  # inspect only
```

**RLS policies do not always survive a plain schema dump — verify explicitly:**

```sql
select schemaname, tablename, policyname, roles, cmd, qual, with_check
from pg_policies where schemaname = 'public' order by tablename;
```

Save that output. It is the security model of the whole application, and if it
does not arrive on the new project the database is wide open to anyone holding
the anon key — which, on a mobile build, is everyone with the app installed.

Also capture scheduled jobs:

```sql
select * from cron.job;
```

- [ ] Schema dumped
- [ ] Data dumped
- [ ] RLS policies exported and counted
- [ ] Cron jobs recorded

### 4.2 Stand up Sfmediapr

- [ ] Project created, region matching Hive (`eu-west-1`) to keep latency and
      data residency the same
- [ ] Schema applied
- [ ] `select count(*) from pg_tables where schemaname='public'` returns **51**
- [ ] RLS re-applied, and the policy count matches what you exported
- [ ] Extensions present (`btree_gist` is required by the pay-period
      non-overlap constraint — see `.lovable/plan.md`)

### 4.3 Auth

- [ ] Per the option chosen in section 3
- [ ] User count on Sfmediapr matches Hive
- [ ] You can personally sign in on the new project

### 4.4 Data

Load in FK order, or defer constraints. Verify row counts per table against
Hive — not just a total.

Attendance, leave and sickness records are statutory. Do not truncate anything
on Hive until the new project is confirmed good and you have a retained backup.

- [ ] Rows loaded
- [ ] Per-table counts match
- [ ] Spot-checked a named employee's attendance history end to end

### 4.5 Edge functions

```sh
supabase link --project-ref <sfmediapr-ref>
supabase functions deploy <name>          # for each
supabase secrets set KEY=value            # for each secret from section 1
```

- [ ] All 38 deployed
- [ ] `verify_jwt` per function matches `supabase/config.toml`
- [ ] Secrets set
- [ ] Cron schedules recreated (`scheduled-sync-from-hive`,
      `check-certification-expiry`, `generate-attendance-summaries`)
- [ ] Decided what happens to the `sync-*` and `hivemail-*` functions that
      bridge to Hive — if Team Hub has left, do they still make sense?

### 4.6 Point the app at it

Edit `src/integrations/supabase/client.ts` — the URL and anon key are pinned
there deliberately, so this is a code change, not an env change.

Take the opportunity to fix a long-standing wart: regenerate the types against
the real project, which lets you delete `src/integrations/supabase/hive.ts`
entirely. That shim exists only because `types.ts` was generated against the
wrong project.

```sh
supabase gen types typescript --project-id <sfmediapr-ref> \
  > src/integrations/supabase/types.ts
```

- [ ] `client.ts` updated
- [ ] `types.ts` regenerated
- [ ] `hive.ts` shim removed and its imports repointed at `./client`
- [ ] `npx tsc --noEmit -p tsconfig.app.json` clean
- [ ] `npm test` passes
- [ ] `npm run build` succeeds
- [ ] Update the comments in `supabase/README.md` and `.env.example`, which
      currently describe the Hive arrangement

### 4.7 Verify before staff touch it

Run the full daily loop from `LAUNCH-LIST.md` gate 3 against Sfmediapr:

- [ ] Sign in
- [ ] Clock in, clock out
- [ ] Book leave, approve it as a manager
- [ ] Log sickness
- [ ] Shifts render correctly
- [ ] A normal employee **cannot** see another employee's records — the RLS
      question, tested as a signed-in user, not just as a policy listing

---

## 5. Cutover and rollback

Plan the switch for a time when nobody is clocking in — not the start of a
shift.

**Rollback is a code revert**: change `client.ts` back to the Hive URL and key,
rebuild, redeploy. That works only while Hive is still running and still holds
current data.

So: **do not decommission Hive on cutover day.** Keep it live and untouched
until the new project has run a full pay period cleanly.

- [ ] Cutover window agreed, outside shift boundaries
- [ ] Last-good commit recorded: `________________`
- [ ] Hive left running and untouched
- [ ] Decommission date set, at least one full pay period out

---

## 6. Things that will bite

- **Lovable syncs into this repo.** A sync can revert `client.ts` back to the
  old project — that is precisely what the 18 Aug incident was. Check Lovable's
  copy of the file after cutover, not just GitHub's.
- **The `hive.ts` shim** loosens types across the app. Removing it may surface
  type errors that were previously hidden. That is a fix, not a regression, but
  budget time for it.
- **`config.toml`'s project ref** deliberately names the retired project as a
  guardrail. Decide what it should point at after the move, and update
  `supabase/README.md` to match — otherwise the next person inherits a comment
  that is now wrong.
- **The bank holiday fixture** in `leaveDays.ts` is hardcoded to 2030 and is
  duplicated in `hive-vault-guard`. If the apps split, those two copies will
  drift. See `TASKS.md` task 15.
