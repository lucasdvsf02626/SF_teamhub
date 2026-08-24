# .env must point at the Hive — do not re-link the integration

**18 Aug 2026 incident:** the Supabase integration re-sync (commit `34e1033`,
17 Aug 16:03 UTC, published 17:20) rewrote `.env` from the Hive
(`zbltbvizmlvotayjjcum`) back to the linked legacy Team Hub project
(`tiornvtwymjhsrrpbwvr`). That locked every member of staff out on the morning
of 18 Aug, because production auth — and yesterday's leave schema (`day_part`,
`book_leave_for_direct`, closure types) — live in the Hive.

Rules:
- `.env` must always carry `VITE_SUPABASE_URL=https://zbltbvizmlvotayjjcum.supabase.co`
  and the matching Hive anon key. Never let the integration re-sync overwrite it.
- Do NOT re-link the Supabase integration to the legacy project
  `tiornvtwymjhsrrpbwvr`. It is a stale December store, not production.
- `project_id` in `config.toml` still names the legacy project deliberately, so a
  careless `supabase functions deploy` from this repo cannot push onto the live
  Hive. This repo no longer ships edge functions. Do not "fix" it.
