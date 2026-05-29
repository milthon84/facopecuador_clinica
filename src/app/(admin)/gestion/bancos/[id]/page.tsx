import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import { ArrowLeft, Plus, TrendingUp, TrendingDown, Building2 } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

const PAYMENT_LABELS: Record<string, string> = {
  efectivo:        "Efectivo",
  transferencia:   "Transferencia",
  cheque:          "Cheque",
  tarjeta_debito:  "Tarjeta Débito",
  tarjeta_credito: "Tarjeta Crédito",
};

const ACCOUNT_TYPE_LABELS: Record<string, string> = {
  ahorros:  "Ahorros",
  corriente: "Corriente",
  caja:     "Caja",
};

async function addTransaction(formData: FormData) {
  "use server";
  const session = createClient();
  const { data: { user } } = await session.auth.getUser();
  if ((user?.app_metadata?.role as string) !== "admin") throw new Error("Sin permisos");

  const account_id     = formData.get("account_id") as string;
  const type           = formData.get("type") as string;
  const amount         = Number(formData.get("amount"));
  const date           = formData.get("date") as string;
  const description    = (formData.get("description") as string).trim();
  const reference      = (formData.get("reference") as string)?.trim() || null;
  const payment_method = formData.get("payment_method") as string;
  const status         = formData.get("status") as string;

  if (!description || amount <= 0) throw new Error("Datos inválidos");

  const supabase = createAdminClient();
  await supabase.from("bank_transactions").insert({
    account_id, type, amount, date, description, reference, payment_method, status,
  });

  redirect(`/gestion/bancos/${account_id}`);
}

type Transaction = {
  id: string;
  type: "ingreso" | "egreso";
  amount: number;
  date: string;
  description: string;
  reference: string | null;
  payment_method: string;
  status: string;
  invoice_id: string | null;
  invoices: { invoice_number: string } | null;
};

