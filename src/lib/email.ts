import { Resend } from "resend";

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

if (!resend) {
  console.warn("⚠️ ALERTA: La variable de entorno RESEND_API_KEY no está configurada. El envío de correos electrónicos está desactivado.");
}


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
  if (!resend) {
    console.warn("⚠️ Envío de correo cancelado: Resend no está configurado.");
    return;
  }
  const dt = formatES(new Date(d.startsAt));
  const body = `
    <h2 style="color:#7E5DB4; margin:0 0 12px;">¡Cita confirmada!</h2>
    <p style="font-size:15px; line-height:1.6;">Hola <strong>${d.patientName}</strong>,</p>
    <p style="font-size:15px; line-height:1.6;">Tu cita en <strong>${CLINIC}</strong> ha sido confirmada.</p>
    <div style="background:#fbf7ee; border-left:4px solid #C9A961; padding:16px; margin:20px 0; border-radius:6px;">
      <div style="font-size:14px; color:#604390; margin-bottom:4px;">FECHA Y HORA</div>
      <div style="font-size:17px; font-weight:600;">${dt}</div>
    </div>
    <div style="background:#f5f1fb; border-left:4px solid #7E5DB4; padding:16px; margin:20px 0; border-radius:6px;">
      <div style="font-size:14px; color:#604390; margin-bottom:4px;">UBICACIÓN</div>
      <div style="font-size:15px; font-weight:600; color:#0f0f0f; margin-bottom:8px;">${ADDRESS || "Facop"}</div>
      <a href="https://maps.app.goo.gl/rG2VKyLm5N4yr7s67" target="_blank" style="display:inline-block; font-size:13px; font-weight:600; color:#ffffff; background:#7E5DB4; padding:8px 16px; border-radius:6px; text-decoration:none; margin-top:4px;">Ver en Google Maps</a>
    </div>
    ${d.reason ? `<p style="font-size:14px; color:#3D3D3D;"><strong>Motivo:</strong> ${d.reason}</p>` : ""}
    <p style="font-size:13px; color:#604390; margin-top:24px;">Si necesitás cancelar o reprogramar, contactanos al menos 24 horas antes de la cita.</p>
  `;
  try {
    console.log(`✉️ Intentando enviar correo de confirmación de cita a: ${d.patientEmail}...`);
    const response = await resend.emails.send({
      from: FROM,
      to: d.patientEmail,
      subject: `Cita confirmada – ${dt}`,
      html: baseHtml("Cita confirmada", body),
    });
    if (response.error) {
      console.error(`❌ Error retornado por Resend al enviar confirmación a ${d.patientEmail}:`, response.error);
    } else {
      console.log(`✅ Correo de confirmación enviado exitosamente a ${d.patientEmail}. ID:`, response.data?.id);
    }
  } catch (error) {
    console.error(`❌ Excepción de red/sistema en Resend al enviar confirmación a ${d.patientEmail}:`, error);
  }
}

