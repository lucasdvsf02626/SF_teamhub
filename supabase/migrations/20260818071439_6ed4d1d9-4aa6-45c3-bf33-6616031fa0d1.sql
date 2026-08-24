-- 1. Replace the blanket "everyone reads everything" SELECT policy
DROP POLICY IF EXISTS "Profiles are viewable by authenticated users" ON public.profiles;

CREATE POLICY "Users can view their own profile"
ON public.profiles FOR SELECT TO authenticated
USING (id = auth.uid());

CREATE POLICY "Managers can view their direct reports"
ON public.profiles FOR SELECT TO authenticated
USING (reports_to = auth.uid());

CREATE POLICY "Admins can view all profiles"
ON public.profiles FOR SELECT TO authenticated
USING (public.get_user_permission_level(auth.uid()) >= 4);

-- 2. Minimal, non-sensitive staff directory for everyone else.
--    Runs with the view owner's rights so it bypasses the row policies above,
--    but can only ever expose the columns listed here.
CREATE OR REPLACE VIEW public.staff_directory
WITH (security_invoker = false, security_barrier = true) AS
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
  to_char(p.birthday, 'MM-DD') AS birthday_md
FROM public.profiles p
WHERE p.archived_at IS NULL
  AND COALESCE(p.permission_level, 1) >= 2;

REVOKE ALL ON public.staff_directory FROM PUBLIC, anon;
GRANT SELECT ON public.staff_directory TO authenticated;
GRANT ALL ON public.staff_directory TO service_role;

-- 3. Block self-service privilege escalation and tampering with synced fields.
CREATE OR REPLACE FUNCTION public.guard_profile_privileged_columns()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  actor uuid := auth.uid();
BEGIN
  -- Backend sync / service_role has no auth.uid(): let it through.
  IF actor IS NULL THEN
    RETURN NEW;
  END IF;

  -- Admins (L4+) may change privileged fields.
  IF public.get_user_permission_level(actor) >= 4 THEN
    RETURN NEW;
  END IF;

  IF NEW.id IS DISTINCT FROM OLD.id
     OR NEW.permission_level IS DISTINCT FROM OLD.permission_level
     OR NEW.reports_to IS DISTINCT FROM OLD.reports_to
     OR NEW.email IS DISTINCT FROM OLD.email
     OR NEW.payroll_id IS DISTINCT FROM OLD.payroll_id
     OR NEW.employee_number IS DISTINCT FROM OLD.employee_number
     OR NEW.archived_at IS DISTINCT FROM OLD.archived_at
     OR NEW.default_pay_code_id IS DISTINCT FROM OLD.default_pay_code_id
  THEN
    RAISE EXCEPTION 'Not permitted: privileged profile fields can only be changed by an administrator';
  END IF;

  -- must_change_password may only ever be cleared, never re-armed, by the user.
  IF NEW.must_change_password IS DISTINCT FROM OLD.must_change_password
     AND COALESCE(NEW.must_change_password, false) = true
  THEN
    RAISE EXCEPTION 'Not permitted: must_change_password can only be set by an administrator';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS guard_profile_privileged_columns ON public.profiles;
CREATE TRIGGER guard_profile_privileged_columns
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.guard_profile_privileged_columns();