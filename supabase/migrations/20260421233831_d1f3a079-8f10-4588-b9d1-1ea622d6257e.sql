-- HiveMail inbound event dedupe table (Bridge Contract v1)
-- Hive's dispatcher retries up to 5x on non-2xx; TeamHub's hive-mail-inbound
-- function uses this table as the idempotency store keyed by event_id.
-- TTL note: rows older than 30 days could be purged via a nightly cron if the
-- table grows large. No TTL cron in this pass — revisit when row count > 1M.

CREATE TABLE IF NOT EXISTS public.hivemail_inbound_seen_events (
  event_id uuid PRIMARY KEY,
  event_type text NOT NULL,
  received_at timestamptz NOT NULL DEFAULT now(),
  payload jsonb
);

COMMENT ON TABLE public.hivemail_inbound_seen_events IS
  'HiveMail Bridge Contract v1 inbound dedupe store. PK on event_id guarantees idempotency on retries (Hive retries up to 5x). TTL: rows older than 30 days may be purged via a nightly cron if size becomes a concern; no TTL cron configured in this pass.';

ALTER TABLE public.hivemail_inbound_seen_events ENABLE ROW LEVEL SECURITY;

-- Service-role only. No policies = no access for anon/authenticated roles.
-- The hive-mail-inbound edge function uses SERVICE_ROLE_KEY which bypasses RLS.

CREATE INDEX IF NOT EXISTS hivemail_inbound_seen_events_received_at_idx
  ON public.hivemail_inbound_seen_events (received_at DESC);