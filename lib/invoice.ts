import {
  formatOrderDate,
  getOrderSubtitle,
  getOrderTitle,
  type Order,
} from "@/lib/orders";
import { stockTypeLabels } from "@/lib/stock";
import { siteBrandName, getSiteDomain, getSiteUrl } from "@/lib/site";
import { siteContact } from "@/lib/contact";

/** Stable invoice number derived from the order id. */
export function getInvoiceNumber(order: Order): string {
  const raw = order.id.replace(/^ORD-/i, "").replace(/[^A-Z0-9]/gi, "");
  return `INV-${raw || order.id}`;
}

export function canViewInvoice(order: Order): boolean {
  return order.paymentStatus === "received" || order.fulfillmentStatus === "delivered";
}

export function getInvoicePaymentLabel(order: Order): string {
  if (order.paymentGateway === "wallet") return "Wallet";
  if (order.paymentGateway === "cashfree") return "Cashfree";
  return "Manual";
}

export function getInvoiceStatusLabel(order: Order): string {
  if (order.fulfillmentStatus === "cancelled") return "Cancelled";
  if (order.paymentStatus === "received") return "Paid";
  if (order.paymentStatus === "processing") return "Processing";
  return "Unpaid";
}

export type InvoiceViewModel = {
  number: string;
  orderId: string;
  brand: string;
  domain: string;
  siteUrl: string;
  supportEmail: string;
  supportPhone: string;
  issuedAt: string;
  status: string;
  billToName: string;
  billToEmail: string;
  billToPhone: string;
  lineTitle: string;
  lineSubtitle: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  discount: number;
  total: number;
  paymentMethod: string;
  paymentRef: string;
  promoCode: string;
};

export function buildInvoiceView(order: Order): InvoiceViewModel {
  const discount = order.promoDiscount ?? 0;
  const subtotal =
    typeof order.originalUnitPrice === "number"
      ? order.originalUnitPrice * order.quantity
      : order.unitPrice * order.quantity + discount;

  return {
    number: getInvoiceNumber(order),
    orderId: order.id,
    brand: siteBrandName,
    domain: getSiteDomain(),
    siteUrl: getSiteUrl(),
    supportEmail: siteContact.email,
    supportPhone: siteContact.phoneDisplay,
    issuedAt: formatOrderDate(order.createdAt),
    status: getInvoiceStatusLabel(order),
    billToName: order.userName,
    billToEmail: order.userEmail,
    billToPhone: order.customerPhone || "",
    lineTitle: getOrderTitle(order),
    lineSubtitle: `${stockTypeLabels[order.stockType]} · ${getOrderSubtitle(order)}${
      order.specs ? ` · ${order.specs}` : ""
    }`,
    quantity: order.quantity,
    unitPrice:
      typeof order.originalUnitPrice === "number"
        ? order.originalUnitPrice
        : order.unitPrice,
    subtotal,
    discount,
    total: order.totalAmount,
    paymentMethod: getInvoicePaymentLabel(order),
    paymentRef: order.cashfreeOrderStatus || "",
    promoCode: order.promoCode || "",
  };
}
