import Link from "next/link";
import {
  CalendarDays, LayoutDashboard, Users, Clock, Ban,
  Package, FileText, UserCog, ShieldCheck, ChevronRight, Settings, ShoppingCart, FileBarChart2,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import SignOutButton from "@/components/SignOutButton";
import AdminMobileNav from "@/components/AdminMobileNav";
import type { UserRole } from "@/lib/roles";
import { ROLE_LABELS, ROLE_COLORS, NAV_ITEMS } from "@/lib/roles";

export const dynamic = "force-dynamic";

// Mapa de iconos Lucide
const ICONS: Record<string, React.ReactNode> = {
  LayoutDashboard: <LayoutDashboard size={16} />,
  CalendarDays:    <CalendarDays size={16} />,
  Users:           <Users size={16} />,
  Clock:           <Clock size={16} />,
  Ban:             <Ban size={16} />,
  Package:         <Package size={16} />,
  FileText:        <FileText size={16} />,
  UserCog:         <UserCog size={16} />,
  ShieldCheck:     <ShieldCheck size={16} />,
  Settings:        <Settings size={16} />,
  ShoppingCart:    <ShoppingCart size={16} />,
  FileBarChart2:   <FileBarChart2 size={16} />,
};

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return <>{children}</>;

  // Rol del usuario (desde app_metadata, con fallback a 'admin' para retrocompatibilidad)
  const role = (user.app_metadata?.role as UserRole | undefined) ?? "admin";

  // Perfil del usuario
  let profileName: string | null = null;
  try {
    const adminClient = createAdminClient();
    const { data } = await adminClient
      .from("user_profiles")
      .select("full_name")
      .eq("id", user.id)
      .single();
    profileName = data?.full_name ?? null;
  } catch { /* ignorar si tabla no existe aún */ }

  const displayName = profileName || user.email?.split("@")[0] || "Usuario";
  const visibleNav = NAV_ITEMS.filter((item) => item.roles.includes(role));

  return (
    <div className="min-h-screen bg-lilac-50/30 text-ink-900">
      {/* Header móvil */}
      <header className="sticky top-0 z-40 shadow-sm">
        <div className="md:hidden bg-white border-b border-gray-100">
          <div className="px-4 py-2.5 flex items-center gap-3">
            <Link href="/gestion" className="flex-1">
              <img src="/logo.png" alt="Logo" className="h-8 w-auto object-contain" />
            </Link>
            <div className="w-8 h-8 rounded-full bg-lilac-100 border border-lilac-200 flex items-center justify-center text-xs font-bold text-lilac-700 shrink-0">
              {displayName.charAt(0).toUpperCase()}
            </div>
          </div>
        </div>

        {/* Header desktop */}
        <div className="hidden md:block bg-ink-900 text-white">
          <div className="max-w-7xl mx-auto px-4 py-2.5 flex items-center justify-between">
            <Link href="/gestion" className="flex items-center gap-3">
              <div className="bg-white px-2 py-0.5 rounded flex items-center justify-center h-8">
                <img src="/logo.png" alt="Logo" className="h-6 w-auto object-contain" />
              </div>
              <div className="flex flex-col leading-tight">
                <span className="font-bold text-gold-500 text-sm">Gestión Clínica</span>
                <span className="text-white/40 text-[10px] font-medium uppercase tracking-wide">
                  Sistema de administración
                </span>
              </div>
            </Link>
            <div className="flex items-center gap-3">
              <div className="flex flex-col items-end">
                <span className="text-sm font-medium text-white/90">{displayName}</span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${ROLE_COLORS[role]}`}>
                  {ROLE_LABELS[role]}
                </span>
              </div>
              <SignOutButton />
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto flex flex-col md:flex-row">
        {/* Sidebar — solo desktop */}
        <nav className="hidden md:block md:w-60 md:min-h-[calc(100vh-52px)] border-r border-lilac-100 bg-white shadow-sm">
          <div className="p-3 flex flex-col gap-1">
            <NavGroup label="Principal">
              {visibleNav.filter(i => ["/gestion", "/gestion/calendario", "/gestion/pacientes"].includes(i.href)).map((item) => (
                <NavItem key={item.href} href={item.href} icon={ICONS[item.icon]}>
                  {item.label}
                </NavItem>
              ))}
            </NavGroup>

            {role === "admin" && visibleNav.some(i => ["/gestion/horarios", "/gestion/bloqueos"].includes(i.href)) && (
              <NavGroup label="Configuración">
                {visibleNav.filter(i => ["/gestion/horarios", "/gestion/bloqueos"].includes(i.href)).map((item) => (
                  <NavItem key={item.href} href={item.href} icon={ICONS[item.icon]}>
                    {item.label}
                  </NavItem>
                ))}
              </NavGroup>
            )}

            {role === "admin" && (
              <NavGroup label="Clínica">
                {visibleNav.filter(i => ["/gestion/inventario", "/gestion/facturacion"].includes(i.href)).map((item) => (
                  <NavItem key={item.href} href={item.href} icon={ICONS[item.icon]}>
                    {item.label}
                  </NavItem>
                ))}
              </NavGroup>
            )}

            {role === "admin" && (
              <NavGroup label="Sistema">
                {visibleNav.filter(i => ["/gestion/usuarios", "/gestion/auditoria"].includes(i.href)).map((item) => (
                  <NavItem key={item.href} href={item.href} icon={ICONS[item.icon]}>
                    {item.label}
                  </NavItem>
                ))}
              </NavGroup>
            )}
          </div>
        </nav>

        <main className="flex-1 p-4 sm:p-6 min-w-0 pb-24 md:pb-6">{children}</main>
      </div>

      {/* Navegación inferior — solo móvil */}
      <AdminMobileNav role={role} displayName={displayName} />
    </div>
  );
}

function NavGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-row md:flex-col gap-1 mb-0 md:mb-2">
      <p className="hidden md:block text-[10px] font-bold text-ink-400 uppercase tracking-wider px-3 mb-1 mt-2">
        {label}
      </p>
      {children}
    </div>
  );
}

function NavItem({ href, icon, children }: { href: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="flex flex-shrink-0 items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-ink-800 hover:bg-lilac-50 hover:text-lilac-700 whitespace-nowrap transition-colors group"
    >
      <span className="text-ink-400 group-hover:text-lilac-600 transition-colors">{icon}</span>
      <span className="flex-1">{children}</span>
      <ChevronRight size={12} className="hidden md:block opacity-0 group-hover:opacity-40 transition-opacity" />
    </Link>
  );
}
