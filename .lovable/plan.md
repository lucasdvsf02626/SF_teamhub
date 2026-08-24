
# TeamHub Payroll Export Layer — Plan

Scope: build a Xero-shaped CSV/XLSX payroll export on top of the existing GREEN attendance reconciliation + summaries + leave stack. CSV/XLSX prep only — no Xero API, no payslips, no cron, no mobile UI, no changes to QA/Hivewire/sign-out-watcher/Oksana approval.

---

## 0. Confirmed current state (READ pass)

Verified live:
- `teamhub_shift_patterns`, `teamhub_shift_assignments`, `teamhub_attendance_events`, `teamhub_attendance_reconciliation_v2`, `teamhub_attendance_summaries`, `teamhub_daily_presence_summary`, `teamhub_overtime_policies`, `teamhub_leave_requests`, `teamhub_leave_balances`, `teamhub_leave_settings` — present.
- `profiles.department` is free text (16 distinct values across 61/66 profiles); no `employee_number`, no `department_id`, no `default_pay_code_id`.
- `teamhub_leave_requests.request_type` CHECK constraint is exactly `('leave','sick')` (`teamhub_leave_requests_request_type_check`).
- `xlsx` npm package already used by AdminBulkImport / AdminUserManagement / SyncFailureReport — reusable.
- No `teamhub_pay_codes`, `teamhub_pay_periods`, `teamhub_timesheet_entries`, `teamhub_departments` yet.

---

## 1. Deliverables

### D1 — Departments normalisation
- New table `teamhub_departments(id, name UNIQUE, code UNIQUE NULL, is_active, created_at, updated_at)`.
- Seed from `SELECT DISTINCT department FROM profiles WHERE department IS NOT NULL`.
- Add `profiles.department_id uuid REFERENCES teamhub_departments(id)`; backfill by name match.
- Keep `profiles.department` text column for one release as fallback (see Q3).
- RLS: Level 4+ manage; `authenticated` read. GRANTs included.
- No UI dept-picker rewrite this phase — backfill only; admin user mgmt continues using text until follow-up.

### D2 — Employee number + default pay code FK
- `profiles.employee_number text UNIQUE NULL` (nullable; export validates).
- `profiles.default_pay_code_id uuid` (FK added at end of D3 migration to avoid forward-ref).
- Extend the existing AdminUserManagement edit dialog with two fields: Employee Number (text) and Default Pay Code (select from `teamhub_pay_codes`). Level 4+ only.

### D3 — Pay codes
- `teamhub_pay_codes(id, code UNIQUE, name, multiplier numeric default 1.0, is_active, is_absence bool, absence_type text NULL, sort_order int, created_at, updated_at)`.
- Seed: `STD/1.0`, `OT1.5/1.5`, `OT2.0/2.0`, `HOL/1.0` (Holiday), `SICK/1.0` (Sick), `UNPAID/0` (Unpaid), `COMP/1.0` (Compassionate), `TRAIN/1.0` (Training), `OTHER/1.0` (Other).
- Add FK `profiles.default_pay_code_id → teamhub_pay_codes(id)`.
- RLS: Level 4+ manage; `authenticated` read. GRANTs included.

### D4 — Pay periods + lock RPCs
- `teamhub_pay_periods(id, name, start_date, end_date, cutoff_date, locked bool default false, locked_at, locked_by uuid, source text default 'manual', created_at, updated_at)`.
- Non-overlap: `EXCLUDE USING gist (daterange(start_date, end_date, '[]') WITH &&)` (enable `btree_gist`).
- RPC `lock_pay_period(p_period_id uuid)` — SECURITY DEFINER, guarded `get_user_permission_level(auth.uid()) >= 4`, sets `locked=true`, stamps `locked_at=now()`, `locked_by=auth.uid()`.
- RPC `unlock_pay_period(p_period_id uuid)` — SECURITY DEFINER, guarded **Architect only** (`permission_level = 5 AND email = lee@forzaindustries.com`), clears lock.
- RLS: Level 4+ manage; `authenticated` read. GRANTs + grant EXECUTE on RPCs.

### D5 — Expand absence taxonomy
- Drop `teamhub_leave_requests_request_type_check`.
- Migrate data: `UPDATE teamhub_leave_requests SET request_type='holiday' WHERE request_type='leave'`.
- Re-add CHECK `('holiday','sick','unpaid','compassionate','training','other')`.
- TS: extend the `request_type` enum/type in `src/types` + any zod schemas.
- UI: AdminLeaveManagement + LeaveRequests pages — replace the 2-way picker with a 6-way labelled picker (Holiday / Sick / Unpaid / Compassionate / Training / Other).
- `LeaveBalanceCard`: filter to `request_type='holiday'` for balance maths so Unpaid/Training/Compassionate/Other/Sick do not decrement holiday remaining (Sick continues to feed the existing sick-day-recorded display, unchanged).

