-- Add haptic_enabled column to notification_preferences
ALTER TABLE public.notification_preferences 
ADD COLUMN haptic_enabled BOOLEAN NOT NULL DEFAULT true;