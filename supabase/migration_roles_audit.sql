-- =====================================================
-- MIGRACIÓN: ROLES DE USUARIO Y AUDITORÍA
-- Ejecutar en: Supabase Dashboard → SQL Editor → New query
-- =====================================================

-- =====================================================
-- TABLA: user_profiles (Perfiles de usuarios del sistema)
-- =====================================================
create table if not exists public.user_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  role text not null default 'recepcionista'
    check (role in ('admin', 'recepcionista')),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Trigger para updated_at
drop trigger if exists trg_user_profiles_updated_at on public.user_profiles;
create trigger trg_user_profiles_updated_at
  before update on public.user_profiles
  for each row execute function public.set_updated_at();

-- RLS: usuarios autenticados pueden leer su propio perfil
alter table public.user_profiles enable row level security;

create policy "usuarios_leen_su_perfil"
  on public.user_profiles for select
  to authenticated
  using (id = auth.uid());

create policy "admin_gestiona_perfiles"
  on public.user_profiles for all
  to authenticated
  using (
    exists (
      select 1 from public.user_profiles up
      where up.id = auth.uid() and up.role = 'admin'
    )
  )
  with check (
    exists (
      select 1 from public.user_profiles up
      where up.id = auth.uid() and up.role = 'admin'
    )
  );

-- =====================================================
-- ACTUALIZAR is_admin() para usar user_profiles
-- =====================================================
create or replace function public.is_admin()
returns boolean
language plpgsql
security definer
as $$
begin
  return exists (
    select 1 from public.user_profiles
    where id = auth.uid() and role = 'admin' and is_active = true
  );
end;
$$;

-- Nueva función para verificar rol
create or replace function public.get_user_role()
returns text
language plpgsql
security definer
as $$
declare
  v_role text;
begin
  select role into v_role
  from public.user_profiles
  where id = auth.uid() and is_active = true;
  return coalesce(v_role, 'recepcionista');
end;
$$;

-- =====================================================
-- TABLA: audit_logs (Auditoría de acciones del sistema)
-- =====================================================
create table if not exists public.audit_logs (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete set null,
  user_email text,
  user_role text,
  action text not null,
  -- 'login' | 'logout' | 'create' | 'update' | 'delete' | 'cancel' | 'export' | 'import'
  resource text not null,
  -- 'session' | 'appointment' | 'patient' | 'inventory_transaction' |
  -- 'dental_consultation' | 'invoice' | 'user_profile'
  resource_id text,
  description text not null,
  metadata jsonb,          -- datos adicionales (estado anterior, nuevo valor, etc.)
  ip_address text,
  created_at timestamptz not null default now()
);

create index if not exists idx_audit_logs_user on public.audit_logs (user_id);
create index if not exists idx_audit_logs_resource on public.audit_logs (resource);
create index if not exists idx_audit_logs_created on public.audit_logs (created_at desc);
create index if not exists idx_audit_logs_action on public.audit_logs (action);

-- RLS: solo admins leen la auditoría; inserts via service_role
alter table public.audit_logs enable row level security;

create policy "admin_lee_auditoria"
  on public.audit_logs for select
  to authenticated
  using (public.is_admin());

-- Permitir que service_role inserte (para API routes con admin client)
-- No es necesario crear policy para service_role ya que bypasa RLS.

-- =====================================================
-- AGREGAR created_by a inventory_transactions (si no existe)
-- =====================================================
alter table public.inventory_transactions
  add column if not exists created_by_id uuid references auth.users(id) on delete set null,
  add column if not exists created_by_email text;

-- =====================================================
-- NOTA: Después de ejecutar esta migración, ir a
-- /admin/usuarios y crear el primer usuario administrador.
-- El usuario existente en auth.users también debe tener
-- su perfil insertado manualmente o desde la pantalla.
-- =====================================================
-- Ejemplo: insertar el admin existente (reemplaza el UUID con el real):
-- INSERT INTO public.user_profiles (id, full_name, role)
-- VALUES ('TU-UUID-AQUI', 'Administrador', 'admin')
-- ON CONFLICT (id) DO NOTHING;
