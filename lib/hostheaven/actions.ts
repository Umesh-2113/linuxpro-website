import type { ReinstallOsOption, ServerActionType } from "@/lib/server-actions";
import type { UserServer } from "@/lib/user-servers";
import { isHostHeavenProvider } from "@/lib/stock-providers";
import {
  hostHeavenChangePasswordWithRetry,
  hostHeavenFindVmIdByIp,
  hostHeavenListIsos,
  hostHeavenRebuildVm,
  hostHeavenStartVm,
  hostHeavenStopVm,
} from "@/lib/hostheaven/client";

export type HostHeavenActionResult = {
  vmId: number;
  resolvedFromIp: boolean;
  passwordSynced?: boolean;
  passwordSyncError?: string;
};

async function resolveVmId(server: UserServer): Promise<HostHeavenActionResult> {
  if (!isHostHeavenProvider(server.provider)) {
    throw new Error("This server is not linked to HostHeaven stock.");
  }

  if (server.providerVmId && server.providerVmId > 0) {
    return { vmId: server.providerVmId, resolvedFromIp: false };
  }

  const vmId = await hostHeavenFindVmIdByIp(server.ip);
  return { vmId, resolvedFromIp: true };
}

async function pickIsoId(
  vmId: number,
  reinstallOs?: ReinstallOsOption,
  serverIp?: string
): Promise<number> {
  const isos = await hostHeavenListIsos(vmId, serverIp);
  if (isos.length === 0) {
    throw new Error("No rebuild ISO templates available for this VM on HostHeaven.");
  }

  const wantWindows = reinstallOs === "windows";
  const match = isos.find((iso) => {
    const name = iso.isoName.toLowerCase();
    const type = iso.osType.toLowerCase();
    if (wantWindows) {
      return type.includes("windows") || name.includes("windows");
    }
    return type.includes("ubuntu") || name.includes("ubuntu") || type.includes("linux");
  });

  return (match ?? isos[0]).id;
}

export async function executeHostHeavenServerAction(
  server: UserServer,
  action: ServerActionType,
  options?: { reinstallOs?: ReinstallOsOption; newPassword?: string }
): Promise<HostHeavenActionResult> {
  const resolved = await resolveVmId(server);
  const { vmId } = resolved;

  switch (action) {
    case "start":
      await hostHeavenStartVm(vmId);
      return resolved;
    case "stop":
      await hostHeavenStopVm(vmId);
      return resolved;
    case "reinstall": {
      const password = options?.newPassword?.trim();
      const isoId = await pickIsoId(vmId, options?.reinstallOs, server.ip);

      // Pass password into rebuild when supported by HostHeaven.
      await hostHeavenRebuildVm(vmId, isoId, password);

      if (!password) {
        return { ...resolved, passwordSynced: false, passwordSyncError: "No password generated." };
      }

      // Rebuild must finish before HostHeaven accepts password changes.
      // Short blocking retries, then background retries continue from auto-action.
      const sync = await hostHeavenChangePasswordWithRetry(vmId, password, {
        attempts: 4,
        delayMs: 8000,
      });

      return {
        ...resolved,
        passwordSynced: sync.synced,
        passwordSyncError: sync.synced ? undefined : sync.error,
      };
    }
    default:
      throw new Error(`Unsupported HostHeaven action: ${action}`);
  }
}

export async function executeHostHeavenPasswordChange(
  server: UserServer,
  newPassword: string
): Promise<HostHeavenActionResult> {
  const resolved = await resolveVmId(server);
  const password = newPassword.trim();
  if (!password) throw new Error("Password is required.");
  const sync = await hostHeavenChangePasswordWithRetry(resolved.vmId, password, {
    attempts: 3,
    delayMs: 5000,
  });
  if (!sync.synced) {
    throw new Error(sync.error || "HostHeaven password update failed.");
  }
  return { ...resolved, passwordSynced: true };
}
