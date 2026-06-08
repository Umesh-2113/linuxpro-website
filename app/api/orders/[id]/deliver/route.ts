import { NextResponse } from "next/server";
import { dbDeliverOrderToCustomer, dbGetOrderById, dbUpdateOrderCredentials } from "@/lib/db/orders";
import { isAdminApiRequest } from "@/lib/server-session";

type Params = { params: Promise<{ id: string }> };

export async function POST(req: Request, { params }: Params) {
  try {
    if (!(await isAdminApiRequest())) {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }

    const { id } = await params;
    const order = await dbGetOrderById(id);
    if (!order) {
      return NextResponse.json({ error: "Order not found." }, { status: 404 });
    }

    const body = await req.json();
    const { ip, username, password, mode } = body;

    const updated =
      mode === "update"
        ? await dbUpdateOrderCredentials(id, { ip, username, password })
        : await dbDeliverOrderToCustomer(id, { ip, username, password });

    if (!updated) {
      return NextResponse.json({ error: "Could not deliver order." }, { status: 400 });
    }
    return NextResponse.json(updated);
  } catch (error) {
    console.error("[API orders deliver]", error);
    return NextResponse.json({ error: "Failed to deliver order." }, { status: 500 });
  }
}
