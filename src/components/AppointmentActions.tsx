"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, XCircle, AlertCircle, MessageSquare } from "lucide-react";

interface Props { appointment: any }

export default function AppointmentActions({ appointment }: Props) {
  const router = useRouter();
  const [notes, setNotes] = useState(appointment.admin_notes || "");
  const [cancelReason, setCancelReason] = useState("");
  const [showCancel, setShowCancel] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeStatus, setActiveStatus] = useState<string | null>(null);

  async function updateStatus(status: string, extra: Record<string, any> = {}) {
    setLoading(true);
    setActiveStatus(status);
    let isRedirecting = false;
    try {
      const res = await fetch("/api/admin/appointments", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: appointment.id,
          status,
          extra: { ...extra, admin_notes: notes },
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al actualizar el estado");

      // Invalida el router cache del cliente: sin esto, al volver a esta
      // pagina Next.js sirve el RSC payload en memoria (estado viejo)
      // en lugar de pedir datos frescos al servidor.
      router.refresh();

      if (status === "attended") {
        isRedirecting = true;
        router.push(`/admin/citas/${appointment.id}/atencion`);
      } else if (status === "no_show" || status === "cancelled") {
        isRedirecting = true;
        router.push("/admin");
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      if (!isRedirecting) {
        setLoading(false);
        setActiveStatus(null);
      }
    }
  }

  const disabled = loading || appointment.status === "cancelled";

  return (
    <div className="space-y-4">
      {loading && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-ink/40 backdrop-blur-sm transition-all duration-300">
          <div className="bg-white/95 border border-lilac-100 rounded-3xl p-8 max-w-sm w-full mx-4 shadow-2xl flex flex-col items-center text-center animate-in fade-in duration-200">
            {/* Elegant Clinic Spinner with Golden/Lilac Accents */}
            <div className="relative mb-6">
              <div className="h-16 w-16 rounded-full border-4 border-lilac-50 border-t-gold animate-spin"></div>
              <div className="absolute inset-0 flex items-center justify-center text-lilac-600">
                <svg className="w-6 h-6 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
            </div>
            <h3 className="text-xl font-bold text-ink mb-2">
              {activeStatus === "attended"
                ? "Preparando consulta..."
                : activeStatus === "no_show"
                ? "Registrando inasistencia..."
                : "Cancelando cita..."}
            </h3>
            <p className="text-sm text-ink/75 leading-relaxed">
              {activeStatus === "attended"
                ? "Estamos abriendo la ficha odontológica interactiva. Por favor, espera un momento."
                : activeStatus === "no_show"
                ? "Estamos actualizando el estado de la cita en la base de datos."
                : "Estamos cancelando la reserva y liberando el horario."}
            </p>
          </div>
        </div>
      )}

      <div>
        <label className="label flex items-center gap-2">
          <MessageSquare size={14} /> Notas internas
        </label>
        <textarea
          className="input min-h-[80px]"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Observaciones de la consulta..."
        />
      </div>

      <div className="flex flex-wrap gap-2 pt-3 border-t border-lilac-100">
        <button
          onClick={() => updateStatus("attended")}
          disabled={disabled}
          className="btn-secondary text-xs"
        >
          <CheckCircle2 size={14} /> {activeStatus === "attended" ? "Procesando..." : "Marcar atendida"}
        </button>
        <button
          onClick={() => updateStatus("no_show")}
          disabled={disabled}
          className="btn-ghost text-xs"
        >
          <AlertCircle size={14} /> {activeStatus === "no_show" ? "Procesando..." : "No asistió"}
        </button>
        {appointment.status !== "cancelled" && (
          <button onClick={() => setShowCancel(!showCancel)} disabled={disabled} className="btn-danger">
            <XCircle size={14} /> Cancelar
          </button>
        )}
      </div>

      {showCancel && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <label className="label text-red-900">Motivo de cancelación</label>
          <input
            className="input mb-2"
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
            placeholder="Ej: paciente avisó por teléfono"
          />
          <div className="flex justify-end gap-2">
            <button onClick={() => setShowCancel(false)} disabled={disabled} className="btn-ghost text-xs">
              Atrás
            </button>
            <button
              onClick={() =>
                updateStatus("cancelled", {
                  cancelled_at: new Date().toISOString(),
                  cancelled_by: "admin",
                  cancellation_reason: cancelReason || null,
                })
              }
              disabled={disabled}
              className="btn-danger"
            >
              {activeStatus === "cancelled" ? "Cancelando..." : "Confirmar cancelación"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
