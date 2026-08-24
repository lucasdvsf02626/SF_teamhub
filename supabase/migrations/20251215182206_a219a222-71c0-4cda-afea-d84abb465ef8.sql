-- Create table for centralized client-side error logging
CREATE TABLE public.client_error_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  error_message text NOT NULL,
  error_stack text,
  component_stack text,
  url text NOT NULL,
  user_agent text,
  context text NOT NULL DEFAULT 'general',
  extra_data jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.client_error_logs ENABLE ROW LEVEL SECURITY;

-- Allow anyone to insert errors (errors can happen before/without auth)
CREATE POLICY "Anyone can log errors"
ON public.client_error_logs
FOR INSERT
WITH CHECK (true);

-- Only admins can view error logs
CREATE POLICY "Admins can view error logs"
ON public.client_error_logs
FOR SELECT
USING (get_user_permission_level(auth.uid()) >= 4);

-- Only admins can delete error logs
CREATE POLICY "Admins can delete error logs"
ON public.client_error_logs
FOR DELETE
USING (get_user_permission_level(auth.uid()) >= 4);

-- Create index for efficient queries
CREATE INDEX idx_client_error_logs_created_at ON public.client_error_logs(created_at DESC);
CREATE INDEX idx_client_error_logs_context ON public.client_error_logs(context);
CREATE INDEX idx_client_error_logs_user_id ON public.client_error_logs(user_id);