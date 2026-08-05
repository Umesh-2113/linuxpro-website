import { NextResponse } from "next/server";
import {
  cashfreeCreateOrder,
  getAppBaseUrl,
} from "@/lib/cashfree-server";
import { dbGetOrderById } from "@/lib/db/orders";
import { dbGetWalletTopupById } from "@/lib/db/wallet";
import { getSiteDomain } from "@/lib/site";
import { requireClientSession } from "@/lib/server-session";

export async function POST(req: Request) {
  try {
    const auth = await requireClientSession();
    if (!auth.ok) {
      return NextResponse.json(
        { success: false, message: auth.error },
        { status: auth.status }
      );
    }

    const body = await req.json();
    const orderId = String(body.order_id ?? "");
    const customerPhone = String(body.customer_phone ?? "").trim();
    const customerName = String(body.customer_name || "Customer");
    const orderNote = body.order_note ? String(body.order_note) : undefined;

    if (!orderId || !customerPhone) {
      return NextResponse.json(
        { success: false, message: "Missing required payment fields." },
        { status: 400 }
      );
    }

    let amount = 0;
    let customerEmail = auth.email;
    let customerId = auth.email.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 50);

    if (orderId.startsWith("WALLET-")) {
      const topup = await dbGetWalletTopupById(orderId);
      if (!topup || topup.userEmail !== auth.email) {
        return NextResponse.json(
          { success: false, message: "Top-up not found." },
          { status: 404 }
        );
      }
      if (topup.status === "completed") {
        return NextResponse.json(
          { success: false, message: "Top-up already completed." },
          { status: 400 }
        );
      }
      amount = topup.amount;
    } else {
      const order = await dbGetOrderById(orderId);
      if (!order) {
        return NextResponse.json(
          { success: false, message: "Order not found." },
          { status: 404 }
        );
      }
      if (order.userEmail.trim().toLowerCase() !== auth.email) {
        return NextResponse.json(
          { success: false, message: "Forbidden." },
          { status: 403 }
        );
      }
      if (order.paymentStatus === "received") {
        return NextResponse.json(
          { success: false, message: "Order is already paid." },
          { status: 400 }
        );
      }
      amount = order.totalAmount;
      customerEmail = order.userEmail;
    }

    if (!Number.isFinite(amount) || amount < 1) {
      return NextResponse.json(
        { success: false, message: "Invalid order amount." },
        { status: 400 }
      );
    }

    const baseUrl = getAppBaseUrl();
    const data = await cashfreeCreateOrder({
      order_id: orderId,
      order_amount: amount,
      order_currency: "INR",
      customer_details: {
        customer_id: String(body.customer_id || customerId),
        customer_name: customerName,
        customer_email: String(body.customer_email || customerEmail || `customer@${getSiteDomain()}`),
        customer_phone: customerPhone,
      },
      order_meta: {
        return_url: `${baseUrl}/client/payment/callback?order_id={order_id}`,
      },
      order_note: orderNote,
    });

    return NextResponse.json({
      success: true,
      payment_session_id: data.payment_session_id,
      cashfree_order_id: data.order_id,
      order_status: data.order_status,
      order_amount: amount,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Cashfree order creation failed";
    console.error("[Cashfree create]", message);
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
