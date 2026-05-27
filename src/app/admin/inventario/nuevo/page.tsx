import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Save, Sparkles } from "lucide-react";
import { logAudit } from "@/lib/audit";
import type { UserRole } from "@/lib/roles";

export const dynamic = "force-dynamic";

// Prefijos de SKU por categoría
const CATEGORY_PREFIXES: Record<string, string> = {
  Consumibles: "CON",
  Restauración: "RES",
  Instrumentos: "INS",
  Equipos: "EQU",
  Desinfección: "DES",
  Medicamentos: "MED",
  Otros: "OTR",
};

const CATEGORIES = Object.keys(CATEGORY_PREFIXES);

const UNITS = [
  "Unidades",
  "Cajas",
  "Paquetes",
  "Tubos",
  "Mililitros (ml)",
  "Gramos (g)",
];

async function getNextSku(supabase: ReturnType<typeof createAdminClient>, category: string): Promise<string> {
  const prefix = CATEGORY_PREFIXES[category] || "OTR";
  // Buscar todos los SKU que empiecen con ese prefijo
  const { data } = await supabase
    .from("inventory_products")
    .select("sku")
    .like("sku", `${prefix}-%`);

  let maxNum = 0;
  (data || []).forEach((row) => {
    const parts = row.sku?.split("-");
    if (parts && parts.length === 2) {
      const num = parseInt(parts[1], 10);
      if (!isNaN(num) && num > maxNum) maxNum = num;
    }
  });

  const next = maxNum + 1;
  return `${prefix}-${String(next).padStart(3, "0")}`;
}

export default async function NewProductPage() {
  async function saveProduct(formData: FormData) {
    "use server";
    const supabase = createAdminClient();
    const sessionClient = createClient();
    const { data: { user } } = await sessionClient.auth.getUser();

    const name = formData.get("name") as string;
    const category = formData.get("category") as string;
    const unit_of_measure = formData.get("unit_of_measure") as string;
    const minimum_stock = Number(formData.get("minimum_stock") || 5);
    const initial_stock = Number(formData.get("initial_stock") || 0);

    // Generar SKU automático
    const sku = await getNextSku(supabase, category);

    const { data: product, error: productError } = await supabase
      .from("inventory_products")
      .insert({
        name,
        sku,
        category,
        unit_of_measure,
        minimum_stock,
        current_stock: 0,
      })
      .select()
      .single();

    if (productError) {
      console.error(productError);
      throw new Error("Error creando producto");
    }

    if (initial_stock > 0 && product) {
      await supabase.from("inventory_transactions").insert({
        product_id: product.id,
        type: "entrada",
        quantity: initial_stock,
        reason: "Inventario Inicial",
        created_by_id: user?.id ?? null,
        created_by_email: user?.email ?? null,
      });
    }

    await logAudit({
      user_id: user?.id,
      user_email: user?.email,
      user_role: (user?.app_metadata?.role as UserRole) ?? null,
      action: "create",
      resource: "inventory_product",
      resource_id: product?.id,
      description: `Producto creado: ${name} (${sku}) - Categoría: ${category}`,
      metadata: { name, sku, category, unit_of_measure, minimum_stock, initial_stock },
    });

    redirect("/admin/inventario");
  }

  // Pre-calcular el próximo SKU para mostrar como preview
  const supabase = createAdminClient();
  const defaultCategory = "Consumibles";
  const previewSku = await getNextSku(supabase, defaultCategory);

  return (
    <div className="max-w-xl mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <Link
          href="/admin/inventario"
          className="w-10 h-10 flex items-center justify-center rounded-xl bg-white border border-lilac-200 text-ink-600 hover:bg-lilac-50 transition-colors"
        >
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-ink-900">Nuevo Insumo</h1>
          <p className="text-sm text-ink-600">El código se genera automáticamente según la categoría.</p>
        </div>
      </div>

      <div className="bg-white border border-lilac-100 rounded-2xl shadow-sm p-6 sm:p-8">
        <form action={saveProduct} className="space-y-5">

          {/* Nombre */}
          <div className="space-y-1">
            <label className="text-sm font-semibold text-ink-700">
              Nombre del Insumo <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="name"
              required
              autoFocus
              placeholder="Ej. Resina 3M A2, Guantes Nitrilo M"
              className="w-full bg-lilac-50/50 border border-lilac-100 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-lilac-500 transition-all"
            />
          </div>

          {/* Categoría + SKU preview */}
          <div className="space-y-1">
            <label className="text-sm font-semibold text-ink-700">
              Categoría <span className="text-red-500">*</span>
            </label>
            <select
              name="category"
              required
              className="w-full bg-lilac-50/50 border border-lilac-100 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-lilac-500 transition-all"
            >
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          {/* Código auto generado (informativo) */}
          <div className="flex items-center gap-3 bg-lilac-50 border border-lilac-200 rounded-xl px-4 py-3">
            <Sparkles size={18} className="text-lilac-500 shrink-0" />
            <div>
              <p className="text-xs font-semibold text-lilac-700 uppercase tracking-wide">Código asignado automáticamente</p>
              <p className="text-sm text-ink-600 mt-0.5">
                El sistema asignará el próximo código disponible de la categoría, por ejemplo{" "}
                <span className="font-bold text-lilac-700">{previewSku}</span>.
              </p>
            </div>
          </div>

          {/* Unidad de medida */}
          <div className="space-y-1 pt-4 border-t border-lilac-50">
            <label className="text-sm font-semibold text-ink-700">
              Unidad de Medida <span className="text-red-500">*</span>
            </label>
            <select
              name="unit_of_measure"
              required
              className="w-full bg-lilac-50/50 border border-lilac-100 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-lilac-500 transition-all"
            >
              {UNITS.map((u) => (
                <option key={u} value={u}>{u}</option>
              ))}
            </select>
          </div>

          {/* Stock mínimo e inicial */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-sm font-semibold text-amber-700">Stock Mínimo (Alerta)</label>
              <input
                type="number"
                name="minimum_stock"
                min="0"
                defaultValue="5"
                className="w-full bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 transition-all font-bold text-amber-900"
              />
              <p className="text-xs text-ink-400">Alerta si el stock llega a este nivel.</p>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-semibold text-green-700">Inventario Inicial</label>
              <input
                type="number"
                name="initial_stock"
                min="0"
                defaultValue="0"
                className="w-full bg-green-50 border border-green-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 transition-all font-bold text-green-900"
              />
              <p className="text-xs text-ink-400">Cantidad actual en bodega.</p>
            </div>
          </div>

          <div className="pt-4 flex justify-end">
            <button
              type="submit"
              className="flex items-center gap-2 bg-lilac-600 hover:bg-lilac-700 text-white px-6 py-3 rounded-xl transition-colors font-semibold shadow-md shadow-lilac-200"
            >
              <Save size={18} />
              Guardar Insumo
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
