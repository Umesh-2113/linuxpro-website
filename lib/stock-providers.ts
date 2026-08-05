export type StockProvider = "manual" | "hostheaven" | "oceanlinux";

export const stockProviders: StockProvider[] = ["manual", "hostheaven", "oceanlinux"];

export const stockProviderLabels: Record<StockProvider, string> = {
  manual: "Manual (no API)",
  hostheaven: "HostHeaven VPS",
  oceanlinux: "OceanLinux",
};

export function normalizeStockProvider(value: unknown): StockProvider {
  if (value === "hostheaven") return "hostheaven";
  if (value === "oceanlinux") return "oceanlinux";
  return "manual";
}

export function isHostHeavenProvider(provider: unknown): provider is "hostheaven" {
  return provider === "hostheaven";
}

export function isOceanLinuxProvider(provider: unknown): provider is "oceanlinux" {
  return provider === "oceanlinux";
}

export function isApiManagedProvider(
  provider: unknown
): provider is "hostheaven" | "oceanlinux" {
  return provider === "hostheaven" || provider === "oceanlinux";
}
