import Link from "next/link";
import { CalendarDays, LayoutDashboard, Users, Clock, Ban, LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import SignOutButton from "@/components/SignOutButton";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Si no hay usuario (como en /admin/login), no renderizamos el layout del panel
  if (!user) return <>{children}</>;

  return (
    <div className="min-h-screen bg-lilac-50/30 text-ink-900">
      <header className="bg-ink-900 text-white">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/admin" className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gold-500 flex items-center justify-center">
              <span className="text-ink-900 font-bold text-sm">A</span>
            </div>
            <span className="font-semibold text-gold-500">Panel Admin</span>
          </Link>
          <div className="flex items-center gap-1 sm:gap-3 text-sm">
            <span className="hidden sm:inline text-white/60">{user.email}</span>
            <SignOutButton />
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto flex flex-col md:flex-row">
        <nav className="md:w-56 md:min-h-[calc(100vh-56px)] border-r border-lilac-100 bg-white">
          <div className="p-3 flex md:flex-col gap-1 overflow-x-auto">
            <NavItem href="/admin" icon={<LayoutDashboard size={16} />}>Hoy</NavItem>
            <NavItem href="/admin/calendario" icon={<CalendarDays size={16} />}>Calendario</NavItem>
            <NavItem href="/admin/pacientes" icon={<Users size={16} />}>Pacientes</NavItem>
            <NavItem href="/admin/horarios" icon={<Clock size={16} />}>Horarios</NavItem>
            <NavItem href="/admin/bloqueos" icon={<Ban size={16} />}>Bloqueos</NavItem>
          </div>
        </nav>

        <main className="flex-1 p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}

function NavItem({ href, icon, children }: { href: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-ink-900 hover:bg-lilac-50 whitespace-nowrap"
    >
      {icon}
      {children}
    </Link>
  );
}
