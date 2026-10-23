create table if not exists public.gatitos (
  id uuid primary key default gen_random_uuid(),
  nombre text not null check (char_length(btrim(nombre)) between 1 and 80),
  foto text not null,
  datos text not null check (char_length(btrim(datos)) between 1 and 500),
  tiempo text not null check (char_length(btrim(tiempo)) between 1 and 50),
  contacto text not null check (contacto ~ '^[0-9]{8,15}$'),
  estado text not null default 'pendiente'
    check (estado in ('pendiente', 'aprobado', 'rechazado')),
  created_at timestamptz not null default now()
);

alter table public.gatitos enable row level security;

grant select, insert on public.gatitos to anon, authenticated;

drop policy if exists "Public can view approved cats" on public.gatitos;
create policy "Public can view approved cats"
  on public.gatitos for select
  to anon, authenticated
  using (estado = 'aprobado');

drop policy if exists "Public can submit cats for review" on public.gatitos;
create policy "Public can submit cats for review"
  on public.gatitos for insert
  to anon, authenticated
  with check (estado = 'pendiente');

insert into public.gatitos (nombre, foto, datos, tiempo, contacto, estado)
select existing.nombre, existing.foto, existing.datos, existing.tiempo, existing.contacto, 'aprobado'
from (
  values
    ('Otoño', 'https://i.pinimg.com/736x/55/e8/d1/55e8d1034cee64a024d0dd3bde572b40.jpg', 'Gatita juguetona y cariñosa', '3 semanas', '3825537531'),
    ('Primavera', 'https://i.pinimg.com/736x/37/4e/6f/374e6fb71d7fe87df7da0981e3f7c314.jpg', 'Gatita bella, tierna y jugetona', '3 semanas', '3825537531'),
    ('Invierno', 'https://i.pinimg.com/736x/66/96/79/6696793d5f4a0f679be780b8d1fd32a8.jpg', 'Machito juguetón y cariñoso', '3 semanas', '3825537531'),
    ('Kiki', 'https://i.pinimg.com/736x/a2/74/35/a27435815ef4432a713edf0dcb2268b2.jpg', 'Gatita malhumorada y compañera', '3 años', '3825537531'),
    ('Copito', 'https://i.pinimg.com/736x/21/6f/9b/216f9bc25115dade1adcc78138fffa60.jpg', 'Angelito', '3 años', '3825537531'),
    ('Kaly Conejito', 'https://i.pinimg.com/736x/d7/a2/40/d7a2400cfe7af02d3c7ac36e9af007f8.jpg', 'Gatita chuky y juguetona', '1 año', '3825537531'),
    ('Pocha', 'https://i.pinimg.com/736x/9b/13/e2/9b13e2a2b92fa132427fdbcde7b3995e.jpg', 'Gatita tierna y trapito', '2 años', '3825537531'),
    ('Verano', 'https://i.pinimg.com/736x/bb/6d/19/bb6d19a8caeb4e187db8266559105128.jpg', 'Juguetón y compañero', '1 mes', '3825537531'),
    ('Jeti', 'https://i.pinimg.com/736x/32/93/40/329340a02219c0a219b90590bf43cdce.jpg', 'Compañera y cariñosa', '2 años', '3825537531'),
    ('Tigresito', 'https://i.pinimg.com/736x/c9/ab/a6/c9aba643e67ed4f9991233d45c737433.jpg', 'Jugueton', '3 semanas', '3825537531')
) as existing(nombre, foto, datos, tiempo, contacto)
where not exists (
  select 1
  from public.gatitos as saved
  where saved.foto = existing.foto
);

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'gatitos',
  'gatitos',
  false,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Public can view cat photos" on storage.objects;
drop policy if exists "Public can view approved cat photos" on storage.objects;
create policy "Public can view approved cat photos"
  on storage.objects for select
  to anon, authenticated
  using (
    bucket_id = 'gatitos'
    and exists (
      select 1
      from public.gatitos
      where gatitos.foto = storage.objects.name
        and gatitos.estado = 'aprobado'
    )
  );

drop policy if exists "Public can upload cat photos" on storage.objects;
create policy "Public can upload cat photos"
  on storage.objects for insert
  to anon, authenticated
  with check (
    bucket_id = 'gatitos'
    and name ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|png|webp)$'
  );
