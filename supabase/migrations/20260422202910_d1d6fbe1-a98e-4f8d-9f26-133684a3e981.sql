
-- 1) Source enum column
ALTER TABLE public.teamhub_shift_assignments
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'manual'
    CHECK (source IN ('manual', 'hive_production_schedule', 'import'));

-- 2) External ID for Hive bridge idempotency
ALTER TABLE public.teamhub_shift_assignments
  ADD COLUMN IF NOT EXISTS external_id text;

-- Soft-delete column for audit-friendly removal
ALTER TABLE public.teamhub_shift_assignments
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

-- 3) Indexes
CREATE INDEX IF NOT EXISTS idx_shift_assignments_user_effective
  ON public.teamhub_shift_assignments (user_id, effective_from DESC);

CREATE INDEX IF NOT EXISTS idx_shift_assignments_active
  ON public.teamhub_shift_assignments (user_id)
  WHERE effective_to IS NULL AND deleted_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_shift_assignments_external_id_hive
  ON public.teamhub_shift_assignments (external_id)
  WHERE source = 'hive_production_schedule' AND external_id IS NOT NULL;

-- 4) Enable RLS (idempotent)
ALTER TABLE public.teamhub_shift_assignments ENABLE ROW LEVEL SECURITY;

-- Drop any prior versions of these policies for re-run safety
DROP POLICY IF EXISTS "Admins view all shift assignments" ON public.teamhub_shift_assignments;
DROP POLICY IF EXISTS "Managers view direct reports shift assignments" ON public.teamhub_shift_assignments;
DROP POLICY IF EXISTS "Users view own shift assignments" ON public.teamhub_shift_assignments;
DROP POLICY IF EXISTS "Admins insert non-bridge shift assignments" ON public.teamhub_shift_assignments;
DROP POLICY IF EXISTS "Admins update non-bridge shift assignments" ON public.teamhub_shift_assignments;
DROP POLICY IF EXISTS "Admins delete non-bridge shift assignments" ON public.teamhub_shift_assignments;

CREATE POLICY "Admins view all shift assignments"
  ON public.teamhub_shift_assignments FOR SELECT
  USING (get_user_permission_level(auth.uid()) >= 4);

CREATE POLICY "Managers view direct reports shift assignments"
  ON public.teamhub_shift_assignments FOR SELECT
  USING (get_user_permission_level(auth.uid()) = 3
         AND is_direct_report(auth.uid(), user_id));

CREATE POLICY "Users view own shift assignments"
  ON public.teamhub_shift_assignments FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins insert non-bridge shift assignments"
  ON public.teamhub_shift_assignments FOR INSERT
  WITH CHECK (get_user_permission_level(auth.uid()) >= 4
              AND source <> 'hive_production_schedule');

CREATE POLICY "Admins update non-bridge shift assignments"
  ON public.teamhub_shift_assignments FOR UPDATE
  USING (get_user_permission_level(auth.uid()) >= 4
         AND source <> 'hive_production_schedule')
  WITH CHECK (get_user_permission_level(auth.uid()) >= 4
              AND source <> 'hive_production_schedule');

CREATE POLICY "Admins delete non-bridge shift assignments"
  ON public.teamhub_shift_assignments FOR DELETE
  USING (get_user_permission_level(auth.uid()) >= 4
         AND source <> 'hive_production_schedule');

-- 5) Read access for shift patterns so admins can pick from them
ALTER TABLE public.teamhub_shift_patterns ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins view shift patterns" ON public.teamhub_shift_patterns;
DROP POLICY IF EXISTS "Admins manage shift patterns" ON public.teamhub_shift_patterns;
DROP POLICY IF EXISTS "Authenticated view active shift patterns" ON public.teamhub_shift_patterns;

CREATE POLICY "Authenticated view active shift patterns"
  ON public.teamhub_shift_patterns FOR SELECT
  TO authenticated
  USING (is_active = true OR get_user_permission_level(auth.uid()) >= 4);

CREATE POLICY "Admins manage shift patterns"
  ON public.teamhub_shift_patterns FOR ALL
  USING (get_user_permission_level(auth.uid()) >= 4)
  WITH CHECK (get_user_permission_level(auth.uid()) >= 4);

-- 6) Audit log table
CREATE TABLE IF NOT EXISTS public.teamhub_shift_assignment_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id uuid NOT NULL,
  actor_user_id uuid,
  action text NOT NULL CHECK (action IN ('insert', 'update', 'soft_delete', 'delete', 'restore')),
  before_json jsonb,
  after_json jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_shift_assignment_events_assignment
  ON public.teamhub_shift_assignment_events (assignment_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_shift_assignment_events_actor
  ON public.teamhub_shift_assignment_events (actor_user_id, created_at DESC);

ALTER TABLE public.teamhub_shift_assignment_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins view shift assignment audit" ON public.teamhub_shift_assignment_events;
DROP POLICY IF EXISTS "Service inserts shift assignment audit" ON public.teamhub_shift_assignment_events;
DROP POLICY IF EXISTS "Authenticated insert shift assignment audit" ON public.teamhub_shift_assignment_events;

CREATE POLICY "Admins view shift assignment audit"
  ON public.teamhub_shift_assignment_events FOR SELECT
  USING (get_user_permission_level(auth.uid()) >= 4);

-- Audit rows are written by the trigger running as definer; allow service + authenticated insert via trigger context
CREATE POLICY "Authenticated insert shift assignment audit"
  ON public.teamhub_shift_assignment_events FOR INSERT
  WITH CHECK (true);

-- 7) Trigger function to write audit rows
CREATE OR REPLACE FUNCTION public.log_shift_assignment_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  actor uuid := auth.uid();
  v_action text;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_action := 'insert';
    INSERT INTO public.teamhub_shift_assignment_events
      (assignment_id, actor_user_id, action, before_json, after_json)
    VALUES (NEW.id, actor, v_action, NULL, to_jsonb(NEW));
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    -- Detect soft-delete transition
    IF OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL THEN
      v_action := 'soft_delete';
    ELSIF OLD.deleted_at IS NOT NULL AND NEW.deleted_at IS NULL THEN
      v_action := 'restore';
    ELSE
      v_action := 'update';
    END IF;
    INSERT INTO public.teamhub_shift_assignment_events
      (assignment_id, actor_user_id, action, before_json, after_json)
    VALUES (NEW.id, actor, v_action, to_jsonb(OLD), to_jsonb(NEW));
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.teamhub_shift_assignment_events
      (assignment_id, actor_user_id, action, before_json, after_json)
    VALUES (OLD.id, actor, 'delete', to_jsonb(OLD), NULL);
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_log_shift_assignment_event ON public.teamhub_shift_assignments;
CREATE TRIGGER trg_log_shift_assignment_event
AFTER INSERT OR UPDATE OR DELETE ON public.teamhub_shift_assignments
FOR EACH ROW EXECUTE FUNCTION public.log_shift_assignment_event();

-- 8) updated_at maintenance
DROP TRIGGER IF EXISTS trg_shift_assignments_updated_at ON public.teamhub_shift_assignments;
CREATE TRIGGER trg_shift_assignments_updated_at
BEFORE UPDATE ON public.teamhub_shift_assignments
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
