import { dbGetOrderById, dbUpdateOrder } from "@/lib/db/orders";
import type { Order } from "@/lib/orders";
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

/** Still used for admin status / stock tooling — not for auto-delivery. */
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
 * After payment: HostHeaven / Backup auto-deliver is OFF.
 * Admin delivers IP, username, password manually from Orders panel.
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

  if (order.fulfillmentStatus !== "processing") {
    await dbUpdateOrder(orderId, {
      fulfillmentStatus: "processing",
      adminNote: "Manual delivery required (API auto-deliver OFF).",
    });
  }

  return {
    order: await dbGetOrderById(orderId),
    delivered: false,
    message: "Auto-deliver is disabled. Deliver IP manually from admin.",
  };
}
