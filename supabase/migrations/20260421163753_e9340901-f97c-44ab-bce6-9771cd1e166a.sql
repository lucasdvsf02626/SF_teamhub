-- =========================================================
-- Phase 1: TeamHub Attendance Intelligence & Observability
-- =========================================================

-- 1) Shift patterns: reusable definitions
CREATE TABLE public.teamhub_shift_patterns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  start_time time NOT NULL,
  end_time time NOT NULL,
  break_minutes integer NOT NULL DEFAULT 30,
  expected_minutes integer NOT NULL,         -- net working minutes (after breaks)
  days_of_week smallint[] NOT NULL DEFAULT ARRAY[1,2,3,4,5]::smallint[], -- 0=Sun..6=Sat
  site_code text,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.teamhub_shift_patterns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage shift patterns"
  ON public.teamhub_shift_patterns FOR ALL
  USING (get_user_permission_level(auth.uid()) >= 4)
  WITH CHECK (get_user_permission_level(auth.uid()) >= 4);

CREATE POLICY "Authenticated can view shift patterns"
  ON public.teamhub_shift_patterns FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE TRIGGER trg_shift_patterns_updated
  BEFORE UPDATE ON public.teamhub_shift_patterns
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2) Per-user shift assignments (date-ranged)
CREATE TABLE public.teamhub_shift_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  pattern_id uuid NOT NULL REFERENCES public.teamhub_shift_patterns(id) ON DELETE RESTRICT,
  effective_from date NOT NULL,
  effective_to date,                          -- null = open-ended
  site_code text,                             -- override pattern site
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_shift_assign_user_date ON public.teamhub_shift_assignments(user_id, effective_from DESC);
CREATE INDEX idx_shift_assign_open ON public.teamhub_shift_assignments(user_id) WHERE effective_to IS NULL;

ALTER TABLE public.teamhub_shift_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage assignments"
  ON public.teamhub_shift_assignments FOR ALL
  USING (get_user_permission_level(auth.uid()) >= 4)
  WITH CHECK (get_user_permission_level(auth.uid()) >= 4);

CREATE POLICY "Users view own assignments"
  ON public.teamhub_shift_assignments FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Managers view direct reports assignments"
  ON public.teamhub_shift_assignments FOR SELECT
  USING (get_user_permission_level(auth.uid()) = 3 AND is_direct_report(auth.uid(), user_id));

CREATE TRIGGER trg_shift_assign_updated
  BEFORE UPDATE ON public.teamhub_shift_assignments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3) Overtime policies (scoped: global / site / user)
CREATE TABLE public.teamhub_overtime_policies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scope text NOT NULL CHECK (scope IN ('global','site','user')),
  scope_ref text,                             -- site code or user_id (null for global)
  daily_threshold_minutes integer NOT NULL DEFAULT 480,   -- 8h
  weekly_threshold_minutes integer NOT NULL DEFAULT 2400, -- 40h
  grace_minutes integer NOT NULL DEFAULT 10,              -- below this OT ignored
  rounding_minutes integer NOT NULL DEFAULT 1,            -- round OT to nearest N
  is_active boolean NOT NULL DEFAULT true,
  priority integer NOT NULL DEFAULT 100,                  -- lower wins; user<site<global typical
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_ot_policy_lookup ON public.teamhub_overtime_policies(scope, scope_ref) WHERE is_active;

ALTER TABLE public.teamhub_overtime_policies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage overtime policies"
  ON public.teamhub_overtime_policies FOR ALL
  USING (get_user_permission_level(auth.uid()) >= 4)
  WITH CHECK (get_user_permission_level(auth.uid()) >= 4);

CREATE POLICY "Authenticated can view overtime policies"
  ON public.teamhub_overtime_policies FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE TRIGGER trg_ot_policy_updated
  BEFORE UPDATE ON public.teamhub_overtime_policies
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed default global policy
INSERT INTO public.teamhub_overtime_policies (scope, scope_ref, daily_threshold_minutes, weekly_threshold_minutes, grace_minutes, rounding_minutes, priority)
VALUES ('global', NULL, 480, 2400, 10, 5, 1000);

-- 4) Daily reconciliation rows (immutable audit per user/date)
CREATE TABLE public.teamhub_attendance_reconciliations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  user_email text,                            -- snapshot for email-keyed payloads
  date date NOT NULL,
  assignment_id uuid,                         -- shift assignment in effect
  pattern_id uuid,
  expected_minutes integer NOT NULL DEFAULT 0,
  worked_minutes integer NOT NULL DEFAULT 0,
  break_minutes integer NOT NULL DEFAULT 0,
  overtime_minutes integer NOT NULL DEFAULT 0,
  first_sign_in timestamptz,
  last_sign_out timestamptz,
  primary_site text,
  status text NOT NULL,                       -- 'complete','partial','no_show','off_day','holiday'
  anomalies text[] NOT NULL DEFAULT ARRAY[]::text[], -- e.g. {'missing_signout','late_arrival','no_assignment'}
  policy_id uuid,
  computed_at timestamptz NOT NULL DEFAULT now(),
  source text NOT NULL DEFAULT 'cron',        -- 'cron' | 'on_demand' | 'backfill'
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  CONSTRAINT uq_recon_user_date UNIQUE (user_id, date)
);

