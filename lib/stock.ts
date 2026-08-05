import { apiDelete, apiGet, apiPatch, apiPost } from "@/lib/api-client";
import type { StockProvider } from "@/lib/stock-providers";
import { normalizeStockProvider } from "@/lib/stock-providers";

export type StockType = "vps" | "linux" | "proxy";

export const stockTypeLabels: Record<StockType, string> = {
  vps: "VPS",
  linux: "Linux",
  proxy: "Proxy",
};

export type PromoType = "percent" | "flat";

export type PromoEntry = {
  code: string;
  type: PromoType;
  value: number;
};

/** Applied on every RAM plan (checkout + admin display). */
export const GLOBAL_STOCK_PROMOS: PromoEntry[] = [];

export type RamPlan = {
  ram: number;
  vcpu: number;
  price: number;
  /** Multiple promo codes per tier (preferred). */
  promos?: PromoEntry[];
  /** @deprecated single-promo fields, kept for backward compat. Migrated into promos[] on read. */
  promoCode?: string;
  promoType?: PromoType;
  promoValue?: number;
  promoPercent?: number;
};

export function defaultVcpuForRam(ram: number): number {
  if (ram <= 4) return 2;
  if (ram <= 8) return 4;
  if (ram <= 16) return 8;
  return Math.max(4, Math.ceil(ram / 4));
}

function sanitizePromoEntry(
  raw: Partial<PromoEntry> & { code?: unknown; type?: unknown; value?: unknown },
  planPrice: number
): PromoEntry | null {
  const code =
    typeof raw.code === "string"
      ? raw.code.trim().toUpperCase().replace(/[^A-Z0-9_-]/g, "")
      : "";
  if (!code) return null;
  const type: PromoType = raw.type === "flat" ? "flat" : "percent";
  const value = typeof raw.value === "number" ? raw.value : Number(raw.value);
  if (!Number.isFinite(value) || value <= 0) return null;
  if (type === "percent" && value > 100) return null;
  if (type === "flat" && planPrice > 0 && value >= planPrice) return null;
  return { code, type, value: Math.round(value) };
}

function normalizeRamPlan(
  plan: Partial<RamPlan> & { ram: number; price: number },
  fallbackVcpu?: number
): RamPlan {
  const vcpu =
    typeof plan.vcpu === "number" && plan.vcpu > 0
      ? plan.vcpu
      : (fallbackVcpu ?? defaultVcpuForRam(plan.ram));

  const promos: PromoEntry[] = [];
  const seen = new Set<string>();
  const pushPromo = (entry: PromoEntry | null) => {
    if (!entry) return;
    if (seen.has(entry.code)) return;
    seen.add(entry.code);
    promos.push(entry);
  };

  if (Array.isArray(plan.promos)) {
    for (const raw of plan.promos) pushPromo(sanitizePromoEntry(raw, plan.price));
  }

  if (promos.length === 0 && plan.promoCode) {
    const legacyType: PromoType = plan.promoType === "flat" ? "flat" : "percent";
    const legacyValue =
      typeof plan.promoValue === "number" && plan.promoValue > 0
        ? plan.promoValue
        : typeof plan.promoPercent === "number" && plan.promoPercent > 0
          ? plan.promoPercent
          : 0;
    pushPromo(
      sanitizePromoEntry(
        { code: plan.promoCode, type: legacyType, value: legacyValue },
        plan.price
      )
    );
  }

  for (const globalPromo of GLOBAL_STOCK_PROMOS) {
    pushPromo(sanitizePromoEntry(globalPromo, plan.price));
  }

  const out: RamPlan = { ram: plan.ram, vcpu, price: plan.price };
  if (promos.length > 0) {
    out.promos = promos;
    const first = promos[0];
    out.promoCode = first.code;
    out.promoType = first.type;
    out.promoValue = first.value;
    if (first.type === "percent") out.promoPercent = first.value;
  }
  return out;
}

export function getPlanPromos(plan: RamPlan | null | undefined): PromoEntry[] {
  if (!plan) return [];
  return plan.promos ?? [];
}

export function applyPromoEntry(
  unitPrice: number,
  entry: Pick<PromoEntry, "type" | "value">
): number {
  if (entry.type === "flat") {
    return Math.max(0, unitPrice - Math.round(entry.value));
  }
  const pct = Math.min(entry.value, 100);
  return Math.max(0, Math.round(unitPrice * (1 - pct / 100)));
}

export type PromoMatch =
  | { ok: false }
  | { ok: true; type: PromoType; value: number; code: string };

