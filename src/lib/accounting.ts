/**
 * Módulo de Contabilidad — Generador de Asientos NIIF
 * Doble partida: suma de débitos siempre = suma de créditos
 */

import { createAdminClient } from "@/lib/supabase/admin";

const r2 = (n: number) => Math.round(n * 100) / 100;

// ── Mapeo: categoría de gasto → cuenta contable ────────────────────────────
const EXPENSE_CATEGORY_ACCOUNT: Record<string, { code: string; name: string }> = {
  "Insumos dentales":    { code: "5.1.01.01", name: "Insumos Dentales Utilizados" },
  "Equipos":             { code: "5.2.02.06", name: "Equipos y Herramientas" },
  "Arriendo":            { code: "5.2.02.01", name: "Arriendo de Local" },
  "Servicios básicos":   { code: "5.2.02.02", name: "Servicios Básicos" },
  "Salarios":            { code: "5.2.01.01", name: "Sueldos y Salarios" },
  "Suministros oficina": { code: "5.2.02.03", name: "Suministros de Oficina" },
  "Mantenimiento":       { code: "5.1.01.02", name: "Mantenimiento de Equipos" },
  "Publicidad":          { code: "5.2.02.04", name: "Publicidad y Marketing" },
  "Otros":               { code: "5.2.02.99", name: "Otros Gastos" },
};

// ── Mapeo: forma de pago del gasto → cuenta de contrapartida ──────────────
function paymentAccount(method: string): { code: string; name: string } {
  if (method === "credito") return { code: "2.1.01.01", name: "Cuentas por Pagar Proveedores" };
  if (method === "transferencia") return { code: "1.1.01.02", name: "Bancos" };
  return { code: "1.1.01.02", name: "Bancos" }; // efectivo y tarjeta → bancos
}

// ── Tipo para una línea del asiento ───────────────────────────────────────
interface JournalLine {
  account_code: string;
  account_name: string;
  debit:        number;
  credit:       number;
  description?: string;
}

// ── Insertar asiento completo ──────────────────────────────────────────────
async function insertJournalEntry(params: {
  entry_date:      string;
  description:     string;
  reference_type:  "invoice" | "expense" | "manual" | "asset_purchase" | "depreciation" | "disposal";
  reference_id:    string;
  lines:           JournalLine[];
  user_id?:        string | null;
  user_email?:     string | null;
}) {
  const supabase = createAdminClient();

  // Validar cuadre (débitos = créditos)
  const totalDebit  = r2(params.lines.reduce((s, l) => s + l.debit,  0));
  const totalCredit = r2(params.lines.reduce((s, l) => s + l.credit, 0));
  if (totalDebit !== totalCredit) {
    throw new Error(`Asiento descuadrado: débitos ${totalDebit} ≠ créditos ${totalCredit}`);
  }

  const { data: entry, error } = await supabase
    .from("journal_entries")
    .insert({
      entry_date:      params.entry_date,
      description:     params.description,
      reference_type:  params.reference_type,
      reference_id:    params.reference_id,
      status:          "posted",
      created_by_id:   params.user_id   ?? null,
      created_by_email: params.user_email ?? null,
    })
    .select()
    .single();

  if (error || !entry) throw new Error("Error creando asiento: " + error?.message);

  await supabase.from("journal_lines").insert(
    params.lines.map(l => ({
      journal_entry_id: entry.id,
      account_code:     l.account_code,
      account_name:     l.account_name,
      debit:            l.debit,
      credit:           l.credit,
      description:      l.description ?? null,
    }))
  );

  return entry.id;
}

// ── Asiento por Factura de Venta ───────────────────────────────────────────
/**
 * Factura emitida al cliente:
 *   Dr. Cuentas por Cobrar Clientes   (total)
 *   Cr.   Servicios Odontológicos     (subtotal sin IVA)
 *   Cr.   IVA en Ventas por Pagar     (iva_amount)   ← solo si hay IVA
 */
export async function createInvoiceJournalEntry(params: {
  invoice_id:   string;
  invoice_date: string;
  client_name:  string;
  subtotal_0:   number;
  subtotal_15:  number;
  iva_amount:   number;
  total:        number;
  user_id?:     string | null;
  user_email?:  string | null;
}) {
  const subtotalTotal = r2(params.subtotal_0 + params.subtotal_15);
  const lines: JournalLine[] = [
    {
      account_code: "1.1.02.01",
      account_name: "Cuentas por Cobrar Clientes",
      debit:  r2(params.total),
      credit: 0,
      description: params.client_name,
    },
    {
      account_code: "4.1.01.01",
      account_name: "Servicios Odontológicos",
      debit:  0,
      credit: subtotalTotal,
    },
  ];

  if (params.iva_amount > 0) {
    lines.push({
      account_code: "2.1.02.01",
      account_name: "IVA en Ventas por Pagar",
      debit:  0,
      credit: r2(params.iva_amount),
    });
  }

  return insertJournalEntry({
    entry_date:     params.invoice_date,
    description:    `Factura de venta — ${params.client_name}`,
    reference_type: "invoice",
    reference_id:   params.invoice_id,
    lines,
    user_id:        params.user_id,
    user_email:     params.user_email,
  });
}

// ── Asiento por Gasto / Factura de Compra ─────────────────────────────────
/**
 * Gasto registrado:
 *   Dr. Cuenta de Gasto               (subtotal_0 + subtotal_15)
 *   Dr. Crédito Tributario IVA        (iva_amount)   ← solo si hay IVA
 *   Cr.   Bancos / Ctas. por Pagar    (total)
 */
