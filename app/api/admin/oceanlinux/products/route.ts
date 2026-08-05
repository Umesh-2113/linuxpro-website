import { NextResponse } from "next/server";
import { isAdminApiRequest } from "@/lib/server-session";
import {
  isOceanLinuxConfigured,
  oceanLinuxListProducts,
} from "@/lib/oceanlinux/client";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await isAdminApiRequest())) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  if (!isOceanLinuxConfigured()) {
    return NextResponse.json(
      {
        error:
          "OceanLinux is not configured. Set OCEANLINUX_API_KEY and OCEANLINUX_API_SECRET.",
        configured: false,
        products: [],
      },
      { status: 503 }
    );
  }

  try {
    const products = await oceanLinuxListProducts();
    return NextResponse.json({ configured: true, count: products.length, products });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load OceanLinux products.";
    console.error("[API admin oceanlinux products]", message);
    return NextResponse.json({ error: message, products: [] }, { status: 502 });
  }
}
