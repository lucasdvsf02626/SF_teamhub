-- 1. Create service tier configuration table
CREATE TABLE public.service_tier_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  min_years integer NOT NULL,
  max_years integer,
  tier_name text NOT NULL,
  tier_color text NOT NULL,
  base_annual_leave integer NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.service_tier_config ENABLE ROW LEVEL SECURITY;

-- Policies for service tier config
CREATE POLICY "Anyone can view service tiers"
ON public.service_tier_config FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can manage service tiers"
ON public.service_tier_config FOR ALL
USING (get_user_permission_level(auth.uid()) >= 4);

-- Seed the tier data from the uploaded image
INSERT INTO public.service_tier_config (min_years, max_years, tier_name, tier_color, base_annual_leave) VALUES
(0, 0, 'Ivory Essence', '#FFFFF0', 22),
(1, 1, 'Golden Dawn', '#FFD700', 22),
(2, 2, 'Amber Flame', '#FFBF00', 22),
(3, 3, 'Crimson Fire', '#DC143C', 22),
(4, 4, 'Emerald Crown', '#50C878', 23),
(5, 5, 'Sapphire Royal', '#0F52BA', 24),
(6, 6, 'Amethyst Reign', '#9966CC', 25),
(7, 7, 'Mahogany Noble', '#C04000', 26),
(8, 8, 'Prismatic Crown', '#E6E6FA', 27),
(9, 9, 'Yin Yang Balance', '#808080', 28),
(10, NULL, 'Obsidian Elite', '#0B1215', 28);

-- 2. Add certificate columns to leave requests
ALTER TABLE public.teamhub_leave_requests
ADD COLUMN certificate_url text,
ADD COLUMN certificate_filename text;

-- 3. Create storage bucket for sick certificates
INSERT INTO storage.buckets (id, name, public) 
VALUES ('sick-certificates', 'sick-certificates', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for sick certificates
CREATE POLICY "Users can upload own certificates"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'sick-certificates' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view own certificates"
ON storage.objects FOR SELECT
USING (bucket_id = 'sick-certificates' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Managers can view all certificates"
ON storage.objects FOR SELECT
USING (bucket_id = 'sick-certificates' AND get_user_permission_level(auth.uid()) >= 3);

-- 4. Create return to work forms table
CREATE TABLE public.return_to_work_forms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  leave_request_id uuid REFERENCES public.teamhub_leave_requests(id) ON DELETE CASCADE NOT NULL,
  user_id uuid NOT NULL,
  return_date date NOT NULL,
  feeling_well boolean NOT NULL DEFAULT true,
  ongoing_concerns text,
  adjustments_needed text,
  medical_clearance boolean DEFAULT false,
  notes text,
  completed_at timestamptz DEFAULT now(),
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(leave_request_id)
);

-- Enable RLS
ALTER TABLE public.return_to_work_forms ENABLE ROW LEVEL SECURITY;

-- RLS policies for return to work forms
CREATE POLICY "Users can insert own RTW forms"
ON public.return_to_work_forms FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own RTW forms"
ON public.return_to_work_forms FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update own unreviewed RTW forms"
ON public.return_to_work_forms FOR UPDATE
USING (auth.uid() = user_id AND reviewed_by IS NULL);

CREATE POLICY "Managers can view all RTW forms"
ON public.return_to_work_forms FOR SELECT
USING (get_user_permission_level(auth.uid()) >= 3);

CREATE POLICY "Managers can update RTW forms"
ON public.return_to_work_forms FOR UPDATE
USING (get_user_permission_level(auth.uid()) >= 3);

-- Trigger for updated_at
CREATE TRIGGER update_service_tier_config_updated_at
BEFORE UPDATE ON public.service_tier_config
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_return_to_work_forms_updated_at
BEFORE UPDATE ON public.return_to_work_forms
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();