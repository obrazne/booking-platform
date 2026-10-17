-- Reviews for guests (Z38): link to the client's Google profile for "Ohodnotiť aj na Google ↗" after a review —
-- shown to every guest who reviewed, regardless of the stars (no review gating).

alter table public.tenant_settings
  add column google_review_url text check (google_review_url ~ '^https://');

comment on column public.tenant_settings.google_review_url is
  'Google profile link to write a review; offered to every guest after a verified review (Z38).';
