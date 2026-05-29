"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Plus, Trash2, Send, FileText, User, Search, X, BookOpen, ChevronDown } from "lucide-react";
import { validateDocumento, validateEmail, validateTelefono } from "@/lib/validators";

interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unit_price: number;
  discount: number;
  iva_code: "4" | "0";
}

interface Patient {
  id: string;
  full_name: string;
  document_number: string | null;
  email: string | null;
  phone: string | null;
}

interface Service {
  id: string;
  name: string;
  description: string | null;
  price: number;
  iva_code: string;
  category: string;
}

interface BankAccount {
  id: string;
  bank_name: string;
  account_number: string | null;
  account_type: string;
}

const PAYMENT_METHODS = [
  { value: "efectivo",        label: "Efectivo",         sriCode: "01" },
  { value: "transferencia",   label: "Transferencia",    sriCode: "20" },
  { value: "cheque",          label: "Cheque",           sriCode: "20" },
  { value: "tarjeta_debito",  label: "Tarjeta Débito",   sriCode: "16" },
  { value: "tarjeta_credito", label: "Tarjeta Crédito",  sriCode: "19" },
];

export default function NewInvoiceForm({
  patients,
  initialPatient,
  services = [],
  bankAccounts = [],
}: {
  patients: Patient[];
  initialPatient: Patient | null;
  services?: Service[];
  bankAccounts?: BankAccount[];
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showCatalog, setShowCatalog] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const [paymentMethod,    setPaymentMethod]    = useState("efectivo");
  const [bankAccountId,    setBankAccountId]    = useState("");
  const [paymentReference, setPaymentReference] = useState("");

  const [items, setItems] = useState<InvoiceItem[]>([]);

  const [patientId,      setPatientId]      = useState(initialPatient?.id ?? "");
  const [clientName,     setClientName]     = useState(initialPatient?.full_name ?? "");
  const [clientDocument, setClientDocument] = useState(initialPatient?.document_number ?? "");
  const [clientEmail,    setClientEmail]    = useState(initialPatient?.email ?? "");
  const [clientPhone,    setClientPhone]    = useState(initialPatient?.phone ?? "");
  const [clientAddress,  setClientAddress]  = useState("");

  // Búsqueda de paciente
  const [search, setSearch] = useState("");
  const [showSearch, setShowSearch] = useState(false);

  const filteredPatients = search.length >= 2
    ? patients.filter(p =>
        p.full_name.toLowerCase().includes(search.toLowerCase()) ||
        (p.document_number ?? "").includes(search)
      ).slice(0, 8)
    : [];

  function selectPatient(p: Patient) {
    setPatientId(p.id);
    setClientName(p.full_name);
    setClientDocument(p.document_number ?? "");
    setClientEmail(p.email ?? "");
    setClientPhone(p.phone ?? "");
    setSearch("");
    setShowSearch(false);
  }

  function clearPatient() {
    setPatientId("");
    setClientName("");
    setClientDocument("");
    setClientEmail("");
    setClientPhone("");
    setSearch("");
  }

  function addFromCatalog(s: Service) {
    setItems(prev => [...prev, {
      id:          Math.random().toString(),
      description: s.name,
      quantity:    1,
      unit_price:  Number(s.price),
      discount:    0,
      iva_code:    (s.iva_code === "4" ? "4" : "0") as "4" | "0",
    }]);
    setShowCatalog(false);
  }

  const addItem = () => {
    setItems([...items, { id: Math.random().toString(), description: "", quantity: 1, unit_price: 0, discount: 0, iva_code: "4" }]);
  };

  const removeItem = (id: string) => {
    if (items.length > 1) setItems(items.filter(i => i.id !== id));
  };

  const updateItem = (id: string, field: keyof InvoiceItem, value: any) => {
    setItems(items.map(i => i.id === id ? { ...i, [field]: value } : i));
  };

  const subtotal15     = items.filter(i => i.iva_code === "4").reduce((acc, i) => acc + ((i.quantity * i.unit_price) - i.discount), 0);
  const subtotal0      = items.filter(i => i.iva_code === "0").reduce((acc, i) => acc + ((i.quantity * i.unit_price) - i.discount), 0);
  const totalDescuento = items.reduce((acc, i) => acc + i.discount, 0);
  const ivaAmount      = subtotal15 * 0.15;
  const totalFactura   = subtotal15 + subtotal0 + ivaAmount;

  function validateForm(): boolean {
    const e: Record<string, string> = {};
    if (!clientName.trim() || clientName.trim().length < 2) e.clientName = "Razón social / nombre requerido";
    const docErr = validateDocumento(clientDocument);
    if (docErr) e.clientDocument = docErr;
    const emailErr = validateEmail(clientEmail);
    if (emailErr) e.clientEmail = emailErr;
    const telErr = validateTelefono(clientPhone, true);
    if (telErr) e.clientPhone = telErr;
    if (items.length === 0) e.items = "Agrega al menos un ítem a la factura";
    setFormErrors(e);
    return Object.keys(e).length === 0;
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    setLoading(true);
    try {
      const res = await fetch("/api/factura", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patient_id:        patientId || undefined,
          client_name:       clientName,
          client_document:   clientDocument,
          client_email:      clientEmail,
          client_phone:      clientPhone,
          client_address:    clientAddress,
          items,
          payment_method:    paymentMethod,
          bank_account_id:   bankAccountId || undefined,
          payment_reference: paymentReference || undefined,
          forma_pago:        PAYMENT_METHODS.find(m => m.value === paymentMethod)?.sriCode ?? "01",
        }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Error al procesar la factura");
      alert(`Factura emitida. Clave de acceso: ${result.clave_acceso}`);
      router.push("/gestion/facturacion");
    } catch (err: any) {
      alert("Error: " + err.message);
      setLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto pb-12">
      <div className="flex items-center gap-3 mb-5">
        <Link
          href="/gestion/facturacion"
          className="w-9 h-9 flex items-center justify-center rounded-xl bg-white border border-lilac-200 text-ink-600 hover:bg-lilac-50 transition-colors shrink-0"
        >
          <ArrowLeft size={18} />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-ink-900">Emitir Nueva Factura</h1>
          <p className="text-xs text-ink-500">Completa los datos para generar el comprobante electrónico SRI.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">

        {/* ── Datos del Cliente ───────────────────────────── */}
        <div className="bg-white border border-lilac-100 rounded-2xl shadow-sm p-4 sm:p-5">
          <div className="flex items-center justify-between mb-4 border-b border-lilac-50 pb-2">
            <h3 className="font-semibold text-sm text-ink-700 flex items-center gap-2">
              <User size={15} className="text-lilac-600" />
              Datos del Adquirente
            </h3>
            <button
              type="button"
              onClick={() => { setShowSearch(!showSearch); setSearch(""); }}
              className="flex items-center gap-1.5 text-xs text-lilac-600 hover:text-lilac-800 font-medium border border-lilac-200 rounded-lg px-2.5 py-1 hover:bg-lilac-50 transition-colors"
            >
              <Search size={12} />
              {showSearch ? "Cerrar búsqueda" : "Buscar paciente"}
            </button>
          </div>

          {/* Buscador opcional de paciente */}
          {showSearch && (
            <div className="mb-4 relative">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
                <input
                  type="text"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Buscar por nombre o cédula…"
                  autoFocus
                  className="w-full pl-9 pr-4 py-2 text-sm border border-lilac-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-lilac-400 bg-white"
                />
              </div>
              {filteredPatients.length > 0 && (
                <div className="absolute z-20 left-0 right-0 mt-1 bg-white border border-lilac-200 rounded-xl shadow-lg overflow-hidden">
                  {filteredPatients.map(p => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => selectPatient(p)}
                      className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-lilac-50 text-left transition-colors border-b border-lilac-50 last:border-0"
                    >
                      <div>
                        <p className="text-sm font-medium text-ink-900">{p.full_name}</p>
                        <p className="text-xs text-ink-400">{p.document_number ?? "Sin cédula"} {p.email ? `· ${p.email}` : ""}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
              {search.length >= 2 && filteredPatients.length === 0 && (
                <p className="text-xs text-ink-400 mt-2 px-1">No se encontraron pacientes con ese nombre o cédula.</p>
              )}
            </div>
          )}

          {/* Indicador de paciente seleccionado */}
          {patientId && (
            <div className="flex items-center justify-between mb-4 px-3 py-2 bg-green-50 border border-green-200 rounded-xl text-sm text-green-800">
              <span><span className="text-green-600 mr-1">✓</span>Paciente: <strong>{clientName}</strong></span>
              <button type="button" onClick={clearPatient} className="text-green-600 hover:text-green-800 ml-2">
                <X size={14} />
              </button>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-ink-700">Razón Social / Nombres *</label>
              <input type="text" required value={clientName}
                onChange={e => { setClientName(e.target.value); setFormErrors(p => ({ ...p, clientName: "" })); }}
                className={`w-full bg-white border rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-lilac-500 focus:outline-none ${formErrors.clientName ? "border-red-400" : "border-lilac-200"}`}
                placeholder="Juan Pérez" />
              {formErrors.clientName && <p className="text-xs text-red-500">{formErrors.clientName}</p>}
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-ink-700">RUC o Cédula *</label>
              <input type="text" required value={clientDocument} maxLength={13}
                onChange={e => { setClientDocument(e.target.value); setFormErrors(p => ({ ...p, clientDocument: "" })); }}
                onBlur={e => { const err = validateDocumento(e.target.value); if (err) setFormErrors(p => ({ ...p, clientDocument: err })); }}
                className={`w-full bg-white border rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-lilac-500 focus:outline-none font-mono ${formErrors.clientDocument ? "border-red-400" : "border-lilac-200"}`}
                placeholder="1700000000" />
              {formErrors.clientDocument && <p className="text-xs text-red-500">{formErrors.clientDocument}</p>}
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-ink-700">Correo Electrónico *</label>
              <input type="email" required value={clientEmail}
                onChange={e => { setClientEmail(e.target.value); setFormErrors(p => ({ ...p, clientEmail: "" })); }}
                onBlur={e => { const err = validateEmail(e.target.value); if (err) setFormErrors(p => ({ ...p, clientEmail: err })); }}
                className={`w-full bg-white border rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-lilac-500 focus:outline-none ${formErrors.clientEmail ? "border-red-400" : "border-lilac-200"}`}
                placeholder="correo@ejemplo.com" />
              {formErrors.clientEmail && <p className="text-xs text-red-500">{formErrors.clientEmail}</p>}
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-ink-700">Teléfono</label>
              <input type="text" value={clientPhone}
                onChange={e => { setClientPhone(e.target.value); setFormErrors(p => ({ ...p, clientPhone: "" })); }}
                onBlur={e => { const err = validateTelefono(e.target.value, true); if (err) setFormErrors(p => ({ ...p, clientPhone: err })); }}
                className={`w-full bg-white border rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-lilac-500 focus:outline-none ${formErrors.clientPhone ? "border-red-400" : "border-lilac-200"}`}
                placeholder="0999999999" />
              {formErrors.clientPhone && <p className="text-xs text-red-500">{formErrors.clientPhone}</p>}
            </div>
            <div className="md:col-span-2 space-y-1">
              <label className="text-xs font-semibold text-ink-700">Dirección</label>
              <input type="text" value={clientAddress} onChange={e => setClientAddress(e.target.value)}
                className="w-full bg-white border border-lilac-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-lilac-500 focus:outline-none"
                placeholder="Av. Principal y Secundaria" />
            </div>
          </div>
        </div>

        {/* ── Método de Pago ──────────────────────────────── */}
        <div className="bg-white border border-lilac-100 rounded-2xl shadow-sm p-4 sm:p-5">
          <h3 className="font-semibold text-sm text-ink-700 flex items-center gap-2 mb-4 border-b border-lilac-50 pb-2">
            <span className="text-lilac-600">💳</span>
            Forma de Pago
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-ink-700">Método *</label>
              <select value={paymentMethod} onChange={e => { setPaymentMethod(e.target.value); setBankAccountId(""); }}
                className="w-full bg-white border border-lilac-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-lilac-500 focus:outline-none">
                {PAYMENT_METHODS.map(m => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
            </div>

            {paymentMethod !== "efectivo" && (
              <div className="space-y-1">
                <label className="text-xs font-semibold text-ink-700">
                  Cuenta bancaria{(paymentMethod === "transferencia" || paymentMethod === "cheque") ? " *" : ""}
                </label>
                <select value={bankAccountId} onChange={e => setBankAccountId(e.target.value)}
                  required={paymentMethod === "transferencia" || paymentMethod === "cheque"}
                  className="w-full bg-white border border-lilac-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-lilac-500 focus:outline-none">
                  <option value="">— Seleccionar cuenta —</option>
                  {bankAccounts.map(b => (
                    <option key={b.id} value={b.id}>
                      {b.bank_name}{b.account_number ? ` · ${b.account_number}` : ""}
                    </option>
                  ))}
                </select>
                {bankAccounts.length === 0 && (
                  <p className="text-[11px] text-amber-600">No hay cuentas registradas. <a href="/gestion/bancos" className="underline">Agregar cuenta</a></p>
                )}
              </div>
            )}

            <div className="space-y-1">
              <label className="text-xs font-semibold text-ink-700">N° Referencia / Comprobante</label>
              <input type="text" value={paymentReference} onChange={e => setPaymentReference(e.target.value)}
                placeholder="Ej. TRF-001234"
                className="w-full bg-white border border-lilac-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-lilac-500 focus:outline-none font-mono" />
            </div>
          </div>
        </div>

        {/* ── Ítems ───────────────────────────────────────── */}
        <div className="bg-white border border-lilac-100 rounded-2xl shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-lilac-100 bg-lilac-50/30">
            <div className="flex justify-between items-center">
              <h3 className="font-semibold text-sm text-ink-700 flex items-center gap-2">
                <FileText size={15} className="text-lilac-600" />
                Servicios / Productos
              </h3>
              <div className="flex gap-2">
                {services.length > 0 && (
                  <button type="button" onClick={() => setShowCatalog(!showCatalog)}
                    className="flex items-center gap-1 text-xs bg-lilac-600 hover:bg-lilac-700 text-white px-3 py-1.5 rounded-lg font-medium shadow-sm transition-colors">
                    <BookOpen size={13} /> Catálogo
                    <ChevronDown size={11} className={`transition-transform ${showCatalog ? "rotate-180" : ""}`} />
                  </button>
                )}
                <button type="button" onClick={addItem}
                  className="flex items-center gap-1 text-xs bg-white border border-lilac-200 px-3 py-1.5 rounded-lg hover:bg-lilac-50 text-lilac-700 font-medium shadow-sm transition-colors">
                  <Plus size={13} /> Manual
                </button>
              </div>
            </div>

            {/* Panel catálogo */}
            {showCatalog && (
              <div className="mt-3 border border-lilac-200 rounded-xl bg-white overflow-hidden shadow-sm">
                <div className="max-h-64 overflow-y-auto divide-y divide-lilac-50">
                  {Object.entries(
                    services.reduce((acc: Record<string, Service[]>, s) => {
                      if (!acc[s.category]) acc[s.category] = [];
                      acc[s.category].push(s);
                      return acc;
                    }, {})
                  ).map(([cat, catServices]) => (
                    <div key={cat}>
                      <div className="px-3 py-1.5 bg-lilac-50">
                        <span className="text-[10px] font-bold text-lilac-600 uppercase tracking-wide">{cat}</span>
                      </div>
                      {catServices.map(s => (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => addFromCatalog(s)}
                          className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-lilac-50 transition-colors text-left"
                        >
                          <div>
                            <p className="text-sm font-medium text-ink-800">{s.name}</p>
                            {s.description && <p className="text-xs text-ink-400">{s.description}</p>}
                          </div>
                          <div className="text-right shrink-0 ml-4">
                            <p className="text-sm font-bold text-lilac-700">${Number(s.price).toFixed(2)}</p>
                            <p className="text-[10px] text-ink-400">IVA {s.iva_code === "4" ? "15%" : "0%"}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-lilac-50/50 text-ink-500 text-xs uppercase">
                <tr>
                  <th className="px-4 py-2.5">Descripción</th>
                  <th className="px-4 py-2.5 w-20 text-center">Cant.</th>
                  <th className="px-4 py-2.5 w-32">P. Unit.</th>
                  <th className="px-4 py-2.5 w-28">Descuento</th>
                  <th className="px-4 py-2.5 w-32">IVA</th>
                  <th className="px-4 py-2.5 w-32 text-right">Total</th>
                  <th className="px-4 py-2.5 w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-lilac-50">
                {items.map((item) => {
                  const lineTotal = (item.quantity * item.unit_price) - item.discount;
                  return (
                    <tr key={item.id} className="hover:bg-lilac-50/20">
                      <td className="px-4 py-2.5">
                        <input type="text" required value={item.description}
                          onChange={e => updateItem(item.id, "description", e.target.value)}
                          placeholder="Descripción del servicio"
                          className="w-full bg-transparent border-b border-dashed border-lilac-200 focus:border-lilac-500 focus:outline-none py-1" />
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        <input type="number" required min="1" step="0.01" value={item.quantity}
                          onChange={e => updateItem(item.id, "quantity", Number(e.target.value))}
                          className="w-16 bg-transparent border-b border-dashed border-lilac-200 focus:border-lilac-500 focus:outline-none py-1 text-center font-medium" />
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="relative">
                          <span className="absolute left-0 top-1/2 -translate-y-1/2 text-ink-400 text-xs">$</span>
                          <input type="number" required min="0" step="0.01" value={item.unit_price}
                            onChange={e => updateItem(item.id, "unit_price", Number(e.target.value))}
                            className="w-full bg-transparent border-b border-dashed border-lilac-200 focus:border-lilac-500 focus:outline-none py-1 pl-4 font-medium" />
                        </div>
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="relative">
                          <span className="absolute left-0 top-1/2 -translate-y-1/2 text-ink-400 text-xs">$</span>
                          <input type="number" min="0" step="0.01" value={item.discount}
                            onChange={e => updateItem(item.id, "discount", Number(e.target.value))}
                            className="w-full bg-transparent border-b border-dashed border-lilac-200 focus:border-lilac-500 focus:outline-none py-1 pl-4 text-red-600" />
                        </div>
                      </td>
                      <td className="px-4 py-2.5">
                        <select value={item.iva_code}
                          onChange={e => updateItem(item.id, "iva_code", e.target.value)}
                          className="w-full bg-lilac-50 border border-lilac-200 rounded-lg text-xs p-1.5 focus:outline-none focus:ring-1 focus:ring-lilac-500">
                          <option value="4">IVA 15%</option>
                          <option value="0">IVA 0%</option>
                        </select>
                      </td>
                      <td className="px-4 py-2.5 text-right font-bold text-ink-900">
                        ${lineTotal > 0 ? lineTotal.toFixed(2) : "0.00"}
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        <button type="button" onClick={() => removeItem(item.id)} disabled={items.length === 1}
                          className="text-ink-400 hover:text-red-500 transition-colors disabled:opacity-30 p-1">
                          <Trash2 size={15} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Totales */}
          <div className="bg-lilac-50/30 px-5 py-4 flex flex-col items-end border-t border-lilac-100">
            <div className="w-60 space-y-1.5 text-sm">
              <div className="flex justify-between text-ink-600">
                <span>Subtotal IVA 15%</span><span>${subtotal15.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-ink-600">
                <span>Subtotal IVA 0%</span><span>${subtotal0.toFixed(2)}</span>
              </div>
              {totalDescuento > 0 && (
                <div className="flex justify-between text-ink-600">
                  <span>Descuento</span><span className="text-red-600">-${totalDescuento.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-ink-600 border-b border-lilac-200 pb-1.5">
                <span>IVA 15%</span><span>${ivaAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-base font-bold text-ink-900 pt-0.5">
                <span>TOTAL</span><span className="text-lilac-700">${totalFactura.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <button type="button" onClick={() => router.push("/gestion/facturacion")}
            className="px-5 py-2.5 rounded-xl border border-lilac-200 text-ink-700 font-medium hover:bg-lilac-50 transition-colors text-sm">
            Cancelar
          </button>
          <button type="submit" disabled={loading}
            className="flex items-center gap-2 bg-lilac-600 hover:bg-lilac-700 text-white px-7 py-2.5 rounded-xl transition-colors font-semibold shadow-md shadow-lilac-200 disabled:opacity-70 text-sm">
            {loading
              ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Procesando…</>
              : <><Send size={16} /> Emitir Factura</>
            }
          </button>
        </div>

      </form>
    </div>
  );
}
