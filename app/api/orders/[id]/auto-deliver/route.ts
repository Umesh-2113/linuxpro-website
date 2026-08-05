import { NextResponse } from "next/server";
import { dbGetOrderById } from "@/lib/db/orders";
import { autoDeliverPaidOrder } from "@/lib/hostheaven/provision";
import { syncHostHeavenStockToDb } from "@/lib/hostheaven/sync-stock";
import { isAdminApiRequest } from "@/lib/server-session";

type Params = { params: Promise<{ id: string }> };

/** Admin: retry HostHeaven auto-provision for a paid order. */
export async function POST(_req: Request, { params }: Params) {
  try {
    if (!(await isAdminApiRequest())) {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }

    const { id } = await params;
    const order = await dbGetOrderById(id);
    if (!order) {
      return NextResponse.json({ error: "Order not found." }, { status: 404 });
    }
    if (order.paymentStatus !== "received") {
      return NextResponse.json(
        { error: "Mark payment received before auto-provision." },
        { status: 400 }
      );
    }
    if (order.fulfillmentStatus === "delivered") {
      return NextResponse.json({
        ok: true,
        delivered: true,
        message: "Already delivered.",
        order,
      });
    }

    const result = await autoDeliverPaidOrder(id);
    void syncHostHeavenStockToDb({ force: true }).catch(() => undefined);

    return NextResponse.json({
      ok: result.delivered,
      delivered: result.delivered,
      message: result.message,
      order: result.order,
    });
  } catch (error) {
    console.error("[API orders auto-deliver]", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Auto-provision failed.",
      },
      { status: 500 }
    );
  }
}
