"use client";

import { createClient } from "@/lib/supabase/client";
import { LogOut } from "lucide-react";

export default function SignOutButton() {
  async function logout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    // Hard navigation: los cambios de sesion necesitan un ciclo SSR completo.
    // router.push() ignora que la cookie fue eliminada y sirve paginas del
    // admin desde el cache del cliente.
    window.location.replace("/admin/login");
  }

  return (
    <button
      onClick={logout}
      className="inline-flex items-center gap-1 text-sm text-white/80 hover:text-gold-500"
    >
      <LogOut size={14} /> Salir
    </button>
  );
}
