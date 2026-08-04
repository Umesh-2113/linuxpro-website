import { NextResponse } from "next/server";
import {
  dbDeleteServerAction,
  dbGetServerActions,
  dbUpdateServerAction,
} from "@/lib/db/server-actions";
import { dbGetServerById, dbUpdateServer } from "@/lib/db/servers";
import {
  executeHostHeavenPasswordChange,
  executeHostHeavenServerAction,
} from "@/lib/hostheaven/actions";
import { resolveHostHeavenServer } from "@/lib/hostheaven/resolve-server";
import { isHostHeavenProvider } from "@/lib/stock-providers";
import { isAdminApiRequest, requireClientSession } from "@/lib/server-session";
import type { ServerActionStatus } from "@/lib/server-actions";

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

async function applyHostHeavenIfNeeded(
  actionId: string,
  status: ServerActionStatus,
  body: {
    status?: ServerActionStatus;
    adminNote?: string;
    newUsername?: string;
    newPassword?: string;
  }
) {
  const actions = await dbGetServerActions();
  const current = actions.find((entry) => entry.id === actionId);
  if (!current) return { ok: false as const, status: 404, error: "Action not found." };

  const rawServer = await dbGetServerById(current.serverId);
  if (!rawServer) {
    return { ok: false as const, status: 404, error: "Server not found." };
  }

  const server = await resolveHostHeavenServer(rawServer, current.serverIp);
  if (!isHostHeavenProvider(server.provider)) {
    return { ok: true as const, autoComplete: false as const };
  }

  if (!isHostHeavenProvider(rawServer.provider)) {
    await dbUpdateServer(server.id, {
      provider: "hostheaven",
      providerVmId: server.providerVmId,
    });
  }

  async function persistResolvedVmId(result: { vmId: number; resolvedFromIp: boolean }) {
    if (result.resolvedFromIp) {
      await dbUpdateServer(server!.id, { providerVmId: result.vmId });
    }
  }

  if (status === "processing") {
    const result = await executeHostHeavenServerAction(server, current.action, {
      reinstallOs: current.reinstallOs,
    });
    await persistResolvedVmId(result);

    if (current.action === "start") {
      await dbUpdateServer(server.id, { powerState: "running" });
      return { ok: true as const, autoComplete: true as const, nextStatus: "completed" as const };
    }
    if (current.action === "stop") {
      await dbUpdateServer(server.id, { powerState: "stopped" });
      return { ok: true as const, autoComplete: true as const, nextStatus: "completed" as const };
    }

    return { ok: true as const, autoComplete: false as const };
  }

  if (status === "completed" && current.action === "reinstall") {
    const password = body.newPassword?.trim() || current.newPassword?.trim();
    if (password) {
      const result = await executeHostHeavenPasswordChange(server, password);
      await persistResolvedVmId(result);
    }
    if (body.newUsername?.trim() || password) {
      await dbUpdateServer(server.id, {
        username: body.newUsername?.trim() || server.username,
        password: password || server.password,
        os: current.reinstallOs
          ? current.reinstallOs === "windows"
            ? "Windows Server"
            : "Ubuntu"
          : server.os,
        powerState: "running",
      });
    }
  }

  return { ok: true as const, autoComplete: false as const };
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
    const requestedStatus = body.status as ServerActionStatus | undefined;

    if (requestedStatus === "processing" || requestedStatus === "completed") {
      try {
        const hostResult = await applyHostHeavenIfNeeded(id, requestedStatus, body);
        if (!hostResult.ok) {
          return NextResponse.json({ error: hostResult.error }, { status: hostResult.status });
        }
        if (hostResult.autoComplete && hostResult.nextStatus) {
          body.status = hostResult.nextStatus;
        }
      } catch (error) {
        console.error("[API server-actions PATCH] HostHeaven:", error);
        return NextResponse.json(
          {
            error:
              error instanceof Error
                ? error.message
                : "HostHeaven API request failed.",
          },
          { status: 502 }
        );
      }
    }

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
