-- Add RLS policies for admins to manage sites
CREATE POLICY "Admins can insert sites"
ON public.teamhub_sites
FOR INSERT
WITH CHECK (public.get_user_permission_level(auth.uid()) >= 4);

CREATE POLICY "Admins can update sites"
ON public.teamhub_sites
FOR UPDATE
USING (public.get_user_permission_level(auth.uid()) >= 4);

CREATE POLICY "Admins can delete sites"
ON public.teamhub_sites
FOR DELETE
USING (public.get_user_permission_level(auth.uid()) >= 4);

-- Create notification preferences table
CREATE TABLE public.notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  email_enabled BOOLEAN NOT NULL DEFAULT true,
  push_enabled BOOLEAN NOT NULL DEFAULT true,
  leave_submitted BOOLEAN NOT NULL DEFAULT true,
  leave_approved BOOLEAN NOT NULL DEFAULT true,
  leave_rejected BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

-- RLS policies for notification_preferences
CREATE POLICY "Users can view own notification preferences"
ON public.notification_preferences
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own notification preferences"
ON public.notification_preferences
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own notification preferences"
ON public.notification_preferences
FOR UPDATE
USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_notification_preferences_updated_at
BEFORE UPDATE ON public.notification_preferences
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();