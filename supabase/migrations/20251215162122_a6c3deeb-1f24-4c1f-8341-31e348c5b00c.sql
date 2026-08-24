
-- =====================================================
-- SECURITY FIX: Implement proper RLS scoping
-- =====================================================

-- Step 1: Create helper function to check if user is a direct report
CREATE OR REPLACE FUNCTION public.is_direct_report(manager_id uuid, employee_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = employee_id
      AND reports_to = manager_id
  )
$$;

-- Step 2: Create helper function to check if current user can view employee data
CREATE OR REPLACE FUNCTION public.can_view_employee_data(employee_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    -- User can view their own data
    auth.uid() = employee_user_id
    -- OR user is admin (level 4+) - can see everything
    OR get_user_permission_level(auth.uid()) >= 4
    -- OR user is manager (level 3) AND employee is their direct report
    OR (
      get_user_permission_level(auth.uid()) = 3
      AND is_direct_report(auth.uid(), employee_user_id)
    )
$$;

-- =====================================================
-- Fix #1: PROFILES TABLE
-- Keep viewable for team directory but add scoped access for full data
-- =====================================================
-- Note: We keep "Profiles are viewable by authenticated users" for basic directory
-- The frontend should limit which fields are displayed for non-managers

-- =====================================================
-- Fix #3: LEAVE REQUESTS - Scope to direct reports
-- =====================================================

-- Drop overly permissive policies
DROP POLICY IF EXISTS "Authenticated users can view approved leave requests" ON public.teamhub_leave_requests;
DROP POLICY IF EXISTS "Managers can update leave requests" ON public.teamhub_leave_requests;
DROP POLICY IF EXISTS "Users can view own leave requests" ON public.teamhub_leave_requests;

-- Users can view their own requests
CREATE POLICY "Users can view own leave requests" ON public.teamhub_leave_requests
FOR SELECT USING (auth.uid() = user_id);

-- Managers can view their direct reports' requests
CREATE POLICY "Managers can view direct reports leave requests" ON public.teamhub_leave_requests
FOR SELECT USING (
  get_user_permission_level(auth.uid()) = 3 
  AND is_direct_report(auth.uid(), user_id)
);

-- Admins can view all requests
CREATE POLICY "Admins can view all leave requests" ON public.teamhub_leave_requests
FOR SELECT USING (get_user_permission_level(auth.uid()) >= 4);

-- Managers can update their direct reports' requests only
CREATE POLICY "Managers can update direct reports leave requests" ON public.teamhub_leave_requests
FOR UPDATE USING (
  get_user_permission_level(auth.uid()) = 3 
  AND is_direct_report(auth.uid(), user_id)
);

-- Admins can update all requests
CREATE POLICY "Admins can update all leave requests" ON public.teamhub_leave_requests
FOR UPDATE USING (get_user_permission_level(auth.uid()) >= 4);

-- =====================================================
-- Fix #4: RETURN TO WORK FORMS - Scope to direct reports
-- =====================================================

-- Drop overly permissive policies
DROP POLICY IF EXISTS "Managers can view all RTW forms" ON public.return_to_work_forms;
DROP POLICY IF EXISTS "Managers can update RTW forms" ON public.return_to_work_forms;

-- Managers can view their direct reports' RTW forms
CREATE POLICY "Managers can view direct reports RTW forms" ON public.return_to_work_forms
FOR SELECT USING (
  get_user_permission_level(auth.uid()) = 3 
  AND is_direct_report(auth.uid(), user_id)
);

-- Admins can view all RTW forms
CREATE POLICY "Admins can view all RTW forms" ON public.return_to_work_forms
FOR SELECT USING (get_user_permission_level(auth.uid()) >= 4);

-- Managers can update their direct reports' RTW forms
CREATE POLICY "Managers can update direct reports RTW forms" ON public.return_to_work_forms
FOR UPDATE USING (
  get_user_permission_level(auth.uid()) = 3 
  AND is_direct_report(auth.uid(), user_id)
);

-- Admins can update all RTW forms
CREATE POLICY "Admins can update all RTW forms" ON public.return_to_work_forms
FOR UPDATE USING (get_user_permission_level(auth.uid()) >= 4);

-- =====================================================
-- Fix #5: ATTENDANCE EVENTS - Scope to direct reports
-- =====================================================

-- Drop overly permissive policy
DROP POLICY IF EXISTS "Managers can view team attendance" ON public.teamhub_attendance_events;

-- Managers can view their direct reports' attendance
CREATE POLICY "Managers can view direct reports attendance" ON public.teamhub_attendance_events
FOR SELECT USING (
  get_user_permission_level(auth.uid()) = 3 
  AND is_direct_report(auth.uid(), user_id)
);

-- Admins can view all attendance
CREATE POLICY "Admins can view all attendance" ON public.teamhub_attendance_events
FOR SELECT USING (get_user_permission_level(auth.uid()) >= 4);

-- =====================================================
-- Fix #6: DAILY PRESENCE SUMMARY - Scope to direct reports
-- =====================================================

-- Drop overly permissive policies
DROP POLICY IF EXISTS "Authenticated users can view team presence" ON public.teamhub_daily_presence_summary;
DROP POLICY IF EXISTS "Users can view own presence summary" ON public.teamhub_daily_presence_summary;

-- Users can view their own presence
CREATE POLICY "Users can view own presence" ON public.teamhub_daily_presence_summary
FOR SELECT USING (auth.uid() = user_id);

-- Managers can view their direct reports' presence
CREATE POLICY "Managers can view direct reports presence" ON public.teamhub_daily_presence_summary
FOR SELECT USING (
  get_user_permission_level(auth.uid()) = 3 
  AND is_direct_report(auth.uid(), user_id)
);

-- Admins can view all presence
CREATE POLICY "Admins can view all presence" ON public.teamhub_daily_presence_summary
FOR SELECT USING (get_user_permission_level(auth.uid()) >= 4);
