import { NextResponse } from "next/server";
import {
  dbDeliverOrderToCustomer,
  dbGetOrderById,
  dbUpdateOrderCredentials,
} from "@/lib/db/orders";
import { dbGetStockById } from "@/lib/db/stock";
import { dbUpdateServer } from "@/lib/db/servers";
import { isAdminApiRequest } from "@/lib/server-session";
import type { StockProvider } from "@/lib/stock-providers";

type Params = { params: Promise<{ id: string }> };

type CredUnit = {
  ip?: string;
  username?: string;
  password?: string;
  serverId?: string;
  providerOrderId?: string;
};

function parseUnits(body: {
  ip?: string;
  username?: string;
  password?: string;
  providerOrderId?: string;
  units?: CredUnit[];
}): {
  ip: string;
  username: string;
  password: string;
  serverId?: string;
  providerOrderId?: string;
}[] {
  if (Array.isArray(body.units) && body.units.length > 0) {
    return body.units.map((u) => ({
      ip: String(u.ip ?? "").trim(),
      username: String(u.username ?? "").trim(),
      password: String(u.password ?? ""),
      serverId: u.serverId ? String(u.serverId) : undefined,
      providerOrderId: u.providerOrderId ? String(u.providerOrderId).trim() : undefined,
    }));
  }
  return [
    {
      ip: String(body.ip ?? "").trim(),
      username: String(body.username ?? "").trim(),
      password: String(body.password ?? ""),
      providerOrderId: body.providerOrderId
        ? String(body.providerOrderId).trim()
        : undefined,
    },
  ];
}

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
    const units = parseUnits(body);
    const mode = body.mode;
    const stock = await dbGetStockById(order.stockId);
    const provider = (stock?.provider || "manual") as StockProvider;

    if (mode === "update") {
      if (units.length === 1 && !units[0].serverId) {
        const updated = await dbUpdateOrderCredentials(id, units[0]);
        if (!updated) {
          return NextResponse.json({ error: "Could not update credentials." }, { status: 400 });
        }
        return NextResponse.json(updated);
      }

      for (const unit of units) {
        if (!unit.serverId || !unit.ip || !unit.username || !unit.password) {
          return NextResponse.json(
            { error: "Each unit needs serverId, IP, username and password." },
            { status: 400 }
          );
        }
        await dbUpdateServer(unit.serverId, {
          ip: unit.ip,
          username: unit.username,
          password: unit.password,
          ...(unit.providerOrderId
            ? { providerOrderId: unit.providerOrderId, provider: "oceanlinux" as const }
            : {}),
        });
      }

      const primary = units[0];
      const { dbUpdateOrder } = await import("@/lib/db/orders");
      const updated = await dbUpdateOrder(id, {
        deliverIp: primary.ip,
        deliverUsername: primary.username,
        deliverPassword: primary.password,
      });
      return NextResponse.json(updated);
    }

    const deliverUnits = units.map((u) => ({
      ...u,
      provider: provider === "manual" ? undefined : provider,
    }));

    const updated = await dbDeliverOrderToCustomer(id, deliverUnits);
    if (!updated) {
      return NextResponse.json({ error: "Could not deliver order." }, { status: 400 });
    }
    return NextResponse.json(updated);
  } catch (error) {
    console.error("[API orders deliver]", error);
    const message =
      error instanceof Error ? error.message : "Failed to deliver order.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
