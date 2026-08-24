-- Create Bradford Score settings table
CREATE TABLE public.teamhub_bradford_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  threshold_low INTEGER NOT NULL DEFAULT 50,
  threshold_medium INTEGER NOT NULL DEFAULT 200,
  threshold_alert INTEGER NOT NULL DEFAULT 200,
  alert_email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.teamhub_bradford_settings ENABLE ROW LEVEL SECURITY;

-- Only admins can view/manage settings
CREATE POLICY "Admins can view bradford settings"
ON public.teamhub_bradford_settings
FOR SELECT
USING (get_user_permission_level(auth.uid()) >= 4);

CREATE POLICY "Admins can insert bradford settings"
ON public.teamhub_bradford_settings
FOR INSERT
WITH CHECK (get_user_permission_level(auth.uid()) >= 4);

CREATE POLICY "Admins can update bradford settings"
ON public.teamhub_bradford_settings
FOR UPDATE
USING (get_user_permission_level(auth.uid()) >= 4);

-- Insert default settings
INSERT INTO public.teamhub_bradford_settings (threshold_low, threshold_medium, threshold_alert)
VALUES (50, 200, 200);

-- Add bradford_alert_enabled to notification_preferences
ALTER TABLE public.notification_preferences 
ADD COLUMN bradford_alert_enabled BOOLEAN NOT NULL DEFAULT true;

-- Add trigger for updated_at on bradford settings
CREATE TRIGGER update_teamhub_bradford_settings_updated_at
BEFORE UPDATE ON public.teamhub_bradford_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();