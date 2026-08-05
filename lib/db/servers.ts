import { getOrderSubtitle, type Order } from "@/lib/orders";
import type { StockProvider } from "@/lib/stock-providers";
import {
  defaultExpiresAt,
  resolveServerExpiresAt,
  type UserServer,
} from "@/lib/user-servers";
import { dbGetStockById } from "@/lib/db/stock";
import { getCollection } from "@/lib/mongodb";

export type DeliverServerCreds = {
  ip: string;
  username: string;
  password: string;
  providerVmId?: number;
  providerOrderId?: string;
  provider?: StockProvider;
  expiresAt?: string;
};

async function collection() {
  return getCollection<UserServer>("servers");
}

function normalizeServer(server: UserServer): UserServer {
  return {
    ...server,
    powerState: server.powerState ?? "running",
    expiresAt: resolveServerExpiresAt(server),
  };
}

function serverNameFromOrder(order: Order, serverId: string, orderId: string): string {
  const suffix = serverId.startsWith(`srv-${orderId}`)
    ? serverId.slice(`srv-${orderId}`.length)
    : "";
  return `${order.series}${suffix}`;
}

export async function dbGetServers(): Promise<UserServer[]> {
  const servers = await (await collection()).find({}).sort({ createdAt: -1 }).toArray();
  return servers.map(normalizeServer);
}

export async function dbGetServersByUser(email: string): Promise<UserServer[]> {
  const normalized = email.trim().toLowerCase();
  return (await dbGetServers()).filter(
    (s) => s.userEmail.trim().toLowerCase() === normalized
  );
}

export async function dbGetServersByOrder(orderId: string): Promise<UserServer[]> {
  return (await dbGetServers()).filter((s) => s.orderId === orderId);
}

export async function dbGetServerById(id: string): Promise<UserServer | null> {
  const server = await (await collection()).findOne({ id });
  if (!server) return null;
  return normalizeServer(server);
}

export async function dbCreateServersFromOrder(
  order: Order,
  creds: DeliverServerCreds | DeliverServerCreds[]
): Promise<UserServer[]> {
  const existing = await dbGetServersByOrder(order.id);
  if (existing.length > 0) return existing;

  const units = Array.isArray(creds)
    ? creds
    : Array.from({ length: order.quantity }, () => creds);

  const col = await collection();
  for (const unit of units) {
    const ip = unit?.ip?.trim();
    if (!ip) continue;
    const clash = await col.findOne({
      ip: { $regex: `^${ip.replace(/\./g, "\\.")}$`, $options: "i" },
    });
    if (clash && clash.orderId !== order.id) {
      throw new Error(
        `IP ${ip} is already on server ${clash.id} (order ${clash.orderId}).`
      );
    }
    if (typeof unit.providerVmId === "number" && unit.providerVmId > 0) {
      const vmClash = await col.findOne({ providerVmId: unit.providerVmId });
      if (vmClash && vmClash.orderId !== order.id) {
        throw new Error(
          `VM ${unit.providerVmId} is already on server ${vmClash.id}.`
        );
      }
    }
  }

  const now = new Date().toISOString();
  const plan = getOrderSubtitle(order);
  const stock = await dbGetStockById(order.stockId);
  const created: UserServer[] = [];

  for (let i = 0; i < order.quantity; i++) {
    const unit = units[i] ?? units[0];
    if (!unit) continue;
    const suffix = order.quantity > 1 ? `-${i + 1}` : "";
    created.push({
      id: `srv-${order.id}${suffix}`,
      orderId: order.id,
      stockId: order.stockId,
      userEmail: order.userEmail,
      userName: order.userName,
      name: serverNameFromOrder(order, `srv-${order.id}${suffix}`, order.id),
      type: order.stockType,
      plan,
      ip: unit.ip.trim(),
      username: unit.username.trim(),
      password: unit.password,
      port: order.port,
      region: order.region,
      os: order.os,
      status: "active",
      powerState: "running",
      provider: unit.provider ?? stock?.provider,
      providerVmId: unit.providerVmId ?? stock?.providerVmId,
      providerOrderId: unit.providerOrderId?.trim() || undefined,
      expiresAt: unit.expiresAt || defaultExpiresAt(now),
      createdAt: now,
    });
  }

  if (created.length > 0) {
    const { withMongoWriteRetry } = await import("@/lib/mongodb");
    await withMongoWriteRetry(async () => {
      await col.insertMany(created);
    });
  }
  return created.map(normalizeServer);
}

export async function dbUpdateServer(
  id: string,
  updates: Partial<
    Pick<
      UserServer,
      | "ip"
      | "username"
      | "password"
      | "port"
      | "name"
      | "status"
      | "powerState"
      | "os"
      | "providerVmId"
      | "providerOrderId"
      | "provider"
      | "expiresAt"
    >
  >
): Promise<UserServer | null> {
  const col = await collection();
  const existing = await col.findOne({ id });
  if (!existing) return null;
  const next = {
    ...existing,
    ...updates,
    powerState: updates.powerState ?? existing.powerState ?? "running",
  };
  await col.updateOne({ id }, { $set: next });
  return normalizeServer(next);
}

export async function dbUpdateServersCredentialsForOrder(
  orderId: string,
  creds: { ip: string; username: string; password: string }
): Promise<void> {
  const ip = creds.ip.trim();
  const username = creds.username.trim();
  const password = creds.password;
  await (await collection()).updateMany(
    { orderId },
    { $set: { ip, username, password } }
  );
}

export async function dbDeleteServersByOrder(orderId: string): Promise<void> {
  await (await collection()).deleteMany({ orderId });
}
