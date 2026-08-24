
-- Table to persist the sync schedule settings
CREATE TABLE public.sync_schedule_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cron_interval text NOT NULL DEFAULT '*/15 * * * *',
  interval_label text NOT NULL DEFAULT 'Every 15 minutes',
  is_enabled boolean NOT NULL DEFAULT true,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES public.profiles(id)
);

ALTER TABLE public.sync_schedule_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view sync schedule" ON public.sync_schedule_settings
  FOR SELECT USING (get_user_permission_level(auth.uid()) >= 4);

CREATE POLICY "Admins can update sync schedule" ON public.sync_schedule_settings
  FOR UPDATE USING (get_user_permission_level(auth.uid()) >= 4);

CREATE POLICY "Admins can insert sync schedule" ON public.sync_schedule_settings
  FOR INSERT WITH CHECK (get_user_permission_level(auth.uid()) >= 4);

-- Seed with default row
INSERT INTO public.sync_schedule_settings (cron_interval, interval_label, is_enabled)
VALUES ('*/15 * * * *', 'Every 15 minutes', true);
