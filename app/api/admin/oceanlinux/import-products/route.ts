import { NextResponse } from "next/server";
import { isAdminApiRequest } from "@/lib/server-session";
import { isOceanLinuxConfigured } from "@/lib/oceanlinux/client";
import { importOceanLinuxProductsToStock } from "@/lib/oceanlinux/import-products";

export const dynamic = "force-dynamic";

/**
 * POST /api/admin/oceanlinux/import-products
 * Body (optional): { updateExisting?: boolean, defaultQuantity?: number }
 */
export async function POST(req: Request) {
  if (!(await isAdminApiRequest())) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }
  if (!isOceanLinuxConfigured()) {
    return NextResponse.json(
      { error: "OceanLinux API keys not configured." },
      { status: 503 }
    );
  }

  try {
    const body = (await req.json().catch(() => ({}))) as {
      updateExisting?: boolean;
      defaultQuantity?: number;
    };
    const result = await importOceanLinuxProductsToStock({
      onlyMissing: true,
      updateExisting: Boolean(body.updateExisting),
      defaultQuantity:
        typeof body.defaultQuantity === "number" ? body.defaultQuantity : 0,
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "OceanLinux import failed.";
    console.error("[API admin oceanlinux import]", message);
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
