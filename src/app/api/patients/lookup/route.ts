import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const document = url.searchParams.get("document");
  const email = url.searchParams.get("email");

  if (!document && !email) {
    return NextResponse.json({ patient: null });
  }

  const supabase = createAdminClient();
  let query = supabase.from("patients").select("full_name, phone, email, document_number");

  if (document) query = query.eq("document_number", document.trim());
  else if (email) query = query.eq("email", email.trim().toLowerCase());

  const { data, error } = await query.maybeSingle();
  if (error) return NextResponse.json({ patient: null });

  return NextResponse.json({ patient: data });
}
