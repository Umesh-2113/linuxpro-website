import {
  computeDefaultStockPrice,
  type StockItem,
  type StockType,
} from "@/lib/stock";
import { normalizeStockProvider } from "@/lib/stock-providers";
import { dbGetOrders } from "@/lib/db/orders";
import { getCollection, hasMongoEnv } from "@/lib/mongodb";
import { ensureSeeded } from "@/lib/db/seed";

function normalizeItem(item: StockItem): StockItem {
  const base = { ...item, port: item.port ?? "" };
  return {
    ...base,
    provider: normalizeStockProvider(base.provider),
    providerVmId:
      typeof base.providerVmId === "number" && base.providerVmId > 0
        ? Math.round(base.providerVmId)
        : undefined,
    price:
      typeof base.price === "number" && base.price > 0
        ? base.price
        : computeDefaultStockPrice(base),
  };
}

async function collection() {
  await ensureSeeded();
  return getCollection<StockItem>("stock");
}

export async function dbGetStock(): Promise<StockItem[]> {
  const items = await (await collection()).find({}).sort({ createdAt: -1 }).toArray();
  return items.map(normalizeItem);
}

export async function dbGetStockById(id: string): Promise<StockItem | null> {
  const item = await (await collection()).findOne({ id });
  return item ? normalizeItem(item) : null;
}

export async function dbAddStockItem(
  item: Omit<StockItem, "id" | "createdAt">
): Promise<StockItem> {
  const { withMongoWriteRetry } = await import("@/lib/mongodb");
  return withMongoWriteRetry(async () => {
    const newItem: StockItem = {
      ...item,
      id: `stock-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    await (await collection()).insertOne(newItem);
    return normalizeItem(newItem);
  });
}

export async function dbUpdateStockItem(
  id: string,
  updates: Partial<Omit<StockItem, "id" | "createdAt">>
): Promise<StockItem | null> {
  const { withMongoWriteRetry } = await import("@/lib/mongodb");
  return withMongoWriteRetry(async () => {
    const col = await collection();
    const existing = await col.findOne({ id });
    if (!existing) return null;

    // Never $set immutable Mongo _id — causes update failures.
    const { _id: _ignored, ...existingFields } = existing as StockItem & {
      _id?: unknown;
    };
    const next = normalizeItem({ ...existingFields, ...updates, id: existing.id });
    const { _id: _drop, ...toSet } = next as StockItem & { _id?: unknown };
    await col.updateOne({ id }, { $set: toSet });
    return next;
  });
}

export async function dbDeleteStockItem(id: string): Promise<boolean> {
  const { withMongoWriteRetry } = await import("@/lib/mongodb");
  return withMongoWriteRetry(async () => {
    const result = await (await collection()).deleteOne({ id });
    return result.deletedCount > 0;
  });
}

export async function dbGetStockByType(type: StockType | "all"): Promise<StockItem[]> {
  const items = await dbGetStock();
  if (type === "all") return items;
  return items.filter((item) => item.type === type);
}

/** Top-selling stock by paid order quantity; fills with in-stock items if fewer sales exist. */
export async function dbGetTopSellingStock(limit = 4): Promise<StockItem[]> {
  if (!hasMongoEnv()) return [];

  try {
    const [items, orders] = await Promise.all([dbGetStock(), dbGetOrders()]);
    if (items.length === 0) return [];

    const sales = new Map<string, number>();
    for (const order of orders) {
      if (order.paymentStatus !== "received") continue;
      sales.set(order.stockId, (sales.get(order.stockId) ?? 0) + order.quantity);
    }

    const ranked = [...items].sort((a, b) => {
      const soldDiff = (sales.get(b.id) ?? 0) - (sales.get(a.id) ?? 0);
      if (soldDiff !== 0) return soldDiff;
      if (a.quantity <= 0 && b.quantity > 0) return 1;
      if (b.quantity <= 0 && a.quantity > 0) return -1;
      return b.quantity - a.quantity;
    });

    return ranked.slice(0, limit);
  } catch {
    return [];
  }
}
