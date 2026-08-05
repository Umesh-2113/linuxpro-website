import { apiDelete, apiGet, apiPatch, apiPost } from "@/lib/api-client";
import {
  getProductSeriesName,
  getStockPrice,
  stockTypeLabels,
  type StockItem,
  type StockType,
} from "@/lib/stock";

export type PaymentStatus = "pending" | "processing" | "received" | "not_received";
export type FulfillmentStatus = "pending" | "processing" | "delivered" | "cancelled";

export type Order = {
  id: string;
  stockId: string;
  stockType: StockType;
  series: string;
  quantity: number;
  unitPrice: number;
  totalAmount: number;
  specs: string;
  ramGb?: number;
  region: string;
  port: string;
  os: string;
  userName: string;
  userEmail: string;
  paymentStatus: PaymentStatus;
  fulfillmentStatus: FulfillmentStatus;
  adminNote: string;
  deliverIp: string;
  deliverUsername: string;
  deliverPassword: string;
  paymentGateway: "manual" | "cashfree" | "wallet";
  cashfreeOrderStatus: string;
  customerPhone: string;
  promoCode?: string;
  promoType?: "percent" | "flat";
  promoValue?: number;
  promoPercent?: number;
  promoDiscount?: number;
  originalUnitPrice?: number;
  createdAt: string;
  updatedAt: string;
};

let cache: Order[] = [];
let fetchPromise: Promise<Order[]> | null = null;

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function mergeUserOrders(orders: Order[], email: string): void {
  const normalized = normalizeEmail(email);
  const rest = cache.filter((o) => normalizeEmail(o.userEmail) !== normalized);
  cache = [...orders, ...rest];
}

function emitUpdate() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("orders-updated"));
  }
}

export async function fetchOrders(
  email?: string,
  options?: { force?: boolean }
): Promise<Order[]> {
  const bust = options?.force ? `&_=${Date.now()}` : "";
  const path = email
    ? `/api/orders?email=${encodeURIComponent(email)}${bust}`
    : `/api/orders?_=${Date.now()}`;
  if (!email && fetchPromise && !options?.force) return fetchPromise;

  const promise = apiGet<Order[]>(path)
    .then((orders) => {
      if (email) {
        mergeUserOrders(orders, email);
        emitUpdate();
        return orders;
      }
      cache = orders;
      fetchPromise = null;
      emitUpdate();
      return orders;
    })
    .catch((err) => {
      if (!email) fetchPromise = null;
      console.error("[fetchOrders]", err);
      if (options?.force) throw err;
      return email ? [] : cache;
    });

  if (!email) fetchPromise = promise;
  return promise;
}

export function getOrders(): Order[] {
  return [...cache].sort((a, b) => {
    const bt = new Date(b.createdAt).getTime() || 0;
    const at = new Date(a.createdAt).getTime() || 0;
    if (bt !== at) return bt - at;
    return b.id.localeCompare(a.id);
  });
}

export function getOrdersByUser(email: string): Order[] {
  const normalized = normalizeEmail(email);
  return getOrders().filter((o) => normalizeEmail(o.userEmail) === normalized);
}

export function getOrderById(id: string): Order | null {
  return getOrders().find((o) => o.id === id) ?? null;
}

export function getOrderStats() {
  const orders = getOrders();
  return {
    total: orders.length,
    paymentPending: orders.filter((o) => o.paymentStatus === "pending").length,
    paymentReceived: orders.filter((o) => o.paymentStatus === "received").length,
    awaitingDelivery: orders.filter(
      (o) =>
        o.paymentStatus === "received" &&
        o.fulfillmentStatus !== "delivered" &&
        o.fulfillmentStatus !== "cancelled"
    ).length,
    delivered: orders.filter((o) => o.fulfillmentStatus === "delivered").length,
  };
}

export function getStockUnitPrice(item: StockItem, ramGb?: number): number {
  return getStockPrice(item, ramGb);
}

export async function createOrder(data: {
  stockId: string;
  quantity: number;
  userName: string;
  userEmail: string;
  customerPhone?: string;
  paymentGateway?: "manual" | "cashfree" | "wallet";
  selectedRamGb?: number;
  promoCode?: string;
}): Promise<Order | null> {
  const order = await apiPost<Order>("/api/orders", data);
  cache = [order, ...cache];
  emitUpdate();
  return order;
}

export async function updateOrder(
  id: string,
  updates: Partial<
    Pick<
      Order,
      | "paymentStatus"
      | "fulfillmentStatus"
      | "adminNote"
      | "deliverIp"
      | "deliverUsername"
      | "deliverPassword"
      | "paymentGateway"
      | "cashfreeOrderStatus"
      | "customerPhone"
    >
  >
): Promise<Order | null> {
  try {
    const updated = await apiPatch<Order>(`/api/orders/${id}`, updates);
    cache = cache.map((o) => (o.id === id ? updated : o));
    emitUpdate();
    return updated;
  } catch {
    return null;
  }
}

