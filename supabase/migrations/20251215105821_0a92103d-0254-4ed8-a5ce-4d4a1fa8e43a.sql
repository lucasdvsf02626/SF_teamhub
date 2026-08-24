-- Update the handle_new_user trigger to include start_date
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = 'public'
AS $$
BEGIN
  INSERT INTO public.profiles (
    id, 
    email, 
    first_name, 
    surname, 
    display_name,
    department,
    job_title,
    permission_level,
    reports_to,
    start_date
  )
  VALUES (
    new.id,
    new.email,
    new.raw_user_meta_data ->> 'first_name',
    new.raw_user_meta_data ->> 'surname',
    COALESCE(new.raw_user_meta_data ->> 'display_name', new.raw_user_meta_data ->> 'first_name'),
    new.raw_user_meta_data ->> 'department',
    new.raw_user_meta_data ->> 'job_title',
    COALESCE((new.raw_user_meta_data ->> 'permission_level')::integer, 2),
    (new.raw_user_meta_data ->> 'reports_to')::uuid,
    (new.raw_user_meta_data ->> 'start_date')::date
  );
  RETURN new;
END;
$$;

-- Backfill missing start dates from pending_imports for already-activated users
UPDATE profiles p
SET start_date = pi.start_date
FROM pending_imports pi
WHERE pi.email = p.email
  AND pi.status = 'activated'
  AND p.start_date IS NULL
  AND pi.start_date IS NOT NULL;