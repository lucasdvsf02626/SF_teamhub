
CREATE TABLE public.profile_versions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  email text,
  snapshot jsonb NOT NULL,
  changed_by text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX idx_profile_versions_profile_id ON public.profile_versions (profile_id, created_at DESC);

ALTER TABLE public.profile_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view profile versions"
  ON public.profile_versions FOR SELECT
  USING (get_user_permission_level(auth.uid()) >= 4);

CREATE POLICY "Service can insert profile versions"
  ON public.profile_versions FOR INSERT
  WITH CHECK (true);
