-- Trigger function: dispatch profile change to CPI sync dispatcher
CREATE OR REPLACE FUNCTION public.trigger_cpi_sync_dispatch()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  dispatcher_url TEXT;
  anon_key TEXT;
  backfill_flag TEXT;
BEGIN
  -- Suppress during backfill (per-transaction GUC). current_setting with
  -- missing_ok=true returns NULL when unset, so this is safe.
  BEGIN
    backfill_flag := current_setting('app.backfill_in_progress', true);
  EXCEPTION WHEN OTHERS THEN
    backfill_flag := NULL;
  END;

  IF backfill_flag = 'true' THEN
    RETURN NEW;
  END IF;

  -- Skip rows without an email (nothing to map to a CPI identity).
  IF NEW.email IS NULL THEN
    RETURN NEW;
  END IF;

  dispatcher_url := 'https://tiornvtwymjhsrrpbwvr.supabase.co/functions/v1/teamhub-cpi-sync-dispatcher';
  anon_key := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRpb3JudnR3eW1qaHNycnBid3ZyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUzNzY4OTQsImV4cCI6MjA4MDk1Mjg5NH0.rqlSfpaJTFuu0_ADldeS-8KH7Z5uDTKmrX6SiPixb8k';

  -- Fire-and-forget via pg_net. Failures must not break the profile write.
  BEGIN
    PERFORM net.http_post(
      url := dispatcher_url,
      body := jsonb_build_object(
        'teamhub_user_id', NEW.id::text,
        'email', NEW.email,
        'display_name', NEW.display_name
      ),
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || anon_key
      )
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'CPI sync dispatch failed for profile %: %', NEW.id, SQLERRM;
  END;

  RETURN NEW;
END;
$$;

-- Drop any prior version then attach the trigger.
DROP TRIGGER IF EXISTS trg_profiles_cpi_sync_dispatch ON public.profiles;

CREATE TRIGGER trg_profiles_cpi_sync_dispatch
AFTER INSERT OR UPDATE OF email, display_name ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.trigger_cpi_sync_dispatch();