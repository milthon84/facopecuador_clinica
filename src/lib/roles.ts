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

// Rutas accesibles solo por admin (fallback cuando DB no está disponible)
const ADMIN_ONLY_ROUTES = [
  "/gestion/horarios",
  "/gestion/bloqueos",
  "/gestion/inventario",
  "/gestion/categorias",
  "/gestion/unidades",
  "/gestion/servicios",
  "/gestion/facturacion/config",
  "/gestion/usuarios",
  "/gestion/roles",
  "/gestion/auditoria",
];

// Rutas accesibles por admin y contador (fallback)
const CONTADOR_ROUTES = [
  "/gestion/facturacion",
  "/gestion/gastos",
  "/gestion/contabilidad",
];

// Fallback: usado cuando la DB no está disponible (p.ej. durante desarrollo)
export function canAccess(role: UserRole | undefined, pathname: string): boolean {
  const r = role ?? "recepcionista";
  if (r === "admin") return true;
  if (r === "contador") {
    const allowed = ["/gestion", ...CONTADOR_ROUTES];
    return allowed.some(p => pathname === p || pathname.startsWith(p + "/"));
  }
  const blocked = [...ADMIN_ONLY_ROUTES, ...CONTADOR_ROUTES];
  return !blocked.some(r => pathname.startsWith(r));
}

// ── Recursos configurables por rol ────────────────────────────────────────
// Lista de todas las rutas que se pueden asignar a un rol desde el panel
export const ALL_RESOURCES = [
  { section: "Principal",     path: "/gestion",              label: "Dashboard (Hoy)" },
  { section: "Principal",     path: "/gestion/calendario",   label: "Calendario" },
  { section: "Principal",     path: "/gestion/pacientes",    label: "Pacientes" },
  { section: "Configuración", path: "/gestion/horarios",    label: "Horarios" },
  { section: "Configuración", path: "/gestion/bloqueos",    label: "Bloqueos" },
  { section: "Configuración", path: "/gestion/categorias",  label: "Categorías de Insumos" },
  { section: "Configuración", path: "/gestion/unidades",    label: "Unidades de Medida" },
  { section: "Configuración", path: "/gestion/servicios",   label: "Catálogo de Servicios" },
  { section: "Clínica",       path: "/gestion/inventario",   label: "Inventario" },
  { section: "Clínica",       path: "/gestion/caja-general",        label: "Caja General" },
  { section: "Clínica",       path: "/gestion/caja-chica",          label: "Caja Chica" },
  { section: "Clínica",       path: "/gestion/cuentas-por-cobrar",  label: "Cuentas por Cobrar" },
  { section: "Clínica",       path: "/gestion/cuentas-por-pagar",   label: "Cuentas por Pagar" },
  { section: "Clínica",       path: "/gestion/bancos",     label: "Bancos" },
  { section: "Clínica",       path: "/gestion/activos",  label: "Activos Fijos" },
  { section: "Clínica",       path: "/gestion/facturacion",  label: "Facturación SRI" },
  { section: "Clínica",       path: "/gestion/gastos",       label: "Gastos / Compras" },
  { section: "Clínica",       path: "/gestion/contabilidad", label: "Contabilidad" },
  { section: "Sistema",       path: "/gestion/facturacion/config", label: "Config. SRI" },
  { section: "Sistema",       path: "/gestion/usuarios",     label: "Usuarios" },
  { section: "Sistema",       path: "/gestion/auditoria",    label: "Auditoría" },
] as const;

export const RESOURCE_SECTIONS = ["Principal", "Configuración", "Clínica", "Sistema"] as const;

// ── Navegación ────────────────────────────────────────────────────────────
export interface NavItemDef {
  href: string;
  label: string;
  icon: string;
  section: "Principal" | "Configuración" | "Clínica" | "Sistema";
  roles: UserRole[]; // usado como fallback cuando DB no está disponible
}

export const NAV_SECTIONS = ["Principal", "Configuración", "Clínica", "Sistema"] as const;

