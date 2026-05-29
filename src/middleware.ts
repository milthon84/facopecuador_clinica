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

// Verifica acceso usando permisos almacenados en DB.
// Si la tabla no existe aún, hace fallback al canAccess hardcodeado.
async function checkAccess(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
    const { data: { user } } = await supabase.auth.getUser();

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
    const { data: { user } } = await supabase.auth.getUser();

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
