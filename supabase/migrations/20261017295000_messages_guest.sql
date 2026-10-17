-- Messages for guests (Z47): what the guest's conversation needs in one call — through the account or the access link —
-- and the quick topics of the client (sentence starts the guest can tap, v2.5).

alter table public.tenant_settings add column message_topics jsonb;

comment on column public.tenant_settings.message_topics is
  'Quick topics for guests in messages (Z47): [{"sk": "…"}, …]; null = the default ones from the translations.';

-- The guest's conversation: messages (automatic ones are from the owner — not marked), when the team and the guest last
-- read it, when the reservation was confirmed, and the last day the guest can write (30 days after departure).
create or replace function public.guest_messages(p_reservation_id uuid, p_token text default null)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_via text := public.reservation_access(p_reservation_id, p_token);
  v_res record;
begin
  if v_via is null or v_via = 'staff' then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  select r.id, r.tenant_id, r.source, r.status,
    (select max(i.check_out) from public.reservation_items i where i.reservation_id = r.id) as check_out
  into v_res from public.reservations r where r.id = p_reservation_id;
  return jsonb_build_object(
    'enabled', public.is_module_enabled(v_res.tenant_id, 'messages') and v_res.source not in ('booking', 'airbnb'),
    'open_until', v_res.check_out + 30,
    'confirmed_at', (select min(h.changed_at) from public.reservation_status_history h
                     where h.reservation_id = p_reservation_id and h.to_status = 'confirmed'),
    'team_read_at', (select t.team_read_at from public.message_threads t where t.reservation_id = p_reservation_id),
    'guest_read_at', (select t.guest_read_at from public.message_threads t where t.reservation_id = p_reservation_id),
    'messages', coalesce((select jsonb_agg(jsonb_build_object('id', m.id, 'mine', m.sender = 'guest', 'body', m.body,
                    'created_at', m.created_at) order by m.created_at)
                  from public.messages m where m.reservation_id = p_reservation_id), '[]'::jsonb),
    'topics', (select s.message_topics from public.tenant_settings s where s.tenant_id = v_res.tenant_id));
end;
$$;

revoke execute on function public.guest_messages(uuid, text) from public;
grant execute on function public.guest_messages(uuid, text) to anon, authenticated;
