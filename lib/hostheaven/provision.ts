import { dbGetOrderById, dbDeliverOrderUnits, dbUpdateOrder } from "@/lib/db/orders";
import { dbGetStockById } from "@/lib/db/stock";
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

/**
 * After payment: allocate free HostHeaven VMs matching the order series,
 * fetch IP+password from API, and deliver to the customer automatically.
 * Never reuses IPs / VM ids already on servers or delivered orders.
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
  if (!isHostHeavenConfigured()) {
    return { order, delivered: false, message: "HostHeaven is not configured." };
  }

  const stock = await dbGetStockById(order.stockId);
  const preferHostHeaven = !stock || isHostHeavenProvider(stock.provider);

  let available: HostHeavenVm[];
  try {
    available = await listAvailableHostHeavenVms(order.series);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to list HostHeaven VMs.";
    console.error("[autoDeliver]", orderId, message);
    return { order, delivered: false, message };
  }

  if (available.length === 0) {
    if (preferHostHeaven) {
      await dbUpdateOrder(orderId, {
        fulfillmentStatus: "processing",
        adminNote: `Auto-provision: no free HostHeaven IP matching series ${order.series}.`,
      });
    }
    return {
      order: await dbGetOrderById(orderId),
      delivered: false,
      message: "No matching free IP available yet.",
    };
  }

  if (available.length < order.quantity) {
    await dbUpdateOrder(orderId, {
      fulfillmentStatus: "processing",
      adminNote: `Auto-provision waiting: need ${order.quantity}, found ${available.length} free IP(s) for ${order.series}.`,
    });
    return {
      order: await dbGetOrderById(orderId),
      delivered: false,
      message: `Only ${available.length}/${order.quantity} free IPs available.`,
    };
  }

  const units: {
    ip: string;
    username: string;
    password: string;
    providerVmId: number;
    provider: "hostheaven";
  }[] = [];
  const claimedIps = new Set<string>();
  const claimedVmIds = new Set<number>();

  for (const vm of available) {
    if (units.length >= order.quantity) break;
    if (claimedVmIds.has(vm.id)) continue;

    try {
      const creds = await hostHeavenGetVmCredentials(vm.id, vm.ips[0]);
      const ipKey = creds.ip.trim().toLowerCase();
      if (!ipKey || claimedIps.has(ipKey) || claimedVmIds.has(creds.vmId)) {
        continue;
      }

      // Re-check DB right before claim (blocks reuse of old-user IPs).
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
    await dbUpdateOrder(orderId, {
      fulfillmentStatus: "processing",
      adminNote: `Auto-provision: could not load free credentials (${units.length}/${order.quantity}).`,
    });
    return {
      order: await dbGetOrderById(orderId),
      delivered: false,
      message: "Could not load enough unused VM credentials.",
    };
  }

  try {
    const delivered = await dbDeliverOrderUnits(orderId, units);
    if (!delivered) {
      return {
        order: await dbGetOrderById(orderId),
        delivered: false,
        message: "Delivery failed.",
      };
    }
  } catch (error) {
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
    adminNote: `Auto-delivered from HostHeaven: ${units.map((u) => u.ip).join(", ")}`,
  });

  return {
    order: await dbGetOrderById(orderId),
    delivered: true,
    message: `Delivered ${units.length} IP(s) automatically.`,
  };
}
