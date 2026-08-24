-- Add archived_at column for soft delete
ALTER TABLE public.profiles
ADD COLUMN archived_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Add index for efficient filtering
CREATE INDEX idx_profiles_archived_at ON public.profiles(archived_at);

-- Update DELETE policy to only allow Architect
DROP POLICY IF EXISTS "Admins can delete profiles below their level" ON public.profiles;

CREATE POLICY "Architect can delete profiles"
ON public.profiles
FOR DELETE
USING (
  get_user_permission_level(auth.uid()) = 5 
  AND email != 'lee@forzaindustries.com'
);