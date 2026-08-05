import { NextResponse } from "next/server";
import { dbGetServerById } from "@/lib/db/servers";
import { syncServerFromHostHeaven } from "@/lib/hostheaven/sync-server";
import { isAdminApiRequest, requireClientSession } from "@/lib/server-session";

type Params = { params: Promise<{ id: string }> };

export async function POST(_req: Request, { params }: Params) {
  try {
    const { id } = await params;
    const server = await dbGetServerById(id);
    if (!server) {
      return NextResponse.json({ error: "Server not found." }, { status: 404 });
    }

    const isAdmin = await isAdminApiRequest();
    if (!isAdmin) {
      const auth = await requireClientSession(server.userEmail);
      if (!auth.ok) {
        return NextResponse.json({ error: auth.error }, { status: auth.status });
      }
    }

    if (server.provider && server.provider !== "hostheaven" && !server.providerVmId) {
      return NextResponse.json(
        { error: "This server is not linked to the provider API." },
        { status: 400 }
      );
    }

    const result = await syncServerFromHostHeaven(id);
    return NextResponse.json(result);
  } catch (error) {
    const raw =
      error instanceof Error ? error.message : "Failed to sync server credentials.";
    // Never expose supplier brand name to customers.
    const message = raw.replace(/HostHeaven/gi, "provider");
    console.error("[API servers sync]", raw);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
