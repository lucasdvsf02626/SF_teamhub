-- Create audit log table for tracking user activation events
CREATE TABLE public.user_activation_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL DEFAULT 'first_password_change',
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_activation_logs ENABLE ROW LEVEL SECURITY;

-- Users can insert their own activation log
CREATE POLICY "Users can insert own activation log"
ON public.user_activation_logs
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Admins can view all activation logs
CREATE POLICY "Admins can view activation logs"
ON public.user_activation_logs
FOR SELECT
USING (get_user_permission_level(auth.uid()) >= 4);

-- Create index for faster lookups
CREATE INDEX idx_activation_logs_user_id ON public.user_activation_logs(user_id);
CREATE INDEX idx_activation_logs_created_at ON public.user_activation_logs(created_at DESC);