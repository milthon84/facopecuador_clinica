import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { Package, AlertTriangle, ArrowUpRight, Plus, Layers } from "lucide-react";
import InventoryFilters from "@/components/InventoryFilters";
import InventoryImportExport from "@/components/InventoryImportExport";

export const dynamic = "force-dynamic";

export default async function InventoryDashboard({
  searchParams,
}: {
  searchParams: { q?: string; category?: string };
}) {
  const supabase = createAdminClient();
  const q = searchParams.q || "";
  const category = searchParams.category || "";

  let query = supabase
    .from("inventory_products")
    .select("*", { count: "exact" })
    .order("name");

  if (q) {
    query = query.ilike("name", `%${q}%`);
  }
  if (category) {
    query = query.eq("category", category);
  }

  const { data: products, count } = await query;
  const items = products || [];

  const lowStockCount = items.filter((p) => p.current_stock <= p.minimum_stock).length;
  const totalStock = items.reduce((acc, p) => acc + Number(p.current_stock), 0);

  // Categorías únicas
  const allCategoriesQuery = await supabase.from("inventory_products").select("category");
  const uniqueCategories = Array.from(new Set(allCategoriesQuery.data?.map(c => c.category) || []));

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-ink-900 flex items-center gap-2">
            <Package className="text-lilac-600" />
            Inventario de Insumos
          </h1>
          <p className="text-sm text-ink-600">
            Gestiona tus productos, materiales e instrumentos dentales.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Link
            href="/admin/inventario/transacciones"
            className="btn-secondary flex items-center gap-2 text-sm bg-white border border-lilac-200 hover:bg-lilac-50 px-4 py-2 rounded-xl transition-colors font-medium text-ink-700 shadow-sm"
          >
            <Layers size={16} />
            Movimientos
          </Link>
          <Link
            href="/admin/inventario/nuevo"
            className="btn-primary flex items-center gap-2 text-sm bg-lilac-600 hover:bg-lilac-700 text-white px-4 py-2 rounded-xl transition-colors font-medium shadow-md shadow-lilac-200"
          >
            <Plus size={16} />
            Nuevo Insumo
          </Link>
        </div>
      </div>

      {/* Import / Export Excel */}
      <div className="bg-white border border-lilac-100 rounded-2xl shadow-sm px-5 py-4 mb-6">
        <InventoryImportExport />
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="bg-white rounded-2xl p-5 border border-lilac-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-lilac-50 flex items-center justify-center shrink-0">
            <Package size={24} className="text-lilac-600" />
          </div>
          <div>
            <div className="text-sm text-ink-600 font-medium">Total Productos</div>
            <div className="text-2xl font-bold text-ink-900">{count ?? 0}</div>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-5 border border-lilac-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-amber-50 flex items-center justify-center shrink-0">
            <AlertTriangle size={24} className="text-amber-500" />
          </div>
          <div>
            <div className="text-sm text-ink-600 font-medium">Stock Bajo</div>
            <div className="text-2xl font-bold text-amber-600">{lowStockCount}</div>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-5 border border-lilac-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-green-50 flex items-center justify-center shrink-0">
            <Layers size={24} className="text-green-600" />
          </div>
          <div>
            <div className="text-sm text-ink-600 font-medium">Unidades en Stock</div>
            <div className="text-2xl font-bold text-ink-900">{totalStock}</div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <InventoryFilters q={q} category={category} uniqueCategories={uniqueCategories} />

      {/* Product List */}
      <div className="bg-white border border-lilac-100 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-lilac-50/50 text-ink-600 text-xs uppercase font-semibold">
              <tr>
                <th className="px-5 py-4">Producto</th>
                <th className="px-5 py-4">Categoría</th>
                <th className="px-5 py-4 text-center">Stock Actual</th>
                <th className="px-5 py-4 text-center">Stock Mínimo</th>
                <th className="px-5 py-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-lilac-50">
              {items.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-12 text-center text-ink-500">
                    <div className="flex flex-col items-center gap-3">
                      <Package size={40} className="text-lilac-200" />
                      <p>No se encontraron productos.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                items.map((p) => {
                  const isLow = Number(p.current_stock) <= Number(p.minimum_stock);
                  return (
                    <tr key={p.id} className="hover:bg-lilac-50/30 transition-colors group">
                      <td className="px-5 py-4">
                        <div className="font-medium text-ink-900">{p.name}</div>
                        {p.sku && <div className="text-xs text-ink-500 mt-0.5">SKU: {p.sku}</div>}
                      </td>
                      <td className="px-5 py-4">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-lilac-100 text-lilac-700">
                          {p.category}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-center">
                        <div className={`inline-flex items-center justify-center px-3 py-1 rounded-full text-sm font-bold ${isLow ? 'bg-red-100 text-red-700 border border-red-200' : 'bg-green-100 text-green-700 border border-green-200'}`}>
                          {p.current_stock}
                          <span className="text-[10px] uppercase ml-1 opacity-70 font-semibold">{p.unit_of_measure}</span>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-center text-ink-500 font-medium">
                        {p.minimum_stock}
                      </td>
                      <td className="px-5 py-4 text-right">
                        <Link
                          href={`/admin/inventario/transacciones?product=${p.id}`}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-lilac-600 hover:text-lilac-800 transition-colors bg-lilac-50 px-2 py-1.5 rounded-lg opacity-0 group-hover:opacity-100"
                        >
                          Registrar
                          <ArrowUpRight size={14} />
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
