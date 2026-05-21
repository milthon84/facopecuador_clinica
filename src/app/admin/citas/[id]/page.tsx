import { createAdminClient } from "@/lib/supabase/admin";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Mail, Phone, IdCard, Calendar } from "lucide-react";
import AppointmentActions from "@/components/AppointmentActions";

export const dynamic = "force-dynamic";

export default async function CitaDetalle({ params }: { params: { id: string } }) {
  const supabase = createAdminClient();

  const { data: appt } = await supabase
    .from("appointments")
    .select("*, patient:patients(*)")
    .eq("id", params.id)
    .single();

  if (!appt) return notFound();
  const patient = Array.isArray(appt.patient) ? appt.patient[0] : appt.patient;

  const start = new Date(appt.starts_at);
  const end = new Date(appt.ends_at);

  // Historial del paciente
  const { data: history } = await supabase
    .from("appointments")
    .select("id, starts_at, status, reason")
    .eq("patient_id", patient.id)
    .neq("id", appt.id)
    .order("starts_at", { ascending: false })
    .limit(10);

  return (
    <div className="max-w-3xl">
      <Link href="/admin/calendario" className="inline-flex items-center gap-1 text-sm text-ink-600 hover:text-ink-900 mb-4">
        <ArrowLeft size={16} /> Volver
      </Link>

      <div className="card p-6 mb-5">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <h1 className="text-xl font-bold mb-1">{patient.full_name}</h1>
            <div className="text-sm text-ink-600 capitalize">
              {start.toLocaleDateString("es-CO", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
              {" · "}
              {start.toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" })}
              {" – "}
              {end.toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" })}
            </div>
          </div>
          <StatusBadge status={appt.status} />
        </div>

        <div className="grid sm:grid-cols-2 gap-3 mb-4">
          {patient.document_number && (
            <InfoRow icon={<IdCard size={14} />} label="Cédula" value={patient.document_number} />
          )}
          {patient.phone && <InfoRow icon={<Phone size={14} />} label="Teléfono" value={patient.phone} />}
          {patient.email && <InfoRow icon={<Mail size={14} />} label="Email" value={patient.email} />}
        </div>

        {appt.reason && (
          <div className="bg-lilac-50 rounded-lg p-3 mb-4">
            <div className="text-xs text-lilac-700 uppercase mb-1">Motivo</div>
            <div className="text-sm">{appt.reason}</div>
          </div>
        )}

        <AppointmentActions appointment={JSON.parse(JSON.stringify(appt))} />
      </div>

      {history && history.length > 0 && (
        <div className="card overflow-hidden">
          <div className="px-5 py-3 border-b border-lilac-100">
            <h2 className="font-semibold text-sm flex items-center gap-2">
              <Calendar size={14} /> Historial del paciente
            </h2>
          </div>
          <ul className="divide-y divide-lilac-50">
            {history.map((h) => (
              <li key={h.id} className="px-5 py-3 flex items-center justify-between text-sm">
                <Link href={`/admin/citas/${h.id}`} className="hover:text-lilac-700">
                  {new Date(h.starts_at).toLocaleDateString("es-CO", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                </Link>
                <StatusBadge status={h.status} />
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="text-ink-600">{icon}</span>
      <span className="text-ink-600">{label}:</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    scheduled: "bg-lilac-100 text-lilac-700",
    attended: "bg-green-100 text-green-700",
    no_show: "bg-amber-100 text-amber-700",
    cancelled: "bg-red-100 text-red-700",
  };
  const labels: Record<string, string> = {
    scheduled: "Agendada", attended: "Atendida", no_show: "No asistió", cancelled: "Cancelada",
  };
  return <span className={`px-2 py-1 rounded-full text-xs font-medium ${map[status] || map.scheduled}`}>{labels[status]}</span>;
}
