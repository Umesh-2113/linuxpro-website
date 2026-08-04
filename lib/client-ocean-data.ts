import type { StockType } from "@/lib/stock";

export type OceanStockCategory = "all" | StockType;

export const oceanPromoBanner = {
  headline: "Limited time offer — save on every plan",
  code: "LINUX50",
  detail: "Apply promo codes at checkout on eligible plans.",
};

export const oceanStockCategories: Record<
  OceanStockCategory,
  { title: string; heading: string; description: string; sidebarLabel: string }
> = {
  all: {
    sidebarLabel: "All Plans",
    title: "All Plans",
    heading: "Advance Plans",
    description: "Browse every live IP series — Windows VPS, Linux servers, and proxy stock.",
  },
  vps: {
    sidebarLabel: "Windows VPS",
    title: "Windows VPS",
    heading: "Windows VPS Plans",
    description: "High-performance Windows Server VPS with full admin access and instant delivery.",
  },
  linux: {
    sidebarLabel: "Linux Servers",
    title: "Linux Servers",
    heading: "Linux Server Plans",
    description: "Production Linux instances on premium IP ranges with NVMe storage.",
  },
  proxy: {
    sidebarLabel: "Premium IP Proxies",
    title: "Premium IP Proxies",
    heading: "Proxy IP Plans",
    description: "Rotating proxy stock for automation, privacy, and multi-region workloads.",
  },
};

export type ClientNavItem = {
  href: string;
  label: string;
  icon: string;
  group?: "main" | "plans" | "account" | "tools";
  matchPrefix?: string;
};

export const oceanClientNav: ClientNavItem[] = [
  { href: "/client", label: "Dashboard", icon: "grid", group: "main" },
  { href: "/client/ip-stock", label: "All Plans", icon: "plans", group: "plans", matchPrefix: "/client/ip-stock" },
  { href: "/client/ip-stock/linux", label: "Linux Servers", icon: "linux", group: "plans" },
  { href: "/client/ip-stock/vps", label: "Windows VPS", icon: "windows", group: "plans" },
  { href: "/client/ip-stock/proxy", label: "Premium IP Proxies", icon: "proxy", group: "plans" },
  { href: "/client/orders", label: "Manage Orders", icon: "orders", group: "account" },
  { href: "/client/orders?tab=history", label: "Order History", icon: "history", group: "account" },
  { href: "/client/wallet", label: "My Wallet", icon: "wallet", group: "account" },
  { href: "/client/servers", label: "My Servers", icon: "server", group: "account" },
  { href: "/client/support", label: "Support", icon: "chat", group: "account" },
];
