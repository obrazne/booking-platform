-- "What's new" tours (Z22): each user stores only their own seen version.
begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(5);

insert into auth.users (id, email, aud, role, instance_id) values
  ('00000000-0000-0000-0000-0000000000a1', 'owner-a@test.local', 'authenticated', 'authenticated', '00000000-0000-0000-0000-000000000000'),
  ('00000000-0000-0000-0000-0000000000b1', 'owner-b@test.local', 'authenticated', 'authenticated', '00000000-0000-0000-0000-000000000000');

set local role authenticated;
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-0000000000a1", "role": "authenticated"}';
select lives_ok($$ select public.mark_tour_seen('owner', '2026-10-16') $$, 'user marks a tour as seen');
select is((select tours_seen ->> 'owner' from public.profiles where id = '00000000-0000-0000-0000-0000000000a1'),
  '2026-10-16', 'seen version is stored for the user');
select throws_ok($$ select public.mark_tour_seen('owner', 'x; drop') $$, '22023', null, 'version format is checked');
select throws_ok($$ update public.profiles set tours_seen = '{}' where id = '00000000-0000-0000-0000-0000000000a1' $$,
  '42501', null, 'column is not writable directly');
reset role;
select is((select tours_seen from public.profiles where id = '00000000-0000-0000-0000-0000000000b1'), '{}'::jsonb,
  'other users are untouched');

select * from finish();
rollback;
