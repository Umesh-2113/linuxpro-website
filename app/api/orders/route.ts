import { NextResponse } from "next/server";
import { dbCreateOrder, dbGetOrders, dbGetOrdersByUser } from "@/lib/db/orders";
import { requireClientSession, requireDataAccess } from "@/lib/server-session";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const email = searchParams.get("email");
    const auth = await requireDataAccess(email);
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    if (auth.isAdmin && !email) {
      return NextResponse.json(await dbGetOrders());
    }

    const orders = await dbGetOrdersByUser(email || auth.email);
    return NextResponse.json(orders);
  } catch (error) {
    console.error("[API orders GET]", error);
    return NextResponse.json({ error: "Failed to load orders." }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const auth = await requireClientSession();
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const body = await req.json();
    const order = await dbCreateOrder({
      ...body,
      userEmail: auth.email,
      userName: body.userName || auth.email.split("@")[0],
    });

    if (!order) {
      return NextResponse.json({ error: "Not enough stock available." }, { status: 400 });
    }
    return NextResponse.json(order, { status: 201 });
  } catch (error) {
    console.error("[API orders POST]", error);
    return NextResponse.json({ error: "Failed to create order." }, { status: 500 });
  }
}
