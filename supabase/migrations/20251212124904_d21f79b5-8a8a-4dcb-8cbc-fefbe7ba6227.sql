-- Create leave settings table for company-wide configuration
CREATE TABLE public.teamhub_leave_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  leave_year_start_month integer NOT NULL DEFAULT 1,
  leave_year_start_day integer NOT NULL DEFAULT 1,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.teamhub_leave_settings ENABLE ROW LEVEL SECURITY;

-- Insert default settings (January 1st)
INSERT INTO public.teamhub_leave_settings (leave_year_start_month, leave_year_start_day) VALUES (1, 1);

-- RLS policies - only admins can manage settings
CREATE POLICY "Admins can view leave settings"
ON public.teamhub_leave_settings
FOR SELECT
USING (get_user_permission_level(auth.uid()) >= 4);

CREATE POLICY "Admins can update leave settings"
ON public.teamhub_leave_settings
FOR UPDATE
USING (get_user_permission_level(auth.uid()) >= 4);

-- Allow all authenticated users to view settings (needed for balance card)
CREATE POLICY "Authenticated users can view leave settings"
ON public.teamhub_leave_settings
FOR SELECT
USING (auth.uid() IS NOT NULL);