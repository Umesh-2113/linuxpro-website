import {
  dbGetStock,
  dbUpdateStockItem,
} from "@/lib/db/stock";
import { getAllocatedIpSet } from "@/lib/hostheaven/allocated";
import {
  hostHeavenListVms,
  isHostHeavenConfigured,
  type HostHeavenVm,
} from "@/lib/hostheaven/client";
import { ipMatchesSeries } from "@/lib/hostheaven/series";

export type HostHeavenStockSyncResult = {
  ok: boolean;
  message: string;
  pools: number;
  updated: number;
  created: number;
  availableIps: number;
};

function isFreeVm(vm: HostHeavenVm, usedIps: Set<string>): boolean {
  const status = (vm.status ?? "ACTIVE").toUpperCase();
  if (status !== "ACTIVE") return false;
  if (vm.locked || vm.assigned) return false;
  const ip = vm.ips[0];
  if (!ip) return false;
  return !usedIps.has(ip.toLowerCase());
}

let lastSyncAt = 0;
let inflight: Promise<HostHeavenStockSyncResult> | null = null;

/** Sync free HostHeaven VM counts onto existing hostheaven stock rows only. */
export async function syncHostHeavenStockToDb(
  options?: { force?: boolean; minIntervalMs?: number }
): Promise<HostHeavenStockSyncResult> {
  const minInterval = options?.minIntervalMs ?? 60_000;
  if (!options?.force && Date.now() - lastSyncAt < minInterval && !inflight) {
    return {
      ok: true,
      message: "Skipped (recently synced).",
      pools: 0,
      updated: 0,
      created: 0,
      availableIps: 0,
    };
  }

  if (inflight) return inflight;

  inflight = (async () => {
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

    try {
      const usedIps = await getAllocatedIpSet();
      const allVms = await hostHeavenListVms();
      const free = allVms.filter((vm) => isFreeVm(vm, usedIps));
      const stock = await dbGetStock();
      let updated = 0;
      const matchedSeries = new Set<string>();

      for (const item of stock) {
        if (item.provider !== "hostheaven") continue;

        const matching = free.filter(
          (vm) => vm.ips[0] && ipMatchesSeries(vm.ips[0], item.series)
        );
        const nextQty = matching.length;
        if (nextQty > 0) matchedSeries.add(item.series);

        if (item.quantity !== nextQty) {
          await dbUpdateStockItem(item.id, {
            quantity: nextQty,
            provider: "hostheaven",
          });
          updated += 1;
        }
      }

      lastSyncAt = Date.now();
      return {
        ok: true,
        message: `Synced HostHeaven stock (${free.length} free IPs, ${matchedSeries.size} series with stock).`,
        pools: matchedSeries.size,
        updated,
        created: 0,
        availableIps: free.length,
      };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "HostHeaven stock sync failed.";
      console.error("[syncHostHeavenStock]", message);
      return {
        ok: false,
        message,
        pools: 0,
        updated: 0,
        created: 0,
        availableIps: 0,
      };
    } finally {
      inflight = null;
    }
  })();

  return inflight;
}
