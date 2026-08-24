
-- =========================================================
-- D1: Departments normalisation
-- =========================================================
CREATE TABLE public.teamhub_departments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  code text UNIQUE,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.teamhub_departments TO authenticated;
GRANT ALL    ON public.teamhub_departments TO service_role;

ALTER TABLE public.teamhub_departments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view departments"
  ON public.teamhub_departments FOR SELECT TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins manage departments"
  ON public.teamhub_departments FOR ALL TO authenticated
  USING (get_user_permission_level(auth.uid()) >= 4)
  WITH CHECK (get_user_permission_level(auth.uid()) >= 4);

CREATE TRIGGER trg_teamhub_departments_updated
  BEFORE UPDATE ON public.teamhub_departments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed from existing free-text values
INSERT INTO public.teamhub_departments (name)
SELECT DISTINCT btrim(department)
FROM public.profiles
WHERE department IS NOT NULL AND btrim(department) <> ''
ON CONFLICT (name) DO NOTHING;

-- =========================================================
-- D3: Pay codes (created BEFORE D2 so D2 FK attaches cleanly)
-- =========================================================
CREATE TABLE public.teamhub_pay_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  multiplier numeric(4,2) NOT NULL DEFAULT 1.0,
  is_active boolean NOT NULL DEFAULT true,
  is_absence boolean NOT NULL DEFAULT false,
  absence_type text,
  sort_order integer NOT NULL DEFAULT 100,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.teamhub_pay_codes TO authenticated;
GRANT ALL    ON public.teamhub_pay_codes TO service_role;

ALTER TABLE public.teamhub_pay_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view pay codes"
  ON public.teamhub_pay_codes FOR SELECT TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins manage pay codes"
  ON public.teamhub_pay_codes FOR ALL TO authenticated
  USING (get_user_permission_level(auth.uid()) >= 4)
  WITH CHECK (get_user_permission_level(auth.uid()) >= 4);

CREATE TRIGGER trg_teamhub_pay_codes_updated
  BEFORE UPDATE ON public.teamhub_pay_codes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.teamhub_pay_codes (code, name, multiplier, is_absence, absence_type, sort_order) VALUES
  ('STD',    'Standard hours',        1.0, false, NULL,            10),
  ('OT1.5',  'Overtime 1.5x',         1.5, false, NULL,            20),
  ('OT2.0',  'Overtime 2.0x',         2.0, false, NULL,            30),
  ('HOL',    'Holiday',               1.0, true,  'holiday',       40),
  ('SICK',   'Sick',                  1.0, true,  'sick',          50),
  ('UNPAID', 'Unpaid leave',          0.0, true,  'unpaid',        60),
  ('COMP',   'Compassionate leave',   1.0, true,  'compassionate', 70),
  ('TRAIN',  'Training',              1.0, true,  'training',      80),
  ('OTHER',  'Other absence',         1.0, true,  'other',         90)
ON CONFLICT (code) DO NOTHING;

