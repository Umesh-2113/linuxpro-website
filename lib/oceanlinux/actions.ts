import type { ReinstallOsOption, ServerActionType } from "@/lib/server-actions";
import type { UserServer } from "@/lib/user-servers";
import { isOceanLinuxProvider } from "@/lib/stock-providers";
import {
  oceanLinuxFindOrderIdByIp,
  oceanLinuxManageOrder,
  type OceanLinuxManageAction,
} from "@/lib/oceanlinux/client";

export type OceanLinuxActionResult = {
  orderId: string;
  resolvedFromIp: boolean;
};

async function resolveOrderId(server: UserServer): Promise<OceanLinuxActionResult> {
  if (!isOceanLinuxProvider(server.provider)) {
    throw new Error("This server is not linked to OceanLinux stock.");
  }

  if (server.providerOrderId?.trim()) {
    return { orderId: server.providerOrderId.trim(), resolvedFromIp: false };
  }

  const orderId = await oceanLinuxFindOrderIdByIp(server.ip);
  if (!orderId) {
    throw new Error(
      "No OceanLinux order linked. Set OceanLinux Order ID on this server, or deliver with Order ID."
    );
  }
  return { orderId, resolvedFromIp: true };
}

function mapAction(action: ServerActionType): OceanLinuxManageAction {
  switch (action) {
    case "start":
      return "start";
    case "stop":
      return "stop";
    case "restart":
      return "restart";
    case "reinstall":
      return "reinstall";
    default:
      throw new Error(`Unsupported OceanLinux action: ${action}`);
  }
}

function mapOsType(reinstallOs?: ReinstallOsOption): string | undefined {
  if (reinstallOs === "windows") return "windows";
  if (reinstallOs === "ubuntu") return "ubuntu";
  return undefined;
}

export async function executeOceanLinuxServerAction(
  server: UserServer,
  action: ServerActionType,
  options?: { reinstallOs?: ReinstallOsOption }
): Promise<OceanLinuxActionResult> {
  const resolved = await resolveOrderId(server);
  await oceanLinuxManageOrder({
    orderId: resolved.orderId,
    action: mapAction(action),
    osType: action === "reinstall" ? mapOsType(options?.reinstallOs) : undefined,
  });
  return resolved;
}
