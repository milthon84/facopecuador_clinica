import { createAdminClient } from "@/lib/supabase/admin";
import { notFound } from "next/navigation";
import EditarFichaClientPage from "./EditarFichaClientPage";

export const dynamic = "force-dynamic";

export default async function EditarFichaPage({ params }: { params: { id: string } }) {
  const supabase = createAdminClient();

  const { data: patient } = await supabase
    .from("patients")
    .select("*")
    .eq("id", params.id)
    .single();

  if (!patient) return notFound();

  return (
    <EditarFichaClientPage patient={patient} />
  );
}
