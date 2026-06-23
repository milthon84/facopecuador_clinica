import { createAdminClient } from "@/lib/supabase/admin";
import NewInvoiceForm from "./NewInvoiceForm";

export const dynamic = "force-dynamic";

export default async function NewInvoicePage({
  searchParams: searchParamsPromise,
}: {
  searchParams: Promise<{ patient_id?: string }>;
}) {
  const searchParams = await searchParamsPromise;
  const supabase = createAdminClient();

  const [{ data: patients }, preselectedResult, { data: services }, { data: bankAccounts }, { data: sriConfig }] = await Promise.all([
    supabase.from("patients").select("id, full_name, document_number, email, phone").order("full_name"),
    searchParams.patient_id
      ? supabase.from("patients").select("id, full_name, document_number, email, phone").eq("id", searchParams.patient_id).single()
      : Promise.resolve({ data: null }),
    supabase.from("services").select("id, name, description, price, iva_code, category").eq("active", true).order("category").order("name"),
    supabase.from("bank_accounts").select("id, bank_name, account_number, account_type, notes").eq("is_active", true).order("bank_name"),
    supabase.from("sri_configs").select("*").maybeSingle(),
  ]);

  let cardSurchargePercent = 5.0;
  if (sriConfig && "card_surcharge_percent" in sriConfig && sriConfig.card_surcharge_percent != null) {
    cardSurchargePercent = Number(sriConfig.card_surcharge_percent);
  }

  return (
    <NewInvoiceForm
      patients={patients ?? []}
      initialPatient={preselectedResult.data ?? null}
      services={services ?? []}
      bankAccounts={bankAccounts ?? []}
      cardSurchargePercent={cardSurchargePercent}
    />
  );
}
