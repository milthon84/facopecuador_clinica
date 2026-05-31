-- =====================================================
-- MIGRACIÓN: Origen e identificación de movimientos bancarios
-- Ejecutar en: Supabase Dashboard → SQL Editor → New query
-- =====================================================

-- Columna de origen: distingue movimientos automáticos (factura/gasto) de manuales
ALTER TABLE public.bank_transactions
  ADD COLUMN IF NOT EXISTS origin text NOT NULL DEFAULT 'manual'
    CHECK (origin IN ('automatico', 'manual'));

-- Columna de categoría para movimientos manuales
ALTER TABLE public.bank_transactions
  ADD COLUMN IF NOT EXISTS categoria text;
