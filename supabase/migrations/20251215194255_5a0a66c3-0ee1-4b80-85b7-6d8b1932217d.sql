-- Enable auto_signin by default for new users
ALTER TABLE public.profiles 
ALTER COLUMN auto_signin_enabled SET DEFAULT true;

-- Update existing users who have never explicitly disabled it (still at default false)
-- Only update users who are internal staff (permission_level >= 2)
UPDATE public.profiles 
SET auto_signin_enabled = true 
WHERE auto_signin_enabled = false 
  AND permission_level >= 2;