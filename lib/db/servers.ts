import { getOrderSubtitle, type Order } from "@/lib/orders";
import type { UserServer } from "@/lib/user-servers";
import { getCollection } from "@/lib/mongodb";

async function collection() {
  return getCollection<UserServer>("servers");
}

function serverNameFromOrder(order: Order, serverId: string, orderId: string): string {
  const suffix = serverId.startsWith(`srv-${orderId}`)
    ? serverId.slice(`srv-${orderId}`.length)
    : "";
  return `${order.series}${suffix}`;
}

export async function dbGetServers(): Promise<UserServer[]> {
  const servers = await (await collection()).find({}).sort({ createdAt: -1 }).toArray();
  return servers.map((s) => ({ ...s, powerState: s.powerState ?? "running" }));
}

export async function dbGetServersByUser(email: string): Promise<UserServer[]> {
  return (await dbGetServers()).filter((s) => s.userEmail === email);
}

export async function dbGetServersByOrder(orderId: string): Promise<UserServer[]> {
  return (await dbGetServers()).filter((s) => s.orderId === orderId);
}

export async function dbGetServerById(id: string): Promise<UserServer | null> {
  const server = await (await collection()).findOne({ id });
  if (!server) return null;
  return { ...server, powerState: server.powerState ?? "running" };
}

export async function dbCreateServersFromOrder(
  order: Order,
  creds: { ip: string; username: string; password: string }
): Promise<UserServer[]> {
  const existing = await dbGetServersByOrder(order.id);
  if (existing.length > 0) return existing;

  const now = new Date().toISOString();
  const plan = getOrderSubtitle(order);
  const created: UserServer[] = [];

  for (let i = 0; i < order.quantity; i++) {
    const suffix = order.quantity > 1 ? `-${i + 1}` : "";
    created.push({
      id: `srv-${order.id}${suffix}`,
      orderId: order.id,
      userEmail: order.userEmail,
      userName: order.userName,
      name: serverNameFromOrder(order, `srv-${order.id}${suffix}`, order.id),
      type: order.stockType,
      plan,
      ip: creds.ip.trim(),
      username: creds.username.trim(),
      password: creds.password,
      port: order.port,
      region: order.region,
      os: order.os,
      status: "active",
      powerState: "running",
      createdAt: now,
    });
  }

  if (created.length > 0) {
    await (await collection()).insertMany(created);
  }
  return created;
}

export async function dbUpdateServer(
  id: string,
  updates: Partial<
    Pick<
      UserServer,
      "ip" | "username" | "password" | "port" | "name" | "status" | "powerState" | "os"
    >
  >
): Promise<UserServer | null> {
  const col = await collection();
  const existing = await col.findOne({ id });
  if (!existing) return null;
  const next = { ...existing, ...updates, powerState: updates.powerState ?? existing.powerState ?? "running" };
  await col.updateOne({ id }, { $set: next });
  return next;
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
