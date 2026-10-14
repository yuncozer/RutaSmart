import { getDeviceDeps, withErrors } from "@/lib/device";
import { handleConfig } from "@/lib/device/handlers";

export const dynamic = "force-dynamic";

export const GET = withErrors((req) => handleConfig(req, getDeviceDeps()));
