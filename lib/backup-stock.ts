import { apiDelete, apiGet, apiPatch, apiPost } from "@/lib/api-client";
import type { StockType } from "@/lib/stock";

export type BackupStockStatus = "free" | "sold" | "reserved";

export type BackupStockItem = {
  id: string;
  type: StockType;
  series: string;
  ip: string;
  username: string;
  password: string;
  port: string;
  os: string;
  region: string;
  status: BackupStockStatus;
  note: string;
  orderId?: string;
  createdAt: string;
  updatedAt: string;
};

let cache: BackupStockItem[] = [];

function emitUpdate() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("backup-stock-updated"));
  }
}

export async function fetchBackupStock(): Promise<BackupStockItem[]> {
  const items = await apiGet<BackupStockItem[]>("/api/backup-stock");
  cache = items;
  emitUpdate();
  return items;
}

export function getBackupStock(): BackupStockItem[] {
  return [...cache].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export async function addBackupStockItem(
  item: Omit<BackupStockItem, "id" | "status" | "createdAt" | "updatedAt" | "orderId">
): Promise<BackupStockItem> {
  const created = await apiPost<BackupStockItem>("/api/backup-stock", item);
  cache = [created, ...cache];
  emitUpdate();
  return created;
}

export async function addBackupStockBulk(
  lines: string,
  defaults?: Partial<Pick<BackupStockItem, "type" | "series" | "os" | "region" | "port">>
): Promise<{ created: number; items: BackupStockItem[] }> {
  const data = await apiPost<{ created: number; items: BackupStockItem[] }>(
    "/api/backup-stock",
    { bulk: lines, ...defaults }
  );
  cache = [...data.items, ...cache];
  emitUpdate();
  return data;
}

export async function updateBackupStockItem(
  id: string,
  updates: Partial<Omit<BackupStockItem, "id" | "createdAt">>
): Promise<BackupStockItem | null> {
  const updated = await apiPatch<BackupStockItem>(`/api/backup-stock/${id}`, updates);
  cache = cache.map((item) => (item.id === id ? updated : item));
  emitUpdate();
  return updated;
}

export async function deleteBackupStockItem(id: string): Promise<void> {
  await apiDelete(`/api/backup-stock/${id}`);
  cache = cache.filter((item) => item.id !== id);
  emitUpdate();
}