export async function sendReminderEmail(d: ApptEmailData) {
  if (!resend) {
    console.warn("⚠️ Envío de correo cancelado: Resend no está configurado.");
    return;
  }
  const dt = formatES(new Date(d.startsAt));
  const body = `
    <h2 style="color:#7E5DB4; margin:0 0 12px;">Recordatorio de tu cita</h2>
    <p style="font-size:15px; line-height:1.6;">Hola <strong>${d.patientName}</strong>,</p>
    <p style="font-size:15px; line-height:1.6;">Te recordamos que mañana tenés tu cita en <strong>${CLINIC}</strong>.</p>
    <div style="background:#fbf7ee; border-left:4px solid #C9A961; padding:16px; margin:20px 0; border-radius:6px;">
      <div style="font-size:14px; color:#604390; margin-bottom:4px;">FECHA Y HORA</div>
      <div style="font-size:17px; font-weight:600;">${dt}</div>
    </div>
    <div style="background:#f5f1fb; border-left:4px solid #7E5DB4; padding:16px; margin:20px 0; border-radius:6px;">
      <div style="font-size:14px; color:#604390; margin-bottom:4px;">UBICACIÓN</div>
      <div style="font-size:15px; font-weight:600; color:#0f0f0f; margin-bottom:8px;">${ADDRESS || "Facop"}</div>
      <a href="https://maps.app.goo.gl/rG2VKyLm5N4yr7s67" target="_blank" style="display:inline-block; font-size:13px; font-weight:600; color:#ffffff; background:#7E5DB4; padding:8px 16px; border-radius:6px; text-decoration:none; margin-top:4px;">Ver en Google Maps</a>
    </div>
    <p style="font-size:13px; color:#604390;">¡Te esperamos!</p>
  `;
  try {
    console.log(`✉️ Intentando enviar recordatorio de cita a: ${d.patientEmail}...`);
    const response = await resend.emails.send({
      from: FROM,
      to: d.patientEmail,
      subject: `Recordatorio: cita mañana ${dt}`,
      html: baseHtml("Recordatorio", body),
    });
    if (response.error) {
      console.error(`❌ Error retornado por Resend al enviar recordatorio a ${d.patientEmail}:`, response.error);
    } else {
      console.log(`✅ Correo de recordatorio enviado exitosamente a ${d.patientEmail}. ID:`, response.data?.id);
    }
  } catch (error) {
    console.error(`❌ Excepción de red/sistema en Resend al enviar recordatorio a ${d.patientEmail}:`, error);
  }
}

export async function sendCancellationEmail(d: ApptEmailData & { reason?: string }) {
  if (!resend) {
    console.warn("⚠️ Envío de correo cancelado: Resend no está configurado.");
    return;
  }
  const dt = formatES(new Date(d.startsAt));
  const body = `
    <h2 style="color:#7E5DB4; margin:0 0 12px;">Cita cancelada</h2>
    <p style="font-size:15px; line-height:1.6;">Hola <strong>${d.patientName}</strong>,</p>
    <p style="font-size:15px; line-height:1.6;">Tu cita del <strong>${dt}</strong> ha sido cancelada.</p>
    ${d.reason ? `<p style="font-size:14px; color:#3D3D3D;"><strong>Motivo:</strong> ${d.reason}</p>` : ""}
    <p style="font-size:13px; color:#604390;">Podés reservar una nueva cita en nuestro sitio cuando quieras.</p>
  `;
  try {
    console.log(`✉️ Intentando enviar correo de cancelación a: ${d.patientEmail}...`);
    const response = await resend.emails.send({
      from: FROM,
      to: d.patientEmail,
      subject: `Cita cancelada – ${dt}`,
      html: baseHtml("Cita cancelada", body),
    });
    if (response.error) {
      console.error(`❌ Error retornado por Resend al enviar cancelación a ${d.patientEmail}:`, response.error);
    } else {
      console.log(`✅ Correo de cancelación enviado exitosamente a ${d.patientEmail}. ID:`, response.data?.id);
    }
  } catch (error) {
    console.error(`❌ Excepción de red/sistema en Resend al enviar cancelación a ${d.patientEmail}:`, error);
  }
}

export async function sendAdminNotification(d: ApptEmailData & { phone?: string; document?: string }) {
  if (!resend) {
    console.warn("⚠️ Envío de correo cancelado: Resend no está configurado.");
    return;
  }
  const adminEmail = process.env.ADMIN_NOTIFICATION_EMAIL;
  if (!adminEmail) {
    console.warn("⚠️ Envío de correo de admin cancelado: ADMIN_NOTIFICATION_EMAIL no configurado.");
    return;
  }

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
  try {
    console.log(`✉️ Intentando enviar notificación de admin a: ${adminEmail}...`);
    const response = await resend.emails.send({
      from: FROM,
      to: adminEmail,
      subject: `Nueva cita: ${d.patientName} – ${dt}`,
      html: baseHtml("Nueva cita", body),
    });
    if (response.error) {
      console.error(`❌ Error retornado por Resend al enviar notificación de admin a ${adminEmail}:`, response.error);
    } else {
      console.log(`✅ Correo de notificación de admin enviado exitosamente a ${adminEmail}. ID:`, response.data?.id);
    }
  } catch (error) {
    console.error(`❌ Excepción de red/sistema en Resend al enviar notificación de admin a ${adminEmail}:`, error);
  }
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
  medicalHistoryRaw?: any;
  stomatognathicExamRaw?: any;
  odontogramStateRaw?: any;
  dentitionMode?: "adulta" | "infantil";
}