-- =========================================================
-- D2: profiles employee_number + default_pay_code_id + department_id
-- TODO (Architect approval required): drop profiles.department text column
-- after one full release cycle of teamhub_departments + department_id in
-- production. Until then, keep department text as a fallback for legacy reads.
-- =========================================================
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS employee_number text,
  ADD COLUMN IF NOT EXISTS department_id uuid REFERENCES public.teamhub_departments(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS default_pay_code_id uuid REFERENCES public.teamhub_pay_codes(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS profiles_employee_number_key
  ON public.profiles (employee_number)
  WHERE employee_number IS NOT NULL;

-- Backfill department_id from free-text department
UPDATE public.profiles p
SET department_id = d.id
FROM public.teamhub_departments d
WHERE p.department_id IS NULL
  AND p.department IS NOT NULL
  AND btrim(p.department) = d.name;

-- =========================================================
-- D4: Pay periods + lock/unlock RPCs
-- =========================================================
CREATE EXTENSION IF NOT EXISTS btree_gist;

CREATE TABLE public.teamhub_pay_periods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  cutoff_date date NOT NULL,
  locked boolean NOT NULL DEFAULT false,
  locked_at timestamptz,
  locked_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  source text NOT NULL DEFAULT 'manual',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT pay_period_valid_range CHECK (end_date >= start_date),
  CONSTRAINT pay_period_no_overlap EXCLUDE USING gist (daterange(start_date, end_date, '[]'::text) WITH &&)
);

GRANT SELECT ON public.teamhub_pay_periods TO authenticated;
GRANT ALL    ON public.teamhub_pay_periods TO service_role;

ALTER TABLE public.teamhub_pay_periods ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view pay periods"
  ON public.teamhub_pay_periods FOR SELECT TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins manage pay periods"
  ON public.teamhub_pay_periods FOR ALL TO authenticated
  USING (get_user_permission_level(auth.uid()) >= 4)
  WITH CHECK (get_user_permission_level(auth.uid()) >= 4);

CREATE TRIGGER trg_teamhub_pay_periods_updated
  BEFORE UPDATE ON public.teamhub_pay_periods
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.lock_pay_period(p_period_id uuid)
RETURNS public.teamhub_pay_periods
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.teamhub_pay_periods;
BEGIN
  IF public.get_user_permission_level(auth.uid()) < 4 THEN
    RAISE EXCEPTION 'Forbidden: admin only';
  END IF;

  UPDATE public.teamhub_pay_periods
  SET locked = true,
      locked_at = now(),
      locked_by = auth.uid()
  WHERE id = p_period_id
  RETURNING * INTO v_row;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Pay period not found';
  END IF;

  RETURN v_row;
END;
$$;

CREATE OR REPLACE FUNCTION public.unlock_pay_period(p_period_id uuid)
RETURNS public.teamhub_pay_periods
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.teamhub_pay_periods;
  v_email text;
  v_level int;
BEGIN
  SELECT email, COALESCE(permission_level, 1)
  INTO v_email, v_level
  FROM public.profiles
  WHERE id = auth.uid();

  IF v_level <> 5 THEN
    RAISE EXCEPTION 'Forbidden: Architect only';
  END IF;

  UPDATE public.teamhub_pay_periods
  SET locked = false,
      locked_at = NULL,
      locked_by = NULL
  WHERE id = p_period_id
  RETURNING * INTO v_row;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Pay period not found';
  END IF;

  RETURN v_row;
END;
$$;

GRANT EXECUTE ON FUNCTION public.lock_pay_period(uuid)   TO authenticated;
GRANT EXECUTE ON FUNCTION public.unlock_pay_period(uuid) TO authenticated;

-- =========================================================
-- D5: Expand absence taxonomy on leave requests
-- =========================================================
ALTER TABLE public.teamhub_leave_requests
  DROP CONSTRAINT IF EXISTS teamhub_leave_requests_request_type_check;

UPDATE public.teamhub_leave_requests SET request_type = 'holiday' WHERE request_type = 'leave';

ALTER TABLE public.teamhub_leave_requests
  ADD CONSTRAINT teamhub_leave_requests_request_type_check
  CHECK (request_type = ANY (ARRAY['holiday','sick','unpaid','compassionate','training','other']));

-- =========================================================
-- Overtime policy multiplier column (Q2)
-- =========================================================
ALTER TABLE public.teamhub_overtime_policies
  ADD COLUMN IF NOT EXISTS overtime_multiplier numeric(4,2) NOT NULL DEFAULT 1.5;

-- =========================================================
-- D6: Timesheet entries + materialiser
-- =========================================================
CREATE TABLE public.teamhub_timesheet_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pay_period_id uuid NOT NULL REFERENCES public.teamhub_pay_periods(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  work_date date NOT NULL,
  reconciliation_id uuid REFERENCES public.teamhub_attendance_reconciliation_v2(id) ON DELETE SET NULL,
  shift_pattern_id uuid,
  pay_code_id uuid NOT NULL REFERENCES public.teamhub_pay_codes(id),
  hours_decimal numeric(6,2) NOT NULL DEFAULT 0,
  overtime_hours numeric(6,2) NOT NULL DEFAULT 0,
  overtime_multiplier numeric(4,2),
  adjustment_hours numeric(6,2) NOT NULL DEFAULT 0,
  adjustment_reason text,
  absence_type text,
  notes text,
  source text NOT NULL DEFAULT 'auto_reconciliation'
    CHECK (source IN ('auto_reconciliation','manual','adjustment')),
  is_locked boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (pay_period_id, user_id, work_date, pay_code_id)
);

CREATE INDEX idx_timesheet_entries_period_user ON public.teamhub_timesheet_entries (pay_period_id, user_id);
CREATE INDEX idx_timesheet_entries_user_date   ON public.teamhub_timesheet_entries (user_id, work_date);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.teamhub_timesheet_entries TO authenticated;
GRANT ALL ON public.teamhub_timesheet_entries TO service_role;

ALTER TABLE public.teamhub_timesheet_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own timesheet entries"
  ON public.teamhub_timesheet_entries FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR get_user_permission_level(auth.uid()) >= 4);

