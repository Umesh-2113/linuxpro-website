import { dbGetOrders } from "@/lib/db/orders";
import { dbGetServers } from "@/lib/db/servers";

/** IPs already given to customers (servers + delivered orders). */
export async function getAllocatedIpSet(): Promise<Set<string>> {
  const [servers, orders] = await Promise.all([dbGetServers(), dbGetOrders()]);
  const used = new Set<string>();

  for (const server of servers) {
    const ip = server.ip?.trim().toLowerCase();
    if (ip) used.add(ip);
  }

  for (const order of orders) {
    if (order.fulfillmentStatus === "cancelled") continue;
    const ip = order.deliverIp?.trim().toLowerCase();
    if (ip) used.add(ip);
  }

  return used;
}

/** HostHeaven VM ids already linked to a customer server. */
export async function getAllocatedVmIdSet(): Promise<Set<number>> {
  const servers = await dbGetServers();
  const used = new Set<number>();
  for (const server of servers) {
    if (typeof server.providerVmId === "number" && server.providerVmId > 0) {
      used.add(Math.round(server.providerVmId));
    }
  }
  return used;
}
