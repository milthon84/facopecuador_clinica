-- =====================================================
-- MIGRACIÓN: Módulo de Activos Fijos
-- Ejecutar en: Supabase Dashboard → SQL Editor → New query
-- =====================================================

-- ── Tabla de activos fijos ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.fixed_assets (
  id                  uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name                text NOT NULL,
  category            text NOT NULL DEFAULT 'Otros equipos y maquinaria',
  description         text,

  -- Compra
  purchase_date       date NOT NULL,
  purchase_value      numeric(12,2) NOT NULL CHECK (purchase_value > 0),
  salvage_value       numeric(12,2) NOT NULL DEFAULT 0 CHECK (salvage_value >= 0),
  useful_life_years   int NOT NULL CHECK (useful_life_years > 0),
  depreciation_method text NOT NULL DEFAULT 'linea_recta',

  -- Proveedor / factura de compra
  supplier_name       text,
  supplier_ruc        text,
  invoice_number      text,

  -- Pago bancario
  bank_account_id     uuid REFERENCES public.bank_accounts(id) ON DELETE SET NULL,
  payment_reference   text,

  -- Estado
  status              text NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'disposed')),
  disposal_date       date,
  disposal_value      numeric(12,2),
  disposal_notes      text,

  created_by_id       uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS trg_fixed_assets_updated_at ON public.fixed_assets;
CREATE TRIGGER trg_fixed_assets_updated_at
  BEFORE UPDATE ON public.fixed_assets
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ── Tabla de períodos de depreciación registrados ─────────────────────────
CREATE TABLE IF NOT EXISTS public.asset_depreciations (
  id              uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  asset_id        uuid NOT NULL REFERENCES public.fixed_assets(id) ON DELETE CASCADE,
  period          text NOT NULL,          -- 'YYYY-MM'
  monthly_amount  numeric(12,4) NOT NULL,
  accumulated     numeric(12,4) NOT NULL,
  book_value      numeric(12,4) NOT NULL,
  journal_entry_id uuid,                 -- referencia al asiento contable
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (asset_id, period)
);

CREATE INDEX IF NOT EXISTS idx_asset_depreciations_asset ON public.asset_depreciations (asset_id);

-- ── RLS ───────────────────────────────────────────────────────────────────
ALTER TABLE public.fixed_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.asset_depreciations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_contador_leen_activos"         ON public.fixed_assets;
DROP POLICY IF EXISTS "admin_gestiona_activos"              ON public.fixed_assets;
DROP POLICY IF EXISTS "admin_contador_leen_depreciaciones"  ON public.asset_depreciations;
DROP POLICY IF EXISTS "admin_gestiona_depreciaciones"       ON public.asset_depreciations;

CREATE POLICY "admin_contador_leen_activos"
  ON public.fixed_assets FOR SELECT TO authenticated
  USING (public.get_user_role() IN ('admin', 'contador'));

CREATE POLICY "admin_gestiona_activos"
  ON public.fixed_assets FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "admin_contador_leen_depreciaciones"
  ON public.asset_depreciations FOR SELECT TO authenticated
  USING (public.get_user_role() IN ('admin', 'contador'));

CREATE POLICY "admin_gestiona_depreciaciones"
  ON public.asset_depreciations FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ── Actualizar constraint reference_type en journal_entries ───────────────
ALTER TABLE public.journal_entries
  DROP CONSTRAINT IF EXISTS journal_entries_reference_type_check;

ALTER TABLE public.journal_entries
  ADD CONSTRAINT journal_entries_reference_type_check
  CHECK (reference_type IN ('invoice','expense','manual','asset_purchase','depreciation','disposal'));
