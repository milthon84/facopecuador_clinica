import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Save } from "lucide-react";
import { createExpenseJournalEntry } from "@/lib/accounting";

export const dynamic = "force-dynamic";

const CATEGORIES = [
  "Insumos dentales",
  "Equipos",
  "Arriendo",
  "Servicios básicos",
  "Salarios",
  "Suministros oficina",
  "Mantenimiento",
  "Publicidad",
  "Otros",
];

async function saveExpense(formData: FormData) {
  "use server";
  const supabase   = createAdminClient();
  const authClient = createClient();
  const { data: { user } } = await authClient.auth.getUser();

  const subtotal0  = Number(formData.get("subtotal_0")  || 0);
  const subtotal15 = Number(formData.get("subtotal_15") || 0);
  const ivaAmount  = Math.round(subtotal15 * 0.15 * 100) / 100;
  const total      = Math.round((subtotal0 + subtotal15 + ivaAmount) * 100) / 100;

  const category         = formData.get("category") as string;
  const payment_method   = formData.get("payment_method") as string;
  const expense_date     = formData.get("expense_date") as string;
  const supplier_name    = (formData.get("supplier_name") as string).trim();
  const bank_account_id  = (formData.get("bank_account_id") as string) || null;
  const payment_reference = (formData.get("payment_reference") as string)?.trim() || null;

  const { data: expense, error: expenseError } = await supabase.from("expenses").insert({
    supplier_name,
    supplier_ruc:      (formData.get("supplier_ruc") as string)?.trim() || null,
    document_number:   (formData.get("document_number") as string)?.trim() || null,
    expense_date,
    category,
    description:       (formData.get("description") as string)?.trim() || null,
    subtotal_0:        subtotal0,
    subtotal_15:       subtotal15,
    iva_amount:        ivaAmount,
    total,
    payment_method,
    bank_account_id:   bank_account_id || null,
    payment_reference: payment_reference || null,
    notes:             (formData.get("notes") as string)?.trim() || null,
    created_by_id:     user?.id ?? null,
    created_by_email:  user?.email ?? null,
  }).select().single();

  if (expenseError || !expense) throw new Error(expenseError?.message ?? "Error al guardar la compra");

  // Crear transacción bancaria automática (egreso) — no aplica a crédito
  if (expense && bank_account_id && payment_method !== "credito") {
    try {
      // Mapear payment_method de gastos al formato de bank_transactions
      const pmMap: Record<string, string> = {
        efectivo:      "efectivo",
        transferencia: "transferencia",
        tarjeta:       "tarjeta_debito",
      };
      await supabase.from("bank_transactions").insert({
        account_id:     bank_account_id,
        type:           "egreso",
        amount:         total,
        date:           expense_date,
        description:    `Gasto: ${supplier_name}${category ? ` (${category})` : ""}`,
        reference:      payment_reference,
        payment_method: pmMap[payment_method] ?? "transferencia",
        expense_id:     expense.id,
        status:         "confirmado",
      });
    } catch (err) {
      console.error("Transacción bancaria de gasto no registrada:", err);
    }
  }

  // Generar asiento contable automático
  if (expense) {
    try {
      await createExpenseJournalEntry({
        expense_id:   expense.id,
        expense_date,
        supplier_name,
        category,
        payment_method,
        subtotal_0:   subtotal0,
        subtotal_15:  subtotal15,
        iva_amount:   ivaAmount,
        total,
        user_id:      user?.id,
        user_email:   user?.email,
      });
    } catch (err) {
      console.error("Asiento contable no generado:", err);
    }
  }

  redirect("/gestion/gastos");
}

