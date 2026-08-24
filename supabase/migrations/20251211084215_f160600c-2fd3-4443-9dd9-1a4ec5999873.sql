-- Add expected_start_time column to teamhub_sites table
ALTER TABLE public.teamhub_sites 
ADD COLUMN expected_start_time TIME NOT NULL DEFAULT '09:00:00';