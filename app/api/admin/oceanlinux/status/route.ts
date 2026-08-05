import { NextResponse } from "next/server";
import { isAdminApiRequest } from "@/lib/server-session";
import {
  isOceanLinuxConfigured,
  oceanLinuxGetAccount,
} from "@/lib/oceanlinux/client";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await isAdminApiRequest())) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  if (!isOceanLinuxConfigured()) {
    return NextResponse.json({
      ok: false,
      configured: false,
      message: "Add OCEANLINUX_API_KEY and OCEANLINUX_API_SECRET in .env.",
    });
  }

  try {
    const account = await oceanLinuxGetAccount();
    return NextResponse.json({ ok: true, configured: true, account });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        configured: true,
        message: error instanceof Error ? error.message : "OceanLinux API failed.",
      },
      { status: 502 }
    );
  }
}
