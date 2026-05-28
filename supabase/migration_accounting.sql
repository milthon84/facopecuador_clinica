-- =====================================================
-- MIGRACIÓN: MÓDULO CONTABILIDAD NIIF - SOCIEDAD ECUADOR
-- Ejecutar en: Supabase Dashboard → SQL Editor → New query
-- =====================================================

-- ── TABLA: Plan de Cuentas ─────────────────────────────────────────────────
create table if not exists public.accounts (
  id          uuid primary key default uuid_generate_v4(),
  code        text not null unique,         -- Ej: "1.1.01.01"
  name        text not null,
  type        text not null,                -- ACTIVO | PASIVO | PATRIMONIO | INGRESO | GASTO
  subtype     text,                         -- corriente | no_corriente | operacional | etc.
  parent_code text,
  active      boolean not null default true,
  created_at  timestamptz not null default now()
);

create index if not exists idx_accounts_code on public.accounts (code);
create index if not exists idx_accounts_type on public.accounts (type);

-- ── TABLA: Asientos Contables (Libro Diario) ──────────────────────────────
create table if not exists public.journal_entries (
  id               uuid primary key default uuid_generate_v4(),
  entry_date       date not null default current_date,
  description      text not null,
  reference_type   text,   -- invoice | expense | manual
  reference_id     uuid,
  status           text not null default 'posted',  -- posted | void
  created_by_id    uuid references auth.users(id) on delete set null,
  created_by_email text,
  created_at       timestamptz not null default now()
);

create index if not exists idx_journal_entries_date on public.journal_entries (entry_date desc);
create index if not exists idx_journal_entries_ref  on public.journal_entries (reference_type, reference_id);

-- ── TABLA: Líneas del Asiento ─────────────────────────────────────────────
create table if not exists public.journal_lines (
  id               uuid primary key default uuid_generate_v4(),
  journal_entry_id uuid not null references public.journal_entries(id) on delete cascade,
  account_code     text not null,
  account_name     text not null,
  debit            numeric(12,2) not null default 0,
  credit           numeric(12,2) not null default 0,
  description      text,
  created_at       timestamptz not null default now()
);

create index if not exists idx_journal_lines_entry   on public.journal_lines (journal_entry_id);
create index if not exists idx_journal_lines_account on public.journal_lines (account_code);

-- ── RLS ───────────────────────────────────────────────────────────────────
alter table public.accounts        enable row level security;
alter table public.journal_entries enable row level security;
alter table public.journal_lines   enable row level security;

drop policy if exists "Auth accounts"        on public.accounts;
drop policy if exists "Auth journal_entries" on public.journal_entries;
drop policy if exists "Auth journal_lines"   on public.journal_lines;

create policy "Auth accounts"
  on public.accounts for all using (auth.role() = 'authenticated');
create policy "Auth journal_entries"
  on public.journal_entries for all using (auth.role() = 'authenticated');
create policy "Auth journal_lines"
  on public.journal_lines for all using (auth.role() = 'authenticated');

