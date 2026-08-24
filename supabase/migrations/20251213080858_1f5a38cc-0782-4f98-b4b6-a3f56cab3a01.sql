-- Drop the existing manager-only policy
DROP POLICY IF EXISTS "Managers can view team presence" ON public.teamhub_daily_presence_summary;

-- Create a new policy allowing all authenticated users to view team presence
CREATE POLICY "Authenticated users can view team presence" 
ON public.teamhub_daily_presence_summary 
FOR SELECT 
USING (auth.uid() IS NOT NULL);