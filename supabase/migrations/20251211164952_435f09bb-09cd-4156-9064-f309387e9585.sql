-- Create enum for certification types
CREATE TYPE certification_type AS ENUM (
  'fire_marshal',
  'first_aider',
  'forklift_license'
);

-- Create user_certifications table
CREATE TABLE public.user_certifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  certification_type certification_type NOT NULL,
  certificate_number TEXT,
  issued_date DATE,
  expiry_date DATE NOT NULL,
  issuing_authority TEXT,
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES public.profiles(id)
);

-- Unique constraint: one active certification of each type per user
CREATE UNIQUE INDEX unique_active_certification 
ON public.user_certifications (user_id, certification_type) 
WHERE is_active = true;

-- Create certification_reminders_sent table to prevent duplicate notifications
CREATE TABLE public.certification_reminders_sent (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  certification_id UUID NOT NULL REFERENCES public.user_certifications(id) ON DELETE CASCADE,
  reminder_type TEXT NOT NULL,
  sent_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(certification_id, reminder_type)
);

-- Enable RLS
ALTER TABLE public.user_certifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.certification_reminders_sent ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_certifications
CREATE POLICY "Users can view own certifications"
ON public.user_certifications
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Managers can view all certifications"
ON public.user_certifications
FOR SELECT
USING (public.get_user_permission_level(auth.uid()) >= 3);

CREATE POLICY "Admins can insert certifications"
ON public.user_certifications
FOR INSERT
WITH CHECK (public.get_user_permission_level(auth.uid()) >= 4);

CREATE POLICY "Admins can update certifications"
ON public.user_certifications
FOR UPDATE
USING (public.get_user_permission_level(auth.uid()) >= 4);

CREATE POLICY "Admins can delete certifications"
ON public.user_certifications
FOR DELETE
USING (public.get_user_permission_level(auth.uid()) >= 4);

-- RLS Policies for certification_reminders_sent (service/admin only)
CREATE POLICY "Admins can manage reminders"
ON public.certification_reminders_sent
FOR ALL
USING (public.get_user_permission_level(auth.uid()) >= 4);

-- Trigger for updated_at
CREATE TRIGGER update_user_certifications_updated_at
BEFORE UPDATE ON public.user_certifications
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();