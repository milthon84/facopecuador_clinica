import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Busca datos de un cliente por cédula/RUC.
 * Orden: pacientes registrados → facturas previas.
 * GET /api/admin/client-lookup?document=1718372335
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const document = searchParams.get("document")?.trim();

  if (!document) return NextResponse.json({ found: false });

  const supabase = createAdminClient();

  // 1. Buscar en pacientes registrados
  const { data: patient } = await supabase
    .from("patients")
    .select("id, full_name, email, phone, document_number")
    .eq("document_number", document)
    .maybeSingle();

  if (patient) {
    return NextResponse.json({
      found: true,
      source: "patient",
      patient_id: patient.id,
      name:  patient.full_name,
      email: patient.email  ?? "",
      phone: patient.phone  ?? "",
    });
  }

  // 2. Buscar en facturas previas (cliente ya facturado)
  const { data: invoice } = await supabase
    .from("invoices")
    .select("client_name, client_email, client_phone, client_address")
    .eq("client_document", document)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (invoice) {
    return NextResponse.json({
      found: true,
      source: "invoice",
      name:    invoice.client_name    ?? "",
      email:   invoice.client_email   ?? "",
      phone:   invoice.client_phone   ?? "",
      address: invoice.client_address ?? "",
    });
  }

  return NextResponse.json({ found: false });
}
