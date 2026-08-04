import { NextResponse } from "next/server";
import {
  dbAddStockItem,
  dbGetStock,
  dbGetStockByType,
} from "@/lib/db/stock";
import { syncHostHeavenStockToDb } from "@/lib/hostheaven/sync-stock";
import { isHostHeavenConfigured } from "@/lib/hostheaven/client";
import type { StockType } from "@/lib/stock";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type") as StockType | "all" | null;
    const forceSync = searchParams.get("sync") === "1";

    if (isHostHeavenConfigured()) {
      await syncHostHeavenStockToDb({
        force: forceSync,
        minIntervalMs: forceSync ? 0 : 90_000,
      }).catch((error) => {
        console.error("[API stock sync]", error);
      });
    }

    const items = type ? await dbGetStockByType(type) : await dbGetStock();
    return NextResponse.json(items);
  } catch (error) {
    console.error("[API stock GET]", error);
    return NextResponse.json({ error: "Failed to load stock." }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const item = await dbAddStockItem(body);
    return NextResponse.json(item, { status: 201 });
  } catch (error) {
    console.error("[API stock POST]", error);
    return NextResponse.json({ error: "Failed to add stock item." }, { status: 500 });
  }
}
