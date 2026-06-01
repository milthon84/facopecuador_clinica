-- =====================================================================
-- SCRIPT: Limpiar datos de transacciones, cuentas y pacientes
-- ⚠ ADVERTENCIA: Esta operación es IRREVERSIBLE
-- Ejecutar en: Supabase Dashboard → SQL Editor → New query
-- =====================================================================
-- Este script elimina:
--   ✗ Movimientos bancarios (bank_transactions)
--   ✗ Cuentas bancarias (bank_accounts)
--   ✗ Pagos de facturas (invoice_payments)
--   ✗ Pagos de gastos/compras (expense_payments)
--   ✗ Ítems de facturas (invoice_items)
--   ✗ Facturas (invoices)
--   ✗ Compras/Gastos (expenses)
--   ✗ Activos fijos y depreciaciones (fixed_assets, asset_depreciations)
--   ✗ Asientos contables (journal_entries, journal_lines)
--   ✗ Citas y consultas (appointments, dental_consultations)
--   ✗ Historial odontológico (dental_records)
--   ✗ Dividendos (dividends)
--   ✗ Pacientes (patients)
--   ✗ Transacciones de inventario (inventory_transactions)
--   ✗ Auditoría (audit_logs)
--
-- Se CONSERVA:
--   ✓ Usuarios del sistema (user_profiles, auth.users)
--   ✓ Roles y permisos (system_roles, role_permissions)
--   ✓ Catálogos (inventory_categories, inventory_units, services)
--   ✓ Productos de inventario (inventory_products) — solo vacía stock
--   ✓ Configuración SRI (sri_configs)
--   ✓ Horarios y bloqueos (schedules, bloqueos)
-- =====================================================================

BEGIN;

-- 1. Movimientos bancarios
DELETE FROM public.bank_transactions;

-- 2. Cuentas bancarias
DELETE FROM public.bank_accounts;

-- 3. Pagos de facturas y gastos
DELETE FROM public.invoice_payments;
DELETE FROM public.expense_payments;

-- 4. Activos fijos
DELETE FROM public.asset_depreciations;
DELETE FROM public.fixed_assets;

-- 5. Asientos contables
DELETE FROM public.journal_lines;
DELETE FROM public.journal_entries;

-- 6. Ítems y facturas
DELETE FROM public.invoice_items;
DELETE FROM public.invoices;

-- 7. Compras / gastos
DELETE FROM public.expenses;

-- 8. Dividendos
DELETE FROM public.dividends;

-- 9. Consultas odontológicas e historial
DELETE FROM public.dental_consultations;
DELETE FROM public.dental_records;

-- 10. Citas / agendamiento
DELETE FROM public.appointments;

-- 11. Transacciones de inventario (vaciar stock sin eliminar productos)
DELETE FROM public.inventory_transactions;
UPDATE public.inventory_products SET current_stock = 0;

-- 12. Auditoría
DELETE FROM public.audit_logs;

-- 13. Pacientes
DELETE FROM public.patients;

-- ⚠ IMPORTANTE: NO SE RESETEA EL SECUENCIAL DE FACTURAS
-- El secuencial NUNCA debe retroceder para evitar "Clave de acceso registrada" en el SRI.
-- Si necesitas avanzar el secuencial manualmente, usa:
--   SELECT avanzar_secuencial_a(NUEVO_NUMERO);
-- Ejemplo: SELECT avanzar_secuencial_a(100); -- próxima factura será 001-001-000000100

COMMIT;

-- =====================================================================
-- Para limpiar SOLO transacciones bancarias (sin tocar pacientes):
-- =====================================================================
-- DELETE FROM public.bank_transactions;
-- DELETE FROM public.bank_accounts;
-- DELETE FROM public.invoice_payments;
-- DELETE FROM public.expense_payments;
-- COMMIT;
--
-- Para limpiar SOLO pacientes y citas:
-- =====================================================================
-- DELETE FROM public.dental_consultations;
-- DELETE FROM public.dental_records;
-- DELETE FROM public.appointments;
-- DELETE FROM public.patients;
-- COMMIT;
