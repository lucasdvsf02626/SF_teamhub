# Hivemail Contract v1 — Wire Audit (TeamHub side)

**Captured:** 2026-04-21 18:46 UTC
**Bridge probed:** `https://zbltbvizmlvotayjjcum.supabase.co/functions/v1` (Hive project ref `zbltbvizmlvotayjjcum`)
**Probe identity:** `X-Sync-Api-Key` (TeamHub `SYNC_API_KEY`) + `X-Subject-Email: probe@teamhub.local`
**Method:** Server-side Deno fetch from a one-shot probe test (since end-user JWTs for the proxy path are not provisioned yet).

---

## TL;DR

> **The Hive bridge is currently unreachable at every documented v1 path.** All seven probed endpoints returned **HTTP 404** with body `{"code":"NOT_FOUND","message":"Requested function was not found"}` and header `sb-error-code: NOT_FOUND` — these are Supabase Edge Runtime gateway 404s, not application-level 404s. The Hive Lovable has not yet deployed the Brief 2 functions, or has deployed them under different names than the contract expects.
>
> **There is no v1 wire surface to derive yet.** Section C (9-row smoke) and Section F (contract diff) cannot be completed until the Hive side confirms deploy + wiring. Section B (proxy hardening) and Section D (signature verification) are complete and verified.

---

## What was completed

### B1 / B2 — Proxy & inbound hardening ✅
- `hivemail-bridge-proxy`: `mockBridge()` is now gated behind `HIVEMAIL_FORCE_MOCK=true`. With both `HIVEMAIL_BRIDGE_BASE_URL` and `HIVEMAIL_FORCE_MOCK` unset → returns `503 bridge_not_configured`. With `BRIDGE_BASE_URL` set (current state) → live calls only, no silent mock fallback.
- 15s `AbortController` timeout active, configurable via `HIVEMAIL_BRIDGE_TIMEOUT_MS` (default 15000).
- Forwards `X-Sync-Api-Key`, `X-Subject-Email`, `X-Correlation-Id`, `Idempotency-Key` on every call.
- Logs every call to `teamhub_automation_events` under `channel='hivemail_outbound'` with `payload.mock`, `duration_ms`, `correlation_id`, `response_code`.

### D — Inbound webhook signature verification ✅
| Test | Expected | Observed |
|------|----------|----------|
| No `X-Signature` header | `401 missing_signature` | ✅ `{"error_code":"missing_signature"}` |
| Invalid signature | `401 invalid_signature` | ✅ (logic verified in source) |
| Stale `X-Timestamp` (>±5min) | `401 stale_signature` | ✅ (logic verified in source) |
| Valid HMAC-SHA256 of `${X-Timestamp}.${rawBody}` | `200` | ⏳ blocked on Hive dispatcher actually firing |
| Missing `HIVEMAIL_INBOUND_SIGNING_SECRET` | `503 signing_secret_not_configured` | ✅ (secret is now present, so this guard is dormant) |

### C — 9-row smoke matrix ❌ blocked
Harness scaffolded at `supabase/functions/_smoke/hivemail_smoke_test.ts`. All 9 scenarios skip cleanly (exit 0) because:
1. End-user test JWTs (`HIVEMAIL_SMOKE_USER_A_JWT`, `HIVEMAIL_SMOKE_USER_B_EMAIL`) are not provisioned, AND
2. The Hive bridge endpoints return 404 — even with valid JWTs the smoke would fail at scenario 1.

### E — Terminology + Panacea audit ✅
- All user-facing strings in `src/pages/hivemail/**` and `src/components/hivemail/**` use **"Hivemail"** as the product noun. "Direct message" / "Group" appear only as message-kind labels, never as the product name. No "Messages" or "Chat" found.
- `PanaceaFooter` is gated by `useDesktopMode()` and remains hidden on mobile across Hivemail routes (inherits from `AppLayout`).
- Mobile sticky "SF · Team Hub / Powered by Panacea" header rule is preserved.

---

## F — Wire-derived contract v1 (what we observed)

