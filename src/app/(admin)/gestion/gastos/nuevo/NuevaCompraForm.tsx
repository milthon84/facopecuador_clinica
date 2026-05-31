"use client";

import { useState } from "react";
import { Save } from "lucide-react";

const CATEGORIES = [
  "Insumos dentales", "Equipos", "Arriendo", "Servicios básicos",
  "Salarios", "Suministros oficina", "Mantenimiento", "Publicidad", "Otros",
];

type Account = { id: string; bank_name: string; account_number: string | null; account_type: string };

interface Props {
  today: string;
  bankAccounts: Account[];
  cajaAccounts: Account[];
  saveExpense: (formData: FormData) => Promise<void>;
}

export default function NuevaCompraForm({ today, bankAccounts, cajaAccounts, saveExpense }: Props) {
  const [method, setMethod] = useState("efectivo");

  const needsAccount   = method === "efectivo" || method === "transferencia";
  const needsReference = method === "transferencia" || method === "tarjeta_credito";
  const accountOptions = method === "efectivo" ? cajaAccounts : bankAccounts;
  const accountLabel   = method === "efectivo" ? "Caja chica" : "Cuenta bancaria destino";

  return (
    <form action={saveExpense} className="space-y-3">

      {/* Proveedor + RUC */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="text-xs font-semibold text-ink-700">Proveedor *</label>
          <input name="supplier_name" required placeholder="Nombre del proveedor"
            className="w-full border border-lilac-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-lilac-400 bg-white" />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-semibold text-ink-700">RUC</label>
          <input name="supplier_ruc" maxLength={13} placeholder="0000000000001"
            className="w-full border border-lilac-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-lilac-400 bg-white font-mono" />
        </div>
      </div>

      {/* Factura + Fecha */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="text-xs font-semibold text-ink-700">N° Factura</label>
          <input name="document_number" placeholder="001-001-000000001"
            className="w-full border border-lilac-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-lilac-400 bg-white font-mono" />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-semibold text-ink-700">Fecha *</label>
          <input type="date" name="expense_date" required defaultValue={today}
            className="w-full border border-lilac-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-lilac-400 bg-white" />
        </div>
      </div>

      {/* Categoría + Descripción */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="text-xs font-semibold text-ink-700">Categoría *</label>
          <select name="category" required
            className="w-full border border-lilac-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-lilac-400 bg-white">
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-xs font-semibold text-ink-700">Descripción</label>
          <input name="description" placeholder="Detalle de la compra"
            className="w-full border border-lilac-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-lilac-400 bg-white" />
        </div>
      </div>

      {/* Montos */}
      <div className="grid grid-cols-2 gap-3 bg-lilac-50/30 border border-lilac-100 rounded-xl p-3">
        <div className="space-y-1">
          <label className="text-xs font-semibold text-ink-700">Base IVA 0%</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400 text-xs">$</span>
            <input type="number" name="subtotal_0" min="0" step="0.01" defaultValue="0"
              className="w-full border border-lilac-200 rounded-xl pl-7 pr-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-lilac-400 bg-white font-mono" />
          </div>
        </div>
        <div className="space-y-1">
          <label className="text-xs font-semibold text-ink-700">Base IVA 15%</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400 text-xs">$</span>
            <input type="number" name="subtotal_15" min="0" step="0.01" defaultValue="0"
              className="w-full border border-lilac-200 rounded-xl pl-7 pr-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-lilac-400 bg-white font-mono" />
          </div>
        </div>
      </div>

      {/* ── Forma de pago — al final ────────────────────────────────────── */}
      <div className="border border-lilac-200 rounded-xl p-3 bg-white space-y-3">
        <p className="text-xs font-bold text-ink-600 uppercase tracking-wide">Forma de Pago</p>

        {/* Selector de método */}
        <div className="flex flex-wrap gap-2">
          {[
            { value: "efectivo",        label: "💵 Efectivo" },
            { value: "transferencia",   label: "🏦 Transferencia" },
            { value: "tarjeta_credito", label: "💳 Tarjeta" },
            { value: "credito",         label: "📋 Crédito" },
          ].map(m => (
            <button key={m.value} type="button"
              onClick={() => setMethod(m.value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                method === m.value
                  ? "bg-lilac-600 text-white border-lilac-600"
                  : "bg-white text-ink-600 border-lilac-200 hover:border-lilac-400"
              }`}>
              {m.label}
            </button>
          ))}
        </div>

        {/* Hidden input del método */}
        <input type="hidden" name="payment_method" value={method} />

        {/* Cuenta (caja chica o banco) */}
        {needsAccount && (
          <div className="space-y-1">
            <label className="text-xs font-semibold text-ink-700">{accountLabel} *</label>
            <select name="bank_account_id" required
              className="w-full border border-lilac-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-lilac-400 bg-white">
              <option value="">— Seleccionar —</option>
              {accountOptions.map(a => (
                <option key={a.id} value={a.id}>
                  {a.bank_name}{a.account_number ? ` · ${a.account_number}` : ""}
                </option>
              ))}
            </select>
            {accountOptions.length === 0 && (
              <p className="text-[11px] text-amber-600">
                {method === "efectivo"
                  ? <a href="/gestion/caja-chica" className="underline">Configura la caja chica</a>
                  : <a href="/gestion/bancos" className="underline">Registra una cuenta bancaria</a>}
              </p>
            )}
          </div>
        )}

        {/* N° Referencia (transferencia o tarjeta) */}
        {needsReference && (
          <div className="space-y-1">
            <label className="text-xs font-semibold text-ink-700">
              N° Referencia / Comprobante {method === "transferencia" ? "*" : ""}
            </label>
            <input type="text" name="payment_reference"
              required={method === "transferencia"}
              placeholder={method === "transferencia" ? "TRF-001234" : "N° autorización tarjeta"}
              className="w-full border border-lilac-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-lilac-400 bg-white font-mono" />
          </div>
        )}

        {/* Crédito info */}
        {method === "credito" && (
          <p className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
            Se registrará en <strong>Cuentas por Pagar</strong> hasta que se realice el pago.
          </p>
        )}
      </div>

      <div className="flex justify-end pt-1">
        <button type="submit"
          className="flex items-center gap-2 bg-lilac-600 hover:bg-lilac-700 text-white px-6 py-2.5 rounded-xl transition-colors font-semibold text-sm shadow-md shadow-lilac-200">
          <Save size={16} /> Guardar Compra
        </button>
      </div>
    </form>
  );
}
