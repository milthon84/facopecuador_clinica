-- =====================================================
-- MIGRACIÓN DE LIMPIEZA: Eliminar transacciones duplicadas de facturas rechazadas
-- Ejecutar en: Supabase Dashboard → SQL Editor → New query
-- =====================================================

-- 1. Eliminar transacciones de banco asociadas a facturas rechazadas
DELETE FROM public.bank_transactions
WHERE invoice_id IN (
  SELECT id FROM public.invoices WHERE sri_status = 'rejected'
);

-- 2. Eliminar líneas de asiento contable asociadas a facturas rechazadas
DELETE FROM public.journal_lines
WHERE journal_entry_id IN (
  SELECT id FROM public.journal_entries 
  WHERE reference_type = 'invoice' 
    AND reference_id IN (SELECT id::text FROM public.invoices WHERE sri_status = 'rejected')
);

-- 3. Eliminar cabeceras de asiento contable asociadas a facturas rechazadas
DELETE FROM public.journal_entries
WHERE reference_type = 'invoice' 
  AND reference_id IN (SELECT id::text FROM public.invoices WHERE sri_status = 'rejected');
