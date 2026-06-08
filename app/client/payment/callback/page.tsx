import { Suspense } from "react";
import { PaymentCallbackPanel } from "@/components/client/PaymentCallbackPanel";

export default function PaymentCallbackPage() {
  return (
    <>
      <header className="client-topbar">
        <div>
          <h1>Payment Status</h1>
          <p>Cashfree secure payment confirmation.</p>
        </div>
      </header>
      <Suspense
        fallback={
          <div className="payment-callback glass">
            <p>Loading payment status...</p>
          </div>
        }
      >
        <PaymentCallbackPanel />
      </Suspense>
    </>
  );
}
