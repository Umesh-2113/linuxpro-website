import { NextResponse } from "next/server";
import {
  dbGetActionsByUser,
  dbGetServerActions,
} from "@/lib/db/server-actions";
import { dbGetServers } from "@/lib/db/servers";
import { createAndMaybeAutoExecuteAction } from "@/lib/hostheaven/auto-action";
import { requireClientSession, requireDataAccess } from "@/lib/server-session";
import type { ReinstallOsOption, ServerActionType } from "@/lib/server-actions";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const email = searchParams.get("email");
    const auth = await requireDataAccess(email);
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    if (auth.isAdmin && !email) {
      return NextResponse.json(await dbGetServerActions());
    }

    const actions = await dbGetActionsByUser(email || auth.email);
    return NextResponse.json(actions);
  } catch (error) {
    console.error("[API server-actions GET]", error);
    return NextResponse.json({ error: "Failed to load server actions." }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const auth = await requireClientSession();
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const body = await req.json();
    const actionType = body.action as ServerActionType;
    if (actionType !== "start" && actionType !== "stop" && actionType !== "reinstall") {
      return NextResponse.json({ error: "Invalid action." }, { status: 400 });
    }

    const reinstallOs = body.reinstallOs as ReinstallOsOption | undefined;
    if (actionType === "reinstall" && reinstallOs !== "windows" && reinstallOs !== "ubuntu") {
      return NextResponse.json({ error: "Choose Windows or Ubuntu for reinstall." }, { status: 400 });
    }

    if (!body.serverId || !body.serverIp) {
      return NextResponse.json({ error: "Server details are required." }, { status: 400 });
    }

    const serverId = String(body.serverId);
    const servers = await dbGetServers();
    const server = servers.find((s) => s.id === serverId);
    if (!server) {
      return NextResponse.json({ error: "Server not found." }, { status: 404 });
    }
    if (server.userEmail.trim().toLowerCase() !== auth.email) {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }

    const action = await createAndMaybeAutoExecuteAction({
      serverId,
      serverName: String(body.serverName || server.name || body.serverIp),
      serverIp: String(body.serverIp || server.ip),
      orderId: body.orderId ? String(body.orderId) : server.orderId || "",
      userEmail: auth.email,
      userName: body.userName || auth.email.split("@")[0],
      action: actionType,
      reinstallOs,
    });

    return NextResponse.json(action, { status: 201 });
  } catch (error) {
    console.error("[API server-actions POST]", error);
    const message =
      error instanceof Error ? error.message : "Failed to create server action.";
    const isHostHeaven =
      message.toLowerCase().includes("hostheaven") ||
      message.toLowerCase().includes("rebuild") ||
      message.toLowerCase().includes("iso");
    return NextResponse.json(
      { error: message },
      { status: isHostHeaven ? 502 : 500 }
    );
  }
}
