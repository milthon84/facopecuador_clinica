-- =====================================================
-- MIGRAION: INVENTARIO DE INSUMOS Y FACTURACIÓN ELECTRÓNICA (SRI)
-- Ejecutar en: Supabase Dashboard → SQL Editor → New query
-- =====================================================

-- =====================================================
-- MÓDULO 1: INVENTARIO DE INSUMOS DENTALES
-- =====================================================

-- TABLA: inventory_products (Catálogo de Productos)
create table if not exists public.inventory_products (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  sku text unique,
  description text,
  category text not null, -- 'Consumibles', 'Instrumentos', 'Equipos', 'Restauración', etc.
  unit_of_measure text not null, -- 'Unidades', 'Cajas', 'Mililitros', etc.
  minimum_stock numeric not null default 0,
  current_stock numeric not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_inventory_products_name on public.inventory_products (name);
create index if not exists idx_inventory_products_category on public.inventory_products (category);

-- Trigger para updated_at en inventory_products
drop trigger if exists trg_inventory_products_updated_at on public.inventory_products;
create trigger trg_inventory_products_updated_at
  before update on public.inventory_products
  for each row execute function public.set_updated_at();

-- TABLA: inventory_transactions (Historial de Entradas y Salidas)
create type inventory_transaction_type as enum ('entrada', 'salida');

create table if not exists public.inventory_transactions (
  id uuid primary key default uuid_generate_v4(),
  product_id uuid not null references public.inventory_products(id) on delete restrict,
  type inventory_transaction_type not null,
  quantity numeric not null check (quantity > 0),
  reason text not null, -- Ej. 'Inventario Inicial', 'Compra', 'Uso Semanal', 'Ajuste'
  transaction_date timestamptz not null default now(),
  created_at timestamptz not null default now(),
  created_by uuid -- Opcional: Referencia al auth.users.id
);

create index if not exists idx_inventory_transactions_product on public.inventory_transactions (product_id);
create index if not exists idx_inventory_transactions_date on public.inventory_transactions (transaction_date);

-- Trigger para actualizar el stock actual (current_stock) al insertar una transacción
create or replace function update_current_stock()
returns trigger as $$
begin
  if new.type = 'entrada' then
    update public.inventory_products
    set current_stock = current_stock + new.quantity
    where id = new.product_id;
  elsif new.type = 'salida' then
    update public.inventory_products
    set current_stock = current_stock - new.quantity
    where id = new.product_id;
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_update_current_stock on public.inventory_transactions;
create trigger trg_update_current_stock
  after insert on public.inventory_transactions
  for each row execute function update_current_stock();


-- =====================================================
-- MÓDULO 2: FACTURACIÓN ELECTRÓNICA Y SRI
-- =====================================================

-- TABLA: sri_configs (Configuración Emisor - 1 fila por defecto)
create table if not exists public.sri_configs (
  id uuid primary key default uuid_generate_v4(),
  ruc text not null,
  razon_social text not null,
  nombre_comercial text,
  establecimiento text not null default '001',
  punto_emision text not null default '001',
  direccion_matriz text not null,
  obligado_contabilidad boolean not null default false,
  ambiente text not null default '1', -- '1' = Pruebas, '2' = Producción
  signature_p12_name text, -- Nombre del archivo almacenado
  signature_password text, -- Contraseña del certificado (Debe manejarse con precaución)
  updated_at timestamptz not null default now()
);

-- Asegurarse de tener al menos una configuración inicial vacía o default
insert into public.sri_configs (id, ruc, razon_social, establecimiento, punto_emision, direccion_matriz, ambiente)
values (uuid_generate_v4(), '9999999999999', 'EMPRESA DEMO', '001', '001', 'Dirección Matriz', '1')
on conflict do nothing;

drop trigger if exists trg_sri_configs_updated_at on public.sri_configs;
create trigger trg_sri_configs_updated_at
  before update on public.sri_configs
  for each row execute function public.set_updated_at();

-- TABLA: invoices (Cabecera de Facturas)
create table if not exists public.invoices (
  id uuid primary key default uuid_generate_v4(),
  patient_id uuid references public.patients(id) on delete set null, -- Opcional, puede facturarse a un tercero
  client_name text not null,
  client_document text not null, -- Cédula o RUC
  client_email text,
  client_phone text,
  client_address text,
  invoice_number text, -- Formato: Estab-PtoEmi-Secuencial (ej. 001-001-000000001)
  secuencial int, -- Para autoincremento fácil
  issue_date date not null default current_date,
  
  -- Valores Financieros
  subtotal_15 numeric not null default 0,
  subtotal_0 numeric not null default 0,
  subtotal_no_iva numeric not null default 0,
  subtotal_exento numeric not null default 0,
  total_discount numeric not null default 0,
  iva_rate numeric not null default 15,
  iva_amount numeric not null default 0,
  total numeric not null default 0,
  
  -- Estados e info del SRI
  sri_access_key text, -- Clave de 49 dígitos
  sri_status text not null default 'draft', -- draft, signed, submitted, authorized, rejected, error
  sri_environment text not null default '1',
  sri_authorization_number text,
  sri_authorization_date timestamptz,
  sri_error_messages jsonb, -- Detalles de rechazo o error

  -- Enlaces a comprobantes
  xml_url text,
  pdf_url text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  
  constraint invoices_secuencial_unique unique (secuencial)
);

create index if not exists idx_invoices_patient on public.invoices (patient_id);
create index if not exists idx_invoices_status on public.invoices (sri_status);

drop trigger if exists trg_invoices_updated_at on public.invoices;
create trigger trg_invoices_updated_at
  before update on public.invoices
  for each row execute function public.set_updated_at();

-- TABLA: invoice_items (Detalle de Factura)
create table if not exists public.invoice_items (
  id uuid primary key default uuid_generate_v4(),
  invoice_id uuid not null references public.invoices(id) on delete cascade,
  description text not null,
  quantity numeric not null check (quantity > 0),
  unit_price numeric not null check (unit_price >= 0),
  discount numeric not null default 0 check (discount >= 0),
  iva_code text not null default '4', -- '4' = 15%, '0' = 0%, '2' = 12% (según SRI)
  total numeric not null check (total >= 0)
);

create index if not exists idx_invoice_items_invoice on public.invoice_items (invoice_id);

-- =====================================================
-- SEGURIDAD (RLS) - Todo bloqueado por defecto y accesible solo por Admin
-- =====================================================

alter table public.inventory_products enable row level security;
alter table public.inventory_transactions enable row level security;
alter table public.sri_configs enable row level security;
alter table public.invoices enable row level security;
alter table public.invoice_items enable row level security;

-- Políticas de Admin
create policy admin_all_inventory_products on public.inventory_products for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy admin_all_inventory_transactions on public.inventory_transactions for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy admin_all_sri_configs on public.sri_configs for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy admin_all_invoices on public.invoices for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy admin_all_invoice_items on public.invoice_items for all to authenticated using (public.is_admin()) with check (public.is_admin());

