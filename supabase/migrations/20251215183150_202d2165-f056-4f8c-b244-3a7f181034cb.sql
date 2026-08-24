-- Create error_analyses table for AI-generated insights
CREATE TABLE public.error_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  error_log_id UUID REFERENCES public.client_error_logs(id) ON DELETE CASCADE,
  severity TEXT NOT NULL CHECK (severity IN ('critical', 'high', 'medium', 'low')),
  category TEXT CHECK (category IN ('auth', 'data', 'ui', 'network', 'unknown')),
  root_cause TEXT,
  suggested_fix TEXT,
  code_example TEXT,
  prevention_tips TEXT,
  is_resolved BOOLEAN DEFAULT false,
  resolved_by UUID REFERENCES public.profiles(id),
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.error_analyses ENABLE ROW LEVEL SECURITY;

-- Admins can view all analyses
CREATE POLICY "Admins can view error analyses"
ON public.error_analyses FOR SELECT
USING (get_user_permission_level(auth.uid()) >= 4);

-- Admins can update analyses (mark resolved)
CREATE POLICY "Admins can update error analyses"
ON public.error_analyses FOR UPDATE
USING (get_user_permission_level(auth.uid()) >= 4);

-- Service can insert analyses
CREATE POLICY "Service can insert error analyses"
ON public.error_analyses FOR INSERT
WITH CHECK (true);

-- Enable realtime for both tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.client_error_logs;
ALTER PUBLICATION supabase_realtime ADD TABLE public.error_analyses;

-- Create indexes for faster lookups
CREATE INDEX idx_error_analyses_error_log_id ON public.error_analyses(error_log_id);
CREATE INDEX idx_error_analyses_created_at ON public.error_analyses(created_at DESC);