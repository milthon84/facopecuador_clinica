import { cache } from "react";
import { createClient } from "./supabase/server";
import { createAdminClient } from "./supabase/admin";

export interface CachedAuthData {
  user: any | null;
  role: string;
  allowedPaths: string[] | null;
}

export const getCachedUserAndPermissions = cache(async (): Promise<CachedAuthData> => {
  const supabase = createClient();
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { user: null, role: "recepcionista", allowedPaths: [] };
    }

    const role = (user.app_metadata?.role as string) ?? "recepcionista";
    let allowedPaths: string[] | null = null;

    if (role !== "admin") {
      const adminClient = createAdminClient();
      const { data } = await adminClient
        .from("role_permissions")
        .select("path")
        .eq("role_name", role);
      allowedPaths = (data || []).map((p: any) => p.path);
    }

    return { user, role, allowedPaths };
  } catch (err) {
    console.error("Error in getCachedUserAndPermissions:", err);
    return { user: null, role: "recepcionista", allowedPaths: [] };
  }
});
