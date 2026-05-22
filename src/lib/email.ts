import { Resend } from "resend";

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

const FROM = process.env.RESEND_FROM_EMAIL || "Consultorio <onboarding@resend.dev>";
const CLINIC = process.env.NEXT_PUBLIC_CLINIC_NAME || "Consultorio";
const ADDRESS = process.env.NEXT_PUBLIC_CLINIC_ADDRESS || "";
const PHONE = process.env.NEXT_PUBLIC_CLINIC_PHONE || "";

function formatES(date: Date): string {
  return date.toLocaleString("es-CO", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function baseHtml(title: string, body: string): string {
  return `
<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>${title}</title></head>
<body style="font-family: -apple-system, Segoe UI, Roboto, sans-serif; background:#f5f1fb; padding:24px; color:#0f0f0f;">
  <div style="max-width:560px; margin:0 auto; background:#ffffff; border-radius:16px; overflow:hidden; box-shadow:0 4px 12px rgba(0,0,0,0.06);">
    <div style="background:#0f0f0f; padding:24px; text-align:center;">
      <h1 style="margin:0; color:#C9A961; font-size:22px; font-weight:600; letter-spacing:0.5px;">${CLINIC}</h1>
    </div>
    <div style="padding:32px 28px;">
      ${body}
    </div>
    <div style="background:#f5f1fb; padding:16px; text-align:center; font-size:12px; color:#604390;">
      ${ADDRESS ? `<div>${ADDRESS}</div>` : ""}
      ${PHONE ? `<div>${PHONE}</div>` : ""}
    </div>
  </div>
</body></html>`;
}

interface ApptEmailData {
  patientName: string;
  patientEmail: string;
  startsAt: string;
  reason?: string | null;
  appointmentId: string;
}

export async function sendConfirmationEmail(d: ApptEmailData) {
  if (!resend) return;
  const dt = formatES(new Date(d.startsAt));
  const body = `
    <h2 style="color:#7E5DB4; margin:0 0 12px;">¡Cita confirmada!</h2>
    <p style="font-size:15px; line-height:1.6;">Hola <strong>${d.patientName}</strong>,</p>
    <p style="font-size:15px; line-height:1.6;">Tu cita en <strong>${CLINIC}</strong> ha sido confirmada.</p>
    <div style="background:#fbf7ee; border-left:4px solid #C9A961; padding:16px; margin:20px 0; border-radius:6px;">
      <div style="font-size:14px; color:#604390; margin-bottom:4px;">FECHA Y HORA</div>
      <div style="font-size:17px; font-weight:600;">${dt}</div>
    </div>
    ${d.reason ? `<p style="font-size:14px; color:#3D3D3D;"><strong>Motivo:</strong> ${d.reason}</p>` : ""}
    <p style="font-size:13px; color:#604390; margin-top:24px;">Si necesitás cancelar o reprogramar, contactanos al menos 24 horas antes de la cita.</p>
  `;
  await resend.emails.send({
    from: FROM,
    to: d.patientEmail,
    subject: `Cita confirmada – ${dt}`,
    html: baseHtml("Cita confirmada", body),
  });
}

export async function sendReminderEmail(d: ApptEmailData) {
  if (!resend) return;
  const dt = formatES(new Date(d.startsAt));
  const body = `
    <h2 style="color:#7E5DB4; margin:0 0 12px;">Recordatorio de tu cita</h2>
    <p style="font-size:15px; line-height:1.6;">Hola <strong>${d.patientName}</strong>,</p>
    <p style="font-size:15px; line-height:1.6;">Te recordamos que mañana tenés tu cita en <strong>${CLINIC}</strong>.</p>
    <div style="background:#fbf7ee; border-left:4px solid #C9A961; padding:16px; margin:20px 0; border-radius:6px;">
      <div style="font-size:14px; color:#604390; margin-bottom:4px;">FECHA Y HORA</div>
      <div style="font-size:17px; font-weight:600;">${dt}</div>
    </div>
    <p style="font-size:13px; color:#604390;">¡Te esperamos!</p>
  `;
  await resend.emails.send({
    from: FROM,
    to: d.patientEmail,
    subject: `Recordatorio: cita mañana ${dt}`,
    html: baseHtml("Recordatorio", body),
  });
}

export async function sendCancellationEmail(d: ApptEmailData & { reason?: string }) {
  if (!resend) return;
  const dt = formatES(new Date(d.startsAt));
  const body = `
    <h2 style="color:#7E5DB4; margin:0 0 12px;">Cita cancelada</h2>
    <p style="font-size:15px; line-height:1.6;">Hola <strong>${d.patientName}</strong>,</p>
    <p style="font-size:15px; line-height:1.6;">Tu cita del <strong>${dt}</strong> ha sido cancelada.</p>
    ${d.reason ? `<p style="font-size:14px; color:#3D3D3D;"><strong>Motivo:</strong> ${d.reason}</p>` : ""}
    <p style="font-size:13px; color:#604390;">Podés reservar una nueva cita en nuestro sitio cuando quieras.</p>
  `;
  await resend.emails.send({
    from: FROM,
    to: d.patientEmail,
    subject: `Cita cancelada – ${dt}`,
    html: baseHtml("Cita cancelada", body),
  });
}

export async function sendAdminNotification(d: ApptEmailData & { phone?: string; document?: string }) {
  if (!resend) return;
  const adminEmail = process.env.ADMIN_NOTIFICATION_EMAIL;
  if (!adminEmail) return;

  const dt = formatES(new Date(d.startsAt));
  const body = `
    <h2 style="color:#7E5DB4; margin:0 0 12px;">Nueva cita reservada</h2>
    <div style="background:#fbf7ee; border-left:4px solid #C9A961; padding:16px; margin:20px 0; border-radius:6px;">
      <div style="font-size:17px; font-weight:600; margin-bottom:8px;">${dt}</div>
      <table style="font-size:14px; width:100%;">
        <tr><td style="padding:4px 0; color:#604390;">Paciente:</td><td style="padding:4px 0;"><strong>${d.patientName}</strong></td></tr>
        ${d.document ? `<tr><td style="padding:4px 0; color:#604390;">Cédula:</td><td style="padding:4px 0;">${d.document}</td></tr>` : ""}
        ${d.phone ? `<tr><td style="padding:4px 0; color:#604390;">Teléfono:</td><td style="padding:4px 0;">${d.phone}</td></tr>` : ""}
        <tr><td style="padding:4px 0; color:#604390;">Email:</td><td style="padding:4px 0;">${d.patientEmail}</td></tr>
        ${d.reason ? `<tr><td style="padding:4px 0; color:#604390; vertical-align:top;">Motivo:</td><td style="padding:4px 0;">${d.reason}</td></tr>` : ""}
      </table>
    </div>
  `;
  await resend.emails.send({
    from: FROM,
    to: adminEmail,
    subject: `Nueva cita: ${d.patientName} – ${dt}`,
    html: baseHtml("Nueva cita", body),
  });
}

interface DentalEmailData {
  patientName: string;
  patientEmail: string;
  dateStr: string;
  treatmentNotes: string;
  prescription?: string | null;
  medicalHistorySummary: string;
  stomatognathicSummary: string;
  odontogramSummary: string;
}

export async function sendDentalConsultationEmail(d: DentalEmailData) {
  if (!resend) return;

  const body = `
    <h2 style="color:#7E5DB4; margin:0 0 12px;">Resumen de tu atención odontológica</h2>
    <p style="font-size:15px; line-height:1.6;">Hola <strong>${d.patientName}</strong>,</p>
    <p style="font-size:15px; line-height:1.6;">Queremos compartirte el resumen y receta de tu última atención en <strong>${CLINIC}</strong>.</p>
    
    <div style="background:#f5f1fb; border-radius:10px; padding:20px; margin:20px 0;">
      <h3 style="color:#604390; margin:0 0 10px; font-size:16px;">Detalles de la Cita</h3>
      <table style="font-size:14px; width:100%;">
        <tr><td style="padding:4px 0; color:#604390; width:120px;">Fecha:</td><td style="padding:4px 0;"><strong>${d.dateStr}</strong></td></tr>
      </table>
    </div>

    <div style="background:#ffffff; border:1px solid #e1d6f2; border-radius:10px; padding:20px; margin:20px 0;">
      <h3 style="color:#604390; margin:0 0 10px; font-size:16px;">Evolución y Procedimientos Realizados</h3>
      <p style="font-size:14px; line-height:1.6; margin:0; white-space:pre-line;">${d.treatmentNotes}</p>
    </div>

    ${d.prescription ? `
    <div style="background:#fbf7ee; border-left:4px solid #C9A961; border-radius:4px; padding:20px; margin:20px 0;">
      <h3 style="color:#9e7920; margin:0 0 10px; font-size:16px;">Receta e Indicaciones Médicas</h3>
      <p style="font-size:14px; line-height:1.6; margin:0; white-space:pre-line;">${d.prescription}</p>
    </div>
    ` : ""}

    <div style="background:#ffffff; border:1px solid #e1d6f2; border-radius:10px; padding:20px; margin:20px 0;">
      <h3 style="color:#604390; margin:0 0 10px; font-size:16px;">Resumen Clínico Dental</h3>
      <table style="font-size:14px; width:100%; border-collapse:collapse;">
        <tr style="border-bottom:1px solid #f0eaf8;">
          <td style="padding:8px 0; color:#604390; font-weight:600; width:180px;">Antecedentes de Salud:</td>
          <td style="padding:8px 0; line-height:1.4;">${d.medicalHistorySummary}</td>
        </tr>
        <tr style="border-bottom:1px solid #f0eaf8;">
          <td style="padding:8px 0; color:#604390; font-weight:600;">Examen Estomatognático:</td>
          <td style="padding:8px 0; line-height:1.4;">${d.stomatognathicSummary}</td>
        </tr>
        <tr>
          <td style="padding:8px 0; color:#604390; font-weight:600; vertical-align:top;">Estado del Odontograma:</td>
          <td style="padding:8px 0; line-height:1.4; white-space:pre-line;">${d.odontogramSummary}</td>
        </tr>
      </table>
    </div>

    <p style="font-size:13px; color:#604390; margin-top:24px; text-align:center;">¡Gracias por confiar en nosotros para cuidar tu sonrisa!</p>
  `;

  await resend.emails.send({
    from: FROM,
    to: d.patientEmail,
    subject: `Resumen de tu atención odontológica – ${d.dateStr}`,
    html: baseHtml("Resumen de Atención", body),
  });
}

