// =====================================================
// SISTEMA DE ROLES Y PERMISOS
// =====================================================

export type UserRole = "admin" | "recepcionista" | "contador";

export const ROLE_LABELS: Record<UserRole, string> = {
  admin:         "Administrador",
  recepcionista: "Recepcionista",
  contador:      "Contador",
};

export const ROLE_COLORS: Record<UserRole, string> = {
  admin:         "bg-lilac-100 text-lilac-800 border-lilac-300",
  recepcionista: "bg-blue-50 text-blue-800 border-blue-200",
  contador:      "bg-green-50 text-green-800 border-green-300",
};

// Rutas accesibles solo por admin
const ADMIN_ONLY_ROUTES = [
  "/gestion/horarios",
  "/gestion/bloqueos",
  "/gestion/inventario",
  "/gestion/usuarios",
  "/gestion/auditoria",
  "/gestion/parametros",
];

// Rutas accesibles por admin y contador (solo lectura contable)
const CONTADOR_ROUTES = [
  "/gestion/facturacion",
  "/gestion/gastos",
  "/gestion/contabilidad",
];

export function canAccess(role: UserRole | undefined, pathname: string): boolean {
  const r = role ?? "recepcionista";
  if (r === "admin") return true;
  if (r === "contador") {
    // Contador: solo rutas contables + dashboard
    const allowed = ["/gestion", ...CONTADOR_ROUTES];
    return allowed.some(p => pathname === p || pathname.startsWith(p + "/"));
  }
  // Recepcionista: bloquear rutas admin-only y contables
  const blocked = [...ADMIN_ONLY_ROUTES, ...CONTADOR_ROUTES];
  return !blocked.some(r => pathname.startsWith(r));
}

// Navegación por rol
export interface NavSection {
  label?: string;
  items: NavItemDef[];
}

export interface NavItemDef {
  href: string;
  label: string;
  icon: string;
  roles: UserRole[];
}

export const NAV_ITEMS: NavItemDef[] = [
  // Todos los roles autenticados
  { href: "/gestion",             label: "Hoy",             icon: "LayoutDashboard", roles: ["admin", "recepcionista"] },
  { href: "/gestion/calendario",  label: "Calendario",      icon: "CalendarDays",    roles: ["admin", "recepcionista"] },
  { href: "/gestion/pacientes",   label: "Pacientes",       icon: "Users",           roles: ["admin", "recepcionista"] },

  // Admin únicamente
  { href: "/gestion/horarios",    label: "Horarios",        icon: "Clock",           roles: ["admin"] },
  { href: "/gestion/bloqueos",    label: "Bloqueos",        icon: "Ban",             roles: ["admin"] },
  { href: "/gestion/inventario",  label: "Inventario",      icon: "Package",         roles: ["admin"] },

  // Admin y contador
  { href: "/gestion/facturacion", label: "Facturación SRI", icon: "FileText",        roles: ["admin", "contador"] },
  { href: "/gestion/gastos",      label: "Gastos",          icon: "ShoppingCart",    roles: ["admin", "contador"] },
  { href: "/gestion/contabilidad",label: "Contabilidad",    icon: "FileBarChart2",   roles: ["admin", "contador"] },

  // Solo admin
  { href: "/gestion/usuarios",    label: "Usuarios",        icon: "UserCog",         roles: ["admin"] },
  { href: "/gestion/auditoria",   label: "Auditoría",       icon: "ShieldCheck",     roles: ["admin"] },
  { href: "/gestion/parametros",  label: "Parámetros",      icon: "Settings",        roles: ["admin"] },
];

// Dashboard de bienvenida para el contador
export const CONTADOR_DASHBOARD_ITEMS = [
  { href: "/gestion/facturacion", label: "Facturación SRI", desc: "Facturas emitidas y autorizadas",  icon: "FileText" },
  { href: "/gestion/gastos",      label: "Gastos",          desc: "Registro de gastos y compras",     icon: "ShoppingCart" },
  { href: "/gestion/contabilidad",label: "Contabilidad",    desc: "Libros, reportes y declaraciones", icon: "FileBarChart2" },
];
