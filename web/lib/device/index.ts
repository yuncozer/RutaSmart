import "server-only";
import { serverEnv } from "@/lib/env";
import { RateLimiter } from "./rate-limit";
import { createSupabaseDeviceRepo } from "./supabase-repo";
import type { HandlerDeps } from "./handlers";

let deps: HandlerDeps | null = null;

/** Dependencias compartidas por los Route Handlers (una instancia por proceso). */
export function getDeviceDeps(): HandlerDeps {
  if (!deps) {
    deps = {
      repo: createSupabaseDeviceRepo(),
      limiter: new RateLimiter(serverEnv().deviceRateLimitPerMin),
    };
  }
  return deps;
}

/** Envuelve un handler y responde 500 en JSON ante errores inesperados. */
export function withErrors(fn: (req: Request) => Promise<Response>) {
  return async (req: Request) => {
    try {
      return await fn(req);
    } catch (err) {
      console.error("[device-api]", err);
      return Response.json({ error: "internal_error", message: "Error interno" }, { status: 500 });
    }
  };
}
