import { getDeviceDeps, withErrors } from "@/lib/device";
import { handleHeartbeat } from "@/lib/device/handlers";

export const dynamic = "force-dynamic";

export const POST = withErrors((req) => handleHeartbeat(req, getDeviceDeps()));
