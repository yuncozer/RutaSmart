"use client";

import { PageError } from "@/components/page-states";

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return <PageError reset={reset} />;
}