export function validatePromoCode(
  plan: RamPlan | null | undefined,
  code: string
): PromoMatch {
  if (!plan) return { ok: false };
  const entered = code.trim().toUpperCase();
  if (!entered) return { ok: false };
  const match = getPlanPromos(plan).find((p) => p.code === entered);
  if (!match) return { ok: false };
  return { ok: true, code: match.code, type: match.type, value: match.value };
}

export function formatPromoBadge(entry: Pick<PromoEntry, "code" | "type" | "value">): string {
  if (!entry.code || !entry.value) return "";
  return entry.type === "flat"
    ? `${entry.code} −₹${entry.value.toLocaleString("en-IN")}`
    : `${entry.code} −${entry.value}%`;
}

export type { StockProvider } from "@/lib/stock-providers";
export { stockProviderLabels, stockProviders } from "@/lib/stock-providers";

export type StockItem = {
  id: string;
  type: StockType;
  series: string;
  port: string;
  vcpu: number;
  ram: number;
  storage: number;
  quantity: number;
  price: number;
  ramPlans?: RamPlan[];
  region: string;
  os: string;
  /** Who manages server power/rebuild for orders from this stock. */
  provider?: StockProvider;
  /** Optional override; otherwise resolved from server IP via HostHeaven API. */
  providerVmId?: number;
  /** OceanLinux product id when provider is oceanlinux. */
  providerProductId?: string;
  createdAt: string;
};

export const PRESET_RAM_GB = [4, 8, 16] as const;

export function getRamPlans(item: StockItem): RamPlan[] {
  if (item.ramPlans && item.ramPlans.length > 0) {
    return [...item.ramPlans]
      .map((p) => normalizeRamPlan(p, item.vcpu))
      .sort((a, b) => a.ram - b.ram);
  }
  if (item.type !== "proxy" && item.ram > 0 && item.price > 0) {
    return [normalizeRamPlan({ ram: item.ram, price: item.price }, item.vcpu)];
  }
  return [];
}

export function getRamPlan(item: StockItem, ramGb: number): RamPlan | null {
  return getRamPlans(item).find((p) => p.ram === ramGb) ?? null;
}

export function getRamPlanVcpu(item: StockItem, ramGb?: number): number {
  if (ramGb !== undefined) {
    const plan = getRamPlan(item, ramGb);
    if (plan) return plan.vcpu;
  }
  const plans = getRamPlans(item);
  return plans[0]?.vcpu ?? item.vcpu;
}

export function getRamPlanPrice(item: StockItem, ramGb: number): number | null {
  const plan = getRamPlan(item, ramGb);
  return plan && plan.price > 0 ? plan.price : null;
}

export function formatRamPlanLabel(plan: RamPlan): string {
  return `${plan.ram} GB · ${plan.vcpu} cores · ₹${plan.price.toLocaleString("en-IN")}/mo`;
}

export function computeDefaultStockPrice(item: Pick<StockItem, "type" | "vcpu" | "ram">): number {
  if (item.type === "proxy") return 499;
  if (item.type === "linux") return item.vcpu * 250 + item.ram * 60 + 200;
  return item.vcpu * 180 + item.ram * 45 + 150;
}

function normalizeItem(item: StockItem): StockItem {
  const base = { ...item, port: item.port ?? "" };
  const plans = getRamPlans(base);
  const minPlanPrice =
    plans.length > 0
      ? Math.min(...plans.map((p) => p.price).filter((p) => p > 0))
      : undefined;
  const primaryRam = plans[0]?.ram ?? base.ram;
  const primaryVcpu = plans[0]?.vcpu ?? base.vcpu;

  return {
    ...base,
    provider: normalizeStockProvider(base.provider),
    providerVmId:
      typeof base.providerVmId === "number" && base.providerVmId > 0
        ? Math.round(base.providerVmId)
        : undefined,
    providerProductId:
      typeof base.providerProductId === "string" && base.providerProductId.trim()
        ? base.providerProductId.trim()
        : undefined,
    ram: primaryRam,
    vcpu: primaryVcpu,
    price:
      minPlanPrice ??
      (typeof base.price === "number" && base.price > 0
        ? base.price
        : computeDefaultStockPrice(base)),
    ramPlans: plans.length > 0 ? plans : base.ramPlans,
  };
}

let cache: StockItem[] = [];
let fetchPromise: Promise<StockItem[]> | null = null;

function emitUpdate() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("stock-updated"));
  }
}

export async function fetchStock(): Promise<StockItem[]> {
  if (fetchPromise) return fetchPromise;
  fetchPromise = apiGet<StockItem[]>("/api/stock")
    .then((items) => {
      cache = items.map(normalizeItem);
      fetchPromise = null;
      emitUpdate();
      return cache;
    })
    .catch((err) => {
      fetchPromise = null;
      console.error("[fetchStock]", err);
      return cache;
    });
  return fetchPromise;
}

