import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatTimeLocal } from "@/lib/availability";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";

export const dynamic = "force-dynamic";

interface SearchParams { week?: string }

export default async function CalendarioPage({ searchParams }: { searchParams: SearchParams }) {
  const supabase = createAdminClient();

  // Parsear semana base
  let baseDate: Date;
  if (searchParams.week && searchParams.week.includes("-")) {
    const parts = searchParams.week.split("-");
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    baseDate = new Date(year, month, day);
  } else {
    baseDate = new Date();
  }
  const monday = mondayOf(baseDate);
  const sunday = new Date(monday);
  sunday.setDate(sunday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);

  const { data: appts } = await supabase
    .from("appointments")
    .select("id, starts_at, status, patient:patients(full_name), dental_consultation:dental_consultations(id)")
    .gte("starts_at", monday.toISOString())
    .lte("starts_at", sunday.toISOString())
    .order("starts_at");

  // Agrupar por día
  const byDay: Record<string, typeof appts> = {};
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(d.getDate() + i);
    byDay[d.toDateString()] = [] as any;
  }
  for (const a of appts || []) {
    const key = new Date(a.starts_at).toDateString();
    if (byDay[key]) (byDay[key] as any).push(a);
  }

  const prevWeek = new Date(monday); prevWeek.setDate(prevWeek.getDate() - 7);
  const nextWeek = new Date(monday); nextWeek.setDate(nextWeek.getDate() + 7);

  const prevWeekStr = formatLocalDate(prevWeek);
  const nextWeekStr = formatLocalDate(nextWeek);

  return (
    <div>
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <h1 className="text-2xl font-bold">Calendario semanal</h1>
        <div className="flex gap-2">
          <Link href={`/admin/calendario?week=${prevWeekStr}`} className="btn-ghost px-3 py-2">
            <ChevronLeft size={16} />
          </Link>
          <Link href="/admin/calendario" className="btn-ghost">Hoy</Link>
          <Link href={`/admin/calendario?week=${nextWeekStr}`} className="btn-ghost px-3 py-2">
            <ChevronRight size={16} />
          </Link>
        </div>
      </div>

      <div className="text-sm text-ink-600 mb-4">
        Semana del {monday.toLocaleDateString("es-CO", { day: "numeric", month: "long" })} al{" "}
        {sunday.toLocaleDateString("es-CO", { day: "numeric", month: "long", year: "numeric" })}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-7 gap-3">
        {Object.entries(byDay).map(([key, list]) => {
          const d = new Date(key);
          const isToday = d.toDateString() === new Date().toDateString();
          return (
            <div key={key} className={`card p-3 ${isToday ? "ring-2 ring-gold-500" : ""}`}>
              <div className="mb-2">
                <div className="text-xs text-ink-600 uppercase">
                  {d.toLocaleDateString("es-CO", { weekday: "short" })}
                </div>
                <div className="font-bold text-lg">{d.getDate()}</div>
              </div>
              {(!list || list.length === 0) ? (
                <div className="text-xs text-ink-600/60 italic">Sin citas</div>
              ) : (
                <ul className="space-y-1.5">
                  {(list as any[]).map((a) => {
                    const t = new Date(a.starts_at);
                    const time = formatTimeLocal(t);
                    const p = Array.isArray(a.patient) ? a.patient[0] : a.patient;
                    const hasConsultation = Array.isArray(a.dental_consultation)
                      ? a.dental_consultation.length > 0
                      : !!a.dental_consultation;
                    const color =
                      a.status === "cancelled" ? "bg-red-50 text-red-700 line-through" :
                      a.status === "attended" ? "bg-green-50 text-green-700" :
                      a.status === "no_show" ? "bg-amber-50 text-amber-700" :
                      "bg-lilac-50 text-lilac-800";
                    return (
                      <li key={a.id}>
                        <Link href={`/admin/citas/${a.id}`} className={`block rounded-lg px-2 py-1.5 text-xs ${color} hover:opacity-80 transition-all`}>
                          <div className="flex items-center justify-between gap-1 font-semibold">
                            <span>{time}</span>
                            {hasConsultation && (
                              <span className="text-[10px] text-gold-600 font-bold bg-gold-50 px-1 rounded-sm border border-gold-200" title="Ficha Clínica Completada y Enviada">
                                📄✓
                              </span>
                            )}
                          </div>
                          <div className="truncate">{p?.full_name}</div>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function mondayOf(d: Date): Date {
  const date = new Date(d);
  const day = date.getDay();
  const diff = (day === 0 ? -6 : 1 - day);
  date.setDate(date.getDate() + diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

function formatLocalDate(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
