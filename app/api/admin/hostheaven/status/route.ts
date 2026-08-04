import { NextResponse } from "next/server";
import {
  getHostHeavenSession,
  hostHeavenListVms,
  isHostHeavenConfigured,
} from "@/lib/hostheaven/client";
import { isAdminApiRequest } from "@/lib/server-session";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await isAdminApiRequest())) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  if (!isHostHeavenConfigured()) {
    return NextResponse.json({
      ok: false,
      configured: false,
      message: "Add HOSTHEAVEN_EMAIL and HOSTHEAVEN_PASSWORD in .env or VPS .env file.",
    });
  }

  try {
    const session = await getHostHeavenSession();
    const vms = await hostHeavenListVms();
    const ips = vms.flatMap((vm) => vm.ips);

    return NextResponse.json({
      ok: true,
      configured: true,
      accountType: session.isReseller ? "reseller" : "user",
      userId: session.userId,
      vmCount: vms.length,
      sampleIps: ips.slice(0, 8),
      message:
        session.isReseller
          ? "HostHeaven reseller API connected."
          : "HostHeaven user API connected (orders + control).",
    });
  } catch (error) {
    console.error("[API admin/hostheaven/status]", error);
    return NextResponse.json(
      {
        ok: false,
        configured: true,
        message: error instanceof Error ? error.message : "HostHeaven API connection failed.",
      },
      { status: 502 }
    );
  }
}
