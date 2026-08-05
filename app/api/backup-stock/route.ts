import { NextResponse } from "next/server";
import {
  dbAddBackupStockBulk,
  dbAddBackupStockItem,
  dbGetBackupStock,
} from "@/lib/db/backup-stock";
import { isAdminApiRequest } from "@/lib/server-session";
import type { StockType } from "@/lib/stock";

export async function GET() {
  try {
    if (!(await isAdminApiRequest())) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }
    const items = await dbGetBackupStock();
    return NextResponse.json(items);
  } catch (error) {
    console.error("[API backup-stock GET]", error);
    return NextResponse.json({ error: "Failed to load backup stock." }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    if (!(await isAdminApiRequest())) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }
    const body = await req.json();

    if (typeof body.bulk === "string") {
      const items = await dbAddBackupStockBulk(body.bulk, {
        type: (body.type as StockType) || "vps",
        series: body.series,
        os: body.os,
        region: body.region,
        port: body.port,
      });
      return NextResponse.json({ created: items.length, items }, { status: 201 });
    }

    if (!body.ip || !body.username || !body.password || !body.series) {
      return NextResponse.json(
        { error: "ip, username, password, and series are required." },
        { status: 400 }
      );
    }

    const item = await dbAddBackupStockItem({
      type: (body.type as StockType) || "vps",
      series: String(body.series),
      ip: String(body.ip),
      username: String(body.username),
      password: String(body.password),
      port: String(body.port || "22"),
      os: String(body.os || "Ubuntu 22.04"),
      region: String(body.region || "Mumbai"),
      note: String(body.note || ""),
    });
    return NextResponse.json(item, { status: 201 });
  } catch (error) {
    console.error("[API backup-stock POST]", error);
    return NextResponse.json({ error: "Failed to add backup stock." }, { status: 500 });
  }
}
