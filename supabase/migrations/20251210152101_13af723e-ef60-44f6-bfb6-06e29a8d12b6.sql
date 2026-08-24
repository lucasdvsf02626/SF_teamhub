-- SF:Team Hub Database Schema
-- These tables work alongside the existing profiles table from The Hive

-- Sites configuration table
CREATE TABLE IF NOT EXISTS public.teamhub_sites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  address TEXT,
  latitude NUMERIC,
  longitude NUMERIC,
  radius_m INTEGER DEFAULT 150,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on sites
ALTER TABLE public.teamhub_sites ENABLE ROW LEVEL SECURITY;

-- Sites are readable by all authenticated users
CREATE POLICY "Sites are viewable by authenticated users"
ON public.teamhub_sites
FOR SELECT
TO authenticated
USING (true);

-- Attendance events table
CREATE TABLE IF NOT EXISTS public.teamhub_attendance_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  event_type TEXT NOT NULL CHECK (event_type IN ('sign_in', 'sign_out', 'break_start', 'break_end')),
  source TEXT NOT NULL CHECK (source IN ('tablet', 'mobile', 'web', 'admin')),
  site TEXT NOT NULL,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  location_metadata JSONB DEFAULT '{}'::jsonb,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create index for efficient querying by user and date
CREATE INDEX IF NOT EXISTS idx_teamhub_attendance_user_date
ON public.teamhub_attendance_events (user_id, recorded_at);

-- Enable RLS
ALTER TABLE public.teamhub_attendance_events ENABLE ROW LEVEL SECURITY;

-- Users can view their own attendance events
CREATE POLICY "Users can view own attendance events"
ON public.teamhub_attendance_events
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Users can create their own attendance events
CREATE POLICY "Users can create own attendance events"
ON public.teamhub_attendance_events
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Daily presence summary table
CREATE TABLE IF NOT EXISTS public.teamhub_daily_presence_summary (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  date DATE NOT NULL,
  primary_site TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('on_site', 'remote', 'leave', 'sick', 'off')),
  first_sign_in TIMESTAMPTZ,
  last_sign_out TIMESTAMPTZ,
  total_worked_minutes INTEGER DEFAULT 0,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, date)
);

-- Create index for efficient querying
CREATE INDEX IF NOT EXISTS idx_teamhub_presence_date_site
ON public.teamhub_daily_presence_summary (date, primary_site);

-- Enable RLS
ALTER TABLE public.teamhub_daily_presence_summary ENABLE ROW LEVEL SECURITY;

-- Users can view their own presence summary
CREATE POLICY "Users can view own presence summary"
ON public.teamhub_daily_presence_summary
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Profiles table for Team Hub (extends or mirrors The Hive profiles)
-- This stores user information accessible via API
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  first_name TEXT,
  surname TEXT,
  display_name TEXT,
  avatar_url TEXT,
  job_title TEXT,
  company TEXT,
  department TEXT,
  permission_level INTEGER DEFAULT 2,
  reports_to UUID,
  phone TEXT,
  bio TEXT,
  start_date DATE,
  birthday DATE,
  country_code TEXT,
  work_city TEXT,
  work_country_code TEXT,
  languages TEXT[],
  pin TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles are viewable by all authenticated users
CREATE POLICY "Profiles are viewable by authenticated users"
ON public.profiles
FOR SELECT
TO authenticated
USING (true);

-- Users can update their own profile (limited fields)
CREATE POLICY "Users can update own profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = id);

-- Users can insert their own profile
CREATE POLICY "Users can insert own profile"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

-- Function to handle new user signup - creates profile automatically
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, first_name, surname, display_name)
  VALUES (
    new.id,
    new.email,
    new.raw_user_meta_data ->> 'first_name',
    new.raw_user_meta_data ->> 'surname',
    COALESCE(new.raw_user_meta_data ->> 'display_name', new.raw_user_meta_data ->> 'first_name')
  );
  RETURN new;
END;
$$;

-- Trigger to create profile on user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Trigger for profile updates
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default sites
INSERT INTO public.teamhub_sites (code, name, address) VALUES
  ('ASHFORD', 'Ashford Factory', 'Unit 5, Industrial Estate, Ashford, Kent TN24 0XX'),
  ('LONDON', 'London Office', '123 Business Centre, London EC1A 1BB')
ON CONFLICT (code) DO NOTHING;