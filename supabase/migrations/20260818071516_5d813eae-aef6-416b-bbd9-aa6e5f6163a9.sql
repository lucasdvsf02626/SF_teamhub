DROP VIEW IF EXISTS public.staff_directory;

CREATE OR REPLACE FUNCTION public.get_staff_directory()
RETURNS TABLE (
  id uuid,
  display_name text,
  first_name text,
  surname text,
  avatar_url text,
  job_title text,
  department text,
  department_id uuid,
  reports_to uuid,
  start_date date,
  bio text,
  birthday_md text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    p.id,
    p.display_name,
    p.first_name,
    p.surname,
    p.avatar_url,
    p.job_title,
    p.department,
    p.department_id,
    p.reports_to,
    p.start_date,
    p.bio,
    to_char(p.birthday, 'MM-DD')
  FROM public.profiles p
  WHERE p.archived_at IS NULL
    AND COALESCE(p.permission_level, 1) >= 2
    AND auth.uid() IS NOT NULL
  ORDER BY p.display_name NULLS LAST;
$$;

REVOKE ALL ON FUNCTION public.get_staff_directory() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_staff_directory() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_staff_directory() TO service_role;