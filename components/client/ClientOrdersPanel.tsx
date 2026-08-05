"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  fetchOrders,
  formatOrderDate,
  getOrdersByUser,
  getAdminFulfillmentLabel,
  getAdminPaymentLabel,
  getOrderSubtitle,
  getOrderTitle,
  type Order,
} from "@/lib/orders";
import { getUser } from "@/lib/auth";
import { getServersByOrder } from "@/lib/user-servers";

function getPaymentMethodLabel(order: Order): string {
  if (order.paymentGateway === "wallet") return "Wallet";
  if (order.paymentGateway === "cashfree") return "Cashfree";
  return "Manual";
}

function statusLabel(order: Order): string {
  if (order.fulfillmentStatus === "cancelled") return "Cancelled";
  if (order.fulfillmentStatus === "delivered") return "Delivered";
  if (order.paymentStatus === "pending") return "Payment pending";
  if (order.paymentStatus === "processing") return "Payment processing";
  return "Waiting for delivery";
}

function statusClass(order: Order): string {
  if (order.fulfillmentStatus === "cancelled") return "is-cancelled";
  if (order.fulfillmentStatus === "delivered") return "is-delivered";
  if (order.paymentStatus !== "received") return "is-pending";
  return "is-waiting";
}

function statusHint(order: Order): string {
  if (order.paymentStatus === "pending") {
    return "Complete payment from wallet or Cashfree to continue.";
  }
  if (order.fulfillmentStatus === "delivered") {
    return "Ready — open My Servers for IP and password.";
  }
  if (order.fulfillmentStatus === "cancelled") {
    return "This order was cancelled.";
  }
  return "Payment confirmed. Admin will deliver IP and password soon.";
}

export function ClientOrdersPanel() {
  const searchParams = useSearchParams();
  const tab = searchParams.get("tab") === "history" ? "history" : "manage";
  const [orders, setOrders] = useState<Order[]>([]);

  const load = useCallback(() => {
    const user = getUser();
    if (user) setOrders(getOrdersByUser(user.email));
  }, []);

  useEffect(() => {
    const user = getUser();
    if (user) {
      void fetchOrders(user.email).then(() => load());
    } else {
      load();
    }
    const onUpdate = () => load();
    window.addEventListener("orders-updated", onUpdate);
    window.addEventListener("servers-updated", onUpdate);
    return () => {
      window.removeEventListener("orders-updated", onUpdate);
      window.removeEventListener("servers-updated", onUpdate);
    };
  }, [load]);

  const activeCount = useMemo(
    () =>
      orders.filter(
        (o) =>
          o.fulfillmentStatus !== "delivered" && o.fulfillmentStatus !== "cancelled"
      ).length,
    [orders]
  );

  const historyCount = useMemo(
    () =>
      orders.filter(
        (o) =>
          o.fulfillmentStatus === "delivered" || o.fulfillmentStatus === "cancelled"
      ).length,
    [orders]
  );

  const awaiting = useMemo(
    () =>
      orders.filter(
        (o) =>
          o.paymentStatus === "received" &&
          o.fulfillmentStatus !== "delivered" &&
          o.fulfillmentStatus !== "cancelled"
      ).length,
    [orders]
  );

  const visibleOrders = useMemo(() => {
    if (tab === "history") {
      return orders.filter(
        (o) => o.fulfillmentStatus === "delivered" || o.fulfillmentStatus === "cancelled"
      );
    }
    return orders.filter(
      (o) => o.fulfillmentStatus !== "delivered" && o.fulfillmentStatus !== "cancelled"
    );
  }, [orders, tab]);

  return (
    <div className="co-page">
      <header className="co-head">
        <div>
          <h1>{tab === "history" ? "Order History" : "My Orders"}</h1>
          <p>
            {tab === "history"
              ? "Delivered and cancelled orders."
              : awaiting > 0
                ? `${awaiting} order${awaiting === 1 ? "" : "s"} waiting for IP delivery.`
                : "Track payment and delivery status here."}
          </p>
        </div>
        <Link href="/client/ip-stock" className="btn btn--primary btn--sm">
          Buy Plan
        </Link>
      </header>

      <div className="co-tabs" role="tablist" aria-label="Orders">
        <Link
          href="/client/orders"
          className={`co-tabs__btn${tab === "manage" ? " is-active" : ""}`}
        >
          Active
          <span>{activeCount}</span>
        </Link>
        <Link
          href="/client/orders?tab=history"
          className={`co-tabs__btn${tab === "history" ? " is-active" : ""}`}
        >
          History
          <span>{historyCount}</span>
        </Link>
      </div>

      {visibleOrders.length === 0 ? (
        <div className="co-empty">
          <h3>{tab === "history" ? "No history yet" : "No active orders"}</h3>
          <p>
            {tab === "history"
              ? "Completed orders will show up here."
              : "Pick a plan and place an order to get started."}
          </p>
          {tab !== "history" && (
            <Link href="/client/ip-stock" className="btn btn--primary">
              Browse Plans
            </Link>
          )}
        </div>
      ) : (
        <div className="co-list">
          {visibleOrders.map((o) => {
            const servers = getServersByOrder(o.id);
            const delivered = o.fulfillmentStatus === "delivered";

            return (
              <article key={o.id} className={`co-row ${statusClass(o)}`}>
                <div className="co-row__main">
                  <div className="co-row__title-row">
                    <h2>{getOrderTitle(o)}</h2>
                    <span className={`co-badge ${statusClass(o)}`}>{statusLabel(o)}</span>
                  </div>
                  <p className="co-row__meta">
                    {getOrderSubtitle(o)}
                    {o.specs ? ` · ${o.specs}` : ""}
                  </p>
                  <p className="co-row__id">
                    <code>{o.id}</code>
                    <span>·</span>
                    <span>{getPaymentMethodLabel(o)}</span>
                    <span>·</span>
                    <span>{formatOrderDate(o.createdAt)}</span>
                    <span>·</span>
                    <span>Qty {o.quantity}</span>
                  </p>
                  <p className="co-row__hint">{statusHint(o)}</p>
                </div>

                <div className="co-row__side">
                  <strong className="co-row__price">
                    ₹{o.totalAmount.toLocaleString("en-IN")}
                  </strong>
                  <span className="co-row__pay">{getAdminPaymentLabel(o)}</span>
                  {delivered && servers.length > 0 ? (
                    <Link
                      href={`/client/servers/${servers[0].id}`}
                      className="btn btn--primary btn--sm"
                    >
                      Open Server
                    </Link>
                  ) : delivered ? (
                    <Link href="/client/servers" className="btn btn--outline btn--sm">
                      My Servers
                    </Link>
                  ) : (
                    <span className="co-row__fulfill">{getAdminFulfillmentLabel(o)}</span>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
