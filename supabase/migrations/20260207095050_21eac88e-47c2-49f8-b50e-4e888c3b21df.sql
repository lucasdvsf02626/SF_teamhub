
-- Fix action constraint to accept all action names used by edge functions
ALTER TABLE sync_events DROP CONSTRAINT IF EXISTS sync_events_action_check;
ALTER TABLE sync_events ADD CONSTRAINT sync_events_action_check 
  CHECK (action = ANY (ARRAY[
    'create', 'update', 'skip', 
    'bulk_sync', 'sync_user', 'update_profile', 
    'create_user', 'update_existing_profile', 'update_new_profile'
  ]));

-- Fix status constraint to include 'partial'
ALTER TABLE sync_events DROP CONSTRAINT IF EXISTS sync_events_status_check;
ALTER TABLE sync_events ADD CONSTRAINT sync_events_status_check 
  CHECK (status = ANY (ARRAY['success', 'failed', 'skipped', 'partial']));
