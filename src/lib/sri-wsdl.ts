/**
 * Cliente SOAP para los web services del SRI Ecuador.
 * No requiere librería soap externa — usa fetch nativo con envelopes manuales.
 */

// ── Endpoints ──────────────────────────────────────────────────────────────

const ENDPOINTS = {
  recepcion: {
    "1": "https://celcer.sri.gob.ec/comprobantes-electronicos-ws/RecepcionComprobantesOffline",
    "2": "https://cel.sri.gob.ec/comprobantes-electronicos-ws/RecepcionComprobantesOffline",
  },
  autorizacion: {
    "1": "https://celcer.sri.gob.ec/comprobantes-electronicos-ws/AutorizacionComprobantesOffline",
    "2": "https://cel.sri.gob.ec/comprobantes-electronicos-ws/AutorizacionComprobantesOffline",
  },
} as const;

// ── Tipos de respuesta ─────────────────────────────────────────────────────

export interface SriRecepcionResult {
  estado: "RECIBIDA" | "DEVUELTA";
  comprobantes?: Array<{
    claveAcceso: string;
    mensajes: Array<{ identificador: string; mensaje: string; informacionAdicional?: string; tipo: string }>;
  }>;
}

export interface SriAutorizacionResult {
  estado: "AUTORIZADO" | "NO AUTORIZADO" | "EN PROCESO";
  numeroAutorizacion?: string;
  fechaAutorizacion?: string;
  ambiente?: string;
  mensajes?: Array<{ identificador: string; mensaje: string; informacionAdicional?: string; tipo: string }>;
}

// ── SOAP helpers ───────────────────────────────────────────────────────────

async function soapPost(url: string, body: string, soapAction: string): Promise<string> {
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "text/xml; charset=utf-8",
      "SOAPAction": soapAction,
    },
    body,
    signal: AbortSignal.timeout(30_000),
  });
  return res.text();
}

function extractTag(xml: string, tag: string): string {
  const m = xml.match(new RegExp(`<(?:[^:]+:)?${tag}[^>]*>([\\s\\S]*?)<\/(?:[^:]+:)?${tag}>`, "i"));
  return m ? m[1].trim() : "";
}

function extractAllTags(xml: string, tag: string): string[] {
  const re = new RegExp(`<(?:[^:]+:)?${tag}[^>]*>([\\s\\S]*?)<\/(?:[^:]+:)?${tag}>`, "gi");
  const results: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml)) !== null) results.push(m[1].trim());
  return results;
}

// ── Recepción ──────────────────────────────────────────────────────────────

/**
 * Envía el XML firmado al SRI para recepción.
 * El XML debe ir codificado en Base64.
 */
export async function enviarComprobante(
  signedXml: string,
  ambiente: "1" | "2"
): Promise<SriRecepcionResult> {
  const xmlBase64 = Buffer.from(signedXml, "utf8").toString("base64");

  const envelope = [
    `<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ec="http://ec.gob.sri.ws.recepcion">`,
    `<soapenv:Header/>`,
    `<soapenv:Body>`,
    `<ec:validarComprobante>`,
    `<xml>${xmlBase64}</xml>`,
    `</ec:validarComprobante>`,
    `</soapenv:Body>`,
    `</soapenv:Envelope>`,
  ].join("");

  const responseXml = await soapPost(
    ENDPOINTS.recepcion[ambiente],
    envelope,
    "validarComprobante"
  );

  const estado = extractTag(responseXml, "estado") as "RECIBIDA" | "DEVUELTA";

  const comprobantesRaw = extractAllTags(responseXml, "comprobante");
  const comprobantes = comprobantesRaw.map((c) => ({
    claveAcceso: extractTag(c, "claveAcceso"),
    mensajes: extractAllTags(c, "mensaje").map((m) => ({
      identificador:       extractTag(m, "identificador"),
      mensaje:             extractTag(m, "mensaje"),
      informacionAdicional: extractTag(m, "informacionAdicional"),
      tipo:                extractTag(m, "tipo"),
    })),
  }));

  return { estado, comprobantes };
}

// ── Autorización ───────────────────────────────────────────────────────────

/**
 * Consulta el estado de autorización de un comprobante por clave de acceso.
 * Puede llamarse inmediatamente o en un retry posterior si el SRI responde "EN PROCESO".
 */
export async function consultarAutorizacion(
  claveAcceso: string,
  ambiente: "1" | "2"
): Promise<SriAutorizacionResult> {
  const envelope = [
    `<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ec="http://ec.gob.sri.ws.autorizacion">`,
    `<soapenv:Header/>`,
    `<soapenv:Body>`,
    `<ec:autorizacionComprobante>`,
    `<claveAccesoComprobante>${claveAcceso}</claveAccesoComprobante>`,
    `</ec:autorizacionComprobante>`,
    `</soapenv:Body>`,
    `</soapenv:Envelope>`,
  ].join("");

  const responseXml = await soapPost(
    ENDPOINTS.autorizacion[ambiente],
    envelope,
    "autorizacionComprobante"
  );

  const autorizacionXml = extractTag(responseXml, "autorizacion");
  if (!autorizacionXml) return { estado: "EN PROCESO" };

  const estado = extractTag(autorizacionXml, "estado") as SriAutorizacionResult["estado"];
  const numeroAutorizacion = extractTag(autorizacionXml, "numeroAutorizacion");
  const fechaAutorizacion  = extractTag(autorizacionXml, "fechaAutorizacion");
  const ambienteResp       = extractTag(autorizacionXml, "ambiente");

  const mensajesRaw = extractAllTags(autorizacionXml, "mensaje");
  const mensajes = mensajesRaw.map((m) => ({
    identificador:       extractTag(m, "identificador"),
    mensaje:             extractTag(m, "mensaje"),
    informacionAdicional: extractTag(m, "informacionAdicional"),
    tipo:                extractTag(m, "tipo"),
  }));

  return {
    estado,
    numeroAutorizacion: numeroAutorizacion || undefined,
    fechaAutorizacion:  fechaAutorizacion  || undefined,
    ambiente:           ambienteResp       || undefined,
    mensajes:           mensajes.length > 0 ? mensajes : undefined,
  };
}

/**
 * Envía y espera autorización con un retry si el SRI responde "EN PROCESO".
 */
export async function enviarYAutorizar(
  signedXml: string,
  claveAcceso: string,
  ambiente: "1" | "2"
): Promise<{ recepcion: SriRecepcionResult; autorizacion: SriAutorizacionResult }> {
  const recepcion = await enviarComprobante(signedXml, ambiente);

  if (recepcion.estado === "DEVUELTA") {
    return { recepcion, autorizacion: { estado: "NO AUTORIZADO" } };
  }

  // Esperar 3s antes de consultar (SRI necesita procesar)
  await new Promise((r) => setTimeout(r, 3000));

  let autorizacion = await consultarAutorizacion(claveAcceso, ambiente);

  // Si está en proceso, reintentar una vez más tras 5s
  if (autorizacion.estado === "EN PROCESO") {
    await new Promise((r) => setTimeout(r, 5000));
    autorizacion = await consultarAutorizacion(claveAcceso, ambiente);
  }

  return { recepcion, autorizacion };
}
