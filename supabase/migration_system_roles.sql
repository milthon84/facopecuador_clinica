-- =====================================================
-- MIGRACIÓN: Sistema dinámico de roles y permisos
-- Ejecutar en: Supabase Dashboard → SQL Editor → New query
-- =====================================================

-- ── Tabla de roles del sistema ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.system_roles (
  name        text PRIMARY KEY,
  label       text NOT NULL,
  color       text NOT NULL DEFAULT 'bg-gray-100 text-gray-800 border-gray-200',
  description text NOT NULL DEFAULT '',
  is_system   boolean NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS trg_system_roles_updated_at ON public.system_roles;
CREATE TRIGGER trg_system_roles_updated_at
  BEFORE UPDATE ON public.system_roles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ── Tabla de permisos por rol (qué rutas puede acceder) ───────────────────
CREATE TABLE IF NOT EXISTS public.role_permissions (
  role_name text NOT NULL REFERENCES public.system_roles(name) ON DELETE CASCADE,
  path      text NOT NULL,
  PRIMARY KEY (role_name, path)
);

-- ── RLS ───────────────────────────────────────────────────────────────────
ALTER TABLE public.system_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;

-- Todos los usuarios autenticados pueden leer
DROP POLICY IF EXISTS "autenticados_leen_roles"    ON public.system_roles;
DROP POLICY IF EXISTS "autenticados_leen_permisos" ON public.role_permissions;
DROP POLICY IF EXISTS "admin_gestiona_roles"       ON public.system_roles;
DROP POLICY IF EXISTS "admin_gestiona_permisos"    ON public.role_permissions;

CREATE POLICY "autenticados_leen_roles"
  ON public.system_roles FOR SELECT TO authenticated USING (true);

CREATE POLICY "autenticados_leen_permisos"
  ON public.role_permissions FOR SELECT TO authenticated USING (true);

-- Solo admin puede modificar (usa service_role desde server actions)
CREATE POLICY "admin_gestiona_roles"
  ON public.system_roles FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "admin_gestiona_permisos"
  ON public.role_permissions FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ── Datos iniciales: roles del sistema ────────────────────────────────────
INSERT INTO public.system_roles (name, label, color, description, is_system) VALUES
  ('admin',         'Administrador', 'bg-lilac-100 text-lilac-800 border-lilac-300',
   'Acceso completo al sistema. No se puede eliminar.', true),
  ('recepcionista', 'Recepcionista', 'bg-blue-50 text-blue-800 border-blue-200',
   'Gestión de citas y pacientes', true),
  ('contador',      'Contador',      'bg-green-50 text-green-800 border-green-300',
   'Gestión contable y financiera', true)
ON CONFLICT (name) DO NOTHING;

-- ── Permisos iniciales ────────────────────────────────────────────────────
INSERT INTO public.role_permissions (role_name, path) VALUES
  ('recepcionista', '/gestion'),
  ('recepcionista', '/gestion/calendario'),
  ('recepcionista', '/gestion/pacientes')
ON CONFLICT DO NOTHING;

INSERT INTO public.role_permissions (role_name, path) VALUES
  ('contador', '/gestion'),
  ('contador', '/gestion/facturacion'),
  ('contador', '/gestion/gastos'),
  ('contador', '/gestion/contabilidad')
ON CONFLICT DO NOTHING;

-- ── Liberar constraint hardcodeado de user_profiles ───────────────────────
-- (elimina el check previo que solo permitía admin/recepcionista/contador)
ALTER TABLE public.user_profiles
  DROP CONSTRAINT IF EXISTS user_profiles_role_check;
