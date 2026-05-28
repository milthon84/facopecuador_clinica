import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { canAccess } from "@/lib/roles";
import type { UserRole } from "@/lib/roles";

// ── Cabeceras de seguridad aplicadas a TODAS las respuestas ───────────────
function addSecurityHeaders(res: NextResponse): NextResponse {
  // Evitar que el sitio se incruste en iframes (clickjacking)
  res.headers.set("X-Frame-Options", "DENY");
  // Evitar que el navegador infiera el tipo de contenido
  res.headers.set("X-Content-Type-Options", "nosniff");
  // Controlar información del referrer
  res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  // Deshabilitar funciones del navegador no necesarias
  res.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  // Forzar HTTPS en producción
  if (process.env.NODE_ENV === "production") {
    res.headers.set("Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload");
  }
  return res;
}

// ── Verificación de sesión Supabase ───────────────────────────────────────
async function getAuthUser(req: NextRequest, res: NextResponse) {
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return req.cookies.getAll(); },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            res.cookies.set(name, value, options)
          );
        },
      },
    }
  );
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const { pathname } = req.nextUrl;

  // Aplicar headers de seguridad a todas las rutas
  addSecurityHeaders(res);

  // ── Proteger rutas del panel de administración ─────────────────────────
  if (pathname.startsWith("/gestion") && pathname !== "/gestion/login") {
    const user = await getAuthUser(req, res);

    if (!user) {
      const url = req.nextUrl.clone();
      url.pathname = "/gestion/login";
      url.searchParams.set("redirect", pathname);
      const redirect = NextResponse.redirect(url);
      addSecurityHeaders(redirect);
      return redirect;
    }

    const role = (user.app_metadata?.role as UserRole | undefined) ?? "admin";

    if (!canAccess(role, pathname)) {
      const url = req.nextUrl.clone();
      url.pathname = "/gestion";
      url.searchParams.set("denied", "1");
      const redirect = NextResponse.redirect(url);
      addSecurityHeaders(redirect);
      return redirect;
    }
  }

  // ── Proteger rutas API del panel admin ─────────────────────────────────
  if (pathname.startsWith("/api/admin")) {
    const user = await getAuthUser(req, res);

    if (!user) {
      return NextResponse.json(
        { error: "No autorizado" },
        { status: 401, headers: res.headers }
      );
    }

    // Bloquear acceso a rutas admin-only de API si el rol no lo permite
    const role = (user.app_metadata?.role as UserRole | undefined) ?? "admin";
    const adminOnlyApis = [
      "/api/admin/usuarios",
      "/api/admin/parametros",
      "/api/admin/auditoria",
    ];
    if (adminOnlyApis.some(r => pathname.startsWith(r)) && role !== "admin") {
      return NextResponse.json(
        { error: "Acceso denegado: se requiere rol admin" },
        { status: 403, headers: res.headers }
      );
    }
  }

  return res;
}

export const config = {
  matcher: [
    // Proteger panel admin y sus APIs
    "/gestion/:path*",
    "/api/admin/:path*",
    // Aplicar headers de seguridad a páginas públicas también
    "/((?!_next/static|_next/image|favicon.ico|logo.png).*)",
  ],
};
