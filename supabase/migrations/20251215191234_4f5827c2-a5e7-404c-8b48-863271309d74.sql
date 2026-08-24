-- Add payroll_id to profiles table
ALTER TABLE public.profiles 
ADD COLUMN payroll_id text;