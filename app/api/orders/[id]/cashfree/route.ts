import { NextResponse } from "next/server";
import { cashfreeFetchOrder, isCashfreePaid } from "@/lib/cashfree-server";
import { dbConfirmCashfreePayment, dbGetOrderById } from "@/lib/db/orders";
import { autoDeliverPaidOrder } from "@/lib/hostheaven/provision";
import { syncHostHeavenStockToDb } from "@/lib/hostheaven/sync-stock";
import { requireClientSession } from "@/lib/server-session";

type Params = { params: Promise<{ id: string }> };

export async function POST(_req: Request, { params }: Params) {
  try {
    const auth = await requireClientSession();
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { id } = await params;
    const order = await dbGetOrderById(id);
    if (!order) {
      return NextResponse.json({ error: "Order not found." }, { status: 404 });
    }
    if (order.userEmail.trim().toLowerCase() !== auth.email) {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }

    if (order.paymentStatus === "received") {
      const result = await autoDeliverPaidOrder(id);
      void syncHostHeavenStockToDb({ force: true }).catch(() => undefined);
      return NextResponse.json(result.order ?? order);
    }

    const cf = await cashfreeFetchOrder(id);
    if (!isCashfreePaid(cf.order_status)) {
      return NextResponse.json(
        { error: `Payment not completed (${cf.order_status}).` },
        { status: 402 }
      );
    }

    const paidAmount = Number(cf.order_amount);
    if (Number.isFinite(paidAmount) && Math.abs(paidAmount - order.totalAmount) > 0.5) {
      return NextResponse.json(
        { error: "Paid amount does not match order total." },
        { status: 400 }
      );
    }

    const updated = await dbConfirmCashfreePayment(id, cf.order_status);
    if (!updated) {
      return NextResponse.json({ error: "Order not found." }, { status: 404 });
    }

    const result = await autoDeliverPaidOrder(id);
    void syncHostHeavenStockToDb({ force: true }).catch(() => undefined);

    return NextResponse.json(result.order ?? updated);
  } catch (error) {
    console.error("[API orders cashfree]", error);
    const message =
      error instanceof Error ? error.message : "Failed to confirm payment.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
