import { dbGetServerById } from "@/lib/db/servers";
import { dbGetStockById } from "@/lib/db/stock";
import { isOceanLinuxProvider, type StockProvider } from "@/lib/stock-providers";
import type { UserServer } from "@/lib/user-servers";

/**
 * Ensure server.provider / providerOrderId are filled from linked stock when missing.
 */
export async function resolveOceanLinuxServer(
  server: UserServer,
  fallbackIp?: string
): Promise<UserServer> {
  let provider: StockProvider | undefined = server.provider;
  let providerOrderId = server.providerOrderId;
  let ip = server.ip || fallbackIp || "";

  if (!isOceanLinuxProvider(provider) && server.stockId) {
    const stock = await dbGetStockById(server.stockId);
    if (stock && isOceanLinuxProvider(stock.provider)) {
      provider = "oceanlinux";
    }
  }

  return {
    ...server,
    ip,
    provider,
    providerOrderId,
  };
}

export async function isOceanLinuxManagedServer(serverId: string): Promise<boolean> {
  const server = await dbGetServerById(serverId);
  if (!server) return false;
  const resolved = await resolveOceanLinuxServer(server);
  return isOceanLinuxProvider(resolved.provider);
}
