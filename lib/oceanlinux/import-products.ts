import type { RamPlan, StockItem, StockType } from "@/lib/stock";
import { defaultVcpuForRam } from "@/lib/stock";
import { dbAddStockItem, dbGetStock, dbUpdateStockItem } from "@/lib/db/stock";
import { oceanLinuxListProducts, type OceanLinuxProduct } from "@/lib/oceanlinux/client";

function memPrice(raw: unknown): number {
  if (!raw || typeof raw !== "object") return 0;
  const obj = raw as Record<string, unknown>;
  if (typeof obj.price === "number") return obj.price;
  if (typeof obj.basePrice === "number") return obj.basePrice;
  return 0;
}

function parseRamKey(key: string): number | null {
  const m = key.match(/(\d+)\s*GB/i);
  if (!m) return null;
  const n = Number(m[1]);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function mapServerType(serverType?: string, name?: string): StockType {
  const t = `${serverType || ""} ${name || ""}`.toLowerCase();
  if (t.includes("proxy")) return "proxy";
  if (t.includes("linux") && !t.includes("vps")) return "linux";
  return "vps";
}

/** Pull IP-ish series from OceanLinux product name. */
export function seriesFromOceanProductName(name: string): string {
  const cleaned = name.replace(/^[^\w\d(]+/u, "").trim();
  const ipish = cleaned.match(/(\d{1,3}(?:\.\d{1,3}){1,3}(?:\.?[xX]{1,3})?)/);
  if (ipish) return ipish[1].replace(/\.?[xX]+$/i, "").replace(/\.$/, "");
  const paren = cleaned.match(/\(([^)]+)\)/);
  if (paren) {
    const inner = paren[1].trim();
    if (/\d/.test(inner) && inner.length <= 40) return inner;
  }
  return cleaned.replace(/\s+/g, " ").slice(0, 48) || "oceanlinux";
}

function extractUpstreamQty(product: Record<string, unknown>): number | null {
  const opts = product.memoryOptions;
  if (!opts || typeof opts !== "object") return null;
  let total = 0;
  let found = false;
  for (const val of Object.values(opts as Record<string, unknown>)) {
    if (!val || typeof val !== "object") continue;
    const parent = (val as { $__parent?: Record<string, unknown> }).$__parent;
    if (!parent) continue;
    const cfg = parent.defaultConfigurations;
    if (!cfg || typeof cfg !== "object") continue;
    for (const block of Object.values(cfg as Record<string, unknown>)) {
      const variants =
        block && typeof block === "object"
          ? (block as { variants?: Record<string, { stock?: number }> }).variants
          : undefined;
      if (!variants) continue;
      for (const v of Object.values(variants)) {
        if (typeof v?.stock === "number") {
          found = true;
          total += v.stock;
        }
      }
    }
  }
  return found ? total : null;
}

function ramPlansFromProduct(product: OceanLinuxProduct & { memoryOptions?: Record<string, unknown> }): RamPlan[] {
  const opts = product.memoryOptions || {};
  const plans: RamPlan[] = [];
  const seen = new Set<number>();

  for (const [key, raw] of Object.entries(opts)) {
    const ram = parseRamKey(key);
    if (!ram || seen.has(ram)) continue;
    const price = memPrice(raw);
    if (price <= 0) continue;
    seen.add(ram);
    plans.push({
      ram,
      vcpu: defaultVcpuForRam(ram),
      price,
    });
  }

  // Also use client.memories if memoryOptions keys were weird
  if (plans.length === 0 && Array.isArray(product.memories)) {
    for (const m of product.memories) {
      const ram = parseRamKey(m.key);
      if (!ram || seen.has(ram) || m.price <= 0) continue;
      seen.add(ram);
      plans.push({ ram, vcpu: defaultVcpuForRam(ram), price: m.price });
    }
  }

  return plans.sort((a, b) => a.ram - b.ram);
}

export type OceanLinuxImportResult = {
  fetched: number;
  created: number;
  skipped: number;
  updated: number;
  createdIds: string[];
};

/**
 * Import OceanLinux reseller products into LinuxPro stock.
 * Skips products already linked by providerProductId.
 */
export async function importOceanLinuxProductsToStock(options?: {
  /** Only create products that currently have no providerProductId link. */
  onlyMissing?: boolean;
  /** Update qty/prices on existing OceanLinux-linked rows. */
  updateExisting?: boolean;
  /** Default qty when API has no upstream stock number. */
  defaultQuantity?: number;
}): Promise<OceanLinuxImportResult> {
  const onlyMissing = options?.onlyMissing !== false;
  const updateExisting = Boolean(options?.updateExisting);
  const defaultQuantity = options?.defaultQuantity ?? 0;

  const products = await oceanLinuxListProducts();
  // Re-fetch raw for nested stock + memory prices (list already has memories)
  const existing = await dbGetStock();
  const byProductId = new Map(
    existing
      .filter((s) => s.providerProductId)
      .map((s) => [s.providerProductId!, s])
  );

  let created = 0;
  let skipped = 0;
  let updated = 0;
  const createdIds: string[] = [];

  for (const product of products) {
    const plans = ramPlansFromProduct(product);
    if (plans.length === 0) {
      skipped++;
      continue;
    }

    const upstreamQty = extractUpstreamQty(
      (product.raw as Record<string, unknown>) ||
        ({ memoryOptions: product.memoryOptions } as Record<string, unknown>)
    );
    const quantity =
      typeof upstreamQty === "number" ? Math.max(0, upstreamQty) : defaultQuantity;
    const type = mapServerType(product.serverType, product.name);
    const series = seriesFromOceanProductName(product.name);
    const primary = plans[0];

    const payload: Omit<StockItem, "id" | "createdAt"> = {
      type,
      series,
      port: "",
      vcpu: primary.vcpu,
      ram: primary.ram,
      storage: type === "linux" ? 50 : 100,
      quantity,
      price: primary.price,
      ramPlans: plans,
      region: "India",
      os: "All OS Available",
      provider: "oceanlinux",
      providerProductId: product.id,
    };

    const existingRow = byProductId.get(product.id);
    if (existingRow) {
      if (updateExisting) {
        await dbUpdateStockItem(existingRow.id, {
          series: payload.series,
          type: payload.type,
          quantity: payload.quantity,
          price: payload.price,
          ramPlans: payload.ramPlans,
          ram: payload.ram,
          vcpu: payload.vcpu,
          provider: "oceanlinux",
          providerProductId: product.id,
        });
        updated++;
      } else if (onlyMissing) {
        skipped++;
      }
      continue;
    }

    const item = await dbAddStockItem(payload);
    created++;
    createdIds.push(item.id);
  }

  return {
    fetched: products.length,
    created,
    skipped,
    updated,
    createdIds,
  };
}
