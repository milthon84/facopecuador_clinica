// =====================================================
// SISTEMA DE ROLES Y PERMISOS
// =====================================================

export type UserRole = string;

export const ROLE_LABELS: Record<string, string> = {
  admin:         "Administrador",
  recepcionista: "Recepcionista",
  contador:      "Contador",
};

export const ROLE_COLORS: Record<string, string> = {
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

export function isWritePath(path: string): boolean {
  const normalized = path.toLowerCase();
  return (
    normalized === "/gestion/modificar" ||
    normalized.startsWith("/gestion/modificar/") ||
    normalized.endsWith("/modificar") ||
    normalized.includes("/modificar/") ||
    normalized.endsWith("/crear") ||
    normalized.includes("/crear/")
  );
}

// Helper para verificar permisos dinámicos (base de datos o estáticos)
export function hasPermission(
  role: string,
  pathToCheck: string,
  allowedPathsFromDb: string[] | null
): boolean {
  if (role === "admin") return true;
  if (allowedPathsFromDb !== null) {
    return allowedPathsFromDb.some((p) => {
      // Si la ruta a verificar es de escritura, solo se concede si el permiso otorgado es también de escritura
      if (isWritePath(pathToCheck)) {
        if (!isWritePath(p)) return false;
      }
      return pathToCheck === p || pathToCheck.startsWith(p + "/");
    });
  }
  return canAccess(role as UserRole, pathToCheck);
}

export interface ResourceDef {
  section: "Principal" | "Configuración" | "Clínica" | "Sistema";
  path: string;
  label: string;
  hasEdit: boolean;
}

// ── Recursos configurables por rol ────────────────────────────────────────
// Lista de todas las rutas que se pueden asignar a un rol desde el panel
export const ALL_RESOURCES: readonly ResourceDef[] = [
  // Principal
  { section: "Principal",     path: "/gestion",              label: "Agenda", hasEdit: true },
  { section: "Principal",     path: "/gestion/calendario",   label: "Calendario", hasEdit: true },
  { section: "Principal",     path: "/gestion/pacientes",    label: "Pacientes", hasEdit: true },

  // Configuración
  { section: "Configuración", path: "/gestion/horarios",    label: "Horarios", hasEdit: true },
  { section: "Configuración", path: "/gestion/bloqueos",    label: "Bloqueos", hasEdit: true },
  { section: "Configuración", path: "/gestion/categorias",  label: "Categorías de Insumos", hasEdit: true },
  { section: "Configuración", path: "/gestion/unidades",    label: "Unidades de Medida", hasEdit: true },
  { section: "Configuración", path: "/gestion/servicios",   label: "Catálogo de Servicios", hasEdit: true },

  // Clínica
  { section: "Clínica",       path: "/gestion/inventario",   label: "Inventario", hasEdit: true },
  { section: "Clínica",       path: "/gestion/inventario/transacciones",   label: "Movimientos de Inventario", hasEdit: true },
  { section: "Clínica",       path: "/gestion/caja-general",        label: "Caja General", hasEdit: true },
  { section: "Clínica",       path: "/gestion/caja-chica",          label: "Caja Chica", hasEdit: true },
  { section: "Clínica",       path: "/gestion/cuentas-por-cobrar",  label: "Cuentas por Cobrar", hasEdit: true },
  { section: "Clínica",       path: "/gestion/cuentas-por-pagar",   label: "Cuentas por Pagar", hasEdit: true },
  { section: "Clínica",       path: "/gestion/bancos",     label: "Bancos", hasEdit: true },
  { section: "Clínica",       path: "/gestion/activos",  label: "Activos Fijos", hasEdit: true },
  { section: "Clínica",       path: "/gestion/facturacion",  label: "Facturación SRI", hasEdit: true },
  { section: "Clínica",       path: "/gestion/gastos",       label: "Gastos / Compras", hasEdit: true },
  { section: "Clínica",       path: "/gestion/contabilidad", label: "Contabilidad", hasEdit: true },

  // Sistema
  { section: "Sistema",       path: "/gestion/facturacion/config", label: "Config. SRI", hasEdit: true },
  { section: "Sistema",       path: "/gestion/usuarios",     label: "Usuarios", hasEdit: true },
  { section: "Sistema",       path: "/gestion/auditoria",    label: "Auditoría", hasEdit: false },
] as const;

export function getWritePathForResource(path: string): string {
  if (path === "/gestion/inventario/transacciones") {
    return "/gestion/inventario/transacciones/crear";
  }
  return path + "/modificar";
}

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
  { href: "/gestion",              label: "Agenda",          icon: "LayoutDashboard", section: "Principal",     roles: ["admin", "recepcionista"] },
  { href: "/gestion/calendario",   label: "Calendario",      icon: "CalendarDays",    section: "Principal",     roles: ["admin", "recepcionista"] },
  { href: "/gestion/pacientes",    label: "Pacientes",       icon: "Users",           section: "Principal",     roles: ["admin", "recepcionista"] },
  { href: "/gestion/horarios",     label: "Horarios",            icon: "Clock",        section: "Configuración", roles: ["admin"] },
  { href: "/gestion/bloqueos",     label: "Bloqueos",            icon: "Ban",          section: "Configuración", roles: ["admin"] },
  { href: "/gestion/categorias",   label: "Categorías de Insumos", icon: "Tag",        section: "Configuración", roles: ["admin"] },
  { href: "/gestion/unidades",     label: "Unidades de Medida",  icon: "Ruler",        section: "Configuración", roles: ["admin"] },
  { href: "/gestion/servicios",    label: "Catálogo de Servicios", icon: "Stethoscope", section: "Configuración", roles: ["admin"] },
  { href: "/gestion/inventario",   label: "Inventario",      icon: "Package",         section: "Clínica",       roles: ["admin"] },
  { href: "/gestion/inventario/transacciones", label: "Movimientos de Inventario", icon: "Layers", section: "Clínica", roles: ["admin"] },
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
