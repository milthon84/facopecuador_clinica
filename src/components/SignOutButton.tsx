"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { LogOut } from "lucide-react";

export default function SignOutButton() {
  const router = useRouter();
  async function logout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/admin/login");
    router.refresh();
  }
  return (
    <button onClick={logout} className="inline-flex items-center gap-1 text-sm text-white/80 hover:text-gold-500">
      <LogOut size={14} /> Salir
    </button>
  );
}