CREATE POLICY "Admins insert timesheet entries"
  ON public.teamhub_timesheet_entries FOR INSERT TO authenticated
  WITH CHECK (
    get_user_permission_level(auth.uid()) >= 4
    AND NOT EXISTS (
      SELECT 1 FROM public.teamhub_pay_periods pp
      WHERE pp.id = pay_period_id AND pp.locked = true
    )
  );

CREATE POLICY "Admins update unlocked timesheet entries"
  ON public.teamhub_timesheet_entries FOR UPDATE TO authenticated
  USING (
    get_user_permission_level(auth.uid()) >= 4
    AND is_locked = false
    AND NOT EXISTS (
      SELECT 1 FROM public.teamhub_pay_periods pp
      WHERE pp.id = pay_period_id AND pp.locked = true
    )
  )
  WITH CHECK (
    get_user_permission_level(auth.uid()) >= 4
    AND NOT EXISTS (
      SELECT 1 FROM public.teamhub_pay_periods pp
      WHERE pp.id = pay_period_id AND pp.locked = true
    )
  );

CREATE POLICY "Admins delete unlocked timesheet entries"
  ON public.teamhub_timesheet_entries FOR DELETE TO authenticated
  USING (
    get_user_permission_level(auth.uid()) >= 4
    AND is_locked = false
    AND NOT EXISTS (
      SELECT 1 FROM public.teamhub_pay_periods pp
      WHERE pp.id = pay_period_id AND pp.locked = true
    )
  );

