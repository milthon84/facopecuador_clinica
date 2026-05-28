-- =====================================================
-- MIGRACIÓN: CATÁLOGO DE SERVICIOS
-- Ejecutar en: Supabase Dashboard → SQL Editor → New query
-- =====================================================

create table if not exists public.services (
  id          uuid primary key default uuid_generate_v4(),
  name        text not null,
  description text,
  price       numeric(10,2) not null default 0,
  iva_code    text not null default '0',   -- '0' = IVA 0%, '4' = IVA 15%
  category    text not null default 'General',
  active      boolean not null default true,
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists idx_services_category on public.services (category);
create index if not exists idx_services_active   on public.services (active);

drop trigger if exists trg_services_updated_at on public.services;
create trigger trg_services_updated_at
  before update on public.services
  for each row execute function public.set_updated_at();

alter table public.services enable row level security;

drop policy if exists "Auth services" on public.services;
create policy "Auth services"
  on public.services for all
  using (auth.role() = 'authenticated');

-- Servicios iniciales de ejemplo para una clínica dental
insert into public.services (name, description, price, iva_code, category, sort_order) values
  ('Consulta General',           'Evaluación y diagnóstico odontológico',          40.00, '0', 'Consultas',    1),
  ('Consulta de Urgencia',       'Atención de urgencias dentales',                 55.00, '0', 'Consultas',    2),
  ('Profilaxis Dental',          'Limpieza dental profesional con ultrasonido',    60.00, '0', 'Preventivos',  3),
  ('Aplicación de Flúor',        'Fluorización tópica profesional',                25.00, '0', 'Preventivos',  4),
  ('Extracción Simple',          'Extracción de pieza dental sin complicaciones',  50.00, '0', 'Cirugía',      5),
  ('Extracción Quirúrgica',      'Extracción quirúrgica o cordal',                 120.00,'0', 'Cirugía',      6),
  ('Resina Dental',              'Restauración con resina composite',              60.00, '0', 'Restauración', 7),
  ('Amalgama',                   'Restauración con amalgama dental',               45.00, '0', 'Restauración', 8),
  ('Endodoncia Unirradicular',   'Tratamiento de conducto 1 raíz',                200.00,'0', 'Endodoncia',   9),
  ('Endodoncia Multirradicular', 'Tratamiento de conducto múltiples raíces',       280.00,'0', 'Endodoncia',   10),
  ('Corona Porcelana',           'Corona dental de porcelana sobre metal',         350.00,'0', 'Prótesis',     11),
  ('Prótesis Total',             'Dentadura completa superior o inferior',         400.00,'0', 'Prótesis',     12),
  ('Blanqueamiento Dental',      'Blanqueamiento profesional en consultorio',      150.00,'0', 'Estética',     13),
  ('Ortodoncia (mensualidad)',   'Mensualidad de tratamiento de ortodoncia',       80.00, '0', 'Ortodoncia',   14),
  ('Radiografía Periapical',     'Radiografía dental periapical',                  15.00, '0', 'Diagnóstico',  15),
  ('Radiografía Panorámica',     'Ortopantomografía digital',                      35.00, '0', 'Diagnóstico',  16)
on conflict do nothing;
