import { NextResponse } from "next/server";
import { dbDeleteNews, dbUpdateNews } from "@/lib/db/news";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Params) {
  try {
    const { id } = await params;
    const body = await req.json();
    const item = await dbUpdateNews(id, body);
    if (!item) {
      return NextResponse.json({ error: "News item not found." }, { status: 404 });
    }
    return NextResponse.json(item);
  } catch (error) {
    console.error("[API news PATCH]", error);
    return NextResponse.json({ error: "Failed to update news." }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: Params) {
  try {
    const { id } = await params;
    const ok = await dbDeleteNews(id);
    if (!ok) {
      return NextResponse.json({ error: "News item not found." }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[API news DELETE]", error);
    return NextResponse.json({ error: "Failed to delete news." }, { status: 500 });
  }
}
