-- Create leave balances table to track entitlements per employee per year
CREATE TABLE public.teamhub_leave_balances (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  year INTEGER NOT NULL,
  annual_leave_allowance INTEGER NOT NULL DEFAULT 25,
  sick_day_allowance INTEGER NOT NULL DEFAULT 10,
  carry_over_days INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  UNIQUE(user_id, year)
);

-- Enable RLS
ALTER TABLE public.teamhub_leave_balances ENABLE ROW LEVEL SECURITY;

-- Users can view their own balances
CREATE POLICY "Users can view own leave balances"
ON public.teamhub_leave_balances
FOR SELECT
USING (auth.uid() = user_id);

-- Managers can view all leave balances
CREATE POLICY "Managers can view all leave balances"
ON public.teamhub_leave_balances
FOR SELECT
USING (get_user_permission_level(auth.uid()) >= 3);

-- Admins can manage leave balances
CREATE POLICY "Admins can insert leave balances"
ON public.teamhub_leave_balances
FOR INSERT
WITH CHECK (get_user_permission_level(auth.uid()) >= 4);

CREATE POLICY "Admins can update leave balances"
ON public.teamhub_leave_balances
FOR UPDATE
USING (get_user_permission_level(auth.uid()) >= 4);

-- Index for faster lookups
CREATE INDEX idx_leave_balances_user_year ON public.teamhub_leave_balances(user_id, year);

-- Trigger for updated_at
CREATE TRIGGER update_leave_balances_updated_at
BEFORE UPDATE ON public.teamhub_leave_balances
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create a function to auto-create leave balance for new users
CREATE OR REPLACE FUNCTION public.create_default_leave_balance()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.teamhub_leave_balances (user_id, year, annual_leave_allowance, sick_day_allowance)
  VALUES (NEW.id, EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER, 25, 10)
  ON CONFLICT (user_id, year) DO NOTHING;
  RETURN NEW;
END;
$$;

-- Trigger to create default balance when profile is created
CREATE TRIGGER on_profile_created_create_leave_balance
AFTER INSERT ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.create_default_leave_balance();