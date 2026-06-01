-- =====================================================
-- MIGRACIÓN: Campo is_caja_general en bank_accounts
-- Ejecutar en: Supabase Dashboard → SQL Editor
-- =====================================================

ALTER TABLE public.bank_accounts
  ADD COLUMN IF NOT EXISTS is_caja_general boolean NOT NULL DEFAULT false;

-- Insertar la Caja General si no existe
INSERT INTO public.bank_accounts (bank_name, account_type, is_caja_general, initial_balance, is_active, notes)
SELECT 'Caja General', 'caja', true, 0, true, 'Recibe automáticamente los pagos en efectivo'
WHERE NOT EXISTS (
  SELECT 1 FROM public.bank_accounts WHERE is_caja_general = true
);
