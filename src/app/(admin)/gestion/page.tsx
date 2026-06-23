import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatTimeLocal } from "@/lib/availability";
import {
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  FileText,
  ChevronLeft,
  ChevronRight,
  Plus,
} from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AdminDashboard({
  searchParams: searchParamsPromise,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const searchParams = await searchParamsPromise;
  const supabase = createAdminClient();

  // Determinar la fecha objetivo
  const targetDateParam = searchParams?.date;
  let targetDate = new Date();
  
  if (targetDateParam) {
    const parsed = new Date(targetDateParam + "T12:00:00");
    if (!isNaN(parsed.getTime())) {
      targetDate = parsed;
    }
  }

  const startOfDay = new Date(
    targetDate.getFullYear(),
    targetDate.getMonth(),
    targetDate.getDate()
  ).toISOString();
  const endOfDay = new Date(
    targetDate.getFullYear(),
    targetDate.getMonth(),
    targetDate.getDate(),
    23,
    59,
    59
  ).toISOString();

  // Fechas de navegación
  const prevDate = new Date(targetDate);
  prevDate.setDate(prevDate.getDate() - 1);
  const nextDate = new Date(targetDate);
  nextDate.setDate(nextDate.getDate() + 1);

  const prevDateStr = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}-${String(prevDate.getDate()).padStart(2, '0')}`;
  const nextDateStr = `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, '0')}-${String(nextDate.getDate()).padStart(2, '0')}`;
  
  const now = new Date();
  const isTargetToday = now.toDateString() === targetDate.toDateString();
  const displayTitle = isTargetToday ? "Hoy" : targetDate.toLocaleDateString("es-CO", {
    weekday: "long",
  });

  const todayRes = await supabase
    .from("appointments")
    .select(
      "id, starts_at, ends_at, status, reason, patient:patients(full_name, phone, document_number), dental_consultation:dental_consultations(id)"
    )
    .gte("starts_at", startOfDay)
    .lte("starts_at", endOfDay)
    .order("starts_at");

  const todayAppts = todayRes.data;

  // Derivar stats
  const appts = todayAppts || [];
  const scheduled = appts.filter((a) => a.status === "scheduled");
  const attended = appts.filter((a) => a.status === "attended");
  const noShow = appts.filter((a) => a.status === "no_show");
  const cancelled = appts.filter((a) => a.status === "cancelled");
  const total = appts.length;
  const processed = attended.length + noShow.length + cancelled.length;
  const processPct = total > 0 ? Math.round((processed / total) * 100) : 0;

  // Grupos para la lista (solo los que tienen citas)
  const groups = [
    {
      key: "scheduled",
      label: "Pendientes",
      items: scheduled,
      dotColor: "bg-lilac-400",
      headerColor: "bg-lilac-50 text-lilac-700",
    },
    {
      key: "attended",
      label: "Atendidas",
      items: attended,
      dotColor: "bg-green-400",
      headerColor: "bg-green-50 text-green-700",
    },
    {
      key: "no_show",
      label: "No asistieron",
      items: noShow,
      dotColor: "bg-amber-400",
      headerColor: "bg-amber-50 text-amber-700",
    },
    {
      key: "cancelled",
      label: "Canceladas",
      items: cancelled,
      dotColor: "bg-red-400",
      headerColor: "bg-red-50 text-red-700",
    },
  ].filter((g) => g.items.length > 0);

  const targetDateStr = `${targetDate.getFullYear()}-${String(targetDate.getMonth() + 1).padStart(2, '0')}-${String(targetDate.getDate()).padStart(2, '0')}`;

  return (
    <div>
      {/* Encabezado */}
      <div className="flex items-start justify-between mb-6 gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-bold capitalize">{displayTitle}</h1>
            <div className="flex items-center bg-white border border-lilac-100 rounded-lg overflow-hidden shadow-sm">
              <Link
                href={`/gestion?date=${prevDateStr}`}
                className="p-1.5 hover:bg-lilac-50 text-ink-600 transition"
                title="Día anterior"
              >
                <ChevronLeft size={20} />
              </Link>
              {!isTargetToday && (
                <Link
                  href="/gestion"
                  className="px-3 py-1.5 text-xs font-medium text-lilac-700 hover:bg-lilac-50 border-x border-lilac-100 transition"
                >
                  Hoy
                </Link>
              )}
              <Link
                href={`/gestion?date=${nextDateStr}`}
                className="p-1.5 hover:bg-lilac-50 text-ink-600 transition"
                title="Día siguiente"
              >
                <ChevronRight size={20} />
              </Link>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4 shrink-0">
          {total > 0 && (
            <div className="shrink-0 text-right hidden sm:block">
              <div className="w-36 bg-lilac-100 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-lilac-500 h-2 rounded-full"
                  style={{ width: `${processPct}%` }}
                />
              </div>
              <div className="text-xs font-medium text-lilac-700 mt-1">
                {processPct}% del día completado
              </div>
            </div>
          )}
          <Link
            href={`/gestion/citas/nueva?date=${targetDateStr}`}
            className="flex items-center gap-1.5 bg-lilac-600 text-white text-xs sm:text-sm px-3.5 py-2 rounded-xl hover:bg-lilac-700 transition font-medium shadow-sm"
          >
            <Plus size={15} /> Nueva Cita
          </Link>
        </div>
      </div>

      {/* Stats compactas */}
      <div className="grid grid-cols-4 gap-2 mb-4">
        {[
          { label: "Agendadas",  short: "Agendadas",  value: scheduled.length, bg: "bg-lilac-50", text: "text-lilac-600", icon: <Clock size={11} /> },
          { label: "Atendidas",  short: "Atendidas",  value: attended.length,  bg: "bg-green-50",  text: "text-green-600",  icon: <CheckCircle2 size={11} /> },
          { label: "No asistió", short: "No asistió", value: noShow.length,    bg: "bg-amber-50",  text: "text-amber-600",  icon: <AlertCircle size={11} /> },
          { label: "Canceladas", short: "Canceladas", value: cancelled.length, bg: "bg-red-50",    text: "text-red-600",    icon: <XCircle size={11} /> },
        ].map(({ label, short, value, bg, text, icon }) => (
          <div key={label} className={`rounded-xl p-3 ${bg}`}>
            <div className={`flex items-center gap-1 text-[10px] uppercase tracking-wide mb-1.5 opacity-70 ${text} truncate`}>
              {icon}
              <span className="truncate">{short}</span>
            </div>
            <div className={`text-2xl font-bold leading-none ${text}`}>{value}</div>
          </div>
        ))}
      </div>

      {/* Lista de citas agrupada */}
      <div className="card overflow-hidden">
        <div className="px-5 py-4 border-b border-lilac-100 flex items-center justify-between">
          <h2 className="font-semibold">
            {isTargetToday ? "Citas de hoy" : `Citas del ${targetDate.toLocaleDateString("es-CO", { day: "numeric", month: "long" })}`}
          </h2>
          <Link
            href="/gestion/calendario"
            className="text-sm text-lilac-700 hover:underline"
          >
            Ver calendario →
          </Link>
        </div>

        {total === 0 ? (
          <div className="p-8 text-center text-sm text-ink-600">
            {isTargetToday ? "No hay citas programadas para hoy." : "No hay citas programadas para este día."}
          </div>
        ) : (
          <div>
            {groups.map((group) => (
              <div key={group.key}>
                {/* Encabezado de grupo */}
                <div
                  className={`px-5 py-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide border-b border-lilac-50 ${group.headerColor}`}
                >
                  <span
                    className={`inline-block w-2 h-2 rounded-full ${group.dotColor}`}
                  />
                  {group.label}
                  <span className="ml-auto font-bold">{group.items.length}</span>
                </div>

                <ul className="divide-y divide-lilac-50">
                  {group.items.map((appt) => {
                    const p = Array.isArray(appt.patient)
                      ? appt.patient[0]
                      : appt.patient;
                    const dt = new Date(appt.starts_at);
                    const hasFicha = Array.isArray(appt.dental_consultation)
                      ? appt.dental_consultation.length > 0
                      : !!appt.dental_consultation;

                    return (
                      <li key={appt.id}>
                        <Link
                          href={`/gestion/citas/${appt.id}`}
                          className="flex items-center gap-4 px-5 py-3.5 hover:bg-lilac-50 transition"
                        >
                          {/* Hora */}
                          <div className="w-12 shrink-0 text-center">
                            <div className="font-bold text-sm leading-tight">
                              {formatTimeLocal(dt)}
                            </div>
                          </div>

                          {/* Info paciente */}
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-sm truncate">
                              {p?.full_name}
                            </div>
                            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                              {p?.phone && (
                                <span className="text-xs text-ink-600">
                                  {p.phone}
                                </span>
                              )}
                              {(p as any)?.document_number && (
                                <span className="text-xs text-ink-600 opacity-60">
                                  CC {(p as any).document_number}
                                </span>
                              )}
                            </div>
                            {appt.reason && (
                              <div className="text-xs text-ink-600 mt-0.5 line-clamp-1 italic">
                                {appt.reason}
                              </div>
                            )}
                          </div>

                          {/* Badges */}
                          <div className="shrink-0 flex flex-col items-end gap-1.5">
                            <StatusBadge status={appt.status} />
                            {hasFicha && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-gold-50 text-gold-700 border border-gold-200">
                                <FileText size={10} />
                                Ficha completa
                              </span>
                            )}
                          </div>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<
    string,
    { label: string; cls: string; icon: React.ReactNode }
  > = {
    scheduled: {
      label: "Agendada",
      cls: "bg-lilac-100 text-lilac-700",
      icon: <Clock size={11} />,
    },
    attended: {
      label: "Atendida",
      cls: "bg-green-100 text-green-700",
      icon: <CheckCircle2 size={11} />,
    },
    no_show: {
      label: "No asistió",
      cls: "bg-amber-100 text-amber-700",
      icon: <AlertCircle size={11} />,
    },
    cancelled: {
      label: "Cancelada",
      cls: "bg-red-100 text-red-700",
      icon: <XCircle size={11} />,
    },
  };
  const cfg = map[status] ?? map.scheduled;
  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${cfg.cls}`}
    >
      {cfg.icon}
      {cfg.label}
    </span>
  );
}
