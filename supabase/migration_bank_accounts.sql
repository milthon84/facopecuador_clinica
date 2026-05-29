-- =====================================================
-- MIGRACIÓN: Módulo de Cuentas Bancarias
-- Ejecutar en: Supabase Dashboard → SQL Editor → New query
-- =====================================================

-- ── Tabla de cuentas bancarias ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.bank_accounts (
  id              uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  bank_name       text NOT NULL,
  account_number  text,
  account_type    text NOT NULL DEFAULT 'ahorros'
    CHECK (account_type IN ('ahorros', 'corriente', 'caja')),
  currency        text NOT NULL DEFAULT 'USD',
  initial_balance numeric(12,2) NOT NULL DEFAULT 0,
  is_active       boolean NOT NULL DEFAULT true,
  notes           text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS trg_bank_accounts_updated_at ON public.bank_accounts;
CREATE TRIGGER trg_bank_accounts_updated_at
  BEFORE UPDATE ON public.bank_accounts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ── Tabla de movimientos bancarios ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.bank_transactions (
  id             uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id     uuid NOT NULL REFERENCES public.bank_accounts(id) ON DELETE CASCADE,
  type           text NOT NULL CHECK (type IN ('ingreso', 'egreso')),
  amount         numeric(12,2) NOT NULL CHECK (amount > 0),
  date           date NOT NULL DEFAULT current_date,
  description    text NOT NULL,
  reference      text,
  payment_method text NOT NULL DEFAULT 'transferencia'
    CHECK (payment_method IN ('efectivo', 'transferencia', 'cheque', 'tarjeta_debito', 'tarjeta_credito')),
  invoice_id     uuid REFERENCES public.invoices(id) ON DELETE SET NULL,
  status         text NOT NULL DEFAULT 'confirmado'
    CHECK (status IN ('pendiente', 'confirmado')),
  created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bank_transactions_account ON public.bank_transactions (account_id);
CREATE INDEX IF NOT EXISTS idx_bank_transactions_invoice ON public.bank_transactions (invoice_id);
CREATE INDEX IF NOT EXISTS idx_bank_transactions_date    ON public.bank_transactions (date DESC);

-- ── Agregar campos de pago a la tabla invoices ────────────────────────────
ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS payment_method  text DEFAULT 'efectivo',
  ADD COLUMN IF NOT EXISTS bank_account_id uuid REFERENCES public.bank_accounts(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS payment_reference text;

-- ── RLS ───────────────────────────────────────────────────────────────────
ALTER TABLE public.bank_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bank_transactions ENABLE ROW LEVEL SECURITY;

-- Admin y contador pueden leer y escribir
CREATE POLICY "admin_contador_leen_cuentas"
  ON public.bank_accounts FOR SELECT TO authenticated
  USING (public.get_user_role() IN ('admin', 'contador'));

CREATE POLICY "admin_gestiona_cuentas"
  ON public.bank_accounts FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "admin_contador_leen_movimientos"
  ON public.bank_transactions FOR SELECT TO authenticated
  USING (public.get_user_role() IN ('admin', 'contador'));

CREATE POLICY "admin_gestiona_movimientos"
  ON public.bank_transactions FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());
