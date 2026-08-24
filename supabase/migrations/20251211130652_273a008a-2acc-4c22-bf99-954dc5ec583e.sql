-- Add sync_source column to track origin of profile updates
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS sync_source text;

-- Update trigger function to check sync_source and prevent loops
CREATE OR REPLACE FUNCTION public.trigger_sync_to_hive()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  sync_url TEXT;
  anon_key TEXT;
  action_type TEXT;
BEGIN
  -- LOOP PREVENTION: Skip if this update came from The Hive
  IF NEW.sync_source = 'hive' THEN
    -- Clear sync_source so future local edits will sync
    NEW.sync_source := NULL;
    RETURN NEW;
  END IF;

  -- Determine action type
  IF TG_OP = 'INSERT' THEN
    action_type := 'create';
  ELSE
    action_type := 'update';
  END IF;

  -- Only sync internal staff (permission_level >= 2)
  IF NEW.permission_level IS NULL OR NEW.permission_level < 2 THEN
    RETURN NEW;
  END IF;

  -- Skip if email is not set (required for sync)
  IF NEW.email IS NULL THEN
    RETURN NEW;
  END IF;

  -- Build the edge function URL
  sync_url := 'https://tiornvtwymjhsrrpbwvr.supabase.co/functions/v1/sync-to-hive';
  anon_key := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRpb3JudnR3eW1qaHNycnBid3ZyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUzNzY4OTQsImV4cCI6MjA4MDk1Mjg5NH0.rqlSfpaJTFuu0_ADldeS-8KH7Z5uDTKmrX6SiPixb8k';

  -- Make async HTTP call to edge function
  PERFORM extensions.http_post(
    url := sync_url,
    body := jsonb_build_object(
      'action', action_type,
      'profile_id', NEW.id::text
    ),
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || anon_key
    )
  );

  RETURN NEW;
END;
$$;

-- Change trigger to BEFORE so we can modify NEW.sync_source
DROP TRIGGER IF EXISTS on_profile_sync_to_hive ON public.profiles;

CREATE TRIGGER on_profile_sync_to_hive
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_sync_to_hive();