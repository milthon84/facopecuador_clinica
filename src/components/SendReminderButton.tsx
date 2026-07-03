"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, Check, Loader2, CheckCircle2, AlertCircle } from "lucide-react";

interface Props {
  appointmentId: string;
  reminderSentAt: string | null;
  patientEmail: string | null;
}

export default function SendReminderButton({
  appointmentId,
  reminderSentAt,
  patientEmail,
}: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [alertModal, setAlertModal] = useState<{
    show: boolean;
    type: "success" | "error";
    title: string;
    message: string;
  } | null>(null);

  async function handleSend(e: React.MouseEvent) {
    // Prevent the parent card/row Link navigation
    e.preventDefault();
    e.stopPropagation();

    if (!patientEmail) {
      setAlertModal({
        show: true,
        type: "error",
        title: "Correo no configurado",
        message: "El paciente no tiene un correo electrónico registrado en su ficha.",
      });
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/admin/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: appointmentId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al enviar recordatorio");
      
      setAlertModal({
        show: true,
        type: "success",
        title: "¡Recordatorio Enviado!",
        message: "El correo electrónico de recordatorio ha sido enviado correctamente al paciente.",
      });
      router.refresh();
    } catch (err: any) {
      setAlertModal({
        show: true,
        type: "error",
        title: "Error al enviar",
        message: err.message || "No se pudo enviar el correo de recordatorio.",
      });
    } finally {
      setLoading(false);
    }
  }

  const hasSent = !!reminderSentAt;

  return (
    <>
      <button
        onClick={handleSend}
        disabled={loading}
        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-semibold border transition-all ${
          hasSent
            ? "border-green-200 bg-green-50 text-green-700 hover:bg-green-100"
            : "border-gold-300 bg-gold-50 text-gold-700 hover:bg-gold-100 shadow-sm"
        } disabled:opacity-60`}
        title={
          hasSent
            ? `Recordatorio enviado el ${new Date(reminderSentAt).toLocaleString(
                "es-EC"
              )}`
            : "Enviar recordatorio por correo"
        }
      >
        {loading ? (
          <Loader2 size={13} className="animate-spin" />
        ) : hasSent ? (
          <Check size={13} />
        ) : (
          <Bell size={13} />
        )}
        <span>{hasSent ? "Reenviar Recordatorio" : "Enviar Recordatorio"}</span>
      </button>

      {alertModal?.show && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm transition-all duration-300 animate-in fade-in"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setAlertModal(null);
          }}
        >
          <div 
            className="bg-white border border-lilac-100 rounded-3xl p-6 max-w-sm w-full mx-4 shadow-2xl flex flex-col items-center text-center animate-in zoom-in-95 duration-200"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
          >
            {/* Icono */}
            <div className="flex items-center justify-center mb-4">
              {alertModal.type === "success" ? (
                <div className="h-12 w-12 rounded-full bg-green-50 flex items-center justify-center text-green-600">
                  <CheckCircle2 size={24} />
                </div>
              ) : (
                <div className="h-12 w-12 rounded-full bg-red-50 flex items-center justify-center text-red-600">
                  <AlertCircle size={24} />
                </div>
              )}
            </div>

            {/* Titulo y Mensaje */}
            <h3 className="text-lg font-bold text-ink-900 mb-2">{alertModal.title}</h3>
            <p className="text-xs text-ink-600 leading-relaxed mb-6">{alertModal.message}</p>

            {/* Accion */}
            <div className="w-full">
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setAlertModal(null);
                }}
                className={`w-full py-2.5 rounded-xl text-xs font-semibold text-white transition shadow-md ${
                  alertModal.type === "success" 
                    ? "bg-green-600 hover:bg-green-700 shadow-green-200" 
                    : "bg-red-600 hover:bg-red-700 shadow-red-200"
                }`}
              >
                Aceptar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
