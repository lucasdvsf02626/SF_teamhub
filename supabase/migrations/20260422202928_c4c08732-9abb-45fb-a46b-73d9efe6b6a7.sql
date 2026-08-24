
DROP POLICY IF EXISTS "Authenticated insert shift assignment audit" ON public.teamhub_shift_assignment_events;

CREATE POLICY "Service role inserts shift assignment audit"
  ON public.teamhub_shift_assignment_events FOR INSERT
  WITH CHECK (auth.role() = 'service_role');
