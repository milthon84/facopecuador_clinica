import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

/** PATCH /api/admin/patients — Actualiza datos básicos del paciente */
export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const { id, full_name, phone, email, document_number } = body;

    if (!id) {
      return NextResponse.json({ error: "Se requiere el id del paciente." }, { status: 400 });
    }

    const updates: Record<string, string> = {};
    if (full_name !== undefined) updates.full_name = full_name.trim();
    if (phone !== undefined) updates.phone = phone.trim();
    if (email !== undefined) updates.email = email.trim();
    if (document_number !== undefined) updates.document_number = document_number.trim();

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "No hay datos para actualizar." }, { status: 400 });
    }

    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("patients")
      .update(updates)
      .eq("id", id)
      .select("id, full_name, phone, email, document_number")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ patient: data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Error interno." }, { status: 500 });
  }
}
