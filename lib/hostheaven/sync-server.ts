import {
  hostHeavenFindVmIdByIp,
  hostHeavenGetVmCredentials,
  hostHeavenListVms,
} from "@/lib/hostheaven/client";
import { dbGetServerById, dbUpdateServer } from "@/lib/db/servers";
import { dbUpdateOrder } from "@/lib/db/orders";
import type { UserServer } from "@/lib/user-servers";

function mapPowerFromStatus(status?: string): UserServer["powerState"] {
  const s = (status ?? "").toUpperCase();
  if (!s) return "unknown";
  if (
    s.includes("STOP") ||
    s.includes("OFF") ||
    s.includes("SHUT") ||
    s === "INACTIVE" ||
    s === "SUSPENDED"
  ) {
    return "stopped";
  }
  if (
    s.includes("RUN") ||
    s.includes("ACTIVE") ||
    s.includes("ONLINE") ||
    s.includes("START")
  ) {
    return "running";
  }
  return "unknown";
}

export async function syncServerFromHostHeaven(
  serverId: string
): Promise<{ server: UserServer; message: string }> {
  const server = await dbGetServerById(serverId);
  if (!server) {
    throw new Error("Server not found.");
  }

  let vmId =
    typeof server.providerVmId === "number" && server.providerVmId > 0
      ? server.providerVmId
      : 0;

  if (!vmId) {
    if (!server.ip?.trim()) {
      throw new Error("No API VM linked and server has no IP to look up.");
    }
    vmId = await hostHeavenFindVmIdByIp(server.ip);
  }

  const creds = await hostHeavenGetVmCredentials(vmId, server.ip, {
    osHint: server.os,
  });

  let powerState: UserServer["powerState"] = server.powerState ?? "unknown";
  try {
    const vms = await hostHeavenListVms();
    const match = vms.find((vm) => vm.id === vmId);
    if (match) {
      powerState = mapPowerFromStatus(match.status);
    }
  } catch {
    /* keep previous power state */
  }

  const updated = await dbUpdateServer(serverId, {
    ip: creds.ip,
    username: creds.username,
    password: creds.password,
    provider: "hostheaven",
    providerVmId: vmId,
    powerState,
  });

  if (!updated) {
    throw new Error("Failed to save synced credentials.");
  }

  // Keep primary delivered credentials on the order in sync for admin view.
  try {
    await dbUpdateOrder(server.orderId, {
      deliverIp: creds.ip,
      deliverUsername: creds.username,
      deliverPassword: creds.password,
    });
  } catch {
    /* non-fatal */
  }

  return {
    server: updated,
    message: "Synced — credentials updated.",
  };
}
