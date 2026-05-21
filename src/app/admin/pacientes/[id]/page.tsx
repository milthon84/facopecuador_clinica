import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { notFound } from "next/navigation";
import { ArrowLeft, Mail, Phone, IdCard } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function PacienteDetalle({ params }: { params: { id: string } }) {
  const supabase = createAdminClient();
  const { data: patient } = await supabase
    .from("patients")
    .select("*")
    .eq("id", params.id)
    .single();
  if (!patient) return notFound();

  const { data: appts } = await supabase
    .from("appointments")
    .select("id, starts_at, status, reason")
    .eq("patient_id", patient.id)
    .order("starts_at", { ascending: false });

  return (
    <div className="max-w-3xl">
      <Link href="/admin/pacientes" className="inline-flex items-center gap-1 text-sm text-ink-600 hover:text-ink-900 mb-4">
        <ArrowLeft size={16} /> Volver a pacientes
      </Link>

      <div className="card p-6 mb-5">
        <h1 className="text-xl font-bold mb-4">{patient.full_name}</h1>
        <div className="grid sm:grid-cols-2 gap-3 mb-4 text-sm">
          {patient.document_number && (
            <div className="flex items-center gap-2"><IdCard size={14} className="text-ink-600" /> {patient.document_number}</div>
          )}
          <div className="flex items-center gap-2"><Phone size={14} className="text-ink-600" /> {patient.phone}</div>
          <div className="flex items-center gap-2"><Mail size={14} className="text-ink-600" /> {patient.email}</div>
        </div>
        {patient.notes && (
          <div className="bg-lilac-50 rounded-lg p-3 text-sm">
            <div className="text-xs uppercase text-lilac-700 mb-1">Notas</div>
            {patient.notes}
          </div>
        )}
      </div>

      <div className="card overflow-hidden">
        <div className="px-5 py-3 border-b border-lilac-100">
          <h2 className="font-semibold text-sm">Historial ({appts?.length || 0})</h2>
        </div>
        {!appts || appts.length === 0 ? (
          <div className="p-6 text-center text-sm text-ink-600">Sin citas registradas.</div>
        ) : (
          <ul className="divide-y divide-lilac-50">
            {appts.map((a) => (
              <li key={a.id} className="px-5 py-3">
                <Link href={`/admin/citas/${a.id}`} className="text-sm hover:text-lilac-700 font-medium">
                  {new Date(a.starts_at).toLocaleString("es-CO", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                </Link>
                {a.reason && <div className="text-xs text-ink-600 mt-0.5 truncate">{a.reason}</div>}
                <div className="text-xs text-ink-600/70 capitalize">{a.status}</div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