CREATE TRIGGER trg_teamhub_timesheet_entries_updated
  BEFORE UPDATE ON public.teamhub_timesheet_entries
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---------------------------------------------------------
-- Materialiser RPC
-- Generates STD + OT rows from recon v2, plus absence rows
-- from approved leave_requests overlapping the period.
-- Idempotent UPSERT on (period, user, date, pay_code).
-- Skips rows where is_locked = true OR where a manual/adjustment
-- row for that (user, date, pay_code) already exists.
-- ---------------------------------------------------------
CREATE OR REPLACE FUNCTION public.materialise_pay_period_entries(p_period_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_period   public.teamhub_pay_periods;
  v_std_code uuid;
  v_inserted int := 0;
  v_updated  int := 0;
BEGIN
  IF public.get_user_permission_level(auth.uid()) < 4 THEN
    RAISE EXCEPTION 'Forbidden: admin only';
  END IF;

  SELECT * INTO v_period FROM public.teamhub_pay_periods WHERE id = p_period_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Pay period not found'; END IF;
  IF v_period.locked THEN RAISE EXCEPTION 'Pay period is locked'; END IF;

  SELECT id INTO v_std_code FROM public.teamhub_pay_codes WHERE code = 'STD';

  -- STD rows from regular_minutes
  WITH src AS (
    SELECT
      r.user_id,
      r.attendance_date AS work_date,
      r.id              AS reconciliation_id,
      v_std_code        AS pay_code_id,
      ROUND((r.regular_minutes::numeric) / 60.0, 2) AS hours_decimal
    FROM public.teamhub_attendance_reconciliation_v2 r
    WHERE r.attendance_date BETWEEN v_period.start_date AND v_period.end_date
      AND r.regular_minutes > 0
  ), ins AS (
    INSERT INTO public.teamhub_timesheet_entries
      (pay_period_id, user_id, work_date, reconciliation_id, pay_code_id, hours_decimal, source)
    SELECT p_period_id, s.user_id, s.work_date, s.reconciliation_id, s.pay_code_id, s.hours_decimal, 'auto_reconciliation'
    FROM src s
    WHERE NOT EXISTS (
      SELECT 1 FROM public.teamhub_timesheet_entries e
      WHERE e.pay_period_id = p_period_id
        AND e.user_id = s.user_id
        AND e.work_date = s.work_date
        AND e.pay_code_id = s.pay_code_id
        AND (e.source IN ('manual','adjustment') OR e.is_locked = true)
    )
    ON CONFLICT (pay_period_id, user_id, work_date, pay_code_id) DO UPDATE
      SET hours_decimal = EXCLUDED.hours_decimal,
          reconciliation_id = EXCLUDED.reconciliation_id,
          updated_at = now()
      WHERE teamhub_timesheet_entries.source = 'auto_reconciliation'
        AND teamhub_timesheet_entries.is_locked = false
    RETURNING xmax = 0 AS inserted
  )
  SELECT
    COUNT(*) FILTER (WHERE inserted),
    COUNT(*) FILTER (WHERE NOT inserted)
  INTO v_inserted, v_updated
  FROM ins;

  -- OT rows from overtime_minutes_raw, resolving multiplier via policy priority user > site > global
  WITH src AS (
    SELECT
      r.user_id,
      r.attendance_date AS work_date,
      r.id              AS reconciliation_id,
      r.primary_site,
      ROUND((r.overtime_minutes_raw::numeric) / 60.0, 2) AS overtime_hours
    FROM public.teamhub_attendance_reconciliation_v2 r
    WHERE r.attendance_date BETWEEN v_period.start_date AND v_period.end_date
      AND r.overtime_minutes_raw > 0
  ), resolved AS (
    SELECT
      s.*,
      COALESCE((
        SELECT pol.overtime_multiplier
        FROM public.teamhub_overtime_policies pol
        WHERE pol.is_active
          AND (
            (pol.scope = 'user'   AND pol.scope_ref = s.user_id::text)
         OR (pol.scope = 'site'   AND pol.scope_ref = s.primary_site)
         OR (pol.scope = 'global')
          )
        ORDER BY CASE pol.scope WHEN 'user' THEN 1 WHEN 'site' THEN 2 ELSE 3 END,
                 pol.priority ASC
        LIMIT 1
      ), 1.5) AS multiplier
    FROM src s
  ), mapped AS (
    SELECT
      r.*,
      (SELECT pc.id FROM public.teamhub_pay_codes pc
         ORDER BY ABS(pc.multiplier - r.multiplier) ASC, pc.sort_order ASC
         LIMIT 1) AS pay_code_id
    FROM resolved r
  )
  INSERT INTO public.teamhub_timesheet_entries
    (pay_period_id, user_id, work_date, reconciliation_id, pay_code_id, hours_decimal, overtime_hours, overtime_multiplier, source)
  SELECT p_period_id, m.user_id, m.work_date, m.reconciliation_id, m.pay_code_id, 0, m.overtime_hours, m.multiplier, 'auto_reconciliation'
  FROM mapped m
  WHERE m.pay_code_id IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM public.teamhub_timesheet_entries e
      WHERE e.pay_period_id = p_period_id
        AND e.user_id = m.user_id
        AND e.work_date = m.work_date
        AND e.pay_code_id = m.pay_code_id
        AND (e.source IN ('manual','adjustment') OR e.is_locked = true)
    )
  ON CONFLICT (pay_period_id, user_id, work_date, pay_code_id) DO UPDATE
    SET overtime_hours = EXCLUDED.overtime_hours,
        overtime_multiplier = EXCLUDED.overtime_multiplier,
        reconciliation_id = EXCLUDED.reconciliation_id,
        updated_at = now()
    WHERE teamhub_timesheet_entries.source = 'auto_reconciliation'
      AND teamhub_timesheet_entries.is_locked = false;

  -- Absence rows from approved leave_requests, one per day within the period
  WITH days AS (
    SELECT
      lr.user_id,
      lr.request_type,
      gs::date AS work_date
    FROM public.teamhub_leave_requests lr
    CROSS JOIN LATERAL generate_series(
      GREATEST(lr.start_date, v_period.start_date),
      LEAST(lr.end_date, v_period.end_date),
      interval '1 day'
    ) gs
    WHERE lr.status = 'approved'
      AND lr.start_date <= v_period.end_date
      AND lr.end_date   >= v_period.start_date
  ), mapped AS (
    SELECT
      d.user_id,
      d.work_date,
      d.request_type,
      pc.id AS pay_code_id
    FROM days d
    JOIN public.teamhub_pay_codes pc ON pc.absence_type = d.request_type
  )
  INSERT INTO public.teamhub_timesheet_entries
    (pay_period_id, user_id, work_date, pay_code_id, hours_decimal, absence_type, source)
  SELECT p_period_id, m.user_id, m.work_date, m.pay_code_id, 0, m.request_type, 'auto_reconciliation'
  FROM mapped m
  WHERE NOT EXISTS (
    SELECT 1 FROM public.teamhub_timesheet_entries e
    WHERE e.pay_period_id = p_period_id
      AND e.user_id = m.user_id
      AND e.work_date = m.work_date
      AND e.pay_code_id = m.pay_code_id
      AND (e.source IN ('manual','adjustment') OR e.is_locked = true)
  )
  ON CONFLICT (pay_period_id, user_id, work_date, pay_code_id) DO UPDATE
    SET absence_type = EXCLUDED.absence_type,
        updated_at = now()
    WHERE teamhub_timesheet_entries.source = 'auto_reconciliation'
      AND teamhub_timesheet_entries.is_locked = false;

  RETURN jsonb_build_object(
    'period_id', p_period_id,
    'std_inserted', v_inserted,
    'std_updated', v_updated
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.materialise_pay_period_entries(uuid) TO authenticated;
