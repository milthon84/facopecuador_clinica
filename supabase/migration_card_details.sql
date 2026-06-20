-- =====================================================
-- MIGRACIÓN: Datos detallados para pagos con tarjeta
-- Ejecutar en: Supabase Dashboard → SQL Editor → New query
-- =====================================================

-- 1. Agregar columnas a la tabla de invoices
ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS card_type text,
  ADD COLUMN IF NOT EXISTS card_voucher text,
  ADD COLUMN IF NOT EXISTS card_lote text;

-- 2. Agregar columnas a la tabla de bank_transactions
ALTER TABLE public.bank_transactions
  ADD COLUMN IF NOT EXISTS card_type text,
  ADD COLUMN IF NOT EXISTS card_voucher text,
  ADD COLUMN IF NOT EXISTS card_lote text;
