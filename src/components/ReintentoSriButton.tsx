"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw, CheckCircle2, XCircle, Loader2 } from "lucide-react";

export default function ReintentoSriButton({ invoiceId }: { invoiceId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<"authorized" | "rejected" | "submitted" | null>(null);

  async function reintentar() {
    setLoading(true);
    setResult(null);
    try {
      const res  = await fetch("/api/admin/sri-reintento", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invoice_id: invoiceId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error");
      setResult(data.estado);
      // Refrescar la página para mostrar el nuevo estado
      router.refresh();
    } catch (err: any) {
      alert("Error al reintentar: " + err.message);
    } finally {
      setLoading(false);
    }
  }

  if (result === "authorized") {
    return (
      <span className="flex items-center gap-1.5 text-xs font-semibold text-green-700 bg-green-50 border border-green-200 px-3 py-1.5 rounded-xl">
        <CheckCircle2 size={14} /> ¡Autorizado!
      </span>
    );
  }

  if (result === "rejected") {
    return (
      <span className="flex items-center gap-1.5 text-xs font-semibold text-red-700 bg-red-50 border border-red-200 px-3 py-1.5 rounded-xl">
        <XCircle size={14} /> Rechazado — ver mensajes SRI
      </span>
    );
  }

  return (
    <button onClick={reintentar} disabled={loading}
      className="flex items-center gap-1.5 text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-300 hover:bg-amber-100 px-3 py-1.5 rounded-xl transition-colors disabled:opacity-60">
      {loading
        ? <><Loader2 size={14} className="animate-spin" /> Consultando SRI…</>
        : <><RefreshCw size={14} /> Reintentar autorización SRI</>
      }
    </button>
  );
}
