"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { CheckCircle2, XCircle, AlertCircle, MessageSquare, Save } from "lucide-react";

interface Props { appointment: any }

export default function AppointmentActions({ appointment }: Props) {
  const router = useRouter();
  const [notes, setNotes] = useState(appointment.admin_notes || "");
  const [cancelReason, setCancelReason] = useState("");
  const [showCancel, setShowCancel] = useState(false);
  const [loading, setLoading] = useState(false);

  async function updateStatus(status: string, extra: Record<string, any> = {}) {
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase
      .from("appointments")
      .update({ status, ...extra })
      .eq("id", appointment.id);
    setLoading(false);
    if (error) {
      alert(error.message);
      return;
    }
    router.refresh();
  }

  async function saveNotes() {
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase
      .from("appointments")
      .update({ admin_notes: notes })
      .eq("id", appointment.id);
    setLoading(false);
    if (error) alert(error.message);
    else router.refresh();
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
          placeholder="Observaciones de la consulta…"
        />
        <div className="mt-2 flex justify-end">
          <button onClick={saveNotes} disabled={loading} className="btn-secondary text-xs px-3 py-1.5">
            <Save size={12} /> Guardar notas
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 pt-3 border-t border-lilac-100">
        <button onClick={() => updateStatus("attended")} disabled={disabled} className="btn-secondary text-xs">
          <CheckCircle2 size={14} /> Marcar atendida
        </button>
        <button onClick={() => updateStatus("no_show")} disabled={disabled} className="btn-ghost text-xs">
          <AlertCircle size={14} /> No asistió
        </button>
        {appointment.status !== "cancelled" && (
          <button onClick={() => setShowCancel(!showCancel)} className="btn-danger">
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
            <button onClick={() => setShowCancel(false)} className="btn-ghost text-xs">Atrás</button>
            <button
              onClick={() => updateStatus("cancelled", { cancelled_at: new Date().toISOString(), cancelled_by: "admin", cancellation_reason: cancelReason || null })}
              className="btn-danger"
            >
              Confirmar cancelación
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
