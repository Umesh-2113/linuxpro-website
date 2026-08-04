"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
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

function getOrderProgress(order: Order): number {
  if (order.fulfillmentStatus === "delivered") return 3;
  if (order.fulfillmentStatus === "processing") return 2;
  if (order.paymentStatus === "received") return 2;
  if (order.paymentStatus === "pending") return 1;
  return 0;
}

function getPaymentMethodLabel(order: Order): string {
  if (order.paymentGateway === "wallet") return "Wallet";
  if (order.paymentGateway === "cashfree") return "Cashfree";
  return "Manual";
}

function getStatusTone(order: Order): "success" | "pending" | "cancelled" {
  if (order.fulfillmentStatus === "cancelled") return "cancelled";
  if (order.fulfillmentStatus === "delivered") return "success";
  return "pending";
}

export function ClientOrdersPanel() {
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

  const stats = useMemo(() => {
    const paid = orders.filter((o) => o.paymentStatus === "received").length;
    const delivered = orders.filter((o) => o.fulfillmentStatus === "delivered").length;
    const awaiting = orders.filter(
      (o) =>
        o.paymentStatus === "received" &&
        o.fulfillmentStatus !== "delivered" &&
        o.fulfillmentStatus !== "cancelled"
    ).length;
    return { total: orders.length, paid, delivered, awaiting };
  }, [orders]);

  return (
    <div className="client-orders-page">
      <header className="client-orders-hero">
        <div className="client-orders-hero__glow" aria-hidden />
        <div className="client-orders-hero__content">
          <div>
            <span className="client-orders-hero__eyebrow">Order Center</span>
            <h1>Manage Orders</h1>
            <p>Track payment, delivery, and open your server when it&apos;s ready.</p>
          </div>
          <Link href="/client/ip-stock" className="btn btn--primary btn--sm">
            + Buy IP Stock
          </Link>
        </div>
      </header>

      {orders.length > 0 && (
        <div className="client-orders-stats">
          <div className="client-orders-stat glass">
            <span className="client-orders-stat__value">{stats.total}</span>
            <span className="client-orders-stat__label">Total Orders</span>
          </div>
          <div className="client-orders-stat glass">
            <span className="client-orders-stat__value">{stats.paid}</span>
            <span className="client-orders-stat__label">Paid</span>
          </div>
          <div className="client-orders-stat glass client-orders-stat--warn">
            <span className="client-orders-stat__value">{stats.awaiting}</span>
            <span className="client-orders-stat__label">Awaiting Delivery</span>
          </div>
          <div className="client-orders-stat glass client-orders-stat--ok">
            <span className="client-orders-stat__value">{stats.delivered}</span>
            <span className="client-orders-stat__label">Delivered</span>
          </div>
        </div>
      )}

      {orders.length === 0 ? (
        <div className="client-orders-empty glass">
          <div className="client-orders-empty__icon">📦</div>
          <h3>No orders yet</h3>
          <p>Browse IP stock and place your first order in seconds.</p>
          <Link href="/client/ip-stock" className="btn btn--primary">
            Browse IP Stock
          </Link>
        </div>
      ) : (
        <div className="client-orders-list">
          {orders.map((o) => {
            const servers = getServersByOrder(o.id);
            const isDelivered = o.fulfillmentStatus === "delivered";
            const progress = getOrderProgress(o);
            const tone = getStatusTone(o);

            return (
              <article
                key={o.id}
                className={`client-order-card glass client-order-card--${tone}`}
              >
                <div className="client-order-card__top">
                  <div className="client-order-card__identity">
                    <span className="client-order-card__id">{o.id}</span>
                    <h2 className="client-order-card__ip">IP {getOrderTitle(o)}</h2>
                    <p className="client-order-card__sub">{getOrderSubtitle(o)}</p>
                  </div>
                  <div className="client-order-card__amount">
                    <span className="client-order-card__amount-label">Total</span>
                    <strong>₹{o.totalAmount.toLocaleString("en-IN")}</strong>
                  </div>
                </div>

                <div className="client-order-card__chips">
                  <span className="client-order-chip client-order-chip--pay">
                    {getPaymentMethodLabel(o)}
                  </span>
                  <span
                    className={`client-order-chip client-order-chip--${
                      o.paymentStatus === "received" ? "ok" : "wait"
                    }`}
                  >
                    {getAdminPaymentLabel(o)}
                  </span>
                  <span
                    className={`client-order-chip client-order-chip--${
                      isDelivered ? "ok" : "wait"
                    }`}
                  >
                    {getAdminFulfillmentLabel(o)}
                  </span>
                </div>

                <div className="client-order-card__timeline" aria-hidden>
                  <div className="client-order-card__track">
                    <div
                      className="client-order-card__track-fill"
                      style={{ width: `${(progress / 3) * 100}%` }}
                    />
                  </div>
                  <div className="client-order-card__steps">
                    <span className={progress >= 1 ? "is-done" : ""}>Placed</span>
                    <span className={progress >= 2 ? "is-done" : ""}>Paid</span>
                    <span className={progress >= 3 ? "is-done" : ""}>Delivered</span>
                  </div>
                </div>

                <div className="client-order-card__details">
                  <div>
                    <span>Quantity</span>
                    <strong>{o.quantity}</strong>
                  </div>
                  <div>
                    <span>Region</span>
                    <strong>{o.region}</strong>
                  </div>
                  <div>
                    <span>Ordered</span>
                    <strong>{formatOrderDate(o.createdAt)}</strong>
                  </div>
                  {o.specs && (
                    <div>
                      <span>Specs</span>
                      <strong>{o.specs}</strong>
                    </div>
                  )}
                </div>

                <div className="client-order-card__footer">
                  {isDelivered && servers.length > 0 ? (
                    <div className="client-order-card__actions">
                      {servers.map((s) => (
                        <Link
                          key={s.id}
                          href={`/client/servers/${s.id}`}
                          className="btn btn--primary btn--sm"
                        >
                          Open Server — {s.name}
                        </Link>
                      ))}
                    </div>
                  ) : (
                    <p className="client-order-card__message">
                      {o.paymentStatus === "pending"
                        ? "Complete payment to continue. Use My Wallet or Cashfree at checkout."
                        : o.fulfillmentStatus === "processing"
                          ? "Admin is preparing your server credentials…"
                          : isDelivered
                            ? "Delivered — refresh if server link is not visible yet."
                            : o.paymentGateway === "wallet"
                              ? "Wallet payment confirmed — admin will deliver your server soon."
                              : "Payment confirmed — admin will deliver your server soon."}
                    </p>
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