### D6 — Timesheet entries + materialiser
- `teamhub_timesheet_entries(id, pay_period_id FK, user_id FK, work_date, reconciliation_id FK nullable → recon_v2, shift_pattern_id FK nullable, pay_code_id FK NOT NULL → teamhub_pay_codes, hours_decimal numeric(6,2) default 0, overtime_hours numeric(6,2) default 0, adjustment_hours numeric(6,2) default 0, adjustment_reason text, absence_type text NULL, notes text, source text default 'auto_reconciliation' CHECK in ('auto_reconciliation','manual','adjustment'), is_locked bool default false, created_at, updated_at, UNIQUE(pay_period_id, user_id, work_date, pay_code_id))`.
- RPC `materialise_pay_period_entries(p_period_id uuid)` — SECURITY DEFINER, Level 4+:
  - For each user with `teamhub_attendance_reconciliation_v2` rows in `[start_date, end_date]`:
    - Emit `STD` row from `regular_minutes / 60`.
    - Emit `OT1.5` row from `overtime_minutes_raw / 60` (default; see Q2 — wire `teamhub_overtime_policies.multiplier` if a matching policy exists for the user).
  - For each approved `teamhub_leave_requests` row overlapping the period, emit one row per day mapped to `HOL/SICK/UNPAID/COMP/TRAIN/OTHER`.
  - Idempotent UPSERT on the unique key; **skips rows where `is_locked = true`**; **skips a (user, work_date, pay_code) where `source='manual'` or `source='adjustment'` already exists** (manual override wins).
- RLS: Level 4+ manage; users can SELECT their own rows. INSERT/UPDATE blocked when `is_locked=true` (policy-level guard) AND when the parent `pay_period.locked=true` (RPC + policy check via subquery on `teamhub_pay_periods`).

### D7 — Admin Payroll page + Reports
- Route `/admin/payroll`, Level 4+, registered in `App.tsx` + `AdminBreadcrumb`.
- Tabs: **Timesheets** | **Reports**.
- **Timesheets** tab:
  - (a) Pay-period picker (select existing) + inline "Create period" (name, start, end, cutoff).
  - (b) "Generate / Refresh entries" → calls `materialise_pay_period_entries`.
  - (c) Editable grid (shadcn `DataTable`): Employee Number, Name, Date, Pay Code (select), Hours, OT Hours, Adjustment Hours, Adjustment Reason, Notes. Inline edit, dirty indicator, save-on-blur. Disabled when period locked.
  - (d) "Download Draft CSV" + "Download Draft XLSX" — Xero columns in order: `Employee Number, Employee Name, Date, Pay Code, Hours, Department, Shift, Overtime Hours, Adjustment Hours, Notes`. Hours rounded to 2dp. Pre-export validation panel lists any employees missing `employee_number` and **blocks export**.
  - (e) "Lock period" button — opens confirm dialog requiring the admin to type their **full name** (matching existing `issue_qa_report` pattern — see Q4) before calling `lock_pay_period`.
  - (f) "Download Final CSV/XLSX" — same exporter, appends a footer row `FINAL — period locked at {locked_at} by {locked_by_name}`.
- **Reports** tab — three shadcn `DataTable`s for the selected period:
  - Hours by employee.
  - Hours by department (using `teamhub_departments` via `profiles.department_id`, falling back to `profiles.department` text).
  - Absence summary by type (Holiday / Sick / Unpaid / Compassionate / Training / Other).

---

## 2. Acceptance criteria

1. Every employee with reconciliation rows in a period appears in the editable grid with auto-materialised STD + OT + absence rows.
2. CSV and XLSX exports match the Xero column order and decimal-hour values exactly.
3. Employees missing `employee_number` are blocked from export with a named warning list.
4. Locking a period prevents INSERT/UPDATE on its `teamhub_timesheet_entries` rows (RLS + RPC).
5. Unlock is Architect-only.
6. All 6 absence types appear consistently across leave creation, timesheet entries, and reports.
7. Reports totals reconcile to grid totals (no off-by-one).
8. `useQAAudit`, Hivewire, attendance-event flows untouched.
9. Type-check passes; no edge function names or bridge contract fields altered.

---

## 3. Technical notes

- Migrations: ordered D1 → D3 (so D2 FK can attach) → D2 → D4 → D5 → D6. Single combined migration per delivery wave is fine; each `CREATE TABLE` in `public` ships with explicit `GRANT`s before `ENABLE RLS` + `CREATE POLICY`.
- `btree_gist` extension required for `teamhub_pay_periods` non-overlap exclusion — included in D4 migration.
- All RPCs `SECURITY DEFINER`, `SET search_path = public`, role-gated via `get_user_permission_level(auth.uid())`.
- TypeScript types regenerate automatically after each migration; no manual edits to `src/integrations/supabase/types.ts`.

---

## 4. Out of scope (deliberately)

Xero OAuth, payslips, cost-centre beyond department, mobile payroll UI, shared-password auth, auto-period cron, overtime watcher / sign-out watcher / Oksana approval queue changes.

---

## 5. Confirmed answers (locked)

1. **Pay-period cadence** — "Create period" form pre-fills weekly Monday→Sunday but every field (start/end/cutoff) is editable. Cadence is NOT hard-coded anywhere — lives entirely in `teamhub_pay_periods` rows.
2. **Overtime multiplier source** — Resolve via `teamhub_overtime_policies` priority order **user > site > global** (existing `priority` field). Fallback to `OT1.5` if no policy matches. Map matched multiplier to closest seeded pay code (1.5→OT1.5, 2.0→OT2.0); if multiplier doesn't match a seeded code, still create the entry with the raw multiplier captured in a new `overtime_multiplier numeric` column on `teamhub_timesheet_entries`.
3. **`profiles.department` text column** — Keep for one release as fallback. Backfill `department_id` on migration. Reads prefer `department_id`, fall back to text. Migration includes a `TODO` comment that the text column should be dropped once normalised structure is verified in production for one full release cycle (**Architect approval required**).
4. **Lock signature** — Typed full name (matches `issue_qa_report` UX). Mismatch refuses to lock.
