"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw, CheckCircle2, XCircle, Loader2, Search, X, AlertTriangle, Wifi } from "lucide-react";

interface DiagResult {
  factura: string;
  ambiente: string;
  clave_acceso: string;
  estado_local: string;
  url_autorizacion: string;
  url_recepcion: string;
  http_status: number;
  error_red: string | null;
  respuesta_sri: string | null;
  estado_sri: string;
  cero_comprobantes: boolean;
  diagnostico: string | null;
}

export default function ReintentoSriButton({ invoiceId }: { invoiceId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [diagLoading, setDiagLoading] = useState(false);
  const [result, setResult] = useState<"authorized" | "rejected" | "submitted" | null>(null);
  const [diag, setDiag] = useState<DiagResult | null>(null);
  const [showDiag, setShowDiag] = useState(false);

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
      router.refresh();
    } catch (err: any) {
      alert("Error al reintentar: " + err.message);
    } finally {
      setLoading(false);
    }
  }

  async function diagnosticar() {
    setDiagLoading(true);
    setShowDiag(true);
    try {
      const res  = await fetch("/api/admin/sri-diagnostico", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invoice_id: invoiceId }),
      });
      const data = await res.json();
      setDiag(data);
    } catch (err: any) {
      setDiag({ error_red: err.message } as any);
    } finally {
      setDiagLoading(false);
    }
  }

  const estadoColor: Record<string, string> = {
    "AUTORIZADO":     "text-green-700 bg-green-50 border-green-200",
    "NO AUTORIZADO":  "text-red-700 bg-red-50 border-red-200",
    "EN PROCESO":     "text-amber-700 bg-amber-50 border-amber-200",
    "SIN CONEXIÓN":   "text-gray-700 bg-gray-50 border-gray-200",
    "DESCONOCIDO":    "text-ink-600 bg-ink-50 border-ink-200",
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2 flex-wrap">
        {/* Botón reintentar */}
        {result === "authorized" ? (
          <span className="flex items-center gap-1.5 text-xs font-semibold text-green-700 bg-green-50 border border-green-200 px-3 py-1.5 rounded-xl">
            <CheckCircle2 size={14} /> ¡Autorizado!
          </span>
        ) : result === "rejected" ? (
          <span className="flex items-center gap-1.5 text-xs font-semibold text-red-700 bg-red-50 border border-red-200 px-3 py-1.5 rounded-xl">
            <XCircle size={14} /> Rechazado — ver mensajes SRI abajo
          </span>
        ) : (
          <button onClick={reintentar} disabled={loading}
            className="flex items-center gap-1.5 text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-300 hover:bg-amber-100 px-3 py-1.5 rounded-xl transition-colors disabled:opacity-60">
            {loading
              ? <><Loader2 size={14} className="animate-spin" /> Consultando SRI…</>
              : <><RefreshCw size={14} /> Reintentar</>
            }
          </button>
        )}

        {/* Botón diagnóstico */}
        <button onClick={diagnosticar} disabled={diagLoading}
          className="flex items-center gap-1.5 text-xs font-semibold text-lilac-700 bg-lilac-50 border border-lilac-200 hover:bg-lilac-100 px-3 py-1.5 rounded-xl transition-colors disabled:opacity-60">
          {diagLoading
            ? <><Loader2 size={14} className="animate-spin" /> Diagnosticando…</>
            : <><Search size={14} /> Ver respuesta SRI</>
          }
        </button>
      </div>

      {/* Panel de diagnóstico */}
      {showDiag && diag && (
        <div className="mt-2 bg-ink-900 text-green-400 rounded-xl p-4 text-xs font-mono relative">
          <button onClick={() => setShowDiag(false)}
            className="absolute top-2 right-2 text-ink-400 hover:text-white">
            <X size={14} />
          </button>

          <p className="text-ink-400 mb-2 font-sans font-semibold text-[11px] uppercase tracking-wide">
            Diagnóstico SRI — {diag.ambiente}
          </p>

          {/* Estado resumido */}
          <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-lg border text-[11px] font-semibold mb-3 ${estadoColor[diag.estado_sri] || estadoColor["DESCONOCIDO"]}`}>
            {diag.estado_sri === "AUTORIZADO"    && <CheckCircle2 size={12} />}
            {diag.estado_sri === "NO AUTORIZADO" && <XCircle size={12} />}
            {diag.estado_sri === "EN PROCESO"    && <Loader2 size={12} className="animate-spin" />}
            {diag.estado_sri === "SIN CONEXIÓN"  && <Wifi size={12} />}
            Estado SRI: <strong>{diag.estado_sri}</strong>
          </div>

          {/* Error de red */}
          {diag.error_red && (
            <div className="bg-red-900/40 border border-red-700 rounded-lg px-3 py-2 mb-3">
              <p className="text-red-300 flex items-center gap-1.5">
                <AlertTriangle size={12} /> {diag.error_red}
              </p>
              <p className="text-ink-400 mt-1 font-sans text-[11px]">
                Verifica que el servidor tiene acceso a internet y que el SRI esté disponible.
              </p>
            </div>
          )}

          {/* Diagnóstico principal */}
          {diag.diagnostico && (
            <div className={`rounded-lg px-3 py-2 mb-3 border ${diag.cero_comprobantes ? "bg-red-900/30 border-red-700 text-red-300" : "bg-green-900/30 border-green-700 text-green-300"}`}>
              {diag.diagnostico}
            </div>
          )}

          {/* Detalles */}
          <div className="space-y-1 mb-3">
            <p><span className="text-ink-400">Factura:</span> <span className="text-white">{diag.factura}</span></p>
            <p><span className="text-ink-400">Recepción:</span> <span className="text-yellow-300 break-all text-[10px]">{diag.url_recepcion}</span></p>
            <p><span className="text-ink-400">Autorización:</span> <span className="text-green-300 break-all text-[10px]">{diag.url_autorizacion}</span></p>
            <p><span className="text-ink-400">HTTP:</span> <span className={diag.http_status === 200 ? "text-green-400" : "text-red-400"}>{diag.http_status || "—"}</span></p>
          </div>

          {/* Respuesta XML */}
          {diag.respuesta_sri && (
            <>
              <p className="text-ink-400 text-[11px] mb-1">Respuesta XML del SRI:</p>
              <pre className="bg-black/40 rounded-lg p-3 overflow-x-auto text-[10px] text-green-300 whitespace-pre-wrap max-h-48 overflow-y-auto">
                {diag.respuesta_sri
                  .replace(/></g, ">\n")
                  .replace(/^\s*\n/gm, "")
                  .trim()
                }
              </pre>
            </>
          )}
        </div>
      )}
    </div>
  );
}
