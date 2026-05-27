"use client";

import { useState, useEffect, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Plus, Trash2, Send, FileText, User } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unit_price: number;
  discount: number;
  iva_code: "4" | "0"; // 4=15%, 0=0%
}

export default function NewInvoicePage() {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  
  const [patients, setPatients] = useState<any[]>([]);
  const [items, setItems] = useState<InvoiceItem[]>([
    { id: "1", description: "Consulta General", quantity: 1, unit_price: 40.00, discount: 0, iva_code: "0" }
  ]);
  
  // Datos del Cliente
  const [patientId, setPatientId] = useState("");
  const [clientName, setClientName] = useState("");
  const [clientDocument, setClientDocument] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [clientAddress, setClientAddress] = useState("");

  useEffect(() => {
    supabase.from("patients").select("id, full_name, document_number, email, phone").then(({ data }) => {
      if (data) setPatients(data);
    });
  }, [supabase]);

  const handlePatientSelect = (id: string) => {
    setPatientId(id);
    if (!id) return;
    const p = patients.find(x => x.id === id);
    if (p) {
      setClientName(p.full_name);
      setClientDocument(p.document_number || "");
      setClientEmail(p.email || "");
      setClientPhone(p.phone || "");
    }
  };

  const addItem = () => {
    setItems([...items, { id: Math.random().toString(), description: "", quantity: 1, unit_price: 0, discount: 0, iva_code: "4" }]);
  };

  const removeItem = (id: string) => {
    if (items.length > 1) {
      setItems(items.filter(i => i.id !== id));
    }
  };

  const updateItem = (id: string, field: keyof InvoiceItem, value: any) => {
    setItems(items.map(i => i.id === id ? { ...i, [field]: value } : i));
  };

  // Cálculos en tiempo real
  const subtotal15 = items.filter(i => i.iva_code === "4").reduce((acc, i) => acc + ((i.quantity * i.unit_price) - i.discount), 0);
  const subtotal0 = items.filter(i => i.iva_code === "0").reduce((acc, i) => acc + ((i.quantity * i.unit_price) - i.discount), 0);
  const totalDescuento = items.reduce((acc, i) => acc + i.discount, 0);
  const ivaAmount = subtotal15 * 0.15;
  const totalFactura = subtotal15 + subtotal0 + ivaAmount;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch("/api/factura", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patient_id: patientId || undefined,
          client_name: clientName,
          client_document: clientDocument,
          client_email: clientEmail,
          client_phone: clientPhone,
          client_address: clientAddress,
          items: items
        }),
      });

      const result = await res.json();
      
      if (!res.ok) throw new Error(result.error || "Error al procesar la factura");

      alert(`Factura emitida y firmada con éxito. Clave de acceso: ${result.clave_acceso}`);
      router.push("/admin/facturacion");
    } catch (err: any) {
      alert("Error: " + err.message);
      setLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto pb-12">
      <div className="flex items-center gap-4 mb-6">
        <Link
          href="/admin/facturacion"
          className="w-10 h-10 flex items-center justify-center rounded-xl bg-white border border-lilac-200 text-ink-600 hover:bg-lilac-50 transition-colors"
        >
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-ink-900 flex items-center gap-2">
            Emitir Nueva Factura
          </h1>
          <p className="text-sm text-ink-600">Completa los datos para generar el comprobante electrónico (SRI).</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        
        {/* Datos del Cliente */}
        <div className="bg-white border border-lilac-100 rounded-2xl shadow-sm p-6">
          <h3 className="font-semibold text-ink-900 flex items-center gap-2 mb-5 border-b border-lilac-50 pb-2">
            <User size={18} className="text-lilac-600" />
            Datos del Adquirente
          </h3>
          
          <div className="mb-5">
            <label className="text-sm font-semibold text-ink-700 mb-1 block">Autocompletar desde Pacientes Registrados</label>
            <select 
              className="w-full bg-lilac-50/50 border border-lilac-100 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-lilac-500"
              value={patientId}
              onChange={(e) => handlePatientSelect(e.target.value)}
            >
              <option value="">-- Ingresar datos manualmente --</option>
              {patients.map(p => (
                <option key={p.id} value={p.id}>{p.full_name} ({p.document_number || 'Sin Cédula'})</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="text-sm font-semibold text-ink-700 mb-1 block">Razón Social / Nombres *</label>
              <input type="text" required value={clientName} onChange={e => setClientName(e.target.value)}
                className="w-full bg-white border border-lilac-200 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-lilac-500" placeholder="Juan Pérez" />
            </div>
            <div>
              <label className="text-sm font-semibold text-ink-700 mb-1 block">RUC o Cédula *</label>
              <input type="text" required value={clientDocument} onChange={e => setClientDocument(e.target.value)} maxLength={13}
                className="w-full bg-white border border-lilac-200 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-lilac-500 font-mono" placeholder="1700000000" />
            </div>
            <div>
              <label className="text-sm font-semibold text-ink-700 mb-1 block">Correo Electrónico *</label>
              <input type="email" required value={clientEmail} onChange={e => setClientEmail(e.target.value)}
                className="w-full bg-white border border-lilac-200 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-lilac-500" placeholder="correo@ejemplo.com" />
            </div>
            <div>
              <label className="text-sm font-semibold text-ink-700 mb-1 block">Teléfono</label>
              <input type="text" value={clientPhone} onChange={e => setClientPhone(e.target.value)}
                className="w-full bg-white border border-lilac-200 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-lilac-500" placeholder="0999999999" />
            </div>
            <div className="md:col-span-2">
              <label className="text-sm font-semibold text-ink-700 mb-1 block">Dirección</label>
              <input type="text" value={clientAddress} onChange={e => setClientAddress(e.target.value)}
                className="w-full bg-white border border-lilac-200 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-lilac-500" placeholder="Av. Principal y Secundaria" />
            </div>
          </div>
        </div>

        {/* Detalles de Factura */}
        <div className="bg-white border border-lilac-100 rounded-2xl shadow-sm overflow-hidden">
          <div className="p-5 border-b border-lilac-100 flex justify-between items-center bg-lilac-50/30">
            <h3 className="font-semibold text-ink-900 flex items-center gap-2">
              <FileText size={18} className="text-lilac-600" />
              Detalle de Productos / Servicios
            </h3>
            <button type="button" onClick={addItem} className="btn-secondary text-xs flex items-center gap-1 bg-white border border-lilac-200 px-3 py-1.5 rounded-lg hover:bg-lilac-50 text-lilac-700 font-medium shadow-sm transition-colors">
              <Plus size={14} /> Añadir Ítem
            </button>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-lilac-50/50 text-ink-600 text-xs uppercase font-semibold">
                <tr>
                  <th className="px-4 py-3">Descripción</th>
                  <th className="px-4 py-3 w-20 text-center">Cant.</th>
                  <th className="px-4 py-3 w-32">P. Unitario</th>
                  <th className="px-4 py-3 w-28">Descuento</th>
                  <th className="px-4 py-3 w-32">Impuesto</th>
                  <th className="px-4 py-3 w-32 text-right">Total</th>
                  <th className="px-4 py-3 w-12 text-center"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-lilac-50">
                {items.map((item, idx) => {
                  const lineTotal = (item.quantity * item.unit_price) - item.discount;
                  return (
                    <tr key={item.id} className="hover:bg-lilac-50/20">
                      <td className="px-4 py-3">
                        <input type="text" required value={item.description} onChange={e => updateItem(item.id, "description", e.target.value)}
                          placeholder="Descripción del servicio" className="w-full bg-transparent border-b border-dashed border-lilac-200 focus:border-lilac-500 focus:outline-none py-1" />
                      </td>
                      <td className="px-4 py-3 text-center">
                        <input type="number" required min="1" step="0.01" value={item.quantity} onChange={e => updateItem(item.id, "quantity", Number(e.target.value))}
                          className="w-16 bg-transparent border-b border-dashed border-lilac-200 focus:border-lilac-500 focus:outline-none py-1 text-center font-medium" />
                      </td>
                      <td className="px-4 py-3">
                        <div className="relative">
                          <span className="absolute left-0 top-1/2 -translate-y-1/2 text-ink-400">$</span>
                          <input type="number" required min="0" step="0.01" value={item.unit_price} onChange={e => updateItem(item.id, "unit_price", Number(e.target.value))}
                            className="w-full bg-transparent border-b border-dashed border-lilac-200 focus:border-lilac-500 focus:outline-none py-1 pl-4 font-medium" />
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="relative">
                          <span className="absolute left-0 top-1/2 -translate-y-1/2 text-ink-400">$</span>
                          <input type="number" min="0" step="0.01" value={item.discount} onChange={e => updateItem(item.id, "discount", Number(e.target.value))}
                            className="w-full bg-transparent border-b border-dashed border-lilac-200 focus:border-lilac-500 focus:outline-none py-1 pl-4 text-red-600" />
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <select value={item.iva_code} onChange={e => updateItem(item.id, "iva_code", e.target.value)}
                          className="w-full bg-lilac-50 border border-lilac-200 rounded-lg text-xs p-1.5 focus:outline-none focus:ring-1 focus:ring-lilac-500">
                          <option value="4">IVA 15%</option>
                          <option value="0">IVA 0%</option>
                        </select>
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-ink-900">
                        ${lineTotal > 0 ? lineTotal.toFixed(2) : "0.00"}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button type="button" onClick={() => removeItem(item.id)} disabled={items.length === 1}
                          className="text-ink-400 hover:text-red-500 transition-colors disabled:opacity-30 p-1">
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          
          {/* Totales */}
          <div className="bg-lilac-50/50 p-6 flex flex-col items-end border-t border-lilac-100">
            <div className="w-64 space-y-2 text-sm">
              <div className="flex justify-between text-ink-600">
                <span>Subtotal IVA 15%</span>
                <span>${subtotal15.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-ink-600">
                <span>Subtotal IVA 0%</span>
                <span>${subtotal0.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-ink-600">
                <span>Descuento Total</span>
                <span className="text-red-600">-${totalDescuento.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-ink-600 border-b border-lilac-200 pb-2">
                <span>IVA 15%</span>
                <span>${ivaAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-lg font-bold text-ink-900 pt-1">
                <span>TOTAL</span>
                <span className="text-lilac-700">${totalFactura.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4">
          <button type="button" onClick={() => router.push("/admin/facturacion")} className="px-6 py-3 rounded-xl border border-lilac-200 text-ink-700 font-medium hover:bg-lilac-50 transition-colors">
            Cancelar
          </button>
          <button type="submit" disabled={loading} className="btn-primary flex items-center gap-2 bg-lilac-600 hover:bg-lilac-700 text-white px-8 py-3 rounded-xl transition-colors font-bold shadow-md shadow-lilac-200 disabled:opacity-70">
            {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Send size={18} />}
            {loading ? "Firmando XML..." : "Emitir y Enviar SRI"}
          </button>
        </div>

      </form>
    </div>
  );
}