export async function deliverOrderToCustomer(
  id: string,
  creds:
    | { ip: string; username: string; password: string }
    | { ip: string; username: string; password: string }[]
): Promise<Order | null> {
  try {
    const units = Array.isArray(creds) ? creds : [creds];
    const updated = await apiPost<Order>(`/api/orders/${id}/deliver`, { units });
    cache = cache.map((o) => (o.id === id ? updated : o));
    emitUpdate();
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("servers-updated"));
    }
    return updated;
  } catch (err) {
    if (err instanceof Error) throw err;
    return null;
  }
}

export async function autoDeliverOrder(
  orderId: string
): Promise<{ delivered: boolean; message: string; order: Order | null }> {
  const data = await apiPost<{
    delivered?: boolean;
    message?: string;
    order?: Order;
    error?: string;
  }>(`/api/orders/${orderId}/auto-deliver`, {});
  if (data.order) {
    cache = cache.map((o) => (o.id === orderId ? data.order! : o));
    emitUpdate();
    if (data.delivered && typeof window !== "undefined") {
      window.dispatchEvent(new Event("servers-updated"));
    }
  }
  return {
    delivered: Boolean(data.delivered),
    message: data.message || data.error || "",
    order: data.order ?? null,
  };
}

export async function updateOrderCredentials(
  id: string,
  creds:
    | { ip: string; username: string; password: string }
    | { serverId?: string; ip: string; username: string; password: string }[]
): Promise<Order | null> {
  try {
    const body = Array.isArray(creds)
      ? { mode: "update", units: creds }
      : { mode: "update", ...creds };
    const updated = await apiPost<Order>(`/api/orders/${id}/deliver`, body);
    cache = cache.map((o) => (o.id === id ? updated : o));
    emitUpdate();
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("servers-updated"));
    }
    return updated;
  } catch (err) {
    if (err instanceof Error) throw err;
    return null;
  }
}

export async function confirmCashfreePayment(
  orderId: string,
  cashfreeStatus: string
): Promise<Order | null> {
  try {
    const updated = await apiPost<Order>(`/api/orders/${orderId}/cashfree`, {
      cashfreeStatus,
    });
    cache = cache.map((o) => (o.id === orderId ? updated : o));
    emitUpdate();
    return updated;
  } catch {
    return null;
  }
}

export async function confirmWalletPayment(orderId: string): Promise<Order | null> {
  const updated = await apiPost<Order>(`/api/orders/${orderId}/wallet`, {});
  cache = cache.map((o) => (o.id === orderId ? updated : o));
  emitUpdate();
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("wallet-updated"));
  }
  return updated;
}

export async function deleteOrder(id: string): Promise<void> {
  await apiDelete(`/api/orders/${id}`);
  cache = cache.filter((o) => o.id !== id);
  emitUpdate();
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("servers-updated"));
  }
}

export function formatOrderDate(dateStr: string): string {
  return new Date(dateStr).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function getOrderTitle(order: Order): string {
  return getProductSeriesName(order.series);
}

export function getOrderSubtitle(order: Order): string {
  return `${stockTypeLabels[order.stockType]} · ${order.region}`;
}

export const paymentStatusLabels: Record<PaymentStatus, string> = {
  pending: "Payment Pending",
  processing: "Payment Processing",
  received: "Payment Received",
  not_received: "Payment Not Received",
};

export const fulfillmentStatusLabels: Record<FulfillmentStatus, string> = {
  pending: "Awaiting Fulfillment",
  processing: "Processing",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

export function getAdminPaymentLabel(order: Order): string {
  if (order.paymentGateway === "wallet" && order.paymentStatus === "received") {
    return "Payment Confirmed (Wallet)";
  }
  if (order.paymentGateway === "cashfree" && order.paymentStatus === "received") {
    return "Payment Confirmed (Cashfree)";
  }
  if (order.paymentGateway === "cashfree" && order.paymentStatus === "pending") {
    return "Cashfree — Awaiting Payment";
  }
  if (order.paymentGateway === "wallet" && order.paymentStatus === "pending") {
    return "Wallet — Awaiting Payment";
  }
  return paymentStatusLabels[order.paymentStatus];
}

export function getAdminFulfillmentLabel(order: Order): string {
  if (order.paymentStatus === "received" && order.fulfillmentStatus === "pending") {
    return "Order Pending";
  }
  if (order.paymentStatus === "received" && order.fulfillmentStatus === "processing") {
    return "Order Processing";
  }
  if (order.fulfillmentStatus === "delivered") {
    return "Order Delivered";
  }
  if (order.fulfillmentStatus === "cancelled") {
    return "Order Cancelled";
  }
  return "Awaiting Payment";
}

export function isCashfreePaymentConfirmed(order: Order): boolean {
  return (
    order.paymentGateway === "cashfree" &&
    order.paymentStatus === "received" &&
    order.fulfillmentStatus !== "delivered" &&
    order.fulfillmentStatus !== "cancelled"
  );
}
