-- Enable pg_net extension for HTTP calls
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Update the trigger function to use pg_net instead of http extension
CREATE OR REPLACE FUNCTION public.trigger_sync_to_hive()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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

  -- Make async HTTP call to edge function using pg_net
  PERFORM net.http_post(
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
EXCEPTION
  WHEN OTHERS THEN
    -- Log the error but don't fail the transaction
    RAISE WARNING 'Sync to Hive failed: %', SQLERRM;
    RETURN NEW;
END;
$function$;