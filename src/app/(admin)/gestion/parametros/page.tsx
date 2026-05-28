import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import { Settings, Trash2, Plus, Tag, Ruler, Stethoscope, Pencil } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

// ── Server Actions ─────────────────────────────────────────────────────────

async function addCategory(formData: FormData) {
  "use server";
  const name   = (formData.get("name") as string)?.trim();
  const prefix = (formData.get("prefix") as string)?.trim().toUpperCase().slice(0, 4);
  if (!name || !prefix) return;
  const supabase = createAdminClient();
  await supabase.from("inventory_categories").insert({ name, prefix });
  revalidatePath("/gestion/parametros");
}

async function deleteCategory(formData: FormData) {
  "use server";
  const id = formData.get("id") as string;
  const supabase = createAdminClient();
  await supabase.from("inventory_categories").delete().eq("id", id);
  revalidatePath("/gestion/parametros");
}

async function addUnit(formData: FormData) {
  "use server";
  const name = (formData.get("name") as string)?.trim();
  if (!name) return;
  const supabase = createAdminClient();
  await supabase.from("inventory_units").insert({ name });
  revalidatePath("/gestion/parametros");
}

async function deleteUnit(formData: FormData) {
  "use server";
  const id = formData.get("id") as string;
  const supabase = createAdminClient();
  await supabase.from("inventory_units").delete().eq("id", id);
  revalidatePath("/gestion/parametros");
}

async function addService(formData: FormData) {
  "use server";
  const name  = (formData.get("name") as string)?.trim();
  const price = Number(formData.get("price") || 0);
  if (!name) return;
  const supabase = createAdminClient();
  await supabase.from("services").insert({
    name,
    description: (formData.get("description") as string)?.trim() || null,
    price,
    iva_code:  formData.get("iva_code") as string,
    category:  (formData.get("service_category") as string)?.trim() || "General",
  });
  revalidatePath("/gestion/parametros");
}

async function toggleService(formData: FormData) {
  "use server";
  const id     = formData.get("id") as string;
  const active = formData.get("active") === "true";
  const supabase = createAdminClient();
  await supabase.from("services").update({ active: !active }).eq("id", id);
  revalidatePath("/gestion/parametros");
}

async function deleteService(formData: FormData) {
  "use server";
  const id = formData.get("id") as string;
  const supabase = createAdminClient();
  await supabase.from("services").delete().eq("id", id);
  revalidatePath("/gestion/parametros");
}

// ── Page ───────────────────────────────────────────────────────────────────

