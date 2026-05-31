-- =====================================================
-- MIGRACIÓN: Comprobante de pago en invoice_payments
-- Ejecutar en: Supabase Dashboard → SQL Editor → New query
-- =====================================================

ALTER TABLE public.invoice_payments
  ADD COLUMN IF NOT EXISTS comprobante_url  text,
  ADD COLUMN IF NOT EXISTS comprobante_ref  text;

-- Bucket para comprobantes (ejecutar si no existe)
-- En Supabase Dashboard → Storage → Create bucket: "payment-proofs" (público o privado)
