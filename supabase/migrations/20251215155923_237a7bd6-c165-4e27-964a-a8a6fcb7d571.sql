-- Remove the dangerous permissive policy that allows unrestricted access
DROP POLICY IF EXISTS "Service can manage all tokens" ON public.qr_tokens;

-- Clean up all potentially exposed tokens (users will generate fresh ones)
DELETE FROM public.qr_tokens;