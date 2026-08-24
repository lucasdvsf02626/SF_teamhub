-- 1. Enum
DO $$ BEGIN
  CREATE TYPE public.attendance_exception_status AS ENUM (
    'ok', 'late', 'early_leave', 'missing_signin',
    'missing_signout', 'no_schedule', 'multi_shift', 'override'
  );
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- 2. Reconciliation v2 table
CREATE TABLE IF NOT EXISTS public.teamhub_attendance_reconciliation_v2 (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                  uuid NOT NULL,
  user_email               text,
  attendance_date          date NOT NULL,

  schedule_source          text NOT NULL,
  schedule_window_count    int  NOT NULL DEFAULT 0,
  expected_start_at        timestamptz,
  expected_end_at          timestamptz,
  expected_minutes         int  NOT NULL DEFAULT 0,
  unpaid_break_minutes     int  NOT NULL DEFAULT 0,
  primary_site             text,

  actual_first_in_at       timestamptz,
  actual_last_out_at       timestamptz,
  worked_minutes           int  NOT NULL DEFAULT 0,
  regular_minutes          int  NOT NULL DEFAULT 0,
  overtime_minutes_raw     int  NOT NULL DEFAULT 0,
  lateness_minutes         int  NOT NULL DEFAULT 0,
  early_leave_minutes      int  NOT NULL DEFAULT 0,

  exception_status         public.attendance_exception_status NOT NULL,
  exception_reason         text,
  override_by              uuid,
  override_at              timestamptz,
  override_note            text,

  policy_id                uuid,
  source_version           text NOT NULL,
  source                   text NOT NULL DEFAULT 'cron',
  generated_at             timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT teamhub_recon_v2_user_date_uniq UNIQUE (user_id, attendance_date)
);

CREATE INDEX IF NOT EXISTS idx_recon_v2_date           ON public.teamhub_attendance_reconciliation_v2 (attendance_date);
CREATE INDEX IF NOT EXISTS idx_recon_v2_user_date      ON public.teamhub_attendance_reconciliation_v2 (user_id, attendance_date DESC);
CREATE INDEX IF NOT EXISTS idx_recon_v2_status_date    ON public.teamhub_attendance_reconciliation_v2 (exception_status, attendance_date);
CREATE INDEX IF NOT EXISTS idx_recon_v2_overtime       ON public.teamhub_attendance_reconciliation_v2 (attendance_date) WHERE overtime_minutes_raw > 0;

-- 3. RLS
ALTER TABLE public.teamhub_attendance_reconciliation_v2 ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users view own recon v2"        ON public.teamhub_attendance_reconciliation_v2;
DROP POLICY IF EXISTS "Managers view reports recon v2" ON public.teamhub_attendance_reconciliation_v2;
DROP POLICY IF EXISTS "Admins view all recon v2"       ON public.teamhub_attendance_reconciliation_v2;

CREATE POLICY "Users view own recon v2"
  ON public.teamhub_attendance_reconciliation_v2
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Managers view reports recon v2"
  ON public.teamhub_attendance_reconciliation_v2
  FOR SELECT
  USING (
    public.get_user_permission_level(auth.uid()) = 3
    AND public.is_direct_report(auth.uid(), user_id)
  );

CREATE POLICY "Admins view all recon v2"
  ON public.teamhub_attendance_reconciliation_v2
  FOR SELECT
  USING (public.get_user_permission_level(auth.uid()) >= 4);

-- 4. Derivation view (security invoker — caller's RLS applies)
DROP VIEW IF EXISTS public.attendance_reconciliation_daily;
CREATE VIEW public.attendance_reconciliation_daily
WITH (security_invoker = true) AS
SELECT
  r.*,
  (
    SELECT jsonb_agg(jsonb_build_object(
      'assignment_id', sa.id,
      'pattern_id', sa.pattern_id,
      'pattern_name', sp.name,
      'site_code', COALESCE(sa.site_code, sp.site_code),
      'start_time', sp.start_time,
      'end_time', sp.end_time,
      'expected_minutes', sp.expected_minutes,
      'break_minutes', sp.break_minutes,
      'days_of_week', sp.days_of_week,
      'effective_from', sa.effective_from,
      'effective_to', sa.effective_to
    ))
    FROM public.teamhub_shift_assignments sa
    JOIN public.teamhub_shift_patterns sp ON sp.id = sa.pattern_id
    WHERE sa.user_id = r.user_id
      AND r.attendance_date BETWEEN sa.effective_from
                                 AND COALESCE(sa.effective_to, r.attendance_date)
  ) AS schedule_rows,
  (
    SELECT jsonb_agg(
      jsonb_build_object(
        'id', e.id,
        'event_type', e.event_type,
        'recorded_at', e.recorded_at,
        'site', e.site,
        'source', e.source
      ) ORDER BY e.recorded_at
    )
    FROM public.teamhub_attendance_events e
    WHERE e.user_id = r.user_id
      AND e.recorded_at >= ((r.attendance_date::timestamp AT TIME ZONE 'Europe/London') - interval '6 hours')
      AND e.recorded_at <  (((r.attendance_date + 1)::timestamp AT TIME ZONE 'Europe/London') + interval '6 hours')
  ) AS attendance_events
FROM public.teamhub_attendance_reconciliation_v2 r;