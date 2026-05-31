import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Wallet, Plus, TrendingUp, TrendingDown, RefreshCw, ArrowRight } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

const r2 = (n: number) => Math.round(n * 100) / 100;

const PAYMENT_LABELS: Record<string, string> = {
  efectivo: "Efectivo", transferencia: "Transferencia",
  cheque: "Cheque", tarjeta_debito: "Tarjeta Débito", tarjeta_credito: "Tarjeta Crédito",
};

// ── Server Actions ─────────────────────────────────────────────────────────

async function setupCajaChica(formData: FormData) {
  "use server";
  const session = createClient();
  const { data: { user } } = await session.auth.getUser();
  if ((user?.app_metadata?.role as string) !== "admin") throw new Error("Sin permisos");

  const supabase = createAdminClient();
  const initial_balance = Number(formData.get("initial_balance") || 0);
  const bank_name = (formData.get("bank_name") as string).trim();

  await supabase.from("bank_accounts").insert({
    bank_name, account_type: "caja", initial_balance, is_active: true,
    notes: "Caja chica para gastos menores en efectivo",
  });
  redirect("/gestion/caja-chica");
}

async function addCashExpense(formData: FormData) {
  "use server";
  const session = createClient();
  const { data: { user } } = await session.auth.getUser();
  if ((user?.app_metadata?.role as string) !== "admin") throw new Error("Sin permisos");

  const supabase = createAdminClient();
  const account_id  = formData.get("account_id") as string;
  const amount      = Number(formData.get("amount"));
  const date        = formData.get("date") as string;
  const description = (formData.get("description") as string).trim();
  const reference   = (formData.get("reference") as string)?.trim() || null;

  await supabase.from("bank_transactions").insert({
    account_id, type: "egreso", amount, date,
    description, reference,
    payment_method: "efectivo", status: "confirmado",
    origin: "manual", categoria: "Retiro en efectivo",
  });
  redirect("/gestion/caja-chica");
}

async function replenishCajaChica(formData: FormData) {
  "use server";
  const session = createClient();
  const { data: { user } } = await session.auth.getUser();
  if ((user?.app_metadata?.role as string) !== "admin") throw new Error("Sin permisos");

  const supabase       = createAdminClient();
  const caja_id        = formData.get("caja_id") as string;
  const bank_id        = formData.get("bank_id") as string;
  const amount         = Number(formData.get("amount"));
  const date           = formData.get("date") as string;

  // Egreso del banco
  await supabase.from("bank_transactions").insert({
    account_id: bank_id, type: "egreso", amount, date,
    description: "Reposición caja chica",
    payment_method: "transferencia", status: "confirmado",
    origin: "manual", categoria: "Reposición caja chica",
  });
  // Ingreso en caja chica
  await supabase.from("bank_transactions").insert({
    account_id: caja_id, type: "ingreso", amount, date,
    description: "Reposición desde banco",
    payment_method: "efectivo", status: "confirmado",
    origin: "manual", categoria: "Reposición caja chica",
  });
  redirect("/gestion/caja-chica");
}

// ── Page ───────────────────────────────────────────────────────────────────

type BankAccount = { id: string; bank_name: string; account_number: string | null; account_type: string; initial_balance: number; is_active: boolean };
type BankTx = { id: string; account_id: string; type: "ingreso" | "egreso"; amount: number; date: string; description: string; reference: string | null; payment_method: string; status: string };

