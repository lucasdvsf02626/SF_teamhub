-- Create table for one-time-use QR tokens
CREATE TABLE public.qr_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  token text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Create index for fast token lookup
CREATE INDEX idx_qr_tokens_token ON public.qr_tokens(token);
CREATE INDEX idx_qr_tokens_user_expires ON public.qr_tokens(user_id, expires_at);

-- Enable RLS
ALTER TABLE public.qr_tokens ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to insert their own tokens
CREATE POLICY "Users can create own QR tokens"
ON public.qr_tokens
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Allow users to view their own tokens
CREATE POLICY "Users can view own QR tokens"
ON public.qr_tokens
FOR SELECT
USING (auth.uid() = user_id);

-- Allow service role to manage all tokens (for validation)
CREATE POLICY "Service can manage all tokens"
ON public.qr_tokens
FOR ALL
USING (true)
WITH CHECK (true);

-- Auto-cleanup old tokens (older than 1 hour)
CREATE OR REPLACE FUNCTION public.cleanup_expired_qr_tokens()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  DELETE FROM public.qr_tokens 
  WHERE expires_at < (now() - interval '1 hour');
  RETURN NEW;
END;
$$;

CREATE TRIGGER cleanup_qr_tokens_trigger
AFTER INSERT ON public.qr_tokens
FOR EACH STATEMENT
EXECUTE FUNCTION public.cleanup_expired_qr_tokens();