import type { BackupStockItem, BackupStockStatus } from "@/lib/backup-stock";
import type { StockType } from "@/lib/stock";
import { getAllocatedIpSet } from "@/lib/hostheaven/allocated";
import { ipMatchesSeries, seriesIpPrefix } from "@/lib/hostheaven/series";
import { getCollection, withMongoWriteRetry } from "@/lib/mongodb";

async function collection() {
  return getCollection<BackupStockItem>("backup_stock");
}

function normalize(item: BackupStockItem): BackupStockItem {
  return {
    ...item,
    port: item.port ?? "22",
    note: item.note ?? "",
    os: item.os || "Ubuntu 22.04",
    region: item.region || "Mumbai",
    status: (item.status as BackupStockStatus) || "free",
  };
}

function seriesMatches(item: BackupStockItem, series: string): boolean {
  if (ipMatchesSeries(item.ip, series)) return true;
  if (item.series.trim().toLowerCase() === series.trim().toLowerCase()) return true;
  const a = seriesIpPrefix(item.series).toLowerCase();
  const b = seriesIpPrefix(series).toLowerCase();
  return Boolean(a && b && a === b);
}

/** VPS ↔ Linux share SSH delivery; Proxy stays its own pool. */
export function backupTypesCompatible(
  itemType: StockType,
  orderType: StockType
): boolean {
  if (itemType === orderType) return true;
  const serverish = new Set<StockType>(["vps", "linux"]);
  return serverish.has(itemType) && serverish.has(orderType);
}

function rankTypeMatch(itemType: StockType, orderType?: StockType): number {
  if (!orderType) return 0;
  if (itemType === orderType) return 0;
  if (backupTypesCompatible(itemType, orderType)) return 1;
  return 99;
}

export async function dbGetBackupStock(): Promise<BackupStockItem[]> {
  const items = await (await collection()).find({}).sort({ createdAt: -1 }).toArray();
  return items.map(normalize);
}

export async function dbGetBackupStockById(id: string): Promise<BackupStockItem | null> {
  const item = await (await collection()).findOne({ id });
  return item ? normalize(item) : null;
}

export async function dbAddBackupStockItem(
  data: Omit<BackupStockItem, "id" | "status" | "createdAt" | "updatedAt" | "orderId">
): Promise<BackupStockItem> {
  return withMongoWriteRetry(async () => {
    const now = new Date().toISOString();
    const item: BackupStockItem = {
      ...data,
      ip: data.ip.trim(),
      username: data.username.trim(),
      password: data.password,
      series: data.series.trim(),
      port: (data.port || (data.type === "vps" ? "" : "22")).trim(),
      id: `bak-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      status: "free",
      createdAt: now,
      updatedAt: now,
    };
    await (await collection()).insertOne(item);
    return normalize(item);
  });
}

/** Bulk lines: IP|username|password|port (port optional) */
export async function dbAddBackupStockBulk(
  raw: string,
  defaults: {
    type?: StockType;
    series?: string;
    os?: string;
    region?: string;
    port?: string;
  } = {}
): Promise<BackupStockItem[]> {
  const lines = raw
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  const created: BackupStockItem[] = [];
  for (const line of lines) {
    const parts = line.split(/[|,\t]/).map((p) => p.trim());
    const [ip, username, password, port] = parts;
    if (!ip || !username || !password) continue;
    const item = await dbAddBackupStockItem({
      type: defaults.type ?? "vps",
      series: defaults.series || ip.split(".").slice(0, 2).join("."),
      ip,
      username,
      password,
      port: port || defaults.port || "22",
      os: defaults.os || "Ubuntu 22.04",
      region: defaults.region || "Mumbai",
      note: "",
    });
    created.push(item);
  }
  return created;
}

export async function dbUpdateBackupStockItem(
  id: string,
  updates: Partial<Omit<BackupStockItem, "id" | "createdAt">>
): Promise<BackupStockItem | null> {
  return withMongoWriteRetry(async () => {
    const col = await collection();
    const existing = await col.findOne({ id });
    if (!existing) return null;
    const clearOrder = updates.status === "free" || updates.orderId === "";
    const next = normalize({
      ...existing,
      ...updates,
      id: existing.id,
      updatedAt: new Date().toISOString(),
      ...(clearOrder ? { orderId: undefined } : {}),
    });
    const { _id: _ignored, orderId, ...rest } = next as BackupStockItem & {
      _id?: unknown;
    };
    if (clearOrder) {
      await col.updateOne(
        { id },
        { $set: rest, $unset: { orderId: "" } }
      );
      return { ...next, orderId: undefined };
    }
    await col.updateOne(
      { id },
      { $set: { ...rest, ...(orderId ? { orderId } : {}) } }
    );
    return next;
  });
}

export async function dbDeleteBackupStockItem(id: string): Promise<boolean> {
  return withMongoWriteRetry(async () => {
    const result = await (await collection()).deleteOne({ id });
    return result.deletedCount > 0;
  });
}

export async function dbReleaseBackupStockForOrder(orderId: string): Promise<number> {
  return withMongoWriteRetry(async () => {
    const result = await (await collection()).updateMany(
      { orderId, status: "sold" },
      {
        $set: { status: "free", updatedAt: new Date().toISOString() },
        $unset: { orderId: "" },
      }
    );
    return result.modifiedCount;
  });
}

/** Atomically claim free backup units matching series (VPS/Linux interchangeable). */
export async function dbClaimBackupStockForOrder(
  orderId: string,
  series: string,
  quantity: number,
  type?: StockType
): Promise<BackupStockItem[]> {
  return withMongoWriteRetry(async () => {
    const usedIps = await getAllocatedIpSet();
    const col = await collection();
    const free = (await col.find({ status: "free" }).sort({ createdAt: 1 }).toArray())
      .map(normalize)
      .filter((item) => {
        if (type && !backupTypesCompatible(item.type, type)) return false;
        if (usedIps.has(item.ip.trim().toLowerCase())) return false;
        return seriesMatches(item, series);
      })
      .sort((a, b) => rankTypeMatch(a.type, type) - rankTypeMatch(b.type, type));

    const claimed: BackupStockItem[] = [];
    for (const item of free) {
      if (claimed.length >= quantity) break;
      const updated = await col.findOneAndUpdate(
        { id: item.id, status: "free" },
        {
          $set: {
            status: "sold",
            orderId,
            updatedAt: new Date().toISOString(),
          },
        },
        { returnDocument: "after" }
      );
      if (updated?.id) {
        claimed.push(normalize(updated));
      }
    }
    return claimed;
  });
}

export async function dbCountFreeBackupForSeries(
  series: string,
  type?: StockType
): Promise<number> {
  const usedIps = await getAllocatedIpSet();
  const items = await dbGetBackupStock();
  return items.filter((item) => {
    if (item.status !== "free") return false;
    if (type && !backupTypesCompatible(item.type, type)) return false;
    if (usedIps.has(item.ip.trim().toLowerCase())) return false;
    return seriesMatches(item, series);
  }).length;
}
