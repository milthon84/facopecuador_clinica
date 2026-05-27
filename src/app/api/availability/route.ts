import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { computeSlotsForDate } from "@/lib/availability";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const dateStr = url.searchParams.get("date");
  if (!dateStr) return NextResponse.json({ error: "date required" }, { status: 400 });

  // Interpretar la fecha como medianoche en Ecuador (UTC-5) para que
  // getDay() y formatDateLocal() devuelvan el día correcto en Hostinger (UTC)
  const date = new Date(dateStr + "T00:00:00-05:00");
  if (isNaN(date.getTime())) return NextResponse.json({ error: "invalid date" }, { status: 400 });

  const supabase = createAdminClient();

  const [rulesRes, exRes, apptRes] = await Promise.all([
    supabase.from("availability_rules").select("*").eq("is_active", true),
    supabase.from("availability_exceptions").select("*").eq("date", dateStr),
    supabase
      .from("appointments")
      .select("starts_at, ends_at, status")
      .gte("starts_at", `${dateStr}T00:00:00`)
      .lt("starts_at", `${dateStr}T23:59:59`)
      .neq("status", "cancelled"),
  ]);

  if (rulesRes.error || exRes.error || apptRes.error) {
    return NextResponse.json(
      { error: rulesRes.error?.message || exRes.error?.message || apptRes.error?.message },
      { status: 500 }
    );
  }

  const slots = computeSlotsForDate(
    date,
    rulesRes.data || [],
    (exRes.data || []) as any,
    apptRes.data || []
  );

  // Filtrar slots ya pasados si la fecha es hoy
  const now = new Date();
  const filtered = slots.filter((s) => new Date(s.start) > now);

  return NextResponse.json({ slots: filtered });
}
