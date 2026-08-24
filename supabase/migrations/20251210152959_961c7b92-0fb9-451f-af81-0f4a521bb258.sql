-- Function to update daily presence summary when attendance events occur
CREATE OR REPLACE FUNCTION public.update_daily_presence_summary()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  event_date DATE;
  existing_summary UUID;
  first_sign_in_time TIMESTAMPTZ;
  total_minutes INTEGER;
BEGIN
  -- Get the date from the event
  event_date := DATE(NEW.recorded_at);
  
  -- Check if a summary already exists for this user and date
  SELECT id, first_sign_in INTO existing_summary, first_sign_in_time
  FROM teamhub_daily_presence_summary
  WHERE user_id = NEW.user_id AND date = event_date;
  
  IF NEW.event_type = 'sign_in' THEN
    IF existing_summary IS NULL THEN
      -- Create new summary on first sign in of the day
      INSERT INTO teamhub_daily_presence_summary (
        user_id,
        date,
        primary_site,
        status,
        first_sign_in,
        total_worked_minutes,
        generated_at
      ) VALUES (
        NEW.user_id,
        event_date,
        NEW.site,
        'on_site',
        NEW.recorded_at,
        0,
        NOW()
      );
    ELSE
      -- Update status to on_site (coming back from break or re-signing in)
      UPDATE teamhub_daily_presence_summary
      SET 
        status = 'on_site',
        generated_at = NOW()
      WHERE user_id = NEW.user_id AND date = event_date;
    END IF;
    
  ELSIF NEW.event_type = 'sign_out' THEN
    IF existing_summary IS NOT NULL THEN
      -- Calculate total worked minutes from first sign in
      IF first_sign_in_time IS NOT NULL THEN
        total_minutes := EXTRACT(EPOCH FROM (NEW.recorded_at - first_sign_in_time)) / 60;
      ELSE
        total_minutes := 0;
      END IF;
      
      -- Update the summary with sign out time and calculated duration
      UPDATE teamhub_daily_presence_summary
      SET 
        status = 'off',
        last_sign_out = NEW.recorded_at,
        total_worked_minutes = GREATEST(total_minutes, 0),
        generated_at = NOW()
      WHERE user_id = NEW.user_id AND date = event_date;
    END IF;
    
  ELSIF NEW.event_type = 'break_start' THEN
    -- Mark as temporarily away but keep the record
    UPDATE teamhub_daily_presence_summary
    SET 
      status = 'remote',  -- Using remote as "on break" indicator
      generated_at = NOW()
    WHERE user_id = NEW.user_id AND date = event_date;
    
  ELSIF NEW.event_type = 'break_end' THEN
    -- Mark as back on site
    UPDATE teamhub_daily_presence_summary
    SET 
      status = 'on_site',
      generated_at = NOW()
    WHERE user_id = NEW.user_id AND date = event_date;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger on attendance events
DROP TRIGGER IF EXISTS trigger_update_presence_summary ON teamhub_attendance_events;
CREATE TRIGGER trigger_update_presence_summary
  AFTER INSERT ON teamhub_attendance_events
  FOR EACH ROW
  EXECUTE FUNCTION public.update_daily_presence_summary();

-- Allow the system to insert/update presence summaries (for the trigger)
CREATE POLICY "System can manage presence summaries"
ON public.teamhub_daily_presence_summary
FOR ALL
TO authenticated
USING (true)
WITH CHECK (auth.uid() = user_id);