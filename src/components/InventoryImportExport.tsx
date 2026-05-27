"use client";

import { useRef, useState } from "react";
import { Upload, Download, X, CheckCircle, AlertTriangle, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

type Status = "idle" | "loading" | "success" | "error";

export default function InventoryImportExport() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState("");
  const [warnings, setWarnings] = useState<string[]>([]);

  // ── EXPORTAR ──────────────────────────────────────────────────────────────
  function handleExport() {
    window.location.href = "/api/admin/inventario/export";
  }

  // ── IMPORTAR ──────────────────────────────────────────────────────────────
  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Resetear input para permitir subir el mismo archivo de nuevo
    e.target.value = "";

    setStatus("loading");
    setMessage("");
    setWarnings([]);

    try {
      const fd = new FormData();
      fd.append("file", file);

      const res = await fetch("/api/admin/inventario/import", {
        method: "POST",
        body: fd,
      });

      const data = await res.json();

      if (!res.ok) {
        setStatus("error");
        setMessage(data.error || "Error al importar el archivo.");
        if (data.details) setWarnings(data.details);
        return;
      }

      setStatus("success");
      setMessage(data.message || "Importación completada.");
      if (data.warnings) setWarnings(data.warnings);

      // Refrescar la tabla de inventario
      router.refresh();
    } catch {
      setStatus("error");
      setMessage("No se pudo conectar con el servidor.");
    }
  }

  function dismiss() {
    setStatus("idle");
    setMessage("");
    setWarnings([]);
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Botones */}
      <div className="flex gap-2">
        {/* Exportar */}
        <button
          onClick={handleExport}
          className="flex items-center gap-2 text-sm font-medium bg-white border border-lilac-200 hover:bg-lilac-50 text-ink-700 px-4 py-2 rounded-xl transition-colors shadow-sm"
        >
          <Download size={16} className="text-lilac-600" />
          Descargar Excel
        </button>

        {/* Importar */}
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={status === "loading"}
          className="flex items-center gap-2 text-sm font-medium bg-white border border-lilac-200 hover:bg-lilac-50 text-ink-700 px-4 py-2 rounded-xl transition-colors shadow-sm disabled:opacity-60"
        >
          {status === "loading" ? (
            <Loader2 size={16} className="animate-spin text-lilac-500" />
          ) : (
            <Upload size={16} className="text-lilac-600" />
          )}
          {status === "loading" ? "Importando…" : "Cargar Excel"}
        </button>

        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx,.xls"
          className="hidden"
          onChange={handleFileChange}
        />
      </div>

      {/* Feedback */}
      {status !== "idle" && status !== "loading" && (
        <div
          className={`flex gap-3 items-start rounded-xl px-4 py-3 text-sm border ${
            status === "success"
              ? "bg-green-50 border-green-200 text-green-800"
              : "bg-red-50 border-red-200 text-red-800"
          }`}
        >
          {status === "success" ? (
            <CheckCircle size={18} className="shrink-0 mt-0.5 text-green-600" />
          ) : (
            <AlertTriangle size={18} className="shrink-0 mt-0.5 text-red-500" />
          )}
          <div className="flex-1">
            <p className="font-semibold">{message}</p>
            {warnings.length > 0 && (
              <ul className="mt-1 space-y-0.5 text-xs opacity-80 list-disc list-inside">
                {warnings.map((w, i) => <li key={i}>{w}</li>)}
              </ul>
            )}
          </div>
          <button onClick={dismiss} className="shrink-0 opacity-60 hover:opacity-100">
            <X size={16} />
          </button>
        </div>
      )}

      {/* Hint */}
      <p className="text-xs text-ink-400">
        Descarga el Excel para ver el inventario actual. La segunda pestaña contiene la plantilla para importar nuevos insumos.
      </p>
    </div>
  );
}