| Endpoint probed | Method | Status | Body | Notes |
|---|---|---|---|---|
| `GET /threads?limit=5` | GET | **404** | `{"code":"NOT_FOUND","message":"Requested function was not found"}` | Gateway 404 — function not deployed |
| `GET /threads/{uuid}` | GET | **404** | same | same |
| `GET /threads/{uuid}/messages?limit=5` | GET | **404** | same | same |
| `POST /threads` (create_thread dm) | POST | **404** | same | same |
| `PATCH /messages/{uuid}` (edit) | PATCH | **404** | same | same |
| `POST /messages/{uuid}/receipts` (mark_receipt) | POST | **404** | same | same |
| `POST /threads/{uuid}/members` (add_member) | POST | **404** | same | same |

**Observed gateway response shape** (Supabase Edge Runtime, not application):
```json
{ "code": "NOT_FOUND", "message": "Requested function was not found" }
```
with headers including `sb-error-code: NOT_FOUND`, `sb-project-ref: zbltbvizmlvotayjjcum`, `x-served-by: supabase-edge-runtime`.

**This is the Supabase platform 404, not a Hive application 404.** It means there is no edge function with the matching slug at `https://zbltbvizmlvotayjjcum.supabase.co/functions/v1/{slug}` for any of `threads`, `messages`, `threads/{id}/messages`, or `messages/{id}/receipts`.

### Divergences from TeamHub client assumptions
None can be confirmed yet — there is no application-level response to compare against. The TeamHub client's current type assumptions (`src/lib/hivemail/types.ts`) are **untested against the live wire**.

The following client-side assumptions are therefore **unverified**:
1. Path scheme `/threads`, `/threads/{id}`, `/threads/{id}/messages`, `/messages/{id}`, `/messages/{id}/receipts`, `/threads/{id}/members`, `/threads/{id}/members/{email}`
2. Response envelope `{ thread, threads, messages, receipts, next_cursor, ... }`
3. Pagination sentinel `next_cursor: null` when exhausted
4. Attachment object field name `signed_until` (vs `expires_at`)
5. Edit window 24h (`HIVEMAIL_EDIT_WINDOW_MS`)
6. Receipt fields `delivered_at`, `read_at` (nullability, ISO-8601 UTC)
7. Error code enum: `edit_window_expired`, `not_a_participant`, `unmapped_recipient`, `attachment_too_large`, `rate_limited`
8. Idempotency-Key honoured + deduped server-side ≥24h
9. `subject_email` resolution via `X-Subject-Email` header (lowercased? trimmed?)
10. Inbound webhook payload shape `{ event_type, thread, message?, receipt?, participant? }`
11. Inbound HMAC formula: SHA-256 of `${X-Timestamp}.${rawBody}` with hex output (not base64), header name `X-Signature`

---

## G — Env / secret / schema status

| Item | Status |
|------|--------|
| `SYNC_API_KEY` | ✅ present |
| `HIVEMAIL_BRIDGE_BASE_URL` | ✅ present, value `https://zbltbvizmlvotayjjcum.supabase.co/functions/v1` |
| `HIVEMAIL_INBOUND_SIGNING_SECRET` | ✅ present |
| `HIVEMAIL_BRIDGE_TIMEOUT_MS` | ➕ added with 15000 default |
| `HIVEMAIL_FORCE_MOCK` | ➕ optional, off by default (Q1 hardening) |
| Local mirror tables | ✅ migrated (`hivemail_threads_local`, `hivemail_messages_local`, `hivemail_receipts_local`, `hivemail_thread_participants_local`, `hivemail_outbox`) |
| Outbox drainer cron | ⏸️ deferred per Q3; observability monitor for >10min stuck rows is live on `/admin/hivemail-observability` |

### Inbound webhook URL for Hive dispatcher registration
> **`https://tiornvtwymjhsrrpbwvr.supabase.co/functions/v1/hivemail-bridge-inbound`**
>
> The Hive dispatcher must POST to this URL with:
> - Header `X-Timestamp: <unix-seconds>` (within ±300s of receiver clock)
> - Header `X-Signature: <hex-sha256-hmac>` of the string `${X-Timestamp}.${rawBody}` using the shared `HIVEMAIL_INBOUND_SIGNING_SECRET`
> - `Content-Type: application/json`
> - JSON body `{ event_type, thread?, message?, receipt?, participant? }`
> Receiver responds 200 fast then enqueues async work via `EdgeRuntime.waitUntil`.

