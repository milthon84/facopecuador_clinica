import { createAdminClient } from "@/lib/supabase/admin";
import HorariosEditor from "@/components/HorariosEditor";

export const dynamic = "force-dynamic";

export default async function HorariosPage() {
  const supabase = createAdminClient();
  const { data: rules } = await supabase
    .from("availability_rules")
    .select("*")
    .order("day_of_week")
    .order("start_time");

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-bold mb-1">Horarios de atención</h1>
      <p className="text-sm text-ink-600 mb-6">Definí qué horarios trabajás cada día de la semana. Los pacientes solo verán slots dentro de estos rangos.</p>
      <HorariosEditor initialRules={JSON.parse(JSON.stringify(rules || []))} />
    </div>
  );
}
