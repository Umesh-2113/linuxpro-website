import { NextResponse } from "next/server";
import { cashfreeFetchOrder, isCashfreePaid } from "@/lib/cashfree-server";
import { dbGetOrderById } from "@/lib/db/orders";
import { dbGetWalletTopupById } from "@/lib/db/wallet";
import { requireClientSession } from "@/lib/server-session";

export async function GET(req: Request) {
  try {
    const auth = await requireClientSession();
    if (!auth.ok) {
      return NextResponse.json(
        { success: false, message: auth.error },
        { status: auth.status }
      );
    }

    const { searchParams } = new URL(req.url);
    const orderId = searchParams.get("order_id");

    if (!orderId) {
      return NextResponse.json(
        { success: false, message: "order_id is required." },
        { status: 400 }
      );
    }

    if (orderId.startsWith("WALLET-")) {
      const topup = await dbGetWalletTopupById(orderId);
      if (!topup || topup.userEmail !== auth.email) {
        return NextResponse.json(
          { success: false, message: "Top-up not found." },
          { status: 404 }
        );
      }
    } else {
      const order = await dbGetOrderById(orderId);
      if (!order || order.userEmail.trim().toLowerCase() !== auth.email) {
        return NextResponse.json(
          { success: false, message: "Order not found." },
          { status: 404 }
        );
      }
    }

    const data = await cashfreeFetchOrder(orderId);

    return NextResponse.json({
      success: true,
      order_id: data.order_id,
      order_status: data.order_status,
      paid: isCashfreePaid(data.order_status),
      order_amount: data.order_amount,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Cashfree verification failed";
    console.error("[Cashfree verify]", message);
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
