import {
  dbCreateServersFromOrder,
  dbDeleteServersByOrder,
  dbUpdateServersCredentialsForOrder,
  type DeliverServerCreds,
} from "@/lib/db/servers";
import { dbGetStockById, dbUpdateStockItem } from "@/lib/db/stock";
import {
  applyPromoEntry,
  formatStockSpecs,
  getRamPlan,
  getRamPlanPrice,
  getRamPlans,
  getStockPrice,
  validatePromoCode,
  type StockType,
} from "@/lib/stock";
import type { FulfillmentStatus, Order, PaymentStatus } from "@/lib/orders";
import { getCollection } from "@/lib/mongodb";

function migrateOrder(raw: Partial<Order> & { id: string }): Order {
  return {
    id: raw.id,
    stockId: raw.stockId ?? "",
    stockType: raw.stockType ?? "vps",
    series: raw.series ?? "",
    quantity: raw.quantity ?? 1,
    unitPrice: raw.unitPrice ?? 0,
    totalAmount: raw.totalAmount ?? 0,
    specs: raw.specs ?? "",
    ramGb: raw.ramGb,
    region: raw.region ?? "",
    port: raw.port ?? "",
    os: raw.os ?? "",
    userName: raw.userName ?? "",
    userEmail: raw.userEmail ?? "",
    paymentStatus: raw.paymentStatus ?? "pending",
    fulfillmentStatus: raw.fulfillmentStatus ?? "pending",
    adminNote: raw.adminNote ?? "",
    deliverIp: raw.deliverIp ?? "",
    deliverUsername: raw.deliverUsername ?? "",
    deliverPassword: raw.deliverPassword ?? "",
    paymentGateway: raw.paymentGateway ?? "manual",
    cashfreeOrderStatus: raw.cashfreeOrderStatus ?? "",
    customerPhone: raw.customerPhone ?? "",
    promoCode: raw.promoCode,
    promoType: raw.promoType,
    promoValue: raw.promoValue,
    promoPercent: raw.promoPercent,
    promoDiscount: raw.promoDiscount,
    originalUnitPrice: raw.originalUnitPrice,
    createdAt: raw.createdAt ?? new Date().toISOString(),
    updatedAt: raw.updatedAt ?? new Date().toISOString(),
  };
}

async function collection() {
  return getCollection<Order>("orders");
}

export async function dbGetOrders(): Promise<Order[]> {
  const orders = await (await collection()).find({}).sort({ createdAt: -1 }).toArray();
  return orders.map(migrateOrder);
}

export async function dbGetOrdersByUser(email: string): Promise<Order[]> {
  const normalized = email.trim().toLowerCase();
  return (await dbGetOrders()).filter(
    (o) => o.userEmail.trim().toLowerCase() === normalized
  );
}

export async function dbGetOrderById(id: string): Promise<Order | null> {
  const order = await (await collection()).findOne({ id });
  return order ? migrateOrder(order) : null;
}

async function applyStockDeduction(order: Order): Promise<void> {
  const stock = await dbGetStockById(order.stockId);
  if (!stock) return;
  await dbUpdateStockItem(order.stockId, {
    quantity: Math.max(0, stock.quantity - order.quantity),
  });
}

