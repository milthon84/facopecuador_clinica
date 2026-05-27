import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { generarClaveAcceso, generarXMLFactura, SRIInvoiceData } from "@/lib/sri";
import crypto from "crypto";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const supabase = createAdminClient();

    // 1. Obtener Configuración SRI
    const { data: config } = await supabase.from("sri_configs").select("*").single();
    if (!config) {
      return NextResponse.json({ error: "Configuración SRI no encontrada" }, { status: 400 });
    }

    // 2. Extraer datos del body
    const { patient_id, client_name, client_document, client_email, client_phone, client_address, items } = body;

    // Calcular totales
    let subtotal15 = 0;
    let subtotal0 = 0;
    
    const detalles: SRIInvoiceData["detalles"] = items.map((item: any, index: number) => {
      const q = Number(item.quantity);
      const pu = Number(item.unit_price);
      const desc = Number(item.discount || 0);
      const st = (q * pu) - desc;
      
      let ivaValor = 0;
      let tarifa = 0;
      let codigoPorcentaje = "0";

      if (item.iva_code === "4") { // 15% IVA
        tarifa = 15;
        ivaValor = st * 0.15;
        subtotal15 += st;
        codigoPorcentaje = "4";
      } else { // 0% IVA
        subtotal0 += st;
      }

      return {
        codigoPrincipal: `ITEM-${index + 1}`,
        descripcion: item.description,
        cantidad: q,
        precioUnitario: pu,
        descuento: desc,
        precioTotalSinImpuesto: st,
        ivaCodigoPorcentaje: codigoPorcentaje,
        ivaTarifa: tarifa,
        ivaValor: ivaValor
      };
    });

    const totalSinImpuestos = subtotal15 + subtotal0;
    const iva15 = subtotal15 * 0.15;
    const importeTotal = totalSinImpuestos + iva15;

    // 3. Generar Secuencial
    // Para simplificar, buscamos el max secuencial actual
    const { data: maxInv } = await supabase
      .from("invoices")
      .select("secuencial")
      .order("secuencial", { ascending: false })
      .limit(1)
      .single();
    
    const secuencial = (maxInv?.secuencial || 0) + 1;
    const secString = secuencial.toString().padStart(9, "0");
    const invoiceNumber = `${config.establecimiento}-${config.punto_emision}-${secString}`;

    // 4. Fechas y Códigos
    const now = new Date();
    const fechaEmision = `${now.getDate().toString().padStart(2, "0")}/${(now.getMonth() + 1).toString().padStart(2, "0")}/${now.getFullYear()}`;
    const codigoNumerico = crypto.randomInt(10000000, 99999999).toString();

    // 5. Generar Clave de Acceso
    const claveAcceso = generarClaveAcceso({
      fechaEmision,
      tipoComprobante: "01",
      ruc: config.ruc,
      ambiente: config.ambiente as "1" | "2",
      establecimiento: config.establecimiento,
      puntoEmision: config.punto_emision,
      secuencial: secString,
      codigoNumerico,
      tipoEmision: "1",
    });

    // 6. Generar XML Base
    const invoiceData: SRIInvoiceData = {
      ambiente: config.ambiente as "1" | "2",
      tipoEmision: "1",
      razonSocial: config.razon_social,
      nombreComercial: config.nombre_comercial,
      ruc: config.ruc,
      claveAcceso,
      codDoc: "01",
      estab: config.establecimiento,
      ptoEmi: config.punto_emision,
      secuencial: secString,
      dirMatriz: config.direccion_matriz,
      fechaEmision,
      obligadoContabilidad: config.obligado_contabilidad ? "SI" : "NO",
      
      tipoIdentificacionComprador: client_document.length === 10 ? "05" : "04", // Simplificación
      razonSocialComprador: client_name,
      identificacionComprador: client_document,
      direccionComprador: client_address || "S/N",
      
      totalSinImpuestos,
      totalDescuento: items.reduce((acc: number, i: any) => acc + Number(i.discount || 0), 0),
      
      subtotal15,
      iva15,
      subtotal0,
      subtotalNoObjeto: 0,
      subtotalExento: 0,
      propina: 0,
      importeTotal,
      moneda: "DOLAR",
      
      pagos: [{ formaPago: "01", total: importeTotal }], // 01 = Sin uso del sist financiero
      detalles,
      infoAdicional: client_email ? { Email: client_email, Teléfono: client_phone || "" } : undefined
    };

    const xmlFactura = generarXMLFactura(invoiceData);

    // 7. Guardar Factura en Base de Datos (MOCK DE AUTORIZACIÓN PARA SIMULADOR)
    // En un entorno real, aquí se firmaría el XML y se enviaría al WSDL del SRI.
    // Nosotros lo marcaremos como 'authorized' directamente en el simulador.
    
    const { data: invoice, error: invoiceError } = await supabase.from("invoices").insert({
      patient_id: patient_id || null,
      client_name,
      client_document,
      client_email,
      client_phone,
      client_address,
      invoice_number: invoiceNumber,
      secuencial,
      subtotal_15: subtotal15,
      subtotal_0: subtotal0,
      iva_amount: iva15,
      total: importeTotal,
      sri_access_key: claveAcceso,
      sri_status: "authorized", // Simulación exitosa
      sri_authorization_number: claveAcceso,
      sri_authorization_date: new Date().toISOString(),
      sri_environment: config.ambiente,
    }).select().single();

    if (invoiceError) throw invoiceError;

    // Guardar Ítems
    const itemsToInsert = detalles.map(d => ({
      invoice_id: invoice.id,
      description: d.descripcion,
      quantity: d.cantidad,
      unit_price: d.precioUnitario,
      discount: d.descuento,
      iva_code: d.ivaCodigoPorcentaje,
      total: d.precioTotalSinImpuesto + d.ivaValor,
    }));

    await supabase.from("invoice_items").insert(itemsToInsert);

    // NOTA: El PDF y el Correo se generarían/enviarían asíncronamente aquí usando Resend.
    // Para simplificar la prueba, retornamos éxito.

    return NextResponse.json({ 
      success: true, 
      invoice_id: invoice.id,
      clave_acceso: claveAcceso,
      xml: xmlFactura // Retornamos el XML generado para propósitos de demostración
    });

  } catch (error: any) {
    console.error("Error en facturación:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
