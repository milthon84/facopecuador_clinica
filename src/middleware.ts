import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { canAccess } from "@/lib/roles";
import type { UserRole } from "@/lib/roles";

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const { pathname } = req.nextUrl;

  // Solo proteger rutas /admin (excepto /admin/login)
  if (!pathname.startsWith("/admin") || pathname === "/admin/login") {
    return res;
  }

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

  // Sin sesión → login
  if (!user) {
    const url = req.nextUrl.clone();
    url.pathname = "/admin/login";
    return NextResponse.redirect(url);
  }

  // Obtener rol del app_metadata (seteado al crear usuario vía admin API)
  // undefined → tratamos como 'admin' para retrocompatibilidad con usuario inicial
  const role = (user.app_metadata?.role as UserRole | undefined) ?? "admin";

  // Verificar permiso de acceso a la ruta
  if (!canAccess(role, pathname)) {
    // Redirigir a inicio con mensaje de acceso denegado
    const url = req.nextUrl.clone();
    url.pathname = "/admin";
    url.searchParams.set("denied", "1");
    return NextResponse.redirect(url);
  }

  return res;
}

export const config = {
  matcher: ["/admin/:path*"],
};
