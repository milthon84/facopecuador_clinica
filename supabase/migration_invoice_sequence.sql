-- =====================================================
-- MIGRACIÓN: SECUENCIA ATÓMICA PARA FACTURAS
-- Ejecutar en: Supabase Dashboard → SQL Editor → New query
-- Soluciona la race condition en la generación del número secuencial
-- =====================================================

-- 1. Crear secuencia dedicada para facturas (si no existe)
create sequence if not exists public.invoice_secuencial_seq
  start with 1
  increment by 1
  no minvalue
  no maxvalue
  cache 1;

-- 2. Si ya hay facturas existentes, avanzar la secuencia al valor actual máximo
do $$
declare
  max_sec int;
begin
  select coalesce(max(secuencial), 0) into max_sec from public.invoices;
  if max_sec > 0 then
    perform setval('public.invoice_secuencial_seq', max_sec);
  end if;
end;
$$;

-- 3. Función segura para obtener el siguiente secuencial (atómica, sin race condition)
create or replace function public.next_invoice_secuencial()
returns int
language sql
security definer
as $$
  select nextval('public.invoice_secuencial_seq')::int;
$$;

-- 4. Dar permiso de ejecución al rol authenticated (lo usa el server via admin client)
grant execute on function public.next_invoice_secuencial() to authenticated;
grant execute on function public.next_invoice_secuencial() to service_role;
