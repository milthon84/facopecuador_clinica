"use client";

import { useState } from "react";
import { FlaskConical, Zap, AlertTriangle, CheckCircle2 } from "lucide-react";
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
            <div className="text-[11px] text-ink-400">celcer.sri.gob.ec</div>
          </div>
        </label>

        <label className="cursor-pointer">
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
            <div className="text-[11px] text-ink-400">cel.sri.gob.ec</div>
          </div>
        </label>
      </div>

      {/* Certificado — requerido en ambos ambientes */}
      <div className="border border-lilac-100 rounded-xl p-4 bg-lilac-50/30 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-ink-800">
            Certificado de Firma Electrónica (.p12)
          </span>
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
            isPrd
              ? "text-red-600 bg-red-50 border-red-200"
              : "text-lilac-700 bg-lilac-50 border-lilac-200"
          }`}>
            {isPrd ? "Requerido PRD" : "Requerido Pruebas"}
          </span>
        </div>

        {/* Info de ambiente */}
        <div className={`flex items-start gap-2 text-xs rounded-lg px-3 py-2 border ${
          isPrd
            ? "bg-green-50 border-green-200 text-green-800"
            : "bg-lilac-50 border-lilac-200 text-lilac-800"
        }`}>
          {isPrd ? <Zap size={13} className="shrink-0 mt-0.5" /> : <FlaskConical size={13} className="shrink-0 mt-0.5" />}
          <span>
            {isPrd
              ? <>Modo <strong>Producción</strong> — las facturas se envían a <code>cel.sri.gob.ec</code> y tienen validez legal tributaria.</>
              : <>Modo <strong>Pruebas</strong> — las facturas se envían a <code>celcer.sri.gob.ec</code> para verificar que la integración funciona. Sin validez tributaria.</>
            }
          </span>
        </div>

        {!hasCert && (
          <div className="flex items-start gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
            <AlertTriangle size={14} className="shrink-0 mt-0.5" />
            <span>
              Sube tu certificado <strong>.p12</strong> para conectarte al SRI.
              Sin él, las facturas se generan localmente sin enviarse al SRI.
            </span>
          </div>
        )}

        {hasCert && (
          <div className="flex items-center gap-2 text-xs text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
            <CheckCircle2 size={14} className="shrink-0" />
            <span>Certificado cargado — las facturas se firmarán y enviarán al SRI automáticamente.</span>
          </div>
        )}

        <SriCertUpload
          currentSubject={certSubject ?? null}
          currentExpires={certExpires ?? null}
        />
      </div>
    </div>
  );
}