export async function dbCreateOrder(data: {
  stockId: string;
  quantity: number;
  userName: string;
  userEmail: string;
  customerPhone?: string;
  paymentGateway?: "manual" | "cashfree" | "wallet";
  selectedRamGb?: number;
  promoCode?: string;
}): Promise<Order | null> {
  const stock = await dbGetStockById(data.stockId);
  if (!stock || stock.quantity < data.quantity || data.quantity < 1) return null;

  const ramGb =
    data.selectedRamGb ??
    (stock.type !== "proxy" ? getRamPlans(stock)[0]?.ram : undefined);
  if (stock.type !== "proxy" && ramGb !== undefined && getRamPlanPrice(stock, ramGb) === null) {
    return null;
  }

  const originalUnitPrice = getStockPrice(stock, ramGb);

  let unitPrice = originalUnitPrice;
  let promoCode: string | undefined;
  let promoPercent: number | undefined;
  let promoType: "percent" | "flat" | undefined;
  let promoValue: number | undefined;
  let promoDiscount: number | undefined;

  if (
    data.promoCode &&
    stock.type !== "proxy" &&
    ramGb !== undefined
  ) {
    const plan = getRamPlan(stock, ramGb);
    const result = validatePromoCode(plan, data.promoCode);
    if (result.ok) {
      unitPrice = applyPromoEntry(originalUnitPrice, result);
      promoCode = result.code;
      promoType = result.type;
      promoValue = result.value;
      if (result.type === "percent") promoPercent = result.value;
      promoDiscount = (originalUnitPrice - unitPrice) * data.quantity;
    }
  }

  const now = new Date().toISOString();

  const order: Order = {
    id: `ORD-${Date.now().toString().slice(-6)}`,
    stockId: stock.id,
    stockType: stock.type as StockType,
    series: stock.series,
    quantity: data.quantity,
    unitPrice,
    totalAmount: unitPrice * data.quantity,
    specs: formatStockSpecs(stock, ramGb),
    ramGb,
    region: stock.region,
    port: stock.port,
    os: stock.os,
    userName: data.userName,
    userEmail: data.userEmail,
    paymentStatus: "pending",
    fulfillmentStatus: "pending",
    adminNote: "",
    deliverIp: "",
    deliverUsername: "",
    deliverPassword: "",
    paymentGateway: data.paymentGateway ?? "manual",
    cashfreeOrderStatus: "",
    customerPhone: data.customerPhone ?? "",
    promoCode,
    promoType,
    promoValue,
    promoPercent,
    promoDiscount,
    originalUnitPrice: promoCode ? originalUnitPrice : undefined,
    createdAt: now,
    updatedAt: now,
  };

  await (await collection()).insertOne(order);
  return order;
}

export async function dbUpdateOrder(
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
  const prev = await dbGetOrderById(id);
  if (!prev) return null;

  const wasDelivered = prev.fulfillmentStatus === "delivered";
  const updated: Order = {
    ...prev,
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  if (
    !wasDelivered &&
    updated.fulfillmentStatus === "delivered" &&
    updated.paymentStatus === "received"
  ) {
    await applyStockDeduction(updated);
  }

  if (prev.fulfillmentStatus === "delivered" && updated.fulfillmentStatus === "cancelled") {
    await dbDeleteServersByOrder(updated.id);
  }

  await (await collection()).updateOne({ id }, { $set: updated });
  return updated;
}

export async function dbDeliverOrderUnits(
  id: string,
  units: DeliverServerCreds[]
): Promise<Order | null> {
  const cleaned = units
    .map((unit) => ({
      ip: unit.ip.trim(),
      username: unit.username.trim(),
      password: unit.password,
      providerVmId: unit.providerVmId,
      provider: unit.provider,
    }))
    .filter((unit) => unit.ip && unit.username && unit.password);

  if (cleaned.length === 0) return null;

  const order = await dbGetOrderById(id);
  if (!order) return null;
  if (order.paymentStatus !== "received") return null;
  if (order.fulfillmentStatus === "delivered") return null;

  const primary = cleaned[0];
  const updated = await dbUpdateOrder(id, {
    fulfillmentStatus: "delivered",
    deliverIp: primary.ip,
    deliverUsername: primary.username,
    deliverPassword: primary.password,
  });

  if (updated) {
    await dbCreateServersFromOrder(updated, cleaned);
  }

  return updated;
}

export async function dbDeliverOrderToCustomer(
  id: string,
  creds: { ip: string; username: string; password: string }
): Promise<Order | null> {
  return dbDeliverOrderUnits(id, [creds]);
}

export async function dbUpdateOrderCredentials(
  id: string,
  creds: { ip: string; username: string; password: string }
): Promise<Order | null> {
  const ip = creds.ip.trim();
  const username = creds.username.trim();
  const password = creds.password;
  if (!ip || !username || !password) return null;

  const order = await dbGetOrderById(id);
  if (!order || order.fulfillmentStatus !== "delivered") return null;

  const updated = await dbUpdateOrder(id, {
    deliverIp: ip,
    deliverUsername: username,
    deliverPassword: password,
  });

  if (updated) {
    await dbUpdateServersCredentialsForOrder(id, { ip, username, password });
  }

  return updated;
}

export async function dbConfirmCashfreePayment(
  orderId: string,
  cashfreeStatus: string
): Promise<Order | null> {
  return dbUpdateOrder(orderId, {
    paymentStatus: "received" as PaymentStatus,
    paymentGateway: "cashfree",
    cashfreeOrderStatus: cashfreeStatus,
  });
}

export async function dbDeleteOrder(id: string): Promise<void> {
  await dbDeleteServersByOrder(id);
  await (await collection()).deleteOne({ id });
}
