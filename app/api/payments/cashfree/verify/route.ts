import { NextResponse } from "next/server";
import { cashfreeFetchOrder, isCashfreePaid } from "@/lib/cashfree-server";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const orderId = searchParams.get("order_id");

    if (!orderId) {
      return NextResponse.json(
        { success: false, message: "order_id is required." },
        { status: 400 }
      );
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
