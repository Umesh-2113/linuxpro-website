export type StockProvider = "manual" | "hostheaven";

export const stockProviders: StockProvider[] = ["manual", "hostheaven"];

export const stockProviderLabels: Record<StockProvider, string> = {
  manual: "Manual (no API)",
  hostheaven: "HostHeaven VPS",
};

export function normalizeStockProvider(value: unknown): StockProvider {
  return value === "hostheaven" ? "hostheaven" : "manual";
}

export function isHostHeavenProvider(provider: unknown): provider is "hostheaven" {
  return provider === "hostheaven";
}
