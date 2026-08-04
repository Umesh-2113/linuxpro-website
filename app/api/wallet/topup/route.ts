import { NextResponse } from "next/server";
import { cashfreeCreateOrder, getAppBaseUrl } from "@/lib/cashfree-server";
import { dbCreateWalletTopup } from "@/lib/db/wallet";
import { requireClientSession } from "@/lib/server-session";

function sanitizeCustomerId(email: string): string {
  return email.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 50) || "linuxpro_user";
}

export async function POST(req: Request) {
  try {
    const auth = await requireClientSession();
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const body = await req.json();
    const amount = Number(body.amount);
    const phone = String(body.customer_phone ?? "").replace(/\D/g, "");
    const customerName = String(body.customer_name ?? auth.email.split("@")[0]);

    if (!Number.isFinite(amount) || amount < 100) {
      return NextResponse.json(
        { error: "Minimum top-up amount is ₹100." },
        { status: 400 }
      );
    }

    if (amount > 100000) {
      return NextResponse.json(
        { error: "Maximum top-up amount is ₹1,00,000 per transaction." },
        { status: 400 }
      );
    }

    if (phone.length < 10) {
      return NextResponse.json(
        { error: "Enter a valid 10-digit phone number for payment." },
        { status: 400 }
      );
    }

    const topup = await dbCreateWalletTopup({
      userEmail: auth.email,
      amount: Math.round(amount),
    });

    const baseUrl = getAppBaseUrl();
    const data = await cashfreeCreateOrder({
      order_id: topup.id,
      order_amount: topup.amount,
      order_currency: "INR",
      customer_details: {
        customer_id: sanitizeCustomerId(auth.email),
        customer_name: customerName,
        customer_email: auth.email,
        customer_phone: phone,
      },
      order_meta: {
        return_url: `${baseUrl}/client/payment/callback?order_id={order_id}`,
      },
      order_note: "LinuxPro wallet top-up",
    });

    return NextResponse.json({
      success: true,
      topup_id: topup.id,
      amount: topup.amount,
      payment_session_id: data.payment_session_id,
      cashfree_order_id: data.order_id,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Wallet top-up failed.";
    console.error("[API wallet topup]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
