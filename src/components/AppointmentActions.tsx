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
        router.push(`/admin/citas/${appointment.id}/atencion`);
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
      setActiveStatus(null);
    }
  }

  const disabled = loading || appointment.status === "cancelled";

  return (
    <div className="space-y-4">
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
