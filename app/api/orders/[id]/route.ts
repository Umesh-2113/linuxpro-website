import { NextResponse } from "next/server";
import {
  dbDeleteOrder,
  dbGetOrderById,
  dbUpdateOrder,
} from "@/lib/db/orders";
import { isAdminApiRequest, requireClientSession } from "@/lib/server-session";

type Params = { params: Promise<{ id: string }> };

async function assertOrderAccess(orderId: string) {
  const order = await dbGetOrderById(orderId);
  if (!order) {
    return { ok: false as const, status: 404, error: "Order not found." };
  }
  if (await isAdminApiRequest()) {
    return { ok: true as const, order };
  }
  const auth = await requireClientSession(order.userEmail);
  if (!auth.ok) {
    return { ok: false as const, status: auth.status, error: auth.error };
  }
  return { ok: true as const, order };
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
    const order = await dbUpdateOrder(id, body);
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
    const access = await assertOrderAccess(id);
    if (!access.ok) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }
    await dbDeleteOrder(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[API orders DELETE]", error);
    return NextResponse.json({ error: "Failed to delete order." }, { status: 500 });
  }
}
