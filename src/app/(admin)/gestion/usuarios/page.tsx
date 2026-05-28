import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { UserCog, Plus, ShieldCheck, Users, ToggleLeft, ToggleRight, Trash2 } from "lucide-react";
import { ROLE_LABELS, ROLE_COLORS } from "@/lib/roles";
import type { UserRole } from "@/lib/roles";
import { logAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

// ── Server Actions ─────────────────────────────────────────────────────────

async function createUser(formData: FormData) {
  "use server";
  const supabase = createAdminClient();
  const sessionSupabase = createClient();
  const { data: { user: sessionUser } } = await sessionSupabase.auth.getUser();
  const sessionRole = (sessionUser?.app_metadata?.role as UserRole) ?? "admin";
  if (sessionRole !== "admin") throw new Error("Sin permisos");

  const full_name = formData.get("full_name") as string;
  const email     = formData.get("email") as string;
  const password  = formData.get("password") as string;
  const role      = formData.get("role") as UserRole;

  // Crear usuario en Supabase Auth con rol en app_metadata
  const { data: newUser, error: authError } = await supabase.auth.admin.createUser({
    email,
    password,
    app_metadata: { role },
    email_confirm: true,
  });

  if (authError || !newUser.user) {
    throw new Error(authError?.message || "Error al crear usuario");
  }

  // Insertar perfil
  await supabase.from("user_profiles").insert({
    id: newUser.user.id,
    full_name,
    role,
    is_active: true,
  });

  await logAudit({
    user_id: sessionUser?.id,
    user_email: sessionUser?.email,
    user_role: sessionRole,
    action: "create",
    resource: "user_profile",
    resource_id: newUser.user.id,
    description: `Usuario creado: ${email} (${ROLE_LABELS[role]})`,
    metadata: { email, role, full_name },
  });

  redirect("/gestion/usuarios");
}

async function toggleUserStatus(formData: FormData) {
  "use server";
  const supabase = createAdminClient();
  const sessionSupabase = createClient();
  const { data: { user: sessionUser } } = await sessionSupabase.auth.getUser();
  const sessionRole = (sessionUser?.app_metadata?.role as UserRole) ?? "admin";
  if (sessionRole !== "admin") throw new Error("Sin permisos");

  const userId    = formData.get("userId") as string;
  const newStatus = formData.get("newStatus") === "true";

  await supabase.from("user_profiles").update({ is_active: newStatus }).eq("id", userId);

  await logAudit({
    user_id: sessionUser?.id,
    user_email: sessionUser?.email,
    user_role: sessionRole,
    action: "update",
    resource: "user_profile",
    resource_id: userId,
    description: `Usuario ${newStatus ? "activado" : "desactivado"}`,
  });

  redirect("/gestion/usuarios");
}

async function changeRole(formData: FormData) {
  "use server";
  const supabase = createAdminClient();
  const sessionSupabase = createClient();
  const { data: { user: sessionUser } } = await sessionSupabase.auth.getUser();
  const sessionRole = (sessionUser?.app_metadata?.role as UserRole) ?? "admin";
  if (sessionRole !== "admin") throw new Error("Sin permisos");

  const userId  = formData.get("userId") as string;
  const newRole = formData.get("newRole") as UserRole;

  // Actualizar en user_profiles
  await supabase.from("user_profiles").update({ role: newRole }).eq("id", userId);

  // Actualizar app_metadata en Auth
  await supabase.auth.admin.updateUserById(userId, {
    app_metadata: { role: newRole },
  });

  await logAudit({
    user_id: sessionUser?.id,
    user_email: sessionUser?.email,
    user_role: sessionRole,
    action: "update",
    resource: "user_profile",
    resource_id: userId,
    description: `Rol cambiado a: ${ROLE_LABELS[newRole]}`,
    metadata: { new_role: newRole },
  });

  redirect("/gestion/usuarios");
}

// ── Page ───────────────────────────────────────────────────────────────────

export default async function UsuariosPage() {
  // Verificar que el usuario actual sea admin
  const sessionSupabase = createClient();
  const { data: { user: sessionUser } } = await sessionSupabase.auth.getUser();
  const sessionRole = (sessionUser?.app_metadata?.role as UserRole) ?? "admin";
  if (sessionRole !== "admin") redirect("/gestion");

  const supabase = createAdminClient();

  // Obtener todos los usuarios de Supabase Auth
  const { data: { users: authUsers } } = await supabase.auth.admin.listUsers();

  // Obtener perfiles
  const { data: profiles } = await supabase
    .from("user_profiles")
    .select("*");

  const profileMap = new Map((profiles || []).map((p) => [p.id, p]));

  // Combinar: usuarios que tienen perfil o están en auth
  const allUsers = (authUsers || []).map((u) => ({
    id: u.id,
    email: u.email || "",
    created_at: u.created_at,
    profile: profileMap.get(u.id) ?? null,
    app_role: (u.app_metadata?.role as UserRole) ?? null,
  }));

  const stats = {
    total: allUsers.length,
    admins: allUsers.filter((u) => (u.profile?.role || u.app_role) === "admin").length,
    activos: allUsers.filter((u) => u.profile?.is_active !== false).length,
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-ink-900 flex items-center gap-2">
            <UserCog className="text-lilac-600" />
            Gestión de Usuarios
          </h1>
          <p className="text-sm text-ink-600">Administra el acceso al sistema y los roles del equipo.</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: "Total Usuarios", value: stats.total, icon: <Users size={20} className="text-lilac-600" />, bg: "bg-lilac-50" },
          { label: "Administradores", value: stats.admins, icon: <ShieldCheck size={20} className="text-gold-600" />, bg: "bg-amber-50" },
          { label: "Activos", value: stats.activos, icon: <ToggleRight size={20} className="text-green-600" />, bg: "bg-green-50" },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-2xl p-4 border border-lilac-100 shadow-sm flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl ${s.bg} flex items-center justify-center`}>{s.icon}</div>
            <div>
              <div className="text-xs text-ink-500 font-medium">{s.label}</div>
              <div className="text-xl font-bold text-ink-900">{s.value}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Tabla de usuarios */}
      <div className="bg-white border border-lilac-100 rounded-2xl shadow-sm overflow-hidden mb-8">
        <div className="px-5 py-4 border-b border-lilac-50 flex items-center justify-between">
          <h2 className="font-semibold text-ink-900">Usuarios del sistema</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-lilac-50/50 text-xs text-ink-600 uppercase font-semibold">
              <tr>
                <th className="px-5 py-3 text-left">Usuario</th>
                <th className="px-5 py-3 text-left">Rol</th>
                <th className="px-5 py-3 text-center">Estado</th>
                <th className="px-5 py-3 text-center">Registrado</th>
                <th className="px-5 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-lilac-50">
              {allUsers.map((u) => {
                const role = (u.profile?.role || u.app_role) as UserRole | null;
                const isActive = u.profile?.is_active !== false;
                const isCurrentUser = u.id === sessionUser?.id;
                return (
                  <tr key={u.id} className="hover:bg-lilac-50/30 transition-colors">
                    <td className="px-5 py-3">
                      <div className="font-medium text-ink-900">{u.profile?.full_name || "—"}</div>
                      <div className="text-xs text-ink-500">{u.email}</div>
                      {isCurrentUser && (
                        <span className="text-[10px] bg-lilac-100 text-lilac-700 px-1.5 py-0.5 rounded font-semibold">Tú</span>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      {role ? (
                        <span className={`inline-flex items-center text-xs font-semibold px-2.5 py-1 rounded-full border ${ROLE_COLORS[role]}`}>
                          {ROLE_LABELS[role]}
                        </span>
                      ) : (
                        <span className="text-xs text-ink-400 italic">Sin perfil</span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-center">
                      <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full ${isActive ? "bg-green-100 text-green-700" : "bg-red-50 text-red-600"}`}>
                        {isActive ? <ToggleRight size={12} /> : <ToggleLeft size={12} />}
                        {isActive ? "Activo" : "Inactivo"}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-center text-xs text-ink-500">
                      {new Date(u.created_at).toLocaleDateString("es-EC")}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {/* Cambiar rol */}
                        {!isCurrentUser && u.profile && (
                          <form action={changeRole}>
                            <input type="hidden" name="userId" value={u.id} />
                            <input type="hidden" name="newRole" value={role === "admin" ? "recepcionista" : "admin"} />
                            <button
                              type="submit"
                              className="text-xs text-lilac-600 hover:text-lilac-800 border border-lilac-200 hover:bg-lilac-50 px-2.5 py-1 rounded-lg transition-colors font-medium"
                            >
                              {role === "admin" ? "→ Recepcionista" : "→ Admin"}
                            </button>
                          </form>
                        )}
                        {/* Activar/Desactivar */}
                        {!isCurrentUser && u.profile && (
                          <form action={toggleUserStatus}>
                            <input type="hidden" name="userId" value={u.id} />
                            <input type="hidden" name="newStatus" value={String(!isActive)} />
                            <button
                              type="submit"
                              className={`text-xs border px-2.5 py-1 rounded-lg transition-colors font-medium ${
                                isActive
                                  ? "text-red-500 border-red-200 hover:bg-red-50"
                                  : "text-green-600 border-green-200 hover:bg-green-50"
                              }`}
                            >
                              {isActive ? "Desactivar" : "Activar"}
                            </button>
                          </form>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Formulario crear usuario */}
      <div className="bg-white border border-lilac-100 rounded-2xl shadow-sm p-6">
        <h2 className="font-semibold text-ink-900 mb-1 flex items-center gap-2">
          <Plus size={18} className="text-lilac-600" />
          Crear nuevo usuario
        </h2>
        <p className="text-sm text-ink-500 mb-5">El usuario podrá ingresar con el email y contraseña que definas aquí.</p>
        <form action={createUser} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-sm font-semibold text-ink-700">Nombre completo *</label>
            <input
              name="full_name" required
              placeholder="Ej. María González"
              className="w-full bg-lilac-50/50 border border-lilac-100 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-lilac-500"
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-semibold text-ink-700">Email *</label>
            <input
              name="email" type="email" required
              placeholder="correo@clinica.com"
              className="w-full bg-lilac-50/50 border border-lilac-100 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-lilac-500"
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-semibold text-ink-700">Contraseña *</label>
            <input
              name="password" type="password" required minLength={8}
              placeholder="Mínimo 8 caracteres"
              className="w-full bg-lilac-50/50 border border-lilac-100 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-lilac-500"
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-semibold text-ink-700">Rol *</label>
            <select
              name="role" required
              className="w-full bg-lilac-50/50 border border-lilac-100 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-lilac-500"
            >
              <option value="recepcionista">Recepcionista</option>
              <option value="admin">Administrador</option>
            </select>
          </div>
          <div className="sm:col-span-2 flex justify-end pt-2">
            <button
              type="submit"
              className="flex items-center gap-2 bg-lilac-600 hover:bg-lilac-700 text-white px-6 py-2.5 rounded-xl font-semibold text-sm transition-colors shadow-md shadow-lilac-200"
            >
              <Plus size={16} />
              Crear usuario
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
