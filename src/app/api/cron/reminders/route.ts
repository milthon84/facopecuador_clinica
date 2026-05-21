import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendReminderEmail } from "@/lib/email";

/**
 * Endpoint a llamar diariamente (ej. 8 AM) por un cron job.
 * Envía recordatorio a citas que ocurren en las próximas 18-30 horas.
 * Protegido con CRON_SECRET.
 */
export async function GET(req: Request) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();

  const from = new Date(Date.now() + 18 * 60 * 60 * 1000).toISOString();
  const to = new Date(Date.now() + 30 * 60 * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from("appointments")
    .select("id, starts_at, reason, reminder_sent_at, patient:patients(full_name, email)")
    .eq("status", "scheduled")
    .is("reminder_sent_at", null)
    .gte("starts_at", from)
    .lte("starts_at", to);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  let sent = 0;
  for (const appt of data || []) {
    const patient = Array.isArray(appt.patient) ? appt.patient[0] : appt.patient;
    if (!patient?.email) continue;
    try {
      await sendReminderEmail({
        patientName: patient.full_name,
        patientEmail: patient.email,
        startsAt: appt.starts_at,
        reason: appt.reason,
        appointmentId: appt.id,
      });
      await supabase.from("appointments").update({ reminder_sent_at: new Date().toISOString() }).eq("id", appt.id);
      sent++;
    } catch (e) {
      console.error("reminder error", appt.id, e);
    }
  }

  return NextResponse.json({ sent, total: data?.length || 0 });
}
