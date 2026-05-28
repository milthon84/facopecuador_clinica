-- =====================================================
-- MIGRACIÓN: MÓDULO ADI — DIVIDENDOS Y UTILIDADES
-- Ejecutar en: Supabase Dashboard → SQL Editor → New query
-- =====================================================

create table if not exists public.dividends (
  id                uuid primary key default uuid_generate_v4(),
  fiscal_year       integer not null,               -- Año fiscal (ej: 2025)
  resolution_date   date not null,                  -- Fecha del acta de resolución
  resolution_number text,                           -- N° del acta
  beneficiary_name  text not null,                  -- Nombre del beneficiario
  beneficiary_ruc   text not null,                  -- RUC/CI del beneficiario
  beneficiary_type  text not null default 'natural', -- natural | juridica | exterior
  percentage        numeric(5,2) not null default 0, -- % de participación
  utility_amount    numeric(12,2) not null default 0, -- Monto de utilidad asignada
  tax_withheld      numeric(12,2) not null default 0, -- Retención aplicada
  net_amount        numeric(12,2) not null default 0, -- Monto neto a pagar
  paid_date         date,                            -- Fecha de pago efectivo
  status            text not null default 'pending', -- pending | paid | void
  notes             text,
  created_by_id     uuid references auth.users(id) on delete set null,
  created_at        timestamptz not null default now()
);

create index if not exists idx_dividends_year on public.dividends (fiscal_year desc);

alter table public.dividends enable row level security;

drop policy if exists "Auth dividends" on public.dividends;
create policy "Auth dividends"
  on public.dividends for all
  using (auth.role() = 'authenticated');
