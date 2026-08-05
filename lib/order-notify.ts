import { getAdminCredentials } from "@/lib/admin-auth";
import { sendAdminEmail } from "@/lib/mail";
import {
  formatOrderDate,
  getAdminPaymentLabel,
  getOrderSubtitle,
  getOrderTitle,
  type Order,
} from "@/lib/orders";
import { ADMIN_BASE_PATH } from "@/lib/admin";

function adminOrdersUrl(): string {
  const base =
    process.env.NEXTAUTH_URL?.replace(/\/$/, "") ||
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
    "https://linuxpro.in";
  return `${base}${ADMIN_BASE_PATH}/orders`;
}

function orderEmailBody(order: Order, headline: string): { text: string; html: string } {
  const title = getOrderTitle(order);
  const lines = [
    headline,
    "",
    `Order ID: ${order.id}`,
    `Customer: ${order.userName} <${order.userEmail}>`,
    `Product: ${title}`,
    `Details: ${getOrderSubtitle(order)}`,
    order.specs ? `Specs: ${order.specs}` : null,
    `Qty: ${order.quantity}`,
    `Amount: ₹${order.totalAmount.toLocaleString("en-IN")}`,
    `Payment: ${getAdminPaymentLabel(order)}`,
    `Gateway: ${order.paymentGateway}`,
    `Fulfillment: ${order.fulfillmentStatus}`,
    `Ordered: ${formatOrderDate(order.createdAt)}`,
    "",
    `Open admin orders: ${adminOrdersUrl()}`,
  ].filter(Boolean) as string[];

  const text = lines.join("\n");
  const html = `
    <div style="font-family:Arial,sans-serif;line-height:1.5;color:#111">
      <h2 style="margin:0 0 12px;font-size:20px">${headline}</h2>
      <table style="border-collapse:collapse;width:100%;max-width:560px">
        <tr><td style="padding:6px 0;color:#666">Order ID</td><td style="padding:6px 0"><strong>${order.id}</strong></td></tr>
        <tr><td style="padding:6px 0;color:#666">Customer</td><td style="padding:6px 0">${order.userName} &lt;${order.userEmail}&gt;</td></tr>
        <tr><td style="padding:6px 0;color:#666">Product</td><td style="padding:6px 0"><strong>${title}</strong><br/><span style="color:#666">${getOrderSubtitle(order)}</span></td></tr>
        ${order.specs ? `<tr><td style="padding:6px 0;color:#666">Specs</td><td style="padding:6px 0">${order.specs}</td></tr>` : ""}
        <tr><td style="padding:6px 0;color:#666">Qty</td><td style="padding:6px 0">${order.quantity}</td></tr>
        <tr><td style="padding:6px 0;color:#666">Amount</td><td style="padding:6px 0"><strong>₹${order.totalAmount.toLocaleString("en-IN")}</strong></td></tr>
        <tr><td style="padding:6px 0;color:#666">Payment</td><td style="padding:6px 0">${getAdminPaymentLabel(order)}</td></tr>
        <tr><td style="padding:6px 0;color:#666">Ordered</td><td style="padding:6px 0">${formatOrderDate(order.createdAt)}</td></tr>
      </table>
      <p style="margin:18px 0 0">
        <a href="${adminOrdersUrl()}" style="display:inline-block;background:#00D084;color:#04120c;text-decoration:none;padding:10px 16px;border-radius:8px;font-weight:700">
          Open Admin Orders
        </a>
      </p>
    </div>
  `;

  return { text, html };
}

/** Fire-and-forget safe notify — never blocks order APIs on mail failure. */
export function notifyAdminNewOrder(order: Order): void {
  const { text, html } = orderEmailBody(
    order,
    `New LinuxPro order placed — ${getOrderTitle(order)}`
  );
  void sendAdminEmail({
    subject: `[LinuxPro] New order ${order.id} — ₹${order.totalAmount}`,
    text,
    html,
  }).catch((error) => console.error("[order-notify] placed", error));
}

export function notifyAdminOrderPaid(order: Order): void {
  const { text, html } = orderEmailBody(
    order,
    `Payment received — deliver IP manually for ${getOrderTitle(order)}`
  );
  void sendAdminEmail({
    subject: `[LinuxPro] PAID ${order.id} — ₹${order.totalAmount} (${order.paymentGateway})`,
    text: `${text}\n\nDeliver IP/username/password from Admin → Orders.\nAdmin inbox: ${getAdminCredentials().email}`,
    html,
  }).catch((error) => console.error("[order-notify] paid", error));
}