function renderToothHtmlTable(toothNum: number, state: any): string {
  const general = state?.general || "sano";
  const surfaces = state?.surfaces || {};

  const getSurfaceStyles = (surfKey: string) => {
    const cond = surfaces[surfKey];
    if (cond === "caries") {
      return { css: "background-color: #ef4444; border: 1px solid #dc2626;", bgcolor: "#ef4444" };
    }
    if (cond === "sellante_necesario") {
      return { css: "background-color: #e0f2fe; border: 1px dashed #0ea5e9;", bgcolor: "#e0f2fe" };
    }
    if (cond === "sellante_realizado") {
      return { css: "background-color: #3b82f6; border: 1px solid #2563eb;", bgcolor: "#3b82f6" };
    }
    return { css: "background-color: #fbfbfb; border: 1px solid #e1d6f2;", bgcolor: "#fbfbfb" };
  };

  if (general === "perdida") {
    return `
      <div style="width: 32px; height: 32px; line-height: 30px; margin: 0 auto; text-align: center; font-size: 18px; font-weight: bold; color: #ef4444; font-family: Arial, sans-serif; border: 1px solid #ef4444; border-radius: 4px; background-color: #fff5f5; box-sizing: border-box;">
        X
      </div>
    `;
  }

  if (general === "extraccion") {
    return `
      <div style="width: 32px; height: 32px; line-height: 30px; margin: 0 auto; text-align: center; font-size: 18px; font-weight: bold; color: #ef4444; font-family: Arial, sans-serif; border: 1px solid #ef4444; border-radius: 4px; background-color: #fff5f5; box-sizing: border-box;">
        /
      </div>
    `;
  }

  const tableStyle = general === "corona"
    ? "width: 32px; height: 32px; border-collapse: collapse; margin: 0 auto; border: 2.5px solid #C9A961; border-radius: 4px; background-color: #fffcf6;"
    : "width: 32px; height: 32px; border-collapse: collapse; margin: 0 auto;";

  const topStyles = getSurfaceStyles("top");
  const leftStyles = getSurfaceStyles("left");
  const centerStyles = getSurfaceStyles("center");
  const rightStyles = getSurfaceStyles("right");
  const bottomStyles = getSurfaceStyles("bottom");

  return `
    <table style="${tableStyle}" cellpadding="0" cellspacing="0" border="0" width="32" height="32">
      <tr style="line-height: 10px; font-size: 1px;">
        <td width="10" height="10" bgcolor="#ffffff" style="width: 10px; height: 10px; padding: 0; background: #ffffff; line-height: 10px; font-size: 1px;">&nbsp;</td>
        <td width="12" height="10" bgcolor="${topStyles.bgcolor}" style="width: 12px; height: 10px; padding: 0; ${topStyles.css} line-height: 10px; font-size: 1px;">&nbsp;</td>
        <td width="10" height="10" bgcolor="#ffffff" style="width: 10px; height: 10px; padding: 0; background: #ffffff; line-height: 10px; font-size: 1px;">&nbsp;</td>
      </tr>
      <tr style="line-height: 12px; font-size: 1px;">
        <td width="10" height="12" bgcolor="${leftStyles.bgcolor}" style="width: 10px; height: 12px; padding: 0; ${leftStyles.css} line-height: 12px; font-size: 1px;">&nbsp;</td>
        <td width="12" height="12" bgcolor="${centerStyles.bgcolor}" style="width: 12px; height: 12px; padding: 0; ${centerStyles.css} line-height: 12px; font-size: 1px;">&nbsp;</td>
        <td width="10" height="12" bgcolor="${rightStyles.bgcolor}" style="width: 10px; height: 12px; padding: 0; ${rightStyles.css} line-height: 12px; font-size: 1px;">&nbsp;</td>
      </tr>
      <tr style="line-height: 10px; font-size: 1px;">
        <td width="10" height="10" bgcolor="#ffffff" style="width: 10px; height: 10px; padding: 0; background: #ffffff; line-height: 10px; font-size: 1px;">&nbsp;</td>
        <td width="12" height="10" bgcolor="${bottomStyles.bgcolor}" style="width: 12px; height: 10px; padding: 0; ${bottomStyles.css} line-height: 10px; font-size: 1px;">&nbsp;</td>
        <td width="10" height="10" bgcolor="#ffffff" style="width: 10px; height: 10px; padding: 0; background: #ffffff; line-height: 10px; font-size: 1px;">&nbsp;</td>
      </tr>
    </table>
  `;
}

