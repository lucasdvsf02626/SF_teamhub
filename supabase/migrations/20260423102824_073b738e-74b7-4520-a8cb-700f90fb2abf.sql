ALTER TABLE public.sync_events DROP CONSTRAINT IF EXISTS sync_events_action_check;
ALTER TABLE public.sync_events ADD CONSTRAINT sync_events_action_check CHECK (action = ANY (ARRAY[
  'create','update','skip','bulk_sync','scheduled_bulk_sync','sync_user','update_profile',
  'create_user','update_existing_profile','update_new_profile',
  'bridge_shift_assignment_auth','bridge_shift_assignment_upsert','bridge_shift_assignment_delete'
]));