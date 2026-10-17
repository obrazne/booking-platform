-- Commission of the booking portals the owner would otherwise pay (Z23): the overview shows the estimate
-- "saved on commissions" = direct revenue × this rate. Basis points (1500 = 15 %), default 15 %.
alter table public.tenant_settings
  add column portal_commission_bp integer not null default 1500 check (portal_commission_bp between 0 and 5000);

comment on column public.tenant_settings.portal_commission_bp is
  'Portal commission in basis points used for the "saved on commissions" estimate (1500 = 15 %).';
