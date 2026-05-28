"use client";

import { useRef, useState } from "react";
import { Upload, CheckCircle2, AlertCircle, Loader2, ShieldCheck, ShieldX, Eye, EyeOff } from "lucide-react";

interface Props {
  currentSubject?: string | null;
  currentExpires?: string | null;
}

export default function SriCertUpload({ currentSubject, currentExpires }: Props) {
  const fileRef  = useRef<HTMLInputElement>(null);
  const [file, setFile]       = useState<File | null>(null);
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [status, setStatus]   = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const [newSubject, setNewSubject] = useState<string | null>(null);
  const [newExpires, setNewExpires] = useState<string | null>(null);

  const hasCert = !!(currentSubject || newSubject);
  const subject = newSubject ?? currentSubject;
  const expires = newExpires ?? currentExpires;

  async function handleUpload() {
    if (!file || !password) return;
    setStatus("loading");
    setMessage("");

    const fd = new FormData();
    fd.append("file", file);
    fd.append("password", password);

    try {
      const res  = await fetch("/api/admin/sri/upload-cert", { method: "POST", body: fd });
      const data = await res.json();

      if (!res.ok) {
        setStatus("error");
        setMessage(data.error || "Error al subir el certificado.");
        return;
      }

      setStatus("success");
      setMessage("Certificado cargado y validado correctamente.");
      setNewSubject(data.certInfo?.subject ?? null);
      setNewExpires(data.certInfo?.validTo ?? null);
      setFile(null);
      setPassword("");
      if (fileRef.current) fileRef.current.value = "";
    } catch {
      setStatus("error");
      setMessage("No se pudo conectar con el servidor.");
    }
  }

  return (
    <div className="space-y-4">

      {/* Estado actual del certificado */}
      <div className={`flex items-start gap-3 p-4 rounded-xl border ${
        hasCert
          ? "bg-green-50 border-green-200"
          : "bg-amber-50 border-amber-200"
      }`}>
        {hasCert
          ? <ShieldCheck size={20} className="text-green-600 shrink-0 mt-0.5" />
          : <ShieldX    size={20} className="text-amber-600 shrink-0 mt-0.5" />
        }
        <div className="text-sm">
          {hasCert ? (
            <>
              <p className="font-semibold text-green-800">Certificado cargado</p>
              <p className="text-green-700 mt-0.5 break-all">{subject}</p>
              {expires && (
                <p className="text-green-600 text-xs mt-1">
                  Válido hasta: <strong>{expires}</strong>
                </p>
              )}
            </>
          ) : (
            <>
              <p className="font-semibold text-amber-800">Sin certificado</p>
              <p className="text-amber-700 mt-0.5">
                Suba su archivo <code>.p12</code> para habilitar la firma digital en producción.
              </p>
            </>
          )}
        </div>
      </div>

      {/* Formulario de subida */}
      <div className="space-y-3">
        <div>
          <label className="text-sm font-semibold text-ink-700 block mb-1.5">
            Archivo .p12 {hasCert && <span className="text-ink-400 font-normal">(reemplazar certificado)</span>}
          </label>
          <div
            className="flex items-center gap-3 border-2 border-dashed border-lilac-200 rounded-xl px-4 py-3 cursor-pointer hover:border-lilac-400 hover:bg-lilac-50/50 transition-colors"
            onClick={() => fileRef.current?.click()}
          >
            <Upload size={18} className="text-lilac-500 shrink-0" />
            <span className="text-sm text-ink-600">
              {file ? file.name : "Seleccionar archivo .p12…"}
            </span>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept=".p12,.pfx"
            className="hidden"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
        </div>

        <div>
          <label className="text-sm font-semibold text-ink-700 block mb-1.5">
            Contraseña del certificado
          </label>
          <div className="relative">
            <input
              type={showPass ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Contraseña del .p12"
              className="w-full border border-lilac-200 rounded-xl px-4 py-2.5 text-sm pr-10 focus:outline-none focus:ring-2 focus:ring-lilac-400 bg-white"
            />
            <button
              type="button"
              onClick={() => setShowPass(!showPass)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-400 hover:text-ink-700"
            >
              {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        <button
          type="button"
          onClick={handleUpload}
          disabled={!file || !password || status === "loading"}
          className="w-full flex items-center justify-center gap-2 bg-lilac-600 hover:bg-lilac-700 disabled:opacity-50 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors"
        >
          {status === "loading"
            ? <><Loader2 size={16} className="animate-spin" /> Verificando y subiendo…</>
            : <><Upload size={16} /> Subir certificado</>
          }
        </button>
      </div>

      {/* Feedback */}
      {status !== "idle" && status !== "loading" && (
        <div className={`flex items-start gap-2 text-sm rounded-xl px-4 py-3 border ${
          status === "success"
            ? "bg-green-50 border-green-200 text-green-800"
            : "bg-red-50 border-red-200 text-red-800"
        }`}>
          {status === "success"
            ? <CheckCircle2 size={16} className="shrink-0 mt-0.5 text-green-600" />
            : <AlertCircle  size={16} className="shrink-0 mt-0.5 text-red-500"   />
          }
          <span>{message}</span>
        </div>
      )}
    </div>
  );
}
