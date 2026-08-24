-- Inbound event deduplication table for hive-mail-inbound function.
-- Hive guarantees a stable event_id per outbound event and retries up to 5x;
-- this table lets us treat duplicates as no-ops and return 200 immediately.
-- TTL note: rows could be purged after 30 days if table size becomes a concern (no cron this pass).

CREATE TABLE IF NOT EXISTS public.hivemail_inbound_seen_events (
  event_id uuid PRIMARY KEY,
  event_type text NOT NULL,
  received_at timestamptz NOT NULL DEFAULT now(),
  payload jsonb
);

-- Index for any future TTL purge / observability queries by recency.
CREATE INDEX IF NOT EXISTS hivemail_inbound_seen_events_received_at_idx
  ON public.hivemail_inbound_seen_events (received_at DESC);

ALTER TABLE public.hivemail_inbound_seen_events ENABLE ROW LEVEL SECURITY;

-- Service-role only — no end-user access. The hive-mail-inbound edge function
-- uses the service role key to insert and lookup dedupe rows.
CREATE POLICY "Service role can insert dedupe rows"
  ON public.hivemail_inbound_seen_events
  FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Service role can read dedupe rows"
  ON public.hivemail_inbound_seen_events
  FOR SELECT
  USING (auth.role() = 'service_role');