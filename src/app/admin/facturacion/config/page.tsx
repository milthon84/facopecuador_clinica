import { createAdminClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Save, Building2, Key, ShieldCheck } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function SriConfigPage() {
  const supabase = createAdminClient();
  
  // Obtener config actual
  const { data: config } = await supabase.from("sri_configs").select("*").single();

  async function saveConfig(formData: FormData) {
    "use server";
    const actionSupabase = createAdminClient();
    
    const ruc = formData.get("ruc") as string;
    const razon_social = formData.get("razon_social") as string;
    const nombre_comercial = formData.get("nombre_comercial") as string;
    const establecimiento = formData.get("establecimiento") as string;
    const punto_emision = formData.get("punto_emision") as string;
    const direccion_matriz = formData.get("direccion_matriz") as string;
    const ambiente = formData.get("ambiente") as string;
    const obligado = formData.get("obligado_contabilidad") === "on";

    const id = formData.get("id") as string;

    const updates = {
      ruc,
      razon_social,
      nombre_comercial,
      establecimiento,
      punto_emision,
      direccion_matriz,
      ambiente,
      obligado_contabilidad: obligado,
    };

    if (id) {
      await actionSupabase.from("sri_configs").update(updates).eq("id", id);
    } else {
      await actionSupabase.from("sri_configs").insert(updates);
    }

    redirect("/admin/facturacion");
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <Link
          href="/admin/facturacion"
          className="w-10 h-10 flex items-center justify-center rounded-xl bg-white border border-lilac-200 text-ink-600 hover:bg-lilac-50 transition-colors"
        >
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-ink-900 flex items-center gap-2">
            Configuración SRI
          </h1>
          <p className="text-sm text-ink-600">Configura tus datos de emisor y firma electrónica para facturar.</p>
        </div>
      </div>

      <div className="bg-white border border-lilac-100 rounded-2xl shadow-sm overflow-hidden">
        
        {/* Banner */}
        <div className="bg-lilac-50/50 p-6 border-b border-lilac-100 flex gap-4 items-start">
          <div className="w-10 h-10 rounded-full bg-lilac-100 flex items-center justify-center shrink-0 mt-1 text-lilac-700">
            <ShieldCheck size={20} />
          </div>
          <div>
            <h3 className="font-bold text-ink-900 text-lg">Facturación Electrónica Ecuador</h3>
            <p className="text-sm text-ink-600 mt-1 leading-relaxed">
              Los datos ingresados aquí se utilizarán para generar los comprobantes XML requeridos por el Servicio de Rentas Internas. Verifica que el RUC y Razón Social coincidan exactamente con tu registro.
            </p>
          </div>
        </div>

        <form action={saveConfig} className="p-6 sm:p-8 space-y-6">
          <input type="hidden" name="id" value={config?.id || ""} />

          <div className="space-y-4">
            <h4 className="font-semibold text-ink-900 flex items-center gap-2 border-b border-lilac-50 pb-2">
              <Building2 size={18} className="text-lilac-500" />
              Datos del Emisor
            </h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-1">
                <label className="text-sm font-semibold text-ink-700">RUC *</label>
                <input
                  type="text"
                  name="ruc"
                  required
                  defaultValue={config?.ruc || ""}
                  maxLength={13}
                  placeholder="Ej. 1790000000001"
                  className="w-full bg-lilac-50/50 border border-lilac-100 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-lilac-500 transition-all font-mono"
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-semibold text-ink-700">Razón Social *</label>
                <input
                  type="text"
                  name="razon_social"
                  required
                  defaultValue={config?.razon_social || ""}
                  placeholder="Nombre legal completo"
                  className="w-full bg-lilac-50/50 border border-lilac-100 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-lilac-500 transition-all uppercase"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-semibold text-ink-700">Nombre Comercial</label>
              <input
                type="text"
                name="nombre_comercial"
                defaultValue={config?.nombre_comercial || ""}
                placeholder="Nombre público de la clínica"
                className="w-full bg-lilac-50/50 border border-lilac-100 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-lilac-500 transition-all"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-1">
                <label className="text-sm font-semibold text-ink-700">Establecimiento (3 dígitos) *</label>
                <input
                  type="text"
                  name="establecimiento"
                  required
                  defaultValue={config?.establecimiento || "001"}
                  maxLength={3}
                  className="w-full bg-lilac-50/50 border border-lilac-100 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-lilac-500 transition-all font-mono text-center"
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-semibold text-ink-700">Punto Emisión (3 dígitos) *</label>
                <input
                  type="text"
                  name="punto_emision"
                  required
                  defaultValue={config?.punto_emision || "001"}
                  maxLength={3}
                  className="w-full bg-lilac-50/50 border border-lilac-100 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-lilac-500 transition-all font-mono text-center"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-semibold text-ink-700">Dirección Matriz *</label>
              <input
                type="text"
                name="direccion_matriz"
                required
                defaultValue={config?.direccion_matriz || ""}
                placeholder="Dirección fiscal registrada en SRI"
                className="w-full bg-lilac-50/50 border border-lilac-100 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-lilac-500 transition-all"
              />
            </div>

            <div className="flex flex-col sm:flex-row gap-4 pt-2">
              <label className="flex items-center gap-3 bg-lilac-50/30 border border-lilac-100 p-3 rounded-xl cursor-pointer flex-1 hover:bg-lilac-50 transition-colors">
                <input 
                  type="checkbox" 
                  name="obligado_contabilidad" 
                  defaultChecked={config?.obligado_contabilidad}
                  className="w-5 h-5 rounded border-lilac-300 text-lilac-600 focus:ring-lilac-500 cursor-pointer"
                />
                <span className="text-sm font-medium text-ink-800">Obligado a llevar contabilidad</span>
              </label>
            </div>
          </div>

          <div className="space-y-4 pt-6 mt-6 border-t border-lilac-100">
            <h4 className="font-semibold text-ink-900 flex items-center gap-2 border-b border-lilac-50 pb-2">
              <Key size={18} className="text-gold-500" />
              Entorno y Firma Electrónica
            </h4>

            <div className="grid grid-cols-2 gap-4">
              <label className="cursor-pointer">
                <input type="radio" name="ambiente" value="1" className="peer sr-only" defaultChecked={!config || config.ambiente === "1"} />
                <div className="flex items-center justify-center gap-2 rounded-xl border border-lilac-200 bg-white p-4 text-center peer-checked:border-lilac-600 peer-checked:bg-lilac-50 transition-all hover:bg-lilac-50">
                  <div>
                    <div className="font-bold text-lilac-700">Ambiente de Pruebas</div>
                    <div className="text-xs text-ink-500 mt-1">Facturas sin validez legal</div>
                  </div>
                </div>
              </label>
              <label className="cursor-pointer">
                <input type="radio" name="ambiente" value="2" className="peer sr-only" defaultChecked={config?.ambiente === "2"} />
                <div className="flex items-center justify-center gap-2 rounded-xl border border-lilac-200 bg-white p-4 text-center peer-checked:border-green-600 peer-checked:bg-green-50 transition-all hover:bg-green-50">
                  <div>
                    <div className="font-bold text-green-700">Ambiente Producción</div>
                    <div className="text-xs text-ink-500 mt-1">Facturas oficiales SRI</div>
                  </div>
                </div>
              </label>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800 flex gap-3 mt-4">
              <AlertCircle className="shrink-0 text-amber-600" size={20} />
              <div>
                <strong>Nota sobre Firma Electrónica:</strong> Por ahora, el sistema está en modo "Simulador SRI" el cual firmará y autorizará las facturas internamente para pruebas. En la versión final de producción, aquí se habilitará la subida de tu archivo de certificado <code>.p12</code> y la contraseña del mismo.
              </div>
            </div>
          </div>

          <div className="pt-6 flex justify-end">
            <button
              type="submit"
              className="btn-primary flex items-center gap-2 bg-lilac-600 hover:bg-lilac-700 text-white px-8 py-3 rounded-xl transition-colors font-bold shadow-md shadow-lilac-200"
            >
              <Save size={18} />
              Guardar Configuración
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
