import { Suspense } from "react";
import { ClientOrdersPanel } from "@/components/client/ClientOrdersPanel";

export default function ClientOrdersPage() {
  return (
    <Suspense fallback={null}>
      <ClientOrdersPanel />
    </Suspense>
  );
}