CREATE INDEX idx_recon_date ON public.teamhub_attendance_reconciliations(date DESC);
CREATE INDEX idx_recon_user_date ON public.teamhub_attendance_reconciliations(user_id, date DESC);
CREATE INDEX idx_recon_anomalies ON public.teamhub_attendance_reconciliations USING GIN(anomalies);
CREATE INDEX idx_recon_email ON public.teamhub_attendance_reconciliations(user_email);

ALTER TABLE public.teamhub_attendance_reconciliations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins view all reconciliations"
  ON public.teamhub_attendance_reconciliations FOR SELECT
  USING (get_user_permission_level(auth.uid()) >= 4);

CREATE POLICY "Managers view direct reports reconciliations"
  ON public.teamhub_attendance_reconciliations FOR SELECT
  USING (get_user_permission_level(auth.uid()) = 3 AND is_direct_report(auth.uid(), user_id));

CREATE POLICY "Users view own reconciliations"
  ON public.teamhub_attendance_reconciliations FOR SELECT
  USING (auth.uid() = user_id);

-- 5) Weekly & monthly summaries (immutable rollups)
CREATE TABLE public.teamhub_attendance_summaries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  user_email text,
  period_type text NOT NULL CHECK (period_type IN ('weekly','monthly')),
  period_start date NOT NULL,                 -- ISO week Monday or month-1st
  period_end date NOT NULL,
  expected_minutes integer NOT NULL DEFAULT 0,
  worked_minutes integer NOT NULL DEFAULT 0,
  overtime_minutes integer NOT NULL DEFAULT 0,
  days_worked integer NOT NULL DEFAULT 0,
  days_expected integer NOT NULL DEFAULT 0,
  days_no_show integer NOT NULL DEFAULT 0,
  days_partial integer NOT NULL DEFAULT 0,
  anomaly_count integer NOT NULL DEFAULT 0,
  reconciliation_ids uuid[] NOT NULL DEFAULT ARRAY[]::uuid[],
  computed_at timestamptz NOT NULL DEFAULT now(),
  source text NOT NULL DEFAULT 'cron',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  CONSTRAINT uq_summary_user_period UNIQUE (user_id, period_type, period_start)
);

CREATE INDEX idx_summary_period ON public.teamhub_attendance_summaries(period_type, period_start DESC);
CREATE INDEX idx_summary_user ON public.teamhub_attendance_summaries(user_id, period_type, period_start DESC);
CREATE INDEX idx_summary_email ON public.teamhub_attendance_summaries(user_email);

ALTER TABLE public.teamhub_attendance_summaries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins view all summaries"
  ON public.teamhub_attendance_summaries FOR SELECT
  USING (get_user_permission_level(auth.uid()) >= 4);

CREATE POLICY "Managers view direct reports summaries"
  ON public.teamhub_attendance_summaries FOR SELECT
  USING (get_user_permission_level(auth.uid()) = 3 AND is_direct_report(auth.uid(), user_id));

CREATE POLICY "Users view own summaries"
  ON public.teamhub_attendance_summaries FOR SELECT
  USING (auth.uid() = user_id);

-- 6) Automation events / outbox (n8n + Hivemail stub)
CREATE TABLE public.teamhub_automation_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL,                   -- e.g. 'attendance.daily_reconciled', 'hivemail.message.queued'
  channel text NOT NULL,                      -- 'webhook' | 'hivemail_stub' | 'internal'
  status text NOT NULL DEFAULT 'pending',     -- pending|delivering|delivered|failed|skipped
  payload jsonb NOT NULL,                     -- email-keyed identity inside
  target_url text,                            -- webhook destination
  user_email text,                            -- denormalized for filtering
  attempt_count integer NOT NULL DEFAULT 0,
  next_attempt_at timestamptz NOT NULL DEFAULT now(),
  last_error text,
  response_code integer,
  delivered_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_autoevt_pending ON public.teamhub_automation_events(next_attempt_at)
  WHERE status IN ('pending','delivering');
CREATE INDEX idx_autoevt_type_created ON public.teamhub_automation_events(event_type, created_at DESC);
CREATE INDEX idx_autoevt_email ON public.teamhub_automation_events(user_email);

ALTER TABLE public.teamhub_automation_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins view automation events"
  ON public.teamhub_automation_events FOR SELECT
  USING (get_user_permission_level(auth.uid()) >= 4);

CREATE POLICY "Admins delete automation events"
  ON public.teamhub_automation_events FOR DELETE
  USING (get_user_permission_level(auth.uid()) >= 4);

CREATE POLICY "Service inserts automation events"
  ON public.teamhub_automation_events FOR INSERT
  WITH CHECK (true);

CREATE TRIGGER trg_autoevt_updated
  BEFORE UPDATE ON public.teamhub_automation_events
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 7) Webhook endpoint registry (admin-managed n8n targets)
CREATE TABLE public.teamhub_webhook_endpoints (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  url text NOT NULL,
  event_types text[] NOT NULL DEFAULT ARRAY['*']::text[], -- '*' = all
  secret_name text NOT NULL DEFAULT 'AUTOMATION_WEBHOOK_SECRET', -- secret used for HMAC
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.teamhub_webhook_endpoints ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage webhook endpoints"
  ON public.teamhub_webhook_endpoints FOR ALL
  USING (get_user_permission_level(auth.uid()) >= 4)
  WITH CHECK (get_user_permission_level(auth.uid()) >= 4);

CREATE TRIGGER trg_webhook_endpoints_updated
  BEFORE UPDATE ON public.teamhub_webhook_endpoints
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
