import { dbGetOrderById, dbDeliverOrderUnits, dbUpdateOrder } from "@/lib/db/orders";
import { dbGetStockById } from "@/lib/db/stock";
import {
  dbClaimBackupStockForOrder,
  dbCountFreeBackupForSeries,
  dbReleaseBackupStockForOrder,
} from "@/lib/db/backup-stock";
import type { Order } from "@/lib/orders";
import { isHostHeavenProvider } from "@/lib/stock-providers";
import {
  getAllocatedIpSet,
  getAllocatedVmIdSet,
} from "@/lib/hostheaven/allocated";
import {
  hostHeavenGetVmCredentials,
  hostHeavenListVms,
  isHostHeavenConfigured,
  type HostHeavenVm,
} from "@/lib/hostheaven/client";
import { ipMatchesSeries } from "@/lib/hostheaven/series";

function isVmAvailable(
  vm: HostHeavenVm,
  usedIps: Set<string>,
  usedVmIds: Set<number>
): boolean {
  const status = (vm.status ?? "ACTIVE").toUpperCase();
  if (status !== "ACTIVE") return false;
  if (vm.locked) return false;
  if (vm.assigned) return false;
  if (usedVmIds.has(vm.id)) return false;
  const ip = vm.ips[0];
  if (!ip) return false;
  if (usedIps.has(ip.toLowerCase())) return false;
  return true;
}

export async function listAvailableHostHeavenVms(
  series?: string
): Promise<HostHeavenVm[]> {
  if (!isHostHeavenConfigured()) return [];
  const [usedIps, usedVmIds, vms] = await Promise.all([
    getAllocatedIpSet(),
    getAllocatedVmIdSet(),
    hostHeavenListVms(),
  ]);
  return vms.filter((vm) => {
    if (!isVmAvailable(vm, usedIps, usedVmIds)) return false;
    if (series && !ipMatchesSeries(vm.ips[0], series)) return false;
    return true;
  });
}

async function buildNoMatchNote(series: string, orderType?: Order["stockType"]): Promise<string> {
  const backupFree = await dbCountFreeBackupForSeries(series, orderType).catch(() => 0);

  try {
    if (!isHostHeavenConfigured()) {
      return backupFree > 0
        ? `Auto-provision: HostHeaven not configured. Backup stock has ${backupFree} free for ${series}, but claim failed.`
        : `Auto-provision: HostHeaven not configured, and backup stock has no free IP for series "${series}". Admin → Backup Stock me add karo.`;
    }

    const [usedIps, usedVmIds, vms] = await Promise.all([
      getAllocatedIpSet(),
      getAllocatedVmIdSet(),
      hostHeavenListVms(),
    ]);
    const active = vms.filter((vm) => (vm.status ?? "ACTIVE").toUpperCase() === "ACTIVE");
    const freeAll = active.filter((vm) => isVmAvailable(vm, usedIps, usedVmIds));
    const seriesMatched = active.filter(
      (vm) => vm.ips[0] && ipMatchesSeries(vm.ips[0], series)
    );
    const seriesFree = seriesMatched.filter((vm) =>
      isVmAvailable(vm, usedIps, usedVmIds)
    );
    const seriesSold = seriesMatched.length - seriesFree.length;

    const freePrefixes = [
      ...new Set(
        freeAll
          .map((vm) => {
            const parts = (vm.ips[0] || "").split(".");
            return parts.length >= 2 ? `${parts[0]}.${parts[1]}` : vm.ips[0];
          })
          .filter(Boolean)
      ),
    ].sort();

    const backupHint =
      backupFree > 0
        ? ` Backup stock: ${backupFree} free (claim retry / check series match).`
        : ` Backup stock: 0 free for this series — Admin → Backup Stock me IP|user|pass add karo.`;

    if (seriesMatched.length === 0) {
      return (
        `Auto-provision: HostHeaven pe series "${series}" ka koi VM nahi mila. ` +
        (freePrefixes.length
          ? `Free series abhi: ${freePrefixes.join(", ")}. `
          : `HostHeaven pe abhi koi free VM nahi. `) +
        backupHint
      );
    }

    if (seriesFree.length === 0) {
      return (
        `Auto-provision: series "${series}" ke ${seriesMatched.length} VM HostHeaven pe hain, ` +
        `lekin ${seriesSold} pehle se sold hain. ` +
        (freePrefixes.length ? `Dusri free series: ${freePrefixes.join(", ")}. ` : "") +
        backupHint
      );
    }

    return `Auto-provision: no free IP matching series ${series}.${backupHint}`;
  } catch {
    return (
      `Auto-provision: no free HostHeaven IP matching series ${series}.` +
      (backupFree
        ? ` Backup free: ${backupFree}.`
        : ` Backup stock empty for this series.`)
    );
  }
}

type DeliverUnit = {
  ip: string;
  username: string;
  password: string;
  providerVmId?: number;
  provider: "hostheaven" | "manual";
};

