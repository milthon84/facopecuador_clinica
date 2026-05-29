-- =====================================================
-- MIGRACIÓN: Agregar rol 'contador' al constraint de user_profiles
-- Ejecutar en: Supabase Dashboard → SQL Editor → New query
-- =====================================================

-- Eliminar el constraint existente que solo permite 'admin' y 'recepcionista'
ALTER TABLE public.user_profiles
  DROP CONSTRAINT IF EXISTS user_profiles_role_check;

-- Agregar constraint actualizado que incluye 'contador'
ALTER TABLE public.user_profiles
  ADD CONSTRAINT user_profiles_role_check
  CHECK (role IN ('admin', 'recepcionista', 'contador'));

-- Actualizar la política RLS de admin para incluir verificación correcta
-- (sin cambios necesarios, ya usa role = 'admin' que sigue siendo válido)
