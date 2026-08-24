-- Phase 1: Clean up all existing data to start fresh
-- This makes The Hive the source of truth for user data

-- Disable sync trigger temporarily to prevent loop during cleanup
ALTER TABLE profiles DISABLE TRIGGER on_profile_sync_to_hive;

-- Delete all data from HR tables (order matters for foreign keys)
TRUNCATE TABLE certification_reminders_sent CASCADE;
TRUNCATE TABLE user_certifications CASCADE;
TRUNCATE TABLE return_to_work_forms CASCADE;
TRUNCATE TABLE teamhub_leave_requests CASCADE;
TRUNCATE TABLE teamhub_leave_balances CASCADE;
TRUNCATE TABLE teamhub_attendance_events CASCADE;
TRUNCATE TABLE teamhub_daily_presence_summary CASCADE;
TRUNCATE TABLE notifications CASCADE;
TRUNCATE TABLE notification_preferences CASCADE;
TRUNCATE TABLE push_subscriptions CASCADE;
TRUNCATE TABLE qr_tokens CASCADE;
TRUNCATE TABLE user_activation_logs CASCADE;
TRUNCATE TABLE pending_imports CASCADE;
TRUNCATE TABLE sync_events CASCADE;

-- Delete all profiles EXCEPT the Architect (lee@forzaindustries.com)
DELETE FROM profiles WHERE email != 'lee@forzaindustries.com';

-- Re-enable sync trigger
ALTER TABLE profiles ENABLE TRIGGER on_profile_sync_to_hive;