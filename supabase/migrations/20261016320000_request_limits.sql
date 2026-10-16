-- Limit of guest form actions per IP address (captcha, Z23): reservation, promo code check, login code request and check.
-- The IP is never stored in readable form — only a keyed hash computed by the server.
create table public.request_attempts (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  ip_hash text not null check (length(ip_hash) between 16 and 128),
  action text not null check (action in ('reservation', 'promo', 'login_code', 'login_verify')),
  created_at timestamptz not null default now()
);

create index request_attempts_lookup_idx on public.request_attempts (ip_hash, action, created_at);

comment on table public.request_attempts is 'Rate limit of guest form actions per IP hash (server only, no client access).';

alter table public.request_attempts enable row level security;
revoke all on public.request_attempts from anon, authenticated;

-- Records one attempt and answers whether it is still within the limit (at most p_max in the last p_window_seconds,
-- across all tenants — one IP is one IP). Attempts over the limit are not recorded, so a blocked IP is free again
-- once the window passes. Old rows of the key are removed on the way, so the table cleans itself.
create or replace function public.hit_request_limit(
  p_tenant_id uuid,
  p_ip_hash text,
  p_action text,
  p_max integer,
  p_window_seconds integer
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count integer;
begin
  perform pg_advisory_xact_lock(hashtext('request_limit:' || p_ip_hash || ':' || p_action));
  delete from public.request_attempts
  where ip_hash = p_ip_hash and action = p_action and created_at < now() - interval '1 day';
  select count(*) into v_count
  from public.request_attempts
  where ip_hash = p_ip_hash and action = p_action
    and created_at >= now() - make_interval(secs => p_window_seconds);
  if v_count >= p_max then
    return false;
  end if;
  insert into public.request_attempts (tenant_id, ip_hash, action) values (p_tenant_id, p_ip_hash, p_action);
  return true;
end;
$$;

revoke execute on function public.hit_request_limit(uuid, text, text, integer, integer) from public, anon, authenticated;
grant execute on function public.hit_request_limit(uuid, text, text, integer, integer) to service_role;
