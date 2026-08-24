-- Add must_change_password column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN must_change_password boolean DEFAULT true;

-- Set existing users to false (they already have passwords)
UPDATE public.profiles SET must_change_password = false;