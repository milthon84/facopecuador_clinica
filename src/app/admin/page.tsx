import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatTimeLocal } from "@/lib/availability";
import {
  Clock,
  User,
  CheckCircle2,
  XCircle,
  AlertCircle,
  FileText,
  CalendarCheck,
  TrendingUp,
} from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  const supabase = createAdminClient();

  const today = new Date();
  const startOfDay = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate()
  ).toISOString();
  const endOfDay = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
    23,
    59,
    59
  ).toISOString();

  const { data: todayAppts } = await supabase
    .from("appointments")
    .select(
      "id, starts_at, ends_at, status, reason, patient:patients(full_name, phone, document_number), dental_consultation:dental_consultations(id)"
    )
    .gte("starts_at", startOfDay)
    .lte("starts_at", endOfDay)
    .order("starts_at");

  // Próximos 7 días (sin incluir hoy)
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);
  const weekEnd = new Date(today);
  weekEnd.setDate(weekEnd.getDate() + 7);

  const { count: upcomingCount } = await supabase
    .from("appointments")
    .select("id", { count: "exact", head: true })
    .gte("starts_at", tomorrow.toISOString())
    .lte("starts_at", weekEnd.toISOString())
    .eq("status", "scheduled");

  const { count: patientsCount } = await supabase
    .from("patients")
    .select("id", { count: "exact", head: true });

  // Derivar stats
  const appts = todayAppts || [];
  const scheduled = appts.filter((a) => a.status === "scheduled");
  const attended = appts.filter((a) => a.status === "attended");
  const noShow = appts.filter((a) => a.status === "no_show");
  const cancelled = appts.filter((a) => a.status === "cancelled");
  const withFicha = appts.filter((a) => {
    const dc = Array.isArray(a.dental_consultation)
      ? a.dental_consultation
      : [a.dental_consultation];
    return dc.some((d) => d !== null && d !== undefined);
  });

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

  return (
    <div>
      {/* Encabezado */}
      <div className="flex items-start justify-between mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold mb-1">Hoy</h1>
          <p className="text-sm text-ink-600 capitalize">
            {today.toLocaleDateString("es-CO", {
              weekday: "long",
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </p>
        </div>

        {total > 0 && (
          <div className="shrink-0 text-right">
            <div className="text-xs text-ink-600 mb-1.5">
              {processed} de {total} procesadas
            </div>
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
      </div>

      {/* Stats por estado */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
        <StatCard
          label="Agendadas"
          value={scheduled.length}
          total={total}
          bg="bg-lilac-50"
          text="text-lilac-700"
          icon={<Clock size={14} />}
        />
        <StatCard
          label="Atendidas"
          value={attended.length}
          total={total}
          bg="bg-green-50"
          text="text-green-700"
          icon={<CheckCircle2 size={14} />}
        />
        <StatCard
          label="No asistió"
          value={noShow.length}
          total={total}
          bg="bg-amber-50"
          text="text-amber-700"
          icon={<AlertCircle size={14} />}
        />
        <StatCard
          label="Canceladas"
          value={cancelled.length}
          total={total}
          bg="bg-red-50"
          text="text-red-700"
          icon={<XCircle size={14} />}
        />
        <StatCard
          label="Con ficha"
          value={withFicha.length}
          total={attended.length}
          bg="bg-gold-50"
          text="text-gold-700"
          icon={<FileText size={14} />}
        />
      </div>

      {/* Stats secundarias */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="card p-4 flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-lilac-100 flex items-center justify-center shrink-0">
            <CalendarCheck size={16} className="text-lilac-600" />
          </div>
          <div>
            <div className="text-xs text-ink-600">Próximos 7 días</div>
            <div className="font-bold text-xl leading-tight">{upcomingCount ?? 0}</div>
          </div>
        </div>
        <div className="card p-4 flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-ink-800 flex items-center justify-center shrink-0">
            <User size={16} className="text-gold-400" />
          </div>
          <div>
            <div className="text-xs text-ink-600">Pacientes totales</div>
            <div className="font-bold text-xl leading-tight">{patientsCount ?? 0}</div>
          </div>
        </div>
      </div>

      {/* Lista de citas agrupada */}
      <div className="card overflow-hidden">
        <div className="px-5 py-4 border-b border-lilac-100 flex items-center justify-between">
          <h2 className="font-semibold">Citas de hoy</h2>
          <Link
            href="/admin/calendario"
            className="text-sm text-lilac-700 hover:underline"
          >
            Ver calendario →
          </Link>
        </div>

        {total === 0 ? (
          <div className="p-8 text-center text-sm text-ink-600">
            No hay citas programadas para hoy.
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
                          href={`/admin/citas/${appt.id}`}
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

// ── Componentes auxiliares ─────────────────────────────────────────────────

function StatCard({
  label,
  value,
  total,
  bg,
  text,
  icon,
}: {
  label: string;
  value: number;
  total: number;
  bg: string;
  text: string;
  icon: React.ReactNode;
}) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div className={`rounded-2xl p-4 ${bg}`}>
      <div className={`flex items-center gap-1.5 text-xs uppercase tracking-wide opacity-70 mb-2 ${text}`}>
        {icon}
        {label}
      </div>
      <div className={`text-3xl font-bold ${text}`}>{value}</div>
      {total > 0 && (
        <div className={`text-xs mt-1 opacity-60 ${text}`}>{pct}%</div>
      )}
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