export default async function CajaChicaPage() {
  const supabase = createAdminClient();
  const [{ data: allAccounts }, { data: allTx }] = await Promise.all([
    supabase.from("bank_accounts").select("*").eq("is_active", true).order("bank_name"),
    supabase.from("bank_transactions").select("*").order("date", { ascending: false }).order("created_at", { ascending: false }).limit(200),
  ]);

  const cajaAccounts = (allAccounts as BankAccount[] || []).filter(a => a.account_type === "caja");
  const bankAccounts = (allAccounts as BankAccount[] || []).filter(a => a.account_type !== "caja");
  const txMap = new Map<string, BankTx[]>();
  (allTx as BankTx[] || []).forEach(tx => {
    if (!txMap.has(tx.account_id)) txMap.set(tx.account_id, []);
    txMap.get(tx.account_id)!.push(tx);
  });

  function calcBalance(account: BankAccount): number {
    const txs = txMap.get(account.id) || [];
    const confirmed = txs.filter(t => t.status === "confirmado");
    return r2(account.initial_balance + confirmed.filter(t => t.type === "ingreso").reduce((s, t) => s + t.amount, 0) - confirmed.filter(t => t.type === "egreso").reduce((s, t) => s + t.amount, 0));
  }

  const today = new Date().toISOString().split("T")[0];

  if (cajaAccounts.length === 0) {
    return (
      <div className="max-w-xl mx-auto">
        <div className="flex items-center gap-2 mb-6">
          <Wallet size={22} className="text-lilac-600" />
          <h1 className="text-2xl font-bold text-ink-900">Caja Chica</h1>
        </div>
        <div className="bg-white border border-lilac-100 rounded-2xl shadow-sm p-6">
          <h2 className="font-semibold text-ink-900 mb-1">Configura tu primera caja chica</h2>
          <p className="text-sm text-ink-500 mb-5">La caja chica es un fondo fijo en efectivo para gastos menores del día a día.</p>
          <form action={setupCajaChica} className="space-y-4">
            <div className="space-y-1">
              <label className="text-sm font-semibold text-ink-700">Nombre *</label>
              <input name="bank_name" required defaultValue="Caja Chica Principal"
                className="w-full bg-lilac-50/50 border border-lilac-100 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-lilac-500" />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-semibold text-ink-700">Fondo inicial</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-400">$</span>
                <input type="number" name="initial_balance" min="0" step="0.01" defaultValue="100"
                  className="w-full bg-lilac-50/50 border border-lilac-100 rounded-xl pl-8 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-lilac-500 font-mono" />
              </div>
            </div>
            <button type="submit"
              className="w-full flex items-center justify-center gap-2 bg-lilac-600 hover:bg-lilac-700 text-white px-6 py-2.5 rounded-xl font-semibold text-sm transition-colors">
              <Plus size={16} /> Crear caja chica
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-ink-900 flex items-center gap-2">
            <Wallet className="text-lilac-600" /> Caja Chica
          </h1>
          <p className="text-sm text-ink-600">Fondo en efectivo para gastos menores. Pagos inmediatos sin transferencia bancaria.</p>
        </div>
        <Link href="/gestion/bancos"
          className="text-xs text-lilac-600 hover:underline flex items-center gap-1">
          Ver todas las cuentas <ArrowRight size={12} />
        </Link>
      </div>

      {cajaAccounts.map(caja => {
        const balance = calcBalance(caja);
        const txs = (txMap.get(caja.id) || []).slice(0, 30);
        const totalEgresos = txs.filter(t => t.type === "egreso" && t.status === "confirmado").reduce((s, t) => s + t.amount, 0);
        const isLow = balance < caja.initial_balance * 0.2;

        return (
          <div key={caja.id} className="mb-8">
            {/* Balance card */}
            <div className={`rounded-2xl p-5 mb-4 border shadow-sm ${isLow ? "bg-red-50 border-red-200" : "bg-green-50 border-green-100"}`}>
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-semibold text-ink-600">{caja.bank_name}</p>
                  <p className={`text-4xl font-bold mt-1 ${isLow ? "text-red-700" : "text-green-800"}`}>${balance.toFixed(2)}</p>
                  {isLow && <p className="text-xs text-red-600 mt-1 font-medium">⚠ Saldo bajo — reponer caja chica</p>}
                </div>
                <div className="text-right text-sm text-ink-500">
                  <p>Fondo inicial: <strong>${caja.initial_balance.toFixed(2)}</strong></p>
                </div>
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4 mb-4">
              {/* Registrar gasto */}
              <div className="bg-white border border-lilac-100 rounded-2xl shadow-sm p-5">
                <h3 className="font-semibold text-ink-900 mb-3 flex items-center gap-2">
                  <TrendingDown size={15} className="text-red-500" /> Registrar gasto en efectivo
                </h3>
                <form action={addCashExpense} className="space-y-3">
                  <input type="hidden" name="account_id" value={caja.id} />
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-ink-700">Monto *</label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400 text-xs">$</span>
                        <input type="number" name="amount" required min="0.01" step="0.01"
                          className="w-full border border-lilac-200 rounded-xl pl-7 pr-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-lilac-400 bg-white font-mono" />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-ink-700">Fecha *</label>
                      <input type="date" name="date" required defaultValue={today}
                        className="w-full border border-lilac-200 rounded-xl px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-lilac-400 bg-white" />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-ink-700">Descripción *</label>
                    <input name="description" required placeholder="Ej. Taxi, suministros, café..."
                      className="w-full border border-lilac-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-lilac-400 bg-white" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-ink-700">N° Recibo / Referencia</label>
                    <input name="reference" placeholder="Opcional"
                      className="w-full border border-lilac-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-lilac-400 bg-white font-mono" />
                  </div>
                  <button type="submit"
                    className="w-full flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-xl font-semibold text-sm transition-colors">
                    <TrendingDown size={14} /> Registrar gasto
                  </button>
                </form>
              </div>

              {/* Reponer caja */}
              <div className="bg-white border border-lilac-100 rounded-2xl shadow-sm p-5">
                <h3 className="font-semibold text-ink-900 mb-3 flex items-center gap-2">
                  <RefreshCw size={15} className="text-green-600" /> Reponer caja chica
                </h3>
                <form action={replenishCajaChica} className="space-y-3">
                  <input type="hidden" name="caja_id" value={caja.id} />
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-ink-700">Cuenta bancaria origen *</label>
                    <select name="bank_id" required
                      className="w-full border border-lilac-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-lilac-400 bg-white">
                      <option value="">— Seleccionar cuenta —</option>
                      {bankAccounts.map(b => (
                        <option key={b.id} value={b.id}>{b.bank_name}{b.account_number ? ` · ${b.account_number}` : ""}</option>
                      ))}
                    </select>
                    {bankAccounts.length === 0 && (
                      <p className="text-[11px] text-amber-600"><a href="/gestion/bancos" className="underline">Registra una cuenta bancaria</a> primero.</p>
                    )}
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-ink-700">Monto a reponer *</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400 text-xs">$</span>
                      <input type="number" name="amount" required min="0.01" step="0.01"
                        defaultValue={r2(caja.initial_balance - balance) > 0 ? r2(caja.initial_balance - balance) : undefined}
                        className="w-full border border-lilac-200 rounded-xl pl-7 pr-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-lilac-400 bg-white font-mono" />
                    </div>
                    <p className="text-[11px] text-ink-400">Déficit actual: ${r2(Math.max(caja.initial_balance - balance, 0)).toFixed(2)}</p>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-ink-700">Fecha *</label>
                    <input type="date" name="date" required defaultValue={today}
                      className="w-full border border-lilac-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-lilac-400 bg-white" />
                  </div>
                  <button type="submit"
                    className="w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-xl font-semibold text-sm transition-colors">
                    <RefreshCw size={14} /> Reponer
                  </button>
                </form>
              </div>
            </div>

            {/* Historial */}
            <div className="bg-white border border-lilac-100 rounded-2xl shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-lilac-50 flex items-center justify-between">
                <h3 className="font-semibold text-ink-900">Movimientos recientes</h3>
                <span className="text-xs text-ink-400">{txs.length} registros</span>
              </div>
              {txs.length === 0 ? (
                <p className="text-center text-ink-400 text-sm py-8">Sin movimientos aún.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-lilac-50/50 text-xs text-ink-500 uppercase font-semibold">
                      <tr>
                        <th className="px-4 py-2.5 text-left">Fecha</th>
                        <th className="px-4 py-2.5 text-left">Descripción</th>
                        <th className="px-4 py-2.5 text-left">Ref.</th>
                        <th className="px-4 py-2.5 text-right">Monto</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-lilac-50">
                      {txs.map(tx => (
                        <tr key={tx.id} className="hover:bg-lilac-50/20">
                          <td className="px-4 py-2.5 text-xs text-ink-500 whitespace-nowrap">
                            {new Date(tx.date + "T12:00:00").toLocaleDateString("es-EC")}
                          </td>
                          <td className="px-4 py-2.5 text-ink-800">{tx.description}</td>
                          <td className="px-4 py-2.5 text-xs text-ink-400 font-mono">{tx.reference ?? "—"}</td>
                          <td className={`px-4 py-2.5 text-right font-bold tabular-nums ${tx.type === "ingreso" ? "text-green-700" : "text-red-600"}`}>
                            {tx.type === "ingreso" ? "+" : "−"}${tx.amount.toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        );
      })}

      {/* Agregar otra caja chica */}
      <div className="bg-white border border-dashed border-lilac-200 rounded-2xl p-5 text-center">
        <form action={setupCajaChica} className="inline-flex flex-col items-center gap-3">
          <p className="text-sm text-ink-500">¿Necesitas otra caja chica? (sucursal, departamento...)</p>
          <div className="flex gap-2">
            <input name="bank_name" required placeholder="Nombre de la caja"
              className="border border-lilac-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-lilac-400 bg-white" />
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400 text-xs">$</span>
              <input type="number" name="initial_balance" min="0" step="0.01" defaultValue="100" placeholder="Fondo"
                className="w-28 border border-lilac-200 rounded-xl pl-7 pr-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-lilac-400 bg-white font-mono" />
            </div>
            <button type="submit"
              className="flex items-center gap-1.5 bg-lilac-600 hover:bg-lilac-700 text-white px-3 py-2 rounded-xl text-sm font-semibold transition-colors">
              <Plus size={14} /> Crear
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
