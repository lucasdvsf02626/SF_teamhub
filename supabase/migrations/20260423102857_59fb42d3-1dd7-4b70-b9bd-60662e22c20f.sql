ALTER TABLE public.sync_events DROP CONSTRAINT IF EXISTS sync_events_status_check;
ALTER TABLE public.sync_events ADD CONSTRAINT sync_events_status_check CHECK (status = ANY (ARRAY[
  'success','failed','skipped','partial','rejected','error'
]));