export const NAV_ITEMS: NavItemDef[] = [
  { href: "/gestion",              label: "Hoy",             icon: "LayoutDashboard", section: "Principal",     roles: ["admin", "recepcionista"] },
  { href: "/gestion/calendario",   label: "Calendario",      icon: "CalendarDays",    section: "Principal",     roles: ["admin", "recepcionista"] },
  { href: "/gestion/pacientes",    label: "Pacientes",       icon: "Users",           section: "Principal",     roles: ["admin", "recepcionista"] },
  { href: "/gestion/horarios",     label: "Horarios",            icon: "Clock",        section: "Configuración", roles: ["admin"] },
  { href: "/gestion/bloqueos",     label: "Bloqueos",            icon: "Ban",          section: "Configuración", roles: ["admin"] },
  { href: "/gestion/categorias",   label: "Categorías de Insumos", icon: "Tag",        section: "Configuración", roles: ["admin"] },
  { href: "/gestion/unidades",     label: "Unidades de Medida",  icon: "Ruler",        section: "Configuración", roles: ["admin"] },
  { href: "/gestion/servicios",    label: "Catálogo de Servicios", icon: "Stethoscope", section: "Configuración", roles: ["admin"] },
  { href: "/gestion/inventario",   label: "Inventario",      icon: "Package",         section: "Clínica",       roles: ["admin"] },
  { href: "/gestion/caja-general",        label: "Caja General",        icon: "Banknote",        section: "Clínica", roles: ["admin", "contador"] },
  { href: "/gestion/caja-chica",          label: "Caja Chica",          icon: "Wallet",          section: "Clínica", roles: ["admin", "contador"] },
  { href: "/gestion/cuentas-por-cobrar", label: "Cuentas por Cobrar",  icon: "CircleDollarSign", section: "Clínica", roles: ["admin", "contador"] },
  { href: "/gestion/cuentas-por-pagar",  label: "Cuentas por Pagar",   icon: "CreditCard",       section: "Clínica", roles: ["admin", "contador"] },
  { href: "/gestion/bancos",        label: "Bancos",           icon: "Building2",  section: "Clínica", roles: ["admin", "contador"] },
  { href: "/gestion/activos",       label: "Activos Fijos",    icon: "Landmark",   section: "Clínica", roles: ["admin", "contador"] },
  { href: "/gestion/facturacion",  label: "Facturación SRI", icon: "FileText",        section: "Clínica",       roles: ["admin", "contador"] },
  { href: "/gestion/gastos",        label: "Gastos / Compras", icon: "ShoppingCart",    section: "Clínica",       roles: ["admin", "contador"] },
  { href: "/gestion/contabilidad", label: "Contabilidad",    icon: "FileBarChart2",   section: "Clínica",       roles: ["admin", "contador"] },
  { href: "/gestion/facturacion/config", label: "Config. SRI",  icon: "FileKey",         section: "Sistema",       roles: ["admin"] },
  { href: "/gestion/usuarios",     label: "Usuarios",        icon: "UserCog",         section: "Sistema",       roles: ["admin"] },
  { href: "/gestion/roles",        label: "Roles",           icon: "Shield",          section: "Sistema",       roles: ["admin"] },
  { href: "/gestion/auditoria",    label: "Auditoría",       icon: "ShieldCheck",     section: "Sistema",       roles: ["admin"] },
];

// Dashboard de bienvenida para el contador (sin cambios)
export const CONTADOR_DASHBOARD_ITEMS = [
  { href: "/gestion/facturacion", label: "Facturación SRI", desc: "Facturas emitidas y autorizadas",  icon: "FileText" },
  { href: "/gestion/gastos",      label: "Gastos",          desc: "Registro de gastos y compras",     icon: "ShoppingCart" },
  { href: "/gestion/contabilidad",label: "Contabilidad",    desc: "Libros, reportes y declaraciones", icon: "FileBarChart2" },
];
