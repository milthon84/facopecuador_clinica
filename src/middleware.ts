import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { canAccess } from "@/lib/roles";
import type { UserRole } from "@/lib/roles";

function addSecurityHeaders(res: NextResponse): NextResponse {
  res.headers.set("X-Frame-Options", "DENY");
  res.headers.set("X-Content-Type-Options", "nosniff");
  res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  res.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  if (process.env.NODE_ENV === "production") {
    res.headers.set("Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload");
  }
  return res;
}

function buildSupabaseClient(req: NextRequest, res: NextResponse) {
  return createServerClient(
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
}

function isWritePath(pathname: string): boolean {
  const normalized = pathname.toLowerCase();
  return (
    normalized.endsWith("/nueva") ||
    normalized.includes("/nueva/") ||
    normalized.endsWith("/nuevo") ||
    normalized.includes("/nuevo/") ||
    normalized.endsWith("/crear") ||
    normalized.includes("/crear/") ||
    normalized.endsWith("/editar-ficha") ||
    normalized.endsWith("/atencion") ||
    normalized.includes("/atencion/") ||
    normalized.endsWith("/transacciones/crear")
  );
}

function getModifyPathForPathname(pathname: string): string {
  if (pathname.startsWith("/gestion/pacientes")) {
    return "/gestion/pacientes/modificar";
  }
  if (pathname.startsWith("/gestion/inventario")) {
    return "/gestion/inventario/modificar";
  }
  if (pathname.startsWith("/gestion/caja-general")) {
    return "/gestion/caja-general/modificar";
  }
  if (pathname.startsWith("/gestion/caja-chica")) {
    return "/gestion/caja-chica/modificar";
  }
  if (pathname.startsWith("/gestion/cuentas-por-cobrar")) {
    return "/gestion/cuentas-por-cobrar/modificar";
  }
  if (pathname.startsWith("/gestion/cuentas-por-pagar")) {
    return "/gestion/cuentas-por-pagar/modificar";
  }
  if (pathname.startsWith("/gestion/bancos")) {
    return "/gestion/bancos/modificar";
  }
  if (pathname.startsWith("/gestion/activos")) {
    return "/gestion/activos/modificar";
  }
  if (pathname.startsWith("/gestion/facturacion/config")) {
    return "/gestion/facturacion/config/modificar";
  }
  if (pathname.startsWith("/gestion/facturacion")) {
    return "/gestion/facturacion/modificar";
  }
  if (pathname.startsWith("/gestion/gastos")) {
    return "/gestion/gastos/modificar";
  }
  if (pathname.startsWith("/gestion/contabilidad")) {
    return "/gestion/contabilidad/modificar";
  }
  if (pathname.startsWith("/gestion/usuarios")) {
    return "/gestion/usuarios/modificar";
  }
  if (pathname.startsWith("/gestion/horarios")) {
    return "/gestion/horarios/modificar";
  }
  if (pathname.startsWith("/gestion/bloqueos")) {
    return "/gestion/bloqueos/modificar";
  }
  if (pathname.startsWith("/gestion/categorias")) {
    return "/gestion/categorias/modificar";
  }
  if (pathname.startsWith("/gestion/unidades")) {
    return "/gestion/unidades/modificar";
  }
  if (pathname.startsWith("/gestion/servicios")) {
    return "/gestion/servicios/modificar";
  }
  if (pathname.startsWith("/gestion/calendario")) {
    return "/gestion/calendario/modificar";
  }
  return "/gestion/modificar";
}

// Verifica acceso usando permisos almacenados en DB.
// Si la tabla no existe aún, hace fallback al canAccess hardcodeado.
async function checkAccess(
  supabase: any,
  role: string,
  pathname: string
): Promise<boolean> {
  if (role === "admin") return true;

  try {
    const { data, error } = await supabase
      .from("role_permissions")
      .select("path")
      .eq("role_name", role);

    if (error) throw error;

    const paths: string[] = (data || []).map((p: { path: string }) => p.path);
    
    // Si la ruta es de escritura, requerimos explícitamente el permiso de modificación
    if (isWritePath(pathname)) {
      const requiredModifyPath = getModifyPathForPathname(pathname);
      return paths.includes(requiredModifyPath);
    }

    return paths.some(p => pathname === p || pathname.startsWith(p + "/"));
  } catch {
    // Fallback: usa la función hardcodeada si la DB no está disponible
    return canAccess(role as UserRole, pathname);
  }
}

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const { pathname } = req.nextUrl;

  addSecurityHeaders(res);

  // ── Proteger rutas del panel de administración ─────────────────────────
  if (pathname.startsWith("/gestion") && pathname !== "/gestion/login") {
    const supabase = buildSupabaseClient(req, res);
    let user = null;
    try {
      const { data } = await supabase.auth.getUser();
      user = data.user;
    } catch (err) {
      console.error("Error fetching user in middleware path check:", err);
    }

    if (!user) {
      const url = req.nextUrl.clone();
      url.pathname = "/gestion/login";
      url.searchParams.set("redirect", pathname);
      const redirect = NextResponse.redirect(url);
      addSecurityHeaders(redirect);
      return redirect;
    }

    const role = (user.app_metadata?.role as string) ?? "recepcionista";

    if (!(await checkAccess(supabase, role, pathname))) {
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
    const supabase = buildSupabaseClient(req, res);
    let user = null;
    try {
      const { data } = await supabase.auth.getUser();
      user = data.user;
    } catch (err) {
      console.error("Error fetching user in middleware API check:", err);
    }

    if (!user) {
      return NextResponse.json(
        { error: "No autorizado" },
        { status: 401, headers: res.headers }
      );
    }

    const role = (user.app_metadata?.role as string) ?? "recepcionista";
    const adminOnlyApis = [
      "/api/admin/usuarios",
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
    "/gestion/:path*",
    "/api/admin/:path*",
    "/((?!_next/static|_next/image|favicon.ico|logo.png).*)",
  ],
};
