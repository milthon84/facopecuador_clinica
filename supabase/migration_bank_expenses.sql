-- =====================================================
-- MIGRACIÓN: Vincular gastos con cuentas bancarias
-- Ejecutar DESPUÉS de migration_bank_accounts.sql
-- =====================================================

-- Agregar cuenta bancaria y referencia a la tabla de gastos
ALTER TABLE public.expenses
  ADD COLUMN IF NOT EXISTS bank_account_id   uuid REFERENCES public.bank_accounts(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS payment_reference text;

-- Agregar expense_id a bank_transactions para el vínculo inverso
ALTER TABLE public.bank_transactions
  ADD COLUMN IF NOT EXISTS expense_id uuid REFERENCES public.expenses(id) ON DELETE SET NULL;
