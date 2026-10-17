-- Messages (Z45): guest (link) and team write, another client sees nothing, the bell and merged e-mails, waiting and
-- inbox, automatic messages by rules (once, left out, not caught up), the guest's 30-day window.
begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(22);

insert into auth.users (id, email, aud, role, instance_id) values
  ('00000000-0000-0000-0000-0000000000a1', 'owner-a@test.local', 'authenticated', 'authenticated', '00000000-0000-0000-0000-000000000000'),
  ('00000000-0000-0000-0000-0000000000b1', 'owner-b@test.local', 'authenticated', 'authenticated', '00000000-0000-0000-0000-000000000000');
insert into public.tenants (id, slug, name, timezone) values
  ('10000000-0000-0000-0000-00000000000a', 'tenant-a', 'Tenant A', 'Europe/Bratislava'),
  ('10000000-0000-0000-0000-00000000000b', 'tenant-b', 'Tenant B', 'Europe/Bratislava');
insert into public.memberships (tenant_id, user_id, role) values
  ('10000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-0000000000a1', 'owner'),
  ('10000000-0000-0000-0000-00000000000b', '00000000-0000-0000-0000-0000000000b1', 'owner');
insert into public.tenant_settings (tenant_id, contact_name) values ('10000000-0000-0000-0000-00000000000a', 'Jana Horská');
insert into public.properties (id, tenant_id, slug, name, status) values
  ('20000000-0000-0000-0000-00000000000a', '10000000-0000-0000-0000-00000000000a', 'pa', 'PA', 'published');
insert into public.units (id, tenant_id, property_id, name, is_default, max_guests) values
  ('30000000-0000-0000-0000-00000000000a', '10000000-0000-0000-0000-00000000000a', '20000000-0000-0000-0000-00000000000a', 'U', true, 6);

create temp table t (token text, id uuid);
grant all on t to anon, authenticated;
insert into t (token, id)
select c.access_token, c.id from public.create_reservation(jsonb_build_object(
  'tenant_id', '10000000-0000-0000-0000-00000000000a', 'property_id', '20000000-0000-0000-0000-00000000000a',
  'unit_id', '30000000-0000-0000-0000-00000000000a', 'guest_name', 'Anna Nová', 'guest_email', 'anna@test.local',
  'adults', 2, 'currency', 'EUR', 'total_cents', 30000, 'status', 'confirmed',
  'lines', jsonb_build_array(jsonb_build_object('kind', 'accommodation', 'label', 'Pobyt', 'quantity', 1,
    'unit_amount_cents', 30000, 'amount_cents', 30000)),
  'check_in', (current_date + 10)::text, 'check_out', (current_date + 13)::text)) c;

select set_config('request.jwt.claims', '', true);
set local role anon;
select throws_ok($$ select public.send_message((select id from t), 'Dobrý deň', (select token from t)) $$,
  'P0001', 'module_off', 'without the module no messages');
reset role;
insert into public.tenant_modules (tenant_id, module_key, status)
  values ('10000000-0000-0000-0000-00000000000a', 'messages', 'active');

set local role anon;
select throws_ok($$ select public.send_message((select id from t), 'Dobrý deň', 'wrong') $$, '42501', null,
  'a wrong token is refused');
select lives_ok($$ select public.send_message((select id from t), 'Dobrý deň, je tam parkovanie?', (select token from t)) $$,
  'the guest writes through the link');
select lives_ok($$ select public.send_message((select id from t), 'A ešte: môžeme priniesť psa?', (select token from t)) $$,
  'and once more');
reset role;
select is((select count(*)::int from public.messages where sender = 'guest'), 2, 'two messages of the guest');
select is((select count(*)::int from public.notifications where kind = 'message_new'), 2, 'the bell rings for each');
select ok((select count(*) = 1 and bool_and(send_after > now() + interval '14 minutes') from public.email_outbox
  where kind = 'owner_message'), 'one e-mail to the owner after 15 minutes (merged)');

-- Another client sees and writes nothing.
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000b1","role":"authenticated"}';
select is((select count(*)::int from public.messages), 0, 'another client does not see the conversation');
select throws_ok($$ select public.send_message((select id from t), 'Ahoj') $$, '42501', null,
  'another client cannot write');

-- The team: waiting, inbox, reply, read.
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}';
select is(public.messages_waiting('10000000-0000-0000-0000-00000000000a'), 1, 'one conversation waits');
select ok((select unread and waiting from public.message_inbox('10000000-0000-0000-0000-00000000000a', 'waiting')),
  'the inbox shows it unread and waiting');
select lives_ok($$ select public.send_message((select id from t), 'Áno, parkovanie je pred chaletom.') $$,
  'the owner replies');
select is(public.messages_waiting('10000000-0000-0000-0000-00000000000a'), 0, 'nothing waits after the reply');
select is((select sender || ':' || (author_id is not null) from public.messages order by created_at desc limit 1),
  'staff:true', 'a message of the team, with its author');
reset role;
select is((select count(*)::int from public.email_outbox where kind = 'guest_message'), 1,
  'the guest gets an e-mail after 15 minutes');

-- Automatic messages.
insert into public.message_rules (id, tenant_id, key, anchor, offset_days, send_time, body, created_at) values
  ('50000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-00000000000a', 'directions', 'check_in', -11, '10:00',
   '{"sk": "Dobrý deň {meno}, tešíme sa {príchod}. {podpis}"}', now() - interval '30 days'),
  ('50000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-00000000000a', 'later', 'check_in', -3, '10:00',
   '{"sk": "O tri dni"}', now() - interval '30 days'),
  ('50000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-00000000000a', 'skipped', 'check_in', -11, '10:00',
   '{"sk": "Toto nie"}', now() - interval '30 days');
select public.messages_tick();
select is((select count(*)::int from public.messages where sender = 'auto'), 0,
  'not caught up: due before the reservation was made');
update public.reservations set created_at = now() - interval '20 days' where id = (select id from t);
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}';
select lives_ok($$ select public.set_message_override((select id from t), '50000000-0000-0000-0000-000000000003', true) $$,
  'the owner leaves one out for this guest');
select is((select count(*)::int from public.scheduled_messages((select id from t))), 1,
  'one scheduled message in the future');
reset role;
select public.messages_tick();
select is((select body from public.messages where sender = 'auto'),
  'Dobrý deň Anna, tešíme sa ' || to_char(current_date + 10, 'FMDD. FMMM. YYYY') || '. Jana Horská',
  'the due rule is sent once with the variables filled in');
select public.messages_tick();
select is((select count(*)::int from public.messages where sender = 'auto'), 1, 'never twice, the left out one not at all');

-- The guest's window closes 30 days after departure.
update public.reservation_items set check_in = current_date - 40, check_out = current_date - 31
  where reservation_id = (select id from t);
set local role anon;
select throws_ok($$ select public.send_message((select id from t), 'Ešte otázka', (select token from t)) $$,
  'P0001', 'closed', '30 days after departure the guest only reads');
reset role;
select is(public.messages_review_rule('10000000-0000-0000-0000-00000000000a'), null,
  'no thank-you with the review link → the invitation stays');

select * from finish();
rollback;
