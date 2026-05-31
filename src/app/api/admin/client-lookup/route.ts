import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Busca datos completos de un cliente por cédula o RUC.
 * Prioridad: pacientes → facturas previas (con todos sus datos históricos).
 * Busca con el documento exacto Y con formato cédula+001 (persona natural).
 * GET /api/admin/client-lookup?document=1718372335
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const raw = searchParams.get("document")?.trim();
  if (!raw) return NextResponse.json({ found: false });

  const supabase = createAdminClient();

  // Variantes a buscar: exacto + cédula→RUC (solo si son 10 dígitos)
  const variants = /^\d{10}$/.test(raw) ? [raw, `${raw}001`] : [raw];

  // ── 1. Buscar en pacientes ────────────────────────────────────────────────
  for (const doc of variants) {
    const { data: patient } = await supabase
      .from("patients")
      .select("id, full_name, email, phone, document_number")
      .eq("document_number", doc)
      .maybeSingle();

    if (patient) {
      // Buscar también la factura más reciente para complementar con dirección
      const { data: lastInv } = await supabase
        .from("invoices")
        .select("client_email, client_phone, client_address")
        .eq("client_document", doc)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      // Usar datos del paciente primero, completar con factura si faltan
      return NextResponse.json({
        found: true,
        source: "patient",
        patient_id: patient.id,
        name:    patient.full_name                    ?? "",
        email:   patient.email    || lastInv?.client_email   || "",
        phone:   patient.phone    || lastInv?.client_phone   || "",
        address: lastInv?.client_address ?? "",
      });
    }
  }

  // ── 2. Buscar en facturas previas ─────────────────────────────────────────
  for (const doc of variants) {
    const { data: invoice } = await supabase
      .from("invoices")
      .select("client_name, client_email, client_phone, client_address, client_document")
      .eq("client_document", doc)
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
  }

  return NextResponse.json({ found: false });
}
