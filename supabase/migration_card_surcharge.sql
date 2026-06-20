-- =====================================================
-- MIGRACIÓN: Configuración de recargo por tarjeta
-- Ejecutar en: Supabase Dashboard → SQL Editor → New query
-- =====================================================

ALTER TABLE public.sri_configs
  ADD COLUMN IF NOT EXISTS card_surcharge_percent numeric(5,2) not null default 5.00;
