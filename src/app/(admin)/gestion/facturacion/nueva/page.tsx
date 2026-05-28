import { createAdminClient } from "@/lib/supabase/admin";
import NewInvoiceForm from "./NewInvoiceForm";

export const dynamic = "force-dynamic";

export default async function NewInvoicePage({
  searchParams,
}: {
  searchParams: { patient_id?: string };
}) {
  const supabase = createAdminClient();

  const [{ data: patients }, preselectedResult, { data: services }] = await Promise.all([
    supabase.from("patients").select("id, full_name, document_number, email, phone").order("full_name"),
    searchParams.patient_id
      ? supabase.from("patients").select("id, full_name, document_number, email, phone").eq("id", searchParams.patient_id).single()
      : Promise.resolve({ data: null }),
    supabase.from("services").select("id, name, description, price, iva_code, category").eq("active", true).order("category").order("sort_order"),
  ]);

  return (
    <NewInvoiceForm
      patients={patients ?? []}
      initialPatient={preselectedResult.data ?? null}
      services={services ?? []}
    />
  );
}
