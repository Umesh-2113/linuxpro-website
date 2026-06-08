import { NextResponse } from "next/server";
import { dbConfirmCashfreePayment, dbGetOrderById } from "@/lib/db/orders";
import { requireClientSession } from "@/lib/server-session";

type Params = { params: Promise<{ id: string }> };

export async function POST(req: Request, { params }: Params) {
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

    const body = await req.json();
    const updated = await dbConfirmCashfreePayment(
      id,
      String(body.cashfreeStatus ?? "PAID")
    );
    if (!updated) {
      return NextResponse.json({ error: "Order not found." }, { status: 404 });
    }
    return NextResponse.json(updated);
  } catch (error) {
    console.error("[API orders cashfree]", error);
    return NextResponse.json({ error: "Failed to confirm payment." }, { status: 500 });
  }
}