function generateOdontogramHtml(odontogramStateRaw: any, dentitionMode?: "adulta" | "infantil"): string {
  const state = odontogramStateRaw || {};

  const adultUpper = [18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28];
  const adultLower = [48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38];
  const childUpper = [55, 54, 53, 52, 51, 61, 62, 63, 64, 65];
  const childLower = [85, 84, 83, 82, 81, 71, 72, 73, 74, 75];

  const hasChildTeeth = Object.keys(state).some(toothNumStr => {
    const tNum = parseInt(toothNumStr, 10);
    return tNum >= 51 && tNum <= 85;
  });

  const finalMode = dentitionMode || (hasChildTeeth ? "infantil" : "adulta");

  const renderRow = (title: string, teeth: number[]) => {
    let rowTeethHtml = "";
    teeth.forEach(tNum => {
      const toothState = state[tNum] || {};
      const general = toothState.general || "sano";
      const surfaces = toothState.surfaces || {};
      const hasIssues = general !== "sano" || Object.keys(surfaces).length > 0;

      const cardStyle = hasIssues
        ? "display: inline-block; width: 44px; margin: 3px 2px; padding: 6px 2px; background: #ffffff; border: 1.5px solid #C9A961; border-radius: 8px; text-align: center; vertical-align: top; box-shadow: 0 2px 6px rgba(201,169,97,0.15); box-sizing: border-box;"
        : "display: inline-block; width: 44px; margin: 3px 2px; padding: 6px 2px; background: #ffffff; border: 1px solid #f0eaf8; border-radius: 8px; text-align: center; vertical-align: top; opacity: 0.65; box-sizing: border-box;";

      rowTeethHtml += `
        <div style="${cardStyle}">
          <div style="font-size: 9px; font-weight: bold; color: #604390; margin-bottom: 4px;">${tNum}</div>
          ${renderToothHtmlTable(tNum, toothState)}
        </div>
      `;
    });

    return `
      <div style="margin-bottom: 16px; text-align: center;">
        <div style="font-size: 11px; font-weight: 600; color: #8c73b2; margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.5px; font-family: sans-serif;">${title}</div>
        <div style="text-align: center; white-space: normal;">
          ${rowTeethHtml}
        </div>
      </div>
    `;
  };

  let odontogramHtml = "";
  if (finalMode === "infantil") {
    odontogramHtml += renderRow("Arcada Superior (Infantil)", childUpper);
    odontogramHtml += renderRow("Arcada Inferior (Infantil)", childLower);
  } else {
    odontogramHtml += renderRow("Arcada Superior (Adultos)", adultUpper);
    odontogramHtml += renderRow("Arcada Inferior (Adultos)", adultLower);
  }

  return `
    <div style="background: #fdfdfd; border: 1px solid #e1d6f2; border-radius: 12px; padding: 16px 8px; margin: 20px 0; font-family: sans-serif;">
      <h3 style="color: #604390; margin: 0 0 14px; font-size: 14px; text-align: center; font-weight: bold; letter-spacing: 0.5px;">Odontograma Clínico Visual</h3>
      
      <!-- Arcadas -->
      <div>
        ${odontogramHtml}
      </div>

      <!-- Leyenda Clínica Premium y Pedagógica -->
      <div style="margin-top: 18px; padding: 14px; background: #faf9fc; border-radius: 10px; border: 1.5px solid #e1d6f2;">
        <div style="font-size: 12px; font-weight: bold; color: #604390; margin-bottom: 12px; text-align: center; text-transform: uppercase; letter-spacing: 0.5px; font-family: sans-serif;">
          Guía de Colores y Tratamientos para el Paciente
        </div>
        
        <table style="width: 100%; border-collapse: collapse; border: none; font-family: sans-serif;">
          <tr>
            <!-- Columna Izquierda: Lo que ya está realizado -->
            <td style="width: 50%; padding: 10px; vertical-align: top; background: #edf7ed; border-radius: 8px 0 0 8px; border-right: 3px solid #ffffff;">
              <div style="font-size: 11px; font-weight: bold; color: #1e4620; margin-bottom: 8px;">
                ✅ TRATAMIENTOS REALIZADOS
              </div>
              
              <!-- Item 1: Azul -->
              <table style="width: 100%; border: none; font-size: 10.5px; border-collapse: collapse; margin-bottom: 8px; font-family: sans-serif;">
                <tr>
                  <td style="width: 16px; padding: 2px 0; vertical-align: top;">
                    <span style="display: inline-block; width: 11px; height: 11px; background: #3b82f6; border-radius: 2px; vertical-align: middle;"></span>
                  </td>
                  <td style="padding: 0 0 0 6px; color: #1e4620; vertical-align: top;">
                    <strong>Azul: Calza o Sellante Realizado</strong>
                    <div style="font-size: 9px; color: #3d7a40; margin-top: 1px;">Protección o restauración colocada con éxito en la consulta.</div>
                  </td>
                </tr>
              </table>

              <!-- Item 2: Dorado -->
              <table style="width: 100%; border: none; font-size: 10.5px; border-collapse: collapse; font-family: sans-serif;">
                <tr>
                  <td style="width: 16px; padding: 2px 0; vertical-align: top;">
                    <span style="display: inline-block; width: 10px; height: 10px; border: 2px solid #C9A961; border-radius: 50%; box-sizing: border-box; vertical-align: middle; background: #ffffff;"></span>
                  </td>
                  <td style="padding: 0 0 0 6px; color: #1e4620; vertical-align: top;">
                    <strong>Dorado: Corona Protésica</strong>
                    <div style="font-size: 9px; color: #3d7a40; margin-top: 1px;">Funda permanente de protección sobre toda la pieza.</div>
                  </td>
                </tr>
              </table>
            </td>

            <!-- Columna Derecha: Lo que está pendiente -->
            <td style="width: 50%; padding: 10px; vertical-align: top; background: #fff5f5; border-radius: 0 8px 8px 0;">
              <div style="font-size: 11px; font-weight: bold; color: #9b2c2c; margin-bottom: 8px;">
                ⚠️ PENDIENTES POR TRATAR
              </div>
              
              <!-- Item 1: Rojo -->
              <table style="width: 100%; border: none; font-size: 10.5px; border-collapse: collapse; margin-bottom: 8px; font-family: sans-serif;">
                <tr>
                  <td style="width: 16px; padding: 2px 0; vertical-align: top;">
                    <span style="display: inline-block; width: 11px; height: 11px; background: #ef4444; border-radius: 2px; vertical-align: middle;"></span>
                  </td>
                  <td style="padding: 0 0 0 6px; color: #7c2d12; vertical-align: top;">
                    <strong>Rojo: Caries Activa (Calza Faltante)</strong>
                    <div style="font-size: 9px; color: #9a482b; margin-top: 1px;">Daño en la superficie que requiere limpieza y calza.</div>
                  </td>
                </tr>
              </table>

              <!-- Item 2: Celeste Dashed -->
              <table style="width: 100%; border: none; font-size: 10.5px; border-collapse: collapse; margin-bottom: 8px; font-family: sans-serif;">
                <tr>
                  <td style="width: 16px; padding: 2px 0; vertical-align: top;">
                    <span style="display: inline-block; width: 11px; height: 11px; background: #e0f2fe; border: 1px dashed #0ea5e9; border-radius: 2px; vertical-align: middle;"></span>
                  </td>
                  <td style="padding: 0 0 0 6px; color: #7c2d12; vertical-align: top;">
                    <strong>Celeste Línea: Calza / Sellante Requerido</strong>
                    <div style="font-size: 9px; color: #9a482b; margin-top: 1px;">Tratamiento preventivo para proteger la pieza del paciente.</div>
                  </td>
                </tr>
              </table>

              <!-- Item 3: Cruz X -->
              <table style="width: 100%; border: none; font-size: 10.5px; border-collapse: collapse; margin-bottom: 8px; font-family: sans-serif;">
                <tr>
                  <td style="width: 16px; padding: 2px 0; vertical-align: top;">
                    <span style="display: inline-block; width: 11px; height: 11px; border: 1px solid #ef4444; color: #ef4444; font-size: 8px; font-weight: bold; text-align: center; line-height: 9px; border-radius: 2px; vertical-align: middle; background: #ffffff; box-sizing: border-box;">X</span>
                  </td>
                  <td style="padding: 0 0 0 6px; color: #7c2d12; vertical-align: top;">
                    <strong>Cruz Roja (X): Pieza Ausente</strong>
                    <div style="font-size: 9px; color: #9a482b; margin-top: 1px;">Pieza dental no presente en la boca del paciente.</div>
                  </td>
                </tr>
              </table>

              <!-- Item 4: Diagonal / -->
              <table style="width: 100%; border: none; font-size: 10.5px; border-collapse: collapse; font-family: sans-serif;">
                <tr>
                  <td style="width: 16px; padding: 2px 0; vertical-align: top;">
                    <span style="display: inline-block; width: 11px; height: 11px; border: 1px solid #ef4444; color: #ef4444; font-size: 8px; font-weight: bold; text-align: center; line-height: 9px; border-radius: 2px; vertical-align: middle; background: #ffffff; box-sizing: border-box;">/</span>
                  </td>
                  <td style="padding: 0 0 0 6px; color: #7c2d12; vertical-align: top;">
                    <strong>Diagonal Roja (/): Extracción Requerida</strong>
                    <div style="font-size: 9px; color: #9a482b; margin-top: 1px;">Pieza que requiere ser removida por indicación clínica.</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </div>
    </div>
  `;
}

