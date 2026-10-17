-- Limit per IP (Z23): counts within the window, blocked attempts are not recorded, no client access.
begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(9);

insert into public.tenants (id, slug, name) values ('10000000-0000-0000-0000-00000000000a', 'tenant-a', 'Tenant A');

set local role service_role;
select is(public.hit_request_limit('10000000-0000-0000-0000-00000000000a', 'hash-of-ip-one-000', 'promo', 2, 3600), true,
  'first attempt passes');
select is(public.hit_request_limit('10000000-0000-0000-0000-00000000000a', 'hash-of-ip-one-000', 'promo', 2, 3600), true,
  'second attempt passes');
select is(public.hit_request_limit('10000000-0000-0000-0000-00000000000a', 'hash-of-ip-one-000', 'promo', 2, 3600), false,
  'third attempt is over the limit');
select is(public.hit_request_limit('10000000-0000-0000-0000-00000000000a', 'hash-of-ip-two-000', 'promo', 2, 3600), true,
  'another IP has its own limit');
select is(public.hit_request_limit('10000000-0000-0000-0000-00000000000a', 'hash-of-ip-one-000', 'reservation', 2, 3600),
  true, 'another action has its own limit');
reset role;

select is((select count(*)::int from public.request_attempts where ip_hash = 'hash-of-ip-one-000' and action = 'promo'), 2,
  'blocked attempt is not recorded');

update public.request_attempts set created_at = now() - interval '2 hours' where ip_hash = 'hash-of-ip-one-000';
set local role service_role;
select is(public.hit_request_limit('10000000-0000-0000-0000-00000000000a', 'hash-of-ip-one-000', 'promo', 2, 3600), true,
  'attempts outside the window do not count');
select is(public.hit_request_limit(null, 'hash-of-ip-one-000', 'staff_link', 2, 3600), true,
  'admin sign-in link is limited without a tenant');
reset role;

set local role anon;
select throws_ok($$ select public.hit_request_limit('10000000-0000-0000-0000-00000000000a', 'hash-of-ip-x-0000', 'promo', 9, 60) $$,
  '42501', null, 'guests cannot call the limit directly');

select * from finish();
rollback;
