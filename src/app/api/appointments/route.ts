import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendConfirmationEmail, sendAdminNotification } from "@/lib/email";

const schema = z.object({
  patient: z.object({
    document_number: z.string().min(3),
    full_name: z.string().min(3),
    phone: z.string().min(7),
    email: z.string().email(),
  }),
  starts_at: z.string(),
  ends_at: z.string(),
  reason: z.string().nullable().optional(),
});

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body inválido" }, { status: 400 });
  }

  const parse = schema.safeParse(body);
  if (!parse.success) {
    return NextResponse.json({ error: "Datos inválidos", issues: parse.error.issues }, { status: 400 });
  }
  const { patient, starts_at, ends_at, reason } = parse.data;

  const startsDate = new Date(starts_at);
  if (isNaN(startsDate.getTime()) || startsDate.getTime() < Date.now()) {
    return NextResponse.json({ error: "Horario inválido o pasado" }, { status: 400 });
  }

  const supabase = createAdminClient();

  // 1) Verificar que el slot sigue disponible
  const { data: existing } = await supabase
    .from("appointments")
    .select("id")
    .eq("starts_at", starts_at)
    .neq("status", "cancelled")
    .maybeSingle();
  if (existing) {
    return NextResponse.json({ error: "Ese horario ya fue tomado" }, { status: 409 });
  }

  // 2) Upsert del paciente (por cédula o email)
  const emailLower = patient.email.toLowerCase();
  const { data: existingPatient } = await supabase
    .from("patients")
    .select("id")
    .or(`document_number.eq.${patient.document_number},email.eq.${emailLower}`)
    .maybeSingle();

  let patientId: string;
  if (existingPatient) {
    const { error: updErr } = await supabase
      .from("patients")
      .update({
        full_name: patient.full_name,
        phone: patient.phone,
        email: emailLower,
        document_number: patient.document_number,
      })
      .eq("id", existingPatient.id);
    if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 });
    patientId = existingPatient.id;
  } else {
    const { data: newPatient, error: insErr } = await supabase
      .from("patients")
      .insert({
        full_name: patient.full_name,
        phone: patient.phone,
        email: emailLower,
        document_number: patient.document_number,
      })
      .select("id")
      .single();
    if (insErr || !newPatient) return NextResponse.json({ error: insErr?.message || "Error" }, { status: 500 });
    patientId = newPatient.id;
  }

  // 3) Crear la cita
  const { data: appt, error: apptErr } = await supabase
    .from("appointments")
    .insert({
      patient_id: patientId,
      starts_at,
      ends_at,
      reason: reason || null,
      status: "scheduled",
    })
    .select("id")
    .single();

  if (apptErr || !appt) {
    if (apptErr?.code === "23505") {
      return NextResponse.json({ error: "Ese horario ya fue tomado" }, { status: 409 });
    }
    return NextResponse.json({ error: apptErr?.message || "Error al crear" }, { status: 500 });
  }

  // 4) Enviar emails (no bloqueamos la respuesta si fallan)
  try {
    await Promise.all([
      sendConfirmationEmail({
        patientName: patient.full_name,
        patientEmail: emailLower,
        startsAt: starts_at,
        reason,
        appointmentId: appt.id,
      }),
      sendAdminNotification({
        patientName: patient.full_name,
        patientEmail: emailLower,
        startsAt: starts_at,
        reason,
        appointmentId: appt.id,
        phone: patient.phone,
        document: patient.document_number,
      }),
    ]);
  } catch (e) {
    console.error("Email error:", e);
  }

  return NextResponse.json({ appointment_id: appt.id });
}
