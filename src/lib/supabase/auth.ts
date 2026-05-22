import { createClient } from "./server";
import { createAdminClient } from "./admin";

export async function getSessionUser(req: Request) {
  const supabase = createClient();
  
  // 1. Intento estándar usando cookies() de Next.js
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) return user;
  } catch (err) {
    console.error("Error en getUser estándar:", err);
  }

  // 2. Intento de fallback manual leyendo el encabezado Cookie del request
  try {
    const cookieHeader = req.headers.get("cookie");
    if (!cookieHeader) return null;

    const cookies = cookieHeader.split(";").map(c => c.trim());
    let combinedCookie = "";
    
    // Las cookies de Supabase pueden estar fragmentadas como sb-<project-ref>-auth-token.0, .1, etc.
    const tokenChunks: { index: number; value: string }[] = [];
    let singleToken: string | null = null;

    for (const cookie of cookies) {
      const [name, val] = cookie.split("=");
      if (!name || !val) continue;

      if (name.includes("-auth-token")) {
        if (name.includes(".")) {
          const parts = name.split(".");
          const idx = parseInt(parts[parts.length - 1], 10);
          if (!isNaN(idx)) {
            tokenChunks.push({ index: idx, value: val });
          }
        } else {
          singleToken = val;
        }
      }
    }

    let cookieVal = "";
    if (singleToken) {
      cookieVal = decodeURIComponent(singleToken);
    } else if (tokenChunks.length > 0) {
      tokenChunks.sort((a, b) => a.index - b.index);
      cookieVal = decodeURIComponent(tokenChunks.map(c => c.value).join(""));
    }

    if (cookieVal) {
      const parsed = JSON.parse(cookieVal);
      const accessToken = parsed.access_token;
      if (accessToken) {
        // Validar el token de acceso con Supabase
        const { data: { user }, error } = await supabase.auth.getUser(accessToken);
        if (user && !error) {
          return user;
        }
      }
    }
  } catch (err) {
    console.error("Error en fallback manual de sesión:", err);
  }

  return null;
}
