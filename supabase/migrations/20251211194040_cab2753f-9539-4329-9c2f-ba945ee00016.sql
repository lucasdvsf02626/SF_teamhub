-- Add DELETE policy for profiles table
CREATE POLICY "Admins can delete profiles below their level"
ON public.profiles
FOR DELETE
USING (
  get_user_permission_level(auth.uid()) >= 4 
  AND (permission_level IS NULL OR permission_level < get_user_permission_level(auth.uid()))
  AND email != 'lee@forzaindustries.com'
);