async function tryDeliverFromHostHeaven(
  order: Order
): Promise<{ units: DeliverUnit[]; error?: string }> {
  if (!isHostHeavenConfigured()) {
    return { units: [] };
  }

  let available: HostHeavenVm[];
  try {
    available = await listAvailableHostHeavenVms(order.series);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to list HostHeaven VMs.";
    console.error("[autoDeliver]", order.id, message);
    return { units: [], error: message };
  }

  if (available.length < order.quantity) {
    return { units: [] };
  }

  const units: DeliverUnit[] = [];
  const claimedIps = new Set<string>();
  const claimedVmIds = new Set<number>();

  for (const vm of available) {
    if (units.length >= order.quantity) break;
    if (claimedVmIds.has(vm.id)) continue;

    try {
      const creds = await hostHeavenGetVmCredentials(vm.id, vm.ips[0], {
        osHint: `${order.os} ${vm.os ?? ""}`,
      });
      const ipKey = creds.ip.trim().toLowerCase();
      if (!ipKey || claimedIps.has(ipKey) || claimedVmIds.has(creds.vmId)) {
        continue;
      }

      const [usedIps, usedVmIds] = await Promise.all([
        getAllocatedIpSet(),
        getAllocatedVmIdSet(),
      ]);
      if (usedIps.has(ipKey) || usedVmIds.has(creds.vmId)) {
        continue;
      }

      claimedIps.add(ipKey);
      claimedVmIds.add(creds.vmId);
      units.push({
        ip: creds.ip.trim(),
        username: creds.username,
        password: creds.password,
        providerVmId: creds.vmId,
        provider: "hostheaven",
      });
    } catch (error) {
      console.error("[autoDeliver] credentials", vm.id, error);
    }
  }

  if (units.length < order.quantity) {
    return {
      units: [],
      error:
        available.length >= order.quantity
          ? `HostHeaven pe ${available.length} free IP mile, lekin credentials load fail (${units.length}/${order.quantity}).`
          : undefined,
    };
  }
  return { units };
}

async function tryDeliverFromBackup(order: Order): Promise<DeliverUnit[]> {
  const claimed = await dbClaimBackupStockForOrder(
    order.id,
    order.series,
    order.quantity,
    order.stockType
  );
  if (claimed.length < order.quantity) {
    if (claimed.length > 0) {
      await dbReleaseBackupStockForOrder(order.id);
    }
    return [];
  }
  return claimed.map((item) => ({
    ip: item.ip.trim(),
    username: item.username,
    password: item.password,
    provider: "manual" as const,
  }));
}

/**
 * After payment: allocate free HostHeaven VMs matching the order series,
 * or fall back to admin Backup Stock when API has no free match.
 */
export async function autoDeliverPaidOrder(orderId: string): Promise<{
  order: Order | null;
  delivered: boolean;
  message: string;
}> {
  const order = await dbGetOrderById(orderId);
  if (!order) {
    return { order: null, delivered: false, message: "Order not found." };
  }
  if (order.paymentStatus !== "received") {
    return { order, delivered: false, message: "Order is not paid yet." };
  }
  if (order.fulfillmentStatus === "delivered") {
    return { order, delivered: true, message: "Already delivered." };
  }
  if (order.fulfillmentStatus === "cancelled") {
    return { order, delivered: false, message: "Order is cancelled." };
  }

  const stock = await dbGetStockById(order.stockId);
  const preferHostHeaven =
    isHostHeavenConfigured() && (!stock || isHostHeavenProvider(stock.provider));

  let units: DeliverUnit[] = [];
  let source: "hostheaven" | "backup" | null = null;
  let hhError: string | undefined;

  if (preferHostHeaven || isHostHeavenConfigured()) {
    const hh = await tryDeliverFromHostHeaven(order);
    hhError = hh.error;
    if (hh.units.length >= order.quantity) {
      units = hh.units;
      source = "hostheaven";
    }
  }

  if (!source) {
    try {
      const backupUnits = await tryDeliverFromBackup(order);
      if (backupUnits.length >= order.quantity) {
        units = backupUnits;
        source = "backup";
      }
    } catch (error) {
      console.error("[autoDeliver] backup", orderId, error);
    }
  }

  if (!source || units.length < order.quantity) {
    await dbUpdateOrder(orderId, {
      fulfillmentStatus: "processing",
      adminNote: hhError || (await buildNoMatchNote(order.series, order.stockType)),
    });
    return {
      order: await dbGetOrderById(orderId),
      delivered: false,
      message: "No matching free IP available yet (API + backup).",
    };
  }

  try {
    const delivered = await dbDeliverOrderUnits(orderId, units);
    if (!delivered) {
      if (source === "backup") {
        await dbReleaseBackupStockForOrder(orderId);
      }
      return {
        order: await dbGetOrderById(orderId),
        delivered: false,
        message: "Delivery failed.",
      };
    }
  } catch (error) {
    if (source === "backup") {
      await dbReleaseBackupStockForOrder(orderId).catch(() => undefined);
    }
    const message =
      error instanceof Error ? error.message : "Delivery failed.";
    console.error("[autoDeliver] deliver", orderId, message);
    await dbUpdateOrder(orderId, {
      fulfillmentStatus: "processing",
      adminNote: `Auto-provision blocked: ${message}`,
    });
    return {
      order: await dbGetOrderById(orderId),
      delivered: false,
      message,
    };
  }

  await dbUpdateOrder(orderId, {
    adminNote:
      source === "backup"
        ? `Auto-delivered from Backup Stock: ${units.map((u) => u.ip).join(", ")}`
        : `Auto-delivered from HostHeaven: ${units.map((u) => u.ip).join(", ")}`,
  });

  return {
    order: await dbGetOrderById(orderId),
    delivered: true,
    message:
      source === "backup"
        ? `Delivered ${units.length} IP(s) from backup stock.`
        : `Delivered ${units.length} IP(s) automatically.`,
  };
}
