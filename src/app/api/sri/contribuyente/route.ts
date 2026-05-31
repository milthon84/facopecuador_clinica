import { NextResponse } from "next/server";

/**
 * Consulta datos del contribuyente en el SRI Ecuador.
 * Actúa como proxy del servidor para evitar CORS en el cliente.
 * GET /api/sri/contribuyente?ruc=1793235116001
 */

const SRI_ENDPOINTS = [
  (id: string) => `https://srienlinea.sri.gob.ec/movil-servicios/api/2.0/ruc/porIdentificacion/${id}`,
  (id: string) => `https://srienlinea.sri.gob.ec/movil-servicios/api/2.0/deudas/porIdentificacion/${id}`,
];

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const identificacion = searchParams.get("ruc")?.trim().replace(/[\s\-]/g, "");

  if (!identificacion) {
    return NextResponse.json({ error: "Identificación requerida" }, { status: 400 });
  }

  if (!/^\d{10}$/.test(identificacion) && !/^\d{13}$/.test(identificacion)) {
    return NextResponse.json({ error: "Formato inválido — debe ser cédula (10 dígitos) o RUC (13 dígitos)" }, { status: 400 });
  }

  const headers: Record<string, string> = {
    "Accept":          "application/json, text/plain, */*",
    "Accept-Language": "es-EC,es;q=0.9",
    "User-Agent":      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
    "Referer":         "https://srienlinea.sri.gob.ec/",
    "Origin":          "https://srienlinea.sri.gob.ec",
  };

  let lastError = "No se pudo conectar con el SRI";

  for (const buildUrl of SRI_ENDPOINTS) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 7000);

      const res = await fetch(buildUrl(identificacion), { headers, signal: controller.signal });
      clearTimeout(timeout);

      if (res.status === 404 || res.status === 204) {
        return NextResponse.json(
          { error: "Contribuyente no encontrado en el SRI" },
          { status: 404 }
        );
      }

      if (!res.ok) {
        lastError = `SRI respondió con error ${res.status}`;
        continue;
      }

      // Detectar redirect a página de mantenimiento (responde HTML en lugar de JSON)
      const contentType = res.headers.get("content-type") ?? "";
      if (!contentType.includes("application/json")) {
        const text = await res.text();
        if (text.includes("mantenimiento") || text.includes("<html") || text.includes("<!DOCTYPE")) {
          lastError = "El SRI está en mantenimiento o no es accesible desde este servidor";
          continue;
        }
      }

      const data = await res.json();
      const c = data?.contribuyente;

      if (!c?.razonSocial) {
        // Intenta estructura plana (algunos endpoints devuelven diferente)
        const razonSocial = data?.razonSocial ?? data?.nombreContribuyente ?? null;
        if (!razonSocial) {
          return NextResponse.json({ error: "Contribuyente no encontrado en el SRI" }, { status: 404 });
        }
        return NextResponse.json({ razonSocial, estado: data?.estadoContribuyenteRuc ?? null });
      }

      return NextResponse.json({
        razonSocial:          c.razonSocial,
        nombreComercial:      c.nombreComercial   ?? null,
        estado:               c.estadoContribuyenteRuc ?? null,
        tipo:                 c.tipoContribuyente ?? null,
        obligadoContabilidad: c.debeOblContabilidad ?? null,
        direccion:            data.establecimiento?.direccionCompleta ?? null,
      });

    } catch (err: any) {
      if (err?.name === "AbortError") {
        lastError = "El SRI no respondió a tiempo — intenta de nuevo";
      } else {
        lastError = "Error de red al consultar el SRI";
      }
      continue;
    }
  }

  return NextResponse.json({ error: lastError }, { status: 503 });
}
