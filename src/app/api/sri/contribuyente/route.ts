import { NextResponse } from "next/server";

/**
 * Consulta datos del contribuyente en el SRI Ecuador.
 * Proxy server-side para evitar CORS en el cliente.
 * GET /api/sri/contribuyente?ruc=1718372335   (cédula — agrega 001 automáticamente)
 * GET /api/sri/contribuyente?ruc=1793235116001 (RUC completo)
 */

const HEADERS: Record<string, string> = {
  "Accept":          "application/json, text/plain, */*",
  "Accept-Language": "es-EC,es;q=0.9,en;q=0.8",
  "User-Agent":      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Referer":         "https://srienlinea.sri.gob.ec/sri-en-linea/",
  "Origin":          "https://srienlinea.sri.gob.ec",
};

async function fetchSRI(ruc: string): Promise<{ ok: boolean; data?: any; error?: string }> {
  const urls = [
    `https://srienlinea.sri.gob.ec/movil-servicios/api/2.0/ruc/porIdentificacion/${ruc}`,
    `https://srienlinea.sri.gob.ec/movil-servicios/api/2.0/contribuyente/porRuc/${ruc}`,
  ];

  for (const url of urls) {
    try {
      const controller = new AbortController();
      const tid = setTimeout(() => controller.abort(), 8000);
      const res = await fetch(url, { headers: HEADERS, signal: controller.signal });
      clearTimeout(tid);

      if (res.status === 404 || res.status === 204) return { ok: false, error: "not_found" };
      if (!res.ok) continue;

      const ct = res.headers.get("content-type") ?? "";
      if (!ct.includes("json")) {
        const txt = await res.text();
        if (txt.includes("mantenimiento") || txt.includes("<html")) continue;
        return { ok: false, error: "maintenance" };
      }

      const data = await res.json();
      return { ok: true, data };
    } catch (e: any) {
      if (e?.name === "AbortError") return { ok: false, error: "timeout" };
      continue;
    }
  }

  return { ok: false, error: "unreachable" };
}

function extractContribuyente(data: any) {
  const c = data?.contribuyente ?? data;
  const razonSocial =
    c?.razonSocial ??
    c?.nombreContribuyente ??
    data?.razonSocial ??
    null;

  if (!razonSocial) return null;

  return {
    razonSocial,
    nombreComercial:      c?.nombreComercial      ?? null,
    estado:               c?.estadoContribuyenteRuc ?? data?.estado ?? null,
    tipo:                 c?.tipoContribuyente    ?? null,
    obligadoContabilidad: c?.debeOblContabilidad  ?? null,
    direccion:            data?.establecimiento?.direccionCompleta ?? null,
  };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const raw = searchParams.get("ruc")?.trim().replace(/[\s\-]/g, "");

  if (!raw) {
    return NextResponse.json({ error: "Identificación requerida" }, { status: 400 });
  }

  // Validar formato
  const isCedula = /^\d{10}$/.test(raw);
  const isRUC    = /^\d{13}$/.test(raw);

  if (!isCedula && !isRUC) {
    return NextResponse.json(
      { error: "Debe ser cédula (10 dígitos) o RUC (13 dígitos)" },
      { status: 400 }
    );
  }

  // Para cédula de persona natural, el RUC en el SRI es cédula + "001"
  const candidatos = isCedula ? [`${raw}001`, raw] : [raw];

  for (const ruc of candidatos) {
    const result = await fetchSRI(ruc);

    if (!result.ok) {
      if (result.error === "not_found") continue; // intentar siguiente candidato
      if (result.error === "timeout")   return NextResponse.json({ error: "El SRI no respondió a tiempo — intenta de nuevo" }, { status: 503 });
      if (result.error === "maintenance") return NextResponse.json({ error: "El SRI está en mantenimiento — intenta más tarde" }, { status: 503 });
      if (result.error === "unreachable") return NextResponse.json({ error: "No se pudo conectar con el SRI" }, { status: 503 });
      continue;
    }

    const contribuyente = extractContribuyente(result.data);
    if (contribuyente) return NextResponse.json(contribuyente);
  }

  return NextResponse.json(
    { error: "Contribuyente no encontrado en el SRI" },
    { status: 404 }
  );
}
