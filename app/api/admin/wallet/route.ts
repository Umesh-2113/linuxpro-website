import { NextResponse } from "next/server";
import { dbGetWalletOverview } from "@/lib/db/wallet";
import { isAdminApiRequest } from "@/lib/server-session";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    if (!(await isAdminApiRequest())) {
      return NextResponse.json({ error: "Admin access required." }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const limit = Math.min(Number(searchParams.get("limit") ?? 100), 200);
    const overview = await dbGetWalletOverview(limit);

    return NextResponse.json(overview);
  } catch (error) {
    console.error("[API admin wallet GET]", error);
    return NextResponse.json({ error: "Failed to load wallets." }, { status: 500 });
  }
}
