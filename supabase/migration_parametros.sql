-- =====================================================
-- MIGRACIÓN: PARÁMETROS DEL SISTEMA (Categorías y Unidades)
-- Ejecutar en: Supabase Dashboard → SQL Editor → New query
-- =====================================================

-- TABLA: inventory_categories
create table if not exists public.inventory_categories (
  id uuid primary key default uuid_generate_v4(),
  name text not null unique,
  prefix text not null unique,  -- Prefijo para generación de SKU (ej: 'CON', 'RES')
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- Datos iniciales (migrar valores hardcodeados)
insert into public.inventory_categories (name, prefix) values
  ('Consumibles',  'CON'),
  ('Restauración', 'RES'),
  ('Instrumentos', 'INS'),
  ('Equipos',      'EQU'),
  ('Desinfección', 'DES'),
  ('Medicamentos', 'MED'),
  ('Otros',        'OTR')
on conflict (name) do nothing;

-- TABLA: inventory_units
create table if not exists public.inventory_units (
  id uuid primary key default uuid_generate_v4(),
  name text not null unique,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- Datos iniciales
insert into public.inventory_units (name) values
  ('Unidades'),
  ('Cajas'),
  ('Paquetes'),
  ('Tubos'),
  ('Mililitros (ml)'),
  ('Gramos (g)')
on conflict (name) do nothing;

-- RLS
alter table public.inventory_categories enable row level security;
alter table public.inventory_units enable row level security;

create policy "Authenticated read categories"
  on public.inventory_categories for select
  using (auth.role() = 'authenticated');

create policy "Authenticated read units"
  on public.inventory_units for select
  using (auth.role() = 'authenticated');
