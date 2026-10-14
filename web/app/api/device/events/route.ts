import { getDeviceDeps, withErrors } from "@/lib/device";
import { handleEvents } from "@/lib/device/handlers";

export const dynamic = "force-dynamic";

export const POST = withErrors((req) => handleEvents(req, getDeviceDeps()));
