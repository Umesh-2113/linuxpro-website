import {
  oceanLinuxFindOrderIdByIp,
  oceanLinuxGetStatus,
  oceanLinuxSyncOrder,
} from "@/lib/oceanlinux/client";
import { dbGetServerById, dbUpdateServer } from "@/lib/db/servers";
import { dbUpdateOrder } from "@/lib/db/orders";
import type { UserServer } from "@/lib/user-servers";

function mapPower(powerState?: string, online?: boolean): UserServer["powerState"] {
  const s = (powerState ?? "").toLowerCase();
  if (s.includes("stop") || s.includes("off") || online === false) return "stopped";
  if (s.includes("run") || s.includes("active") || s.includes("online") || online === true) {
    return "running";
  }
  return "unknown";
}

export async function syncServerFromOceanLinux(
  serverId: string
): Promise<{ server: UserServer; message: string }> {
  const server = await dbGetServerById(serverId);
  if (!server) throw new Error("Server not found.");

  let orderId = server.providerOrderId?.trim() || "";
  if (!orderId) {
    if (!server.ip?.trim()) {
      throw new Error("No OceanLinux order linked and server has no IP to look up.");
    }
    orderId = (await oceanLinuxFindOrderIdByIp(server.ip)) || "";
  }
  if (!orderId) {
    throw new Error("Could not find an OceanLinux order for this server.");
  }

  const synced = await oceanLinuxSyncOrder(orderId);

  let powerState: UserServer["powerState"] = server.powerState ?? "unknown";
  try {
    const status = await oceanLinuxGetStatus(orderId);
    powerState = mapPower(status.powerState, status.online);
  } catch {
    /* keep previous */
  }

  const updated = await dbUpdateServer(serverId, {
    ip: synced.ipAddress?.trim() || server.ip,
    username: synced.username?.trim() || server.username,
    password: synced.password || server.password,
    provider: "oceanlinux",
    providerOrderId: orderId,
    powerState,
    ...(synced.expiryDate ? { expiresAt: synced.expiryDate } : {}),
  });

  if (!updated) throw new Error("Failed to save synced credentials.");

  try {
    await dbUpdateOrder(server.orderId, {
      deliverIp: updated.ip,
      deliverUsername: updated.username,
      deliverPassword: updated.password,
    });
  } catch {
    /* order update optional */
  }

  return { server: updated, message: "Synced — credentials updated." };
}
