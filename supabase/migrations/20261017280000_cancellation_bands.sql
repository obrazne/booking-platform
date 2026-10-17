-- Storno bands of a client (Martin 17. 10., after Z44): how much of the price is returned when the guest cancels at
-- least N days before arrival — e.g. [{"days": 30, "refund_pct": 100}, {"days": 14, "refund_pct": 50}] (less → 0 %).
-- Optional: without bands the guest sees only the wording of the policy and the owner decides as before. The bands
-- must match the wording of the client's cancellation policy (the client's legal text), the app does not invent them.

alter table public.tenant_settings
  add column cancellation_bands jsonb not null default '[]'::jsonb
    check (jsonb_typeof(cancellation_bands) = 'array' and jsonb_array_length(cancellation_bands) <= 6);

comment on column public.tenant_settings.cancellation_bands is
  'Storno bands [{days, refund_pct}]: cancelled at least `days` before arrival → `refund_pct` % of the price back.';

-- Guests read the bands through the stay page (server); nothing else changes.
