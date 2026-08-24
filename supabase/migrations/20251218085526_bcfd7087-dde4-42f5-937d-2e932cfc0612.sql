-- Create sync events table for monitoring
CREATE TABLE public.sync_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  direction TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  action TEXT NOT NULL CHECK (action IN ('create', 'update', 'skip')),
  status TEXT NOT NULL CHECK (status IN ('success', 'failed', 'skipped')),
  profile_email TEXT,
  profile_id UUID,
  source_system TEXT NOT NULL CHECK (source_system IN ('teamhub', 'hive')),
  target_system TEXT NOT NULL CHECK (target_system IN ('teamhub', 'hive')),
  error_message TEXT,
  response_code INTEGER,
  duration_ms INTEGER,
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Create indexes for efficient querying
CREATE INDEX idx_sync_events_created_at ON public.sync_events(created_at DESC);
CREATE INDEX idx_sync_events_status ON public.sync_events(status);
CREATE INDEX idx_sync_events_direction ON public.sync_events(direction);
CREATE INDEX idx_sync_events_profile_email ON public.sync_events(profile_email);

-- Enable RLS
ALTER TABLE public.sync_events ENABLE ROW LEVEL SECURITY;

-- Only admins can view sync events
CREATE POLICY "Admins can view sync events"
ON public.sync_events
FOR SELECT
USING (get_user_permission_level(auth.uid()) >= 4);

-- Service can insert sync events (for edge functions)
CREATE POLICY "Service can insert sync events"
ON public.sync_events
FOR INSERT
WITH CHECK (true);

-- Admins can delete old sync events
CREATE POLICY "Admins can delete sync events"
ON public.sync_events
FOR DELETE
USING (get_user_permission_level(auth.uid()) >= 4);