export function getStock(): StockItem[] {
  return cache.map(normalizeItem);
}

export function formatStockSpecs(item: StockItem, ramGb?: number): string {
  if (item.type === "proxy") {
    return `Port ${item.port || "—"}`;
  }
  const ram = ramGb ?? getRamPlans(item)[0]?.ram ?? item.ram;
  const vcpu = getRamPlanVcpu(item, ramGb);
  return `${vcpu} vCPU · ${ram}GB RAM · ${item.storage}GB`;
}

export function getStockByType(type: StockType | "all"): StockItem[] {
  const items = getStock();
  if (type === "all") return items;
  return items.filter((i) => i.type === type);
}

export async function addStockItem(
  item: Omit<StockItem, "id" | "createdAt">
): Promise<StockItem> {
  const newItem = await apiPost<StockItem>("/api/stock", item);
  cache = [normalizeItem(newItem), ...cache];
  emitUpdate();
  return normalizeItem(newItem);
}

export async function updateStockItem(
  id: string,
  updates: Partial<Omit<StockItem, "id" | "createdAt">>
): Promise<StockItem | null> {
  const updated = await apiPatch<StockItem>(`/api/stock/${id}`, updates);
  cache = cache.map((item) => (item.id === id ? normalizeItem(updated) : item));
  emitUpdate();
  return normalizeItem(updated);
}

export async function deleteStockItem(id: string): Promise<boolean> {
  await apiDelete(`/api/stock/${id}`);
  cache = cache.filter((item) => item.id !== id);
  emitUpdate();
  return true;
}

export function getStockStatus(qty: number): "in-stock" | "low-stock" | "out-of-stock" {
  if (qty <= 0) return "out-of-stock";
  if (qty <= 2) return "low-stock";
  return "in-stock";
}

export function getStockPrice(item: StockItem, ramGb?: number): number {
  const normalized = normalizeItem(item);
  if (ramGb !== undefined && normalized.type !== "proxy") {
    const planPrice = getRamPlanPrice(normalized, ramGb);
    if (planPrice !== null) return planPrice;
  }
  return normalized.price;
}

export function formatStockPrice(item: StockItem, ramGb?: number): string {
  const plans = getRamPlans(item);
  if (ramGb === undefined && plans.length > 1) {
    const min = Math.min(...plans.map((p) => p.price).filter((p) => p > 0));
    return `From ₹${min.toLocaleString("en-IN")}`;
  }
  return `₹${getStockPrice(item, ramGb).toLocaleString("en-IN")}`;
}

export function formatRamPlansSummary(item: StockItem): string {
  const plans = getRamPlans(item);
  if (plans.length === 0) return formatStockPrice(item);
  if (plans.length === 1) {
    return `${plans[0].ram}GB / ${plans[0].vcpu}c · ${formatStockPrice(item, plans[0].ram)}`;
  }
  return plans
    .map((p) => `${p.ram}GB/${p.vcpu}c ₹${p.price.toLocaleString("en-IN")}`)
    .join(" · ");
}

/**
 * Client-facing series label under the main brand (LinuxPro).
 * Strips supplier names like "Heaven" / "HostHeaven" from stock titles.
 * Raw `series` in DB is unchanged (auto-deliver / matching still use it).
 */
export function getProductSeriesName(series: string): string {
  const original = series.trim();
  if (!original) return "LinuxPro";

  const hadSupplier =
    /\bhost\s*heaven\b/i.test(original) || /\bheaven\b/i.test(original);

  if (!hadSupplier) {
    return original;
  }

  const cleaned = original
    .replace(/\bhost\s*heaven\b/gi, " ")
    .replace(/\bheaven\b/gi, " ")
    .replace(/[|/_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const ipMatch =
    cleaned.match(/\d{1,3}(?:\.\d{1,3}){2}/) ||
    cleaned.match(/\d{1,3}\.\d{1,3}/);
  const rest = cleaned
    .replace(/\d{1,3}(?:\.\d{1,3}){1,3}/g, " ")
    .replace(/[^\w\s.-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (ipMatch) {
    return rest ? `LinuxPro ${rest} · ${ipMatch[0]}` : `LinuxPro · ${ipMatch[0]}`;
  }
  if (!cleaned) return "LinuxPro";
  return `LinuxPro · ${cleaned}`;
}

export function getProductSubtitle(type: StockType, region: string): string {
  return `${stockTypeLabels[type]} · ${region}`;
}

export function getStockStatusLabel(status: ReturnType<typeof getStockStatus>): string {
  const labels = {
    "in-stock": "In Stock",
    "low-stock": "Low Stock",
    "out-of-stock": "Out of Stock",
  };
  return labels[status];
}