export default async function NuevoGastoPage() {
  const today = new Date().toISOString().split("T")[0];

  const supabase = createAdminClient();
  const { data: bankAccounts } = await supabase
    .from("bank_accounts")
    .select("id, bank_name, account_number, account_type")
    .eq("is_active", true)
    .order("bank_name");

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-4">
        <Link href="/gestion/gastos"
          className="w-9 h-9 flex items-center justify-center rounded-xl bg-white border border-lilac-200 text-ink-600 hover:bg-lilac-50 transition-colors shrink-0">
          <ArrowLeft size={18} />
        </Link>
        <h1 className="text-xl font-bold text-ink-900">Registrar Compra</h1>
      </div>

      <div className="bg-white border border-lilac-100 rounded-2xl shadow-sm p-4 sm:p-6">
        <form action={saveExpense} className="space-y-4">

          {/* Proveedor */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-ink-700">Proveedor *</label>
              <input type="text" name="supplier_name" required
                placeholder="Nombre del proveedor"
                className="w-full border border-lilac-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-lilac-400 bg-white" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-ink-700">RUC del proveedor</label>
              <input type="text" name="supplier_ruc" maxLength={13}
                placeholder="0000000000001"
                className="w-full border border-lilac-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-lilac-400 bg-white font-mono" />
            </div>
          </div>

          {/* Documento y fecha */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-ink-700">N° de Factura</label>
              <input type="text" name="document_number"
                placeholder="001-001-000000001"
                className="w-full border border-lilac-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-lilac-400 bg-white font-mono" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-ink-700">Fecha *</label>
              <input type="date" name="expense_date" required defaultValue={today}
                className="w-full border border-lilac-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-lilac-400 bg-white" />
            </div>
          </div>

          {/* Categoría */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-ink-700">Categoría *</label>
            <select name="category" required
              className="w-full border border-lilac-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-lilac-400 bg-white">
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          {/* Pago */}
          <div className="border border-lilac-100 rounded-xl p-4 bg-lilac-50/20 space-y-3">
            <p className="text-xs font-semibold text-ink-600 uppercase tracking-wide">Forma de Pago</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-ink-700">Método *</label>
                <select name="payment_method" required
                  className="w-full border border-lilac-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-lilac-400 bg-white">
                  <option value="efectivo">Efectivo</option>
                  <option value="transferencia">Transferencia</option>
                  <option value="tarjeta">Tarjeta</option>
                  <option value="credito">Crédito (por pagar)</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-ink-700">Cuenta bancaria</label>
                <select name="bank_account_id"
                  className="w-full border border-lilac-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-lilac-400 bg-white">
                  <option value="">— No aplica / Crédito —</option>
                  {(bankAccounts || []).map(b => (
                    <option key={b.id} value={b.id}>
                      {b.bank_name}{b.account_number ? ` · ${b.account_number}` : ""}
                    </option>
                  ))}
                </select>
                {(bankAccounts || []).length === 0 && (
                  <p className="text-[11px] text-amber-600">
                    <a href="/gestion/bancos" className="underline">Registra una cuenta bancaria</a> para vincular el egreso.
                  </p>
                )}
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-ink-700">N° Referencia</label>
                <input type="text" name="payment_reference"
                  placeholder="Comprobante, cheque..."
                  className="w-full border border-lilac-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-lilac-400 bg-white font-mono" />
              </div>
            </div>
            <p className="text-[11px] text-ink-400">
              Si el pago es a <strong>Crédito</strong>, no selecciones cuenta bancaria — el egreso se registrará cuando se pague.
            </p>
          </div>

          {/* Descripción */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-ink-700">Descripción del gasto</label>
            <input type="text" name="description"
              placeholder="Ej. Compra de guantes nitrilo talla M x 100 unidades"
              className="w-full border border-lilac-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-lilac-400 bg-white" />
          </div>

          {/* Montos */}
          <div className="border border-lilac-100 rounded-xl p-4 bg-lilac-50/20 space-y-3">
            <p className="text-xs font-semibold text-ink-600 uppercase tracking-wide">Montos</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-ink-700">Subtotal sin IVA (IVA 0%)</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400 text-xs">$</span>
                  <input type="number" name="subtotal_0" min="0" step="0.01" defaultValue="0"
                    className="w-full border border-lilac-200 rounded-xl pl-7 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-lilac-400 bg-white font-mono" />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-ink-700">Subtotal gravado (base IVA 15%)</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400 text-xs">$</span>
                  <input type="number" name="subtotal_15" min="0" step="0.01" defaultValue="0"
                    className="w-full border border-lilac-200 rounded-xl pl-7 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-lilac-400 bg-white font-mono" />
                </div>
              </div>
            </div>
            <p className="text-xs text-ink-400">El IVA (15%) y el total se calculan automáticamente al guardar.</p>
          </div>

          {/* Notas */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-ink-700">Notas internas</label>
            <textarea name="notes" rows={2}
              placeholder="Observaciones adicionales..."
              className="w-full border border-lilac-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-lilac-400 bg-white resize-none" />
          </div>

          <div className="flex justify-end pt-1">
            <button type="submit"
              className="flex items-center gap-2 bg-lilac-600 hover:bg-lilac-700 text-white px-6 py-2.5 rounded-xl transition-colors font-semibold text-sm shadow-md shadow-lilac-200">
              <Save size={16} /> Guardar Compra
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
