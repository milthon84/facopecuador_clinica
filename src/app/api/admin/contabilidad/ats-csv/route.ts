import { createAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function getTipoId(doc: string): string {
  const d = (doc ?? "").trim();
  if (d === "9999999999999") return "07";
  if (d.length === 13) return "04";
  if (d.length === 10 && /^\d+$/.test(d)) return "05";
  if (/^[A-Za-z]/.test(d)) return "06";
  return "08";
}

function csvRow(fields: (string | number)[]): string {
  return fields.map(f => `"${String(f).replace(/"/g, '""')}"`).join(",");
}

export async function GET(req: NextRequest) {
  const period = req.nextUrl.searchParams.get("period")
    ?? `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}`;

  const [year, month] = period.split("-").map(Number);
  const from = new Date(year, month - 1, 1).toISOString().split("T")[0];
  const to   = new Date(year, month, 0).toISOString().split("T")[0];

  const supabase = createAdminClient();

  const [{ data: invoices }, { data: expenses }] = await Promise.all([
    supabase
      .from("invoices")
      .select("invoice_number, created_at, client_name, client_document, subtotal_0, subtotal_15, iva_amount, total, sri_authorization_number")
      .gte("created_at", from + "T00:00:00")
      .lte("created_at", to   + "T23:59:59")
      .eq("sri_status", "authorized")
      .order("created_at"),
    supabase
      .from("expenses")
      .select("document_number, expense_date, supplier_name, supplier_ruc, subtotal_0, subtotal_15, iva_amount, total, category")
      .gte("expense_date", from)
      .lte("expense_date", to)
      .eq("status", "registered")
      .order("expense_date"),
  ]);

  const fmt = (n: any) => Number(n ?? 0).toFixed(2);
  const rows: string[] = [];

  // ── SECCIÓN VENTAS ─────────────────────────────────────────────────────
  rows.push("VENTAS");
  rows.push(csvRow([
    "TIPO_COMP","FECHA","NO_COMPROBANTE","TIPO_ID","IDENTIFICACION",
    "RAZON_SOCIAL","BASE_0","BASE_IMPONIBLE","MONTO_IVA","TOTAL","NO_AUTORIZACION",
  ]));

  for (const v of invoices ?? []) {
    rows.push(csvRow([
      "01",
      new Date(v.created_at).toLocaleDateString("es-EC"),
      v.invoice_number ?? "",
      getTipoId(v.client_document),
      v.client_document ?? "",
      v.client_name ?? "",
      fmt(v.subtotal_0),
      fmt(v.subtotal_15),
      fmt(v.iva_amount),
      fmt(v.total),
      v.sri_authorization_number ?? "",
    ]));
  }

  rows.push(""); // separador

  // ── SECCIÓN COMPRAS ────────────────────────────────────────────────────
  rows.push("COMPRAS");
  rows.push(csvRow([
    "TIPO_COMP","FECHA","NO_COMPROBANTE","RUC_PROVEEDOR","RAZON_SOCIAL_PROV",
    "BASE_0","BASE_IMPONIBLE","MONTO_IVA","TOTAL","SUSTENTO_TRIB",
  ]));

  for (const c of expenses ?? []) {
    rows.push(csvRow([
      "01",
      c.expense_date ?? "",
      c.document_number ?? "",
      c.supplier_ruc  ?? "",
      c.supplier_name ?? "",
      fmt(c.subtotal_0),
      fmt(c.subtotal_15),
      fmt(c.iva_amount),
      fmt(c.total),
      "01", // 01 = Crédito tributario para declaración de IVA
    ]));
  }

  const csv = rows.join("\r\n");
  const filename = `ATS_${period.replace("-", "_")}.csv`;

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
