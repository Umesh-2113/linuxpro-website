import { NextResponse } from "next/server";
import { dbGetServers, dbGetServersByUser } from "@/lib/db/servers";
import { requireDataAccess } from "@/lib/server-session";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const email = searchParams.get("email");
    const auth = await requireDataAccess(email);
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    if (auth.isAdmin && !email) {
      return NextResponse.json(await dbGetServers());
    }

    const servers = await dbGetServersByUser(email || auth.email);
    return NextResponse.json(servers);
  } catch (error) {
    console.error("[API servers GET]", error);
    return NextResponse.json({ error: "Failed to load servers." }, { status: 500 });
  }
}
