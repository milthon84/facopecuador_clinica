import { getSessionUser } from "@/lib/supabase/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { logAudit, getIpFromRequest } from "@/lib/audit";
import type { UserRole } from "@/lib/roles";

export async function PATCH(req: Request) {
  const user = await getSessionUser(req);

  if (!user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { id, status, extra } = body;

    if (!id || !status) {
      return NextResponse.json({ error: "id y status son requeridos" }, { status: 400 });
    }

    const adminClient = createAdminClient();

    // Obtener estado anterior para auditoría
    const { data: prevAppt } = await adminClient
      .from("appointments")
      .select("status, patient_id")
      .eq("id", id)
      .single();

    const updateData: Record<string, any> = { status };
    if (extra) Object.assign(updateData, extra);

    const { data: updatedAppt, error } = await adminClient
      .from("appointments")
      .update(updateData)
      .eq("id", id)
      .select("patient_id")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Registrar auditoría
    const action = status === "cancelled" ? "cancel" : "update";
    const actionLabels: Record<string, string> = {
      cancelled: "Cita cancelada",
      attended:  "Cita marcada como atendida",
      no_show:   "Cita marcada como no asistió",
      scheduled: "Cita reprogramada",
    };
    await logAudit({
      user_id: user.id,
      user_email: user.email,
      user_role: (user.app_metadata?.role as UserRole) ?? null,
      action,
      resource: "appointment",
      resource_id: id,
      description: actionLabels[status] || `Cita actualizada: ${status}`,
      metadata: {
        previous_status: prevAppt?.status,
        new_status: status,
        ...(extra || {}),
      },
      ip_address: getIpFromRequest(req),
    });

    // Invalidar caché
    try {
      revalidatePath("/admin");
      revalidatePath("/admin/calendario");
      revalidatePath(`/admin/citas/${id}`);
      revalidatePath("/admin/pacientes");
      if (updatedAppt?.patient_id) {
        revalidatePath(`/admin/pacientes/${updatedAppt.patient_id}`);
      }
    } catch { /* ignorar */ }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Error al procesar la actualización" }, { status: 500 });
  }
}
