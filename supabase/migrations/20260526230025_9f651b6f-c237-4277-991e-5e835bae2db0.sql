ALTER TABLE public.teamhub_shift_assignments
  ADD COLUMN IF NOT EXISTS production_line_id uuid,
  ADD COLUMN IF NOT EXISTS production_line_name text;

CREATE INDEX IF NOT EXISTS idx_teamhub_shift_assignments_production_line_id
  ON public.teamhub_shift_assignments(production_line_id)
  WHERE production_line_id IS NOT NULL;

COMMENT ON COLUMN public.teamhub_shift_assignments.production_line_id IS
  'Hive production_lines.id snapshot. No FK — production_lines table lives in The Hive, not Team Hub.';
COMMENT ON COLUMN public.teamhub_shift_assignments.production_line_name IS
  'Display name snapshot from Hive at bridge time. Updated on every inbound upsert.';