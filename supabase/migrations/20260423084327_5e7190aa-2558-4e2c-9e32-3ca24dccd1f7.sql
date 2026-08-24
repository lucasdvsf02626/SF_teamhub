ALTER TABLE public.teamhub_shift_assignments
ADD COLUMN IF NOT EXISTS bridged_at timestamptz NULL;

COMMENT ON COLUMN public.teamhub_shift_assignments.bridged_at IS
'NULL = manual seed via admin CRUD UI. Non-NULL = delivered by teamhub-shift-assignment-bridge-in from a real Hive emission at this timestamp.';

CREATE INDEX IF NOT EXISTS idx_shift_assignments_bridged_at
ON public.teamhub_shift_assignments (bridged_at)
WHERE bridged_at IS NOT NULL;