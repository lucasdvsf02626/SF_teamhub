-- Update RLS policy for leave requests to allow all authenticated users to view approved requests
DROP POLICY IF EXISTS "Managers can view all leave requests" ON public.teamhub_leave_requests;

-- Create policy allowing all authenticated users to view approved leave requests
CREATE POLICY "Authenticated users can view approved leave requests" 
ON public.teamhub_leave_requests 
FOR SELECT 
USING (auth.uid() IS NOT NULL AND (auth.uid() = user_id OR status = 'approved' OR get_user_permission_level(auth.uid()) >= 3));