import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { logAudit, getIpFromRequest } from "@/lib/audit";
import type { UserRole } from "@/lib/roles";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const supabase = createAdminClient();
    const sessionClient = createClient();
    const { data: { user } } = await sessionClient.auth.getUser();

    const { data: products, error } = await supabase
      .from("inventory_products")
      .select("sku, name, category, unit_of_measure, current_stock, minimum_stock")
      .order("category")
      .order("name");

    if (error) throw error;

    // Formatear filas para Excel
    const rows = (products || []).map((p) => ({
      "Código (SKU)": p.sku || "",
      "Nombre": p.name,
      "Categoría": p.category,
      "Unidad": p.unit_of_measure,
      "Stock Actual": Number(p.current_stock),
      "Stock Mínimo": Number(p.minimum_stock),
    }));

    const ws = XLSX.utils.json_to_sheet(rows);

    // Anchos de columna
    ws["!cols"] = [
      { wch: 14 }, // SKU
      { wch: 34 }, // Nombre
      { wch: 18 }, // Categoría
      { wch: 16 }, // Unidad
      { wch: 14 }, // Stock Actual
      { wch: 14 }, // Stock Mínimo
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Inventario");

    // Hoja de plantilla de importación (segunda pestaña)
    const templateRows = [
      {
        "Nombre": "Ejemplo: Resina 3M A2",
        "Categoría": "Restauración",
        "Unidad": "Unidades",
        "Stock Mínimo": 5,
        "Stock Inicial": 10,
      },
    ];
    const wsTemplate = XLSX.utils.json_to_sheet(templateRows);
    wsTemplate["!cols"] = [
      { wch: 34 },
      { wch: 18 },
      { wch: 16 },
      { wch: 14 },
      { wch: 14 },
    ];
    XLSX.utils.book_append_sheet(wb, wsTemplate, "Plantilla Importación");

    const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

    await logAudit({
      user_id: user?.id,
      user_email: user?.email,
      user_role: (user?.app_metadata?.role as UserRole) ?? null,
      action: "export",
      resource: "inventory_product",
      description: `Exportación de inventario (${rows.length} productos)`,
      metadata: { product_count: rows.length },
      ip_address: getIpFromRequest(req),
    });

    const today = new Date().toISOString().split("T")[0];
    return new NextResponse(buf, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="inventario_${today}.xlsx"`,
      },
    });
  } catch (err) {
    console.error("Error exportando inventario:", err);
    return NextResponse.json({ error: "Error al exportar" }, { status: 500 });
  }
}
