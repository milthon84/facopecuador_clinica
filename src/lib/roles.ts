// =====================================================
// SISTEMA DE ROLES Y PERMISOS
// =====================================================

export type UserRole = "admin" | "recepcionista";

export const ROLE_LABELS: Record<UserRole, string> = {
  admin: "Administrador",
  recepcionista: "Recepcionista",
};

export const ROLE_COLORS: Record<UserRole, string> = {
  admin: "bg-lilac-100 text-lilac-800 border-lilac-300",
  recepcionista: "bg-blue-50 text-blue-800 border-blue-200",
};

// Rutas restringidas solo para admin (el resto es accesible a cualquier rol autenticado)
export const ADMIN_ONLY_ROUTES = [
  "/admin/horarios",
  "/admin/bloqueos",
  "/admin/inventario",
  "/admin/facturacion",
  "/admin/usuarios",
  "/admin/auditoria",
];

export function canAccess(role: UserRole | undefined, pathname: string): boolean {
  const effectiveRole = role || "recepcionista";
  if (effectiveRole === "admin") return true;
  // Recepcionista: bloquear rutas admin-only
  return !ADMIN_ONLY_ROUTES.some((r) => pathname.startsWith(r));
}

// Navegación por rol
export interface NavSection {
  label?: string;
  items: NavItemDef[];
}

export interface NavItemDef {
  href: string;
  label: string;
  icon: string;          // nombre del icono Lucide
  roles: UserRole[];     // qué roles pueden verlo
}

export const NAV_ITEMS: NavItemDef[] = [
  { href: "/admin",           label: "Hoy",             icon: "LayoutDashboard", roles: ["admin", "recepcionista"] },
  { href: "/admin/calendario",label: "Calendario",      icon: "CalendarDays",    roles: ["admin", "recepcionista"] },
  { href: "/admin/pacientes", label: "Pacientes",       icon: "Users",           roles: ["admin", "recepcionista"] },
  { href: "/admin/horarios",  label: "Horarios",        icon: "Clock",           roles: ["admin"] },
  { href: "/admin/bloqueos",  label: "Bloqueos",        icon: "Ban",             roles: ["admin"] },
  { href: "/admin/inventario",label: "Inventario",      icon: "Package",         roles: ["admin"] },
  { href: "/admin/facturacion",label: "Facturación SRI",icon: "FileText",        roles: ["admin"] },
  { href: "/admin/usuarios",  label: "Usuarios",        icon: "UserCog",         roles: ["admin"] },
  { href: "/admin/auditoria", label: "Auditoría",       icon: "ShieldCheck",     roles: ["admin"] },
];
