import {
  dbGetStock,
  dbUpdateStockItem,
} from "@/lib/db/stock";
import type { StockItem } from "@/lib/stock";
import { getAllocatedIpSet } from "@/lib/hostheaven/allocated";
import {
  hostHeavenListVms,
  isHostHeavenConfigured,
  type HostHeavenVm,
} from "@/lib/hostheaven/client";
import { ipMatchesSeries, ipSeriesKey, seriesIpPrefix } from "@/lib/hostheaven/series";

export type HostHeavenStockSyncResult = {
  ok: boolean;
  message: string;
  pools: number;
  updated: number;
  created: number;
  availableIps: number;
};

type Pool = {
  series: string;
  vms: HostHeavenVm[];
};

function poolFromVms(vms: HostHeavenVm[]): Pool[] {
  const map = new Map<string, HostHeavenVm[]>();
  for (const vm of vms) {
    const ip = vm.ips[0];
    if (!ip) continue;
    const key = ipSeriesKey(ip);
    const list = map.get(key) ?? [];
    list.push(vm);
    map.set(key, list);
  }
  return [...map.entries()].map(([series, group]) => ({ series, vms: group }));
}

function findMatchingStock(items: StockItem[], series: string): StockItem[] {
  return items.filter((item) => {
    const prefix = seriesIpPrefix(item.series);
    return (
      prefix === series ||
      ipMatchesSeries(`${series}.0.1`, item.series) ||
      item.series.toLowerCase().includes(series.toLowerCase())
    );
  });
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
      const free = allVms.filter((vm) => {
        const status = (vm.status ?? "ACTIVE").toUpperCase();
        if (status !== "ACTIVE") return false;
        if (vm.locked || vm.assigned) return false;
        const ip = vm.ips[0];
        if (!ip) return false;
        return !usedIps.has(ip.toLowerCase());
      });

      const pools = poolFromVms(free);
      const stock = await dbGetStock();
      let updated = 0;

      for (const pool of pools) {
        const matches = findMatchingStock(stock, pool.series);
        const targets = matches.filter((m) => m.provider === "hostheaven");

        if (targets.length === 0) {
          // Admin may have deleted this series — do not recreate.
          continue;
        }

        for (const item of targets) {
          const nextQty = pool.vms.length;
          if (item.quantity !== nextQty) {
            await dbUpdateStockItem(item.id, {
              quantity: nextQty,
              provider: "hostheaven",
            });
            updated += 1;
          }
        }
      }

      for (const item of stock) {
        if (item.provider !== "hostheaven") continue;
        const prefix = seriesIpPrefix(item.series);
        const stillFree = pools.some(
          (p) =>
            p.series === prefix || ipMatchesSeries(`${prefix}.0.1`, item.series)
        );
        if (!stillFree && item.quantity > 0) {
          await dbUpdateStockItem(item.id, { quantity: 0 });
          updated += 1;
        }
      }

      lastSyncAt = Date.now();
      return {
        ok: true,
        message: `Synced ${pools.length} IP series from HostHeaven (${free.length} free).`,
        pools: pools.length,
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
