create table if not exists public.gatitos (
  id uuid primary key default gen_random_uuid(),
  nombre text not null check (char_length(btrim(nombre)) between 1 and 80),
  foto text not null,
  datos text not null check (char_length(btrim(datos)) between 1 and 500),
  tiempo text not null check (char_length(btrim(tiempo)) between 1 and 50),
  contacto text not null check (contacto ~ '^[0-9]{8,15}$'),
  estado text not null default 'pendiente'
    check (estado in ('pendiente', 'aprobado', 'adoptado', 'rechazado')),
  created_at timestamptz not null default now()
);

alter table public.gatitos
  drop constraint if exists gatitos_estado_check;
alter table public.gatitos
  add constraint gatitos_estado_check
  check (estado in ('pendiente', 'aprobado', 'adoptado', 'rechazado'));

create table if not exists public.administradores (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.administradores enable row level security;
revoke all on public.administradores from anon, authenticated;

create or replace function public.es_administrador()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.administradores
    where user_id = (select auth.uid())
  );
$$;

revoke all on function public.es_administrador() from public, anon;
grant execute on function public.es_administrador() to authenticated;

alter table public.gatitos enable row level security;

revoke all on public.gatitos from anon, authenticated;
grant insert (nombre, foto, datos, tiempo, contacto, estado) on public.gatitos to anon, authenticated;
grant select, update, delete on public.gatitos to authenticated;

drop policy if exists "Public can view approved cats" on public.gatitos;
drop policy if exists "Public can view approved cat photos via view" on public.gatitos;
drop policy if exists "Administrators can view all cat records" on public.gatitos;
drop policy if exists "Administrators can manage cats" on public.gatitos;
create policy "Administrators can manage cats"
  on public.gatitos for all
  to authenticated
  using (public.es_administrador())
  with check (public.es_administrador());

create or replace view public.gatitos_public as
select
  id,
  nombre,
  foto,
  datos,
  tiempo,
  case when estado = 'aprobado' then contacto else null end as contacto,
  estado,
  created_at
from public.gatitos
where estado in ('aprobado', 'adoptado');

revoke all on public.gatitos_public from public, anon, authenticated;
grant select on public.gatitos_public to anon, authenticated;

drop policy if exists "Public can submit cats for review" on public.gatitos;
create policy "Public can submit cats for review"
  on public.gatitos for insert
  to anon, authenticated
  with check (
    estado = 'pendiente'
    and foto ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|png|webp)$'
  );

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
      from public.gatitos_public
      where gatitos_public.foto = storage.objects.name
    )
  );

drop policy if exists "Administrators can view all cat photos" on storage.objects;
create policy "Administrators can view all cat photos"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'gatitos' and public.es_administrador());

drop policy if exists "Public can upload cat photos" on storage.objects;
create policy "Public can upload cat photos"
  on storage.objects for insert
  to anon, authenticated
  with check (
    bucket_id = 'gatitos'
    and name ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|png|webp)$'
  );

grant delete on storage.objects to authenticated;
drop policy if exists "Administrators can delete cat photos" on storage.objects;
create policy "Administrators can delete cat photos"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'gatitos' and public.es_administrador());
