-- 1. Self-service profile updates may never change permission_level.
--    (Belt and braces: the guard_profile_privileged_columns trigger also
--     enforces this, plus payroll_id / employee_number / email / pin.)
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

CREATE POLICY "Users can update own profile"
ON public.profiles FOR UPDATE TO authenticated
USING (auth.uid() = id)
WITH CHECK (
  auth.uid() = id
  AND permission_level IS NOT DISTINCT FROM
      (SELECT p.permission_level FROM public.profiles p WHERE p.id = auth.uid())
);

-- 2. Notifications are system-generated only.
DROP POLICY IF EXISTS "Service can insert notifications" ON public.notifications;

CREATE POLICY "Only the backend can create notifications"
ON public.notifications FOR INSERT TO service_role
WITH CHECK (true);

-- 3. Profile version snapshots are system-generated only.
DROP POLICY IF EXISTS "Service can insert profile versions" ON public.profile_versions;

CREATE POLICY "Only the backend can write profile history"
ON public.profile_versions FOR INSERT TO service_role
WITH CHECK (true);