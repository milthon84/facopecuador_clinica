import { getSessionUser } from "@/lib/supabase/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";

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
    
    const updateData: Record<string, any> = { status };
    if (extra) {
      Object.assign(updateData, extra);
    }

    const { data: updatedAppt, error } = await adminClient
      .from("appointments")
      .update(updateData)
      .eq("id", id)
      .select("patient_id")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Invalidar caché de Next.js para reflejar cambios en tiempo real
    try {
      revalidatePath("/admin");
      revalidatePath("/admin/calendario");
      revalidatePath(`/admin/citas/${id}`);
      revalidatePath("/admin/pacientes");
      if (updatedAppt?.patient_id) {
        revalidatePath(`/admin/pacientes/${updatedAppt.patient_id}`);
      }
    } catch (cacheError) {
      console.error("Error al revalidar rutas de Next.js:", cacheError);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Error al procesar la actualización" }, { status: 500 });
  }
}

