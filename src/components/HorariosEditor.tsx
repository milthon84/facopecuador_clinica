"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Plus, Trash2 } from "lucide-react";

interface Rule {
  id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  slot_duration_minutes: number;
  is_active: boolean;
}

const DAYS = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

export default function HorariosEditor({
  initialRules,
  canEdit = true,
}: {
  initialRules: Rule[];
  canEdit?: boolean;
}) {
  const router = useRouter();
  const [rules, setRules] = useState<Rule[]>(initialRules);
  const [loading, setLoading] = useState(false);

  async function addRule(day_of_week: number) {
    if (!canEdit) return;
    setLoading(true);
    const supabase = createClient();
    const { data, error } = await supabase
      .from("availability_rules")
      .insert({ day_of_week, start_time: "09:00", end_time: "12:00", slot_duration_minutes: 60, is_active: true })
      .select("*")
      .single();
    setLoading(false);
    if (error) return alert(error.message);
    setRules([...rules, data as Rule]);
    router.refresh();
  }

  async function updateRule(id: string, patch: Partial<Rule>) {
    if (!canEdit) return;
    const supabase = createClient();
    const { error } = await supabase.from("availability_rules").update(patch).eq("id", id);
    if (error) return alert(error.message);
    setRules(rules.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }

  async function deleteRule(id: string) {
    if (!canEdit) return;
    if (!confirm("¿Eliminar este bloque horario?")) return;
    const supabase = createClient();
    const { error } = await supabase.from("availability_rules").delete().eq("id", id);
    if (error) return alert(error.message);
    setRules(rules.filter((r) => r.id !== id));
    router.refresh();
  }

  return (
    <div className="space-y-3">
      {DAYS.map((dayName, dow) => {
        const dayRules = rules.filter((r) => r.day_of_week === dow);
        return (
          <div key={dow} className="card p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold">{dayName}</h3>
              {canEdit && (
                <button onClick={() => addRule(dow)} disabled={loading} className="btn-secondary text-xs">
                  {loading ? "Agregando..." : <><Plus size={12} /> Agregar</>}
                </button>
              )}
            </div>
            {dayRules.length === 0 ? (
              <div className="text-xs text-ink-600/60 italic">Cerrado</div>
            ) : (
              <div className="space-y-2">
                {dayRules.map((r) => (
                  <div key={r.id} className="flex items-center gap-2 flex-wrap">
                    <input
                      type="time"
                      value={r.start_time.slice(0, 5)}
                      onChange={(e) => updateRule(r.id, { start_time: e.target.value })}
                      disabled={!canEdit}
                      className="input py-2 px-2 w-28"
                    />
                    <span className="text-ink-600 text-sm">a</span>
                    <input
                      type="time"
                      value={r.end_time.slice(0, 5)}
                      onChange={(e) => updateRule(r.id, { end_time: e.target.value })}
                      disabled={!canEdit}
                      className="input py-2 px-2 w-28"
                    />
                    <select
                      value={r.slot_duration_minutes}
                      onChange={(e) => updateRule(r.id, { slot_duration_minutes: parseInt(e.target.value) })}
                      disabled={!canEdit}
                      className="input py-2 px-2 w-32 text-sm"
                    >
                      <option value={30}>30 min/cita</option>
                      <option value={45}>45 min/cita</option>
                      <option value={60}>60 min/cita</option>
                      <option value={90}>90 min/cita</option>
                    </select>
                    <label className="flex items-center gap-1 text-xs text-ink-600 ml-2">
                      <input
                        type="checkbox"
                        checked={r.is_active}
                        disabled={!canEdit}
                        onChange={(e) => updateRule(r.id, { is_active: e.target.checked })}
                      />
                      Activo
                    </label>
                    {canEdit && (
                      <button onClick={() => deleteRule(r.id)} className="ml-auto text-red-600 hover:text-red-700 p-2">
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
