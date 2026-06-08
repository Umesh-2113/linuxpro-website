const API_VERSION = "2023-08-01";

function getBaseUrl(): string {
  return process.env.CASHFREE_ENV === "production"
    ? "https://api.cashfree.com/pg"
    : "https://sandbox.cashfree.com/pg";
}

function getHeaders(): HeadersInit {
  const clientId = process.env.CASHFREE_APP_ID;
  const clientSecret = process.env.CASHFREE_SECRET_KEY;
  if (!clientId || !clientSecret) {
    throw new Error("Cashfree credentials are not configured in environment variables.");
  }
  return {
    "Content-Type": "application/json",
    "x-api-version": API_VERSION,
    "x-client-id": clientId,
    "x-client-secret": clientSecret,
  };
}

export type CashfreeCreateOrderPayload = {
  order_id: string;
  order_amount: number;
  order_currency?: string;
  customer_details: {
    customer_id: string;
    customer_name: string;
    customer_email: string;
    customer_phone: string;
  };
  order_meta: {
    return_url: string;
    notify_url?: string;
  };
  order_note?: string;
};

export async function cashfreeCreateOrder(payload: CashfreeCreateOrderPayload) {
  const res = await fetch(`${getBaseUrl()}/orders`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify({
      order_currency: "INR",
      ...payload,
    }),
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(
      data?.message || data?.error?.message || "Failed to create Cashfree order"
    );
  }

  return data as {
    order_id: string;
    payment_session_id: string;
    order_status: string;
  };
}

export async function cashfreeFetchOrder(orderId: string) {
  const res = await fetch(`${getBaseUrl()}/orders/${orderId}`, {
    method: "GET",
    headers: getHeaders(),
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(
      data?.message || data?.error?.message || "Failed to fetch Cashfree order"
    );
  }

  return data as {
    order_id: string;
    order_status: string;
    order_amount: number;
    payment_session_id?: string;
  };
}

export function getAppBaseUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
}

export function isCashfreePaid(status: string): boolean {
  return status === "PAID";
}
