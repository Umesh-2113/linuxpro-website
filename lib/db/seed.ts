import type { StockItem } from "@/lib/stock";
import type { SupportTicket } from "@/lib/tickets";
import { getDb } from "@/lib/mongodb";

export const defaultStockSeed: StockItem[] = [
  {
    id: "stock-001",
    type: "vps",
    series: "162.4.xx",
    port: "",
    vcpu: 4,
    ram: 8,
    storage: 100,
    quantity: 1,
    price: 899,
    region: "Mumbai",
    os: "Ubuntu 22.04",
    createdAt: new Date().toISOString(),
  },
  {
    id: "stock-002",
    type: "linux",
    series: "185.2.xx",
    port: "",
    vcpu: 8,
    ram: 16,
    storage: 250,
    quantity: 3,
    price: 1999,
    region: "Singapore",
    os: "Rocky Linux 9",
    createdAt: new Date().toISOString(),
  },
  {
    id: "stock-003",
    type: "proxy",
    series: "45.8.xx",
    port: "8080",
    vcpu: 0,
    ram: 0,
    storage: 0,
    quantity: 5,
    price: 499,
    region: "Mumbai",
    os: "N/A",
    createdAt: new Date().toISOString(),
  },
];

export const defaultTicketsSeed: SupportTicket[] = [
  {
    id: "TKT-1042",
    subject: "SSL certificate renewal",
    message: "My SSL certificate expired on my VPS. Need help renewing it.",
    userName: "Rajesh Kumar",
    userEmail: "rajesh@techflow.com",
    status: "open",
    priority: "medium",
    adminReply: "",
    replies: [
      {
        id: "r-1",
        author: "user",
        authorName: "Rajesh Kumar",
        message: "My SSL certificate expired on my VPS. Need help renewing it.",
        createdAt: "2026-06-04T10:00:00.000Z",
      },
    ],
    createdAt: "2026-06-04T10:00:00.000Z",
    updatedAt: "2026-06-05T08:00:00.000Z",
  },
  {
    id: "TKT-1038",
    subject: "Server migration assistance",
    message: "I need help migrating 3 servers from another provider to LinuxPro.",
    userName: "Priya Sharma",
    userEmail: "priya@cloudnest.in",
    status: "answered",
    priority: "high",
    adminReply: "Our team will contact you within 24 hours to schedule migration.",
    replies: [
      {
        id: "r-2",
        author: "user",
        authorName: "Priya Sharma",
        message: "I need help migrating 3 servers from another provider to LinuxPro.",
        createdAt: "2026-06-02T14:00:00.000Z",
      },
      {
        id: "r-3",
        author: "admin",
        authorName: "LinuxPro Support",
        message: "Our team will contact you within 24 hours to schedule migration.",
        createdAt: "2026-06-03T09:00:00.000Z",
      },
    ],
    createdAt: "2026-06-02T14:00:00.000Z",
    updatedAt: "2026-06-03T09:00:00.000Z",
  },
];

export async function ensureSeeded(): Promise<void> {
  const db = await getDb();
  const stockCount = await db.collection("stock").countDocuments();
  if (stockCount === 0) {
    await db.collection("stock").insertMany(defaultStockSeed);
  }
  const ticketCount = await db.collection("tickets").countDocuments();
  if (ticketCount === 0) {
    await db.collection("tickets").insertMany(defaultTicketsSeed);
  }
}
