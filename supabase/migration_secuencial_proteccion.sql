-- =====================================================
-- MIGRACIÓN: Protección del secuencial de facturas
-- Garantiza que el secuencial NUNCA retrocede
-- Ejecutar en: Supabase Dashboard → SQL Editor
-- =====================================================

-- 1. Sincronizar la secuencia con el máximo secuencial ya emitido
-- (protege contra resets accidentales de la DB)
SELECT setval(
  'public.invoice_secuencial_seq',
  GREATEST(
    (SELECT COALESCE(MAX(secuencial), 0) FROM public.invoices),
    nextval('public.invoice_secuencial_seq') - 1
  )
);

-- 2. Función segura: avanza el secuencial a un mínimo (NUNCA retrocede)
CREATE OR REPLACE FUNCTION public.avanzar_secuencial_a(nuevo_minimo INT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  actual INT;
  max_emitido INT;
BEGIN
  -- Obtener el valor actual de la secuencia
  SELECT last_value INTO actual FROM public.invoice_secuencial_seq;

  -- Obtener el máximo secuencial ya emitido en facturas
  SELECT COALESCE(MAX(secuencial), 0) INTO max_emitido FROM public.invoices;

  -- Solo avanzar si el nuevo mínimo es MAYOR al actual Y al máximo emitido
  IF nuevo_minimo > actual AND nuevo_minimo > max_emitido THEN
    PERFORM setval('public.invoice_secuencial_seq', nuevo_minimo - 1);
    RETURN 'OK: secuencial avanzado a ' || nuevo_minimo || ' (próxima factura será ' || nuevo_minimo || ')';
  ELSE
    RETURN 'IGNORADO: el valor ' || nuevo_minimo || ' no supera el actual (' || GREATEST(actual, max_emitido) || ')';
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.avanzar_secuencial_a(INT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.avanzar_secuencial_a(INT) TO service_role;

-- 3. Función de diagnóstico: muestra el estado actual del secuencial
CREATE OR REPLACE FUNCTION public.estado_secuencial()
RETURNS TABLE(
  secuencial_actual    INT,
  max_emitido          INT,
  proxima_factura      INT,
  ultima_factura_nro   TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    (SELECT last_value::INT FROM public.invoice_secuencial_seq),
    (SELECT COALESCE(MAX(i.secuencial), 0) FROM public.invoices i),
    (SELECT last_value::INT + 1 FROM public.invoice_secuencial_seq),
    (SELECT i.invoice_number FROM public.invoices i ORDER BY i.secuencial DESC LIMIT 1);
END;
$$;

GRANT EXECUTE ON FUNCTION public.estado_secuencial() TO authenticated;
GRANT EXECUTE ON FUNCTION public.estado_secuencial() TO service_role;
