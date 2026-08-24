-- Create pending_imports staging table for bulk user imports
CREATE TABLE public.pending_imports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  payroll_id TEXT UNIQUE,
  employer TEXT,
  first_name TEXT NOT NULL,
  surname TEXT NOT NULL,
  date_of_birth DATE,
  job_title TEXT,
  department TEXT,
  start_date DATE,
  notes TEXT,
  email TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  activated_profile_id UUID REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES public.profiles(id)
);

-- Enable RLS
ALTER TABLE public.pending_imports ENABLE ROW LEVEL SECURITY;

-- Only admins can manage pending imports
CREATE POLICY "Admins can manage pending imports"
ON public.pending_imports
FOR ALL
USING (get_user_permission_level(auth.uid()) >= 4);

-- Create trigger for updated_at
CREATE TRIGGER update_pending_imports_updated_at
BEFORE UPDATE ON public.pending_imports
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();