export default async function ParametrosPage() {
  const supabase = createAdminClient();
  const [{ data: categories }, { data: units }, { data: services }] = await Promise.all([
    supabase.from("inventory_categories").select("*").eq("active", true).order("name"),
    supabase.from("inventory_units").select("*").eq("active", true).order("name"),
    supabase.from("services").select("*").order("category").order("sort_order"),
  ]);

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center gap-2 mb-5">
        <Settings size={20} className="text-lilac-600" />
        <h1 className="text-xl font-bold text-ink-900">Parámetros del Sistema</h1>
      </div>

      <div className="space-y-5">

        {/* ── Categorías ──────────────────────────────────────────────── */}
        <div className="bg-white border border-lilac-100 rounded-2xl shadow-sm p-5">
          <div className="flex items-center gap-2 mb-4">
            <Tag size={16} className="text-lilac-500" />
            <h2 className="font-semibold text-ink-900">Categorías de Insumos</h2>
            <span className="ml-auto text-xs text-ink-400">{categories?.length ?? 0} registros</span>
          </div>

          <div className="space-y-1.5 mb-4">
            {(categories || []).length === 0 && (
              <p className="text-sm text-ink-400 text-center py-4">Sin categorías registradas.</p>
            )}
            {(categories || []).map((cat) => (
              <div key={cat.id} className="flex items-center gap-3 px-3 py-2 bg-lilac-50 rounded-xl">
                <span className="text-[11px] font-bold text-lilac-700 bg-lilac-200 px-2 py-0.5 rounded-md font-mono">
                  {cat.prefix}
                </span>
                <span className="text-sm text-ink-800 flex-1">{cat.name}</span>
                <form action={deleteCategory}>
                  <input type="hidden" name="id" value={cat.id} />
                  <button
                    type="submit"
                    title="Eliminar"
                    className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                  >
                    <Trash2 size={14} />
                  </button>
                </form>
              </div>
            ))}
          </div>

          <form action={addCategory} className="flex gap-2">
            <input
              type="text"
              name="name"
              required
              placeholder="Nueva categoría"
              className="flex-1 text-sm border border-lilac-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-lilac-400 bg-white"
            />
            <input
              type="text"
              name="prefix"
              required
              maxLength={4}
              placeholder="SKU"
              title="Prefijo de 2-4 letras para el código (ej: CON)"
              className="w-16 text-sm border border-lilac-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-lilac-400 bg-white uppercase font-mono text-center"
            />
            <button
              type="submit"
              className="flex items-center gap-1.5 bg-lilac-600 text-white text-sm px-3 py-2 rounded-xl hover:bg-lilac-700 transition font-medium"
            >
              <Plus size={15} />
              Agregar
            </button>
          </form>
          <p className="text-xs text-ink-400 mt-2">
            El prefijo se usa para generar los códigos SKU automáticos (ej: prefijo <strong>CON</strong> → <strong>CON-001</strong>).
          </p>
        </div>

        {/* ── Unidades de Medida ─────────────────────────────────────── */}
        <div className="bg-white border border-lilac-100 rounded-2xl shadow-sm p-5">
          <div className="flex items-center gap-2 mb-4">
            <Ruler size={16} className="text-lilac-500" />
            <h2 className="font-semibold text-ink-900">Unidades de Medida</h2>
            <span className="ml-auto text-xs text-ink-400">{units?.length ?? 0} registros</span>
          </div>

          <div className="space-y-1.5 mb-4">
            {(units || []).length === 0 && (
              <p className="text-sm text-ink-400 text-center py-4">Sin unidades registradas.</p>
            )}
            {(units || []).map((unit) => (
              <div key={unit.id} className="flex items-center gap-3 px-3 py-2 bg-lilac-50 rounded-xl">
                <span className="text-sm text-ink-800 flex-1">{unit.name}</span>
                <form action={deleteUnit}>
                  <input type="hidden" name="id" value={unit.id} />
                  <button
                    type="submit"
                    title="Eliminar"
                    className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                  >
                    <Trash2 size={14} />
                  </button>
                </form>
              </div>
            ))}
          </div>

          <form action={addUnit} className="flex gap-2">
            <input
              type="text"
              name="name"
              required
              placeholder="Nueva unidad (ej: Litros)"
              className="flex-1 text-sm border border-lilac-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-lilac-400 bg-white"
            />
            <button
              type="submit"
              className="flex items-center gap-1.5 bg-lilac-600 text-white text-sm px-3 py-2 rounded-xl hover:bg-lilac-700 transition font-medium"
            >
              <Plus size={15} />
              Agregar
            </button>
          </form>
        </div>

        {/* ── Catálogo de Servicios ──────────────────────────────────── */}
        <div className="bg-white border border-lilac-100 rounded-2xl shadow-sm p-5">
          <div className="flex items-center gap-2 mb-4">
            <Stethoscope size={16} className="text-lilac-500" />
            <h2 className="font-semibold text-ink-900">Catálogo de Servicios</h2>
            <span className="ml-auto text-xs text-ink-400">{services?.length ?? 0} servicios</span>
          </div>

          {/* Lista agrupada por categoría */}
          <div className="space-y-3 mb-5">
            {services && services.length > 0 ? (
              Object.entries(
                services.reduce((acc: Record<string, typeof services>, s) => {
                  const cat = s.category ?? "General";
                  if (!acc[cat]) acc[cat] = [];
                  acc[cat].push(s);
                  return acc;
                }, {})
              ).map(([cat, items]) => (
                <div key={cat}>
                  <p className="text-[11px] font-bold text-ink-400 uppercase tracking-wide mb-1.5">{cat}</p>
                  <div className="space-y-1">
                    {items.map((s: any) => (
                      <div key={s.id} className={`flex items-center gap-3 px-3 py-2 rounded-xl ${s.active ? "bg-lilac-50" : "bg-gray-50 opacity-60"}`}>
                        <div className="flex-1 min-w-0">
                          <span className="text-sm font-medium text-ink-800">{s.name}</span>
                          {s.description && <span className="text-xs text-ink-400 ml-2 truncate">{s.description}</span>}
                        </div>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${s.iva_code === "4" ? "bg-orange-100 text-orange-700" : "bg-gray-100 text-gray-600"}`}>
                          IVA {s.iva_code === "4" ? "15%" : "0%"}
                        </span>
                        <span className="text-sm font-bold text-lilac-700 w-16 text-right">${Number(s.price).toFixed(2)}</span>
                        <div className="flex gap-1">
                          <form action={toggleService}>
                            <input type="hidden" name="id"     value={s.id} />
                            <input type="hidden" name="active" value={String(s.active)} />
                            <button type="submit" title={s.active ? "Desactivar" : "Activar"}
                              className={`p-1.5 rounded-lg transition text-xs ${s.active ? "text-amber-500 hover:bg-amber-50" : "text-green-600 hover:bg-green-50"}`}>
                              {s.active ? "●" : "○"}
                            </button>
                          </form>
                          <form action={deleteService}>
                            <input type="hidden" name="id" value={s.id} />
                            <button type="submit" title="Eliminar"
                              className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition">
                              <Trash2 size={13} />
                            </button>
                          </form>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-ink-400 text-center py-4">Sin servicios. Ejecuta la migración SQL para cargar los iniciales.</p>
            )}
          </div>

          {/* Formulario agregar */}
          <form action={addService} className="border border-lilac-100 rounded-xl p-3 bg-lilac-50/20 space-y-3">
            <p className="text-xs font-semibold text-ink-600 uppercase tracking-wide">Nuevo servicio</p>
            <div className="grid grid-cols-2 gap-2">
              <input type="text" name="name" required placeholder="Nombre del servicio *"
                className="col-span-2 text-sm border border-lilac-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-lilac-400 bg-white" />
              <input type="text" name="description" placeholder="Descripción (opcional)"
                className="col-span-2 text-sm border border-lilac-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-lilac-400 bg-white" />
              <input type="text" name="service_category" placeholder="Categoría (ej: Cirugía)"
                className="text-sm border border-lilac-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-lilac-400 bg-white" />
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400 text-xs">$</span>
                <input type="number" name="price" min="0" step="0.01" defaultValue="0" placeholder="Precio"
                  className="w-full text-sm border border-lilac-200 rounded-xl pl-7 pr-3 py-2 focus:outline-none focus:ring-2 focus:ring-lilac-400 bg-white font-mono" />
              </div>
              <select name="iva_code"
                className="text-sm border border-lilac-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-lilac-400 bg-white">
                <option value="0">IVA 0%</option>
                <option value="4">IVA 15%</option>
              </select>
              <button type="submit"
                className="flex items-center justify-center gap-1.5 bg-lilac-600 text-white text-sm px-3 py-2 rounded-xl hover:bg-lilac-700 transition font-medium">
                <Plus size={15} /> Agregar
              </button>
            </div>
          </form>
        </div>

      </div>
    </div>
  );
}
