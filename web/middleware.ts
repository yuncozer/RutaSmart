import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  // Excluye estáticos y la API de dispositivos/cron (se autentican por su cuenta)
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|api/device|api/cron|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
