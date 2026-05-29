import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { CircleDollarSign, AlertCircle, CheckCircle2, Clock } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

const r2 = (n: number) => Math.round(n * 100) / 100;
const fmt = (n: number) => n.toLocaleString("es-EC", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const PM_LABELS: Record<string, string> = {
  efectivo: "Efectivo", transferencia: "Transferencia",
  cheque: "Cheque", tarjeta_debito: "T. Débito", tarjeta_credito: "T. Crédito",
};

// ── Server Action ──────────────────────────────────────────────────────────

async function recordPayment(formData: FormData) {
  "use server";
  const session = createClient();
  const { data: { user } } = await session.auth.getUser();
  const role = user?.app_metadata?.role as string;
  if (!["admin", "contador"].includes(role)) throw new Error("Sin permisos");

  const supabase       = createAdminClient();
  const invoice_id     = formData.get("invoice_id") as string;
  const amount         = r2(Number(formData.get("amount")));
  const payment_date   = formData.get("payment_date") as string;
  const payment_method = formData.get("payment_method") as string;
  const bank_account_id = (formData.get("bank_account_id") as string) || null;
  const reference      = (formData.get("reference") as string)?.trim() || null;
  const notes          = (formData.get("notes") as string)?.trim() || null;

  if (amount <= 0) throw new Error("El monto debe ser mayor a 0");

  // Obtener factura y pagos previos
  const [{ data: invoice }, { data: prevPayments }] = await Promise.all([
    supabase.from("invoices").select("total, client_name, invoice_number").eq("id", invoice_id).single(),
    supabase.from("invoice_payments").select("amount").eq("invoice_id", invoice_id),
  ]);
  if (!invoice) throw new Error("Factura no encontrada");

  const totalPaid = r2((prevPayments || []).reduce((s, p) => s + Number(p.amount), 0) + amount);
  const invoiceTotal = Number(invoice.total);
  const newStatus = totalPaid >= invoiceTotal ? "paid" : "partial";

  // Insertar pago
  await supabase.from("invoice_payments").insert({
    invoice_id, amount, payment_date, payment_method,
    bank_account_id: bank_account_id || null, reference, notes,
  });

  // Actualizar estado de factura
  await supabase.from("invoices").update({ payment_status: newStatus }).eq("id", invoice_id);

  // Ingreso bancario automático
  if (bank_account_id) {
    await supabase.from("bank_transactions").insert({
      account_id: bank_account_id, type: "ingreso", amount,
      date: payment_date,
      description: `Cobro Factura ${invoice.invoice_number} — ${invoice.client_name}`,
      reference, payment_method, invoice_id, status: "confirmado",
    }).then(() => {});
  }

  redirect("/gestion/cuentas-por-cobrar");
}

// ── Page ───────────────────────────────────────────────────────────────────

export default async function CuentasPorCobrarPage({
  searchParams,
}: { searchParams: { pay?: string } }) {
  const supabase = createAdminClient();

  const [{ data: invoices }, { data: allPayments }, { data: bankAccounts }] = await Promise.all([
    supabase.from("invoices")
      .select("id, invoice_number, client_name, client_document, issue_date, total, payment_status, sri_status")
      .in("payment_status", ["pending", "partial"])
      .order("issue_date", { ascending: true }),
    supabase.from("invoice_payments").select("invoice_id, amount"),
    supabase.from("bank_accounts").select("id, bank_name, account_number").eq("is_active", true).order("bank_name"),
  ]);

  // Suma de pagos por factura
  const paidMap = new Map<string, number>();
  (allPayments || []).forEach(p => {
    paidMap.set(p.invoice_id, r2((paidMap.get(p.invoice_id) ?? 0) + Number(p.amount)));
  });

  const list = (invoices || []).map(inv => ({
    ...inv,
    total_num: Number(inv.total),
    paid: paidMap.get(inv.id) ?? 0,
    pending: r2(Number(inv.total) - (paidMap.get(inv.id) ?? 0)),
  }));

  const totalPendiente = r2(list.reduce((s, i) => s + i.pending, 0));
  const selectedInvoice = searchParams.pay ? list.find(i => i.id === searchParams.pay) : null;
  const today = new Date().toISOString().split("T")[0];

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-ink-900 flex items-center gap-2">
            <CircleDollarSign className="text-green-600" /> Cuentas por Cobrar
          </h1>
          <p className="text-sm text-ink-600">Facturas emitidas pendientes de cobro.</p>
        </div>
        <div className="flex flex-col items-end">
          <span className="text-xs text-ink-500">Total por cobrar</span>
          <span className="text-2xl font-bold text-green-700">${fmt(totalPendiente)}</span>
        </div>
      </div>

      {/* Formulario de cobro */}
      {selectedInvoice && (
        <div className="bg-green-50 border border-green-200 rounded-2xl shadow-sm p-5 mb-6">
          <h2 className="font-semibold text-green-900 mb-1">
            Registrar cobro — Factura {selectedInvoice.invoice_number}
          </h2>
          <p className="text-sm text-ink-600 mb-4">
            Cliente: <strong>{selectedInvoice.client_name}</strong> ·
            Pendiente: <strong className="text-green-700">${fmt(selectedInvoice.pending)}</strong>
          </p>
          <form action={recordPayment} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <input type="hidden" name="invoice_id" value={selectedInvoice.id} />
            <div className="space-y-1">
              <label className="text-xs font-semibold text-ink-700">Monto a cobrar *</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400 text-xs">$</span>
                <input type="number" name="amount" required min="0.01" step="0.01"
                  defaultValue={selectedInvoice.pending}
                  className="w-full border border-green-300 rounded-xl pl-7 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 bg-white font-mono" />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-ink-700">Fecha de cobro *</label>
              <input type="date" name="payment_date" required defaultValue={today}
                className="w-full border border-green-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 bg-white" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-ink-700">Método *</label>
              <select name="payment_method" required
                className="w-full border border-green-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 bg-white">
                <option value="transferencia">Transferencia</option>
                <option value="efectivo">Efectivo</option>
                <option value="cheque">Cheque</option>
                <option value="tarjeta_debito">Tarjeta Débito</option>
                <option value="tarjeta_credito">Tarjeta Crédito</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-ink-700">Cuenta bancaria destino</label>
              <select name="bank_account_id"
                className="w-full border border-green-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 bg-white">
                <option value="">— No registrar en banco —</option>
                {(bankAccounts || []).map(b => (
                  <option key={b.id} value={b.id}>
                    {b.bank_name}{b.account_number ? ` · ${b.account_number}` : ""}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-ink-700">N° Referencia</label>
              <input type="text" name="reference" placeholder="Comprobante, transferencia..."
                className="w-full border border-green-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 bg-white font-mono" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-ink-700">Notas</label>
              <input type="text" name="notes" placeholder="Observaciones..."
                className="w-full border border-green-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 bg-white" />
            </div>
            <div className="sm:col-span-3 flex gap-3 pt-1">
              <button type="submit"
                className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-6 py-2.5 rounded-xl font-semibold text-sm transition-colors shadow-md">
                <CircleDollarSign size={16} /> Registrar cobro
              </button>
              <Link href="/gestion/cuentas-por-cobrar"
                className="px-4 py-2.5 rounded-xl border border-green-300 text-sm text-green-700 hover:bg-green-100 transition-colors">
                Cancelar
              </Link>
            </div>
          </form>
        </div>
      )}

      {/* Tabla */}
      {list.length === 0 ? (
        <div className="bg-white border border-lilac-100 rounded-2xl shadow-sm p-12 text-center">
          <CheckCircle2 size={36} className="text-green-400 mx-auto mb-3" />
          <p className="text-ink-500 font-medium">¡Todo cobrado!</p>
          <p className="text-sm text-ink-400 mt-1">No hay facturas pendientes de cobro.</p>
        </div>
      ) : (
        <div className="bg-white border border-lilac-100 rounded-2xl shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-lilac-50 flex items-center justify-between">
            <h2 className="font-semibold text-ink-900">Facturas por cobrar</h2>
            <span className="text-xs text-ink-400">{list.length} facturas · ${fmt(totalPendiente)} pendiente</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-lilac-50/50 text-xs text-ink-500 uppercase font-semibold">
                <tr>
                  <th className="px-4 py-3 text-left">Factura</th>
                  <th className="px-4 py-3 text-left">Cliente</th>
                  <th className="px-4 py-3 text-center">Fecha</th>
                  <th className="px-4 py-3 text-right">Total</th>
                  <th className="px-4 py-3 text-right">Cobrado</th>
                  <th className="px-4 py-3 text-right">Pendiente</th>
                  <th className="px-4 py-3 text-center">Estado</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-lilac-50">
                {list.map(inv => (
                  <tr key={inv.id} className={`transition-colors ${inv.id === searchParams.pay ? "bg-green-50" : "hover:bg-lilac-50/20"}`}>
                    <td className="px-4 py-3">
                      <Link href={`/gestion/facturacion/${inv.id}`}
                        className="font-mono text-xs text-lilac-600 hover:underline">
                        {inv.invoice_number}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-ink-900">{inv.client_name}</p>
                      <p className="text-xs text-ink-400">{inv.client_document}</p>
                    </td>
                    <td className="px-4 py-3 text-center text-xs text-ink-500">
                      {new Date(inv.issue_date + "T12:00:00").toLocaleDateString("es-EC")}
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-semibold">${fmt(inv.total_num)}</td>
                    <td className="px-4 py-3 text-right font-mono text-green-600">${fmt(inv.paid)}</td>
                    <td className="px-4 py-3 text-right font-mono font-bold text-amber-700">${fmt(inv.pending)}</td>
                    <td className="px-4 py-3 text-center">
                      {inv.payment_status === "partial" ? (
                        <span className="inline-flex items-center gap-1 text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-semibold">
                          <Clock size={10} /> Parcial
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-semibold">
                          <AlertCircle size={10} /> Pendiente
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/gestion/cuentas-por-cobrar?pay=${inv.id}`}
                        className="text-xs bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded-lg font-medium transition-colors">
                        Cobrar
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <p className="text-xs text-ink-400 text-center mt-4">
        Para registrar una nueva factura a crédito, al emitir la factura no selecciones cuenta bancaria de pago.
      </p>
    </div>
  );
}