function generateMedicalHistoryHtml(medicalHistoryRaw: any): string {
  const historyKeys: Record<string, string> = {
    alergia_antibiotico: "Alergia Antibiótico",
    alergia_anestesia: "Alergia Anestesia",
    hemorragias: "Hemorragias",
    vih_sida: "VIH/SIDA",
    tuberculosis: "Tuberculosis",
    diabetes: "Diabetes",
    asma: "Asma",
    hipertension: "Hipertensión",
    cardiovasculares: "Enfermedades Cardiovasculares"
  };

  const activeConditions: string[] = [];
  Object.entries(medicalHistoryRaw || {}).forEach(([key, val]) => {
    if (val === true && historyKeys[key]) {
      activeConditions.push(historyKeys[key]);
    }
  });

  const medHistoryObj = medicalHistoryRaw as any;
  if (medHistoryObj?.otros) {
    activeConditions.push(`Otros: ${medHistoryObj.otros}`);
  }

  if (activeConditions.length === 0) {
    return `
      <div style="background: #eefbee; border: 1px solid #a3e6a3; color: #1e561e; padding: 12px 16px; border-radius: 8px; font-size: 13px; font-weight: 500; font-family: sans-serif;">
        <span style="font-size: 14px; margin-right: 6px; vertical-align: middle;">✅</span> <span style="vertical-align: middle;"><strong>Sin antecedentes de salud de riesgo registrados</strong></span>
      </div>
    `;
  }

  const badges = activeConditions.map(cond => {
    return `
      <span style="display: inline-block; background: #fbf7ee; border: 1px solid #C9A961; color: #9e7920; padding: 5px 9px; border-radius: 6px; font-size: 12px; font-weight: bold; margin: 3px; font-family: sans-serif; white-space: nowrap;">
        ⚠️ ${cond}
      </span>
    `;
  }).join("");

  return `
    <div style="padding: 12px; background: #fffcf6; border: 1px solid #f8e8c8; border-radius: 8px; font-family: sans-serif;">
      <div style="font-size: 12px; font-weight: bold; color: #9e7920; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.5px;">Antecedentes de Salud:</div>
      <div style="line-height: 1.6;">
        ${badges}
      </div>
    </div>
  `;
}

