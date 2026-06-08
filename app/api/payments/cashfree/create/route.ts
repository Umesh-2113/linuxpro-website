import { NextResponse } from "next/server";
import {
  cashfreeCreateOrder,
  getAppBaseUrl,
} from "@/lib/cashfree-server";
import { getSiteDomain } from "@/lib/site";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      order_id,
      order_amount,
      customer_id,
      customer_name,
      customer_email,
      customer_phone,
      order_note,
    } = body;

    if (!order_id || !order_amount || !customer_id || !customer_phone) {
      return NextResponse.json(
        { success: false, message: "Missing required payment fields." },
        { status: 400 }
      );
    }

    const baseUrl = getAppBaseUrl();
    const amount = Number(order_amount);
    if (!Number.isFinite(amount) || amount < 1) {
      return NextResponse.json(
        { success: false, message: "Invalid order amount." },
        { status: 400 }
      );
    }

    const data = await cashfreeCreateOrder({
      order_id: String(order_id),
      order_amount: amount,
      order_currency: "INR",
      customer_details: {
        customer_id: String(customer_id),
        customer_name: String(customer_name || "Customer"),
        customer_email: String(customer_email || `customer@${getSiteDomain()}`),
        customer_phone: String(customer_phone),
      },
      order_meta: {
        return_url: `${baseUrl}/client/payment/callback?order_id={order_id}`,
      },
      order_note: order_note ? String(order_note) : undefined,
    });

    return NextResponse.json({
      success: true,
      payment_session_id: data.payment_session_id,
      cashfree_order_id: data.order_id,
      order_status: data.order_status,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Cashfree order creation failed";
    console.error("[Cashfree create]", message);
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
