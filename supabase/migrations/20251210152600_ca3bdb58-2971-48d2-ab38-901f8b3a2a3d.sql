-- Create security definer function to check permission level
CREATE OR REPLACE FUNCTION public.get_user_permission_level(user_id uuid)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(permission_level, 1)
  FROM public.profiles
  WHERE id = user_id
$$;

-- Allow admins (level 4+) to update any profile's PIN
CREATE POLICY "Admins can update any profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (public.get_user_permission_level(auth.uid()) >= 4)
WITH CHECK (public.get_user_permission_level(auth.uid()) >= 4);

-- Allow managers (level 3+) to view attendance events for their reports
CREATE POLICY "Managers can view team attendance"
ON public.teamhub_attendance_events
FOR SELECT
TO authenticated
USING (public.get_user_permission_level(auth.uid()) >= 3);

-- Allow managers to view team presence summaries
CREATE POLICY "Managers can view team presence"
ON public.teamhub_daily_presence_summary
FOR SELECT
TO authenticated
USING (public.get_user_permission_level(auth.uid()) >= 3);