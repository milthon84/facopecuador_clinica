import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { Clock, User, CheckCircle2, XCircle, AlertCircle } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  const supabase = createAdminClient();

  const today = new Date();
  const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();
  const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59).toISOString();

  const { data: todayAppts } = await supabase
    .from("appointments")
    .select("id, starts_at, ends_at, status, reason, patient:patients(full_name, phone)")
    .gte("starts_at", startOfDay)
    .lte("starts_at", endOfDay)
    .order("starts_at");

  // Próximas 7 días (incluyendo hoy)
  const weekEnd = new Date(today);
  weekEnd.setDate(weekEnd.getDate() + 7);
  const { count: upcomingCount } = await supabase
    .from("appointments")
    .select("id", { count: "exact", head: true })
    .gte("starts_at", today.toISOString())
    .lte("starts_at", weekEnd.toISOString())
    .eq("status", "scheduled");

  const { count: patientsCount } = await supabase
    .from("patients")
    .select("id", { count: "exact", head: true });

  return (
    <div>
      <h1 className="text-2xl font-bold mb-1">Hoy</h1>
      <p className="text-sm text-ink-600 mb-6 capitalize">
        {today.toLocaleDateString("es-CO", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
      </p>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
        <Stat label="Citas hoy" value={todayAppts?.length || 0} color="gold" />
        <Stat label="Próximos 7 días" value={upcomingCount || 0} color="lilac" />
        <Stat label="Pacientes registrados" value={patientsCount || 0} color="ink" />
      </div>

      <div className="card overflow-hidden">
        <div className="px-5 py-4 border-b border-lilac-100 flex items-center justify-between">
          <h2 className="font-semibold">Citas de hoy</h2>
          <Link href="/admin/calendario" className="text-sm text-lilac-700 hover:underline">
            Ver calendario completo →
          </Link>
        </div>

        {(!todayAppts || todayAppts.length === 0) ? (
          <div className="p-6 text-center text-sm text-ink-600">No hay citas para hoy.</div>
        ) : (
          <ul className="divide-y divide-lilac-50">
            {todayAppts.map((appt) => {
              const p = Array.isArray(appt.patient) ? appt.patient[0] : appt.patient;
              const dt = new Date(appt.starts_at);
              return (
                <li key={appt.id}>
                  <Link href={`/admin/citas/${appt.id}`} className="block px-5 py-4 hover:bg-lilac-50 transition">
                    <div className="flex items-start gap-4">
                      <div className="text-center">
                        <div className="text-xs text-ink-600 uppercase">Hora</div>
                        <div className="font-bold text-lg">
                          {dt.toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" })}
                        </div>
                      </div>
                      <div className="flex-1">
                        <div className="font-medium">{p?.full_name}</div>
                        <div className="text-xs text-ink-600">{p?.phone}</div>
                        {appt.reason && <div className="text-xs text-ink-600 mt-1 line-clamp-1">{appt.reason}</div>}
                      </div>
                      <StatusBadge status={appt.status} />
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: number; color: "gold" | "lilac" | "ink" }) {
  const cls = color === "gold" ? "bg-gold-50 text-gold-700" : color === "lilac" ? "bg-lilac-100 text-lilac-700" : "bg-ink-900 text-gold-500";
  return (
    <div className={`rounded-2xl p-4 ${cls}`}>
      <div className="text-xs uppercase tracking-wide opacity-70">{label}</div>
      <div className="text-3xl font-bold mt-1">{value}</div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string; icon: any }> = {
    scheduled: { label: "Agendada", cls: "bg-lilac-100 text-lilac-700", icon: Clock },
    attended: { label: "Atendida", cls: "bg-green-100 text-green-700", icon: CheckCircle2 },
    no_show: { label: "No asistió", cls: "bg-amber-100 text-amber-700", icon: AlertCircle },
    cancelled: { label: "Cancelada", cls: "bg-red-100 text-red-700", icon: XCircle },
  };
  const cfg = map[status] || map.scheduled;
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${cfg.cls}`}>
      <Icon size={12} /> {cfg.label}
    </span>
  );
}
