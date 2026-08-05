import { ADMIN_BASE_PATH } from "@/lib/admin";

export const adminNav = [
  { href: ADMIN_BASE_PATH, label: "Dashboard", icon: "grid" },
  { href: `${ADMIN_BASE_PATH}/stock`, label: "IP Stock", icon: "stock" },
  { href: `${ADMIN_BASE_PATH}/backup-stock`, label: "Backup Stock", icon: "backup" },
  { href: `${ADMIN_BASE_PATH}/orders`, label: "Orders", icon: "orders" },
  { href: `${ADMIN_BASE_PATH}/manage`, label: "Server Manage", icon: "manage" },
  { href: `${ADMIN_BASE_PATH}/tickets`, label: "Support Tickets", icon: "chat" },
  { href: `${ADMIN_BASE_PATH}/news`, label: "News", icon: "news" },
  { href: `${ADMIN_BASE_PATH}/users`, label: "Users", icon: "users" },
  { href: `${ADMIN_BASE_PATH}/wallet`, label: "User Wallets", icon: "wallet" },
  { href: `${ADMIN_BASE_PATH}/settings`, label: "Settings", icon: "settings" },
];
