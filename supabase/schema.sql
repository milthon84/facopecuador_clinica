-- =====================================================
-- AGENDA DE CITAS - ESQUEMA SUPABASE
-- Ejecutar en: Supabase Dashboard → SQL Editor → New query
-- =====================================================

-- Extensiones útiles
create extension if not exists "uuid-ossp";

-- =====================================================
-- TABLA: patients
-- =====================================================
create table if not exists public.patients (
  id uuid primary key default uuid_generate_v4(),
  full_name text not null,
  document_number text unique,                  -- cédula
  phone text not null,
  email text not null,
  notes text,                                   -- notas internas del profesional
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint patients_email_unique unique (email)
);

create index if not exists idx_patients_document on public.patients (document_number);
create index if not exists idx_patients_email on public.patients (email);
create index if not exists idx_patients_phone on public.patients (phone);

-- =====================================================
-- TABLA: appointments
-- =====================================================
create type appointment_status as enum ('scheduled', 'attended', 'no_show', 'cancelled');

create table if not exists public.appointments (
  id uuid primary key default uuid_generate_v4(),
  patient_id uuid not null references public.patients(id) on delete restrict,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  status appointment_status not null default 'scheduled',
  reason text,                                  -- motivo de consulta
  admin_notes text,                             -- notas internas post-consulta
  cancellation_reason text,
  cancelled_at timestamptz,
  cancelled_by text,                            -- 'patient' o 'admin'
  reminder_sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint appointments_time_check check (ends_at > starts_at)
);

create index if not exists idx_appointments_starts on public.appointments (starts_at);
create index if not exists idx_appointments_patient on public.appointments (patient_id);
create index if not exists idx_appointments_status on public.appointments (status);

-- Evitar reservas duplicadas en el mismo horario (excepto cancelaciones)
create unique index if not exists uq_appointments_active_slot
  on public.appointments (starts_at)
  where status <> 'cancelled';

-- =====================================================
-- TABLA: availability_rules (horario base recurrente)
-- =====================================================
create table if not exists public.availability_rules (
  id uuid primary key default uuid_generate_v4(),
  day_of_week int not null check (day_of_week between 0 and 6), -- 0=Domingo, 1=Lunes, ... 6=Sábado
  start_time time not null,
  end_time time not null,
  slot_duration_minutes int not null default 60 check (slot_duration_minutes > 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  constraint availability_rules_time_check check (end_time > start_time)
);

create index if not exists idx_availability_rules_dow on public.availability_rules (day_of_week);

-- =====================================================
-- TABLA: availability_exceptions (bloqueos y horarios extra)
-- =====================================================
create type exception_type as enum ('block', 'extra');

create table if not exists public.availability_exceptions (
  id uuid primary key default uuid_generate_v4(),
  date date not null,
  type exception_type not null,
  start_time time,                              -- NULL = todo el día (solo para 'block')
  end_time time,
  reason text,
  created_at timestamptz not null default now(),
  constraint exceptions_extra_requires_time check (
    type = 'block' or (start_time is not null and end_time is not null)
  ),
  constraint exceptions_time_check check (
    start_time is null or end_time is null or end_time > start_time
  )
);

create index if not exists idx_exceptions_date on public.availability_exceptions (date);

-- =====================================================
-- TRIGGER: updated_at automático
-- =====================================================
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_patients_updated_at on public.patients;
create trigger trg_patients_updated_at
  before update on public.patients
  for each row execute function public.set_updated_at();

drop trigger if exists trg_appointments_updated_at on public.appointments;
create trigger trg_appointments_updated_at
  before update on public.appointments
  for each row execute function public.set_updated_at();

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================
alter table public.patients enable row level security;
alter table public.appointments enable row level security;
alter table public.availability_rules enable row level security;
alter table public.availability_exceptions enable row level security;

-- Helper: el usuario está autenticado como admin
create or replace function public.is_admin() returns boolean
language sql stable as $$
  select coalesce(
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
    or (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin',
    false
  );
$$;

-- Policies de admin (full access cuando es admin)
drop policy if exists admin_all_patients on public.patients;
create policy admin_all_patients on public.patients
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists admin_all_appointments on public.appointments;
create policy admin_all_appointments on public.appointments
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists admin_all_rules on public.availability_rules;
create policy admin_all_rules on public.availability_rules
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists admin_all_exceptions on public.availability_exceptions;
create policy admin_all_exceptions on public.availability_exceptions
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Lectura pública de reglas y excepciones (necesario para calcular slots)
drop policy if exists public_read_rules on public.availability_rules;
create policy public_read_rules on public.availability_rules
  for select to anon
  using (is_active = true);

drop policy if exists public_read_exceptions on public.availability_exceptions;
create policy public_read_exceptions on public.availability_exceptions
  for select to anon
  using (true);

-- Las INSERTs de pacientes/citas las hace el servidor con service_role,
-- así que no hace falta policy pública para INSERT.

-- =====================================================
-- SEED: horario base Lun-Sáb 9-12 y 13-16, slots de 60 min
-- =====================================================
insert into public.availability_rules (day_of_week, start_time, end_time, slot_duration_minutes)
values
  (1, '09:00', '12:00', 60),
  (1, '13:00', '16:00', 60),
  (2, '09:00', '12:00', 60),
  (2, '13:00', '16:00', 60),
  (3, '09:00', '12:00', 60),
  (3, '13:00', '16:00', 60),
  (4, '09:00', '12:00', 60),
  (4, '13:00', '16:00', 60),
  (5, '09:00', '12:00', 60),
  (5, '13:00', '16:00', 60),
  (6, '09:00', '12:00', 60),
  (6, '13:00', '16:00', 60)
on conflict do nothing;
