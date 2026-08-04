import { NextResponse } from "next/server";
import { syncHostHeavenStockToDb } from "@/lib/hostheaven/sync-stock";
import { isHostHeavenConfigured } from "@/lib/hostheaven/client";
import { isAdminApiRequest } from "@/lib/server-session";

export const dynamic = "force-dynamic";

export async function POST() {
  if (!(await isAdminApiRequest())) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  if (!isHostHeavenConfigured()) {
    return NextResponse.json({
      ok: false,
      message: "Add HOSTHEAVEN_EMAIL and HOSTHEAVEN_PASSWORD in .env.",
    });
  }

  const result = await syncHostHeavenStockToDb({ force: true });
  return NextResponse.json(result, { status: result.ok ? 200 : 502 });
}
