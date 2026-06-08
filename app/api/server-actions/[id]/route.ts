import { NextResponse } from "next/server";
import {
  dbDeleteServerAction,
  dbGetServerActions,
  dbUpdateServerAction,
} from "@/lib/db/server-actions";
import { isAdminApiRequest, requireClientSession } from "@/lib/server-session";

type Params = { params: Promise<{ id: string }> };

async function assertActionAccess(actionId: string) {
  const actions = await dbGetServerActions();
  const action = actions.find((entry) => entry.id === actionId);
  if (!action) {
    return { ok: false as const, status: 404, error: "Action not found." };
  }
  if (await isAdminApiRequest()) {
    return { ok: true as const, action };
  }
  const auth = await requireClientSession(action.userEmail);
  if (!auth.ok) {
    return { ok: false as const, status: auth.status, error: auth.error };
  }
  return { ok: true as const, action };
}

export async function PATCH(req: Request, { params }: Params) {
  try {
    const { id } = await params;
    const access = await assertActionAccess(id);
    if (!access.ok) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }
    if (!(await isAdminApiRequest())) {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }
    const body = await req.json();
    const action = await dbUpdateServerAction(id, body);
    if (!action) {
      return NextResponse.json({ error: "Action not found." }, { status: 404 });
    }
    return NextResponse.json(action);
  } catch (error) {
    console.error("[API server-actions PATCH]", error);
    return NextResponse.json({ error: "Failed to update server action." }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: Params) {
  try {
    const { id } = await params;
    const access = await assertActionAccess(id);
    if (!access.ok) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }
    if (!(await isAdminApiRequest())) {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }
    await dbDeleteServerAction(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[API server-actions DELETE]", error);
    return NextResponse.json({ error: "Failed to delete server action." }, { status: 500 });
  }
}
