-- Public bucket for property photos. Path: <tenant_id>/<property_id>/<file>. Only owners of the tenant write (B1).

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('property-photos', 'property-photos', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy property_photos_insert on storage.objects for insert to authenticated
  with check (
    bucket_id = 'property-photos'
    and public.is_tenant_owner(((storage.foldername(name))[1])::uuid)
  );

create policy property_photos_update on storage.objects for update to authenticated
  using (bucket_id = 'property-photos' and public.is_tenant_owner(((storage.foldername(name))[1])::uuid))
  with check (bucket_id = 'property-photos' and public.is_tenant_owner(((storage.foldername(name))[1])::uuid));

create policy property_photos_delete on storage.objects for delete to authenticated
  using (bucket_id = 'property-photos' and public.is_tenant_owner(((storage.foldername(name))[1])::uuid));
