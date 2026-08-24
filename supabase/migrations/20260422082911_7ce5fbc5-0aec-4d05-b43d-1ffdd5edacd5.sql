
-- Helper: returns true if the given email is a participant in the given thread.
-- SECURITY DEFINER bypasses RLS on hivemail_thread_participants_local so the
-- policies that depend on it stop recursing.
CREATE OR REPLACE FUNCTION public.is_hivemail_thread_participant(_thread_id uuid, _user_email text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.hivemail_thread_participants_local p
    WHERE p.thread_id = _thread_id
      AND lower(p.user_email) = lower(_user_email)
  );
$$;

-- Drop and recreate every policy that referenced the recursive subquery.

-- threads_local
DROP POLICY IF EXISTS "Users view participating threads" ON public.hivemail_threads_local;
CREATE POLICY "Users view participating threads"
  ON public.hivemail_threads_local
  FOR SELECT
  USING (public.is_hivemail_thread_participant(id, public.current_user_email()));

-- thread_participants_local — replace self-referential policy with one
-- that allows a row when its own user_email matches the caller, OR when
-- the caller is also a participant in the same thread (computed via the
-- SECURITY DEFINER helper).
DROP POLICY IF EXISTS "Users view participants of their threads" ON public.hivemail_thread_participants_local;
CREATE POLICY "Users view participants of their threads"
  ON public.hivemail_thread_participants_local
  FOR SELECT
  USING (
    lower(user_email) = lower(public.current_user_email())
    OR public.is_hivemail_thread_participant(thread_id, public.current_user_email())
  );

-- messages_local
DROP POLICY IF EXISTS "Users view messages in their threads" ON public.hivemail_messages_local;
CREATE POLICY "Users view messages in their threads"
  ON public.hivemail_messages_local
  FOR SELECT
  USING (public.is_hivemail_thread_participant(thread_id, public.current_user_email()));

-- receipts_local
DROP POLICY IF EXISTS "Users view receipts in their threads" ON public.hivemail_receipts_local;
CREATE POLICY "Users view receipts in their threads"
  ON public.hivemail_receipts_local
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.hivemail_messages_local m
      WHERE m.id = hivemail_receipts_local.message_id
        AND public.is_hivemail_thread_participant(m.thread_id, public.current_user_email())
    )
  );
