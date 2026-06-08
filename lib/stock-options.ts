export const stockRegions = [
  "Mumbai",
  "Singapore",
  "Frankfurt",
  "New York",
  "London",
  "Tokyo",
  "Sydney",
  "Dubai",
  "Custom",
] as const;

export const stockOsOptions = [
  "All OS Available",
  "Ubuntu 24.04 LTS",
  "Ubuntu 22.04 LTS",
  "Ubuntu 20.04 LTS",
  "Debian 12",
  "Debian 11",
  "Rocky Linux 9",
  "AlmaLinux 9",
  "CentOS Stream 9",
  "Fedora 40",
  "openSUSE Leap 15",
  "Arch Linux",
  "Alpine Linux 3.19",
  "Kali Linux",
  "Windows Server 2022",
  "Custom OS",
] as const;

export type StockRegionOption = (typeof stockRegions)[number];
export type StockOsOption = (typeof stockOsOptions)[number];

const presetRegions = stockRegions.filter((r) => r !== "Custom");

export function resolveRegionSelect(region: string): {
  select: string;
  custom: string;
} {
  if (presetRegions.includes(region as (typeof presetRegions)[number])) {
    return { select: region, custom: "" };
  }
  return { select: "Custom", custom: region };
}

export function resolveOsSelect(os: string): { select: string; custom: string } {
  if (stockOsOptions.includes(os as StockOsOption)) {
    return { select: os, custom: "" };
  }
  return { select: "Custom OS", custom: os };
}

export function resolveRegionValue(select: string, custom: string): string | null {
  const region = select === "Custom" ? custom.trim() : select;
  return region || null;
}

export function resolveOsValue(select: string, custom: string): string | null {
  const os = select === "Custom OS" ? custom.trim() : select;
  return os || null;
}

export const proxyPortPresets = [
  "8080",
  "3128",
  "80",
  "443",
  "1080",
  "9050",
  "Custom",
] as const;