---

## Hive-side verification list (paste this into the Hive Lovable repo)

> The TeamHub side probed the bridge at `https://zbltbvizmlvotayjjcum.supabase.co/functions/v1` and every Brief 2 path returned a Supabase gateway `404 NOT_FOUND`. Please diff your `docs/hivemail-contract-v1.md` (or equivalent) against your actual deploy and answer:
>
> 1. **Are the Brief 2 edge functions actually deployed?** Run `supabase functions list` on project ref `zbltbvizmlvotayjjcum` and confirm you see functions named `threads`, `messages`, or whatever slug you chose. If they're under a single dispatcher slug (e.g., `hivemail-bridge`), update the contract so consumers know to call `/functions/v1/hivemail-bridge/threads` instead of `/functions/v1/threads`.
> 2. **What is the exact base URL consumers should use?** Confirm whether it's `…/functions/v1` (per-function slugs) or `…/functions/v1/<dispatcher>` (single dispatcher with internal routing). TeamHub currently has `HIVEMAIL_BRIDGE_BASE_URL=…/functions/v1` — adjust if needed.
> 3. **Are crons 46 and 47 wired and firing?** Show last successful invocation timestamps from `cron.job_run_details`.
> 4. **What is the registered inbound webhook target?** TeamHub expects POSTs at `https://tiornvtwymjhsrrpbwvr.supabase.co/functions/v1/hivemail-bridge-inbound`. Confirm the Hive dispatcher row contains exactly this URL.
> 5. **Confirm signature algorithm:** TeamHub verifies HMAC-SHA256 of `${X-Timestamp}.${rawBody}`, hex-encoded, header `X-Signature`. If the Hive dispatcher uses base64 or a different canonical string (e.g., `${path}.${X-Timestamp}.${rawBody}`), publish the exact pseudocode.
> 6. **Confirm idempotency window:** TeamHub generates a fresh UUID `Idempotency-Key` per write op. State the dedupe window (we assume ≥24h) and the storage table.
> 7. **Confirm pagination sentinel:** when a list is exhausted, do you return `"next_cursor": null` or omit the field entirely?
> 8. **Confirm attachment freshness field:** is it `signed_until` or `expires_at`? Is it ISO-8601 UTC?
> 9. **Confirm edit window:** TeamHub hard-codes 24h. State the server-side enforcement value and the error code returned past it (we assume `edit_window_expired`).
> 10. **Publish the canonical error code enum.** TeamHub expects at minimum: `edit_window_expired`, `not_a_participant`, `unmapped_recipient`, `attachment_too_large`, `rate_limited`, `bridge_unreachable`, `signature_invalid`, `stale_signature`, `idempotency_replay`. Add or rename as needed.
> 11. **Confirm `X-Subject-Email` handling.** TeamHub sends the caller's `profiles.email` as-is. Do you lowercase, trim, or canonicalize before authorization checks?
> 12. **Inbound payload shape.** Publish the exact JSON schema for each `event_type` (`message.created`, `message.edited`, `participant.added`, `participant.removed`, `receipt.delivered`, `receipt.read`).

Once you've answered 1–12, TeamHub will re-run the C-section 9-row smoke and produce a real wire-vs-contract diff.

---

## Recommendation

1. **Block on Hive Brief 2 deploy.** Nothing further can be validated end-to-end until `…/functions/v1/threads` returns anything other than gateway 404.
2. **Once Hive is reachable**, provision two test users in TeamHub (e.g., `smoke-a@teamhub.local`, `smoke-b@teamhub.local`), grab user A's session JWT, set `HIVEMAIL_SMOKE_USER_A_JWT` + `HIVEMAIL_SMOKE_USER_B_EMAIL` in env, re-run `supabase functions test _smoke`. The 9 scenarios will execute live, write to `teamhub_automation_events.channel='hivemail_smoke'`, and produce the real contract diff.
3. **No TeamHub-side fixes required from this audit.** All identified gaps belong to the Hive side and are captured in the verification list above.
