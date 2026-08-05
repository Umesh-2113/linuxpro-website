import { NextResponse } from "next/server";
import { dbDebitWallet } from "@/lib/db/wallet";
import { dbGetOrderById, dbUpdateOrder } from "@/lib/db/orders";
import { autoDeliverPaidOrder } from "@/lib/hostheaven/provision";
import { syncHostHeavenStockToDb } from "@/lib/hostheaven/sync-stock";
import { getCollection } from "@/lib/mongodb";
import type { Order } from "@/lib/orders";
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

    if (order.paymentStatus === "processing") {
      return NextResponse.json(
        { error: "Payment is already being processed. Please wait a moment." },
        { status: 409 }
      );
    }

    if (order.paymentGateway !== "wallet") {
      return NextResponse.json(
        { error: "This order is not set up for wallet payment." },
        { status: 400 }
      );
    }

    const col = await getCollection<Order>("orders");
    const claimed = await col.findOneAndUpdate(
      { id, paymentStatus: "pending", paymentGateway: "wallet" },
      {
        $set: {
          paymentStatus: "processing",
          updatedAt: new Date().toISOString(),
        },
      },
      { returnDocument: "after" }
    );

    if (!claimed?.id) {
      const current = await dbGetOrderById(id);
      if (current?.paymentStatus === "received") {
        const result = await autoDeliverPaidOrder(id);
        return NextResponse.json(result.order ?? current);
      }
      return NextResponse.json(
        { error: "Payment is already being processed." },
        { status: 409 }
      );
    }

    try {
      await dbDebitWallet({
        userEmail: auth.email,
        amount: order.totalAmount,
        description: `Order ${order.id} — IP ${order.series}`,
        refId: order.id,
      });
    } catch (error) {
      await dbUpdateOrder(id, { paymentStatus: "pending" });
      throw error;
    }

    const updated = await dbUpdateOrder(id, {
      paymentStatus: "received",
      paymentGateway: "wallet",
      cashfreeOrderStatus: "WALLET_PAID",
    });

    if (!updated) {
      return NextResponse.json({ error: "Order not found." }, { status: 404 });
    }

    const result = await autoDeliverPaidOrder(id);
    void syncHostHeavenStockToDb({ force: true }).catch(() => undefined);

    return NextResponse.json(result.order ?? updated);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Wallet payment failed.";
    console.error("[API orders wallet]", message);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
