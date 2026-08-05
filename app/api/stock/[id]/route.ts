import { NextResponse } from "next/server";
import { dbDeleteStockItem, dbUpdateStockItem } from "@/lib/db/stock";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Params) {
  try {
    const { id } = await params;
    const body = await req.json();
    const item = await dbUpdateStockItem(id, body);
    if (!item) {
      return NextResponse.json({ error: "Stock item not found." }, { status: 404 });
    }
    return NextResponse.json(item);
  } catch (error) {
    console.error("[API stock PATCH]", error);
    const message =
      error instanceof Error ? error.message : "Failed to update stock item.";
    return NextResponse.json(
      { error: message.includes("not primary") || message.includes("NotWritablePrimary")
          ? "Database is reconnecting. Please try again in a few seconds."
          : "Failed to update stock item." },
      { status: 500 }
    );
  }
}

export async function DELETE(_req: Request, { params }: Params) {
  try {
    const { id } = await params;
    const ok = await dbDeleteStockItem(id);
    if (!ok) {
      return NextResponse.json({ error: "Stock item not found." }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[API stock DELETE]", error);
    return NextResponse.json({ error: "Failed to delete stock item." }, { status: 500 });
  }
}
