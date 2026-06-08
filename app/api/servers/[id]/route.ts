import { NextResponse } from "next/server";
import { dbGetServerById, dbUpdateServer } from "@/lib/db/servers";
import { isAdminApiRequest, requireClientSession } from "@/lib/server-session";

type Params = { params: Promise<{ id: string }> };

async function assertServerAccess(serverId: string) {
  const server = await dbGetServerById(serverId);
  if (!server) {
    return { ok: false as const, status: 404, error: "Server not found." };
  }
  if (await isAdminApiRequest()) {
    return { ok: true as const, server };
  }
  const auth = await requireClientSession(server.userEmail);
  if (!auth.ok) {
    return { ok: false as const, status: auth.status, error: auth.error };
  }
  return { ok: true as const, server };
}

export async function GET(_req: Request, { params }: Params) {
  try {
    const { id } = await params;
    const access = await assertServerAccess(id);
    if (!access.ok) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }
    return NextResponse.json(access.server);
  } catch (error) {
    console.error("[API servers GET id]", error);
    return NextResponse.json({ error: "Failed to load server." }, { status: 500 });
  }
}

export async function PATCH(req: Request, { params }: Params) {
  try {
    const { id } = await params;
    const access = await assertServerAccess(id);
    if (!access.ok) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }
    const body = await req.json();
    const server = await dbUpdateServer(id, body);
    if (!server) {
      return NextResponse.json({ error: "Server not found." }, { status: 404 });
    }
    return NextResponse.json(server);
  } catch (error) {
    console.error("[API servers PATCH]", error);
    return NextResponse.json({ error: "Failed to update server." }, { status: 500 });
  }
}
