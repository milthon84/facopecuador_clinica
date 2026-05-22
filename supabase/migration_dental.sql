-- =====================================================
-- MIGRAION: FICHA DENTAL Y CONSULTAS ODONTOLÓGICAS
-- Ejecutar en: Supabase Dashboard → SQL Editor → New query
-- =====================================================

-- 1) TABLA: dental_records (Ficha Dental Permanente)
create table if not exists public.dental_records (
  id uuid primary key default uuid_generate_v4(),
  patient_id uuid not null unique references public.patients(id) on delete cascade,
  date_of_birth date,
  sex text check (sex in ('M', 'F', 'Otro')),
  address text,
  medical_history jsonb not null default '{}'::jsonb, -- Alergias, asma, diabetes, etc.
  stomatognathic_exam jsonb not null default '{}'::jsonb, -- Labios, lengua, etc.
  odontogram_state jsonb not null default '{}'::jsonb, -- Estado actual de cada diente/superficie
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_dental_records_patient on public.dental_records (patient_id);

-- Trigger para updated_at en dental_records
drop trigger if exists trg_dental_records_updated_at on public.dental_records;
create trigger trg_dental_records_updated_at
  before update on public.dental_records
  for each row execute function public.set_updated_at();

-- 2) TABLA: dental_consultations (Registro de Atención por Sesión)
create table if not exists public.dental_consultations (
  id uuid primary key default uuid_generate_v4(),
  appointment_id uuid not null unique references public.appointments(id) on delete cascade,
  patient_id uuid not null references public.patients(id) on delete cascade,
  treatment_notes text not null,                      -- Notas de evolución de la cita
  prescription text,                                  -- Recetas y medicación
  odontogram_snapshot jsonb not null default '{}'::jsonb, -- Foto de cómo quedó el odontograma
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_dental_consultations_appointment on public.dental_consultations (appointment_id);
create index if not exists idx_dental_consultations_patient on public.dental_consultations (patient_id);

-- Trigger para updated_at en dental_consultations
drop trigger if exists trg_dental_consultations_updated_at on public.dental_consultations;
create trigger trg_dental_consultations_updated_at
  before update on public.dental_consultations
  for each row execute function public.set_updated_at();

-- 3) SEGURIDAD (RLS)
alter table public.dental_records enable row level security;
alter table public.dental_consultations enable row level security;

-- Políticas para dental_records (solo admin)
drop policy if exists admin_all_dental_records on public.dental_records;
create policy admin_all_dental_records on public.dental_records
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Políticas para dental_consultations (solo admin)
drop policy if exists admin_all_dental_consultations on public.dental_consultations;
create policy admin_all_dental_consultations on public.dental_consultations
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());
