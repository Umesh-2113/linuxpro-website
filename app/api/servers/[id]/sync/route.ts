import { NextResponse } from "next/server";
import { dbGetServerById } from "@/lib/db/servers";
import { syncServerFromHostHeaven } from "@/lib/hostheaven/sync-server";
import { syncServerFromOceanLinux } from "@/lib/oceanlinux/sync-server";
import { resolveOceanLinuxServer } from "@/lib/oceanlinux/resolve-server";
import { resolveHostHeavenServer } from "@/lib/hostheaven/resolve-server";
import {
  isHostHeavenProvider,
  isOceanLinuxProvider,
} from "@/lib/stock-providers";
import { isAdminApiRequest, requireClientSession } from "@/lib/server-session";

type Params = { params: Promise<{ id: string }> };

export async function POST(_req: Request, { params }: Params) {
  try {
    const { id } = await params;
    const raw = await dbGetServerById(id);
    if (!raw) {
      return NextResponse.json({ error: "Server not found." }, { status: 404 });
    }

    const isAdmin = await isAdminApiRequest();
    if (!isAdmin) {
      const auth = await requireClientSession(raw.userEmail);
      if (!auth.ok) {
        return NextResponse.json({ error: auth.error }, { status: auth.status });
      }
    }

    const ocean = await resolveOceanLinuxServer(raw);
    if (isOceanLinuxProvider(ocean.provider)) {
      const result = await syncServerFromOceanLinux(id);
      return NextResponse.json(result);
    }

    const hh = await resolveHostHeavenServer(raw);
    if (isHostHeavenProvider(hh.provider) || !raw.provider) {
      const result = await syncServerFromHostHeaven(id);
      return NextResponse.json(result);
    }

    return NextResponse.json(
      { error: "This server is not linked to a provider API." },
      { status: 400 }
    );
  } catch (error) {
    const rawMsg =
      error instanceof Error ? error.message : "Failed to sync server credentials.";
    // Never expose supplier brand name to customers.
    const message = rawMsg
      .replace(/HostHeaven/gi, "provider")
      .replace(/OceanLinux/gi, "provider");
    console.error("[API servers sync]", rawMsg);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
