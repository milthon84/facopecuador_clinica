-- =====================================================
-- MIGRACIÓN: MÓDULO DE GASTOS / FACTURAS DE COMPRA
-- Ejecutar en: Supabase Dashboard → SQL Editor → New query
-- =====================================================

create table if not exists public.expenses (
  id                uuid primary key default uuid_generate_v4(),

  -- Proveedor
  supplier_name     text not null,
  supplier_ruc      text,

  -- Documento
  document_number   text,                   -- N° de factura del proveedor
  expense_date      date not null default current_date,

  -- Categoría y descripción
  category          text not null default 'Otros',
  description       text,

  -- Montos
  subtotal_0        numeric(10,2) not null default 0,
  subtotal_15       numeric(10,2) not null default 0,
  iva_amount        numeric(10,2) not null default 0,
  total             numeric(10,2) not null default 0,

  -- Forma de pago
  payment_method    text not null default 'efectivo',  -- efectivo, transferencia, tarjeta, credito

  -- Estado
  status            text not null default 'registered', -- registered, void

  -- Notas adicionales
  notes             text,

  -- Auditoría
  created_by_id     uuid references auth.users(id) on delete set null,
  created_by_email  text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index if not exists idx_expenses_date     on public.expenses (expense_date desc);
create index if not exists idx_expenses_category on public.expenses (category);

-- Trigger updated_at
drop trigger if exists trg_expenses_updated_at on public.expenses;
create trigger trg_expenses_updated_at
  before update on public.expenses
  for each row execute function public.set_updated_at();

-- RLS
alter table public.expenses enable row level security;

drop policy if exists "Authenticated can manage expenses" on public.expenses;

create policy "Authenticated can manage expenses"
  on public.expenses for all
  using (auth.role() = 'authenticated');
