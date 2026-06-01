import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Diagnóstico SRI: consulta el estado real de una factura en el SRI
 * y devuelve la respuesta XML cruda para depuración.
 * POST /api/admin/sri-diagnostico { invoice_id }
 */
export async function POST(req: Request) {
  try {
    const { invoice_id } = await req.json();
    if (!invoice_id) return NextResponse.json({ error: "invoice_id requerido" }, { status: 400 });

    const supabase = createAdminClient();
    const { data: invoice } = await supabase
      .from("invoices")
      .select("sri_access_key, sri_environment, sri_status, invoice_number")
      .eq("id", invoice_id)
      .single();

    if (!invoice) return NextResponse.json({ error: "Factura no encontrada" }, { status: 404 });

    const ambiente = (invoice.sri_environment || "1") as "1" | "2";
    const claveAcceso = invoice.sri_access_key;

    const ENDPOINTS_AUTORIZACION: Record<string, string> = {
      "1": "https://celcer.sri.gob.ec/comprobantes-electronicos-ws/AutorizacionComprobantesOffline",
      "2": "https://cel.sri.gob.ec/comprobantes-electronicos-ws/AutorizacionComprobantesOffline",
    };

    const url = ENDPOINTS_AUTORIZACION[ambiente];

    const envelope = [
      `<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:aut="http://ec.gob.sri.ws.autorizacion">`,
      `<soapenv:Header/>`,
      `<soapenv:Body>`,
      `<aut:autorizacionComprobante>`,
      `<claveAccesoComprobante>${claveAcceso}</claveAccesoComprobante>`,
      `</aut:autorizacionComprobante>`,
      `</soapenv:Body>`,
      `</soapenv:Envelope>`,
    ].join("");

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    let rawResponse = "";
    let httpStatus = 0;
    let errorMsg = "";

    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "text/xml;charset=UTF-8",
          // SOAPAction vacío — el SRI lee el Body directamente
        },
        body: envelope,
        signal: controller.signal,
      });
      clearTimeout(timeout);
      httpStatus = res.status;
      rawResponse = await res.text();
    } catch (e: any) {
      clearTimeout(timeout);
      errorMsg = e?.name === "AbortError"
        ? "TIMEOUT: El SRI no respondió en 15 segundos"
        : `ERROR DE RED: ${e.message}`;
    }

    return NextResponse.json({
      factura:       invoice.invoice_number,
      ambiente:      ambiente === "1" ? "PRUEBAS (celcer.sri.gob.ec)" : "PRODUCCIÓN (cel.sri.gob.ec)",
      clave_acceso:  claveAcceso,
      estado_local:  invoice.sri_status,
      url_consultada: url,
      http_status:   httpStatus,
      error_red:     errorMsg || null,
      respuesta_sri: rawResponse || null,
      // Extracción básica del estado
      estado_sri:    rawResponse.includes("AUTORIZADO") ? "AUTORIZADO"
                   : rawResponse.includes("NO AUTORIZADO") ? "NO AUTORIZADO"
                   : rawResponse.includes("EN PROCESO") ? "EN PROCESO"
                   : errorMsg ? "SIN CONEXIÓN"
                   : "DESCONOCIDO",
    });

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
