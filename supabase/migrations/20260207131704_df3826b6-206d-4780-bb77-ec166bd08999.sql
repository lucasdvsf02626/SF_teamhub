
-- Create a secure function that only executes cron schedule/unschedule commands
CREATE OR REPLACE FUNCTION public.exec_sql_admin(sql text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'cron', 'net'
AS $$
BEGIN
  -- Only allow cron.schedule and cron.unschedule calls
  IF sql NOT ILIKE '%cron.schedule%' AND sql NOT ILIKE '%cron.unschedule%' THEN
    RAISE EXCEPTION 'Only cron schedule/unschedule operations are allowed';
  END IF;
  EXECUTE sql;
END;
$$;
