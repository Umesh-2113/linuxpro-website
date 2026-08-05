import { isHostHeavenConfigured } from "@/lib/hostheaven/client";

export type HostHeavenStockSyncResult = {
  ok: boolean;
  message: string;
  pools: number;
  updated: number;
  created: number;
  availableIps: number;
};

/**
 * Stock quantity sync is OFF while order delivery is manual.
 * Admin controls stock qty; HostHeaven connection is still used for status checks.
 */
export async function syncHostHeavenStockToDb(
  _options?: { force?: boolean; minIntervalMs?: number }
): Promise<HostHeavenStockSyncResult> {
  if (!isHostHeavenConfigured()) {
    return {
      ok: false,
      message: "HostHeaven is not configured.",
      pools: 0,
      updated: 0,
      created: 0,
      availableIps: 0,
    };
  }

  return {
    ok: true,
    message:
      "Stock quantity sync skipped (manual delivery mode). Set qty in Admin → Stock.",
    pools: 0,
    updated: 0,
    created: 0,
    availableIps: 0,
  };
}
