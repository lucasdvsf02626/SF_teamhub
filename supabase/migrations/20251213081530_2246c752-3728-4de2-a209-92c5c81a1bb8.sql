-- Add auto_signin_enabled column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN auto_signin_enabled boolean NOT NULL DEFAULT false;