"use client";

import { useState } from "react";
import { FlaskConical, Zap, AlertTriangle } from "lucide-react";
import SriCertUpload from "./SriCertUpload";

interface Props {
  defaultAmbiente: string;
  hasCert: boolean;
  certSubject?: string | null;
  certExpires?: string | null;
}

export default function SriAmbienteSection({
  defaultAmbiente,
  hasCert,
  certSubject,
  certExpires,
}: Props) {
  const [ambiente, setAmbiente] = useState(defaultAmbiente);
  const isPrd = ambiente === "2";

  return (
    <div className="space-y-3">
      {/* Selector de ambiente */}
      <div className="grid grid-cols-2 gap-3">
        <label className="cursor-pointer">
          <input
            type="radio"
            name="ambiente"
            value="1"
            className="peer sr-only"
            checked={ambiente === "1"}
            onChange={() => setAmbiente("1")}
          />
          <div className="flex flex-col items-center gap-1.5 rounded-xl border border-lilac-200 bg-white px-3 py-3 text-center peer-checked:border-lilac-600 peer-checked:bg-lilac-50 transition-all hover:bg-lilac-50 cursor-pointer">
            <FlaskConical size={18} className="text-lilac-500" />
            <div className="font-bold text-sm text-lilac-700">Pruebas</div>
            <div className="text-[11px] text-ink-400">Sin validez legal</div>
          </div>
        </label>

        <label className={`cursor-pointer ${isPrd && !hasCert ? "opacity-80" : ""}`}>
          <input
            type="radio"
            name="ambiente"
            value="2"
            className="peer sr-only"
            checked={ambiente === "2"}
            onChange={() => setAmbiente("2")}
          />
          <div className="flex flex-col items-center gap-1.5 rounded-xl border border-lilac-200 bg-white px-3 py-3 text-center peer-checked:border-green-600 peer-checked:bg-green-50 transition-all hover:bg-green-50 cursor-pointer">
            <Zap size={18} className="text-green-600" />
            <div className="font-bold text-sm text-green-700">Producción</div>
            <div className="text-[11px] text-ink-400">Facturas SRI oficiales</div>
          </div>
        </label>
      </div>

      {/* Sección .p12 — solo visible en Producción */}
      {isPrd && (
        <div className="border border-lilac-100 rounded-xl p-4 bg-lilac-50/30 space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-ink-800">Certificado de Firma Electrónica</span>
            <span className="text-[10px] font-bold text-red-600 bg-red-50 border border-red-200 rounded-full px-2 py-0.5">
              Requerido para PRD
            </span>
          </div>

          {!hasCert && (
            <div className="flex items-start gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              <AlertTriangle size={14} className="shrink-0 mt-0.5" />
              <span>
                Debes subir tu certificado <strong>.p12</strong> antes de guardar en modo Producción.
                Sin él, las facturas no podrán firmarse ni enviarse al SRI.
              </span>
            </div>
          )}

          <SriCertUpload
            currentSubject={certSubject ?? null}
            currentExpires={certExpires ?? null}
          />
        </div>
      )}

      {!isPrd && (
        <p className="text-xs text-ink-400 px-1">
          En modo Pruebas las facturas se generan internamente sin enviar al SRI. Cambia a Producción cuando tengas tu certificado <code>.p12</code> listo.
        </p>
      )}
    </div>
  );
}
