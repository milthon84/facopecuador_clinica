import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Save, Building2, Key } from "lucide-react";
import SriAmbienteSection from "@/components/SriAmbienteSection";

export const dynamic = "force-dynamic";

export default async function SriConfigPage() {
  // Solo administradores pueden acceder
  const sessionClient = createClient();
  const { data: { user } } = await sessionClient.auth.getUser();
  if ((user?.app_metadata?.role as string) !== "admin") redirect("/gestion");

  const supabase = createAdminClient();
  const { data: config } = await supabase.from("sri_configs").select("*").single();

  async function saveConfig(formData: FormData) {
    "use server";
    const actionSupabase = createAdminClient();

    const ambiente = formData.get("ambiente") as string;

    // Validar que existe certificado si se intenta pasar a producción
    if (ambiente === "2") {
      const { data: cfg } = await actionSupabase.from("sri_configs").select("p12_storage_path").single();
      if (!cfg?.p12_storage_path) {
        // Redirigir con error (simple approach via query param)
        redirect("/gestion/facturacion/config?error=cert_required");
      }
    }

    const updates = {
      ruc:              formData.get("ruc") as string,
      razon_social:     formData.get("razon_social") as string,
      nombre_comercial: formData.get("nombre_comercial") as string,
      establecimiento:  formData.get("establecimiento") as string,
      punto_emision:    formData.get("punto_emision") as string,
      direccion_matriz: formData.get("direccion_matriz") as string,
      ambiente,
      obligado_contabilidad: formData.get("obligado_contabilidad") === "on",
    };

    const id = formData.get("id") as string;
    if (id) {
      await actionSupabase.from("sri_configs").update(updates).eq("id", id);
    } else {
      await actionSupabase.from("sri_configs").insert(updates);
    }

    redirect("/gestion/facturacion");
  }

  const hasCert = !!config?.p12_storage_path;

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header compacto */}
      <div className="flex items-center gap-3 mb-4">
        <Link
          href="/gestion/facturacion"
          className="w-9 h-9 flex items-center justify-center rounded-xl bg-white border border-lilac-200 text-ink-600 hover:bg-lilac-50 transition-colors shrink-0"
        >
          <ArrowLeft size={18} />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-ink-900">Configuración SRI</h1>
          <p className="text-xs text-ink-500">Emisor y firma electrónica para facturación electrónica Ecuador</p>
        </div>
      </div>

      <div className="bg-white border border-lilac-100 rounded-2xl shadow-sm">
        <form action={saveConfig} className="p-4 sm:p-6 space-y-5">
          <input type="hidden" name="id" value={config?.id || ""} />

          {/* ── Datos del Emisor ───────────────────────────── */}
          <div className="space-y-3">
            <h4 className="font-semibold text-sm text-ink-700 flex items-center gap-2 border-b border-lilac-50 pb-2">
              <Building2 size={15} className="text-lilac-500" />
              Datos del Emisor
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-ink-700">RUC *</label>
                <input
                  type="text" name="ruc" required
                  defaultValue={config?.ruc || ""}
                  maxLength={13} placeholder="1790000000001"
                  className="w-full bg-lilac-50/50 border border-lilac-100 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-lilac-500 font-mono"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-ink-700">Razón Social *</label>
                <input
                  type="text" name="razon_social" required
                  defaultValue={config?.razon_social || ""}
                  placeholder="Nombre legal completo"
                  className="w-full bg-lilac-50/50 border border-lilac-100 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-lilac-500 uppercase"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-ink-700">Nombre Comercial</label>
              <input
                type="text" name="nombre_comercial"
                defaultValue={config?.nombre_comercial || ""}
                placeholder="Nombre público de la clínica"
                className="w-full bg-lilac-50/50 border border-lilac-100 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-lilac-500"
              />
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-ink-700">Establecimiento *</label>
                <input
                  type="text" name="establecimiento" required
                  defaultValue={config?.establecimiento || "001"}
                  maxLength={3}
                  className="w-full bg-lilac-50/50 border border-lilac-100 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-lilac-500 font-mono text-center"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-ink-700">Punto Emisión *</label>
                <input
                  type="text" name="punto_emision" required
                  defaultValue={config?.punto_emision || "001"}
                  maxLength={3}
                  className="w-full bg-lilac-50/50 border border-lilac-100 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-lilac-500 font-mono text-center"
                />
              </div>
              <div className="space-y-1 col-span-2 md:col-span-1">
                <label className="text-xs font-semibold text-ink-700">&nbsp;</label>
                <label className="flex items-center gap-2 bg-lilac-50/30 border border-lilac-100 px-3 py-2 rounded-xl cursor-pointer hover:bg-lilac-50 transition-colors h-[38px]">
                  <input
                    type="checkbox" name="obligado_contabilidad"
                    defaultChecked={config?.obligado_contabilidad}
                    className="w-4 h-4 rounded border-lilac-300 text-lilac-600 focus:ring-lilac-500"
                  />
                  <span className="text-xs font-medium text-ink-700">Obligado contabilidad</span>
                </label>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-ink-700">Dirección Matriz *</label>
              <input
                type="text" name="direccion_matriz" required
                defaultValue={config?.direccion_matriz || ""}
                placeholder="Dirección fiscal registrada en SRI"
                className="w-full bg-lilac-50/50 border border-lilac-100 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-lilac-500"
              />
            </div>
          </div>

          {/* ── Entorno y Firma ────────────────────────────── */}
          <div className="space-y-3 pt-4 border-t border-lilac-100">
            <h4 className="font-semibold text-sm text-ink-700 flex items-center gap-2 border-b border-lilac-50 pb-2">
              <Key size={15} className="text-gold-500" />
              Entorno y Firma Electrónica
            </h4>

            <SriAmbienteSection
              defaultAmbiente={config?.ambiente ?? "1"}
              hasCert={hasCert}
              certSubject={config?.p12_cert_subject ?? null}
              certExpires={config?.p12_cert_expires ?? null}
            />
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              className="flex items-center gap-2 bg-lilac-600 hover:bg-lilac-700 text-white px-6 py-2.5 rounded-xl transition-colors font-semibold text-sm shadow-md shadow-lilac-200"
            >
              <Save size={16} />
              Guardar Configuración
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
