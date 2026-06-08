import { NextResponse } from "next/server";
import {
  dbGetNewsPopupSettings,
  dbUpdateNewsPopupSettings,
} from "@/lib/db/news-settings";

export async function GET() {
  try {
    const settings = await dbGetNewsPopupSettings();
    return NextResponse.json(settings);
  } catch (error) {
    console.error("[API news settings GET]", error);
    return NextResponse.json(
      { error: "Failed to load news settings." },
      { status: 500 }
    );
  }
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const settings = await dbUpdateNewsPopupSettings({
      whatsappNumber:
        body?.whatsappNumber !== undefined
          ? String(body.whatsappNumber).trim()
          : undefined,
      whatsappJoinLink:
        body?.whatsappJoinLink !== undefined
          ? String(body.whatsappJoinLink).trim()
          : undefined,
      contactPhone:
        body?.contactPhone !== undefined
          ? String(body.contactPhone).trim()
          : undefined,
      contactEmail:
        body?.contactEmail !== undefined
          ? String(body.contactEmail).trim()
          : undefined,
    });
    return NextResponse.json(settings);
  } catch (error) {
    console.error("[API news settings PATCH]", error);
    return NextResponse.json(
      { error: "Failed to update news settings." },
      { status: 500 }
    );
  }
}
