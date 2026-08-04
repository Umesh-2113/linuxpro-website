import { randomBytes } from "crypto";
import {
  dbCreateServerAction,
  dbUpdateServerAction,
} from "@/lib/db/server-actions";
import { dbGetServerById, dbUpdateServer } from "@/lib/db/servers";
import { executeHostHeavenServerAction } from "@/lib/hostheaven/actions";
import {
  hostHeavenFindVmIdByIp,
  isHostHeavenConfigured,
} from "@/lib/hostheaven/client";
import { resolveHostHeavenServer } from "@/lib/hostheaven/resolve-server";
import type { ReinstallOsOption, ServerActionRequest, ServerActionType } from "@/lib/server-actions";
import { isHostHeavenProvider } from "@/lib/stock-providers";

function generateServerPassword(length = 14): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%";
  const bytes = randomBytes(length);
  let out = "";
  for (let i = 0; i < length; i++) {
    out += chars[bytes[i] % chars.length];
  }
  return out;
}

function defaultUsername(os?: ReinstallOsOption): string {
  return os === "windows" ? "Administrator" : "root";
}

function osLabel(os?: ReinstallOsOption): string {
  if (os === "windows") return "Windows Server";
  if (os === "ubuntu") return "Ubuntu";
  return "Linux";
}

export type CreateAndMaybeAutoActionInput = {
  serverId: string;
  serverName: string;
  serverIp: string;
  orderId: string;
  userEmail: string;
  userName: string;
  action: ServerActionType;
  reinstallOs?: ReinstallOsOption;
};

/**
 * Creates a server action. For HostHeaven-linked servers (by stock provider or IP match),
 * runs the provider API immediately instead of waiting for admin.
 */
export async function createAndMaybeAutoExecuteAction(
  input: CreateAndMaybeAutoActionInput
): Promise<ServerActionRequest> {
  const rawServer = await dbGetServerById(input.serverId);
  if (!rawServer) {
    throw new Error("Server not found.");
  }

  let server = await resolveHostHeavenServer(rawServer, input.serverIp);

  if (isHostHeavenConfigured() && !isHostHeavenProvider(server.provider)) {
    try {
      const vmId = await hostHeavenFindVmIdByIp(server.ip || input.serverIp);
      if (vmId > 0) {
        server = { ...server, provider: "hostheaven", providerVmId: vmId };
        await dbUpdateServer(server.id, { provider: "hostheaven", providerVmId: vmId });
      }
    } catch {
      // IP not on HostHeaven — fall through to manual pending action
    }
  }

  const useHostHeaven =
    isHostHeavenConfigured() && isHostHeavenProvider(server.provider);

  if (!useHostHeaven) {
    return dbCreateServerAction(input);
  }

  if (!isHostHeavenProvider(rawServer.provider) || !rawServer.providerVmId) {
    await dbUpdateServer(server.id, {
      provider: "hostheaven",
      providerVmId: server.providerVmId,
    });
  }

  const newPassword =
    input.action === "reinstall" ? generateServerPassword() : undefined;
  const newUsername =
    input.action === "reinstall" ? defaultUsername(input.reinstallOs) : undefined;

  const pending = await dbCreateServerAction({
    ...input,
    newUsername,
    newPassword,
  });

  try {
    await dbUpdateServerAction(pending.id, { status: "processing" });

    const result = await executeHostHeavenServerAction(server, input.action, {
      reinstallOs: input.reinstallOs,
      newPassword,
    });

    if (result.resolvedFromIp || !server.providerVmId) {
      await dbUpdateServer(server.id, { providerVmId: result.vmId });
    }

    if (input.action === "start") {
      await dbUpdateServer(server.id, { powerState: "running" });
    } else if (input.action === "stop") {
      await dbUpdateServer(server.id, { powerState: "stopped" });
    } else if (input.action === "reinstall") {
      await dbUpdateServer(server.id, {
        username: newUsername || server.username,
        password: newPassword || server.password,
        os: osLabel(input.reinstallOs),
        powerState: "running",
        providerVmId: result.vmId,
      });
    }

    const passwordNote =
      input.action === "reinstall"
        ? result.passwordSynced
          ? " Password synced to HostHeaven."
          : ` Rebuild started; HostHeaven password sync pending (${result.passwordSyncError || "retry later"}).`
        : "";

    // If password not synced yet, keep retrying in background on this Node process.
    if (input.action === "reinstall" && newPassword && !result.passwordSynced) {
      void (async () => {
        const { hostHeavenChangePasswordWithRetry } = await import("@/lib/hostheaven/client");
        const sync = await hostHeavenChangePasswordWithRetry(result.vmId, newPassword, {
          attempts: 18,
          delayMs: 20000,
        });
        await dbUpdateServerAction(pending.id, {
          adminNote: sync.synced
            ? "Completed via HostHeaven API. Password synced to HostHeaven."
            : `Rebuild done on LinuxPro; HostHeaven password sync failed: ${sync.error || "unknown"}`,
        });
      })();
    }

    const completed = await dbUpdateServerAction(pending.id, {
      status: "completed",
      adminNote: `Completed automatically via HostHeaven API.${passwordNote}`,
      newUsername,
      newPassword,
    });

    return completed ?? { ...pending, status: "completed" };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "HostHeaven API request failed.";
    await dbUpdateServerAction(pending.id, {
      status: "rejected",
      adminNote: message,
    });
    throw new Error(message);
  }
}
