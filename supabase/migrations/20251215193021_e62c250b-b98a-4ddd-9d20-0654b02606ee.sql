-- Update the handle_new_user function to include payroll_id
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
    start_date,
    payroll_id
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
    (new.raw_user_meta_data ->> 'start_date')::date,
    new.raw_user_meta_data ->> 'payroll_id'
  );
  RETURN new;
END;
$$;