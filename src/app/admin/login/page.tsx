"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Lock } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { error: err } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (err) {
      setError(err.message);
      return;
    }
    // Hard navigation: garantiza un ciclo SSR completo con la cookie de
    // sesion activa. router.push() puede servir una version cacheada de
    // /admin (redirect a login) y dejar la app colgada hasta F5.
    window.location.replace("/admin");
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-lilac-50 via-white to-gold-50 px-4">
      <div className="card w-full max-w-md p-8">
        <div className="w-12 h-12 rounded-xl bg-ink-900 flex items-center justify-center mx-auto mb-4">
          <Lock className="text-gold-500" size={20} />
        </div>
        <h1 className="text-xl font-bold text-center mb-1">Acceso administrador</h1>
        <p className="text-sm text-ink-600 text-center mb-6">Ingresa tus credenciales</p>
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="label">Email</label>
            <input
              className="input"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <label className="label">Contrasena</label>
            <input
              className="input"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          {error && (
            <div className="text-sm text-red-700 bg-red-50 border border-red-200 px-3 py-2 rounded-lg">
              {error}
            </div>
          )}
          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? "Ingresando..." : "Ingresar"}
          </button>
        </form>
      </div>
    </main>
  );
}
