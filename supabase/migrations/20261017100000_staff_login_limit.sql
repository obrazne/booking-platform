-- Sign-in link for admin accounts (Z23): limited per IP like the guest forms. It belongs to no tenant,
-- so the attempt log allows a row without one and knows the new action (both only widen what is allowed).
alter table public.request_attempts alter column tenant_id drop not null;
alter table public.request_attempts drop constraint request_attempts_action_check;
alter table public.request_attempts add constraint request_attempts_action_check
  check (action in ('reservation', 'promo', 'login_code', 'login_verify', 'staff_link'));
