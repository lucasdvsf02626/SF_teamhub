-- Force all existing users to change their password on next login
UPDATE public.profiles
SET must_change_password = true
WHERE must_change_password IS NULL OR must_change_password = false;