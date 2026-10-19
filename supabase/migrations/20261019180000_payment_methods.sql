-- Z69 (pripomienka 55, vizuál administrácie v1.7, doska 18): payment methods of a client. Only adds.
-- Bank transfer with QR is the method that works today; card (Stripe) gets its place and data now, so it can be added
-- later without rebuilding: it can be switched on only once a Stripe account is connected (the account id, never a key —
-- keys never go to the database). At least one way of paying for a reservation stays on.

alter table public.tenant_settings
  add column bank_transfer_enabled boolean not null default true,
  add column card_enabled boolean not null default false,
  add column stripe_account_id text check (stripe_account_id is null or stripe_account_id ~ '^acct_[A-Za-z0-9]{6,64}$'),
  add constraint tenant_settings_card_needs_stripe check (not card_enabled or stripe_account_id is not null),
  add constraint tenant_settings_one_payment_method check (bank_transfer_enabled or card_enabled);

comment on column public.tenant_settings.bank_transfer_enabled is 'Guests can pay a reservation by bank transfer (QR PAY by square, VS = number).';
comment on column public.tenant_settings.card_enabled is 'Guests can pay by card through Stripe — only with a connected Stripe account (Z69: prepared, not built yet).';
comment on column public.tenant_settings.stripe_account_id is 'Connected Stripe account (acct_…) — set by the connection flow, never typed; no keys in the database.';