-- ── PLAN DE CUENTAS NIIF — SOCIEDAD ECUADOR ───────────────────────────────
insert into public.accounts (code, name, type, subtype) values
  -- ACTIVOS
  ('1',          'ACTIVOS',                              'ACTIVO',     'grupo'),
  ('1.1',        'ACTIVO CORRIENTE',                     'ACTIVO',     'corriente'),
  ('1.1.01',     'EFECTIVO Y EQUIVALENTES',              'ACTIVO',     'corriente'),
  ('1.1.01.01',  'Caja',                                 'ACTIVO',     'corriente'),
  ('1.1.01.02',  'Bancos',                               'ACTIVO',     'corriente'),
  ('1.1.02',     'CUENTAS Y DOC. POR COBRAR',            'ACTIVO',     'corriente'),
  ('1.1.02.01',  'Cuentas por Cobrar Clientes',          'ACTIVO',     'corriente'),
  ('1.1.03',     'CRÉDITO TRIBUTARIO',                   'ACTIVO',     'corriente'),
  ('1.1.03.01',  'Crédito Tributario IVA',               'ACTIVO',     'corriente'),
  ('1.1.03.02',  'Crédito Tributario Renta',             'ACTIVO',     'corriente'),
  ('1.1.04',     'INVENTARIOS',                          'ACTIVO',     'corriente'),
  ('1.1.04.01',  'Inventario de Insumos Dentales',       'ACTIVO',     'corriente'),
  ('1.2',        'ACTIVO NO CORRIENTE',                  'ACTIVO',     'no_corriente'),
  ('1.2.01',     'PROPIEDAD, PLANTA Y EQUIPO',           'ACTIVO',     'no_corriente'),
  ('1.2.01.01',  'Equipos Odontológicos',                'ACTIVO',     'no_corriente'),
  ('1.2.01.02',  'Muebles y Enseres',                    'ACTIVO',     'no_corriente'),
  ('1.2.01.03',  'Equipos de Computación',               'ACTIVO',     'no_corriente'),
  ('1.2.01.99',  'Depreciación Acumulada',               'ACTIVO',     'no_corriente'),

  -- PASIVOS
  ('2',          'PASIVOS',                              'PASIVO',     'grupo'),
  ('2.1',        'PASIVO CORRIENTE',                     'PASIVO',     'corriente'),
  ('2.1.01',     'CUENTAS Y DOC. POR PAGAR',             'PASIVO',     'corriente'),
  ('2.1.01.01',  'Cuentas por Pagar Proveedores',        'PASIVO',     'corriente'),
  ('2.1.02',     'OBLIGACIONES TRIBUTARIAS',             'PASIVO',     'corriente'),
  ('2.1.02.01',  'IVA en Ventas por Pagar',              'PASIVO',     'corriente'),
  ('2.1.02.02',  'Retención en la Fuente por Pagar',     'PASIVO',     'corriente'),
  ('2.1.02.03',  'Retención IVA por Pagar',              'PASIVO',     'corriente'),
  ('2.1.03',     'OBLIGACIONES LABORALES',               'PASIVO',     'corriente'),
  ('2.1.03.01',  'IESS por Pagar',                       'PASIVO',     'corriente'),
  ('2.1.03.02',  'Sueldos por Pagar',                    'PASIVO',     'corriente'),
  ('2.1.04',     'ANTICIPOS DE CLIENTES',                'PASIVO',     'corriente'),
  ('2.1.04.01',  'Anticipos Recibidos',                  'PASIVO',     'corriente'),

  -- PATRIMONIO
  ('3',          'PATRIMONIO',                           'PATRIMONIO', 'grupo'),
  ('3.1',        'CAPITAL SOCIAL',                       'PATRIMONIO', 'capital'),
  ('3.1.01',     'Capital Suscrito y Pagado',            'PATRIMONIO', 'capital'),
  ('3.2',        'RESULTADOS',                           'PATRIMONIO', 'resultados'),
  ('3.2.01',     'Utilidad / Pérdida Ejercicios Ant.',   'PATRIMONIO', 'resultados'),
  ('3.2.02',     'Utilidad / Pérdida del Ejercicio',     'PATRIMONIO', 'resultados'),

  -- INGRESOS
  ('4',          'INGRESOS',                             'INGRESO',    'grupo'),
  ('4.1',        'INGRESOS OPERACIONALES',               'INGRESO',    'operacional'),
  ('4.1.01',     'INGRESOS POR SERVICIOS',               'INGRESO',    'operacional'),
  ('4.1.01.01',  'Servicios Odontológicos',              'INGRESO',    'operacional'),
  ('4.1.01.02',  'Consultas y Evaluaciones',             'INGRESO',    'operacional'),
  ('4.2',        'INGRESOS NO OPERACIONALES',            'INGRESO',    'no_operacional'),
  ('4.2.01.01',  'Otros Ingresos',                       'INGRESO',    'no_operacional'),

  -- GASTOS
  ('5',          'GASTOS',                               'GASTO',      'grupo'),
  ('5.1',        'GASTOS OPERACIONALES',                 'GASTO',      'operacional'),
  ('5.1.01',     'COSTO DE SERVICIOS',                   'GASTO',      'operacional'),
  ('5.1.01.01',  'Insumos Dentales Utilizados',          'GASTO',      'operacional'),
  ('5.1.01.02',  'Mantenimiento de Equipos',             'GASTO',      'operacional'),
  ('5.2',        'GASTOS ADMINISTRATIVOS',               'GASTO',      'administrativo'),
  ('5.2.01',     'GASTOS DE PERSONAL',                   'GASTO',      'administrativo'),
  ('5.2.01.01',  'Sueldos y Salarios',                   'GASTO',      'administrativo'),
  ('5.2.01.02',  'Aporte Patronal IESS',                 'GASTO',      'administrativo'),
  ('5.2.02',     'GASTOS GENERALES',                     'GASTO',      'administrativo'),
  ('5.2.02.01',  'Arriendo de Local',                    'GASTO',      'administrativo'),
  ('5.2.02.02',  'Servicios Básicos',                    'GASTO',      'administrativo'),
  ('5.2.02.03',  'Suministros de Oficina',               'GASTO',      'administrativo'),
  ('5.2.02.04',  'Publicidad y Marketing',               'GASTO',      'administrativo'),
  ('5.2.02.05',  'Depreciaciones',                       'GASTO',      'administrativo'),
  ('5.2.02.06',  'Equipos y Herramientas',               'GASTO',      'administrativo'),
  ('5.2.02.99',  'Otros Gastos',                         'GASTO',      'administrativo')
on conflict (code) do nothing;