function generateStomatognathicHtml(stomatognathicExamRaw: any): string {
  const examKeys: Record<string, string> = {
    labios: "Labios",
    mejillas: "Mejillas",
    maxilar_superior: "Maxilar Superior",
    maxilar_inferior: "Maxilar Inferior",
    lengua: "Lengua",
    paladar: "Paladar",
    amigdalas: "Amígdalas",
    otros: "Otros"
  };

  const raw = stomatognathicExamRaw || {};
  let badges = "";
  
  Object.keys(examKeys).forEach(k => {
    const label = examKeys[k];
    const item = raw[k];
    if (item?.status === "alteracion") {
      badges += `
        <div style="display: inline-block; background: #fee2e2; border: 1px solid #fca5a5; color: #b91c1c; padding: 5px 9px; border-radius: 6px; font-size: 11px; font-weight: bold; margin: 3px; font-family: sans-serif; vertical-align: top; box-sizing: border-box;">
          ⚠️ ${label}: Alteración (${item.desc || "Sin detalle"})
        </div>
      `;
    } else {
      badges += `
        <div style="display: inline-block; background: #f5f1fb; border: 1px solid #e1d6f2; color: #604390; padding: 5px 9px; border-radius: 6px; font-size: 11px; margin: 3px; font-family: sans-serif; vertical-align: top; box-sizing: border-box;">
          ✓ ${label}: Normal
        </div>
      `;
    }
  });

  return `
    <div style="padding: 12px; background: #ffffff; border: 1px solid #e1d6f2; border-radius: 8px; font-family: sans-serif; margin-top: 12px;">
      <div style="font-size: 12px; font-weight: bold; color: #604390; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.5px;">Examen Estomatognático:</div>
      <div style="line-height: 1.6;">
        ${badges}
      </div>
    </div>
  `;
}

