-- =============================================================
-- RutaSmart · Storage
-- Bucket privado para binarios de firmware (OTA).
-- Los dispositivos descargan con signed URLs generadas por la API.
-- =============================================================

insert into storage.buckets (id, name, public, file_size_limit)
values ('firmware', 'firmware', false, 16777216)
on conflict (id) do nothing;

-- Solo el superadmin puede ver/subir/borrar archivos de firmware desde el panel.
create policy "firmware_admin_select" on storage.objects for select to authenticated
  using (bucket_id = 'firmware' and public.is_superadmin());
create policy "firmware_admin_insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'firmware' and public.is_superadmin());
create policy "firmware_admin_delete" on storage.objects for delete to authenticated
  using (bucket_id = 'firmware' and public.is_superadmin());
