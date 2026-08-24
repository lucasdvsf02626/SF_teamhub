-- =========================================
-- Hivemail local mirror cache
-- =========================================

-- Threads
CREATE TABLE public.hivemail_threads_local (
  id UUID NOT NULL PRIMARY KEY,
  kind TEXT NOT NULL CHECK (kind IN ('dm', 'group')),
  title TEXT,
  last_message_at TIMESTAMPTZ,
  last_message_preview TEXT,
  sync_source TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_hivemail_threads_local_last_msg ON public.hivemail_threads_local(last_message_at DESC NULLS LAST);

-- Participants (email-keyed, cross-project identity)
CREATE TABLE public.hivemail_thread_participants_local (
  id UUID NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id UUID NOT NULL REFERENCES public.hivemail_threads_local(id) ON DELETE CASCADE,
  user_email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('member', 'owner')),
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  sync_source TEXT,
  UNIQUE (thread_id, user_email)
);

CREATE INDEX idx_hivemail_participants_email ON public.hivemail_thread_participants_local(user_email);
CREATE INDEX idx_hivemail_participants_thread ON public.hivemail_thread_participants_local(thread_id);

-- Messages
CREATE TABLE public.hivemail_messages_local (
  id UUID NOT NULL PRIMARY KEY,
  thread_id UUID NOT NULL REFERENCES public.hivemail_threads_local(id) ON DELETE CASCADE,
  sender_email TEXT NOT NULL,
  body TEXT NOT NULL,
  attachments JSONB NOT NULL DEFAULT '[]'::jsonb,
  edited_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  sync_source TEXT
);

CREATE INDEX idx_hivemail_messages_thread_created ON public.hivemail_messages_local(thread_id, created_at DESC);
CREATE INDEX idx_hivemail_messages_sender ON public.hivemail_messages_local(sender_email);

-- Receipts (per-recipient, never collapsed)
CREATE TABLE public.hivemail_receipts_local (
  id UUID NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES public.hivemail_messages_local(id) ON DELETE CASCADE,
  recipient_email TEXT NOT NULL,
  delivered_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (message_id, recipient_email)
);

CREATE INDEX idx_hivemail_receipts_message ON public.hivemail_receipts_local(message_id);
CREATE INDEX idx_hivemail_receipts_recipient ON public.hivemail_receipts_local(recipient_email);

-- Outbox (client-originated mutations awaiting bridge ACK)
CREATE TABLE public.hivemail_outbox (
  id UUID NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  user_email TEXT NOT NULL,
  op_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
  attempt_count INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,
  correlation_id UUID NOT NULL DEFAULT gen_random_uuid(),
  idempotency_key TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_hivemail_outbox_user ON public.hivemail_outbox(user_id);
CREATE INDEX idx_hivemail_outbox_status ON public.hivemail_outbox(status, created_at DESC);

-- =========================================
-- RLS
-- =========================================
ALTER TABLE public.hivemail_threads_local ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hivemail_thread_participants_local ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hivemail_messages_local ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hivemail_receipts_local ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hivemail_outbox ENABLE ROW LEVEL SECURITY;

-- Helper: current user's email
CREATE OR REPLACE FUNCTION public.current_user_email()
RETURNS TEXT
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT email FROM public.profiles WHERE id = auth.uid()
$$;

-- Threads policies
CREATE POLICY "Users view participating threads"
  ON public.hivemail_threads_local FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.hivemail_thread_participants_local p
      WHERE p.thread_id = hivemail_threads_local.id
        AND p.user_email = public.current_user_email()
    )
  );

CREATE POLICY "Admins view all threads"
  ON public.hivemail_threads_local FOR SELECT
  USING (get_user_permission_level(auth.uid()) >= 4);

-- Participants policies
CREATE POLICY "Users view participants of their threads"
  ON public.hivemail_thread_participants_local FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.hivemail_thread_participants_local self
      WHERE self.thread_id = hivemail_thread_participants_local.thread_id
        AND self.user_email = public.current_user_email()
    )
  );

CREATE POLICY "Admins view all participants"
  ON public.hivemail_thread_participants_local FOR SELECT
  USING (get_user_permission_level(auth.uid()) >= 4);

-- Messages policies
CREATE POLICY "Users view messages in their threads"
  ON public.hivemail_messages_local FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.hivemail_thread_participants_local p
      WHERE p.thread_id = hivemail_messages_local.thread_id
        AND p.user_email = public.current_user_email()
    )
  );

CREATE POLICY "Admins view all messages"
  ON public.hivemail_messages_local FOR SELECT
  USING (get_user_permission_level(auth.uid()) >= 4);

-- Receipts policies
CREATE POLICY "Users view receipts in their threads"
  ON public.hivemail_receipts_local FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.hivemail_messages_local m
      JOIN public.hivemail_thread_participants_local p ON p.thread_id = m.thread_id
      WHERE m.id = hivemail_receipts_local.message_id
        AND p.user_email = public.current_user_email()
    )
  );

CREATE POLICY "Admins view all receipts"
  ON public.hivemail_receipts_local FOR SELECT
  USING (get_user_permission_level(auth.uid()) >= 4);

-- Outbox policies
CREATE POLICY "Users view own outbox"
  ON public.hivemail_outbox FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins view all outbox"
  ON public.hivemail_outbox FOR SELECT
  USING (get_user_permission_level(auth.uid()) >= 4);

-- updated_at trigger
CREATE TRIGGER hivemail_threads_local_updated_at
  BEFORE UPDATE ON public.hivemail_threads_local
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER hivemail_outbox_updated_at
  BEFORE UPDATE ON public.hivemail_outbox
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.hivemail_threads_local;
ALTER PUBLICATION supabase_realtime ADD TABLE public.hivemail_thread_participants_local;
ALTER PUBLICATION supabase_realtime ADD TABLE public.hivemail_messages_local;
ALTER PUBLICATION supabase_realtime ADD TABLE public.hivemail_receipts_local;