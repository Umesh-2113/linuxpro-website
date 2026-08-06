import { dbGetOrderById, dbDeliverOrderUnits, dbUpdateOrder } from "@/lib/db/orders";
import { dbGetStockById } from "@/lib/db/stock";
import {
  dbClaimBackupStockForOrder,
  dbReleaseBackupStockForOrder,
} from "@/lib/db/backup-stock";
import type { Order } from "@/lib/orders";
import {
  isHostHeavenProvider,
  isOceanLinuxProvider,
} from "@/lib/stock-providers";
import {
  getAllocatedIpSet,
  getAllocatedVmIdSet,
} from "@/lib/hostheaven/allocated";
import {
  hostHeavenListVms,
  isHostHeavenConfigured,
  type HostHeavenVm,
} from "@/lib/hostheaven/client";
import { ipMatchesSeries } from "@/lib/hostheaven/series";
import {
  isOceanLinuxConfigured,
  oceanLinuxBuyOrder,
  oceanLinuxGetOrder,
  oceanLinuxSyncOrder,
  type OceanLinuxOrder,
} from "@/lib/oceanlinux/client";

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

type DeliverUnit = {
  ip: string;
  username: string;
  password: string;
  providerVmId?: number;
  providerOrderId?: string;
  provider: "hostheaven" | "oceanlinux" | "manual";
};

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function memoryOptionFromOrder(order: Order): string {
  const ram = order.ramGb;
  if (typeof ram === "number" && ram > 0) return `${ram}GB`;
  const fromSpecs = order.specs?.match(/(\d+)\s*GB/i);
  if (fromSpecs) return `${fromSpecs[1]}GB`;
  return "4GB";
}

async function waitForOceanLinuxCreds(
  orderId: string,
  attempts = 12,
  delayMs = 5000
): Promise<OceanLinuxOrder> {
  let last: OceanLinuxOrder | null = null;
  for (let i = 0; i < attempts; i++) {
    if (i > 0) await sleep(delayMs);
    try {
      const synced = await oceanLinuxSyncOrder(orderId);
      if (synced.ipAddress && synced.username && synced.password) {
        return {
          id: orderId,
          ipAddress: synced.ipAddress,
          username: synced.username,
          password: synced.password,
          expiryDate: synced.expiryDate,
          status: synced.status,
          raw: synced.raw,
        };
      }
    } catch {
      /* fall through to GET */
    }
    last = await oceanLinuxGetOrder(orderId);
    if (last.ipAddress && last.username && last.password) return last;
  }
  if (last) return last;
  throw new Error("OceanLinux credentials not ready yet.");
}

async function tryDeliverFromOceanLinux(
  order: Order,
  productId: string
): Promise<{ units: DeliverUnit[]; error?: string }> {
  if (!isOceanLinuxConfigured()) {
    return {
      units: [],
      error: "OceanLinux API keys not configured on server.",
    };
  }

  const memory = memoryOptionFromOrder(order);
  const units: DeliverUnit[] = [];

  try {
    for (let i = 0; i < order.quantity; i++) {
      const bought = await oceanLinuxBuyOrder({
        productId,
        memory,
        quantity: 1,
      });
      if (!bought.id) {
        return {
          units: [],
          error: "OceanLinux buy succeeded but order id missing.",
        };
      }
      const ready = await waitForOceanLinuxCreds(bought.id);
      if (!ready.ipAddress || !ready.username || !ready.password) {
        return {
          units: [],
          error: `OceanLinux order ${bought.id} provisioned but credentials incomplete.`,
        };
      }
      units.push({
        ip: ready.ipAddress,
        username: ready.username,
        password: ready.password,
        providerOrderId: bought.id,
        provider: "oceanlinux",
      });
    }
    return { units };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "OceanLinux purchase failed.";
    console.error("[autoDeliver] oceanlinux", order.id, message);
    return { units: [], error: message };
  }
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
 * After payment:
 * - OceanLinux stock → API auto-buy + deliver
 * - HostHeaven stock → always manual
 * - Backup Stock → optional fallback (non-HostHeaven)
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
  const useOceanLinux =
    isOceanLinuxConfigured() &&
    stock &&
    isOceanLinuxProvider(stock.provider) &&
    Boolean(stock.providerProductId);

  // HostHeaven stays manual — never auto-assign from HostHeaven API.
  if (stock && isHostHeavenProvider(stock.provider)) {
    await dbUpdateOrder(orderId, {
      fulfillmentStatus: "processing",
      adminNote:
        "HostHeaven stock: manual delivery required. Enter IP / username / password in Orders.",
    });
    return {
      order: await dbGetOrderById(orderId),
      delivered: false,
      message: "HostHeaven orders are manual — deliver from admin.",
    };
  }

  let units: DeliverUnit[] = [];
  let source: "oceanlinux" | "backup" | null = null;
  let apiError: string | undefined;

  if (useOceanLinux && stock?.providerProductId) {
    const ol = await tryDeliverFromOceanLinux(order, stock.providerProductId);
    apiError = ol.error;
    if (ol.units.length >= order.quantity) {
      units = ol.units;
      source = "oceanlinux";
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
    const note =
      apiError ||
      (useOceanLinux
        ? `Auto-provision: OceanLinux deliver failed${apiError ? `: ${apiError}` : ""}. Check wallet balance / product stock, or deliver manually.`
        : `Manual delivery required (no OceanLinux / Backup match for series "${order.series}").`);
    await dbUpdateOrder(orderId, {
      fulfillmentStatus: "processing",
      adminNote: note,
    });
    return {
      order: await dbGetOrderById(orderId),
      delivered: false,
      message: "No automatic IP available yet — deliver manually if needed.",
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

  const ips = units.map((u) => u.ip).join(", ");
  await dbUpdateOrder(orderId, {
    adminNote:
      source === "backup"
        ? `Auto-delivered from Backup Stock: ${ips}`
        : `Auto-delivered from OceanLinux: ${ips}`,
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