export async function createExpenseJournalEntry(params: {
  expense_id:      string;
  expense_date:    string;
  supplier_name:   string;
  category:        string;
  payment_method:  string;
  subtotal_0:      number;
  subtotal_15:     number;
  iva_amount:      number;
  total:           number;
  user_id?:        string | null;
  user_email?:     string | null;
}) {
  const expenseAccount = EXPENSE_CATEGORY_ACCOUNT[params.category]
    ?? EXPENSE_CATEGORY_ACCOUNT["Otros"];
  const contraAccount  = paymentAccount(params.payment_method);
  const subtotalTotal  = r2(params.subtotal_0 + params.subtotal_15);

  const lines: JournalLine[] = [
    {
      account_code: expenseAccount.code,
      account_name: expenseAccount.name,
      debit:  subtotalTotal,
      credit: 0,
      description: params.supplier_name,
    },
  ];

  if (params.iva_amount > 0) {
    lines.push({
      account_code: "1.1.03.01",
      account_name: "Crédito Tributario IVA",
      debit:  r2(params.iva_amount),
      credit: 0,
    });
  }

  lines.push({
    account_code: contraAccount.code,
    account_name: contraAccount.name,
    debit:  0,
    credit: r2(params.total),
    description: params.supplier_name,
  });

  return insertJournalEntry({
    entry_date:     params.expense_date,
    description:    `Gasto — ${params.category} — ${params.supplier_name}`,
    reference_type: "expense",
    reference_id:   params.expense_id,
    lines,
    user_id:        params.user_id,
    user_email:     params.user_email,
  });
}

// ── Mapeo: categoría de activo → cuentas contables ────────────────────────
const ASSET_ACCOUNTS: Record<string, { asset: string; assetName: string; dep: string; depName: string; depExp: string; depExpName: string }> = {
  "Inmuebles":                  { asset: "1.2.01.01", assetName: "Edificios e Inmuebles",      dep: "1.2.02.01", depName: "Dep. Acum. Edificios",      depExp: "5.2.03.01", depExpName: "Gasto Dep. Edificios" },
  "Equipos odontológicos":      { asset: "1.2.01.02", assetName: "Equipos Odontológicos",      dep: "1.2.02.02", depName: "Dep. Acum. Equipos Odont.", depExp: "5.2.03.02", depExpName: "Gasto Dep. Equipos Odont." },
  "Equipos de computación":     { asset: "1.2.01.03", assetName: "Equipos de Computación",    dep: "1.2.02.03", depName: "Dep. Acum. Computación",    depExp: "5.2.03.03", depExpName: "Gasto Dep. Computación" },
  "Muebles y enseres":          { asset: "1.2.01.04", assetName: "Muebles y Enseres",          dep: "1.2.02.04", depName: "Dep. Acum. Muebles",        depExp: "5.2.03.04", depExpName: "Gasto Dep. Muebles" },
  "Vehículos":                  { asset: "1.2.01.05", assetName: "Vehículos",                  dep: "1.2.02.05", depName: "Dep. Acum. Vehículos",      depExp: "5.2.03.05", depExpName: "Gasto Dep. Vehículos" },
  "Otros equipos y maquinaria": { asset: "1.2.01.09", assetName: "Otros Activos Fijos",        dep: "1.2.02.09", depName: "Dep. Acum. Otros Activos",  depExp: "5.2.03.09", depExpName: "Gasto Dep. Otros Activos" },
};

function assetAccounts(category: string) {
  return ASSET_ACCOUNTS[category] ?? ASSET_ACCOUNTS["Otros equipos y maquinaria"];
}

// ── Asiento: Compra de Activo Fijo ────────────────────────────────────────
export async function createAssetPurchaseJournalEntry(params: {
  asset_id:       string;
  purchase_date:  string;
  asset_name:     string;
  category:       string;
  purchase_value: number;
  on_credit:      boolean;
  user_id?:       string | null;
  user_email?:    string | null;
}) {
  const accts = assetAccounts(params.category);
  const creditAcct = params.on_credit
    ? { code: "2.1.01.02", name: "Cuentas por Pagar (Activos)" }
    : { code: "1.1.01.02", name: "Bancos" };

  return insertJournalEntry({
    entry_date:     params.purchase_date,
    description:    `Compra Activo Fijo — ${params.asset_name}`,
    reference_type: "asset_purchase",
    reference_id:   params.asset_id,
    lines: [
      { account_code: accts.asset,   account_name: accts.assetName, debit: r2(params.purchase_value), credit: 0, description: params.asset_name },
      { account_code: creditAcct.code, account_name: creditAcct.name, debit: 0, credit: r2(params.purchase_value) },
    ],
    user_id:    params.user_id,
    user_email: params.user_email,
  });
}

// ── Asiento: Depreciación Mensual ─────────────────────────────────────────
export async function createDepreciationJournalEntry(params: {
  asset_id:       string;
  asset_name:     string;
  category:       string;
  period:         string;   // 'YYYY-MM'
  monthly_amount: number;
  user_id?:       string | null;
  user_email?:    string | null;
}) {
  const accts = assetAccounts(params.category);

  return insertJournalEntry({
    entry_date:     `${params.period}-01`,
    description:    `Depreciación ${params.period} — ${params.asset_name}`,
    reference_type: "depreciation",
    reference_id:   params.asset_id,
    lines: [
      { account_code: accts.depExp, account_name: accts.depExpName, debit: r2(params.monthly_amount), credit: 0, description: `Dep. ${params.period}` },
      { account_code: accts.dep,    account_name: accts.depName,    debit: 0, credit: r2(params.monthly_amount) },
    ],
    user_id:    params.user_id,
    user_email: params.user_email,
  });
}