export default async function BancoDetailPage({ params }: { params: { id: string } }) {
  const supabase = createAdminClient();

  const [{ data: account }, { data: rawTransactions }] = await Promise.all([
    supabase.from("bank_accounts").select("*").eq("id", params.id).single(),
    supabase.from("bank_transactions")
      .select("*, invoices(invoice_number)")
      .eq("account_id", params.id)
      .order("date", { ascending: false })
      .order("created_at", { ascending: false }),
  ]);

  if (!account) notFound();

  const transactions = (rawTransactions as Transaction[]) || [];

  // Calcular saldo actual
  const confirmedTxs = transactions.filter(t => t.status === "confirmado");
  const totalIngresos = confirmedTxs.filter(t => t.type === "ingreso").reduce((s, t) => s + t.amount, 0);
  const totalEgresos  = confirmedTxs.filter(t => t.type === "egreso").reduce((s, t) => s + t.amount, 0);
  const balance = account.initial_balance + totalIngresos - totalEgresos;

  const today = new Date().toISOString().split("T")[0];

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link href="/gestion/bancos"
          className="w-9 h-9 flex items-center justify-center rounded-xl bg-white border border-lilac-200 text-ink-600 hover:bg-lilac-50 transition-colors shrink-0">
          <ArrowLeft size={18} />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-ink-900 flex items-center gap-2">
            <Building2 size={22} className="text-lilac-600" />
            {account.bank_name}
          </h1>
          <p className="text-sm text-ink-500">
            {ACCOUNT_TYPE_LABELS[account.account_type]}
            {account.account_number && ` · ${account.account_number}`}
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-2xl p-4 border border-lilac-100 shadow-sm">
          <p className="text-xs text-ink-500 mb-1">Saldo actual</p>
          <p className={`text-2xl font-bold ${balance >= 0 ? "text-green-700" : "text-red-600"}`}>
            ${balance.toFixed(2)}
          </p>
        </div>
        <div className="bg-green-50 rounded-2xl p-4 border border-green-100 shadow-sm">
          <div className="flex items-center gap-1.5 mb-1">
            <TrendingUp size={14} className="text-green-600" />
            <p className="text-xs text-green-700 font-medium">Total ingresos</p>
          </div>
          <p className="text-xl font-bold text-green-700">${totalIngresos.toFixed(2)}</p>
        </div>
        <div className="bg-red-50 rounded-2xl p-4 border border-red-100 shadow-sm">
          <div className="flex items-center gap-1.5 mb-1">
            <TrendingDown size={14} className="text-red-600" />
            <p className="text-xs text-red-700 font-medium">Total egresos</p>
          </div>
          <p className="text-xl font-bold text-red-600">${totalEgresos.toFixed(2)}</p>
        </div>
      </div>

      {/* Tabla de movimientos */}
      <div className="bg-white border border-lilac-100 rounded-2xl shadow-sm overflow-hidden mb-6">
        <div className="px-5 py-4 border-b border-lilac-50 flex items-center justify-between">
          <h2 className="font-semibold text-ink-900">Movimientos</h2>
          <span className="text-xs text-ink-400">{transactions.length} registros</span>
        </div>

        {transactions.length === 0 ? (
          <div className="p-10 text-center text-ink-400 text-sm">Sin movimientos aún.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-lilac-50/50 text-xs text-ink-500 uppercase font-semibold">
                <tr>
                  <th className="px-4 py-3 text-left">Fecha</th>
                  <th className="px-4 py-3 text-left">Descripción</th>
                  <th className="px-4 py-3 text-left">Método</th>
                  <th className="px-4 py-3 text-left">Referencia</th>
                  <th className="px-4 py-3 text-center">Estado</th>
                  <th className="px-4 py-3 text-right">Monto</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-lilac-50">
                {transactions.map(tx => (
                  <tr key={tx.id} className="hover:bg-lilac-50/20 transition-colors">
                    <td className="px-4 py-3 text-xs text-ink-500 whitespace-nowrap">
                      {new Date(tx.date + "T12:00:00").toLocaleDateString("es-EC")}
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-ink-800 leading-tight">{tx.description}</p>
                      {tx.invoices && (
                        <Link href={`/gestion/facturacion/${tx.invoice_id}`}
                          className="text-[11px] text-lilac-600 hover:underline">
                          Factura {tx.invoices.invoice_number}
                        </Link>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-ink-500">
                      {PAYMENT_LABELS[tx.payment_method] ?? tx.payment_method}
                    </td>
                    <td className="px-4 py-3 text-xs text-ink-400 font-mono">
                      {tx.reference ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                        tx.status === "confirmado"
                          ? "bg-green-100 text-green-700"
                          : "bg-amber-100 text-amber-700"
                      }`}>
                        {tx.status === "confirmado" ? "Confirmado" : "Pendiente"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-bold tabular-nums">
                      <span className={tx.type === "ingreso" ? "text-green-700" : "text-red-600"}>
                        {tx.type === "ingreso" ? "+" : "−"}${tx.amount.toFixed(2)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Registrar movimiento manual */}
      <div className="bg-white border border-lilac-100 rounded-2xl shadow-sm p-6">
        <h2 className="font-semibold text-ink-900 mb-1 flex items-center gap-2">
          <Plus size={18} className="text-lilac-600" />
          Registrar movimiento manual
        </h2>
        <p className="text-sm text-ink-500 mb-5">Para ajustes, comisiones u operaciones no vinculadas a facturas.</p>

        <form action={addTransaction} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <input type="hidden" name="account_id" value={account.id} />

          <div className="space-y-1">
            <label className="text-sm font-semibold text-ink-700">Tipo *</label>
            <select name="type" required
              className="w-full bg-lilac-50/50 border border-lilac-100 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-lilac-500">
              <option value="ingreso">Ingreso (depósito)</option>
              <option value="egreso">Egreso (pago)</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-semibold text-ink-700">Monto *</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-400 text-sm">$</span>
              <input name="amount" type="number" min="0.01" step="0.01" required
                className="w-full bg-lilac-50/50 border border-lilac-100 rounded-xl pl-8 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-lilac-500 font-mono" />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-semibold text-ink-700">Fecha *</label>
            <input name="date" type="date" required defaultValue={today}
              className="w-full bg-lilac-50/50 border border-lilac-100 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-lilac-500" />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-semibold text-ink-700">Método de pago *</label>
            <select name="payment_method" required
              className="w-full bg-lilac-50/50 border border-lilac-100 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-lilac-500">
              <option value="transferencia">Transferencia</option>
              <option value="efectivo">Efectivo</option>
              <option value="cheque">Cheque</option>
              <option value="tarjeta_debito">Tarjeta Débito</option>
              <option value="tarjeta_credito">Tarjeta Crédito</option>
            </select>
          </div>

          <div className="sm:col-span-2 space-y-1">
            <label className="text-sm font-semibold text-ink-700">Descripción *</label>
            <input name="description" required placeholder="Ej. Comisión bancaria mensual"
              className="w-full bg-lilac-50/50 border border-lilac-100 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-lilac-500" />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-semibold text-ink-700">Referencia</label>
            <input name="reference" placeholder="N° cheque, comprobante..."
              className="w-full bg-lilac-50/50 border border-lilac-100 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-lilac-500 font-mono" />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-semibold text-ink-700">Estado</label>
            <select name="status"
              className="w-full bg-lilac-50/50 border border-lilac-100 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-lilac-500">
              <option value="confirmado">Confirmado</option>
              <option value="pendiente">Pendiente</option>
            </select>
          </div>

          <div className="sm:col-span-2 flex justify-end pt-2">
            <button type="submit"
              className="flex items-center gap-2 bg-lilac-600 hover:bg-lilac-700 text-white px-6 py-2.5 rounded-xl font-semibold text-sm transition-colors shadow-md shadow-lilac-200">
              <Plus size={16} /> Registrar movimiento
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
