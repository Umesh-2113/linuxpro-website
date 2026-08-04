export const clientServers = [
  {
    id: "srv-001",
    name: "vps-prod-01",
    ip: "192.168.1.10",
    plan: "Business VPS",
    status: "running" as const,
    cpu: 24,
    ram: 40,
    region: "Mumbai",
  },
  {
    id: "srv-002",
    name: "vps-prod-02",
    ip: "192.168.1.11",
    plan: "Pro VPS",
    status: "running" as const,
    cpu: 45,
    ram: 62,
    region: "Singapore",
  },
  {
    id: "srv-003",
    name: "cloud-db-01",
    ip: "10.0.0.5",
    plan: "Starter VPS",
    status: "stopped" as const,
    cpu: 0,
    ram: 0,
    region: "Frankfurt",
  },
];

export const invoices = [
  { id: "INV-2026-041", date: "2026-04-01", amount: 599, status: "paid" as const, item: "Business VPS — April" },
  { id: "INV-2026-040", date: "2026-03-01", amount: 599, status: "paid" as const, item: "Business VPS — March" },
  { id: "INV-2026-039", date: "2026-02-01", amount: 1298, status: "paid" as const, item: "Business VPS + Pro VPS" },
  { id: "INV-2026-042", date: "2026-05-01", amount: 1598, status: "due" as const, item: "May hosting services" },
];

export const clientNav = [
  { href: "/client", label: "Dashboard", icon: "grid" },
  { href: "/client/servers", label: "Servers", icon: "server" },
  { href: "/client/ip-stock", label: "IP Stock Available", icon: "stock" },
  { href: "/client/orders", label: "Manage Orders", icon: "orders" },
  { href: "/client/wallet", label: "My Wallet", icon: "wallet" },
  { href: "/client/support", label: "Support", icon: "chat" },
  { href: "/client/settings", label: "Settings", icon: "settings" },
];
