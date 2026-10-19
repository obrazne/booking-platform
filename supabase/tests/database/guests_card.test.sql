-- Hostia (Z68): the team edits the contact and adds a guest by hand but never switches the consent on; it can revoke
-- it (with a reason) or ask for it (once in 12 months, never after a revocation); the guest confirms through the link.
-- The team's note is not readable by the guest; the list counts stays and spending; exports are in the history.
begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(18);

insert into auth.users (id, email, aud, role, instance_id) values
  ('00000000-0000-0000-0000-0000000000a1', 'owner-a@test.local', 'authenticated', 'authenticated', '00000000-0000-0000-0000-000000000000'),
  ('00000000-0000-0000-0000-0000000000b1', 'owner-b@test.local', 'authenticated', 'authenticated', '00000000-0000-0000-0000-000000000000'),
  ('00000000-0000-0000-0000-0000000000d1', 'guest@test.local', 'authenticated', 'authenticated', '00000000-0000-0000-0000-000000000000');
insert into public.tenants (id, slug, name, status) values
  ('10000000-0000-0000-0000-00000000000a', 'tenant-a', 'Tenant A', 'active'),
  ('10000000-0000-0000-0000-00000000000b', 'tenant-b', 'Tenant B', 'active');
insert into public.memberships (tenant_id, user_id, role) values
  ('10000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-0000000000a1', 'owner'),
  ('10000000-0000-0000-0000-00000000000b', '00000000-0000-0000-0000-0000000000b1', 'owner');
insert into public.guests (id, tenant_id, email, name, user_id, marketing_consent, marketing_consent_at) values
  ('50000000-0000-0000-0000-00000000000a', '10000000-0000-0000-0000-00000000000a', 'guest@test.local', 'Hosť A',
   '00000000-0000-0000-0000-0000000000d1', true, now()),
  ('50000000-0000-0000-0000-00000000000b', '10000000-0000-0000-0000-00000000000a', 'other@test.local', 'Hosť B',
   null, false, null);

set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}';

-- Contact and manual guest.
select lives_ok($$update public.guests set phone = '+421900000000', address = 'Hlavná 1, Bratislava'
  where id = '50000000-0000-0000-0000-00000000000b'$$, 'the owner edits the contact');
select is((select address_source from public.guests where id = '50000000-0000-0000-0000-00000000000b'), 'owner',
  'the database writes who filled in the address');
select throws_ok($$update public.guests set marketing_consent = true where id = '50000000-0000-0000-0000-00000000000b'$$,
  '42501', null, 'the team cannot switch the consent on');
select lives_ok($$insert into public.guests (tenant_id, email, name, source)
  values ('10000000-0000-0000-0000-00000000000a', 'manual@test.local', 'Ručný', 'manual')$$, 'a guest added by hand');
select throws_ok($$insert into public.guests (tenant_id, email, source, marketing_consent)
  values ('10000000-0000-0000-0000-00000000000a', 'consent@test.local', 'manual', true)$$,
  '42501', null, 'never with a consent');
select throws_ok($$insert into public.guests (tenant_id, email, source)
  values ('10000000-0000-0000-0000-00000000000b', 'x@test.local', 'manual')$$,
  '42501', null, 'not into another client');

-- Revoke and request.
select throws_ok($$select public.guest_consent_revoke('50000000-0000-0000-0000-00000000000a', ' ')$$,
  '22023', null, 'revoking needs a reason');
select lives_ok($$select public.guest_consent_revoke('50000000-0000-0000-0000-00000000000a', 'Hosť ma požiadal')$$,
  'the owner revokes in the guest''s name');
select is((select array[source, reason] from public.guest_consent_events
           where guest_id = '50000000-0000-0000-0000-00000000000a'), array['owner', 'Hosť ma požiadal'],
  'with the reason and the source');
select throws_ok($$select public.guest_consent_request('50000000-0000-0000-0000-00000000000a')$$,
  'P0001', 'revoked', 'no request after a revocation');
select isnt(public.guest_consent_request('50000000-0000-0000-0000-00000000000b'), null, 'a request to the other guest');
select throws_ok($$select public.guest_consent_request('50000000-0000-0000-0000-00000000000b')$$,
  'P0001', 'recent', 'at most once in 12 months');

-- The guest confirms through the link (the worker stored the hash of the token).
reset role;
select ok(public.guest_consent_request_token(
  (select id from public.guest_consent_requests where guest_id = '50000000-0000-0000-0000-00000000000b'), 'hash-b'),
  'the worker stores the hash');
select ok(public.guest_consent_confirm('hash-b'), 'the click confirms the request');
-- A statement of its own: the one above sees the data as they were when it started.
select ok((select marketing_consent from public.guests where id = '50000000-0000-0000-0000-00000000000b'),
  'the guest has the consent');
select is((select source from public.guest_consent_events where guest_id = '50000000-0000-0000-0000-00000000000b'),
  'owner_request', 'with the source owner_request');

-- The team's note: the guest does not read it.
insert into public.guest_notes (guest_id, tenant_id, body) values
  ('50000000-0000-0000-0000-00000000000a', '10000000-0000-0000-0000-00000000000a', 'Chodia s deťmi');
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000d1","role":"authenticated"}';
select is((select count(*)::int from public.guest_notes), 0, 'the guest does not read the team''s note');

set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}';
select is((select array[all_guests, consent] from public.guest_list_counts('10000000-0000-0000-0000-00000000000a')),
  array[3, 1], 'the list counts the guests and the consents');

select * from finish();
rollback;
