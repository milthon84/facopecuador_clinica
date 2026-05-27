import { createAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";

export const dynamic = "force-dynamic";

const VALID_CATEGORIES = ["Consumibles", "Restauración", "Instrumentos", "Equipos", "Desinfección", "Medicamentos", "Otros"];
const VALID_UNITS = ["Unidades", "Cajas", "Paquetes", "Tubos", "Mililitros (ml)", "Gramos (g)"];

const CATEGORY_PREFIXES: Record<string, string> = {
  Consumibles: "CON",
  Restauración: "RES",
  Instrumentos: "INS",
  Equipos: "EQU",
  Desinfección: "DES",
  Medicamentos: "MED",
  Otros: "OTR",
};

async function getNextSkuForCategory(
  supabase: ReturnType<typeof createAdminClient>,
  category: string,
  used: Set<string>
): Promise<string> {
  const prefix = CATEGORY_PREFIXES[category] || "OTR";
  const { data } = await supabase
    .from("inventory_products")
    .select("sku")
    .like("sku", `${prefix}-%`);

  let maxNum = 0;
  (data || []).forEach((row) => {
    const parts = row.sku?.split("-");
    if (parts?.length === 2) {
      const num = parseInt(parts[1], 10);
      if (!isNaN(num) && num > maxNum) maxNum = num;
    }
  });

  // También considerar los ya asignados en este lote
  let candidate = maxNum + 1;
  let sku = `${prefix}-${String(candidate).padStart(3, "0")}`;
  while (used.has(sku)) {
    candidate++;
    sku = `${prefix}-${String(candidate).padStart(3, "0")}`;
  }
  used.add(sku);
  return sku;
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No se recibió archivo" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const wb = XLSX.read(buffer, { type: "buffer" });

    // Usar la primera hoja
    const sheetName = wb.SheetNames[0];
    const ws = wb.Sheets[sheetName];
    const rows: any[] = XLSX.utils.sheet_to_json(ws, { defval: "" });

    if (rows.length === 0) {
      return NextResponse.json({ error: "El archivo está vacío" }, { status: 400 });
    }

    const supabase = createAdminClient();
    const usedSkus = new Set<string>();
    const errors: string[] = [];
    const toInsert: any[] = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 2; // +2 porque fila 1 = encabezados

      const name = String(row["Nombre"] || "").trim();
      const category = String(row["Categoría"] || row["Categoria"] || "").trim();
      const unit = String(row["Unidad"] || "").trim();
      const minStock = Number(row["Stock Mínimo"] ?? row["Stock Minimo"] ?? 5);
      const initStock = Number(row["Stock Inicial"] ?? 0);

      if (!name) { errors.push(`Fila ${rowNum}: El nombre es obligatorio.`); continue; }
      if (!VALID_CATEGORIES.includes(category)) {
        errors.push(`Fila ${rowNum}: Categoría "${category}" no válida. Use: ${VALID_CATEGORIES.join(", ")}.`);
        continue;
      }
      if (unit && !VALID_UNITS.includes(unit)) {
        errors.push(`Fila ${rowNum}: Unidad "${unit}" no válida. Use: ${VALID_UNITS.join(", ")}.`);
        continue;
      }

      const sku = await getNextSkuForCategory(supabase, category, usedSkus);

      toInsert.push({
        sku,
        name,
        category,
        unit_of_measure: unit || "Unidades",
        minimum_stock: isNaN(minStock) ? 5 : minStock,
        current_stock: 0,
        _init_stock: isNaN(initStock) ? 0 : initStock,
      });
    }

    if (errors.length > 0 && toInsert.length === 0) {
      return NextResponse.json({ error: "No se pudo procesar ninguna fila.", details: errors }, { status: 422 });
    }

    // Insertar productos válidos
    let inserted = 0;
    for (const item of toInsert) {
      const { _init_stock, ...productData } = item;
      const { data: product, error: insertError } = await supabase
        .from("inventory_products")
        .insert(productData)
        .select()
        .single();

      if (insertError) {
        errors.push(`Error al insertar "${productData.name}": ${insertError.message}`);
        continue;
      }

      if (_init_stock > 0 && product) {
        await supabase.from("inventory_transactions").insert({
          product_id: product.id,
          type: "entrada",
          quantity: _init_stock,
          reason: "Importación desde Excel",
        });
      }
      inserted++;
    }

    return NextResponse.json({
      inserted,
      warnings: errors.length > 0 ? errors : undefined,
      message: `${inserted} producto(s) importado(s) correctamente.`,
    });
  } catch (err) {
    console.error("Error importando inventario:", err);
    return NextResponse.json({ error: "Error interno al procesar el archivo" }, { status: 500 });
  }
}
