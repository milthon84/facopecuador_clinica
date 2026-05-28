import { createAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";
import { parseCertInfo } from "@/lib/sri-sign";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file     = formData.get("file") as File | null;
    const password = (formData.get("password") as string | null)?.trim() ?? "";

    if (!file) return NextResponse.json({ error: "No se recibió archivo" }, { status: 400 });
    if (!password) return NextResponse.json({ error: "La contraseña es requerida" }, { status: 400 });

    const buffer = Buffer.from(await file.arrayBuffer());

    // Verificar que el .p12 es válido y la contraseña es correcta
    let certInfo;
    try {
      certInfo = parseCertInfo(buffer, password);
    } catch (e: any) {
      return NextResponse.json(
        { error: "No se pudo leer el certificado. Verifique que la contraseña sea correcta y el archivo sea un .p12 válido." },
        { status: 422 }
      );
    }

    const supabase = createAdminClient();

    // Subir .p12 a Supabase Storage (bucket privado)
    const storagePath = `certificado_${Date.now()}.p12`;
    const { error: uploadError } = await supabase.storage
      .from("sri-certificates")
      .upload(storagePath, buffer, {
        contentType: "application/x-pkcs12",
        upsert: true,
      });

    if (uploadError) {
      console.error("Storage upload error:", uploadError);
      return NextResponse.json({ error: "Error al subir el certificado al storage." }, { status: 500 });
    }

    // Guardar metadata en sri_configs
    const { data: existingConfig } = await supabase.from("sri_configs").select("id").single();

    const updates = {
      p12_storage_path: storagePath,
      p12_cert_subject:  certInfo.subject,
      p12_cert_expires:  certInfo.validTo,
      signature_password: password,
    };

    if (existingConfig?.id) {
      await supabase.from("sri_configs").update(updates).eq("id", existingConfig.id);
    } else {
      await supabase.from("sri_configs").insert(updates);
    }

    return NextResponse.json({
      success: true,
      certInfo,
    });
  } catch (err) {
    console.error("Error en upload-cert:", err);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