export async function sendDentalConsultationEmail(d: DentalEmailData) {
  if (!resend) {
    console.warn("⚠️ Envío de correo cancelado: Resend no está configurado.");
    return;
  }

  const medicalHistorySection = d.medicalHistoryRaw
    ? generateMedicalHistoryHtml(d.medicalHistoryRaw)
    : `
      <table style="font-size:14px; width:100%; border-collapse:collapse; font-family:sans-serif;">
        <tr style="border-bottom:1px solid #f0eaf8;">
          <td style="padding:8px 0; color:#604390; font-weight:600; width:150px;">Antecedentes de Salud:</td>
          <td style="padding:8px 0; line-height:1.4;">${d.medicalHistorySummary}</td>
        </tr>
      </table>
    `;

  const stomatognathicSection = d.stomatognathicExamRaw
    ? generateStomatognathicHtml(d.stomatognathicExamRaw)
    : `
      <table style="font-size:14px; width:100%; border-collapse:collapse; font-family:sans-serif; margin-top:8px;">
        <tr style="border-bottom:1px solid #f0eaf8;">
          <td style="padding:8px 0; color:#604390; font-weight:600; width:150px;">Examen Estomatognático:</td>
          <td style="padding:8px 0; line-height:1.4;">${d.stomatognathicSummary}</td>
        </tr>
      </table>
    `;

  const odontogramSection = d.odontogramStateRaw
    ? generateOdontogramHtml(d.odontogramStateRaw, d.dentitionMode)
    : `
      <table style="font-size:14px; width:100%; border-collapse:collapse; font-family:sans-serif; margin-top:8px;">
        <tr>
          <td style="padding:8px 0; color:#604390; font-weight:600; vertical-align:top; width:150px;">Estado del Odontograma:</td>
          <td style="padding:8px 0; line-height:1.4; white-space:pre-line;">${d.odontogramSummary}</td>
        </tr>
      </table>
    `;

  const body = `
    <h2 style="color:#7E5DB4; margin:0 0 12px; font-family:sans-serif;">Resumen de tu atención odontológica</h2>
    <p style="font-size:15px; line-height:1.6; font-family:sans-serif;">Hola <strong>${d.patientName}</strong>,</p>
    <p style="font-size:15px; line-height:1.6; font-family:sans-serif;">Queremos compartirte el resumen y receta de tu última atención en <strong>${CLINIC}</strong>.</p>
    
    <div style="background:#f5f1fb; border-radius:10px; padding:16px 20px; margin:20px 0; font-family:sans-serif;">
      <h3 style="color:#604390; margin:0 0 8px; font-size:15px; font-weight:bold;">Detalles de la Cita</h3>
      <table style="font-size:14px; width:100%; font-family:sans-serif;">
        <tr><td style="padding:4px 0; color:#604390; width:100px;">Fecha:</td><td style="padding:4px 0;"><strong>${d.dateStr}</strong></td></tr>
      </table>
    </div>

    <div style="background:#ffffff; border:1px solid #e1d6f2; border-radius:10px; padding:20px; margin:20px 0; font-family:sans-serif;">
      <h3 style="color:#604390; margin:0 0 10px; font-size:15px; font-weight:bold;">Evolución y Procedimientos Realizados</h3>
      <p style="font-size:14px; line-height:1.6; margin:0; white-space:pre-line;">${d.treatmentNotes}</p>
    </div>

    ${d.prescription ? `
    <div style="background:#fbf7ee; border-left:4px solid #C9A961; border-radius:4px; padding:20px; margin:20px 0; font-family:sans-serif;">
      <h3 style="color:#9e7920; margin:0 0 10px; font-size:15px; font-weight:bold;">Receta e Indicaciones Médicas</h3>
      <p style="font-size:14px; line-height:1.6; margin:0; white-space:pre-line;">${d.prescription}</p>
    </div>
    ` : ""}

    <div style="background:#ffffff; border:1px solid #e1d6f2; border-radius:10px; padding:20px; margin:20px 0; font-family:sans-serif;">
      <h3 style="color:#604390; margin:0 0 16px; font-size:15px; font-weight:bold; border-bottom:1.5px solid #f5f1fb; padding-bottom:8px;">Resumen Clínico Dental</h3>
      ${medicalHistorySection}
      ${stomatognathicSection}
      ${odontogramSection}
    </div>

    <p style="font-size:13px; color:#604390; margin-top:24px; text-align:center; font-family:sans-serif;">¡Gracias por confiar en nosotros para cuidar tu sonrisa!</p>
  `;

  try {
    console.log(`✉️ Intentando enviar resumen dental a: ${d.patientEmail}...`);
    const response = await resend.emails.send({
      from: FROM,
      to: d.patientEmail,
      subject: `Resumen de tu atención odontológica – ${d.dateStr}`,
      html: baseHtml("Resumen de Atención", body),
    });
    if (response.error) {
      console.error(`❌ Error retornado por Resend al enviar resumen dental a ${d.patientEmail}:`, response.error);
    } else {
      console.log(`✅ Correo de resumen dental enviado exitosamente a ${d.patientEmail}. ID:`, response.data?.id);
    }
  } catch (error) {
    console.error(`❌ Excepción de red/sistema en Resend al enviar resumen dental a ${d.patientEmail}:`, error);
  }
}

