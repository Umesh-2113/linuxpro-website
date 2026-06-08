import { NextResponse } from "next/server";
import { dbAddNews, dbGetActiveNews, dbGetNews } from "@/lib/db/news";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const activeOnly = searchParams.get("active") === "true";
    const items = activeOnly ? await dbGetActiveNews() : await dbGetNews();
    return NextResponse.json(items);
  } catch (error) {
    console.error("[API news GET]", error);
    return NextResponse.json({ error: "Failed to load news." }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const title = String(body?.title ?? "").trim();
    const message = String(body?.body ?? "").trim();
    if (!title || !message) {
      return NextResponse.json(
        { error: "Title and message are required." },
        { status: 400 }
      );
    }
    const item = await dbAddNews({
      title,
      body: message,
      variant: body?.variant ?? "info",
      active: body?.active !== false,
    });
    return NextResponse.json(item, { status: 201 });
  } catch (error) {
    console.error("[API news POST]", error);
    return NextResponse.json({ error: "Failed to create news." }, { status: 500 });
  }
}
