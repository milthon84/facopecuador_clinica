import { createClient } from "@supabase/supabase-js";

/**
 * Cliente con SERVICE_ROLE - bypassa RLS.
 * Usar SOLO en API routes / Server Actions, NUNCA en client components.
 */
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}
