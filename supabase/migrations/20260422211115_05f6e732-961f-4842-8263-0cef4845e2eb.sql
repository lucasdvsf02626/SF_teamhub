
-- ============================================================
-- Hive bridge schema + canonical pattern reseed
-- ============================================================

-- 1) Allow explicit UTC timestamps on assignments (Hive SSoT for production times)
ALTER TABLE public.teamhub_shift_assignments
  ADD COLUMN IF NOT EXISTS start_at_utc timestamptz,
  ADD COLUMN IF NOT EXISTS end_at_utc timestamptz;

-- 2) Make pattern_id nullable (Hive may push arbitrary times without a matching pattern)
ALTER TABLE public.teamhub_shift_assignments
  ALTER COLUMN pattern_id DROP NOT NULL;

-- 3) Either a pattern OR explicit UTC times must be present
ALTER TABLE public.teamhub_shift_assignments
  DROP CONSTRAINT IF EXISTS chk_assignment_has_schedule;
ALTER TABLE public.teamhub_shift_assignments
  ADD CONSTRAINT chk_assignment_has_schedule
  CHECK (
    pattern_id IS NOT NULL
    OR (start_at_utc IS NOT NULL AND end_at_utc IS NOT NULL)
  );

-- 4) Partial unique index for Hive upsert by external_id
CREATE UNIQUE INDEX IF NOT EXISTS uniq_shift_assignment_hive_external_id
  ON public.teamhub_shift_assignments (external_id)
  WHERE source = 'hive_production_schedule' AND deleted_at IS NULL;

-- 5) Reseed canonical patterns
-- Repoint Pooja's existing assignment to a placeholder so we can drop old pattern.
-- We will fix it properly in the data step (Pooja → Shift 8-4) after migration.
UPDATE public.teamhub_shift_assignments
   SET pattern_id = NULL,
       start_at_utc = (effective_from::timestamp AT TIME ZONE 'Europe/London') + interval '8 hours',
       end_at_utc   = (effective_from::timestamp AT TIME ZONE 'Europe/London') + interval '16 hours 30 minutes'
 WHERE pattern_id IN (
   SELECT id FROM public.teamhub_shift_patterns
    WHERE name IN ('Production Day','Production Early','Production Late','Production Weekend')
 );

DELETE FROM public.teamhub_shift_patterns
 WHERE name IN ('Production Day','Production Early','Production Late','Production Weekend');

INSERT INTO public.teamhub_shift_patterns
  (name, description, start_time, end_time, days_of_week, expected_minutes, break_minutes, site_code, is_active)
VALUES
  ('Shift 6-2',  'Canonical early shift 06:00-14:00 Mon-Fri',  '06:00', '14:00', ARRAY[1,2,3,4,5], 480, 0, 'AXIOM', true),
  ('Shift 2-10', 'Canonical late shift 14:00-22:00 Mon-Fri',   '14:00', '22:00', ARRAY[1,2,3,4,5], 480, 0, 'AXIOM', true),
  ('Shift 8-4',  'Canonical day shift 08:00-16:00 Mon-Fri',    '08:00', '16:00', ARRAY[1,2,3,4,5], 480, 0, 'AXIOM', true),
  ('Shift 9-5',  'Canonical office shift 09:00-17:00 Mon-Fri', '09:00', '17:00', ARRAY[1,2,3,4,5], 480, 0, 'AXIOM', true),
  ('Weekend 8-4','Weekend shift 08:00-16:00 Sat-Sun',          '08:00', '16:00', ARRAY[0,6],       480, 0, 'AXIOM', true);

-- 6) Idempotency keys for inbound bridge
CREATE TABLE IF NOT EXISTS public.bridge_inbound_idempotency_keys (
  key text PRIMARY KEY,
  source text NOT NULL,
  request_hash text NOT NULL,
  response_status integer NOT NULL,
  response_json jsonb NOT NULL,
  first_seen_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT now() + interval '24 hours'
);
CREATE INDEX IF NOT EXISTS idx_bridge_idem_expires
  ON public.bridge_inbound_idempotency_keys (expires_at);

ALTER TABLE public.bridge_inbound_idempotency_keys ENABLE ROW LEVEL SECURITY;
-- service-role only; no policies = no public access

-- 7) Feature flags (DB-backed so Operations can toggle without redeploy)
CREATE TABLE IF NOT EXISTS public.teamhub_feature_flags (
  flag_key text PRIMARY KEY,
  enabled boolean NOT NULL DEFAULT false,
  description text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);

ALTER TABLE public.teamhub_feature_flags ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated can read feature flags" ON public.teamhub_feature_flags;
CREATE POLICY "Authenticated can read feature flags"
  ON public.teamhub_feature_flags FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "L4+ can update feature flags" ON public.teamhub_feature_flags;
CREATE POLICY "L4+ can update feature flags"
  ON public.teamhub_feature_flags FOR UPDATE
  TO authenticated
  USING (get_user_permission_level(auth.uid()) >= 4)
  WITH CHECK (get_user_permission_level(auth.uid()) >= 4);

DROP POLICY IF EXISTS "L4+ can insert feature flags" ON public.teamhub_feature_flags;
CREATE POLICY "L4+ can insert feature flags"
  ON public.teamhub_feature_flags FOR INSERT
  TO authenticated
  WITH CHECK (get_user_permission_level(auth.uid()) >= 4);

INSERT INTO public.teamhub_feature_flags (flag_key, enabled, description)
VALUES ('hive_bridge_live', false, 'When true, the "Import from Hive" button triggers a real bridge pull instead of the stub toast.')
ON CONFLICT (flag_key) DO NOTHING;
