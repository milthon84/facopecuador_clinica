"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Plus, Trash2, Ban, CalendarPlus } from "lucide-react";

interface Exception {
  id: string;
  date: string;
  type: "block" | "extra";
  start_time: string | null;
  end_time: string | null;
  reason: string | null;
}

export default function BloqueosEditor({
  initialExceptions,
  canEdit = true,
}: {
  initialExceptions: Exception[];
  canEdit?: boolean;
}) {
  const router = useRouter();
  const [items, setItems] = useState<Exception[]>(initialExceptions);
  const [showForm, setShowForm] = useState(false);

  const [type, setType] = useState<"block" | "extra">("block");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [fullDay, setFullDay] = useState(true);
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("12:00");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);

  async function addException() {
    if (!canEdit) return;
    if (type === "extra" && (!startTime || !endTime)) return alert("Indicá hora de inicio y fin");
    setLoading(true);
    const supabase = createClient();
    const payload: any = {
      date,
      type,
      start_time: type === "block" && fullDay ? null : startTime,
      end_time: type === "block" && fullDay ? null : endTime,
      reason: reason || null,
    };
    const { data, error } = await supabase.from("availability_exceptions").insert(payload).select("*").single();
    setLoading(false);
    if (error) return alert(error.message);
    setItems([...items, data as Exception].sort((a, b) => a.date.localeCompare(b.date)));
    setShowForm(false);
    setReason("");
    router.refresh();
  }

  async function deleteException(id: string) {
    if (!canEdit) return;
    if (!confirm("¿Eliminar este bloqueo / excepción?")) return;
    const supabase = createClient();
    const { error } = await supabase.from("availability_exceptions").delete().eq("id", id);
    if (error) return alert(error.message);
    setItems(items.filter((i) => i.id !== id));
    router.refresh();
  }

  return (
    <div>
      {canEdit && (
        <div className="mb-4">
          {!showForm ? (
            <button onClick={() => setShowForm(true)} className="btn-primary">
              <Plus size={16} /> Agregar bloqueo o horario extra
            </button>
          ) : (
            <div className="card p-4 space-y-3">
              <div className="flex gap-2">
                <button
                  onClick={() => setType("block")}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium ${type === "block" ? "bg-red-100 text-red-700" : "bg-lilac-50 text-ink-600"}`}
                >
                  <Ban size={14} className="inline mr-1" /> Bloquear
                </button>
                <button
                  onClick={() => setType("extra")}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium ${type === "extra" ? "bg-gold-100 text-gold-700" : "bg-lilac-50 text-ink-600"}`}
                >
                  <CalendarPlus size={14} className="inline mr-1" /> Horario extra
                </button>
              </div>

              <div>
                <label className="label">Fecha</label>
                <input type="date" className="input" value={date} onChange={(e) => setDate(e.target.value)} />
              </div>

              {type === "block" && (
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={fullDay} onChange={(e) => setFullDay(e.target.checked)} />
                  Bloquear el día completo
                </label>
              )}

              {(type === "extra" || !fullDay) && (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="label">Desde</label>
                    <input type="time" className="input" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
                  </div>
                  <div>
                    <label className="label">Hasta</label>
                    <input type="time" className="input" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
                  </div>
                </div>
              )}

              <div>
                <label className="label">Motivo (opcional)</label>
                <input className="input" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Vacaciones, feriado, congreso…" />
              </div>

              <div className="flex justify-end gap-2">
                <button onClick={() => setShowForm(false)} className="btn-ghost text-xs">Cancelar</button>
                <button onClick={addException} disabled={loading} className="btn-primary text-xs px-3 py-2">
                  {loading ? "Guardando..." : "Guardar"}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {items.length === 0 ? (
        <div className="card p-6 text-center text-sm text-ink-600">No hay bloqueos próximos.</div>
      ) : (
        <ul className="space-y-2">
          {items.map((ex) => (
            <li key={ex.id} className="card p-3 flex items-center justify-between gap-2">
              <div>
                <div className="flex items-center gap-2 mb-0.5">
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      ex.type === "block" ? "bg-red-100 text-red-700" : "bg-gold-100 text-gold-700"
                    }`}
                  >
                    {ex.type === "block" ? "Bloqueado" : "Horario extra"}
                  </span>
                  <span className="font-medium text-sm">
                    {new Date(ex.date + "T00:00:00").toLocaleDateString("es-CO", { day: "2-digit", month: "long", year: "numeric" })}
                  </span>
                </div>
                <div className="text-xs text-ink-600">
                  {ex.start_time && ex.end_time
                    ? `${ex.start_time.slice(0, 5)} – ${ex.end_time.slice(0, 5)}`
                    : "Día completo"}
                  {ex.reason && ` · ${ex.reason}`}
                </div>
              </div>
              {canEdit && (
                <button onClick={() => deleteException(ex.id)} className="text-red-600 hover:text-red-700 p-2">
                  <Trash2 size={14} />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
