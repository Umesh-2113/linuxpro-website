import { NextResponse } from "next/server";
import {
  dbDeleteBackupStockItem,
  dbUpdateBackupStockItem,
} from "@/lib/db/backup-stock";
import { isAdminApiRequest } from "@/lib/server-session";
import type { BackupStockStatus } from "@/lib/backup-stock";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Params) {
  try {
    if (!(await isAdminApiRequest())) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }
    const { id } = await params;
    const body = await req.json();
    const allowed: Record<string, unknown> = {};
    for (const key of [
      "type",
      "series",
      "ip",
      "username",
      "password",
      "port",
      "os",
      "region",
      "status",
      "note",
      "orderId",
    ] as const) {
      if (body[key] !== undefined) allowed[key] = body[key];
    }
    if (
      allowed.status &&
      !["free", "sold", "reserved"].includes(String(allowed.status))
    ) {
      return NextResponse.json({ error: "Invalid status." }, { status: 400 });
    }
    if (allowed.status === "free") {
      allowed.orderId = undefined;
    }
    const item = await dbUpdateBackupStockItem(
      id,
      allowed as Partial<{
        type: "linux" | "vps" | "proxy";
        series: string;
        ip: string;
        username: string;
        password: string;
        port: string;
        os: string;
        region: string;
        status: BackupStockStatus;
        note: string;
        orderId: string;
      }>
    );
    if (!item) {
      return NextResponse.json({ error: "Not found." }, { status: 404 });
    }
    return NextResponse.json(item);
  } catch (error) {
    console.error("[API backup-stock PATCH]", error);
    return NextResponse.json({ error: "Failed to update." }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: Params) {
  try {
    if (!(await isAdminApiRequest())) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }
    const { id } = await params;
    const ok = await dbDeleteBackupStockItem(id);
    if (!ok) {
      return NextResponse.json({ error: "Not found." }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[API backup-stock DELETE]", error);
    return NextResponse.json({ error: "Failed to delete." }, { status: 500 });
  }
}
