import { NextResponse } from "next/server";
import {
  dbDeleteOrder,
  dbGetOrderById,
  dbUpdateOrder,
} from "@/lib/db/orders";
import type { FulfillmentStatus, PaymentStatus } from "@/lib/orders";
import { isAdminApiRequest, requireClientSession } from "@/lib/server-session";

type Params = { params: Promise<{ id: string }> };

async function assertOrderAccess(orderId: string) {
  const order = await dbGetOrderById(orderId);
  if (!order) {
    return { ok: false as const, status: 404, error: "Order not found." };
  }
  if (await isAdminApiRequest()) {
    return { ok: true as const, order, isAdmin: true as const };
  }
  const auth = await requireClientSession(order.userEmail);
  if (!auth.ok) {
    return { ok: false as const, status: auth.status, error: auth.error };
  }
  return { ok: true as const, order, isAdmin: false as const };
}

export async function GET(_req: Request, { params }: Params) {
  try {
    const { id } = await params;
    const access = await assertOrderAccess(id);
    if (!access.ok) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }
    return NextResponse.json(access.order);
  } catch (error) {
    console.error("[API orders GET id]", error);
    return NextResponse.json({ error: "Failed to load order." }, { status: 500 });
  }
}

export async function PATCH(req: Request, { params }: Params) {
  try {
    const { id } = await params;
    const access = await assertOrderAccess(id);
    if (!access.ok) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    const body = await req.json();

    // Clients cannot set payment / fulfillment / delivery fields.
    if (!access.isAdmin) {
      return NextResponse.json(
        { error: "Only admin can update orders." },
        { status: 403 }
      );
    }

    const allowed: Record<string, unknown> = {};
    const paymentStatuses: PaymentStatus[] = ["pending", "received", "not_received", "processing"];
    const fulfillmentStatuses: FulfillmentStatus[] = [
      "pending",
      "processing",
      "delivered",
      "cancelled",
    ];

    for (const key of [
      "paymentStatus",
      "fulfillmentStatus",
      "adminNote",
      "customerPhone",
      "deliverIp",
      "deliverUsername",
      "deliverPassword",
      "paymentGateway",
      "cashfreeOrderStatus",
    ] as const) {
      if (body[key] !== undefined) allowed[key] = body[key];
    }

    if (
      typeof allowed.paymentStatus === "string" &&
      !paymentStatuses.includes(allowed.paymentStatus as PaymentStatus)
    ) {
      return NextResponse.json({ error: "Invalid paymentStatus." }, { status: 400 });
    }
    if (
      typeof allowed.fulfillmentStatus === "string" &&
      !fulfillmentStatuses.includes(allowed.fulfillmentStatus as FulfillmentStatus)
    ) {
      return NextResponse.json({ error: "Invalid fulfillmentStatus." }, { status: 400 });
    }

    const order = await dbUpdateOrder(id, allowed);
    if (!order) {
      return NextResponse.json({ error: "Order not found." }, { status: 404 });
    }
    return NextResponse.json(order);
  } catch (error) {
    console.error("[API orders PATCH]", error);
    return NextResponse.json({ error: "Failed to update order." }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: Params) {
  try {
    const { id } = await params;
    if (!(await isAdminApiRequest())) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }
    const order = await dbGetOrderById(id);
    if (!order) {
      return NextResponse.json({ error: "Order not found." }, { status: 404 });
    }
    await dbDeleteOrder(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[API orders DELETE]", error);
    return NextResponse.json({ error: "Failed to delete order." }, { status: 500 });
  }
}
