import { Alert } from "@/components/ui/alert";

export function FormMessage({ state }: { state?: { error?: string; success?: string } }) {
  if (state?.error) return <Alert variant="danger">{state.error}</Alert>;
  if (state?.success) return <Alert variant="success">{state.success}</Alert>;
  return null;
}
