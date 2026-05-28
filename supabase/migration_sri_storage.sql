-- =====================================================
-- MIGRACIÓN: BUCKET STORAGE PARA CERTIFICADOS SRI
-- Ejecutar en: Supabase Dashboard → SQL Editor → New query
-- =====================================================

-- Bucket privado para almacenar certificados .p12
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'sri-certificates',
  'sri-certificates',
  false,                      -- PRIVADO: no accesible públicamente
  5242880,                    -- 5 MB máximo
  ARRAY['application/x-pkcs12', 'application/octet-stream']
)
ON CONFLICT (id) DO NOTHING;

-- Solo el service_role (admin server-side) puede operar sobre este bucket
CREATE POLICY "Service role only - sri certificates"
  ON storage.objects FOR ALL
  USING (bucket_id = 'sri-certificates');

-- Agregar columna para almacenar password del certificado en sri_configs
ALTER TABLE public.sri_configs
  ADD COLUMN IF NOT EXISTS p12_storage_path text,      -- ruta en Supabase Storage
  ADD COLUMN IF NOT EXISTS p12_cert_subject text,      -- nombre del titular (informativo)
  ADD COLUMN IF NOT EXISTS p12_cert_expires text,      -- fecha de vencimiento (informativo)
  ADD COLUMN IF NOT EXISTS signature_password text;    -- contraseña del .p12
