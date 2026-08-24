ALTER TABLE sync_events DROP CONSTRAINT IF EXISTS sync_events_action_check;
ALTER TABLE sync_events ADD CONSTRAINT sync_events_action_check 
  CHECK (action = ANY (ARRAY[
    'create', 'update', 'skip', 
    'bulk_sync', 'scheduled_bulk_sync', 'sync_user', 'update_profile', 
    'create_user', 'update_existing_profile', 'update_new_profile'
  ]));