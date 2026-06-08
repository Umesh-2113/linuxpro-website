declare global {
  interface Window {
    Cashfree?: (config: { mode: "sandbox" | "production" }) => {
      checkout: (opts: {
        paymentSessionId: string;
        redirectTarget?: "_self" | "_blank" | "_top" | "_modal" | HTMLElement;
      }) => Promise<{ error?: { message: string } }>;
    };
  }
}

function loadCashfreeScript(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.Cashfree) return Promise.resolve();

  return new Promise((resolve, reject) => {
    const existing = document.querySelector('script[src*="cashfree.js"]');
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error("Cashfree SDK failed")));
      return;
    }

    const script = document.createElement("script");
    script.src = "https://sdk.cashfree.com/js/v3/cashfree.js";
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Cashfree SDK"));
    document.body.appendChild(script);
  });
}

export async function startCashfreeCheckout(paymentSessionId: string): Promise<void> {
  await loadCashfreeScript();

  const mode =
    (process.env.NEXT_PUBLIC_CASHFREE_MODE as "sandbox" | "production") || "sandbox";

  if (!window.Cashfree) {
    throw new Error("Cashfree SDK not available");
  }

  const cashfree = window.Cashfree({ mode });
  const result = await cashfree.checkout({
    paymentSessionId,
    redirectTarget: "_self",
  });

  if (result?.error) {
    throw new Error(result.error.message || "Cashfree checkout failed");
  }
}
