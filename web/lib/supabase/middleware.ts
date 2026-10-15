import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { env } from "@/lib/env";
import {
  CHANGE_PASSWORD_PATH,
  isAllowedWhilePasswordPending,
  mustChangePassword,
} from "@/lib/password-policy";

/**
 * Refresca la sesión y aplica las reglas de acceso por ruta:
 *  - /admin → solo superadmin
 *  - /app   → usuarios autenticados (owner / driver)
 *  - /login → si ya hay sesión, redirige al panel que corresponde
 *  - /actualizar-clave → requiere sesión
 *  - Cuenta con contraseña temporal → obligada a cambiarla antes de seguir
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(env.supabaseUrl, env.supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const isAdminRoute = path === "/admin" || path.startsWith("/admin/");
  const isAppRoute = path === "/app" || path.startsWith("/app/");
  const isLogin = path === "/login";
  const isChangePassword = path === CHANGE_PASSWORD_PATH;

  const redirectTo = (to: string) => {
    const url = request.nextUrl.clone();
    url.pathname = to;
    url.search = "";
    if (to === "/login" && (isAdminRoute || isAppRoute || isChangePassword)) {
      url.searchParams.set("next", path);
    }
    const res = NextResponse.redirect(url);
    response.cookies.getAll().forEach((c) => res.cookies.set(c));
    return res;
  };

  if (!user) {
    if (isAdminRoute || isAppRoute || isChangePassword) return redirectTo("/login");
    return response;
  }

  // Primer ingreso con contraseña temporal: debe crear su propia contraseña
  if (mustChangePassword(user) && !isAllowedWhilePasswordPending(path)) {
    return redirectTo(CHANGE_PASSWORD_PATH);
  }

  if (isAdminRoute || isLogin) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("is_superadmin")
      .eq("id", user.id)
      .maybeSingle();
    const isSuperadmin = Boolean(profile?.is_superadmin);
    if (isAdminRoute && !isSuperadmin) return redirectTo("/app");
    if (isLogin) return redirectTo(isSuperadmin ? "/admin" : "/app");
  }

  return response;
}
