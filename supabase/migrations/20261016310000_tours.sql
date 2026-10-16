-- "What's new" tours (A15, Z22): which tour version each staff user has already seen.
-- The tours themselves (slides, texts, screenshots) are versioned in code; only the seen version is stored here.

alter table public.profiles add column tours_seen jsonb not null default '{}'::jsonb;
comment on column public.profiles.tours_seen is 'Tour key → last version the user has seen, e.g. {"owner": "2026-10-16"}.';

-- The user marks a tour as seen for themselves only (the column is not directly writable).
create or replace function public.mark_tour_seen(p_tour text, p_version text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;
  if p_tour not in ('owner', 'admin') or p_version !~ '^[0-9A-Za-z.-]{1,20}$' then
    raise exception 'invalid tour' using errcode = '22023';
  end if;
  update public.profiles
  set tours_seen = tours_seen || jsonb_build_object(p_tour, p_version)
  where id = (select auth.uid());
end;
$$;

revoke execute on function public.mark_tour_seen(text, text) from public, anon;
grant execute on function public.mark_tour_seen(text, text) to authenticated;
