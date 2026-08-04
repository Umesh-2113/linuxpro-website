import { dbGetStockById } from "@/lib/db/stock";
import { isHostHeavenProvider, type StockProvider } from "@/lib/stock-providers";
import type { UserServer } from "@/lib/user-servers";

/** Merge HostHeaven provider from linked stock and use action IP when server IP is empty. */
export async function resolveHostHeavenServer(
  server: UserServer,
  ipFallback?: string
): Promise<UserServer> {
  let provider: StockProvider | undefined = server.provider;
  let providerVmId = server.providerVmId;

  if (!isHostHeavenProvider(provider) && server.stockId) {
    const stock = await dbGetStockById(server.stockId);
    if (stock && isHostHeavenProvider(stock.provider)) {
      provider = stock.provider;
      providerVmId = stock.providerVmId ?? providerVmId;
    }
  }

  const ip = server.ip?.trim() || ipFallback?.trim() || server.ip;

  return { ...server, provider, providerVmId, ip };
}

export function isServerManagedByHostHeaven(server: UserServer): boolean {
  return isHostHeavenProvider(server.provider);
}
