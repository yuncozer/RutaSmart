import { getDeviceDeps, withErrors } from "@/lib/device";
import { handlePositions } from "@/lib/device/handlers";

export const dynamic = "force-dynamic";

export const POST = withErrors((req) => handlePositions(req, getDeviceDeps()));
