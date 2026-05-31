-- =====================================================
-- MIGRACIÓN: Cuentas por Cobrar y por Pagar
-- Ejecutar en: Supabase Dashboard → SQL Editor → New query
-- =====================================================

-- ── Estado de pago en facturas ────────────────────────────────────────────
ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS payment_status text NOT NULL DEFAULT 'paid'
    CHECK (payment_status IN ('paid', 'pending', 'partial'));

-- Facturas sin cuenta bancaria vinculada pueden marcarse como pendientes
-- Las existentes quedan en 'paid' por compatibilidad

-- ── Pagos recibidos contra facturas ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.invoice_payments (
  id              uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_id      uuid NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  amount          numeric(12,2) NOT NULL CHECK (amount > 0),
  payment_date    date NOT NULL DEFAULT current_date,
  payment_method  text NOT NULL DEFAULT 'transferencia'
    CHECK (payment_method IN ('efectivo','transferencia','cheque','tarjeta_debito','tarjeta_credito')),
  bank_account_id uuid REFERENCES public.bank_accounts(id) ON DELETE SET NULL,
  reference       text,
  notes           text,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_invoice_payments_invoice ON public.invoice_payments (invoice_id);

-- ── Pagos realizados contra gastos a crédito ─────────────────────────────
CREATE TABLE IF NOT EXISTS public.expense_payments (
  id              uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  expense_id      uuid NOT NULL REFERENCES public.expenses(id) ON DELETE CASCADE,
  amount          numeric(12,2) NOT NULL CHECK (amount > 0),
  payment_date    date NOT NULL DEFAULT current_date,
  payment_method  text NOT NULL DEFAULT 'transferencia'
    CHECK (payment_method IN ('efectivo','transferencia','cheque','tarjeta_debito','tarjeta_credito')),
  bank_account_id uuid REFERENCES public.bank_accounts(id) ON DELETE SET NULL,
  reference       text,
  notes           text,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_expense_payments_expense ON public.expense_payments (expense_id);

-- ── RLS ───────────────────────────────────────────────────────────────────
ALTER TABLE public.invoice_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expense_payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_contador_invoice_payments" ON public.invoice_payments;
DROP POLICY IF EXISTS "admin_contador_expense_payments" ON public.expense_payments;

CREATE POLICY "admin_contador_invoice_payments"
  ON public.invoice_payments FOR ALL TO authenticated
  USING (public.get_user_role() IN ('admin', 'contador'))
  WITH CHECK (public.get_user_role() IN ('admin', 'contador'));

CREATE POLICY "admin_contador_expense_payments"
  ON public.expense_payments FOR ALL TO authenticated
  USING (public.get_user_role() IN ('admin', 'contador'))
  WITH CHECK (public.get_user_role() IN ('admin', 'contador'));
